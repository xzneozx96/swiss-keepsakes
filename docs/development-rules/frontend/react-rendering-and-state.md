# React: rendering, state, events and lists

Read this when you write a component, design state, handle events or render a list. The rules come from the React team's docs (react.dev "Describing the UI", "Adding Interactivity", "Managing State" and "Rules of React", read 2026-10-19). Effects, refs and custom hooks are in `react-effects-and-refs.md`. Splitting components, context and reducers are in `react-composition-and-context.md`. Where a rule here is enforced, the check is named.

## Rendering is pure

- A component or hook returns the same output for the same props, state and context. During render, do not call `new Date()` or `Math.random()`, touch the DOM, storage or a global. Do that in an event handler or an effect. Refs have their own rule in `react-effects-and-refs.md`. Checked by ESLint (`react-hooks/purity`). One exception: a lazy `useState` initializer runs only on the first render, so it may read a value once, such as storage. Examples: `initialLanguage` in `front-end/src/contexts/locale-context.tsx` and the starting state in `front-end/src/features/content/components/article-page.tsx`.
- Treat props, state, context, hook arguments and hook return values as read-only. Copy before you change. Do not change a value after you pass it to JSX or a hook.
- Changing something you created in the same render is fine (`const items = []; items.push(...)`). A module-level value lives across renders, so never change it during render.
- Keep React's Strict Mode on (Start's default client entry wraps the app in `<StrictMode>`, `@tanstack/react-start/dist/plugin/default-entry/client.tsx`; the project has no `src/client.tsx` of its own). It runs components twice in development, and duplicated output means something mutates during render.
- Render a component as `<Article />`. Never call it as a function (`{Article()}`). Never pass a hook around as a value or prop, and never wrap hooks in higher-order hooks.

## Rules of Hooks

- Call hooks at the top level of a component or custom hook. Not in a loop, a condition, after an early `return`, in an event handler, in a `try/catch`, or inside a callback given to `useMemo`, `useReducer` or `useEffect`. Checked by ESLint (`react-hooks/rules-of-hooks`).
- Start a function name with `use` only if it calls a hook. A plain helper is `getSorted()`, not `useSorted()`.

## Designing state

- Keep state minimal and compute the rest during render (`const count = items.length`). A value is not state if it never changes, comes from props, or can be computed from other state.
- Group state that changes together. Avoid contradictions: use one `status` (`'typing' | 'sending' | 'sent'`), not `isSending` and `isSent`. Avoid redundant state. Avoid duplication: store `selectedId` and look the object up. Avoid deep nesting: flatten into a lookup keyed by id.
- Do not mirror a prop in state (`useState(props.color)` ignores later changes). If you want only the first value, name the prop `initialColor`.
- Describe each visual state the user can see (empty, typing, submitting, success, error) and draw the UI from it. Do not toggle the DOM by hand.
- Each piece of state has one owner: the closest common parent of everything that reads it. A child asks for a change through a callback. Lift state up when two components must agree. Keep transient UI state (hover, an open menu) in the component that shows it.
- State belongs to a position in the tree. The same component at the same position keeps its state, and a different component or parent there resets it. Reset on purpose with a `key`. Example: `<TourItineraryMap key={tour.id} />` in `front-end/src/features/tours/discovery/tour-detail-page.tsx`.

## Updating state

- State is a snapshot of one render. A setter queues a render, so the variable does not change inside the current handler, and an async callback sees the value from when it ran.
- When the next value depends on the previous one, or you apply several updates, pass an updater: `setCount(c => c + 1)`. Name its argument after the variable (`setEnabled(e => !e)`). When the new value does not depend on the old one, pass the value.
- Keep updaters pure. Never call a setter or cause a side effect inside one.
- Never mutate objects or arrays in state. Replace them. Objects: `{ ...person, name }`, copying every level down to the change, and never a partial object (it replaces the whole state). Arrays: `[...arr, x]`, `filter`, `map`, `slice`. Sort or reverse a copy.
- A spread is shallow. Copy each object you change inside an array or nested object.

## Events

- Pass the function, do not call it: `onClick={handleClick}`. Inline code needs an arrow: `onClick={() => save(id)}`.
- Name a handler `handleX` where it is defined and a prop `onX`. Name props after what happened in the app (`onPlayMovie`), not the UI detail (`onClickButton`).
- `preventDefault()` stops the browser default, such as a form submit. `stopPropagation()` stops ancestor handlers. Do not depend on long bubbling chains.
- Use real interactive elements (`button`, not `div onClick`), which give keyboard and screen reader support. Checked by jsx-a11y.
- A controlled input needs `onChange` next to `value`.
- Make ids for `htmlFor` and `aria-describedby` with `useId`, and derive more with suffixes. Never use `useId` for list keys or cache keys.

## Lists and conditions

- A key is a string or number that is stable, unique among siblings and taken from the data (an id). Never `Math.random()` or an id made during render. Never the index when items can reorder, insert or delete. About 55 `key={i}` sites exist today. They are acceptable only for static lists.
- Put the key on the element the `map` returns, which is the component use and not the root inside the component. A fragment with a key is `<Fragment key={id}>`.
- `{count && <X />}` renders `0` when `count` is 0. Write `count > 0 && <X />` or a ternary.
- Do not nest ternaries deeply. Extract a variable or a component. Do not copy near-identical JSX into both branches, and branch only on the part that differs.
- Do not return `null` to hide a component that the parent can simply leave out.
