import type { ProductVariant } from '@sk/api-contract'
import type { SetStock } from '../lib/variant-actions'

import { StatusText } from '@/components/status-text'
import { useLocale } from '@/contexts/locale-context'
import { StockInput } from '@/features/inventory/components/stock-field'
import { useStockDraft } from '@/features/inventory/hooks/use-stock-save'

/**
 * The In stock box of one variant row (decision record 2026-11-02, item 25): the shared quantity box, bound to this
 * variant's own stock and no other. The figure saves when the box is left, on Enter or on a step (`onSet`); a refusal below
 * the reserved units stays under the box and the saved figure comes back. Under the box, "Reserved n" in muted text when
 * orders hold units, and "Sold out" in the danger colour when none is left to sell. The row stays.
 */
export function VariantStock({ variant, name, onSet }: { variant: ProductVariant, name: string, onSet: SetStock }) {
  const { t } = useLocale()
  const reserved = variant.reserved ?? 0
  const stock = useStockDraft({ onHand: variant.onHand ?? 0 }, async (figure) => {
    const outcome = await onSet(variant, figure)

    return outcome.ok ? undefined : outcome.message
  })

  return (
    <StockInput errorClassName="max-w-56" label={t('keepsakes.variants.stockOf', { name })} stock={stock}>
      {reserved > 0 && <span className="text-xs text-muted">{t('keepsakes.variants.reserved', { count: reserved })}</span>}
      {stock.draft - reserved <= 0 && <StatusText tone="danger">{t('inventory.soldOut')}</StatusText>}
    </StockInput>
  )
}
