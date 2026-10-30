import type { stepsEn } from './step-messages'

export const stepsDe: Record<keyof typeof stepsEn, string> = {
  'steps.label': 'Schritte',
  'steps.title': 'Schritte',
  'steps.all': 'Alle Schritte',
  'steps.of': 'Schritt {n} von {total}',
  'steps.progress': 'Fortschritt durch die Schritte',
  'steps.back': 'Vorheriger Schritt',
  'steps.next': 'Weiter',
  'steps.notSaved':
    'Noch nicht gespeichert. Einen Entwurf können Sie bei jedem Schritt speichern.',
  'steps.status.done': 'Erledigt',
  'steps.status.error': 'Hat Fehler',
  'steps.status.warning': 'Braucht Aufmerksamkeit',
  'steps.status.todo': 'Noch offen',
  'steps.status.current': 'Aktueller Schritt',
}
