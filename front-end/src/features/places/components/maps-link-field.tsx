import type { MessageKey } from '@/i18n/en'

import { Description, FieldError, Input, Label, TextField } from '@heroui/react'
import { useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { parseMapsLink } from '../lib/maps-link'

type State = { status: 'idle' } | { status: 'reading' } | { status: 'failed', message: MessageKey }

/**
 * "Google Maps link": paste a link and the pin moves there. A long link is read in the browser; a short one
 * (maps.app.goo.gl) is followed by the API. It is read when it is pasted, on Enter and when the field is left, not
 * on every key, so a half-typed link never moves the pin. The map stays for fine-tuning.
 */
export function MapsLinkField({ storeId, onPosition }: { storeId: string, onPosition: (position: { lat: number, lng: number }) => void }) {
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
      setState({ status: 'idle' })
      onPosition({ lat: parsed.latitude, lng: parsed.longitude })
    }
    else if (parsed.kind === 'short') {
      setState({ status: 'reading' })
      resolve.mutate({ storeId, url: parsed.url }, {
        onSuccess: (found) => {
          if (attempt !== attemptRef.current)
            return
          setState({ status: 'idle' })
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
      {state.status === 'failed'
        ? <FieldError>{t(state.message)}</FieldError>
        : <Description>{state.status === 'reading' ? t('places.mapsLink.reading') : t('places.mapsLink.help')}</Description>}
      <span aria-live="polite" className="sr-only" role="status">{state.status === 'reading' ? t('places.mapsLink.reading') : ''}</span>
    </TextField>
  )
}
