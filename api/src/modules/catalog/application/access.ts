import type { Actor } from '@sk/domain/identity'
import { can } from '@sk/domain/identity'

// Only a staff member with edit-catalog in this store may write the catalog; everyone else is forbidden.
export function mayEditCatalog(actor: Actor, storeId: string): boolean {
  return actor.kind === 'staff' && can(actor, 'edit-catalog', { storeId })
}

export function staffActor(actor: Actor): string {
  return actor.kind === 'staff' ? `staff:${actor.userId}` : 'unknown'
}
