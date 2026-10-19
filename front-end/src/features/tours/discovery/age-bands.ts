import type { TourAgeBands } from '../types'
import type { MessageKey } from '@/i18n/en'

type Translate = (key: MessageKey, vars?: Record<string, number>) => string

/** The tour's own age range for each group, e.g. "Ages 16+", "Ages 6–15", "Ages 0–5". */
export function ageBandLabels(bands: TourAgeBands, t: Translate) {
  return {
    adults: t('tourDiscovery.ages.from', { from: bands.adultFrom }),
    children: t('tourDiscovery.ages.range', {
      from: bands.childFrom,
      to: bands.adultFrom - 1,
    }),
    infants: t('tourDiscovery.ages.range', {
      from: 0,
      to: bands.childFrom - 1,
    }),
  }
}
