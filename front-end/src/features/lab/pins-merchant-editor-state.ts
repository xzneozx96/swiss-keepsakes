import type { ChecklistItem, FieldError, Pin, PinStatus } from './pins-merchant-data'

import { useRef, useState } from 'react'

import { checklist, fieldErrors, LAB_TODAY, slugOwner, suggestSlug } from './pins-merchant-data'

/** How long the lab pretends a save takes, so the saving state is visible. */
const SAVE_MS = 700

export type SaveState = 'idle' | 'saving' | 'saved'

/** The groups the three editor structures arrange; each knows whether it needs attention. */
export type GroupId = 'location' | 'content' | 'when' | 'tags' | 'links'

/**
 * Local state of one pin editor: the form, the last saved copy, live checks and a fake save.
 * Nothing leaves the browser tab.
 */
export function usePinEditor({ initial, others, startWithErrors, onSaved }: {
  initial: Pin
  /** Every other pin, for the slug check. */
  others: Pin[]
  startWithErrors: boolean
  onSaved: (pin: Pin) => void
}) {
  const [stored, setStored] = useState(initial)
  const [pin, setPin] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(!!initial.slug)
  const [attempt, setAttempt] = useState(startWithErrors)
  const [save, setSave] = useState<SaveState>('idle')
  const timer = useRef(0)

  const all = [...others, pin]
  const errors = fieldErrors(pin, all)
  // "Choose the day" waits for a save attempt; format and order problems show at once.
  const shownErrors = Object.fromEntries(
    Object.entries(errors).filter(([, e]) => attempt || e !== 'dateMissing'),
  ) as Record<string, FieldError>
  const checks = checklist(pin, all)
  const missing = (Object.keys(checks) as ChecklistItem[]).filter(item => !checks[item])
  const dirty = JSON.stringify(pin) !== JSON.stringify(stored)
  const isNew = stored.id === 'new'

  const patch = (fields: Partial<Pin>) => {
    setSave('idle')
    setPin((current) => {
      const next = { ...current, ...fields }

      return fields.title && !slugTouched ? { ...next, slug: suggestSlug(next) } : next
    })
  }

  const setSlug = (slug: string) => {
    setSlugTouched(true)
    patch({ slug })
  }

  /** Saves the form with a status; false when a field error blocks it. */
  const commit = (status: PinStatus, done: () => void) => {
    if (Object.keys(errors).length) {
      setAttempt(true)

      return false
    }
    setSave('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const next: Pin = {
        ...pin,
        id: pin.id === 'new' ? `p${Date.now()}` : pin.id,
        status,
        edited: LAB_TODAY,
        firstPublished: pin.firstPublished ?? (status === 'published' ? LAB_TODAY : null),
      }

      setStored(next)
      setPin(next)
      setAttempt(false)
      setSave('saved')
      onSaved(next)
      done()
    }, SAVE_MS)

    return true
  }

  /** Hide and show again change only the status, and keep any unsaved edits in the form. */
  const setStatus = (status: PinStatus) => {
    const next = { ...stored, status, edited: LAB_TODAY }

    setStored(next)
    setPin(current => ({ ...current, status }))
    onSaved(next)
  }

  /** Shows every missing rule, as a refused publish does. */
  const markAttempt = () => setAttempt(true)

  const groupIssue: Record<GroupId, boolean> = {
    location: !checks.location || !checks.slug || !!shownErrors.slug,
    content: !checks.title,
    when: Object.keys(shownErrors).some(key => key.startsWith('date:') || key.startsWith('hours:')),
    tags: false,
    links: !!shownErrors.link,
  }

  return {
    pin,
    stored,
    patch,
    setSlug,
    slugTouched,
    slugOwner: slugOwner(pin, all),
    errors: shownErrors,
    errorCount: Object.keys(errors).length,
    attempt,
    checks,
    missing,
    ready: missing.length === 0,
    dirty,
    isNew,
    save,
    commit,
    setStatus,
    markAttempt,
    groupIssue,
  }
}

export type PinEditor = ReturnType<typeof usePinEditor>
