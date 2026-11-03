import type { inventoryEn } from './messages'

export const inventoryDe: Record<keyof typeof inventoryEn, string> = {
  'inventory.nav': 'Lagerbestand',
  'inventory.title': 'Lagerbestand',
  'inventory.description': 'Was von jeder Variante auf Lager ist und was Bestellungen reserviert haben. Ändern Sie eine Zahl direkt in der Liste.',
  'inventory.tabsLabel': 'Bestand',
  'inventory.tab.all': 'Alle',
  'inventory.tab.inStock': 'Auf Lager',
  'inventory.tab.soldOut': 'Ausverkauft',
  'inventory.search': 'Code oder Name suchen',
  'inventory.searchLabel': 'Nach Code oder Name suchen',

  'inventory.column.variant': 'Variante',
  'inventory.column.code': 'SKU-Code',
  'inventory.column.reserved': 'Reserviert',
  'inventory.column.inStock': 'Auf Lager',
  'inventory.column.available': 'Verfügbar',
  'inventory.soldOut': 'Ausverkauft',
  'inventory.available': '{count} verfügbar',
  'inventory.reserved': '{count} reserviert',
  'inventory.field': 'Auf Lager für {code}',
  'inventory.untitled': 'Andenken ohne Namen',

  'inventory.empty.all': 'Noch keine Varianten.',
  'inventory.empty.inStock': 'Keine Varianten auf Lager.',
  'inventory.empty.soldOut': 'Nichts ist ausverkauft.',
  'inventory.empty.search': 'Keine Variante passt zu «{query}».',

  'inventory.error.whole': 'Geben Sie eine ganze Zahl ein, 0 oder mehr.',
  'inventory.error.most': 'Höchstens 9999.',
  'inventory.error.belowReserved.one': '{count} Einheit ist durch Bestellungen reserviert, der Bestand kann also nicht unter die {count} reservierte fallen.',
  'inventory.error.belowReserved.other': '{count} Einheiten sind durch Bestellungen reserviert, der Bestand kann also nicht unter die {count} reservierten fallen.',
  'inventory.problem.forbidden': 'Sie dürfen den Bestand dieses Shops nicht ändern.',
  'inventory.problem.notFound': 'Diese Variante gibt es nicht mehr.',
  'inventory.problem.generic': 'Der Bestand konnte nicht gespeichert werden. Versuchen Sie es erneut.',
}
