import type { Pin } from './pins-merchant-data'

/**
 * Messages between the dashboard frame and the guest phone on `/lab/pins`. The dashboard
 * runs in a same-origin frame (so its breakpoints are real), and tells the page its pins
 * and the form being edited; the page asks it to open a pin in the editor.
 */
const SOURCE = 'sk-pins-lab'

export type LabMessage
  = | { type: 'pins', pins: Pin[] }
    | { type: 'draft', pin: Pin | null }
    | { type: 'edit', id: string }

type Envelope = LabMessage & { source: typeof SOURCE }

function isEnvelope(data: unknown): data is Envelope {
  return typeof data === 'object' && data !== null && (data as { source?: unknown }).source === SOURCE
}

/** From the dashboard frame to the page around it; nothing happens outside the lab frame. */
export function postToPage(message: LabMessage) {
  if (window.parent !== window)
    window.parent.postMessage({ ...message, source: SOURCE }, window.location.origin)
}

export function postToFrame(frame: HTMLIFrameElement | null, message: LabMessage) {
  frame?.contentWindow?.postMessage({ ...message, source: SOURCE }, window.location.origin)
}

/** Listens for lab messages from the same origin; returns the cleanup. */
export function onLabMessage(listener: (message: LabMessage) => void) {
  const handle = (event: MessageEvent) => {
    if (event.origin === window.location.origin && isEnvelope(event.data))
      listener(event.data)
  }

  window.addEventListener('message', handle)

  return () => window.removeEventListener('message', handle)
}
