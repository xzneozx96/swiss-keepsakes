import type { CalendarRef } from '@fullcalendar/react'

import type { CalendarItem, CalendarOverlay } from './calendar-core'
import FullCalendar from '@fullcalendar/react'
import deLocale from '@fullcalendar/react/locales/de'
import { buttonVariants, Drawer } from '@heroui/react'
import { calendarDay, dateTimeFormat } from '@sk/domain/shared'
import { Link } from '@tanstack/react-router'

import { useRef, useState } from 'react'

import {
  AccountIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  PickupIcon,
} from '@/components/icons'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { calendarPlugins, swissDate } from './calendar-core'

function EventDetail({ item }: { item: CalendarItem }) {
  const { t, intlLocale } = useLocale()
  const date = dateTimeFormat(intlLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(calendarDay(item.date))
  const openClass = `${buttonVariants({ variant: 'secondary' })} mt-6 w-full`

  if (item.kind === 'pickup') {
    return (
      <div className="mc-event-detail mc-detail-pickup">
        <div className="mc-detail-row">
          <ClockIcon aria-hidden="true" />
          <div>
            <p>{date}</p>
            <span>
              {item.requested
                ? t('calendar.pickupRequested')
                : t('calendar.pickupFixed')}
            </span>
          </div>
        </div>
        <div className="mc-detail-row">
          <AccountIcon aria-hidden="true" />
          <div>
            <p>{item.customer}</p>
            <span>
              {t(
                item.quantity === 1
                  ? 'calendar.keepsakes.one'
                  : 'calendar.keepsakes.other',
                { count: item.quantity },
              )}
            </span>
          </div>
        </div>
        {item.place && (
          <div className="mc-detail-row">
            <PickupIcon aria-hidden="true" />
            <p>{item.place}</p>
          </div>
        )}
        <dl className="mc-detail-status">
          <div>
            <dt>{t('calendar.status')}</dt>
            <dd>
              <StatusChip tone={item.progress.tone}>
                {item.progress.text}
              </StatusChip>
            </dd>
          </div>
          <div>
            <dt>{t('calendar.payment')}</dt>
            <dd>
              <StatusChip tone={item.payment.tone}>
                {item.payment.text}
              </StatusChip>
            </dd>
          </div>
        </dl>
        <p className="mc-preview-note">{item.ref}</p>
        <Link
          className={openClass}
          params={{ orderId: item.orderId }}
          to="/store/orders/$orderId"
        >
          {t('calendar.openOrder')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mc-event-detail mc-detail-tour">
      <div className="mc-detail-row">
        <ClockIcon aria-hidden="true" />
        <div>
          <p>{date}</p>
          <span>
            {item.time}–{item.end} · Europe/Zurich
          </span>
        </div>
      </div>
      <div className="mc-detail-row">
        <AccountIcon aria-hidden="true" />
        <div>
          <p>
            {item.lead
              ? item.more
                ? t('calendar.plusMore', { name: item.lead, count: item.more })
                : item.lead
              : t('calendar.noBookings')}
          </p>
          <span>
            {t('tourMerchant.seatsBooked', {
              count: item.booked,
              capacity: item.capacity,
            })}
            {item.held > 0
              && ` · ${t('tourMerchant.onHold', { held: item.held })}`}
          </span>
        </div>
      </div>
      <div className="mc-detail-row">
        <PickupIcon aria-hidden="true" />
        <p>{item.meetingPoint}</p>
      </div>
      <dl className="mc-detail-status">
        <div>
          <dt>{t('calendar.status')}</dt>
          <dd>
            <StatusChip tone={item.phase.tone}>{item.phase.text}</StatusChip>
          </dd>
        </div>
        <div>
          <dt>{t('calendar.payment')}</dt>
          <dd>
            <StatusChip tone={item.payment.tone}>
              {item.payment.text}
            </StatusChip>
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function CalendarOverlays({
  overlay,
  activeDate,
  today,
  onClose,
  onPickDate,
}: {
  overlay: CalendarOverlay
  activeDate: string
  today: string
  onClose: () => void
  onPickDate: (date: string) => void
}) {
  const { t, language } = useLocale()
  const de = language === 'de'
  const pickerRef = useRef<CalendarRef>(null)
  const [pickerTitle, setPickerTitle] = useState('')
  const item = overlay?.kind === 'event' ? overlay.item : null

  return (
    <Drawer.Backdrop
      isOpen={overlay !== null}
      onOpenChange={(open) => {
        if (!open)
          onClose()
      }}
    >
      <Drawer.Content className="mc-sheet-content" placement="bottom">
        <Drawer.Dialog className="mc-sheet">
          <Drawer.Handle />
          <Drawer.Header className="mc-sheet-header">
            <Drawer.Heading>
              {item ? item.title : t('calendar.pickDate')}
            </Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t('calendar.close')} />
          </Drawer.Header>
          <Drawer.Body className="mc-sheet-body">
            {overlay?.kind === 'date' && (
              <>
                <div className="mc-picker-toolbar">
                  <h2>{pickerTitle}</h2>
                  <button
                    aria-label={t('calendar.prevMonth')}
                    className="mc-icon-button"
                    type="button"
                    onClick={() => pickerRef.current?.getApi().prev()}
                  >
                    <ChevronLeftIcon aria-hidden="true" />
                  </button>
                  <button
                    aria-label={t('calendar.nextMonth')}
                    className="mc-icon-button"
                    type="button"
                    onClick={() => pickerRef.current?.getApi().next()}
                  >
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                </div>
                <div className="mc-picker">
                  <FullCalendar
                    ref={pickerRef}
                    fixedWeekCount
                    navLinks
                    datesSet={info => setPickerTitle(info.view.title)}
                    dayCellClass="mc-picker-cell"
                    dayCellTopClass="mc-picker-top"
                    dayCellTopContent={info => (
                      <span
                        className={`mc-picker-day ${swissDate(info.date) === activeDate ? 'mc-picked' : ''} ${info.isOther ? 'mc-outside' : ''}`}
                      >
                        {info.dayNumberText}
                      </span>
                    )}
                    dayCellTopInnerClass="mc-picker-top-inner"
                    dayHeaderClass="mc-picker-weekday"
                    dayHeaderFormat={{ weekday: 'narrow' }}
                    dayRowClass="mc-picker-row"
                    events={[]}
                    firstDay={1}
                    headerToolbar={false}
                    height="auto"
                    initialDate={activeDate}
                    initialView="dayGridMonth"
                    locale={de ? deLocale : 'en-gb'}
                    navLinkDayClick={date => onPickDate(swissDate(date))}
                    now={today}
                    plugins={calendarPlugins}
                    tableClass="mc-picker-table"
                    timeZone="Europe/Zurich"
                  />
                </div>
              </>
            )}
            {item && <EventDetail item={item} />}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
