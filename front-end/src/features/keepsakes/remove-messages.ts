/** Keepsakes: removing one (delete if never sold, else archive), and the Archived status. Its own file so it does not touch the keepsake message list. */
export const removeEn = {
  'keepsakes.status.archived': 'Archived',
  'keepsakes.remove.action': 'Delete',
  'keepsakes.remove.deleteTitle': 'Delete {name}?',
  'keepsakes.remove.deleteBody': 'It can’t be undone. Its photos stay in your library.',
  'keepsakes.remove.deleteConfirm': 'Delete',
  'keepsakes.remove.archiveTitle': 'Archive {name}?',
  'keepsakes.remove.archiveBody': '{name} has orders, so it will be archived: guests no longer see it, its orders keep working. This can’t be undone.',
  'keepsakes.remove.archiveConfirm': 'Archive',
  'keepsakes.toast.deleted': '{name} deleted.',
  'keepsakes.toast.archived': '{name} archived.',
  'keepsakes.problem.archived': 'This keepsake is archived and can’t be changed.',
  'keepsakes.archived.notice': 'This keepsake is archived. Guests no longer see it and it can’t be changed. Its orders keep working.',
}

export const removeDe: Record<keyof typeof removeEn, string> = {
  'keepsakes.status.archived': 'Archiviert',
  'keepsakes.remove.action': 'Löschen',
  'keepsakes.remove.deleteTitle': '{name} löschen?',
  'keepsakes.remove.deleteBody': 'Das lässt sich nicht rückgängig machen. Die Fotos bleiben in Ihrer Bibliothek.',
  'keepsakes.remove.deleteConfirm': 'Löschen',
  'keepsakes.remove.archiveTitle': '{name} archivieren?',
  'keepsakes.remove.archiveBody': 'Zu {name} gibt es Bestellungen, daher wird es archiviert: Gäste sehen es nicht mehr, die Bestellungen laufen weiter. Das lässt sich nicht rückgängig machen.',
  'keepsakes.remove.archiveConfirm': 'Archivieren',
  'keepsakes.toast.deleted': '{name} gelöscht.',
  'keepsakes.toast.archived': '{name} archiviert.',
  'keepsakes.problem.archived': 'Dieses Andenken ist archiviert und lässt sich nicht mehr ändern.',
  'keepsakes.archived.notice': 'Dieses Andenken ist archiviert. Gäste sehen es nicht mehr und es lässt sich nicht ändern. Die Bestellungen laufen weiter.',
}
