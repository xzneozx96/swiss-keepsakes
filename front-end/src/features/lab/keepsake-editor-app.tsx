import type { Screen } from './keepsake-editor-nav'
import type { KeepsakeLabSearch, LabState } from './keepsake-editor-search-params'

import { useState } from 'react'

import { CreateFlow } from './keepsake-editor-create'
import { InventoryItem, InventoryList } from './keepsake-editor-inventory'
import { PageSkeleton } from './keepsake-editor-parts'
import { ProductPage } from './keepsake-editor-product'
import { ProductsList } from './keepsake-editor-products'
import { KeepsakeShell } from './keepsake-editor-shell'
import { useCatalog } from './keepsake-editor-state'
import { VariantPage } from './keepsake-editor-variant'

/** Which screen a lab state opens. VX-S-PILATUS is the variant and inventory item: 3 held by two orders. */
function firstScreen(state: LabState): Screen {
  if (state === 'products')
    return { name: 'products' }
  if (state.startsWith('create-'))
    return { name: 'create', start: state }
  if (state === 'variant')
    return { name: 'variant', skuId: 'sku-vx-s-pilatus' }
  if (state === 'inventory')
    return { name: 'inventory' }
  if (state === 'item')
    return { name: 'item', skuId: 'sku-vx-s-pilatus' }
  if (state === 'belowheld')
    return { name: 'item', skuId: 'sku-vx-l-swan', start: state }

  return { name: 'product', id: 'p-victorinox', start: state }
}

/**
 * What the lab frame shows: the merchant's catalog screens on their own data in memory, linked as
 * in Medusa. A new address (state, choices) is a fresh frame, so nothing leaks between states.
 */
export function KeepsakeEditorLabApp({ search }: { search: KeepsakeLabSearch }) {
  const catalog = useCatalog(search.state)
  const [screen, setScreen] = useState<Screen>(() => firstScreen(search.state))
  const go = (next: Screen) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }
  const active = screen.name === 'inventory' || screen.name === 'item' ? 'Inventory' : 'Keepsakes'

  return (
    <KeepsakeShell active={active} onNav={page => go(page === 'Inventory' ? { name: 'inventory' } : { name: 'products' })}>
      {search.state === 'loading' && <PageSkeleton />}
      {search.state !== 'loading' && (
        <>
          {screen.name === 'products' && <ProductsList catalog={catalog} go={go} />}
          {screen.name === 'product' && <ProductPage key={screen.id} catalog={catalog} go={go} id={screen.id} start={screen.start} />}
          {screen.name === 'create' && <CreateFlow catalog={catalog} go={go} start={screen.start} />}
          {screen.name === 'variant' && <VariantPage key={screen.skuId} catalog={catalog} go={go} skuId={screen.skuId} />}
          {screen.name === 'inventory' && <InventoryList catalog={catalog} go={go} />}
          {screen.name === 'item' && <InventoryItem key={screen.skuId} catalog={catalog} from={screen.from} go={go} skuId={screen.skuId} start={screen.start} />}
        </>
      )}
    </KeepsakeShell>
  )
}
