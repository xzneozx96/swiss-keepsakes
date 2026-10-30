import type { Product, ProductVariant, VariantCreateBody, VariantSaveBody } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'
import type { DataTableColumn } from '@/components/data-table'

import { Button } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { DataTable } from '@/components/data-table'
import { ArchiveIcon, EditIcon, OptionIcon, PlusIcon, StatusNeutralIcon, StatusSuccessIcon } from '@/components/icons'
import { PageTabs } from '@/components/page-tabs'
import { RouterLink } from '@/components/router-link'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { chf } from '../lib/keepsake-rules'
import { refusalText, shortLabel, variantTitle } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { VARIANT_PATH } from '../lib/search-params'
import { KeepsakeCard } from './keepsake-card'
import { RefusalAlert, VariantThumb } from './option-parts'
import { VariantSheet } from './variant-sheet'

// E6.3 adds Sold out, with the stock lines.
const TABS = ['all', 'for-sale', 'hidden', 'archived'] as const

type Tab = (typeof TABS)[number]
type Action = 'edit' | 'toggle' | 'archive'

export type SaveVariant = (variantId: string, body: VariantSaveBody) => Promise<Outcome>
export type CreateVariant = (body: VariantCreateBody) => Promise<Outcome>

function inTab(variant: ProductVariant, tab: Tab) {
  switch (tab) {
    case 'all': return variant.status !== 'archived'
    case 'for-sale': return variant.status === 'published'
    case 'hidden': return variant.status === 'draft'
    case 'archived': return variant.status === 'archived'
  }
}

/**
 * The Variants card (N15): the sold combinations as a table, one column per option, with the tabs All, For sale, Hidden
 * and Archived. A variant opens on its own page; Edit does the same. Hide, Put on sale and Archive change the status at
 * once. Archiving keeps the variant for old orders and is final, so it asks first. Create opens the variant sheet.
 */
export function VariantsCard({ keepsake, onSave, onCreate }: { keepsake: Product, onSave: SaveVariant, onCreate: CreateVariant }) {
  const { t, intlLocale, language } = useLocale()
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()
  const [tab, setTab] = useState<Tab>('all')
  const [creating, setCreating] = useState(false)
  const [refusal, setRefusal] = useState<string>()
  const { options } = keepsake
  const rows = keepsake.variants.filter(variant => inTab(variant, tab))
  const count = (which: Tab) => keepsake.variants.filter(variant => inTab(variant, which)).length
  const cover = keepsake.photos[0]
  const live = keepsake.variants.filter(variant => variant.status !== 'archived')
  const possible = options.reduce((total, option) => total * option.values.length, 1)

  const open = (variant: ProductVariant) => void navigate({ to: VARIANT_PATH, params: { productId: keepsake.id, variantId: variant.id } })

  const change = async (variant: ProductVariant, status: 'published' | 'draft' | 'archived') => {
    setRefusal(undefined)
    const outcome = await onSave(variant.id, { status })

    if (!outcome.ok)
      setRefusal(outcome.refusals && outcome.refusals.length > 0 ? outcome.refusals.map(r => refusalText(t, r)).join(' ') : t(problemMessageKey(outcome.type)))
  }

  const archive = async (variant: ProductVariant) => {
    if (await confirm({ title: t('keepsakes.variant.archive.title', { code: variant.skuCode }), body: t('keepsakes.variant.archive.body'), confirmLabel: t('keepsakes.variant.archive.confirm') }))
      await change(variant, 'archived')
  }

  const menu = (variant: ProductVariant) => (variant.status === 'archived'
    ? null
    : (
        <RowActions<Action>
          actions={[
            { id: 'edit', label: t('keepsakes.variant.edit'), icon: EditIcon },
            variant.status === 'published'
              ? { id: 'toggle', label: t('keepsakes.variant.hide'), icon: StatusNeutralIcon }
              : { id: 'toggle', label: t('keepsakes.variant.putOnSale'), icon: StatusSuccessIcon },
            { id: 'archive', label: t('keepsakes.variant.archive'), icon: ArchiveIcon, isDanger: true },
          ]}
          label={t('keepsakes.variant.actions', { code: variant.skuCode })}
          onAction={(action) => {
            if (action === 'edit')
              open(variant)
            else if (action === 'toggle')
              void change(variant, variant.status === 'published' ? 'draft' : 'published')
            else
              void archive(variant)
          }}
        />
      ))

  const status = (variant: ProductVariant) => (variant.status === 'published'
    ? null
    : <StatusChip tone="neutral">{t(variant.status === 'draft' ? 'keepsakes.variant.status.hidden' : 'keepsakes.variant.status.archived')}</StatusChip>)

  const link = (variant: ProductVariant) => (
    <RouterLink className="font-mono text-sm" params={{ productId: keepsake.id, variantId: variant.id }} to={VARIANT_PATH}>{variant.skuCode}</RouterLink>
  )

  const columns: DataTableColumn<ProductVariant>[] = [
    {
      id: 'code',
      header: t('keepsakes.variants.column.variant'),
      isRowHeader: true,
      render: variant => (
        <span className="flex items-center gap-3">
          <span className="hidden xl:block">
            <VariantThumb cover={cover} options={options} values={variant.values} />
          </span>
          {link(variant)}
        </span>
      ),
    },
    ...options.map((option): DataTableColumn<ProductVariant> => ({
      id: `option-${option.id}`,
      header: shortLabel(option.name, language),
      cellClassName: 'whitespace-nowrap',
      render: (variant) => {
        const value = option.values.find(v => v.id === variant.values[option.id])

        return value ? shortLabel(value.label, language) : '–'
      },
    })),
    { id: 'price', header: t('keepsakes.variants.column.price'), headerClassName: 'text-end', cellClassName: 'text-end tabular-nums', render: variant => chf(variant.priceRappen, intlLocale) },
    { id: 'status', header: t('keepsakes.variants.column.status'), skeleton: 'chip', render: variant => status(variant) },
  ]

  const footnote = options.length === 0
    ? t('keepsakes.variants.footnote.none')
    : t('keepsakes.variants.footnote', { count: live.length, possible })

  return (
    <KeepsakeCard
      icon={OptionIcon}
      id="variants"
      title={t('keepsakes.variants.title')}
      trailing={options.length > 0
        ? (
            <Button className="max-lg:min-h-11" size="sm" variant="secondary" onPress={() => setCreating(true)}>
              <PlusIcon aria-hidden size={16} />
              {t('keepsakes.variants.create')}
            </Button>
          )
        : undefined}
    >
      <PageTabs
        fill
        label={t('keepsakes.variants.tabs')}
        selected={tab}
        sticky={false}
        tabs={TABS.map(id => ({ id, label: t(`keepsakes.variants.tab.${id}`), badge: count(id) }))}
        onSelect={setTab}
      />
      {refusal && <RefusalAlert>{refusal}</RefusalAlert>}
      <DataTable
        cards={pageRows => (
          <ul className="flex flex-col gap-2 lg:hidden">
            {pageRows.map(variant => (
              <li key={variant.id} className="flex items-center gap-2 border-t border-separator pt-2 first:border-none first:pt-0">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <RouterLink className="truncate text-sm font-medium no-underline" params={{ productId: keepsake.id, variantId: variant.id }} to={VARIANT_PATH}>{variantTitle(variant.values, options, language) || variant.skuCode}</RouterLink>
                  <span className="truncate text-label text-muted tabular-nums">
                    {[variant.skuCode, chf(variant.priceRappen, intlLocale), variant.status === 'draft' ? t('keepsakes.variant.status.hiddenLower') : variant.status === 'archived' ? t('keepsakes.variant.status.archivedLower') : undefined].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {menu(variant)}
              </li>
            ))}
          </ul>
        )}
        columns={columns}
        empty={{ icon: OptionIcon, message: t(tab === 'all' ? 'keepsakes.variants.none' : 'keepsakes.variants.noneHere') }}
        getRowId={variant => variant.id}
        hidePager
        label={t('keepsakes.variants.title')}
        resetKey={tab}
        rowActions={{ render: variant => menu(variant) ?? <span /> }}
        rows={rows}
        variant="card"
      />
      <p className="text-xs text-pretty text-muted">{footnote}</p>
      {creating && <VariantSheet keepsake={keepsake} onClose={() => setCreating(false)} onCreate={onCreate} onSave={onSave} />}
      {dialog}
    </KeepsakeCard>
  )
}
