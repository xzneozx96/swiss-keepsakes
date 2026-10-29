# API feedback

Read this before a mutation or query needs a toast. Check `front-end/package.json` and `api-feedback.ts` first.

## The rule

Feedback for an API call comes from the query client's cache, never from the call site. Do not call `toast.*` next to a `mutate`, `mutateAsync` or `submit`.

## Where it lives

`createApiQueryClient` (`front-end/src/features/data-client/api-feedback.ts:99`) builds the one `QueryClient` every `DataClient` uses: `createDemoQueryClient` in `front-end/src/features/demo/data-client.ts` wires it for the demo client, and `stores`, the first API feature, shares the same client (`createStoresClient()` in `front-end/src/features/demo/data-client.ts:122`; `data-client.ts:16`–`18` says `stores` is the API client in both modes). A feature that moves to the API keeps using it; there is no second `QueryClient` to wire.

- A server-rendered route makes its `QueryClient` per request (`tanstack-start.md`, rule 12). `createApiQueryClient`'s callbacks check `typeof window !== 'undefined'` once, at creation, so a server request's client is a no-op: a failed `ensureQueryData` in a loader never reaches `toast`.
- `t` is read through a ref: the cache is built outside React, so `createFeedback` (`api-feedback.ts:59`) starts with the key itself as the text, and `ApiFeedbackBridge` (`api-feedback.ts:72`) keeps it in step with the locale. Render `ApiFeedbackBridge` once, under `LocaleProvider` and above the screens (`front-end/src/app-providers.tsx`). A tree that skips it (most component tests) still runs the defaults below; it just shows the key instead of the translated copy.
- `toast` is injected too (`ToastApi`, `api-feedback.ts:11`), so a unit test gives the factory a fake instead of `@heroui/react`'s.

## The `meta` contract

`MutationFeedback` and `QueryFeedback` (`api-feedback.ts:22`, `:33`) are typed through TanStack's `Register`, so `useCommand`'s and `useSubmit`'s `meta` option is one of these, never a loose object:

```ts
useCommand('stores', 'createStore', {
  meta: { success: (store, input) => t('stores.create.done', { email: store.invitation?.email ?? input.ownerEmail }) },
})
```

- `success?: MessageKey | ((result, input) => string)`. A key when the text needs no data; a function, closing over the screen's own `t`, when it needs the result or the input (an email, an amount). A function that returns an empty string shows nothing, for a command whose success is only sometimes worth a toast (the place editor's save, when a publish follows). Nothing toasts on success without this.
- `error?: Partial<Record<string, MessageKey>>`, keyed by `ApiProblem['type']`. Keys only, never a literal string. Mutations only.
- `silent?: boolean`, on a mutation and on a query (`QueryFeedback`): drops the automatic error toast. On a mutation `success` still fires on its own, so a command that shows its refusal inline but still wants a success toast sets both.

`MutationFeedback` and `QueryFeedback` are declared with `type`, not `interface`: TanStack's `MutationMeta`/`QueryMeta` keep only a type TypeScript sees as extending `Record<string, unknown>`, and an `interface` of only optional properties never does (`api-feedback.ts:16`–`22`). `useCommand` and `useSubmit` take `meta` typed with the command's own result and input, then cast it once when forwarding to `useMutation` (`use-command.ts`), so a call site never casts.

## Defaults

- **A mutation's error always toasts** (`toast.danger`), mapped by `meta.error[problem.type]` and falling back to the generic copy — unless `meta.silent`, a 401 (sign-in owns it, `errors.ts`'s `ApiProblem.status`) or a cancelled request (`isCancelledError`).
- **A mutation's success toasts only with `meta.success`.** A `success` function that throws shows no toast and does not fail the command.
- **A query toasts only when a background refetch fails while data is already on screen** (`query.state.data !== undefined`). A first load's failure is the route's `errorComponent` (`route-fallbacks.tsx`), never a toast. A 401 and a cancelled request never toast, as for a mutation. `meta.silent` opts a query out. A query toasts at most once per `queryHash` until it next succeeds, so a failing poll cannot stack toasts (`api-feedback.ts:104`, `:117`, `:121`).

## Error text

1. `meta.error[problem.type]`, the command's own map.
2. The generic fallback: `apiFeedback.error.generic` for an `ApiProblem`, `apiFeedback.error.network` for anything else (a lost connection) — `genericFeedbackKey`, `api-feedback.ts:83`.
3. A field-level refusal the screen already shows inline (next to the input, as `error-handling.md` asks) sets `meta.silent`, so the cache never doubles it. The same holds for a screen that turns every failure into its own state: `open-for-sale.tsx` (inline refusal) and `use-accept-invitation.ts` (the refusal screen) are `silent`. Before you leave `meta.silent` off, check that the screen does not render the `error` itself. Example: `create-store-sheet.tsx`'s `createStore` shows every refusal through `ProblemNotice` and `FieldError`, so its `meta` is `{ success: ..., silent: true }`: `silent` drops the error toast, `success` still fires.
4. A 401 is sign-in's to show (`useGoToSignIn`, `use-member-failure.ts`); the cache stays silent and the screen's own `onError` redirects.

## What stays local

A call site's own `onSuccess`/`onError` is for state only: closing a sheet, settling an idempotency key, navigating, re-reading a stale list. It never calls `toast.*` for the API call it is attached to. What does call `toast.*` locally, because it is not a `useCommand` call or not feedback for one:

- Copying to the clipboard (`store-actions.tsx`, `partner-qr-sheet.tsx`).
- The cart toast with its "View cart" action (`use-gift-detail.ts`, `catalog/lib/cart-toast.ts`).
- The storage-full warning, raised in the root route (`error-handling.md`'s "Storage").
- Sign-out failing (`use-sign-out.ts`): Better Auth, not a `DataClient` command.

## Optimistic updates, idempotency keys, cancellations

- The cache's `onSuccess` runs, and is awaited, before the mutation's own `onSuccess` (`useCommand`'s query invalidation included). Keep `meta.success` synchronous and fast; it is not the place to read a query that the invalidation has not refreshed yet.
- `meta.success` is fixed when the hook renders, but TanStack refreshes a pending mutation's options on every render, so a function reads whatever it closes over *at success time*. Text that depends on which tap ran (the article editor's published/saved/unpublished text) goes in a ref that is written only when `submit` returns `true`, never before it: a dropped tap returns `false` and must not change the text of the send in flight (`use-article-editor.ts`).
- A retried command keeps its `Idempotency-Key` (`api-integration.md`'s "Idempotency keys"); a replayed success still runs `meta.success` once, because the retry is a normal resolved `mutate` to the cache.
- `isCancelledError` suppresses both the mutation and the query default, so an aborted request (a superseded search, a screen that left) never toasts.
- A route using `throwOnError` must also set `meta.silent` on that query: otherwise the thrown error reaches the route's `errorComponent` and the cache's default toast at once.

## Testing

`tests/api-feedback.test.ts` unit-tests `createApiQueryClient` directly, with a fake `ToastApi` and no React: `queryClient.getMutationCache().build(...).execute(...)` for a mutation, `queryClient.fetchQuery(...)` for a query. One test per default above, plus the function form of `meta.success`, `silent` with `success`, a throwing `success`, the query throttle and its reset on success, a 401 or cancelled refetch, the no-window no-op, and that a mutation's own `onError` never doubles the toast.

Screens and hooks are tested through the same cache with `ApiFeedbackBridge` rendered and `vi.spyOn(toast, ...)`: a screen that shows its refusal inline asserts `danger` was not called (`stores-screens.test.tsx`, "onboarding-incomplete" and "shows its own state"); a mapped error asserts the copy once (`stores-members.test.tsx`); the migrated `meta.success` functions are in `use-article-editor.test.tsx` and `migrated-feedback.test.tsx`.

## Checklist for a new command

1. Does a success need a toast? Add `meta.success`, a key or a function.
2. Does a refusal need copy beyond the generic fallback? Add its `type` to `meta.error`.
3. Does the screen already show the refusal inline? Add `meta.silent`.
4. No `toast.*` next to the `mutate`, `mutateAsync` or `submit` call. If one is still there, it is either feedback that belongs in `meta`, or genuinely local (see "What stays local").
