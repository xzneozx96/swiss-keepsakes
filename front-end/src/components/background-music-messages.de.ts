import type { musicEn } from './background-music-messages'

export const musicDe: Record<keyof typeof musicEn, string> = {
  'music.title': 'Hintergrundmusik',
  'music.close': 'Schliessen',
  'music.description': 'Ein ruhiger Schweizer Soundtrack zum Stöbern.',
  'music.status.playing': 'Läuft',
  'music.status.paused': 'Pausiert',
  'music.status.blocked': 'Zum Starten auf Abspielen tippen',
  'music.play': 'Musik abspielen',
  'music.pause': 'Musik pausieren',
  'music.seek': 'Position im Stück',
  'music.time.of': '{current} von {total}',
}
