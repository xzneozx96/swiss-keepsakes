import FullCalendar, { type CalendarRef } from "@fullcalendar/react";
import deLocale from "@fullcalendar/react/locales/de";
import { Drawer } from "@heroui/react";
import { useRef, useState } from "react";

import {
  calendarPlugins,
  sampleToday,
  swissDate,
  type CalendarOverlay,
} from "./calendar-core";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  PickupIcon,
  AccountIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

export function CalendarOverlays({
  overlay,
  activeDate,
  onClose,
  onPickDate,
}: {
  overlay: CalendarOverlay;
  activeDate: string;
  onClose: () => void;
  onPickDate: (date: string) => void;
}) {
  const { language } = useLocale();
  const de = language === "de";
  const locale = de ? "de-CH" : "en-GB";
  const picker = useRef<CalendarRef>(null);
  const [pickerTitle, setPickerTitle] = useState("");
  const item = overlay?.kind === "event" ? overlay.item : null;
  const fullDate = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(`${date}T12:00:00`));

  return (
    <Drawer.Backdrop
      isOpen={overlay !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Content className="mc-sheet-content" placement="bottom">
        <Drawer.Dialog className="mc-sheet">
          <Drawer.Handle />
          <Drawer.Header className="mc-sheet-header">
            <Drawer.Heading>
              {item ? item.title : de ? "Datum wählen" : "Choose a date"}
            </Drawer.Heading>
            <Drawer.CloseTrigger aria-label={de ? "Schließen" : "Close"} />
          </Drawer.Header>
          <Drawer.Body className="mc-sheet-body">
            {overlay?.kind === "date" && (
              <>
                <div className="mc-picker-toolbar">
                  <h2>{pickerTitle}</h2>
                  <button
                    aria-label={de ? "Vorheriger Monat" : "Previous month"}
                    className="mc-icon-button"
                    type="button"
                    onClick={() => picker.current?.getApi().prev()}
                  >
                    <ChevronLeftIcon aria-hidden="true" />
                  </button>
                  <button
                    aria-label={de ? "Nächster Monat" : "Next month"}
                    className="mc-icon-button"
                    type="button"
                    onClick={() => picker.current?.getApi().next()}
                  >
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                </div>
                <div className="mc-picker">
                  <FullCalendar
                    ref={picker}
                    fixedWeekCount
                    navLinks
                    datesSet={(info) => setPickerTitle(info.view.title)}
                    dayCellClass="mc-picker-cell"
                    dayCellTopClass="mc-picker-top"
                    dayCellTopContent={(info) => (
                      <span
                        className={`mc-picker-day ${swissDate(info.date) === activeDate ? "mc-picked" : ""} ${info.isOther ? "mc-outside" : ""}`}
                      >
                        {info.dayNumberText}
                      </span>
                    )}
                    dayCellTopInnerClass="mc-picker-top-inner"
                    dayHeaderClass="mc-picker-weekday"
                    dayHeaderFormat={{ weekday: "narrow" }}
                    dayRowClass="mc-picker-row"
                    events={[]}
                    firstDay={1}
                    headerToolbar={false}
                    height="auto"
                    initialDate={activeDate}
                    initialView="dayGridMonth"
                    locale={de ? deLocale : "en-gb"}
                    navLinkDayClick={(date) => onPickDate(swissDate(date))}
                    now={sampleToday}
                    plugins={calendarPlugins}
                    tableClass="mc-picker-table"
                    timeZone="Europe/Zurich"
                  />
                </div>
                <p className="mc-preview-note">
                  {de
                    ? "Vorschau · Beispieldaten vom Oktober 2026"
                    : "Preview · Sample schedule for October 2026"}
                </p>
              </>
            )}
            {item && (
              <div className={`mc-event-detail mc-detail-${item.kind}`}>
                <div className="mc-detail-row">
                  <ClockIcon aria-hidden="true" />
                  <div>
                    <p>{fullDate(item.date)}</p>
                    <span>
                      {item.kind === "tour"
                        ? `${item.time}–${item.end} · Europe/Zurich`
                        : item.status === "Awaiting confirmation"
                          ? de
                            ? "Gewünschtes Abholdatum"
                            : "Requested pickup date"
                          : de
                            ? "Abholdatum · ohne feste Uhrzeit"
                            : "Pickup date · no fixed time"}
                    </span>
                  </div>
                </div>
                <div className="mc-detail-row">
                  <AccountIcon aria-hidden="true" />
                  <div>
                    <p>{item.customer}</p>
                    <span>
                      {item.kind === "tour"
                        ? `${item.guests} ${de ? "Gäste" : "guests"}`
                        : `${item.quantity} ${de ? "Geschenke" : "gifts"}`}
                    </span>
                  </div>
                </div>
                <div className="mc-detail-row">
                  <PickupIcon aria-hidden="true" />
                  <p>{item.location}</p>
                </div>
                <dl className="mc-detail-status">
                  <div>
                    <dt>{de ? "Status" : "Status"}</dt>
                    <dd>{item.status}</dd>
                  </div>
                  <div>
                    <dt>{de ? "Zahlung" : "Payment"}</dt>
                    <dd>{item.payment}</dd>
                  </div>
                </dl>
                <p className="mc-detail-note">{item.note}</p>
                <p className="mc-preview-note">
                  {item.id} ·{" "}
                  {de
                    ? "Beispieldaten · Nur Vorschau"
                    : "Sample data · Preview only"}
                </p>
              </div>
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
