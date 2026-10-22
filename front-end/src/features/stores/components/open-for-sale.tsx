import type { Onboarding } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { Button, toast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'

import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { ProblemNotice } from './problem-notice'

const refusals: Record<string, MessageKey> = {
  'forbidden': 'stores.open.forbidden',
  'store-not-onboarding': 'stores.open.notOnboarding',
}

/**
 * "Open for sale" (UX 4.12): enabled only when the API says every condition is met. The API checks again,
 * so a screen that is out of date meets a 409 `onboarding-incomplete`, which lists what is still open from a
 * fresh read of the conditions.
 */
export function OpenForSale({ onboarding }: { onboarding: Onboarding }) {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const open = useCommand('stores', 'openForSale')
  const { store, conditions, mayOpenForSale } = onboarding

  if (store.status === 'live') {
    return (
      <p className="rounded-2xl bg-success-soft p-4 text-sm text-success-soft-foreground" role="status">
        {t('stores.open.live')}
      </p>
    )
  }

  const stillOpen = conditions
    .filter(condition => condition.state !== 'met')
    .map(condition => t(`stores.checklist.${condition.key}`))
    .join(', ')
  const problem = open.error instanceof ApiProblem ? open.error : undefined

  return (
    <section className="flex flex-col gap-3">
      {open.isError && (
        problem?.type === 'onboarding-incomplete'
          ? (
              <p className="rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground" role="alert">
                {t('stores.open.incomplete', { steps: stillOpen })}
              </p>
            )
          : <ProblemNotice error={open.error} message={problem ? refusals[problem.type] : undefined} />
      )}
      <Button
        fullWidth
        isDisabled={!mayOpenForSale || store.status !== 'onboarding'}
        isPending={open.isPending}
        size="lg"
        onPress={() => open.mutate({ storeId: store.id }, {
          onSuccess: () => toast.success(t('stores.open.live')),
          onError: () => void queryClient.invalidateQueries({ queryKey: queryKeys.stores.onboarding }),
        })}
      >
        {t('stores.open.action')}
      </Button>
      {!mayOpenForSale && <p className="text-center text-sm text-muted">{t('stores.open.locked')}</p>}
    </section>
  )
}
