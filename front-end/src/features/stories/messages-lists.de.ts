import type { storiesListsEn } from './messages-lists'

export const storiesListsDe: Record<keyof typeof storiesListsEn, string> = {
  'storyLists.remove': '{name} entfernen',
  'storyLists.places.title': 'Orte',
  'storyLists.places.help': 'Die Pins, um die es in dieser Geschichte geht.',
  'storyLists.places.choose': 'Orte wählen',
  'storyLists.places.list': 'Orte in dieser Geschichte',
  'storyLists.places.sheetTitle': 'Orte in dieser Geschichte',
  'storyLists.places.save.one': '{count} Ort speichern',
  'storyLists.places.save.other': '{count} Orte speichern',
  'storyLists.places.notPublished': 'Nicht veröffentlicht',
  'storyLists.places.untagged': 'Im Text verlinkt, aber nicht zugeordnet: {names}. Ein Pin-Link ordnet den Ort nicht zu.',
  'storyLists.places.full': '{count} gewählt, mehr geht nicht. Entfernen Sie einen, um einen anderen zu wählen.',
}
