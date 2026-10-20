import { createAuthClient } from '@neondatabase/neon-js/auth'

const BROADCAST_CHANNEL = Symbol.for('better-auth:broadcast-channel')

interface ChannelMessage {
  event?: string
  data?: unknown
}

/**
 * Better Auth's cross-tab channel writes every message to `localStorage`, and the SDK's message
 * after a token refresh carries the new JWT. This channel sends the same messages to the other
 * tabs through the BroadcastChannel API, which keeps them in memory.
 */
function memoryBroadcastChannel() {
  const listeners = new Set<(message: ChannelMessage) => void>()
  const channel = new BroadcastChannel('better-auth.message')

  channel.addEventListener('message', (event: MessageEvent<ChannelMessage>) => {
    if (event.data.event === 'session' && event.data.data)
      listeners.forEach(listener => listener(event.data))
  })

  return {
    subscribe(listener: (message: ChannelMessage) => void) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    post(message: ChannelMessage) {
      channel.postMessage({ ...message, timestamp: Math.floor(Date.now() / 1000) })
    },
    setup: () => () => {},
  }
}

export function createNeonAuthClient(url: string) {
  (globalThis as unknown as Record<symbol, unknown>)[BROADCAST_CHANNEL] = memoryBroadcastChannel()

  return createAuthClient(url)
}

export type NeonAuthClient = ReturnType<typeof createNeonAuthClient>
