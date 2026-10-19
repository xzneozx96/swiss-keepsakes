import type { Language } from '@/contexts/locale-context'
import type { TourStop } from '@/features/tours/types'

import { FieldError, Label, NumberField } from '@heroui/react'
import { useState } from 'react'

import { ChevronDownIcon, GripIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

import { IconAction } from '@/features/content/merchant/components/editor-fields'
import { pickText } from '@/lib/localized'
import { LocalizedField } from '../editor-parts'
import { PhotoField } from '../photo-field'

/* eslint-disable style/quotes -- Tailwind reads class names from this text, so the quotes in the before content class must not be escaped */
/** A 40px circle (equal sides) whose 44px touch target is an invisible extension, not a taller button. */
const round
  = "relative size-10 min-h-10 min-w-10 rounded-full p-0 before:absolute before:-inset-0.5 before:content-[''] data-[disabled=true]:opacity-30"
/* eslint-enable style/quotes */

/**
 * One stop in the itinerary: a numbered badge on the timeline, then the stop. Closed it is
 * one row (name, description, time); selected, or when Next/Save found something missing, it
 * opens to the name and description (the two required texts), with the time, tip and photo
 * behind "Time, tip and photo", and move up, move down and remove. The grip on the header
 * (closed or open) drags the stop to a new place; the arrows stay as the other way to move it.
 */
export function StopCard({
  stop,
  index,
  count,
  language,
  selected,
  nameError,
  textError,
  onSelect,
  onChange,
  onMove,
  onRemove,
  gripProps,
}: {
  stop: TourStop
  index: number
  count: number
  language: Language
  selected: boolean
  nameError?: string
  textError?: string
  onSelect: () => void
  onChange: (patch: Partial<TourStop>) => void
  onMove: (direction: -1 | 1, refocus?: 'arrow' | 'grip') => void
  onRemove: () => void
  /** Pointer handlers of the drag handle (`useStopDrag`); the keys move the stop too. */
  gripProps: React.ComponentProps<'button'>
}) {
  const { t } = useLocale()
  const [more, setMore] = useState(false)
  const open = selected || !!nameError || !!textError
  const name = pickText(stop.name, language).text
  const text = pickText(stop.description, language).text
  const number = index + 1
  const label = name || t('products.itinerary.stop.numbered', { n: number })
  const when
    = stop.minutesFromStart === 0
      ? t('products.itinerary.stop.start')
      : t('products.itinerary.stop.minuteShort', {
          minutes: stop.minutesFromStart,
        })

  return (
    <li className="group flex gap-3" data-stop={stop.id}>
      <div aria-hidden className="flex w-9 shrink-0 flex-col items-center">
        <span
          className={`grid size-9 place-items-center rounded-full text-sm font-bold tabular-nums shadow-surface transition-colors ${
            selected
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface text-foreground'
          }`}
        >
          {number}
        </span>
        {index < count - 1 && (
          <span className="mt-1 w-0.5 flex-1 rounded-full bg-separator" />
        )}
      </div>
      <div
        className={`flex min-w-0 flex-1 flex-col gap-3 rounded-2xl bg-surface-secondary p-2 transition-shadow group-data-[lifted]:shadow-overlay ${
          index < count - 1 ? 'mb-3' : ''
        } ${selected ? 'ring-2 ring-accent' : ''}`}
      >
        <div className="flex items-center gap-1">
          <button
            {...gripProps}
            aria-label={t('products.itinerary.stop.grip', { name: label })}
            className="relative grid size-9 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:focus-ring active:cursor-grabbing"
            data-grip=""
            // Inline: globals.css gives every button `touch-action: manipulation`, outside any layer.
            style={{ touchAction: 'none' }}
            type="button"
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault()
                onMove(event.key === 'ArrowUp' ? -1 : 1, 'grip')
              }
              gripProps.onKeyDown?.(event)
            }}
          >
            <GripIcon aria-hidden size={18} />
          </button>
          <button
            aria-expanded={open}
            aria-label={t('products.itinerary.stop.toggle', {
              n: number,
              name: name || t('products.itinerary.stop.unnamed'),
            })}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-start outline-none focus-visible:focus-ring"
            type="button"
            onClick={onSelect}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span
                className={`truncate font-medium ${name ? '' : 'text-muted'}`}
              >
                {name || t('products.itinerary.stop.unnamed')}
              </span>
              {!open && (
                <span className="truncate text-sm text-muted">
                  {text || t('products.itinerary.stop.noText')}
                </span>
              )}
            </span>
            <span className="shrink-0 text-sm text-muted tabular-nums">
              {when}
            </span>
          </button>
        </div>
        {open && (
          <div className="flex flex-col gap-4 px-2 pb-2">
            <LocalizedField
              error={nameError}
              label={t('products.itinerary.stop.name')}
              language={language}
              value={stop.name}
              onChange={next => onChange({ name: next })}
            />
            <LocalizedField
              error={textError}
              label={t('products.itinerary.stop.text')}
              language={language}
              rows={2}
              value={stop.description}
              onChange={next => onChange({ description: next })}
            />
            <div className="flex items-center gap-2">
              <button
                aria-expanded={more}
                className="flex min-h-11 min-w-0 items-center gap-1 whitespace-nowrap rounded-lg text-sm font-medium outline-none focus-visible:focus-ring"
                type="button"
                onClick={() => setMore(on => !on)}
              >
                {t('products.itinerary.stop.details')}
                <ChevronDownIcon
                  aria-hidden
                  className={`transition-transform ${more ? 'rotate-180' : ''}`}
                  size={16}
                />
              </button>
              <div className="-me-1.5 ms-auto flex shrink-0 items-center gap-1">
                <IconAction
                  buttonProps={{ 'className': round, 'data-move': 'up' }}
                  className="rotate-180"
                  icon={ChevronDownIcon}
                  isDisabled={index === 0}
                  label={t('products.itinerary.stop.moveUp', { name: label })}
                  onPress={() => onMove(-1)}
                />
                <IconAction
                  buttonProps={{ 'className': round, 'data-move': 'down' }}
                  icon={ChevronDownIcon}
                  isDisabled={index === count - 1}
                  label={t('products.itinerary.stop.moveDown', { name: label })}
                  onPress={() => onMove(1)}
                />
                <IconAction
                  buttonProps={{ className: `${round} text-danger` }}
                  icon={TrashIcon}
                  label={t('products.itinerary.stop.remove', { name: label })}
                  onPress={onRemove}
                />
              </div>
            </div>
            {more && (
              <div className="flex flex-col gap-4">
                <NumberField
                  fullWidth
                  formatOptions={{ maximumFractionDigits: 0 }}
                  maxValue={720}
                  minValue={0}
                  step={5}
                  value={stop.minutesFromStart}
                  onChange={(minutes) => {
                    if (Number.isFinite(minutes))
                      onChange({ minutesFromStart: Math.round(minutes) })
                  }}
                >
                  <Label>{t('products.itinerary.stop.minutes')}</Label>
                  <NumberField.Group>
                    <NumberField.Input className="tabular-nums" />
                  </NumberField.Group>
                  <FieldError />
                </NumberField>
                <LocalizedField
                  label={t('products.itinerary.stop.note')}
                  language={language}
                  rows={2}
                  value={stop.note ?? {}}
                  onChange={note => onChange({ note })}
                />
                <PhotoField
                  help={t('products.itinerary.stop.photoHelp')}
                  label={t('products.itinerary.stop.photo')}
                  value={stop.photo}
                  onChange={photo => onChange({ photo })}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
