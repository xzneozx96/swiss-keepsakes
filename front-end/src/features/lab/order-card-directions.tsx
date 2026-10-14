import type { LabOrderRow, OrderCardOptionProps } from "./order-card-options";

import { ChevronRightIcon, PickupIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";

const toneText = {
  neutral: "text-muted",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const paymentText = {
  neutral: "text-muted",
  info: "text-muted",
  success: "text-muted",
  warning: "text-warning",
  danger: "text-danger",
};

function Progress({ row }: { row: LabOrderRow }) {
  return (
    <span
      className={`flex items-start gap-2 text-sm font-medium ${toneText[row.progress.tone]}`}
    >
      <span
        aria-hidden
        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current"
      />
      {row.progress.text}
    </span>
  );
}

function Payment({ row }: { row: LabOrderRow }) {
  return (
    <p className={`text-sm leading-relaxed ${paymentText[row.payment.tone]}`}>
      {row.payment.text}
    </p>
  );
}

function Gifts({ row }: { row: LabOrderRow }) {
  return (
    <ul className="flex flex-col gap-3">
      {row.gifts.map((gift, index) => (
        <li key={index} className="flex items-center gap-3">
          <Media
            alt=""
            className="size-14 shrink-0 rounded-lg"
            photo={gift.photo}
          />
          <div className="min-w-0 flex-1 text-sm">
            <p className="leading-snug font-medium">{gift.name}</p>
            {gift.meta && <p className="mt-1 text-muted">{gift.meta}</p>}
          </div>
          <span className="shrink-0 text-sm font-medium tabular-nums">
            ×{gift.quantity}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Pickup({ row }: { row: LabOrderRow }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <PickupIcon
        aria-hidden
        className="mt-0.5 shrink-0 text-muted"
        size={16}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{row.pickupDate}</p>
        <p className="mt-0.5 text-muted">{row.pickupPlace}</p>
      </div>
      <ChevronRightIcon
        aria-hidden
        className="self-center text-muted"
        size={18}
      />
    </div>
  );
}

export function OrderSheets({ rows }: OrderCardOptionProps) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.id}>
          <a
            className="group flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-surface outline-none transition-shadow hover:shadow-overlay focus-visible:focus-ring"
            href={row.href}
          >
            <Progress row={row} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl leading-tight font-semibold">
                  {row.guestName}
                </h3>
                <p className="mt-1 text-xs text-muted">{row.reference}</p>
              </div>
              <span className="shrink-0 pt-0.5 font-semibold tabular-nums">
                {row.total}
              </span>
            </div>
            <Gifts row={row} />
            <div className="flex flex-col gap-3 border-t border-separator pt-4">
              <Pickup row={row} />
              <Payment row={row} />
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function OrderTickets({ rows }: OrderCardOptionProps) {
  const { language } = useLocale();

  return (
    <ul className="flex flex-col gap-5">
      {rows.map((row) => (
        <li key={row.id}>
          <a
            className="flex flex-col overflow-hidden rounded-2xl border border-separator bg-surface outline-none transition-colors hover:border-foreground focus-visible:focus-ring"
            href={row.href}
          >
            <div className="flex items-center gap-4 px-4 py-4">
              <div className="flex w-12 shrink-0 flex-col items-center border-e border-separator pe-4">
                <span className="text-[11px] font-medium uppercase">
                  {row.pickupDay.weekday}
                </span>
                <span className="text-3xl leading-tight font-semibold tabular-nums">
                  {row.pickupDay.day}
                </span>
                <span className="text-xs text-muted">
                  {row.pickupDay.month}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg leading-tight font-semibold">
                  {row.guestName}
                </h3>
                <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted">
                  <span className="shrink-0">{row.reference}</span>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <PickupIcon aria-hidden className="shrink-0" size={14} />
                  <span className="truncate" title={row.pickupPlace}>
                    {row.pickupPlace}
                  </span>
                </div>
              </div>
              <ChevronRightIcon
                aria-hidden
                className="shrink-0 text-muted"
                size={18}
              />
            </div>
            <div className="flex flex-col gap-4 p-4">
              <Gifts row={row} />
              <Progress row={row} />
            </div>
            <div className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted">
                  {language === "de" ? "Gesamt" : "Order total"}
                </span>
                <span className="font-semibold tabular-nums">{row.total}</span>
              </div>
              <dl className="flex flex-col gap-2 text-sm">
                {[
                  {
                    label: language === "de" ? "Zahlung" : "Payment",
                    value: row.paymentDetails.status,
                  },
                  ...row.paymentDetails.facts,
                ].map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <dt className="shrink-0 text-muted">{fact.label}</dt>
                    <dd
                      className={`text-end tabular-nums ${paymentText[row.payment.tone]}`}
                    >
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function OrderLedger({ rows }: OrderCardOptionProps) {
  const dates = [...new Set(rows.map((row) => row.pickupDate))];

  return (
    <div className="flex flex-col gap-8">
      {dates.map((date) => (
        <section key={date}>
          <h3 className="flex items-baseline justify-between gap-3 border-b border-foreground pb-3 text-lg font-semibold">
            {date}
            <span className="text-sm font-normal text-muted tabular-nums">
              {rows.filter((row) => row.pickupDate === date).length}
            </span>
          </h3>
          <ul className="divide-y divide-separator">
            {rows
              .filter((row) => row.pickupDate === date)
              .map((row) => (
                <li key={row.id}>
                  <a
                    className="flex flex-col gap-3 py-5 outline-none transition-colors hover:bg-surface-secondary focus-visible:focus-ring"
                    href={row.href}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h4 className="text-lg font-semibold">{row.guestName}</h4>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {row.total}
                      </span>
                    </div>
                    <Progress row={row} />
                    <Gifts row={row} />
                    <div className="flex items-start gap-2 text-sm text-muted">
                      <PickupIcon
                        aria-hidden
                        className="mt-0.5 shrink-0"
                        size={16}
                      />
                      <span className="min-w-0 flex-1">{row.pickupPlace}</span>
                      <ChevronRightIcon
                        aria-hidden
                        className="shrink-0"
                        size={16}
                      />
                    </div>
                    <Payment row={row} />
                    <span className="text-xs text-muted">{row.reference}</span>
                  </a>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
