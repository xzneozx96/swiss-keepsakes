# React: effects, refs and custom hooks

Read this when you write an effect, use a ref, or extract a custom hook. The rules come from the React team's docs (react.dev "Escape Hatches": "Synchronizing with Effects", "You Might Not Need an Effect", "Lifecycle of Reactive Effects", "Separating Events from Effects", "Removing Effect Dependencies", "Referencing Values with Refs", "Manipulating the DOM with Refs", "Reusing Logic with Custom Hooks", read 2026-10-19).

`components-and-hooks.md` already says: derive values during render, put event logic in handlers, use `useEffectEvent` for reads that must not re-run an effect, never set state synchronously in an effect, and write per-frame values to a ref. This file adds the rest and does not repeat those.

## Do you need an effect

An effect synchronizes with something outside React: a browser API, the network, a timer, a third-party widget. With no external system involved, you probably do not need one. Ask why the code runs. If the user did something, use an event handler. If the component being on screen is the reason, use an effect.

| Situation | Use instead of an effect |
| :-- | :-- |
| A value computed from props or state | Calculate it during render |
| Reset all state when an id changes | `key` on the component |
| Adjust part of the state when a prop changes | Store an id, or a guarded `setState` during render |
| Logic caused by a click or submit | The event handler |
| A chain of effects that set state | Compute the next state in one handler |
| One-time app setup | Module level (`front-end/src/router.tsx`, `front-end/src/start.ts`), not an effect |
| Tell the parent about a change | Call it in the same handler, or lift the state |
| The parent needs the child's data | Fetch in the parent and pass it down |
| Read a mutable external store | `useSyncExternalStore` |

Examples in this repo: `front-end/src/hooks/use-url-input.ts` adjusts state during render, `SeekBar` in `front-end/src/components/music-sheet.tsx` reads the audio element with `useSyncExternalStore`, and `front-end/src/features/content/components/article-page.tsx` reads its starting state from storage when it mounts.

## Writing an effect

- One effect per synchronization process: it starts something and its cleanup stops it. Do not merge unrelated work into one effect, and do not think in mount, update and unmount.
- List every reactive value the effect reads. The dependencies match the code, so change the code and not the list. Never suppress `react-hooks/exhaustive-deps`. There are no suppressions today, and ESLint warns on a missing dependency.
- To remove a dependency: move a constant out of the component or a value into the effect, split the effect, read previous state through an updater (`setMessages(m => [...m, next])`), or wrap a non-reactive read in `useEffectEvent`.
- Do not depend on objects or functions created during render, because they are new every time. Depend on primitives, or create the object inside the effect.
- Refs and `set` functions are stable and are not listed. A ref passed in from a parent is listed. Mutable values (`ref.current`, `location.pathname`) are not reactive.
- Cleanup undoes exactly what setup did: disconnect, `clearTimeout`, `removeEventListener` with the same function. Strict Mode runs setup, cleanup, setup in development. Make that safe, and do not hide it with a ref guard.
- When an effect fetches, ignore stale answers with an `ignore` flag set in cleanup. An abort alone does not stop a race. A framework or TanStack Query is preferred (see `api-integration.md`).
- An effect with no dependency array that sets state loops forever. Leave the array out only when you need every render.
- Send purchases and other user actions from handlers. An effect re-runs on remount.

## Refs

- Use state when the value is shown. Use a ref when only handlers, effects or async code need it and a change must not render: timer ids, DOM nodes, instances. Do not keep a value in a plain variable inside a component. It resets every render.
- Never read or write `ref.current` during render, except to set it once on first use. Checked by ESLint (`react-hooks/refs`).
- With DOM refs, focus, scroll, measure and play. Do not add, remove or replace children of a node React manages, and do not fight React over an attribute it sets.
- For a list of nodes, use a ref callback that stores into a `Map` and returns a cleanup (`ref={node => { map.set(id, node); return () => map.delete(id) }}`). Do not call `useRef` in a loop and do not `querySelectorAll` from a parent ref.
- React 19 passes `ref` as an ordinary prop, so there is no `forwardRef` (see `Hero` and `GripIcon`). Use `useImperativeHandle` to expose only what a parent needs.
- Use `flushSync` only when the DOM must update before the next line. `use-stop-drag.ts` has the one documented use.

## Custom hooks

- Name it `useX` with a clear input and output (`useData(url)`). Pass reactive values in as arguments. Each call has its own state. To share state, lift it up.
- Extract a hook when you are writing an effect, so the component says what it wants and not how. Do not extract a lone `useState`.
- Do not write lifecycle wrappers such as `useMount`, `useEffectOnce` or `useUpdateEffect`. The linter cannot check their dependencies.
- Wrap a handler the hook receives in `useEffectEvent`, so a new handler does not reconnect.
- Prefer a built-in such as `useSyncExternalStore` to a hand-written subscription.
