import type { ClipboardEvent, KeyboardEvent } from 'react'
import type { Position } from './sample'

import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { parseMapsLink } from '@/features/places/lib/maps-link'
import { CANNED_ANSWER } from './sample'

type State
  = | { status: 'idle' }
    | { status: 'reading' }
    | { status: 'moved', lat: number, lng: number }
    | { status: 'failed', message: 'places.mapsLink.unreadable' }

export interface Line { tone: 'success' | 'muted' | 'danger', text: string }

/**
 * The behaviour of the editor's MapsLinkField (read on paste, on Enter and on leaving the field; “Pin moved to the
 * link” only while the pin is still where the link put it), without its frame, so each layout can dress it. A short
 * link is answered here after a short wait instead of by the server.
 */
export function useLinkReader({ position, onPosition }: { position: Position | null, onPosition: (position: Position) => void }) {
  const { t } = useLocale()
  const [value, setValue] = useState('')
  const [state, setState] = useState<State>({ status: 'idle' })
  const lastRef = useRef('')
  const attemptRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const read = (text: string) => {
    const link = text.trim()

    if (link === lastRef.current)
      return
    lastRef.current = link
    attemptRef.current += 1
    const attempt = attemptRef.current

    clearTimeout(timerRef.current)
    if (link === '') {
      setState({ status: 'idle' })

      return
    }
    const parsed = parseMapsLink(link)

    if (parsed.kind === 'position') {
      setState({ status: 'moved', lat: parsed.latitude, lng: parsed.longitude })
      onPosition({ lat: parsed.latitude, lng: parsed.longitude })
    }
    else if (parsed.kind === 'short') {
      setState({ status: 'reading' })
      timerRef.current = setTimeout(() => {
        if (attempt !== attemptRef.current)
          return
        setState({ status: 'moved', lat: CANNED_ANSWER.lat, lng: CANNED_ANSWER.lng })
        onPosition(CANNED_ANSWER)
      }, 700)
    }
    else {
      setState({ status: 'failed', message: 'places.mapsLink.unreadable' })
    }
  }

  const moved = state.status === 'moved' && position?.lat === state.lat && position.lng === state.lng
  let line: Line | null = null

  if (state.status === 'failed')
    line = { tone: 'danger', text: t(state.message) }
  else if (state.status === 'reading')
    line = { tone: 'muted', text: t('places.mapsLink.reading') }
  else if (moved)
    line = { tone: 'success', text: t('places.mapsLink.moved') }

  return {
    value,
    line,
    isInvalid: state.status === 'failed',
    handlers: {
      onChange: setValue,
      onBlur: () => read(value),
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter')
          read(value)
      },
      onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
        const pasted = event.clipboardData.getData('text')

        setValue(pasted)
        event.preventDefault()
        read(pasted)
      },
    },
  }
}

export type LinkReader = ReturnType<typeof useLinkReader>
