import type { tourMapEn } from './messages'

export const tourMapDe: Record<keyof typeof tourMapEn, string> = {
  'tourMap.title': 'Ihre Route',
  'tourMap.subtitle':
    'Tippen Sie auf eine nummerierte Markierung, um jede Station zu entdecken.',
  'tourMap.overview': 'Ganze Route',
  'tourMap.view3d': '3D-Ansicht',
  'tourMap.view2d': '2D-Ansicht',
  'tourMap.mapLabel': 'Interaktive Karte des Tourverlaufs',
  'tourMap.sample':
    'Beispielroute · die Linie verbindet Stationen, keine Wegbeschreibung.',
  'tourMap.heading': 'Unterwegs zu',
  'tourMap.empty': 'Ihr Guide teilt den Tourverlauf vor der Abfahrt mit Ihnen.',
  'tourMap.stop': 'Station {number}',
  'tourMap.start': 'Treffpunkt',
  'tourMap.minute': 'Nach {minutes} Minuten',
  'tourMap.live': 'Station {number} von {count}: {name}',
  'tourMap.previous': 'Vorherige Station',
  'tourMap.next': 'Nächste Station',
  'tourMap.viewMore': 'Mehr anzeigen',
  'tourMap.note': 'Gut zu wissen',
  'tourMap.gestures':
    'Ziehen zum Erkunden · auf dem Handy mit zwei Fingern bewegen',
}
