import { Button, Input } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { toRappen } from '../lib/keepsake-rules'

const NOT_NUMBER = /[^\d.]/g

/**
 * The price for the ticked variants, opened by Set price on the shared ActionBar: one field, Apply and Cancel, above
 * the rows. Apply sends one request for all of them.
 */
export function VariantsPriceForm({ count, isPending, onApply, onCancel }: {
  count: number
  isPending: boolean
  onApply: (rappen: number) => void
  onCancel: () => void
}) {
  const { t } = useLocale()
  const [text, setText] = useState('')
  const rappen = toRappen(text === '' ? undefined : Number(text))
  const fieldRef = useRef<HTMLInputElement>(null)

  // Set price was pressed on the bar: the field is where the next keystroke goes.
  useEffect(() => fieldRef.current?.focus(), [])

  return (
    <form
      className="flex flex-wrap items-center gap-2 px-2"
      data-testid="bulk-price"
      onSubmit={(event) => {
        event.preventDefault()
        if (rappen !== undefined)
          onApply(rappen)
      }}
    >
      <span className="me-auto text-sm font-medium">{t('keepsakes.variants.bulk.priceFor', { count })}</span>
      <Input ref={fieldRef} aria-label={t('keepsakes.variants.bulk.priceLabel')} className="w-28 text-end tabular-nums" inputMode="decimal" placeholder="0.00" value={text} onChange={event => setText(event.target.value.replace(',', '.').replace(NOT_NUMBER, ''))} />
      <Button className="max-lg:h-11" isDisabled={rappen === undefined || isPending} size="sm" type="submit">{t('keepsakes.variants.bulk.apply')}</Button>
      <Button className="max-lg:h-11" size="sm" variant="tertiary" onPress={onCancel}>{t('keepsakes.variant.cancel')}</Button>
    </form>
  )
}
