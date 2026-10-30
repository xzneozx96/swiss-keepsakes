import type { ReactNode } from 'react'
import type { LinkReader } from './use-link-reader'

import { Description, FieldError, Input, Label, TextField } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { Block } from '@/components/form-block'
import { OpenInMapsIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { copy } from './copy'

type Option = keyof typeof copy.options

/** The card's height now, measured, so each option states its real size at this width. */
function useHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const element = ref.current

    if (!element)
      return
    const observer = new ResizeObserver(() => setHeight(Math.round(element.getBoundingClientRect().height)))

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return { ref, height }
}

/** One option: its letter, title and rationale, the measured height, then the working card. */
export function OptionShell({ option, children }: { option: Option, children: ReactNode }) {
  const { ref, height } = useHeight()
  const o = copy.options[option]

  return (
    <section aria-labelledby={`location-${option}`} className="flex min-w-0 flex-col gap-3" data-option={option}>
      <header className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-heading" id={`location-${option}`}>
          <span aria-hidden className="grid size-6 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{o.id}</span>
          {o.title}
        </h2>
        <p className="text-sm text-pretty text-muted">{o.why}</p>
        <p className="text-xs text-muted tabular-nums" data-height>{copy.heightAt(height)}</p>
      </header>
      <div ref={ref} className="min-w-0">{children}</div>
    </section>
  )
}

/** The card every option shares: the editor's own block, with its icon, title and hint. */
export function LocationBlock({ children }: { children: ReactNode }) {
  const { t } = useLocale()

  return (
    <Block hint={t('places.map.help')} icon={OpenInMapsIcon} title={t('places.map.label')}>
      {children}
    </Block>
  )
}

/** What the map shows in place of itself when it cannot load. */
export function MapFailed() {
  return <p className="grid h-40 place-items-center rounded-2xl bg-surface-secondary text-sm text-muted" role="alert">{copy.mapFailed}</p>
}

/** The link as a normal form field, like every other field of the editor: label, input, and the reader's answer as the field’s own description, else the help line. */
export function LinkField({ reader }: { reader: LinkReader }) {
  const { t } = useLocale()
  const { line } = reader
  const failed = reader.isInvalid

  return (
    <TextField fullWidth isInvalid={failed} value={reader.value} onChange={reader.handlers.onChange}>
      <Label>{t('places.mapsLink.label')}</Label>
      <Input inputMode="url" placeholder="https://maps.app.goo.gl/…" onBlur={reader.handlers.onBlur} onKeyDown={reader.handlers.onKeyDown} onPaste={reader.handlers.onPaste} />
      <div aria-live="polite">
        {failed && line
          ? <FieldError>{line.text}</FieldError>
          : line
            ? <Description className={line.tone === 'success' ? 'text-success' : undefined}>{line.text}</Description>
            : <Description>{copy.linkHelp}</Description>}
      </div>
    </TextField>
  )
}
