import { setTrackSink } from '@/lib/analytics/track'

export interface RecordedEvent {
  name: string
  props: Record<string, unknown>
}

/** Installs the track sink: events are recorded here, and nothing reaches PostHog. `uninstall` puts the real path back. */
export function installFakeAnalytics() {
  const events: RecordedEvent[] = []

  setTrackSink((name, props) => {
    events.push({ name, props })
  })

  return {
    events,
    reset() {
      events.length = 0
    },
    uninstall() {
      setTrackSink(undefined)
    },
  }
}
