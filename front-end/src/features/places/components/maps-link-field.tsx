import type { MessageKey } from '@/i18n/en'

import { Button, Description, FieldError, Input, Label, Spinner, TextField } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { parseMapsLink, storableLink } from '../lib/maps-link'
import { linkToPin, movedAway } from '../lib/pin-sync'
import { SyncWarning } from './sync-warning'

type State
  = | { status: 'idle' }
    | { status: 'reading' }
    | { status: 'moved', lat: number, lng: number }
    // The position of a stored link, known on open: nothing to announce, but a pin moved away from it is warned about.
    | { status: 'linked', lat: number, lng: number }
    | { status: 'failed', message: MessageKey }

/** The position of a link opened with the place: read in the browser when it can be, else unknown until the API has followed it. */
function openedState(link: string): State {
  const parsed = parseMapsLink(link)

  return parsed.kind === 'position' ? { status: 'linked', lat: parsed.latitude, lng: parsed.longitude } : { status: 'idle' }
}

/**
 * "Google Maps link": paste a link and the pin moves there. A long link is read in the browser; a short one
 * (maps.app.goo.gl) is followed by the API. It is read when it is pasted, on Enter and when the field is left, not
 * on every key, so a half-typed link never moves the pin. It is a field like the others, and what happened to the link
 * is its description: "Pin moved to the link" shows while the pin is still where the link put it.
 *
 * The link is stored with the place (`link` is the stored value, `onLink` changes it): it is set when a link is read and
 * emptied when the text is no Google Maps link or the person removes it. A place that is opened with a link knows where
 * it points, so "The pin moved since you pasted this link" also shows after a reload: a long link is read in the browser,
 * a short one is followed once by the API when the field opens.
 */
export function MapsLinkField({ storeId, link, onLink, position, onPosition }: {
  storeId: string
  link: string
  onLink: (link: string) => void
  /** Where the pin is now, so the success line goes once the pin is moved some other way. */
  position: { lat: number, lng: number } | null
  onPosition: (position: { lat: number, lng: number }) => void
}) {
  const { t } = useLocale()
  const resolve = useCommand('places', 'resolveMapsLink', { meta: { silent: true } })
  const [value, setValue] = useState(link)
  const [state, setState] = useState<State>(() => openedState(link))
  // The link last read, so leaving the field again does not look it up twice; and the read that is current.
  const lastRef = useRef(link.trim())
  const attemptRef = useRef(0)
  const openedRef = useRef(false)

  // A stored short link holds no position: follow it once, quietly. A failure leaves the field as it is.
  useEffect(() => {
    // Once, when the field opens: a link pasted later is followed by `read`, and a second call would drop that one's answer.
    if (openedRef.current)
      return
    openedRef.current = true
    const opened = parseMapsLink(link)

    if (opened.kind !== 'short')
      return
    resolve.mutate({ storeId, url: opened.url }, {
      onSuccess: (found) => {
        if (attemptRef.current === 0)
          setState({ status: 'linked', lat: found.latitude, lng: found.longitude })
      },
    })
  }, [link, resolve, storeId])

  const read = (text: string) => {
    const typed = text.trim()

    if (typed === lastRef.current)
      return
    lastRef.current = typed
    attemptRef.current += 1
    const attempt = attemptRef.current

    if (typed === '') {
      setState({ status: 'idle' })
      onLink('')

      return
    }
    const parsed = parseMapsLink(typed)

    onLink(parsed.kind === 'unreadable' ? '' : storableLink(typed))
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
  const pinLeft = (state.status === 'moved' || state.status === 'linked') && movedAway({ lat: state.lat, lng: state.lng }, position)
  const description = state.status === 'reading' ? t('places.mapsLink.reading') : moved ? t('places.mapsLink.moved') : t('places.mapsLink.help')

  // The pin is where the person put it: a link to that spot, or no link at all.
  const linkNewPin = () => {
    if (!position)
      return
    const next = linkToPin(position)

    lastRef.current = next
    attemptRef.current += 1
    setValue(next)
    onLink(next)
    setState({ status: 'moved', lat: position.lat, lng: position.lng })
  }
  const removeLink = () => {
    lastRef.current = ''
    attemptRef.current += 1
    setValue('')
    onLink('')
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
