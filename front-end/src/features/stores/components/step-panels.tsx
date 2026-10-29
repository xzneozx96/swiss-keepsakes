import type { Onboarding } from '@sk/api-contract'
import type { ConditionKey, ConditionState } from '../lib/onboarding-steps'
import type { IconComponent } from '@/components/icons'

import { Button } from '@heroui/react'

import { BankIcon, ContentIcon, EditIcon, InfoIcon, ProductsIcon, ShopIcon, StatusSuccessIcon } from '@/components/icons'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { blockers } from '../lib/onboarding-steps'
import { OpenForSale } from './open-for-sale'

const icons: Record<ConditionKey, IconComponent> = {
  'store-information': ShopIcon,
  'payment-account': BankIcon,
  'catalogue': ProductsIcon,
  'policies': ContentIcon,
}
const tones = { met: 'success', unmet: 'warning', pending: 'neutral' } as const

/** One condition: what it is, its state in words, and what the Owner can do about it. */
export function ConditionPanel({ id, state, store, onEdit }: {
  id: ConditionKey
  state: ConditionState
  store: Onboarding['store']
  onEdit: () => void
}) {
  const { t } = useLocale()
  const Icon = icons[id]

  return (
    <div className="flex flex-col gap-6" data-condition={id} data-state={state}>
      <div className="flex items-start gap-4">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-secondary">
          <Icon size={24} />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title" id="stores-step-title">{t(`stores.checklist.${id}`)}</h2>
            <StatusChip tone={tones[state]}>{t(`stores.condition.${state}`)}</StatusChip>
          </div>
          <p className="text-sm text-pretty text-muted">{t(`stores.setup.why.${id}`)}</p>
        </div>
      </div>
      {id === 'store-information' && (
        <div className="flex max-w-md flex-col gap-4">
          <dl className="flex flex-col divide-y divide-separator rounded-2xl border border-separator px-4 text-sm">
            <div className="flex justify-between gap-3 py-3">
              <dt className="text-muted">{t('stores.setup.info.name')}</dt>
              <dd className="text-end font-medium [overflow-wrap:anywhere]">{store.name}</dd>
            </div>
            <div className="flex justify-between gap-3 py-3">
              <dt className="text-muted">{t('stores.setup.info.language')}</dt>
              <dd className="font-medium">{t(`stores.create.language.${store.defaultLanguage}`)}</dd>
            </div>
          </dl>
          <p className="text-sm text-pretty text-muted">{t('stores.setup.info.note')}</p>
          <Button className="min-h-11 self-start" variant="outline" onPress={onEdit}>
            <EditIcon aria-hidden size={16} />
            {t('stores.setup.info.edit')}
          </Button>
        </div>
      )}
      {id !== 'store-information' && state === 'met' && (
        <p className="flex items-center gap-2 text-sm text-success">
          <StatusSuccessIcon aria-hidden size={18} />
          {t('stores.setup.done')}
        </p>
      )}
      {id !== 'store-information' && state !== 'met' && (
        <p className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-4 text-sm text-pretty">
          <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={18} />
          <span>{t(state === 'pending' ? 'stores.setup.pending' : 'stores.setup.unmet')}</span>
        </p>
      )}
    </div>
  )
}

/**
 * The last step. The list holds what still blocks opening, straight from the API's conditions, and is empty
 * when nothing does. The button is the API's call: it is enabled only when `mayOpenForSale` is true.
 */
export function OpenPanel({ onboarding }: { onboarding: Onboarding }) {
  const { t } = useLocale()
  const { store, conditions } = onboarding
  const blocking = blockers(conditions)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-title" id="stores-step-title">{t('stores.setup.open')}</h2>
        <p className="text-sm text-pretty text-muted">{t('stores.setup.open.text', { store: store.name })}</p>
      </div>
      {blocking.length > 0
        ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold" id="stores-blockers">{t('stores.setup.blockers.title')}</h3>
              <ul aria-labelledby="stores-blockers" className="flex flex-col divide-y divide-separator rounded-2xl border border-separator">
                {conditions.filter(condition => condition.state !== 'met').map(condition => (
                  <li key={condition.key} className="flex items-center justify-between gap-3 px-4 py-3" data-blocker={condition.key}>
                    <span className="min-w-0 text-sm">{t(`stores.checklist.${condition.key}`)}</span>
                    <StatusChip tone={tones[condition.state]}>{t(`stores.condition.${condition.state}`)}</StatusChip>
                  </li>
                ))}
              </ul>
            </section>
          )
        : <p className="text-sm text-pretty">{t('stores.setup.blockers.none', { store: store.name })}</p>}
      <OpenForSale onboarding={onboarding} />
    </div>
  )
}
