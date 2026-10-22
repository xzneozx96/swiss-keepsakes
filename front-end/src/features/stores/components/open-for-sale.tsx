import type { Onboarding } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { Button, toast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { ProblemNotice } from './problem-notice'

const refusals: Record<string, MessageKey> = {
  'forbidden': 'stores.open.forbidden',
  'store-not-onboarding': 'stores.open.notOnboarding',
}

/**
 * "Open for sale" (UX 4.12): enabled only when the API says every condition is met. The API checks again,
 * so a screen that is out of date meets a 409 `onboarding-incomplete`, which lists what is still open from a
 * fresh read of the conditions, or says to check the steps when that read finds none open.
 */
export function OpenForSale({ onboarding }: { onboarding: Onboarding }) {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const { submit, isPending, error } = useSubmit('stores', 'openForSale')
  const { store, conditions, mayOpenForSale } = onboarding
  const key = useIdempotencyKey({ storeId: store.id })
  const liveRef = useRef<HTMLParagraphElement>(null)
  const isLive = store.status === 'live'

  useEffect(() => {
    if (isLive)
      liveRef.current?.focus()
  }, [isLive])

  if (isLive) {
    return (
      <p ref={liveRef} className="rounded-2xl bg-success-soft p-4 text-sm text-success-soft-foreground outline-none" role="status" tabIndex={-1}>
        {t('stores.open.live')}
      </p>
    )
  }

  const stillOpen = conditions
    .filter(condition => condition.state !== 'met')
    .map(condition => t(`stores.checklist.${condition.key}`))
    .join(', ')
  const problem = error instanceof ApiProblem ? error : undefined
  const locked = !mayOpenForSale || store.status !== 'onboarding'

  return (
    <section className="flex flex-col gap-3">
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
        fullWidth
        aria-describedby={mayOpenForSale ? undefined : 'stores-open-locked'}
        isDisabled={locked}
        isPending={isPending}
        size="lg"
        onPress={() => submit({ storeId: store.id, idempotencyKey: key.next() }, {
          onSuccess: () => {
            key.settled()
            toast.success(t('stores.open.live'))
          },
          onError: (failure) => {
            key.settled(failure)
            void queryClient.invalidateQueries({ queryKey: queryKeys.stores.onboarding })
          },
        })}
      >
        {t('stores.open.action')}
      </Button>
      {!mayOpenForSale && <p className="text-center text-sm text-muted" id="stores-open-locked">{t('stores.open.locked')}</p>}
    </section>
  )
}
