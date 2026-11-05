import type { tourMapEn } from './messages'

export const tourMapDe: Record<keyof typeof tourMapEn, string> = {
  'tourMap.title': 'Vorgeschlagene Route',
  'tourMap.subtitle':
    'Tippen Sie auf eine nummerierte Markierung, um jede Station zu entdecken.',
  'tourMap.overview': 'Ganze Route',
  'tourMap.view3d': '3D-Ansicht',
  'tourMap.view2d': '2D-Ansicht',
  'tourMap.mapLabel': 'Interaktive Karte der Route',
  'tourMap.sample':
    'Vorgeschlagene Route · die Linie verbindet Stationen, keine Wegbeschreibung.',
  'tourMap.heading': 'Unterwegs zu',
  'tourMap.empty': 'Der Verlauf ist noch nicht verfügbar.',
  'tourMap.stop': 'Station {number}',
  'tourMap.start': 'Start hier',
  'tourMap.minute': '{minutes} Minuten nach dem Start',
  'tourMap.live': 'Station {number} von {count}: {name}',
  'tourMap.previous': 'Vorherige Station',
  'tourMap.next': 'Nächste Station',
  'tourMap.viewMore': 'Mehr anzeigen',
  'tourMap.note': 'Gut zu wissen',
  'tourMap.gestures':
    'Ziehen zum Erkunden · auf dem Handy mit zwei Fingern bewegen',
}
