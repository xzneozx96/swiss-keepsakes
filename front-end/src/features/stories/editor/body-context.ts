import type { StoryLanguage } from '../lib/search-params'

import { createContext } from 'react'

/** What a media block's React view needs from the page: whose library to read and which language the version is. Read with `use()`. */
export interface BodyEditorValue {
  storeId: string
  language: StoryLanguage
}

export const BodyEditorContext = createContext<BodyEditorValue | null>(null)
