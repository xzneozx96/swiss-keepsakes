import type { MessageKey } from '@/i18n/en'

import { Description, FieldError, Input, Label, TextField } from '@heroui/react'
import { useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { parseMapsLink } from '../lib/maps-link'

type State = { status: 'idle' } | { status: 'reading' } | { status: 'moved', lat: number, lng: number } | { status: 'failed', message: MessageKey }

/**
 * "Google Maps link": paste a link and the pin moves there. A long link is read in the browser; a short one
 * (maps.app.goo.gl) is followed by the API. It is read when it is pasted, on Enter and when the field is left, not
 * on every key, so a half-typed link never moves the pin. It is a field like the others, and what happened to the link
 * is its description: "Pin moved to the link" shows while the pin is still where the link put it.
 */
export function MapsLinkField({ storeId, position, onPosition }: {
  storeId: string
  /** Where the pin is now, so the success line goes once the pin is moved some other way. */
  position: { lat: number, lng: number } | null
  onPosition: (position: { lat: number, lng: number }) => void
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

  const moved = state.status === 'moved' && position?.lat === state.lat && position.lng === state.lng
  const description = state.status === 'reading' ? t('places.mapsLink.reading') : moved ? t('places.mapsLink.moved') : t('places.mapsLink.help')

  return (
    <TextField fullWidth isInvalid={state.status === 'failed'} value={value} onChange={setValue}>
      <Label>{t('places.mapsLink.label')}</Label>
      <Input
        inputMode="url"
        placeholder="https://maps.app.goo.gl/…"
        onBlur={() => read(value)}
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
      />
      <div aria-live="polite">
        {state.status === 'failed'
          ? <FieldError>{t(state.message)}</FieldError>
          : <Description className={moved ? 'text-success' : undefined}>{description}</Description>}
      </div>
    </TextField>
  )
}
