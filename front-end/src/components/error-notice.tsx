import { Button, EmptyState as HeroEmptyState } from '@heroui/react'

import { ResetIcon, StatusDangerIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

/**
 * A failed read or write shown in place of the content, laid out like `EmptyState` (centred: an icon slot, one
 * sentence, one action) in the danger tone: what happened, the reference to quote when the API gave one, and Try again
 * as the red primary button with a refresh icon. Every feature's load-error panel uses this one.
 */
export function ErrorNotice({ message, reference, onRetry, compact = false }: {
  /** The sentence to show, already in the reader's language. */
  message: string
  /** The request id the API gave with the failure, for the reader to quote. */
  reference?: string | null
  onRetry?: () => void
  /** Inside a card or block that has its own padding: smaller icon and spacing, as `EmptyState compact`. */
  compact?: boolean
}) {
  const { t } = useLocale()

  return (
    <HeroEmptyState className={`flex flex-col items-center text-center ${compact ? 'gap-2 px-2 py-3' : 'gap-3 px-4 py-6'}`} role="alert">
      <span
        aria-hidden
        className={`flex items-center justify-center bg-danger-soft text-danger ${compact ? 'size-12 rounded-xl' : 'size-14 rounded-2xl'}`}
      >
        <StatusDangerIcon size={compact ? 24 : 28} />
      </span>
      <p className="max-w-xs text-sm text-pretty text-danger">{message}</p>
      {reference && <p className="text-xs text-muted">{t('errorNotice.reference', { id: reference })}</p>}
      {onRetry && (
        <Button className="max-lg:min-h-11" size="sm" variant="primary" onPress={onRetry}>
          <ResetIcon aria-hidden size={16} />
          {t('errorNotice.retry')}
        </Button>
      )}
    </HeroEmptyState>
  )
}
