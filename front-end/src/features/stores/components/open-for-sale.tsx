import type { Onboarding } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'

import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { blockers } from '../lib/onboarding-steps'
import { ProblemNotice } from './problem-notice'

const refusals: Record<string, MessageKey> = {
  'forbidden': 'stores.open.forbidden',
  'store-not-onboarding': 'stores.open.notOnboarding',
}

/**
 * "Open <store> for sale" (UX 4.12): enabled only when the API says every condition is met, and it says why when
 * it is not. The API checks again, so a screen that is out of date meets a 409 `onboarding-incomplete`, which
 * lists what is still open from a fresh read of the conditions, or says to check the steps when that read finds
 * none open. A successful open is shown by the screen, which reads the store as live.
 */
export function OpenForSale({ onboarding }: { onboarding: Onboarding }) {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  // The refusal shows inline below, so the cache stays silent on error.
  const { submit, isPending, error } = useSubmit('stores', 'openForSale', { meta: { silent: true } })
  const { store, conditions, mayOpenForSale } = onboarding
  const key = useIdempotencyKey({ storeId: store.id })
  const stepName = (id: ReturnType<typeof blockers>[number]) => t(`stores.checklist.${id}`)
  const stillOpen = blockers(conditions).map(stepName).join(', ')
  const problem = error instanceof ApiProblem ? error : undefined
  const locked = !mayOpenForSale || store.status !== 'onboarding'
  const reason = stillOpen ? t('stores.open.blocked', { steps: stillOpen }) : t('stores.open.locked')

  return (
    <div className="flex flex-col gap-3">
      {error && (
        problem?.type === 'onboarding-incomplete'
          ? (
              <p className="rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground" role="alert">
                {stillOpen ? t('stores.open.incomplete', { steps: stillOpen }) : t('stores.open.incompleteNoList')}
              </p>
            )
          : <ProblemNotice error={error} message={problem ? refusals[problem.type] : undefined} />
      )}
      <Button
        aria-describedby={locked ? 'stores-open-locked' : undefined}
        className="min-h-11 self-start max-sm:w-full"
        isDisabled={locked}
        isPending={isPending}
        size="lg"
        onPress={() => submit({ storeId: store.id, idempotencyKey: key.next() }, {
          onSuccess: () => key.settled(),
          onError: (failure) => {
            key.settled(failure)
            void queryClient.invalidateQueries({ queryKey: queryKeys.stores.onboarding })
          },
        })}
      >
        {t('stores.open.action', { store: store.name })}
      </Button>
      {locked && <p className="text-sm text-muted" id="stores-open-locked">{reason}</p>}
    </div>
  )
}
