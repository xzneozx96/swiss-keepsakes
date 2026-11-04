import type { OnboardingRecord } from '../lib/record'

import { useSyncExternalStore } from 'react'
import { getRecord, getServerRecord, subscribe } from '../lib/answers-store'

/** The stored record, as the flow, the host and the card read it. The server and the first client render get the empty record. */
export function useOnboardingRecord(): OnboardingRecord {
  return useSyncExternalStore(subscribe, getRecord, getServerRecord)
}
