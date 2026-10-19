# React: composition, context and reducers

Read this when you split a component, share data across a tree, or manage state with a reducer. The rules come from the React team's docs (react.dev "Thinking in React", "Sharing State Between Components", "Passing Data Deeply with Context", "Extracting State Logic into a Reducer", "Scaling Up with Reducer and Context", read 2026-10-19).

## Splitting components

- Split along the data model, one concern per component. Do not split every visual fragment. Extract when it grows or repeats.
- Build the static version from props first and add state last. Data flows down as props and events flow up through callbacks.
- Decide per component what is controlled (driven by props) and what it keeps itself. Most components mix both. Refactor when a parent needs to coordinate.

## Props and children first, context second

- Start with props. Passing several props through a few layers is fine and keeps data flow visible.
- Before context, extract components and pass JSX as `children`, so middle components stop forwarding data they do not use: `<Layout><Posts posts={posts} /></Layout>`.
- Use context for data that distant components in different branches need, such as the language, the signed-in guest or a shared store. Do not use it only because data passes through a few levels.

## Using context

- Export the context from its own module. Wrap the provider in a component that accepts `children`. Read the context through a custom hook (`useLocale`, `useDemoSelector`), so you can split or change it later.
- Name a context `XContext`. In React 19 render `<XContext value={...}>`, not `<XContext.Provider>`, and read it with `use(XContext)`. Both are checked by the linter.
- Without a provider a consumer gets the default value. For a context that needs a provider, default to `null` and let the provider supply the real value.
- The nearest provider wins. Nest one to override a value for a subtree.
- Every consumer re-renders when the value changes. Split state and dispatch into two contexts. Read a value in an outer component and pass a narrow prop to a memoized child. For store data, select the narrowest slice (see `components-and-hooks.md`).

Examples here: `front-end/src/contexts/locale-context.tsx`, and `MerchantBarSlotContext` in `front-end/src/components/layout/merchant-back-bar.tsx`.

## Reducers

- Use `useState` for simple state. Use `useReducer` when many handlers update the same state in similar ways, or the update logic is complex. There is no reducer in this repo today.
- A reducer is pure: `(state, action) => nextState`. No requests, timers or alerts inside. Declare it outside the component. Use `switch` with `case` blocks that each `return`, and `throw` in `default`.
- An action says what the user did (`added`, `deleted`), not how the state changes (`set_tasks`). Use one action per user interaction, even when it changes several fields.
- To share a reducer deeply, combine it with context. Use one context for state and one for dispatch, a provider component that holds `useReducer`, and hooks (`useTasks`, `useTasksDispatch`). Keep them in one file and export only the provider and the hooks.
