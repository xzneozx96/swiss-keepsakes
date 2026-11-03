import type { ProductVariant } from '@sk/api-contract'
import type { CreateVariant, SaveVariant } from '../lib/variant-actions'

import { FieldError, Input, Label, ListBox, Select, TextField } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { CashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { isSkuCode, toRappen } from '../lib/keepsake-rules'
import { problemMessageKey } from '../lib/problems'
import { SkuSwitch } from './sku-switch'

const NOT_NUMBER = /[^\d.]/g

/**
 * The Price card of a keepsake that has no options: its one variant edited in place, so the price is not hidden behind
 * another step. Price, SKU code and status each save when the field is left (a status when it is chosen). The SKU code is
 * optional and shows only while the SKU switch is on. A keepsake that is only in the browser has no status. Stock is not here; it belongs to
 * Inventory (E6.3).
 *
 * A keepsake with no options always has this card (owner 2026-11-03). With no variant (`variant` left out) the fields start
 * empty and For sale; a code or status chosen first is kept in the card, and the first valid price creates the variant
 * (`onCreate`) with all three. Then the card is the one of the variant.
 */
export function PriceCard({ variant, held, sku, showErrors, onSave, onCreate }: {
  variant?: ProductVariant
  held: boolean
  /** The SKU switch: the code field shows while it is on. */
  sku: { isOn: boolean, onChange: (on: boolean) => void }
  /** A Next that needed a price (new keepsake): the empty field says so. */
  showErrors: boolean
  onSave: SaveVariant
  onCreate: CreateVariant
}) {
  const { t } = useLocale()
  const [price, setPrice] = useState(variant && variant.priceRappen > 0 ? (variant.priceRappen / 100).toFixed(2) : '')
  const [code, setCode] = useState(variant?.skuCode ?? '')
  const [status, setStatus] = useState<'published' | 'draft'>('published')
  const [problem, setProblem] = useState<{ price?: string, code?: string }>({})
  const rappen = toRappen(price === '' ? undefined : Number(price))
  const priceError = problem.price ?? (showErrors && rappen === undefined ? t('keepsakes.variant.priceInvalid') : undefined)

  const send = async (body: Parameters<SaveVariant>[1], at: 'price' | 'code') => {
    setProblem({})
    const outcome = await (variant ? onSave(variant.id, body) : onCreate({ priceRappen: rappen ?? 0, skuCode: code.trim() || null, status }))

    if (outcome.ok)
      return
    setProblem({ [at]: outcome.type === 'sku-code-taken' ? t('keepsakes.variant.codeTaken', { code: body.skuCode ?? code }) : t(problemMessageKey(outcome.type)) })
  }
  const leavePrice = () => {
    if (rappen !== undefined)
      setPrice((rappen / 100).toFixed(2))
    if (rappen === undefined)
      setProblem({ price: t('keepsakes.variant.priceInvalid') })
    else if (rappen !== variant?.priceRappen)
      void send({ priceRappen: rappen }, 'price')
    else
      setProblem({})
  }
  const chooseStatus = (next: 'published' | 'draft') => {
    if (variant)
      void send({ status: next }, 'price')
    else
      setStatus(next)
  }
  const leaveCode = () => {
    const trimmed = code.trim()

    // A code is optional: left empty it is none.
    if (trimmed !== '' && !isSkuCode(trimmed))
      setProblem({ code: t('keepsakes.variant.codeInvalid') })
    else if (variant && trimmed !== (variant.skuCode ?? ''))
      void send({ skuCode: trimmed || null }, 'code')
    else
      setProblem({})
  }

  return (
    <Block hint={t('keepsakes.price.hint')} icon={CashIcon} id="price" title={t('keepsakes.price.title')}>
      <SkuSwitch isOn={sku.isOn} onChange={sku.onChange} />
      <div className={`grid gap-4 ${sku.isOn ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <TextField fullWidth isInvalid={priceError !== undefined} value={price} onChange={next => setPrice(next.replace(',', '.').replace(NOT_NUMBER, ''))}>
          <Label>{t('keepsakes.variants.price')}</Label>
          <Input inputMode="decimal" placeholder="0.00" onBlur={leavePrice} />
          <FieldError>{priceError}</FieldError>
        </TextField>
        {sku.isOn && (
          <TextField fullWidth isInvalid={problem.code !== undefined} value={code} onChange={next => setCode(next.toUpperCase())}>
            <Label>{t('keepsakes.variant.code')}</Label>
            <Input className="font-mono" maxLength={60} placeholder="1.6795" onBlur={leaveCode} />
            <FieldError>{problem.code}</FieldError>
          </TextField>
        )}
        {!held && (
          <Select fullWidth selectedKey={(variant?.status ?? status) === 'draft' ? 'draft' : 'published'} onSelectionChange={key => key !== null && chooseStatus(key === 'draft' ? 'draft' : 'published')}>
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
