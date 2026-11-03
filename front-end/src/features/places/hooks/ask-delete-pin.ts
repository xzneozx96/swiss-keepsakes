import type { PinUses } from '../lib/problems'
import type { ConfirmOptions } from '@/components/confirm-dialog'
import type { useLocale } from '@/contexts/locale-context'
import type { MessageKey } from '@/i18n/en'

import { ApiProblem } from '@/features/data-client/errors'
import { pinUsesOf, problemMessageKey } from '../lib/problems'

type Locale = ReturnType<typeof useLocale>

/** "2 stories, 1 editorial review and 1 tour": only what uses the pin, in the merchant's language. */
export function usedByText({ t }: Pick<Locale, 't'>, uses: PinUses) {
  const part = (kind: keyof PinUses) => uses[kind] > 0 ? [t(`places.delete.used.${kind}.${uses[kind] === 1 ? 'one' : 'other'}` as MessageKey, { count: uses[kind] })] : []

  const parts = [...part('stories'), ...part('reviews'), ...part('tours')]

  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} ${t('places.delete.and')} ${parts.at(-1)}`
}

/** The words for a refusal of a delete: what uses the pin, or the screen's line for any other problem. */
export function deleteProblemText(locale: Locale, error: unknown) {
  const uses = pinUsesOf(error)

  return uses
    ? locale.t('places.problem.pinInUse', { usedBy: usedByText(locale, uses) })
    : locale.t(problemMessageKey(error instanceof ApiProblem ? error.type : 'unknown'))
}

/**
 * Delete after a confirm that says it cannot be undone. A pin that a story, review or tour uses is refused by the
 * server: a pin that is not hidden yet then gets a second dialog naming what uses it, with Hide as its action; a hidden
 * pin keeps the first dialog open with the reason in it. Any other refusal stays in the first dialog.
 * Resolves true when the pin is gone.
 */
export async function askDeletePin(
  { locale, confirm, name, canHide, remove, hide }: {
    locale: Locale
    confirm: (options: ConfirmOptions) => Promise<boolean>
    name: string
    canHide: boolean
    remove: () => Promise<unknown>
    hide: () => Promise<unknown>
  },
) {
  const { t } = locale
  let uses: PinUses | undefined
  const confirmed = await confirm({
    title: t('places.delete.title', { name }),
    body: t('places.delete.body'),
    confirmLabel: t('places.delete.confirm'),
    problem: error => deleteProblemText(locale, error),
    run: () => remove().catch((error: unknown) => {
      uses = pinUsesOf(error)
      if (!uses || !canHide)
        throw error
    }),
  })

  if (!confirmed || !uses)
    return confirmed
  await confirm({
    title: t('places.delete.refusedTitle', { name }),
    body: t('places.delete.refusedBody', { usedBy: usedByText(locale, uses) }),
    confirmLabel: t('places.hide.confirm'),
    problem: error => deleteProblemText(locale, error),
    run: hide,
  })

  return false
}
