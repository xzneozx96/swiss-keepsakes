import type { StockRow } from '@sk/api-contract'

import { useEffect, useRef } from 'react'

import { QuantityBox } from '@/components/quantity-stepper'
import { useLocale } from '@/contexts/locale-context'
import { useStockSave } from '../hooks/use-stock-save'
import { STOCK_MAX } from '../lib/quantity'

/** One variant's In stock box: it saves when the field is left, on Enter or on a step, and the refusal stays under it. */
export function StockField({ storeId, row }: { storeId: string, row: StockRow }) {
  const { t } = useLocale()
  const { draft, error, restore, step, text } = useStockSave(storeId, row)
  const boxRef = useRef<HTMLDivElement>(null)
  const hadFocusRef = useRef(false)

  // A refusal remounts the box to drop the text it holds. When the figure was sent with Enter the focus was in it:
  // give it back, unless the merchant has already gone on to something else.
  useEffect(() => {
    if (hadFocusRef.current && document.activeElement === document.body)
      boxRef.current?.querySelector('input')?.focus()
    hadFocusRef.current = false
  }, [restore])

  return (
    <div className="flex flex-col items-start gap-1">
      <div ref={boxRef}>
        <QuantityBox
          key={restore}
          label={t('inventory.field', { code: row.code ?? '' })}
          max={STOCK_MAX}
          min={0}
          value={draft}
          onChange={step}
          onText={(typed) => {
            hadFocusRef.current = boxRef.current?.contains(document.activeElement) ?? false
            text(typed)
          }}
        />
      </div>
      {error && <p className="max-w-48 text-xs text-danger" role="alert">{error}</p>}
    </div>
  )
}
