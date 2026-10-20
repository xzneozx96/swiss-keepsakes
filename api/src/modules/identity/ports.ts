// What the identity use cases need. The platform's unit of work fits the generic shape structurally
// (backend/architecture.md).

export interface UnitOfWork<T> {
  run: <R>(work: (tx: T) => Promise<R>) => Promise<R>
}

export interface GuestProfileRepository<T> {
  // The guest profile id for a Better Auth user id, or undefined when there is none yet.
  find: (tx: T, authUserId: string) => Promise<string | undefined>
  // Inserts the profile and returns its id, or returns undefined when another transaction inserted it first.
  insertIfAbsent: (tx: T, authUserId: string) => Promise<string | undefined>
}
