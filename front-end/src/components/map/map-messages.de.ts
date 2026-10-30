import type { mapKitEn } from './map-messages'

export const mapKitDe: Record<keyof typeof mapKitEn, string> = {
  'map.loading': 'Orte werden geladen …',
  'map.loadingMap': 'Karte wird geladen …',
  'map.empty.title': 'Noch keine Orte auf der Karte',
  'map.empty.body': 'Schauen Sie bald wieder vorbei. Geschichten über Luzern finden Sie unter Entdecken.',
  'map.empty.action': 'Zu Entdecken',
  'map.failed.title': 'Die Orte konnten nicht geladen werden',
  'map.failed.body': 'Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
  'map.failed.retry': 'Erneut versuchen',
  'map.credits': 'Kartenhinweise',
  'map.gesture.wheel': 'Zum Vergrössern Strg + Scrollen verwenden',
  'map.gesture.wheelMac': 'Zum Vergrössern ⌘ + Scrollen verwenden',
  'map.gesture.touch': 'Die Karte mit zwei Fingern bewegen',
}
