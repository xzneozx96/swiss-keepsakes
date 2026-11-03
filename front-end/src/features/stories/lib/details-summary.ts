import type { StoryGroupDetail } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { interestCodes } from '@sk/domain/content'

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string

/** The closed summary of the Stay card. */
export const staySummary = (t: Translate, stayTag: StoryGroupDetail['stayTag']) => t(`storyDetails.stay.${stayTag}`)

/** The chosen interests by name in the fixed order of the five, or "None". */
export function interestsSummary(t: Translate, interests: string[]) {
  const chosen = interestCodes.filter(code => interests.includes(code)).map(code => t(`storyDetails.interest.${code}`))

  return chosen.length > 0 ? chosen.join(', ') : t('storyDetails.none')
}

/** The chosen category names, or "None". */
export const categoriesSummary = (t: Translate, names: string[]) => names.length > 0 ? names.join(', ') : t('storyDetails.none')

/** The linked place names in the story's order, or "None". */
export const placesSummary = (t: Translate, names: string[]) => names.length > 0 ? names.join(', ') : t('storyDetails.none')

/** "{count} of 6". */
export const keepsakesSummary = (t: Translate, count: number) => t('storyLists.keepsakes.summary', { count })
