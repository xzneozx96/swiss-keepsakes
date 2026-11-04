import type { InterestCode } from '@sk/domain/content'
import type { OnboardingRecord, Stay } from './record'

import { readStored, writeStored } from '@/lib/storage'
import { EMPTY_RECORD, ONBOARDING_KEY, parseRecord } from './record'

/**
 * The onboarding answers as a module-level external store for `useSyncExternalStore` (ADR-006). The memory copy is the
 * source for the page: every change is written through to `localStorage`, and blocked storage stays silent, so a visit
 * still keeps its answers. The snapshot is one object until something changes. The server snapshot has no answers.
 */
let current: OnboardingRecord | undefined
const listeners = new Set<() => void>()

function load(): OnboardingRecord {
  return parseRecord(readStored<unknown>(ONBOARDING_KEY, null))
}

export function getRecord(): OnboardingRecord {
  current ??= load()

  return current
}

export function getServerRecord(): OnboardingRecord {
  return EMPTY_RECORD
}

function replace(next: OnboardingRecord) {
  current = next
  listeners.forEach(listener => listener())
}

function commit(next: OnboardingRecord) {
  writeStored(ONBOARDING_KEY, next)
  replace(next)
}

function refreshFromStorage(event: StorageEvent) {
  // `key` is null when the whole storage was cleared.
  if (event.key !== null && event.key !== ONBOARDING_KEY)
    return

  const next = load()

  if (current === undefined || JSON.stringify(next) !== JSON.stringify(current))
    replace(next)
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0)
    window.addEventListener('storage', refreshFromStorage)

  listeners.add(listener)

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0)
      window.removeEventListener('storage', refreshFromStorage)
  }
}

export function hasAnswers(record: OnboardingRecord): boolean {
  return record.segment !== null || record.interests.length > 0
}

/** No answers and not skipped: the only state in which the flow may open by itself. */
export function isUnanswered(record: OnboardingRecord): boolean {
  return !hasAnswers(record) && record.dismissedAt === null
}

function answered(record: OnboardingRecord, now: string): string | null {
  return hasAnswers(record) ? now : null
}

function withAnswers(segment: Stay | null, interests: readonly InterestCode[]): OnboardingRecord {
  const record = getRecord()
  const next = { ...record, segment, interests: [...new Set(interests)] }

  return { ...next, answeredAt: answered(next, new Date().toISOString()) }
}

export function saveStay(stay: Stay) {
  commit(withAnswers(stay, getRecord().interests))
}

export function saveInterests(interests: readonly InterestCode[]) {
  commit(withAnswers(getRecord().segment, interests))
}

export function saveAnswers({ stay, interests }: { stay: Stay | null, interests: readonly InterestCode[] }) {
  commit(withAnswers(stay, interests))
}

/** A skip or close of the first run: nothing returns by itself. A stay already saved is kept. */
export function markDismissed() {
  commit({ ...getRecord(), dismissedAt: new Date().toISOString() })
}

/** "Forget my answers": clears everything, the skip mark too. The caller ends the flow. */
export function forgetAnswers() {
  commit(EMPTY_RECORD)
}

/** Test only: drops the memory copy so the next read loads from storage, as after a reload. */
export function resetAnswersStoreForTests() {
  current = undefined
}
