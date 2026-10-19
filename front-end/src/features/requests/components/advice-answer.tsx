import type { CalendarDate } from '@internationalized/date'
import type { AdviceQuestion, AdviceValue } from '../types'

import {
  Button,
  Calendar,
  Drawer,
  Label,
  Tag,
  TagGroup,
  TextArea,
  TextField,
} from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { useState } from 'react'

import { PickupDateIcon, SelectedIcon } from '@/components/icons'

import { QuantityLarge } from '@/components/quantity-stepper'
import { useLocale } from '@/contexts/locale-context'
import { zurichDate } from '@/features/catalog/lib/pickup'
import { useDemoNow } from '@/features/demo'
import { calendarDay, formatDate } from '@/lib/format'
import { pickText } from '@/lib/localized'
import { NUMBER_MAX, numberStart } from '../lib/answers'

/**
 * The input for one C21 question (R19). Choices are offered in the conversation, under the
 * assistant's question, in the C03 gift option style: a single choice answers on tap,
 * multiple choices toggle and then go with Send. Numbers
 * use the large − n + counter from the cart, dates a button that opens the calendar sheet,
 * text a text box.
 */
export function AdviceAnswer({
  question,
  label,
  value,
  onChange,
  onAnswer,
}: {
  question: AdviceQuestion
  /** The question as shown, the control's accessible name. */
  label: string
  value: AdviceValue | undefined
  onChange: (value: AdviceValue | undefined) => void
  /** A single choice answers at once. */
  onAnswer: (value: AdviceValue) => void
}) {
  const { t, language } = useLocale()
  const optionText = (o: NonNullable<AdviceQuestion['options']>[number]) =>
    pickText(o.label, language)

  switch (question.type) {
    case 'number':
      return (
        <QuantityLarge
          label={label}
          max={NUMBER_MAX}
          min={numberStart(question)}
          value={(value as number | undefined) ?? numberStart(question)}
          onChange={onChange}
        />
      )
    case 'single':
    case 'multi': {
      const multi = question.type === 'multi'
      const chosen = multi
        ? ((value as string[] | undefined) ?? [])
        : value
          ? [value as string]
          : []

      return (
        <TagGroup
          aria-label={label}
          selectedKeys={new Set(chosen)}
          selectionMode={multi ? 'multiple' : 'single'}
          size="lg"
          onSelectionChange={(keys) => {
            const ids = keys === 'all' ? [] : Array.from(keys, String)

            if (!multi) {
              if (ids[0])
                onAnswer(ids[0])
            }
            else {
              onChange(ids.length ? ids : undefined)
            }
          }}
        >
          {/* The gift option style (C03): chosen = red border and a check on the top edge. */}
          <TagGroup.List className="flex flex-wrap gap-2 pt-1.5">
            {question.options?.map((o) => {
              const text = optionText(o)

              return (
                <Tag
                  key={o.id}
                  className="group relative h-auto rounded-2xl border-2 border-transparent px-3.5 py-2.5 font-medium before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover"
                  id={o.id}
                  textValue={text.text}
                >
                  <span lang={text.language}>{text.text}</span>
                  <SelectedIcon
                    aria-hidden
                    className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block"
                    weight="Filled"
                  />
                </Tag>
              )
            })}
          </TagGroup.List>
        </TagGroup>
      )
    }
    case 'date':
      return (
        <DateAnswer
          label={label}
          value={value as string | undefined}
          onChange={onChange}
        />
      )
    case 'text':
      return (
        <TextField
          fullWidth
          maxLength={1000}
          value={(value as string | undefined) ?? ''}
          onChange={v => onChange(v.trim() ? v : undefined)}
        >
          <Label className="sr-only">{label}</Label>
          <TextArea placeholder={t('advice.textPlaceholder')} rows={3} />
        </TextField>
      )
  }
}

/**
 * A date answer: one compact button in the composer opens the calendar in a bottom sheet
 * (the C07 trip-profile date sheet), so the chat keeps its space. Past days are allowed.
 */
function DateAnswer({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (value: AdviceValue | undefined) => void
}) {
  const { t, intlLocale } = useLocale()
  const today = parseDate(zurichDate(useDemoNow()))
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<CalendarDate | null>(() =>
    value ? parseDate(value) : null)
  const shown = value
    ? formatDate(calendarDay(value), intlLocale)
    : t('advice.date.choose')

  return (
    <>
      <button
        aria-label={`${label}: ${shown}`}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-field-border bg-surface px-4 text-start outline-none transition-colors hover:bg-surface-secondary focus-visible:focus-ring"
        type="button"
        onClick={() => setOpen(true)}
      >
        <PickupDateIcon aria-hidden className="shrink-0" size={20} />
        <span className={value ? 'font-medium tabular-nums' : 'text-muted'}>
          {shown}
        </span>
      </button>
      <Drawer.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
          <Drawer.Dialog className="flex sheet-max flex-col">
            <Drawer.Handle />
            <Drawer.Header className="flex items-center justify-between">
              <Drawer.Heading className="text-title">{label}</Drawer.Heading>
              <Drawer.CloseTrigger aria-label={t('advice.date.close')} />
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-3 overflow-y-auto">
              <Calendar
                aria-label={label}
                className="calendar--fluid"
                defaultFocusedValue={date ?? today}
                value={date}
                onChange={setDate}
              >
                <Calendar.Header>
                  <Calendar.Heading />
                  <Calendar.NavButton slot="previous" />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {day => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>
                    {d => (
                      <Calendar.Cell
                        className={
                          d.compare(today) === 0
                            ? 'calendar__cell--demo-today'
                            : ''
                        }
                        date={d}
                      />
                    )}
                  </Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
            </Drawer.Body>
            <Drawer.Footer className="pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              <Button
                fullWidth
                className="h-14 text-base"
                isDisabled={!date}
                onPress={() => {
                  onChange(date?.toString())
                  setOpen(false)
                }}
              >
                {t('advice.date.done')}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  )
}
