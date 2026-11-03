import type { StockRow } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { QuantityStepper } from '@/components/quantity-stepper'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useCommand } from '@/features/data-client/use-command'
import { belowReservedText, refusalText } from '../lib/problems'
import { STOCK_MAX } from '../lib/quantity'

/**
 * Adjust stock: the In stock figure of one variant in the shared sheet, with the reserved units as the hint and the
 * units that would be available under it. A figure below the reserved units is refused here and Save is off, so the
 * merchant never sends it. The API refuses it too, and its refusal stays in the sheet (the write is `silent`: no error toast; a save shows "{code}: {n} in stock.").
 * Saving refreshes the page's data and closes the sheet.
 */
export function AdjustStockSheet({ storeId, row, onClose }: { storeId: string, row: Pick<StockRow, 'skuId' | 'code' | 'onHand' | 'reserved'>, onClose: () => void }) {
  const { t } = useLocale()
  const { mutateAsync, isPending } = useCommand('inventory', 'set', { meta: { silent: true, success: (_, input) => t('inventory.adjust.saved', { code: row.code ?? '', count: input.onHand }) } })
  const [value, setValue] = useState(row.onHand)
  const [refusal, setRefusal] = useState<string>()
  const below = value < row.reserved
  const available = Math.max(0, value - row.reserved)
  const error = below ? t(belowReservedText(row.reserved), { count: row.reserved }) : refusal

  const save = async () => {
    setRefusal(undefined)
    try {
      await mutateAsync({ storeId, skuId: row.skuId, onHand: value, idempotencyKey: crypto.randomUUID() })
      onClose()
    }
    catch (failure) {
      setRefusal(refusalText(t, failure, row.reserved))
    }
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button className="min-h-11" isDisabled={below} isPending={isPending} onPress={() => void save()}>{t('inventory.adjust.save')}</Button>
          <Button className="min-h-11" isDisabled={isPending} variant="tertiary" onPress={onClose}>{t('inventory.adjust.cancel')}</Button>
        </>
      )}
      title={t('inventory.adjust.title', { code: row.code ?? '' })}
      onClose={onClose}
    >
      <QuantityStepper
        hint={t('inventory.adjust.hint', { count: row.reserved })}
        label={t('inventory.column.inStock')}
        max={STOCK_MAX}
        min={0}
        value={value}
        onChange={(next) => {
          setValue(next)
          setRefusal(undefined)
        }}
      />
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {/* Available is its own line, not joined to the reserved hint. */}
      <p className="text-sm text-pretty text-muted">
        {t('inventory.adjust.available', { count: available })}
        {available === 0 && ` ${t('inventory.adjust.soldOut')}`}
      </p>
    </SheetFrame>
  )
}
