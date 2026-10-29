import type { CategoryKind, MerchantCategory } from '@sk/api-contract'
import type { ReactNode } from 'react'
import type { CategoryActions } from '../hooks/use-category-actions'

import { Button, SearchField, Skeleton } from '@heroui/react'
import { useRef, useState } from 'react'

import { SKELETON_ROWS } from '@/components/data-table-skeleton'
import { EmptyState } from '@/components/empty-state'
import { BackIcon, ChevronRightIcon, EditIcon, InfoIcon, PlusIcon, StatusSuccessIcon, StatusWarningIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useLevelDrag } from '../hooks/use-level-drag'
import { childrenOf, matches, nameOf, refusalOf, rootsOf } from '../lib/category-tree'
import { DropSlot, Grip } from './category-drag'

const NAME_WIDTHS = ['w-3/5', 'w-1/2', 'w-2/3', 'w-2/5', 'w-1/2']
const card = 'flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface'

/** `{n} pins` or `{n} story groups`, with the singular for one. */
function useUses() {
  const { t } = useLocale()

  return (kind: CategoryKind, n: number) => t(`categories.uses.${kind}.${n === 1 ? 'one' : 'other'}`, { n })
}

/** The second line under a name: the German name, or which language is missing. */
function OtherName({ category }: { category: MerchantCategory }) {
  const { t } = useLocale()

  if (category.name.en !== null && category.name.de !== null)
    return <span className="block text-xs text-muted [overflow-wrap:anywhere]">{category.name.de}</span>

  return (
    <span className="flex items-center gap-1 text-xs text-warning-soft-foreground">
      <StatusWarningIcon aria-hidden className="shrink-0" size={12} />
      {t(category.name.en === null ? 'categories.noName.en' : 'categories.noName.de')}
    </span>
  )
}

/**
 * Phones, below 1024 px: the drill-in. The parents as one list (drag the handle to reorder), a tap opens
 * the category's page: names, what uses it, its sub-categories (drag to reorder among themselves) and a
 * Delete checklist that says what still blocks it.
 */
export function CategoryPhone({ items, kind, actions, busy, loading }: {
  items: MerchantCategory[]
  /** Draws the search field and the list rows as loading bars while the list is not here yet. */
  loading?: boolean
  kind: CategoryKind
  actions: CategoryActions
  busy: boolean
}) {
  const [pageId, setPageId] = useState<string | null>(null)
  const page = items.find(category => category.id === pageId)

  if (loading)
    return <PhoneSkeleton />

  return page
    ? <CategoryPage key={page.id} actions={actions} busy={busy} category={page} items={items} kind={kind} onPage={setPageId} />
    : <CategoryList actions={actions} items={items} kind={kind} onPage={setPageId} />
}

/** The drill-in list while it loads: the search field, then rows of handle, two lines and chevron. */
function PhoneSkeleton() {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-3">
      <SearchField isDisabled aria-label={t('categories.search.label')} className="w-full">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={t('categories.search.placeholder')} />
        </SearchField.Group>
      </SearchField>
      <div className="overflow-hidden rounded-3xl bg-surface shadow-surface">
        <ul aria-hidden className="flex flex-col divide-y divide-separator">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <li key={index} className="flex items-center gap-3 py-3 ps-2 pe-4">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className={`h-4 rounded-lg ${NAME_WIDTHS[index % NAME_WIDTHS.length]}`} />
                <Skeleton className="h-3 w-1/2 rounded-lg" />
              </div>
              <Skeleton className="size-4 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** A drag list of one level: `ol` rows with the handle first, the rest of the row opens a page. */
function DragList({ items, label, parentId, actions, row }: {
  items: MerchantCategory[]
  label: string
  parentId: string | null
  actions: CategoryActions
  row: (category: MerchantCategory) => ReactNode
}) {
  const { t } = useLocale()
  const listRef = useRef<HTMLOListElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const drag = useLevelDrag({
    placeholderRef: slotRef,
    rows: () => Array.from(listRef.current?.children ?? []) as HTMLElement[],
    onDrop: (from, to) => actions.reorder(parentId, from, to),
  })

  return (
    <div className="relative">
      <ol ref={listRef} aria-label={label} className="flex flex-col divide-y divide-separator">
        {items.map((category, index) => (
          <li key={category.id} className="group bg-surface data-[lifted]:rounded-2xl data-[lifted]:shadow-overlay">
            <div className="flex items-center ps-1">
              <Grip
                id={category.id}
                label={t('categories.drag', { name: nameOf(category) })}
                props={drag.handleProps(index)}
                onStep={direction => actions.reorder(parentId, index, index + direction)}
              />
              {row(category)}
            </div>
          </li>
        ))}
      </ol>
      <DropSlot ref={slotRef} />
    </div>
  )
}

function CategoryList({ items, kind, actions, onPage }: { items: MerchantCategory[], kind: CategoryKind, actions: CategoryActions, onPage: (id: string) => void }) {
  const { t } = useLocale()
  const uses = useUses()
  const [query, setQuery] = useState('')
  const searching = query.trim() !== ''
  const found = items.filter(category => matches(category, query))

  const facts = (category: MerchantCategory) => [
    category.useCount ? uses(kind, category.useCount) : t('categories.unused'),
    category.parentId === null && category.childCount > 0 ? t(`categories.subs.${category.childCount === 1 ? 'one' : 'other'}`, { n: category.childCount }) : '',
  ].filter(Boolean).join(' · ')

  const row = (category: MerchantCategory) => {
    const parent = items.find(item => item.id === category.parentId)

    return (
      <button className="flex min-w-0 flex-1 items-center gap-3 py-3 pe-4 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => onPage(category.id)}>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold [overflow-wrap:anywhere]">{nameOf(category)}</span>
          {parent && <span className="text-xs text-muted">{t('categories.phone.in', { name: nameOf(parent) })}</span>}
          <OtherName category={category} />
          <span className="text-xs text-muted tabular-nums">{facts(category)}</span>
        </span>
        <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchField aria-label={t('categories.search.label')} className="w-full" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={t('categories.search.placeholder')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {searching
        ? found.length === 0
          ? <EmptyState icon={InfoIcon} message={t('categories.search.empty', { query: query.trim() })} />
          : (
              // While searching the list is not in order, so it has no handles.
              <ul aria-label={t('categories.phone.results')} className="flex flex-col divide-y divide-separator overflow-hidden rounded-3xl bg-surface ps-4 shadow-surface">
                {found.map(category => <li key={category.id} className="flex">{row(category)}</li>)}
              </ul>
            )
        : items.length === 0
          ? <EmptyState icon={InfoIcon} message={t(`categories.empty.${kind}`)} />
          : (
              <>
                <div className="overflow-hidden rounded-3xl bg-surface shadow-surface">
                  <DragList actions={actions} items={rootsOf(items)} label={t('categories.phone.topList')} parentId={null} row={row} />
                </div>
                <p className="px-1 text-xs text-muted">{t('categories.phone.hint')}</p>
              </>
            )}
    </div>
  )
}

function CategoryPage({ category, items, kind, actions, busy, onPage }: {
  busy: boolean
  category: MerchantCategory
  items: MerchantCategory[]
  kind: CategoryKind
  actions: CategoryActions
  onPage: (id: string | null) => void
}) {
  const { t } = useLocale()
  const uses = useUses()
  const parent = items.find(item => item.id === category.parentId)
  const kids = childrenOf(items, category.id)
  const refusal = refusalOf(category)
  const plural = (n: number) => (n === 1 ? 'one' : 'other')
  const missing = (value: string | null) => value ?? t('categories.missing')

  return (
    <section aria-label={nameOf(category)} className="flex min-w-0 flex-col gap-4">
      <button className="flex min-h-11 items-center gap-2 self-start rounded-full text-sm font-medium outline-none focus-visible:focus-ring" type="button" onClick={() => onPage(category.parentId)}>
        <BackIcon aria-hidden size={18} />
        {parent ? nameOf(parent) : t('categories.phone.all')}
      </button>

      <div className={card}>
        <span className="text-label text-muted">{parent ? t('categories.phone.subOf', { name: nameOf(parent) }) : t('categories.phone.topLevel')}</span>
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-heading [overflow-wrap:anywhere]">{nameOf(category)}</h2>
          <Button className="min-h-11 shrink-0" variant="secondary" onPress={() => actions.edit(category)}>
            <EditIcon size={16} />
            {t('categories.edit')}
          </Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">{t('categories.phone.english')}</dt>
          <dd className={category.name.en ? '' : 'text-warning-soft-foreground'}>{missing(category.name.en)}</dd>
          <dt className="text-muted">{t('categories.phone.german')}</dt>
          <dd className={`[overflow-wrap:anywhere] ${category.name.de ? '' : 'text-warning-soft-foreground'}`}>{missing(category.name.de)}</dd>
          <dt className="text-muted">{t('categories.col.usedBy')}</dt>
          <dd className="tabular-nums">{category.useCount ? uses(kind, category.useCount) : t(`categories.phone.noUses.${kind}`)}</dd>
        </dl>
      </div>

      {category.parentId === null && (
        <div className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface">
          <div className="flex items-center justify-between gap-3 p-4 pb-2">
            <h3 className="font-semibold">{t('categories.phone.subsTitle', { n: kids.length })}</h3>
            <Button className="min-h-9" size="sm" variant="secondary" onPress={() => actions.addSub(category)}>
              <PlusIcon size={16} />
              {t('categories.add')}
            </Button>
          </div>
          {kids.length === 0
            ? <p className="px-4 pb-4 text-sm text-muted">{t('categories.phone.subsNone')}</p>
            : (
                <DragList
                  actions={actions}
                  items={kids}
                  label={t('categories.phone.subList', { name: nameOf(category) })}
                  parentId={category.id}
                  row={kid => (
                    <button className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pe-4 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => onPage(kid.id)}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium [overflow-wrap:anywhere]">{nameOf(kid)}</span>
                        <OtherName category={kid} />
                      </span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">{kid.useCount ? uses(kind, kid.useCount) : t('categories.unused')}</span>
                      <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={16} />
                    </button>
                  )}
                />
              )}
        </div>
      )}

      <div className={card}>
        <h3 className="font-semibold">{t('categories.delete')}</h3>
        <ul className="flex flex-col gap-2 text-sm">
          {category.parentId === null && (
            <Check
              ok={category.childCount === 0}
              text={category.childCount
                ? t(`categories.refusal.children.${plural(category.childCount)}`, { n: category.childCount, names: kids.map(nameOf).join(', ') })
                : t('categories.phone.noSubs')}
            />
          )}
          <Check
            ok={category.useCount === 0}
            text={category.useCount ? t(`categories.refusal.uses.${kind}.${plural(category.useCount)}`, { n: category.useCount }) : t(`categories.phone.noneUse.${kind}`)}
          />
        </ul>
        <Button className="min-h-11 self-start" isDisabled={refusal !== null || busy} variant="danger-soft" onPress={() => actions.remove(category, () => onPage(category.parentId))}>
          <TrashIcon size={16} />
          {t('categories.delete.confirm')}
        </Button>
      </div>
    </section>
  )
}

function Check({ ok, text }: { ok: boolean, text: string }) {
  const Icon = ok ? StatusSuccessIcon : StatusWarningIcon

  return (
    <li className={`flex items-start gap-2 ${ok ? '' : 'text-warning-soft-foreground'}`}>
      <Icon aria-hidden className={`mt-0.5 shrink-0 ${ok ? 'text-success' : ''}`} size={16} />
      {text}
    </li>
  )
}
