import { useSyncExternalStore } from 'react'

export type OnboardingMode = 'first' | 'change'

interface OpenerState {
  /** The flow that is open, or null. */
  request: { mode: OnboardingMode } | null
  /** Once the flow has closed, nothing opens by itself again in this page session. */
  autoDone: boolean
  /** The visit entry has been captured, so the host may read it. False on the server and on the first client render. */
  captured: boolean
}

const INITIAL: OpenerState = { request: null, autoDone: false, captured: false }

/**
 * The open request of the onboarding flow as a module external store (ADR-001, ADR-006). The Account row, the stories
 * "Change" line and the host all use it. One object per change, so the snapshot is stable between changes.
 */
let state = INITIAL
let returnTo: HTMLElement | null = null
const listeners = new Set<() => void>()

function set(next: OpenerState) {
  state = next
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/** Opens the flow. Called from a press, so the focused element is the opener: focus goes back to it on close. */
export function openOnboarding(mode: OnboardingMode = 'change') {
  const active = document.activeElement

  returnTo = active instanceof HTMLElement && active !== document.body ? active : null
  set({ ...state, request: { mode } })
}

/** Ends the flow. A page session never opens it by itself again, so "Forget my answers" does not bring it straight back. */
export function closeOnboarding() {
  set({ ...state, request: null, autoDone: true })
}

/** The host calls this once the visit entry is stored, so it reads the visit. */
export function markVisitCaptured() {
  if (!state.captured)
    set({ ...state, captured: true })
}

/** The element that had focus when the flow opened, if it is still on the page. Read once. */
export function takeReturnFocus(): HTMLElement | null {
  const element = returnTo?.isConnected ? returnTo : null

  returnTo = null

  return element
}

export function useOnboardingRequest(): OpenerState['request'] {
  return useSyncExternalStore(subscribe, () => state.request, () => INITIAL.request)
}

export function useOnboardingAutoState(): Pick<OpenerState, 'autoDone' | 'captured'> {
  const autoDone = useSyncExternalStore(subscribe, () => state.autoDone, () => INITIAL.autoDone)
  const captured = useSyncExternalStore(subscribe, () => state.captured, () => INITIAL.captured)

  return { autoDone, captured }
}

/** Test only. */
export function resetOpenerForTests() {
  state = INITIAL
  returnTo = null
}
