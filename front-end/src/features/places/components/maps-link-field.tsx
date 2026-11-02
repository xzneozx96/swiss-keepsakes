import type { MessageKey } from '@/i18n/en'

import { Button, Description, FieldError, Input, Label, Spinner, TextField } from '@heroui/react'
import { useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { parseMapsLink } from '../lib/maps-link'
import { linkToPin, movedAway } from '../lib/pin-sync'
import { SyncWarning } from './sync-warning'

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
  const pinLeft = state.status === 'moved' && movedAway({ lat: state.lat, lng: state.lng }, position)
  const description = state.status === 'reading' ? t('places.mapsLink.reading') : moved ? t('places.mapsLink.moved') : t('places.mapsLink.help')

  // The pin is where the person put it: a link to that spot, or no link at all.
  const linkNewPin = () => {
    if (!position)
      return
    const link = linkToPin(position)

    lastRef.current = link
    attemptRef.current += 1
    setValue(link)
    setState({ status: 'moved', lat: position.lat, lng: position.lng })
  }
  const removeLink = () => {
    lastRef.current = ''
    attemptRef.current += 1
    setValue('')
    setState({ status: 'idle' })
  }

  return (
    <>
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
            : (
                <Description className={`flex items-center gap-1.5 ${moved ? 'text-success' : ''}`}>
                  {state.status === 'reading' && <Spinner size="sm" />}
                  {description}
                </Description>
              )}
        </div>
      </TextField>
      {pinLeft && (
        <SyncWarning text={t('places.mapsLink.pinMoved')}>
          <Button size="sm" variant="secondary" onPress={linkNewPin}>{t('places.mapsLink.useNew')}</Button>
          <Button size="sm" variant="ghost" onPress={removeLink}>{t('places.mapsLink.remove')}</Button>
        </SyncWarning>
      )}
    </>
  )
}
