import type { Actor } from '@sk/domain/identity'
import { can } from '@sk/domain/identity'

// Only a staff member with manage-content in this store may write content; everyone else is forbidden.
export function mayManageContent(actor: Actor, storeId: string): boolean {
  return actor.kind === 'staff' && can(actor, 'manage-content', { storeId })
}

export function staffActor(actor: Actor): string {
  return actor.kind === 'staff' ? `staff:${actor.userId}` : 'unknown'
}
