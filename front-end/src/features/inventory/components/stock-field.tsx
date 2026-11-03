import type { StockRow } from '@sk/api-contract'

import { QuantityBox } from '@/components/quantity-stepper'
import { useLocale } from '@/contexts/locale-context'
import { useStockSave } from '../hooks/use-stock-save'
import { STOCK_MAX } from '../lib/quantity'

/** One variant's In stock box: it saves when the field is left, on Enter or on a step, and the refusal stays under it. */
export function StockField({ storeId, row }: { storeId: string, row: StockRow }) {
  const { t } = useLocale()
  const { error, restore, save } = useStockSave(storeId, row)

  return (
    <div className="flex flex-col items-start gap-1">
      <QuantityBox
        key={restore}
        label={t('inventory.field', { code: row.code ?? '' })}
        max={STOCK_MAX}
        min={0}
        value={row.onHand}
        onChange={value => save(String(value))}
        onText={save}
      />
      {error && <p className="max-w-48 text-xs text-danger" role="alert">{error}</p>}
    </div>
  )
}
