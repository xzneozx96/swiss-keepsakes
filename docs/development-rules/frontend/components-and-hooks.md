# Components and hooks

Read this before you write a component or a hook. Follow the pattern the neighbouring code already uses. Do not introduce container components if the project has none.

## Hooks hold logic, components render

- A hook owns data, state and side effects. A component receives props, renders, and reports events through callbacks.
- A presentational component must render with mock props and no store or network. Example: `front-end/src/components/listing-card.tsx` renders from props, and `front-end/src/features/catalog/hooks/use-product-card.ts` builds those props from the store.
- Do not read the store, fetch or touch storage inside a presentational component.

## Do not define components inside components

A component defined in another component's body is a new type on every render and remounts its children. Define it at module level and pass data as props. A render-prop callback that a library calls as a function is fine, such as the `cards` function of `DataTable` or a chart tooltip that holds no state.

## Memoization

The React Compiler is on, so do not add `useMemo`, `useCallback` or `React.memo` by default. The compiler memoizes values and callbacks inside a component.
- Add `memo` only to a component that appears many times in a list and receives freshly built objects each render. Give it a comparator. Example: `listing-card.tsx` (`sameListing`).
- The compiler skips a few functions and they run as written. They are listed in `stack-notes.md`. Don't use them as templates, and don't rely on memoization there.

## State and the store

- Read the narrowest slice: `useDemoSelector((s) => s.data.favouriteProductIds.includes(id))`, not the whole state. Per-item components select a boolean or one item.
- Call `useDemoActions()` when you only write.
- Use `useDemo()` only when the component reads most of the state anyway.

## Effects

- Derive values during render. Do not copy props or state into other state in an effect. When a value must reset because a prop changed, set state during render behind a guard (`if (prev !== value) { setPrev(value); setField(...) }`), or update both values together in the event handler.
- Put event logic in the event handler, not in an effect that watches state. Use `useEffectEvent` for a read inside an effect that must not re-run the effect (`front-end/src/components/app-toasts.tsx`).
- Never call `setState` synchronously in an effect. ESLint rejects it (React Hooks v7 compiler rules). There are no suppressions today. Do not add one. Restructure with `react-effects-and-refs.md` instead.
- A value that changes on every scroll, pointer or stream frame goes in a ref or is throttled. See `performance.md`.

## Hooks you can reuse

`front-end/src/hooks/` has `use-url-input` (typed text with deferred results and a delayed URL write), `use-shared-clock` (one timer shared by all readers), `use-latest` (a stable ref to the latest callback), `use-in-view` and `use-is-wide`. Look there before writing a new one.
