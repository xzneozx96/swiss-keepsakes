import type { CalendarRef, DatesSetInfo } from '@fullcalendar/react'
import type { CalendarOverlay } from './calendar-core'
import FullCalendar from '@fullcalendar/react'
import deLocale from '@fullcalendar/react/locales/de'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'

import { useLocale } from '@/contexts/locale-context'
import {

  calendarPlugins,
  sampleToday,
  schedule,
  swissDate,
} from './calendar-core'
import { CalendarOverlays } from './calendar-overlays'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/monarch/theme.css'
import './calendar.css'

const views = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
} as const

type CalendarView = keyof typeof views

export function CalendarLab() {
  const { language } = useLocale()
  const de = language === 'de'
  const locale = de ? 'de-CH' : 'en-GB'
  const calendarRef = useRef<CalendarRef>(null)
  const [view, setView] = useState<CalendarView>('month')
  const [activeDate, setActiveDate] = useState(sampleToday)
  const [monthTitle, setMonthTitle] = useState('')
  const [yearTitle, setYearTitle] = useState('')
  const [overlay, setOverlay] = useState<CalendarOverlay>(null)
  const [mobile, setMobile] = useState(
    () => window.matchMedia('(max-width: 639px)').matches,
  )
  const swipeStartRef = useRef<{ x: number, y: number, tracking: boolean } | null>(
    null,
  )
  const swipeAtRef = useRef(0)
  const surfaceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const update = () => setMobile(media.matches)

    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!mobile || view !== 'week')
      return
    const frame = requestAnimationFrame(() => {
      const viewport = surfaceRef.current?.parentElement
      const day = surfaceRef.current?.querySelector<HTMLElement>(
        `.mc-day-header[data-date="${activeDate}"]`,
      )

      if (!viewport || !day)
        return
      const left
        = day.getBoundingClientRect().left
          - viewport.getBoundingClientRect().left
          + viewport.scrollLeft

      viewport.scrollLeft = Math.max(0, left - 62)
      viewport.style.setProperty('--week-scroll', `${viewport.scrollLeft}px`)
    })

    return () => cancelAnimationFrame(frame)
  }, [activeDate, mobile, view])

  const events = useMemo(
    () =>
      schedule.map(item => ({
        id: item.id,
        title: item.title,
        start:
          item.kind === 'tour' ? `${item.date}T${item.time}:00` : item.date,
        end: item.kind === 'tour' ? `${item.date}T${item.end}:00` : undefined,
        allDay: item.kind === 'pickup',
        extendedProps: { kindOrder: item.kind === 'tour' ? 0 : 1 },
      })),
    [],
  )

  function updatePeriod(info: DatesSetInfo) {
    const date = info.view.calendar.getDate()

    setActiveDate(swissDate(date))
    setMonthTitle(
      new Intl.DateTimeFormat(locale, {
        month: 'long',
        timeZone: 'Europe/Zurich',
      }).format(date),
    )
    setYearTitle(
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        timeZone: 'Europe/Zurich',
      }).format(date),
    )
  }
  function changeView(next: CalendarView, date = activeDate) {
    setView(next)
    calendarRef.current?.getApi().changeView(views[next], date)
  }
  function navigate(delta: number) {
    const api = calendarRef.current?.getApi()

    if (delta < 0)
      api?.prev()
    else api?.next()
  }
  function settleSwipe() {
    const element = surfaceRef.current

    if (!element)
      return
    const start
      = Number(
        element.style.getPropertyValue('--calendar-drag').replace('px', ''),
      ) || 0
    let position = start
    let velocity = 0
    const tick = () => {
      if (swipeStartRef.current?.tracking)
        return
      velocity = (velocity - position * 0.18) * 0.68
      position += velocity
      element.style.setProperty('--calendar-drag', `${position}px`)
      if (Math.abs(position) > 0.2 || Math.abs(velocity) > 0.2)
        requestAnimationFrame(tick)
      else element.style.setProperty('--calendar-drag', '0px')
    }

    requestAnimationFrame(tick)
  }
  const weekdayLabel = (date: Date, short = false) =>
    new Intl.DateTimeFormat(locale, {
      weekday: short ? 'narrow' : 'short',
      timeZone: 'Europe/Zurich',
    }).format(date)

  return (
    <main
      aria-label={de ? 'Kalender' : 'Calendar'}
      className={`merchant-calendar mc-view-${view}`}
    >
      <header className="mc-toolbar">
        <button
          aria-haspopup="dialog"
          aria-label={de ? 'Datum wählen' : 'Choose a date'}
          className="mc-date-trigger"
          type="button"
          onClick={() => setOverlay({ kind: 'date' })}
        >
          <h1>
            {monthTitle}
            <span>{yearTitle}</span>
          </h1>
          <ChevronRightIcon aria-hidden="true" className="mc-chevron-down" />
        </button>
        <div className="mc-period-controls">
          <button
            className="mc-today"
            title={de ? 'Demo: 15. Oktober 2026' : 'Demo: 15 October 2026'}
            type="button"
            onClick={() => calendarRef.current?.getApi().gotoDate(sampleToday)}
          >
            {de ? 'Heute' : 'Today'}
          </button>
          <button
            aria-label={de ? 'Vorheriger Zeitraum' : 'Previous period'}
            className="mc-icon-button"
            type="button"
            onClick={() => navigate(-1)}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <button
            aria-label={de ? 'Nächster Zeitraum' : 'Next period'}
            className="mc-icon-button"
            type="button"
            onClick={() => navigate(1)}
          >
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      </header>
      <nav
        aria-label={de ? 'Kalenderansicht' : 'Calendar view'}
        className="mc-view-nav"
      >
        <div className="mc-view-switch">
          {(['day', 'week', 'month'] as const).map(mode => (
            <button
              key={mode}
              aria-pressed={mode === view}
              type="button"
              onClick={() => changeView(mode)}
            >
              {de
                ? { day: 'Tag', week: 'Woche', month: 'Monat' }[mode]
                : { day: 'Day', week: 'Week', month: 'Month' }[mode]}
            </button>
          ))}
        </div>
      </nav>
      <div
        className="mc-calendar-viewport"
        onScroll={(event) => {
          event.currentTarget.style.setProperty(
            '--week-scroll',
            `${event.currentTarget.scrollLeft}px`,
          )
        }}
      >
        <div
          ref={surfaceRef}
          className="mc-calendar-surface"
          onClickCapture={(e) => {
            if (performance.now() - swipeAtRef.current < 350) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          onPointerCancel={() => {
            swipeStartRef.current = null
            settleSwipe()
          }}
          onPointerDown={(e) => {
            if (
              view === 'week'
              || e.pointerType !== 'touch'
              || (e.target instanceof Element
                && e.target.closest('button,a,[role=link]'))
            ) {
              return
            }
            swipeStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              tracking: false,
            }
          }}
          onPointerMove={(e) => {
            const start = swipeStartRef.current

            if (!start)
              return
            const dx = e.clientX - start.x
            const dy = e.clientY - start.y

            if (
              !start.tracking
              && Math.abs(dy) > 12
              && Math.abs(dy) > Math.abs(dx)
            ) {
              swipeStartRef.current = null

              return
            }
            if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
              start.tracking = true
              e.currentTarget.setPointerCapture(e.pointerId)
              e.currentTarget.style.setProperty(
                '--calendar-drag',
                `${Math.max(-160, Math.min(160, dx * 0.65))}px`,
              )
            }
          }}
          onPointerUp={(e) => {
            const start = swipeStartRef.current

            swipeStartRef.current = null
            if (start?.tracking) {
              swipeAtRef.current = performance.now()
              if (Math.abs(e.clientX - start.x) > 65)
                navigate(e.clientX < start.x ? 1 : -1)
              settleSwipe()
            }
          }}
        >
          <FullCalendar
            ref={calendarRef}
            allDaySlot
            eventInteractive
            fixedWeekCount
            navLinks
            allDayText={de ? 'Abholung' : 'Pickup'}
            blockEventBeforeClass="mc-no-marker"
            dateClick={(info) => {
              if (performance.now() - swipeAtRef.current > 350 && view === 'month')
                changeView('day', info.dateStr.slice(0, 10))
            }}
            datesSet={updatePeriod}
            dayCellBottomClass="mc-day-bottom"
            dayCellClass={info =>
              `mc-day-cell ${info.isOther ? 'mc-other-month' : ''}`}
            dayCellInnerClass="mc-day-events"
            dayCellTopClass="mc-day-top"
            dayCellTopContent={info => (
              <span
                className={`mc-date-number ${swissDate(info.date) === sampleToday ? 'mc-is-today' : ''}`}
              >
                {info.dayNumberText}
              </span>
            )}
            dayCellTopInnerClass="mc-day-top-inner"
            dayHeaderClass="mc-day-header"
            dayHeaderContent={info =>
              view === 'month'
                ? (
                    <span>{weekdayLabel(info.date, mobile)}</span>
                  )
                : (
                    <span
                      className={`mc-column-date ${swissDate(info.date) === sampleToday ? 'mc-is-today' : ''}`}
                    >
                      <span>{weekdayLabel(info.date)}</span>
                      <strong>
                        {new Intl.DateTimeFormat(locale, {
                          day: 'numeric',
                          timeZone: 'Europe/Zurich',
                        }).format(info.date)}
                      </strong>
                    </span>
                  )}
            dayHeaderInnerClass="mc-day-header-inner"
            dayLaneClass="mc-day-lane"
            dayMaxEvents={view === 'month' ? (mobile ? 2 : 4) : false}
            dayMinWidth={0}
            editable={false}
            eventBeforeClass="mc-no-marker"
            eventClass="mc-event-shell"
            eventClick={(info) => {
              const item = schedule.find(entry => entry.id === info.event.id)

              if (item)
                setOverlay({ kind: 'event', item })
            }}
            eventContent={(info) => {
              const item = schedule.find(entry => entry.id === info.event.id)

              if (!item)
                return null

              return (
                <div
                  className={`mc-event mc-event-${item.kind} ${item.kind === 'pickup' ? 'mc-all-day-event' : ''}`}
                  title={`${item.title} · ${item.customer}`}
                >
                  <span className="mc-event-time">
                    {item.kind === 'tour'
                      ? item.time
                      : de
                        ? 'Abholung'
                        : 'Pickup'}
                  </span>
                  <strong>
                    {mobile && view === 'month'
                      ? item.kind === 'pickup'
                        ? `${item.quantity} ${de ? 'Messer' : item.quantity === 1 ? 'knife' : 'knives'}`
                        : item.title.startsWith('Luzerne')
                          ? de
                            ? 'Altstadt'
                            : 'Old town'
                          : de
                            ? 'See & Stadt'
                            : 'Lake & city'
                      : item.title}
                  </strong>
                  {view !== 'month' && item.kind === 'tour' && (
                    <span className="mc-event-person">{item.customer}</span>
                  )}
                </div>
              )
            }}
            eventInnerClass="mc-event-inner"
            eventMinHeight={54}
            eventOrder="kindOrder,start"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            events={events}
            firstDay={1}
            headerToolbar={false}
            height="100%"
            initialDate={sampleToday}
            initialView="dayGridMonth"
            locale={de ? deLocale : 'en-gb'}
            moreLinkClass="mc-more"
            moreLinkClick={(info) => {
              changeView('day', swissDate(info.date))

              return 'none'
            }}
            moreLinkContent={info => (
              <span>{de ? `+${info.num} mehr` : `+${info.num} more`}</span>
            )}
            navLinkDayClick={date => changeView('day', swissDate(date))}
            now={`${sampleToday}T10:15:00`}
            nowIndicator={view !== 'month'}
            plugins={calendarPlugins}
            rowEventBeforeClass="mc-no-marker"
            rowEventBeforeContent={() => null}
            scrollTime="08:00:00"
            selectable={false}
            slotDuration="00:30:00"
            slotHeaderClass="mc-time-label"
            slotHeaderFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotLaneClass="mc-time-line"
            slotMaxTime="24:00:00"
            slotMinHeight={30}
            slotMinTime="00:00:00"
            tableClass="mc-table"
            timeZone="Europe/Zurich"
            viewClass="mc-view"
          />
        </div>
      </div>
      <CalendarOverlays
        activeDate={activeDate}
        overlay={overlay}
        onClose={() => setOverlay(null)}
        onPickDate={(date) => {
          calendarRef.current?.getApi().gotoDate(date)
          setOverlay(null)
        }}
      />
    </main>
  )
}
