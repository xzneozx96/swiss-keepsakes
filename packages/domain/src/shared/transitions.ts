/** For each status, the statuses it may move to. A status missing from `to` is a dead end. */
export type TransitionTable<S extends string> = Readonly<Record<S, readonly S[]>>

export interface Transition<S extends string> {
  from: S
  to: S
}

export function canMove<S extends string>(
  table: TransitionTable<S>,
  from: S,
  to: S,
): boolean {
  return table[from].includes(to)
}

export function listTransitions<S extends string>(
  table: TransitionTable<S>,
): Transition<S>[] {
  return (Object.keys(table) as S[]).flatMap(from =>
    table[from].map(to => ({ from, to })),
  )
}
