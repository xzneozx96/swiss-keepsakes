import type { categoriesEn } from './messages'

export const categoriesDe: Record<keyof typeof categoriesEn, string> = {
  'merchantContent.tab.categories': 'Kategorien',
  'categories.problem.hasChildren': 'Diese Kategorie hat noch Unterkategorien. Verschieben oder löschen Sie diese zuerst.',
  'categories.problem.inUse': 'Diese Kategorie wird noch von Pins oder Geschichtengruppen verwendet. Entfernen Sie dort zuerst die Zuordnung.',
  'categories.problem.tooDeep': 'Eine Unterkategorie kann keine weitere Kategorie enthalten. Wählen Sie eine Hauptkategorie.',
  'categories.problem.parentHasChildren': 'Diese Kategorie hat Unterkategorien und kann deshalb nicht selbst zur Unterkategorie werden.',
  'categories.problem.name': 'Geben Sie einen Namen in mindestens einer Sprache ein.',
  'categories.problem.listChanged': 'Die Liste hat sich geändert. Laden Sie sie neu und verschieben Sie die Kategorie noch einmal.',
  'categories.problem.forbidden': 'Sie dürfen die Kategorien dieses Shops nicht ändern.',
  'categories.problem.notFound': 'Diese Kategorie gibt es nicht mehr. Laden Sie die Liste neu.',
  'categories.problem.generic': 'Etwas ist schiefgelaufen. Versuchen Sie es gleich noch einmal.',
}
