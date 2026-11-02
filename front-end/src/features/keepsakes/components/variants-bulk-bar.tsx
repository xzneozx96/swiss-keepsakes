import { Button, Input } from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { toRappen } from '../lib/keepsake-rules'

const NOT_NUMBER = /[^\d.]/g

/**
 * What can be done with the ticked variants, in one request: set a price, put on sale, hide, archive. A keepsake that is
 * only in the browser has no status, so it offers the price and Remove. Archiving is final and asks first (the caller's
 * dialog).
 */
export function VariantsBulkBar({ count, held, isPending, onPrice, onStatus, onArchive }: {
  count: number
  held: boolean
  isPending: boolean
  onPrice: (rappen: number) => void
  onStatus: (status: 'published' | 'draft') => void
  onArchive: () => void
}) {
  const { t } = useLocale()
  const [pricing, setPricing] = useState(false)
  const [text, setText] = useState('')
  const rappen = toRappen(text === '' ? undefined : Number(text))

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-default px-3 py-2" data-testid="bulk-bar">
      <span aria-live="polite" className="me-auto text-sm font-medium" role="status">{t(count === 1 ? 'keepsakes.variants.selected.one' : 'keepsakes.variants.selected.other', { count })}</span>
      {pricing
        ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (rappen === undefined)
                  return
                onPrice(rappen)
                setPricing(false)
                setText('')
              }}
            >
              <Input aria-label={t('keepsakes.variants.bulk.priceLabel')} className="w-24 text-end tabular-nums" inputMode="decimal" placeholder="0.00" value={text} variant="secondary" onChange={event => setText(event.target.value.replace(',', '.').replace(NOT_NUMBER, ''))} />
              <Button className="max-lg:h-11" isDisabled={rappen === undefined || isPending} size="sm" type="submit">{t('keepsakes.variants.bulk.apply')}</Button>
              <Button className="max-lg:h-11" size="sm" variant="tertiary" onPress={() => setPricing(false)}>{t('keepsakes.variant.cancel')}</Button>
            </form>
          )
        : (
            <>
              <Button className="max-lg:h-11" isDisabled={isPending} size="sm" variant="tertiary" onPress={() => setPricing(true)}>{t('keepsakes.variants.bulk.setPrice')}</Button>
              {!held && <Button className="max-lg:h-11" isDisabled={isPending} size="sm" variant="tertiary" onPress={() => onStatus('published')}>{t('keepsakes.variant.status.published')}</Button>}
              {!held && <Button className="max-lg:h-11" isDisabled={isPending} size="sm" variant="tertiary" onPress={() => onStatus('draft')}>{t('keepsakes.variant.status.hidden')}</Button>}
              <Button className="max-lg:h-11" isDisabled={isPending} size="sm" variant="danger-soft" onPress={onArchive}>{t(held ? 'keepsakes.variants.remove' : 'keepsakes.variant.archive')}</Button>
            </>
          )}
    </div>
  )
}
