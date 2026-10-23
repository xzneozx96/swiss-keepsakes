# Error handling

Read this when you show an error, a notice or a toast, or when a call can fail.

## Never fail silently

- Catch an error from a call the user started and tell the user. A mutation that completes gets a success message too.
- Messages are readable text in the user's language, written through `t()`. Do not show a raw error string or a stack trace.
- A field-level problem appears next to the field. Do not use a toast for it.
- Do not swallow an error with an empty `catch` unless you have decided the failure is invisible to the user and you say why in a comment.

## Toasts

- Use the HeroUI `toast` helper. One `AppToasts` region at the app root renders them (`front-end/src/components/app-toasts.tsx`). Do not add a second toast library or region.
- Announce an error with `toast.danger`. It stays `role=alert`, which screen readers read at once. Announce success and info with `toast.success` or `toast.info`. `AppToasts` makes those `role=status` with `aria-live=polite`, because HeroUI marks every toast `role=alert` by default. Do not set a role at the call site.
- Example of a toast that a feature raises: `front-end/src/features/catalog/lib/cart-toast.ts`.
- Shared code must not import a feature (see `code-structure.md`), so a feature's warning reaches the toast region from above. For example, the storage-full warning is raised in the root route and handed to `AppToasts` as a prop.

## Storage

- Use `readStored` and `writeStored` from `front-end/src/lib/storage.ts`. They never throw.
- `writeStored` returns `"kept"`, `"full"` or `"unavailable"`. Warn the user only for `"full"`. Blocked or missing storage stays silent, because the app still works for the session.

## Degrade, don't break

A failure in something optional must not blank the app. Example: if the German dictionary chunk cannot load, `front-end/src/main.tsx` starts in English, and a language switch that fails leaves the current language. Do the same for any lazy part that is not required to start.

## Not covered yet

There is no error boundary guide and no logging or error-reporting rule. Add them when the backend and a reporting service exist.
