import type { CalendarItem, CalendarOverlay } from "./calendar-core";

import FullCalendar, {
  type CalendarRef,
  type DatesSetInfo,
} from "@fullcalendar/react";
import deLocale from "@fullcalendar/react/locales/de";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { CalendarOverlays } from "./calendar-overlays";
import { MOBILE_QUERY, calendarPlugins, swissDate } from "./calendar-core";
import { useCalendarItems } from "./use-calendar-items";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/monarch/theme.css";
import "./calendar.css";

const views = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
} as const;

type CalendarView = keyof typeof views;

/** M-Calendar: every tour departure and keepsake pickup, by day, week or month. */
export function CalendarPage() {
  const { items, today, now } = useCalendarItems();

  return <CalendarScreen items={items} now={now} today={today} />;
}

const CalendarScreen = memo(function CalendarScreen({
  items,
  today,
  now,
}: {
  items: CalendarItem[];
  today: string;
  now: string;
}) {
  const { t, language, intlLocale } = useLocale();
  const de = language === "de";
  const calendar = useRef<CalendarRef>(null);
  const [view, setView] = useState<CalendarView>("month");
  const [activeDate, setActiveDate] = useState(today);
  const [monthTitle, setMonthTitle] = useState("");
  const [yearTitle, setYearTitle] = useState("");
  const [overlay, setOverlay] = useState<CalendarOverlay>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches,
  );
  const swipeStart = useRef<{ x: number; y: number; tracking: boolean } | null>(
    null,
  );
  const swipeAt = useRef(0);
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(media.matches);

    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobile || view !== "week") return;
    const frame = requestAnimationFrame(() => {
      const viewport = surface.current?.parentElement;
      const day = surface.current?.querySelector<HTMLElement>(
        `.mc-day-header[data-date="${activeDate}"]`,
      );

      if (!viewport || !day) return;
      const left =
        day.getBoundingClientRect().left -
        viewport.getBoundingClientRect().left +
        viewport.scrollLeft;

      viewport.scrollLeft = Math.max(0, left - 62);
      viewport.style.setProperty("--week-scroll", `${viewport.scrollLeft}px`);
    });

    return () => cancelAnimationFrame(frame);
  }, [activeDate, mobile, view]);

  const byId = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const events = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        start: item.kind === "tour" ? item.start : item.date,
        end: item.kind === "tour" ? item.stop : undefined,
        allDay: item.kind === "pickup",
        extendedProps: { kindOrder: item.kind === "tour" ? 0 : 1 },
      })),
    [items],
  );
  const person = (item: CalendarItem) =>
    item.kind === "tour" && item.lead
      ? item.more
        ? t("calendar.plusMore", { name: item.lead, count: item.more })
        : item.lead
      : "";

  function updatePeriod(info: DatesSetInfo) {
    const date = info.view.calendar.getDate();

    setActiveDate(swissDate(date));
    setMonthTitle(
      new Intl.DateTimeFormat(intlLocale, {
        month: "long",
        timeZone: "Europe/Zurich",
      }).format(date),
    );
    setYearTitle(
      new Intl.DateTimeFormat(intlLocale, {
        year: "numeric",
        timeZone: "Europe/Zurich",
      }).format(date),
    );
  }
  function changeView(next: CalendarView, date = activeDate) {
    setView(next);
    calendar.current?.getApi().changeView(views[next], date);
  }
  function navigate(delta: number) {
    const api = calendar.current?.getApi();

    if (delta < 0) api?.prev();
    else api?.next();
  }
  function settleSwipe() {
    const element = surface.current;

    if (!element) return;
    const start =
      Number(
        element.style.getPropertyValue("--calendar-drag").replace("px", ""),
      ) || 0;
    let position = start;
    let velocity = 0;
    const tick = () => {
      if (swipeStart.current?.tracking) return;
      velocity = (velocity - position * 0.18) * 0.68;
      position += velocity;
      element.style.setProperty("--calendar-drag", `${position}px`);
      if (Math.abs(position) > 0.2 || Math.abs(velocity) > 0.2)
        requestAnimationFrame(tick);
      else element.style.setProperty("--calendar-drag", "0px");
    };

    requestAnimationFrame(tick);
  }
  const weekdayLabel = (date: Date, short = false) =>
    new Intl.DateTimeFormat(intlLocale, {
      weekday: short ? "narrow" : "short",
      timeZone: "Europe/Zurich",
    }).format(date);

  return (
    <section
      aria-label={t("calendar.title")}
      className={`merchant-calendar mc-view-${view}`}
    >
      <h1 className="sr-only">{t("calendar.title")}</h1>
      <button
        aria-haspopup="dialog"
        aria-label={t("calendar.pickDate")}
        className="mc-date-trigger"
        type="button"
        onClick={() => setOverlay({ kind: "date" })}
      >
        <span className="mc-date-title">
          {monthTitle}
          <span>{yearTitle}</span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="mc-chevron-down" />
      </button>
      <div className="mc-period-controls">
        <button
          aria-label={t("calendar.prevPeriod")}
          className="mc-icon-button"
          type="button"
          onClick={() => navigate(-1)}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </button>
        <button
          className="mc-today"
          type="button"
          onClick={() => calendar.current?.getApi().gotoDate(today)}
        >
          {t("calendar.today")}
        </button>
        <button
          aria-label={t("calendar.nextPeriod")}
          className="mc-icon-button"
          type="button"
          onClick={() => navigate(1)}
        >
          <ChevronRightIcon aria-hidden="true" />
        </button>
      </div>
      <nav aria-label={t("calendar.viewLabel")} className="mc-view-nav">
        <div className="mc-view-switch">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              aria-pressed={mode === view}
              type="button"
              onClick={() => changeView(mode)}
            >
              {t(`calendar.view.${mode}`)}
            </button>
          ))}
        </div>
      </nav>
      <div
        className="mc-calendar-viewport"
        onScroll={(event) => {
          event.currentTarget.style.setProperty(
            "--week-scroll",
            `${event.currentTarget.scrollLeft}px`,
          );
        }}
      >
        <div
          ref={surface}
          className="mc-calendar-surface"
          onClickCapture={(e) => {
            if (performance.now() - swipeAt.current < 350) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onPointerCancel={() => {
            swipeStart.current = null;
            settleSwipe();
          }}
          onPointerDown={(e) => {
            if (
              view === "week" ||
              e.pointerType !== "touch" ||
              (e.target instanceof Element &&
                e.target.closest("button,a,[role=link]"))
            )
              return;
            swipeStart.current = {
              x: e.clientX,
              y: e.clientY,
              tracking: false,
            };
          }}
          onPointerMove={(e) => {
            const start = swipeStart.current;

            if (!start) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;

            if (
              !start.tracking &&
              Math.abs(dy) > 12 &&
              Math.abs(dy) > Math.abs(dx)
            ) {
              swipeStart.current = null;

              return;
            }
            if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
              start.tracking = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              e.currentTarget.style.setProperty(
                "--calendar-drag",
                `${Math.max(-160, Math.min(160, dx * 0.65))}px`,
              );
            }
          }}
          onPointerUp={(e) => {
            const start = swipeStart.current;

            swipeStart.current = null;
            if (start?.tracking) {
              swipeAt.current = performance.now();
              if (Math.abs(e.clientX - start.x) > 65)
                navigate(e.clientX < start.x ? 1 : -1);
              settleSwipe();
            }
          }}
        >
          <FullCalendar
            ref={calendar}
            allDaySlot
            eventInteractive
            fixedWeekCount
            navLinks
            allDayText={t("calendar.pickup")}
            blockEventBeforeClass="mc-no-marker"
            dateClick={(info) => {
              if (performance.now() - swipeAt.current > 350 && view === "month")
                changeView("day", info.dateStr.slice(0, 10));
            }}
            datesSet={updatePeriod}
            dayCellBottomClass="mc-day-bottom"
            dayCellClass={(info) =>
              `mc-day-cell ${info.isOther ? "mc-other-month" : ""}`
            }
            dayCellInnerClass="mc-day-events"
            dayCellTopClass="mc-day-top"
            dayCellTopContent={(info) => (
              <span
                className={`mc-date-number ${swissDate(info.date) === today ? "mc-is-today" : ""}`}
              >
                {info.dayNumberText}
              </span>
            )}
            dayCellTopInnerClass="mc-day-top-inner"
            dayHeaderClass="mc-day-header"
            dayHeaderContent={(info) =>
              view === "month" ? (
                <span>{weekdayLabel(info.date, mobile)}</span>
              ) : (
                <span
                  className={`mc-column-date ${swissDate(info.date) === today ? "mc-is-today" : ""}`}
                >
                  <span>{weekdayLabel(info.date)}</span>
                  <strong>
                    {new Intl.DateTimeFormat(intlLocale, {
                      day: "numeric",
                      timeZone: "Europe/Zurich",
                    }).format(info.date)}
                  </strong>
                </span>
              )
            }
            dayHeaderInnerClass="mc-day-header-inner"
            dayLaneClass="mc-day-lane"
            dayMaxEvents={view === "month" ? (mobile ? 2 : 4) : false}
            dayMinWidth={0}
            editable={false}
            eventBeforeClass="mc-no-marker"
            eventClass="mc-event-shell"
            eventClick={(info) => {
              const item = byId.get(info.event.id);

              if (item) setOverlay({ kind: "event", item });
            }}
            eventContent={(info) => {
              const item = byId.get(info.event.id);

              if (!item) return null;

              return (
                <div
                  className={`mc-event mc-event-${item.kind} ${item.kind === "pickup" ? "mc-all-day-event" : ""}`}
                  title={[
                    item.title,
                    person(item) ||
                      (item.kind === "pickup" ? item.customer : ""),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                >
                  <span className="mc-event-time">
                    {item.kind === "tour" ? item.time : t("calendar.pickup")}
                  </span>
                  <strong>{item.title}</strong>
                  {view !== "month" && person(item) && (
                    <span className="mc-event-person">{person(item)}</span>
                  )}
                </div>
              );
            }}
            eventInnerClass="mc-event-inner"
            eventMinHeight={54}
            eventOrder="kindOrder,start"
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            events={events}
            firstDay={1}
            headerToolbar={false}
            height="100%"
            initialDate={today}
            initialView="dayGridMonth"
            locale={de ? deLocale : "en-gb"}
            moreLinkClass="mc-more"
            moreLinkClick={(info) => {
              changeView("day", swissDate(info.date));

              return "none";
            }}
            moreLinkContent={(info) => (
              <span>{t("calendar.more", { count: info.num })}</span>
            )}
            navLinkDayClick={(date) => changeView("day", swissDate(date))}
            now={now}
            nowIndicator={view !== "month"}
            plugins={calendarPlugins}
            rowEventBeforeClass="mc-no-marker"
            rowEventBeforeContent={() => null}
            scrollTime="08:00:00"
            selectable={false}
            slotDuration="00:30:00"
            slotHeaderClass="mc-time-label"
            slotHeaderFormat={{
              hour: "2-digit",
              minute: "2-digit",
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
        today={today}
        onClose={() => setOverlay(null)}
        onPickDate={(date) => {
          calendar.current?.getApi().gotoDate(date);
          setOverlay(null);
        }}
      />
    </section>
  );
});
