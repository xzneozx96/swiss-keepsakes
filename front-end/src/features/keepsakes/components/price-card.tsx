import type { ProductVariant } from '@sk/api-contract'
import type { SaveVariant } from '../lib/variant-actions'

import { FieldError, Input, Label, ListBox, Select, TextField } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { CashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { isSkuCode, toRappen } from '../lib/keepsake-rules'
import { problemMessageKey } from '../lib/problems'

const NOT_NUMBER = /[^\d.]/g

/**
 * The Price card of a keepsake that has no options: its one variant edited in place, so the price is not hidden behind
 * another step. Price, SKU code and status each save when the field is left (a status when it is chosen). A keepsake that
 * is only in the browser has no status and may leave the code empty: the name makes one. Stock is not here; it belongs to
 * Inventory (E6.3).
 */
export function PriceCard({ variant, held, codeFallback, showErrors, onSave }: {
  variant: ProductVariant
  held: boolean
  /** The code a new keepsake offers while the field is empty. */
  codeFallback: string
  /** A Next that needed a price (new keepsake): the empty field says so. */
  showErrors: boolean
  onSave: SaveVariant
}) {
  const { t } = useLocale()
  const [price, setPrice] = useState(variant.priceRappen > 0 ? (variant.priceRappen / 100).toFixed(2) : '')
  const [code, setCode] = useState(variant.skuCode)
  const [problem, setProblem] = useState<{ price?: string, code?: string }>({})
  const rappen = toRappen(price === '' ? undefined : Number(price))
  const priceError = problem.price ?? (showErrors && rappen === undefined ? t('keepsakes.variant.priceInvalid') : undefined)

  const send = async (body: Parameters<SaveVariant>[1], at: 'price' | 'code') => {
    setProblem({})
    const outcome = await onSave(variant.id, body)

    if (outcome.ok)
      return
    setProblem({ [at]: outcome.type === 'sku-code-taken' ? t('keepsakes.variant.codeTaken', { code: body.skuCode ?? code }) : t(problemMessageKey(outcome.type)) })
  }
  const leavePrice = () => {
    if (rappen === undefined)
      setProblem({ price: t('keepsakes.variant.priceInvalid') })
    else if (rappen !== variant.priceRappen)
      void send({ priceRappen: rappen }, 'price')
    else
      setProblem({})
  }
  const leaveCode = () => {
    const trimmed = code.trim()

    if (held ? trimmed !== '' && !isSkuCode(trimmed) : !trimmed || !isSkuCode(trimmed))
      setProblem({ code: t(trimmed ? 'keepsakes.variant.codeInvalid' : 'keepsakes.variant.codeRequired') })
    else if (trimmed !== variant.skuCode)
      void send({ skuCode: trimmed }, 'code')
    else
      setProblem({})
  }

  return (
    <Block hint={t('keepsakes.price.hint')} icon={CashIcon} id="price" title={t('keepsakes.price.title')}>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField fullWidth isInvalid={priceError !== undefined} value={price} onChange={next => setPrice(next.replace(',', '.').replace(NOT_NUMBER, ''))}>
          <Label>{t('keepsakes.variants.price')}</Label>
          <Input inputMode="decimal" placeholder="0.00" onBlur={leavePrice} />
          <FieldError>{priceError}</FieldError>
        </TextField>
        <TextField fullWidth isInvalid={problem.code !== undefined} value={code} onChange={next => setCode(next.toUpperCase())}>
          <Label>{t('keepsakes.variant.code')}</Label>
          <Input className="font-mono" maxLength={60} placeholder={codeFallback || 'VX-1'} onBlur={leaveCode} />
          <FieldError>{problem.code}</FieldError>
        </TextField>
        {!held && (
          <Select fullWidth selectedKey={variant.status === 'draft' ? 'draft' : 'published'} onSelectionChange={key => key !== null && void send({ status: key === 'draft' ? 'draft' : 'published' }, 'price')}>
            <Label>{t('keepsakes.variant.status')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="published" textValue={t('keepsakes.variant.status.published')}>
                  {t('keepsakes.variant.status.published')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="draft" textValue={t('keepsakes.variant.status.hidden')}>
                  {t('keepsakes.variant.status.hidden')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        )}
      </div>
      {held && <p className="text-xs text-pretty text-muted">{t('keepsakes.variants.draftSale')}</p>}
    </Block>
  )
}
