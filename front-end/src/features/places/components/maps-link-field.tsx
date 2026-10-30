import type { ReactNode } from 'react'
import type { MessageKey } from '@/i18n/en'

import { useRef, useState } from 'react'

import { AttachedField } from '@/components/attached-field'
import { LinkIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { parseMapsLink } from '../lib/maps-link'

type State = { status: 'idle' } | { status: 'reading' } | { status: 'moved', lat: number, lng: number } | { status: 'failed', message: MessageKey }

/**
 * "Google Maps link": paste a link and the pin moves there. A long link is read in the browser; a short one
 * (maps.app.goo.gl) is followed by the API. It is read when it is pasted, on Enter and when the field is left, not
 * on every key, so a half-typed link never moves the pin. The map is attached under the input, in one frame, for
 * fine-tuning. "Pin moved to the link" shows while the pin is still where the link put it.
 */
export function MapsLinkField({ storeId, position, onPosition, children }: {
  storeId: string
  /** Where the pin is now, so the success line goes once the pin is moved some other way. */
  position: { lat: number, lng: number } | null
  onPosition: (position: { lat: number, lng: number }) => void
  children: ReactNode
}) {
  const { t } = useLocale()
  const resolve = useCommand('places', 'resolveMapsLink', { meta: { silent: true } })
  const [value, setValue] = useState('')
  const [state, setState] = useState<State>({ status: 'idle' })
  // The link last read, so leaving the field again does not look it up twice; and the read that is current.
  const lastRef = useRef('')
  const attemptRef = useRef(0)

  const read = (text: string) => {
    const link = text.trim()

    if (link === lastRef.current)
      return
    lastRef.current = link
    attemptRef.current += 1
    const attempt = attemptRef.current

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
      resolve.mutate({ storeId, url: parsed.url }, {
        onSuccess: (found) => {
          if (attempt !== attemptRef.current)
            return
          setState({ status: 'moved', lat: found.latitude, lng: found.longitude })
          onPosition({ lat: found.latitude, lng: found.longitude })
        },
        onError: (error) => {
          if (attempt === attemptRef.current)
            setState({ status: 'failed', message: error instanceof ApiProblem && error.type === 'maps-link-unreadable' ? 'places.mapsLink.unreadable' : 'places.mapsLink.failed' })
        },
      })
    }
    else {
      setState({ status: 'failed', message: 'places.mapsLink.unreadable' })
    }
  }

  const clear = () => {
    lastRef.current = ''
    attemptRef.current += 1
    setValue('')
    setState({ status: 'idle' })
  }
  const moved = state.status === 'moved' && position?.lat === state.lat && position.lng === state.lng

  return (
    <AttachedField
      clearLabel={t('places.mapsLink.clear')}
      error={state.status === 'failed' ? t(state.message) : undefined}
      icon={LinkIcon}
      inputMode="url"
      label={t('places.mapsLink.label')}
      placeholder="https://maps.app.goo.gl/…"
      status={state.status === 'reading' ? t('places.mapsLink.reading') : moved ? t('places.mapsLink.moved') : undefined}
      statusTone={moved ? 'success' : 'muted'}
      value={value}
      onBlur={() => read(value)}
      onChange={setValue}
      onClear={clear}
      onKeyDown={(event) => {
        if (event.key === 'Enter')
          read(value)
      }}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData('text')

        setValue(pasted)
        event.preventDefault()
        read(pasted)
      }}
    >
      {children}
    </AttachedField>
  )
}
