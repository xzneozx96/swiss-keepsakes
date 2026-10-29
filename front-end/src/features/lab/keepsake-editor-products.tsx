import type { Keepsake } from './keepsake-editor-data'
import type { Go } from './keepsake-editor-nav'
import type { Catalog } from './keepsake-editor-state'
import type { DataTableColumn } from '@/components/data-table'

import { Button } from '@heroui/react'

import { DataTable } from '@/components/data-table'
import { EditIcon, GiftIcon, PlusIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { RowActions } from '@/components/row-actions'
import { useIsWide } from '@/hooks/use-is-wide'
import { PageHeader, ProductStatusChip } from './keepsake-editor-parts'
import { isSoldOut, label } from './keepsake-editor-rules'
import { mediaOf } from './story-editor-data'

/**
 * The keepsake list (M11), the entry point: Keepsakes only (no Tours, Stays or Experiences tabs,
 * no category filter). Thumbnail, name, variants, status, ⋯; Create opens the create flow.
 */
export function ProductsList({ catalog, go }: { catalog: Catalog, go: Go }) {
  const isWide = useIsWide()
  const open = (p: Keepsake) => go({ name: 'product', id: p.id })
  const live = (p: Keepsake) => p.skus.filter(s => s.status !== 'archived')
  const variants = (p: Keepsake) => {
    const soldOut = live(p).filter(isSoldOut).length

    return `${live(p).length} ${live(p).length === 1 ? 'variant' : 'variants'}${soldOut ? ` · ${soldOut} sold out` : ''}`
  }
  const thumb = (p: Keepsake) => <Media alt="" className="size-11 shrink-0 rounded-xl" photo={mediaOf(p.photos[0])?.preview} />
  const menu = (p: Keepsake) => <RowActions actions={[{ id: 'open', label: 'Edit', icon: EditIcon }]} label={`Actions for ${label(p.name)}`} onAction={() => open(p)} />
  const columns: DataTableColumn<Keepsake>[] = [
    {
      id: 'name',
      header: 'Keepsake',
      isRowHeader: true,
      skeleton: 'lead',
      render: p => (
        <button className="flex min-w-0 items-center gap-3 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => open(p)}>
          {thumb(p)}
          <span className="truncate text-sm font-medium underline-offset-4 hover:underline">{label(p.name) || 'Untitled'}</span>
        </button>
      ),
    },
    { id: 'variants', header: 'Variants', headerClassName: 'w-56', render: variants },
    { id: 'status', header: 'Status', headerClassName: 'w-56', skeleton: 'chip', render: p => <ProductStatusChip product={p} /> },
  ]

  return (
    <div className="flex flex-col gap-3 pb-6 lg:gap-5 lg:p-6">
      <PageHeader
        actions={(
          <Button className="max-lg:h-11" onPress={() => go({ name: 'create' })}>
            <PlusIcon aria-hidden size={16} />
            Create
          </Button>
        )}
        title="Keepsakes"
      />
      <section aria-label="Keepsakes" className="flex min-w-0 flex-col rounded-3xl bg-surface p-4 shadow-surface max-lg:mx-4 lg:p-5">
        {isWide
          ? (
              <DataTable
                columns={columns}
                empty={{ icon: GiftIcon, message: 'No keepsakes yet.' }}
                getRowId={p => p.id}
                label="Keepsakes"
                rowActions={{ render: menu }}
                rows={catalog.products}
                variant="card"
              />
            )
          : (
              <ul className="flex flex-col divide-y divide-separator">
                {catalog.products.map(p => (
                  <li key={p.id} className="flex min-w-0 items-center gap-1 py-1.5">
                    <button className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => open(p)}>
                      {thumb(p)}
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="line-clamp-2 text-sm font-medium">{label(p.name) || 'Untitled'}</span>
                        <span className="truncate text-xs text-muted">{variants(p)}</span>
                      </span>
                    </button>
                    {menu(p)}
                  </li>
                ))}
              </ul>
            )}
      </section>
    </div>
  )
}
