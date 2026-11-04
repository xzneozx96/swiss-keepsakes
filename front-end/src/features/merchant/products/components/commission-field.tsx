import { Description, FieldError, NumberField } from '@heroui/react'
import { PartnersIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'

/**
 * The commission field: a number of percent, 0 to 50, with a step button each side. `help` shows the one line under it;
 * a block that has its own help line leaves it off.
 */
export function CommissionField({
  value,
  onChange,
  error,
  help = true,
}: {
  value: number
  onChange: (value: number) => void
  error?: string
  help?: boolean
}) {
  const { t } = useLocale()
  const step
    = 'size-12 shrink-0 rounded-full border-0 bg-surface-secondary text-foreground disabled:opacity-30 data-[pressed=true]:scale-95'

  return (
    <NumberField
      aria-label={t('products.commission.rate')}
      className="items-center gap-2"
      formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
      isInvalid={error !== undefined}
      maxValue={50}
      minValue={0}
      step={1}
      value={Math.round(value * 100)}
      onChange={(points) => {
        if (!Number.isNaN(points))
          onChange(points / 100)
      }}
    >
      <NumberField.Group className="flex h-auto items-center gap-4 overflow-visible border-0 bg-transparent shadow-none">
        <NumberField.DecrementButton className={step} />
        <NumberField.Input
          className="w-28 bg-transparent p-0 text-center text-5xl leading-none font-semibold tabular-nums shadow-none"
          inputMode="numeric"
        />
        <NumberField.IncrementButton className={step} />
      </NumberField.Group>
      {help && (
        <Description className="text-center">
          {t('products.commission.help')}
        </Description>
      )}
      <FieldError>{error}</FieldError>
    </NumberField>
  )
}

/** Commission for referral partners (AC09); orders snapshot the rate (O08). */
export function CommissionCard({
  value,
  onChange,
  error,
}: {
  value: number
  onChange: (value: number) => void
  error?: string
}) {
  const { t } = useLocale()

  return (
    <DetailCard icon={PartnersIcon} title={t('products.commission.title')}>
      <CommissionField error={error} value={value} onChange={onChange} />
    </DetailCard>
  )
}
