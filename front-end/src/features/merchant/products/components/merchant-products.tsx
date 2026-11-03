import type { ProductRow } from '../hooks/use-merchant-products'
import type { ProductAction } from './product-rows'
import type { MutationFeedback } from '@/features/data-client'
import type { ProductTab } from '@/features/merchant/products/lib/search-params'

import { buttonVariants } from '@heroui/react'
import { pickText } from '@sk/domain/shared'
import { Link, useNavigate } from '@tanstack/react-router'

import { useEffect, useRef, useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'

import {
  FilterButtons,
  FilterChips,
  filterGroup,
} from '@/components/filter-bar'
import {
  GiftIcon,
  PlusIcon,
  TourIcon,
} from '@/components/icons'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { RouteTabs } from '@/components/route-tabs'
import { useLocale } from '@/contexts/locale-context'
import { useStoreSubcategories } from '@/features/catalog/api/queries'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import {
  useMerchantProducts,
  useProductArchive,
} from '../hooks/use-merchant-products'
import { ProductRows } from './product-rows'

type ProductView = 'active' | 'archived'
/** The tabs this screen lists; Pickup points is a page of its own and is only linked from the tab bar. */
type ProductsTab = Exclude<ProductTab, 'pickup'>

/**
 * M11 Products (spec §5.2, D3): M03's page shape. Tabs with counts (gifts and tours; the tab bar also links to
 * the Pickup points page, which is its own screen, PickupPage), each its own page: /store/products,
 * /tours. Each is a list of M03 tickets on phones and a Table from 1024px. Each gift and tour shows its publish chip and its EN/DE
 * completeness (R02).
 */
export function MerchantProducts({ tab }: { tab: ProductsTab }) {
  const { t, language } = useLocale()
  const all = useMerchantProducts()
  const subcategories = useStoreSubcategories()
  const nameOf = (id: string) => all.gifts.find(r => r.id === id)?.name ?? all.tours.find(r => r.id === id)?.name ?? ''
  const archivedToast: MutationFeedback<void, { id: string, archived: boolean }> = {
    success: (_result, input) => t(input.archived ? 'products.archivedToast' : 'products.restored', { name: nameOf(input.id) }),
  }
  const archive = useProductArchive({ gift: archivedToast, tour: archivedToast })
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()
  // Archived gifts and tours sit under their own filter, as archived partners on M15.
  // Both ticked shows both; none ticked is no filter, the same as both.
  const [view, setView] = useState<ProductView[]>(['active'])
  const inView = (r: ProductRow) =>
    !view.length || view.includes(r.archived ? 'archived' : 'active')
  // Keepsakes only: the store's sub-categories, ticked like the status.
  const [subs, setSubs] = useState<string[]>([])
  const inSubs = (r: ProductRow) =>
    !subs.length || (!!r.subcategoryId && subs.includes(r.subcategoryId))
  const gifts = all.gifts.filter(inView).filter(inSubs)
  const tours = all.tours.filter(inView)
  const isLoading = useSimulatedLoading()
  const tabs = [
    {
      id: 'gifts',
      to: '/store/products',
      label: t('products.tab.gifts'),
      badge: all.gifts.filter(r => !r.archived).length,
    },
    {
      id: 'tours',
      to: '/store/products/tours',
      label: t('products.tab.tours'),
      badge: all.tours.filter(r => !r.archived).length,
    },
    {
      id: 'pickup',
      to: '/store/products/pickup',
      label: t('products.tab.pickup'),
    },
  ] as const
  const selectedLabel = tabs.find(item => item.id === tab)?.label ?? ''
  const rootRef = useRef<HTMLDivElement>(null)

  // As M03: a link to a page whose tab starts off-screen in the scrolling
  // list on phones. React Aria mounts the tabs after the first commit, so wait a frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      rootRef.current
        ?.querySelector(`[role="tab"][data-key="${tab}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
    )

    return () => cancelAnimationFrame(frame)
  }, [tab])

  const onAction = async (
    kind: 'gift' | 'tour',
    row: ProductRow,
    action: ProductAction,
  ) => {
    if (action === 'edit') {
      void navigate({
        to:
          kind === 'gift'
            ? '/store/products/gifts/$productId'
            : '/store/products/tours/$tourId',
        params: { productId: row.id, tourId: row.id },
      })

      return
    }
    if (action === 'restore') {
      archive.restore(kind, row.id)

      return
    }
    const ok = await confirm({
      title: t('products.archive.title', { name: row.name }),
      body: t(
        kind === 'gift'
          ? 'products.archive.body.gift'
          : 'products.archive.body.tour',
      ),
      confirmLabel: t('products.action.archive'),
    })

    if (!ok)
      return
    archive.archive(kind, row.id)
  }

  const viewGroup = (count: (archived: boolean) => number) =>
    filterGroup({
      id: 'view',
      label: t('products.view.label'),
      options: (['active', 'archived'] as const).map(v => ({
        id: v,
        label: t(`products.view.${v}`),
        count: count(v === 'archived'),
      })),
      selected: view,
      onChange: setView,
    })

  const filterGroups = (id: 'gifts' | 'tours') => {
    const source = id === 'gifts' ? all.gifts : all.tours

    // Counts follow the other group: the sub-categories ticked narrow the status counts.
    const groups = [
      viewGroup(archived => source.filter(r => (id === 'tours' || inSubs(r)) && r.archived === archived).length),
    ]

    if (id === 'gifts') {
      groups.push(
        filterGroup({
          id: 'subcategory',
          label: t('products.subcategory.label'),
          options: subcategories
            .filter(c => c.categoryId === 'keepsakes')
            .map(c => ({
              id: c.id,
              label: pickText(c.name, language).text,
              count: source.filter(r => inView(r) && r.subcategoryId === c.id)
                .length,
            })),
          selected: subs,
          onChange: setSubs,
        }),
      )
    }

    return groups
  }

  const groups = filterGroups(tab)

  const panel = (id: ProductsTab) => {
    const rows = id === 'gifts' ? gifts : tours

    return (
      <ProductRows
        columns={[
          t(id === 'gifts' ? 'products.column.gift' : 'products.column.tour'),
          t('products.column.status'),
          t('products.column.price'),
          t(
            id === 'gifts'
              ? 'products.column.available'
              : 'products.column.departures',
          ),
          t('products.column.commission'),
        ]}
        empty={{
          icon: id === 'gifts' ? GiftIcon : TourIcon,
          message: t(
            view.length === 1 && view[0] === 'archived'
              ? 'products.empty.archived'
              : `products.empty.${id}`,
          ),
        }}
        isLoading={isLoading}
        label={selectedLabel}
        resetKey={`${id}|${selectedLabel}|${view.join()}`}
        rows={rows}
        onAction={(row, action) =>
          void onAction(id === 'gifts' ? 'gift' : 'tour', row, action)}
      />
    )
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      <MerchantPageHeader
        // The screen's one red action, as M15's "Add partner".
        action={(
          <Link
            className={buttonVariants({ size: 'sm', className: 'shrink-0' })}
            to={
              tab === 'gifts'
                ? '/store/products/gifts/new'
                : '/store/products/tours/new'
            }
          >
            <PlusIcon aria-hidden size={16} />
            {t(tab === 'gifts' ? 'products.addGift' : 'products.addTour')}
          </Link>
        )}
        description={t('products.intro')}
        title={t('products.title')}
      />
      <RouteTabs
        label={t('products.tabsLabel')}
        selected={tab}
        tabs={tabs}
        trailing={groups && <FilterButtons groups={groups} />}
      />
      {groups && <FilterChips groups={groups} />}
      {panel(tab)}
      {dialog}
    </div>
  )
}
