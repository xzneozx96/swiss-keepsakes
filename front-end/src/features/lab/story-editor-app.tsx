import type { LabState } from './story-editor-search-params'

import { StoryEditorLoading, StoryEditorScreen } from './story-editor-screen'

/**
 * What the lab frame shows: the editor on its own story in memory. A new address (state) is a
 * fresh frame, so nothing leaks between states.
 */
export function StoryEditorLabApp({ state }: { state: LabState }) {
  return state === 'loading' ? <StoryEditorLoading /> : <StoryEditorScreen state={state} />
}
