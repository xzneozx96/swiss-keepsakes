import type { Onboarding } from '@sk/api-contract'
import type { StepId } from '../lib/onboarding-steps'

import { useState } from 'react'

import { StepBar } from '@/components/step-bar'
import { StepLayout } from '@/components/step-layout'
import { useLocale } from '@/contexts/locale-context'
import { adjacentStep, firstStep, skippable, STEP_ORDER } from '../lib/onboarding-steps'
import { OpenedView } from './opened-view'
import { SetupFrame } from './setup-frame'
import { ConditionPanel, OpenPanel } from './step-panels'
import { StoreInformationSheet } from './store-information-sheet'

/**
 * Open your store (UX 4.12): the merchant editors' stepper outside the merchant shell, one step at a time. The
 * steps are the shared step list (a sheet on a phone), each step's content sits in blocks and the shared bar
 * has Back, and Continue or Skip. Store information is done from creation and has Edit, in a sheet. A step that
 * is not built yet says so and can be skipped, which only moves the Owner on: the step stays open for the opening
 * rule, and the API alone decides when the store may open.
 */
export function OnboardingSteps({ onboarding }: { onboarding: Onboarding }) {
  const { t } = useLocale()
  const { store, conditions } = onboarding
  const [current, setCurrent] = useState<StepId>(() => firstStep(onboarding.mayOpenForSale))
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
  const steps = STEP_ORDER.map(id => ({
    id,
    label: t(id === 'open' ? 'stores.setup.open' : `stores.checklist.${id}`),
    status: stateOf(id) === 'met' ? 'done' as const : 'todo' as const,
  }))
  const index = STEP_ORDER.indexOf(current)
  const currentState = stateOf(current)
  const move = (delta: -1 | 1) => () => setCurrent(adjacentStep(current, delta))
  const onward = current === 'open' || !currentState
    ? undefined
    : { label: t(skippable(currentState, current) ? 'stores.setup.skip' : 'stores.setup.continue'), onPress: move(1) }

  return (
    <SetupFrame showTitle storeName={store.name} title={title}>
      <StepLayout canGo={() => true} current={current} quietTitle steps={steps} onGo={id => setCurrent(id as StepId)}>
        {current === 'open'
          ? <OpenPanel onboarding={onboarding} />
          : currentState && <ConditionPanel id={current} state={currentState} store={store} onEdit={() => setEditing(true)} />}
        <StepBar
          aboveTabBar={false}
          isSaving={false}
          primary={onward && currentState === 'met' ? onward : undefined}
          secondary={onward && currentState !== 'met' ? onward : undefined}
          status={t('stores.checklist.count', { met, total: conditions.length })}
          tone={met === conditions.length ? 'success' : 'muted'}
          onBack={index === 0 ? undefined : move(-1)}
        />
      </StepLayout>
      {editing && <StoreInformationSheet store={store} onClose={() => setEditing(false)} />}
    </SetupFrame>
  )
}
