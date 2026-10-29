import type { Onboarding } from '@sk/api-contract'
import type { StepId } from '../lib/onboarding-steps'
import type { RailStep } from './step-rail'

import { Button, ProgressBar } from '@heroui/react'
import { useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { adjacentStep, firstStep, skippable, STEP_ORDER } from '../lib/onboarding-steps'
import { OpenedView } from './opened-view'
import { SetupFrame } from './setup-frame'
import { ConditionPanel, OpenPanel } from './step-panels'
import { StepRail } from './step-rail'
import { StoreInformationSheet } from './store-information-sheet'

/**
 * Open your store (UX 4.12, direction A): the steps outside the merchant shell, one at a time. From 1024 px the
 * steps sit beside the page; on a phone "All steps" opens them in a sheet. Store information is done from
 * creation and has Edit, in a sheet. A step that is not built yet says so and can be skipped, which only moves the
 * Owner on: the step stays open for the opening rule, and the API alone decides when the store may open.
 */
export function OnboardingSteps({ onboarding }: { onboarding: Onboarding }) {
  const { t } = useLocale()
  const { store, conditions } = onboarding
  const [current, setCurrent] = useState<StepId>(() => firstStep(onboarding.mayOpenForSale))
  const [stepsOpen, setStepsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const title = t('stores.onboarding.title')

  if (store.status === 'live') {
    return (
      <SetupFrame storeName={store.name} title={title}>
        <OpenedView storeName={store.name} />
      </SetupFrame>
    )
  }

  const met = conditions.filter(condition => condition.state === 'met').length
  const stateOf = (id: StepId) => conditions.find(condition => condition.key === id)?.state
  const steps: RailStep[] = STEP_ORDER.map((id) => {
    const state = stateOf(id)

    return {
      id,
      title: t(id === 'open' ? 'stores.setup.open' : `stores.checklist.${id}`),
      note: state ? t(`stores.condition.${state}`) : undefined,
      done: state === 'met',
    }
  })
  const index = STEP_ORDER.indexOf(current)
  const currentState = stateOf(current)
  const rail = (onPick: (id: StepId) => void) => (
    <StepRail current={current} met={met} steps={steps} total={conditions.length} onPick={onPick} />
  )

  return (
    <SetupFrame storeName={store.name} title={title}>
      <div className="flex flex-col gap-2 border-b border-separator bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">
            <span className="font-semibold">{t('stores.setup.steps.of', { n: index + 1, total: STEP_ORDER.length })}</span>
            <span className="text-muted">{` · ${t('stores.checklist.count', { met, total: conditions.length })}`}</span>
          </span>
          <Button size="sm" variant="tertiary" onPress={() => setStepsOpen(true)}>{t('stores.setup.steps.all')}</Button>
        </div>
        <ProgressBar aria-label={t('stores.setup.steps.of', { n: index + 1, total: STEP_ORDER.length })} color="default" maxValue={STEP_ORDER.length} size="sm" value={index + 1}>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-start gap-8 px-4 py-6 pb-28 lg:px-8 lg:py-10">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-6 rounded-3xl bg-surface p-4 shadow-surface">{rail(setCurrent)}</div>
        </aside>
        <section aria-labelledby="stores-step-title" className="flex min-w-0 flex-1 flex-col rounded-3xl bg-surface shadow-surface">
          <div className="min-h-80 p-5 lg:p-8">
            {current === 'open'
              ? <OpenPanel onboarding={onboarding} />
              : currentState && <ConditionPanel id={current} state={currentState} store={store} onEdit={() => setEditing(true)} />}
          </div>
          <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-separator bg-surface px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] lg:static lg:rounded-b-3xl lg:px-8 lg:pb-3">
            <Button className="min-h-11" isDisabled={index === 0} variant="tertiary" onPress={() => setCurrent(adjacentStep(current, -1))}>
              {t('stores.setup.back')}
            </Button>
            {current !== 'open' && currentState && (
              <Button className="min-h-11" variant={skippable(currentState, current) ? 'secondary' : 'primary'} onPress={() => setCurrent(adjacentStep(current, 1))}>
                {t(skippable(currentState, current) ? 'stores.setup.skip' : 'stores.setup.continue')}
              </Button>
            )}
          </div>
        </section>
      </div>
      {stepsOpen && (
        <SheetFrame
          isOpen
          footer={<Button fullWidth className="min-h-11" variant="tertiary" onPress={() => setStepsOpen(false)}>{t('merchantOrder.sheet.close')}</Button>}
          title={t('stores.setup.steps.title')}
          onClose={() => setStepsOpen(false)}
        >
          {rail((id) => {
            setCurrent(id)
            setStepsOpen(false)
          })}
        </SheetFrame>
      )}
      {editing && <StoreInformationSheet store={store} onClose={() => setEditing(false)} />}
    </SetupFrame>
  )
}
