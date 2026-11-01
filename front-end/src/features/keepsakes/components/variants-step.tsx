import type { ProductOption, ProductVariant, VariantCreateBody, VariantSaveBody } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'

import { Button } from '@heroui/react'

import { useConfirm } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { Block } from '@/components/form-block'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, ProductsIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useVariantForm } from '../hooks/use-variant-form'
import { chf } from '../lib/keepsake-rules'
import { combinationName } from '../lib/option-rules'
import { isComplete } from '../lib/variant-rules'
import { VariantDetail } from './variant-detail'

export type SaveVariant = (variantId: string, body: VariantSaveBody) => Promise<Outcome>
export type CreateVariant = (body: VariantCreateBody) => Promise<Outcome>

/** A variant in the list: its name over its price and status, the open one tinted from 1024 px. */
function ListRow({ variant, options, isOpen, onOpen }: { variant: ProductVariant, options: ProductOption[], isOpen: boolean, onOpen: () => void }) {
  const { t, language, intlLocale } = useLocale()
  const title = options.length > 0 ? combinationName(variant.values, options, language) : variant.skuCode
  const status = !isComplete(options, variant.values)
    ? { color: 'text-danger', text: t('keepsakes.variants.needsValue') }
    : variant.status === 'draft'
      ? { color: 'text-muted', text: t('keepsakes.variant.status.hidden') }
      : { color: 'text-success', text: t('keepsakes.variants.onSale') }

  return (
    <li>
      <button
        aria-current={isOpen ? 'true' : undefined}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start outline-none transition-colors duration-150 hover:bg-default/50 focus-visible:focus-ring lg:aria-[current]:bg-default"
        type="button"
        onClick={onOpen}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{title}</span>
          <span className="truncate text-sm text-muted">
            <span className="tabular-nums">{chf(variant.priceRappen, intlLocale)}</span>
            {' · '}
            <span className={`font-medium ${status.color}`}>{status.text}</span>
          </span>
        </span>
        <ChevronRightIcon aria-hidden className="shrink-0 text-muted lg:hidden" size={18} />
      </button>
    </li>
  )
}

/** Archived variants, folded away: they stay for old orders and can't be put back on sale. */
function ArchivedList({ variants, options }: { variants: ProductVariant[], options: ProductOption[] }) {
  const { t, language } = useLocale()

  if (variants.length === 0)
    return null

  return (
    <details className="group px-1 pt-2 text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-muted outline-none focus-visible:focus-ring lg:min-h-0 [&::-webkit-details-marker]:hidden">
        {t('keepsakes.variants.archived', { count: variants.length })}
        <ChevronDownIcon aria-hidden className="transition-transform duration-200 group-open:rotate-180" size={14} />
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-muted">
        {variants.map(variant => (
          <li key={variant.id} className="flex justify-between gap-3">
            <span className="truncate">{options.length > 0 ? combinationName(variant.values, options, language) : variant.skuCode}</span>
            <span className="shrink-0 font-mono text-xs">{variant.skuCode}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{t('keepsakes.variants.archivedNote')}</p>
    </details>
  )
}

/**
 * The Variants step, V2 "list and detail", for a saved keepsake and for a new one (`held`: the variants are in the
 * browser and the commands change that draft). From 1024 px a list on the left and the chosen variant on the right;
 * below it the list is one screen and the variant another, with a way back. A saved keepsake saves a variant at once
 * (ADR-014); a new one saves nothing before Review and publish.
 */
export function VariantsStep({ options, variants, held = false, name, codeFallback = '', onCreate, onSave }: {
  options: ProductOption[]
  variants: ProductVariant[]
  /** The keepsake is only in the browser. */
  held?: boolean
  /** The keepsake's name, the title of the one variant of a keepsake with no option. */
  name: string
  codeFallback?: string
  onCreate: CreateVariant
  onSave: SaveVariant
}) {
  const { t, language } = useLocale()
  const { confirm, dialog } = useConfirm()
  const form = useVariantForm({ options, variants, codeFallback, onCreate, onSave })
  const open = form.editing !== null

  const archive = async (id: string) => {
    const variant = variants.find(v => v.id === id)
    const label = variant ? (options.length > 0 ? combinationName(variant.values, options, language) : variant.skuCode) : ''
    const ok = held
      ? await confirm({ title: t('keepsakes.variants.remove.title', { name: label }), body: t('keepsakes.variants.remove.body'), confirmLabel: t('keepsakes.variants.remove') })
      : await confirm({ title: t('keepsakes.variant.archive.title', { code: variant?.skuCode ?? '' }), body: t('keepsakes.variant.archive.body'), confirmLabel: t('keepsakes.variant.archive.confirm') })

    if (ok)
      await form.archive(id)
  }

  const add = form.canCreate && (
    <Button fullWidth className="mt-2 max-lg:min-h-11" variant="secondary" onPress={() => form.open('new')}>
      <PlusIcon aria-hidden size={16} />
      {t('keepsakes.variants.add')}
    </Button>
  )

  return (
    <Block
      hint={options.length > 0 ? t('keepsakes.variants.footnote', { count: form.live.length, possible: form.possible }) : t('keepsakes.variants.footnote.none')}
      icon={ProductsIcon}
      id="variants"
      title={t('keepsakes.variants.title')}
    >
      {form.live.length === 0 && !open
        ? (
            <>
              <EmptyState compact icon={ProductsIcon} message={t('keepsakes.variants.none')}>
                {form.canCreate && (
                  <Button className="max-lg:min-h-11" onPress={() => form.open('new')}>
                    <PlusIcon aria-hidden size={16} />
                    {t('keepsakes.variants.add')}
                  </Button>
                )}
              </EmptyState>
              <ArchivedList options={options} variants={form.archived} />
            </>
          )
        : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
              <nav aria-label={t('keepsakes.variants.title')} className={`flex min-w-0 flex-col gap-1 ${open ? 'max-lg:hidden' : ''}`}>
                <ul className="flex flex-col gap-1">{form.live.map(variant => <ListRow key={variant.id} isOpen={form.editing === variant.id} options={options} variant={variant} onOpen={() => form.open(variant.id)} />)}</ul>
                {add}
                <ArchivedList options={options} variants={form.archived} />
              </nav>
              <div className={open ? '' : 'max-lg:hidden'}>
                {open
                  ? <VariantDetail key={form.editing} form={form} held={held} title={name} onArchive={id => void archive(id)} />
                  : (
                      <EmptyState compact icon={ProductsIcon} message={t(form.canCreate ? 'keepsakes.variants.pick' : 'keepsakes.variants.pickOnly')}>
                        {form.canCreate && (
                          <Button className="max-lg:min-h-11" size="sm" variant="secondary" onPress={() => form.open('new')}>
                            <PlusIcon aria-hidden size={16} />
                            {t('keepsakes.variants.add')}
                          </Button>
                        )}
                      </EmptyState>
                    )}
              </div>
            </div>
          )}
      {dialog}
    </Block>
  )
}
