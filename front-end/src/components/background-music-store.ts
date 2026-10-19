import { useSyncExternalStore } from 'react'

import { readStored, writeStored } from '@/lib/storage'

const ENABLED_KEY = 'sk.music'
const VOLUME_KEY = 'sk.music.volume'

export const DEFAULT_LEVEL = 0.35

export interface MusicState {
  /** The guest's standing choice: false after they pause, true after they press play; remembered across visits. */
  enabled: boolean
  /** The browser refused autoplay and the track waits for a gesture. */
  blocked: boolean
  /** The audio element is actually producing sound (false while ducked or hidden). */
  playing: boolean
  sheetOpen: boolean
  level: number
  muted: boolean
  /** Launchers stacked on the trip assistant button; the shell's own launcher yields to them. */
  stacked: number
}

interface StoredVolume {
  level: number
  muted: boolean
}

const storedVolume = readStored<Partial<StoredVolume>>(VOLUME_KEY, {})

let state: MusicState = {
  enabled: readStored<unknown>(ENABLED_KEY, true) !== false,
  blocked: false,
  playing: false,
  sheetOpen: false,
  level:
    typeof storedVolume.level === 'number'
    && storedVolume.level >= 0
    && storedVolume.level <= 1
      ? storedVolume.level
      : DEFAULT_LEVEL,
  muted: storedVolume.muted === true,
  stacked: 0,
}
const listeners = new Set<() => void>()

export const getMusic = () => state

export function setMusic(patch: Partial<MusicState>) {
  state = { ...state, ...patch }
  if ('enabled' in patch)
    writeStored(ENABLED_KEY, state.enabled)
  if ('level' in patch || 'muted' in patch)
    writeStored(VOLUME_KEY, { level: state.level, muted: state.muted })
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export const useMusic = () => useSyncExternalStore(subscribe, getMusic)

/** What the player does; BackgroundMusic fills these in while it is mounted. */
export interface MusicControls {
  play: () => void
  pause: () => void
  seek: (seconds: number) => void
  setLevel: (level: number) => void
  toggleMute: () => void
  /** The sheet opened: fetch just enough of the file to know its length. */
  loadMetadata: () => void
}

function noop() {}

export const musicControls: MusicControls & { audio: HTMLAudioElement | null }
  = {
    audio: null,
    play: noop,
    pause: noop,
    seek: noop,
    setLevel: noop,
    toggleMute: noop,
    loadMetadata: noop,
  }
