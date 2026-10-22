import type { Onboarding } from '@sk/api-contract'

import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'

const tones = { met: 'success', unmet: 'warning', pending: 'neutral' } as const

/** The four conditions for opening the store for sale (UX 4.12). `pending` is a condition whose story is not built yet, and counts as not done. */
export function OnboardingChecklist({ conditions }: { conditions: Onboarding['conditions'] }) {
  const { t } = useLocale()
  const met = conditions.filter(condition => condition.state === 'met').length

  return (
    <section aria-labelledby="stores-checklist" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-heading" id="stores-checklist">{t('stores.checklist.title')}</h2>
        <span className="text-sm text-muted tabular-nums">{t('stores.checklist.count', { met, total: conditions.length })}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {conditions.map(condition => (
          <li
            key={condition.key}
            className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-surface"
            data-condition={condition.key}
            data-state={condition.state}
          >
            <span className="min-w-0 text-sm font-medium">{t(`stores.checklist.${condition.key}`)}</span>
            <StatusChip tone={tones[condition.state]}>{t(`stores.condition.${condition.state}`)}</StatusChip>
          </li>
        ))}
      </ul>
    </section>
  )
}
