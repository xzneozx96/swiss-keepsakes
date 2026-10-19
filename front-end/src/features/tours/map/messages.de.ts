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
  'tourMap.loading': 'Karte wird geöffnet…',
  'tourMap.heading': 'Unterwegs zu',
  'tourMap.unavailable':
    'Die Karte konnte nicht geladen werden. Die Stationen können Sie trotzdem unten Schritt für Schritt ansehen.',
  'tourMap.retry': 'Karte neu laden',
  'tourMap.empty': 'Ihr Guide teilt den Tourverlauf vor der Abfahrt mit Ihnen.',
  'tourMap.stop': 'Station {number}',
  'tourMap.start': 'Treffpunkt',
  'tourMap.minute': 'Nach {minutes} Minuten',
  'tourMap.position': '{number} von {count}',
  'tourMap.live': 'Station {number} von {count}: {name}',
  'tourMap.previous': 'Vorherige Station',
  'tourMap.next': 'Nächste Station',
  'tourMap.viewMore': 'Mehr anzeigen',
  'tourMap.closeCard': 'Stationsdetails schliessen',
  'tourMap.note': 'Gut zu wissen',
  'tourMap.zoomIn': 'Vergrössern',
  'tourMap.zoomOut': 'Verkleinern',
  'tourMap.compass': 'Kartenausrichtung zurücksetzen',
  'tourMap.fullscreen': 'Vollbild öffnen',
  'tourMap.exitFullscreen': 'Vollbild schliessen',
  'tourMap.gestures':
    'Ziehen zum Erkunden · auf dem Handy mit zwei Fingern bewegen',
  'tourMap.wheel': 'Zum Vergrössern Strg + Scrollen verwenden',
  'tourMap.wheelMac': 'Zum Vergrössern ⌘ + Scrollen verwenden',
  'tourMap.touch': 'Die Karte mit zwei Fingern bewegen',
}
