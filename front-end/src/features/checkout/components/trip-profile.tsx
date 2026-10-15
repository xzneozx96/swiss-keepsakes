import type { TripStatus } from "../lib/trip";
import type { TripAnswers } from "../types";
import type { IconComponent } from "@/components/icons";
import type { CalendarDate } from "@internationalized/date";

import {
  Button,
  Calendar,
  Drawer,
  Label,
  Radio,
  RadioGroup,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useRef, useState } from "react";

import { hasTripAnswers } from "../lib/trip";

import {
  PickupDateIcon,
  StatusSuccessIcon,
  TravelGroupIcon,
  TravelSoloIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { useDemoNow } from "@/features/demo";
import { formatShortDate } from "@/lib/format";
import { useSheetExit } from "@/components/sheet-exit";

export interface TripProfileProps {
  /** Gift intro says the answers don't change the pickup date; tour intro, the tour date. */
  kind: "gift" | "tour";
  status: TripStatus;
  answers: TripAnswers;
  onSave: (answers: TripAnswers) => void;
  onSkip: () => void;
}

type DateField = "arriveOn" | "leaveOn";

const styleIcon: Record<
  NonNullable<TripAnswers["travelStyle"]>,
  IconComponent
> = {
  group: TravelGroupIcon,
  independent: TravelSoloIcon,
};

/**
 * Optional trip questions on C07 and C13 (spec §4.9, R09): travel style, arrival and departure,
 * each optional, for this request or booking (2.17). The same white card as C07's orders, split
 * by lines: the question, the answers, the actions. States: open (the questions), answered (a
 * summary with Edit), skipped (one line with Answer now). It never changes a pickup or tour date.
 */
export function TripProfile({
  kind,
  status,
  answers,
  onSave,
  onSkip,
}: TripProfileProps) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Skip and Save unmount the focused button; keep keyboard focus on the card.
  const keepFocus = () => headingRef.current?.focus();
  const showForm = status === "open" || editing;

  return (
    <section
      aria-labelledby="trip-title"
      className="flex flex-col divide-y divide-separator rounded-3xl bg-surface shadow-surface"
    >
      <div className="flex items-start gap-3 p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            ref={headingRef}
            className="font-serif text-card-title outline-none"
            id="trip-title"
            tabIndex={-1}
          >
            {t("tripProfile.title")}
          </h2>
          {showForm && (
            <p className="text-sm text-muted">
              {t(
                kind === "tour" ? "tripProfile.introTour" : "tripProfile.intro",
              )}
            </p>
          )}
        </div>
        {!showForm && status === "answered" && (
          <Button
            className="shrink-0"
            size="sm"
            variant="tertiary"
            onPress={() => setEditing(true)}
          >
            {t("tripProfile.edit")}
          </Button>
        )}
      </div>

      {showForm ? (
        <TripForm
          initial={answers}
          isEditing={editing}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            onSave(next);
            setEditing(false);
            keepFocus();
          }}
          onSkip={() => {
            onSkip();
            keepFocus();
          }}
        />
      ) : status === "answered" ? (
        <Summary answers={answers} />
      ) : (
        <div className="flex items-center gap-4 p-5">
          <p className="min-w-0 flex-1 text-sm text-muted" role="status">
            {t("tripProfile.skipped")}
          </p>
          <Button
            className="shrink-0"
            size="sm"
            variant="secondary"
            onPress={() => setEditing(true)}
          >
            {t("tripProfile.answerNow")}
          </Button>
        </div>
      )}
    </section>
  );
}

function useShortDate() {
  const { intlLocale } = useLocale();
  const today = zurichDate(useDemoNow());

  return (iso: string) => formatShortDate(iso, today, intlLocale);
}

/** The three answers as icon, label and value rows, "Not answered" for a blank one (C07, C15, C16). */
export function useTripRows(answers: TripAnswers) {
  const { t } = useLocale();
  const short = useShortDate();
  const none = t("tripProfile.summary.none");

  return [
    {
      icon: answers.travelStyle
        ? styleIcon[answers.travelStyle]
        : TravelSoloIcon,
      label: t("tripProfile.style.label"),
      value: answers.travelStyle
        ? t(`tripProfile.style.${answers.travelStyle}`)
        : none,
      isSet: !!answers.travelStyle,
    },
    {
      icon: PickupDateIcon,
      label: t("tripProfile.arrive.label"),
      value: answers.arriveOn ? short(answers.arriveOn) : none,
      isSet: !!answers.arriveOn,
    },
    {
      icon: PickupDateIcon,
      label: t("tripProfile.leave.label"),
      value: answers.leaveOn ? short(answers.leaveOn) : none,
      isSet: !!answers.leaveOn,
    },
  ];
}

function Summary({ answers }: { answers: TripAnswers }) {
  const { t } = useLocale();
  const rows = useTripRows(answers);

  return (
    <div className="flex flex-col gap-3 p-5">
      <p
        className="flex items-start gap-2 text-sm text-success-soft-foreground"
        role="status"
      >
        <StatusSuccessIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
        {t("tripProfile.thanks")}
      </p>
      <dl className="flex flex-col divide-y divide-separator">
        {rows.map(({ icon: Icon, label, value, isSet }) => (
          <div key={label} className="flex items-center gap-3 py-3">
            <Icon aria-hidden className="shrink-0 text-muted" size={18} />
            <dt className="min-w-0 flex-1 text-sm text-muted">{label}</dt>
            <dd
              className={`text-end text-sm ${isSet ? "font-medium" : "text-muted"}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TripForm({
  initial,
  isEditing,
  onSave,
  onSkip,
  onCancel,
}: {
  initial: TripAnswers;
  isEditing: boolean;
  onSave: (answers: TripAnswers) => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [answers, setAnswers] = useState<TripAnswers>(initial);

  return (
    <>
      <div className="flex flex-col gap-6 p-5">
        <TripFields answers={answers} onChange={setAnswers} />
      </div>

      <div className="flex gap-3 p-5">
        <Button variant="ghost" onPress={isEditing ? onCancel : onSkip}>
          {isEditing ? t("tripProfile.cancel") : t("tripProfile.skip")}
        </Button>
        <Button
          className="flex-1"
          isDisabled={!hasTripAnswers(answers)}
          variant="tertiary"
          onPress={() => onSave(answers)}
        >
          {t("tripProfile.save")}
        </Button>
      </div>
    </>
  );
}

/**
 * The three questions as controlled fields, with the date sheet they open. Shared by the C07/C13
 * card and the C15/C16 trip sheet (2.17).
 */
export function TripFields({
  answers,
  onChange,
}: {
  answers: TripAnswers;
  onChange: (answers: TripAnswers) => void;
}) {
  const { t } = useLocale();
  const short = useShortDate();
  const [sheet, setSheet] = useState<DateField>();

  // Arrival and departure as the two halves of one field (the booking-app date pair).
  const dateHalf = (field: DateField) => {
    const value = answers[field];
    const prefix = field === "arriveOn" ? "arrive" : "leave";
    const shown = value ? short(value) : t("tripProfile.date.add");

    return (
      <button
        aria-label={`${t(`tripProfile.${prefix}.label`)}, ${shown}`}
        className={`flex min-w-0 flex-col gap-0.5 px-4 py-3 text-start outline-none transition-colors hover:bg-surface-secondary focus-visible:focus-ring ${
          field === "arriveOn" ? "rounded-s-2xl" : "rounded-e-2xl"
        }`}
        type="button"
        onClick={() => setSheet(field)}
      >
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <PickupDateIcon aria-hidden className="shrink-0" size={14} />
          {t(`tripProfile.${prefix}.short`)}
        </span>
        <span className={value ? "font-medium" : "text-muted"}>{shown}</span>
      </button>
    );
  };

  return (
    <>
      <RadioGroup
        className="grid grid-cols-2 gap-3"
        orientation="horizontal"
        value={answers.travelStyle ?? null}
        onChange={(v) =>
          onChange({
            ...answers,
            travelStyle: v as TripAnswers["travelStyle"],
          })
        }
      >
        <Label className="col-span-2 text-sm font-medium">
          {t("tripProfile.style.question")}
        </Label>
        {(["group", "independent"] as const).map((style) => {
          const Icon = styleIcon[style];

          return (
            <Radio
              key={style}
              className="m-0 flex flex-col items-start justify-start gap-4 rounded-2xl border border-field-border p-4 transition-colors hover:bg-surface-secondary data-[selected=true]:border-foreground data-[selected=true]:bg-surface-secondary"
              value={style}
            >
              <Icon aria-hidden size={24} />
              <Radio.Content className="items-start">
                <Radio.Control className="mt-0.5">
                  <Radio.Indicator />
                </Radio.Control>
                <span className="text-sm font-medium leading-snug">
                  {t(`tripProfile.style.${style}`)}
                </span>
              </Radio.Content>
            </Radio>
          );
        })}
      </RadioGroup>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">
          {t("tripProfile.dates.question")}
        </span>
        <div className="grid grid-cols-2 divide-x divide-field-border rounded-2xl border border-field-border">
          {dateHalf("arriveOn")}
          {dateHalf("leaveOn")}
        </div>
      </div>

      {sheet && (
        <DateSheet
          max={sheet === "arriveOn" ? answers.leaveOn : undefined}
          min={sheet === "leaveOn" ? answers.arriveOn : undefined}
          title={t(
            sheet === "arriveOn"
              ? "tripProfile.arrive.label"
              : "tripProfile.leave.label",
          )}
          value={answers[sheet]}
          onClose={() => setSheet(undefined)}
          onDone={(iso) => {
            onChange({ ...answers, [sheet]: iso });
            setSheet(undefined);
          }}
        />
      )}
    </>
  );
}

/**
 * One date in a bottom sheet (Airbnb date sheet, decision 66). Past days allowed unless `min`
 * says otherwise: guests are often already here. Also used by C22 (4.6).
 */
export function DateSheet({
  title,
  value,
  min,
  max,
  onDone,
  onClose,
}: {
  title: string;
  value?: string;
  /** Departure cannot be before arrival, and the other way round. */
  min?: string;
  max?: string;
  onDone: (iso: string | undefined) => void;
  onClose: () => void;
}) {
  const exitRef = useSheetExit();
  const { t } = useLocale();
  const today = parseDate(zurichDate(useDemoNow()));
  const [date, setDate] = useState<CalendarDate | null>(
    value ? parseDate(value) : null,
  );

  return (
    <Drawer.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog className="flex max-h-[92dvh] flex-col">
          <span ref={exitRef} hidden />
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-between">
            <Drawer.Heading className="text-title">{title}</Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t("tripProfile.date.close")} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-3 overflow-y-auto">
            <Calendar
              aria-label={title}
              className="calendar--fluid"
              defaultFocusedValue={date ?? (min ? parseDate(min) : today)}
              maxValue={max ? parseDate(max) : undefined}
              minValue={min ? parseDate(min) : undefined}
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
                  {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                </Calendar.GridHeader>
                <Calendar.GridBody>
                  {(d) => (
                    <Calendar.Cell
                      className={
                        d.compare(today) === 0
                          ? "calendar__cell--demo-today"
                          : ""
                      }
                      date={d}
                    />
                  )}
                </Calendar.GridBody>
              </Calendar.Grid>
            </Calendar>
          </Drawer.Body>
          <Drawer.Footer className="flex flex-col gap-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <Button
              fullWidth
              className="h-14 text-base"
              isDisabled={!date}
              onPress={() => onDone(date?.toString())}
            >
              {t("tripProfile.date.done")}
            </Button>
            <Button
              fullWidth
              variant="tertiary"
              onPress={value ? () => onDone(undefined) : onClose}
            >
              {value ? t("tripProfile.date.clear") : t("tripProfile.cancel")}
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
