import type {
  ReviewItemView,
  ReviewOrderView,
} from "@/features/checkout/components/review-view";

import { Accordion } from "@heroui/react";

import {
  EngraveIcon,
  OptionIcon,
  PayLaterIcon,
  PickupDateIcon,
  PickupIcon,
  ShopIcon,
} from "@/components/icons";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";

/**
 * Lab: C06 order layouts where the whole order (facts, gifts, totals, terms) sits in one
 * white card. Each option takes the same `ReviewOrderView` as the built `OrderGroup`, so
 * the chosen one can replace it without touching `useReview`.
 */
export interface ReviewOrderOptionProps {
  order: ReviewOrderView;
}

const card = "rounded-3xl bg-surface shadow-surface";
const row = "flex items-start gap-2 text-sm";
const rowIcon = "mt-0.5 shrink-0";

function Facts({ order }: ReviewOrderOptionProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className={row}>
        <PickupDateIcon aria-hidden className={rowIcon} size={16} />
        {order.requestDate}
      </p>
      <p className={row}>
        <PickupIcon aria-hidden className={rowIcon} size={16} />
        {order.place}
      </p>
      <p className={row}>
        <PayLaterIcon aria-hidden className={rowIcon} size={16} />
        {order.policy}
      </p>
    </div>
  );
}

function Totals({ order }: ReviewOrderOptionProps) {
  return (
    <dl className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm">{order.totalLabel}</dt>
        <dd className="font-semibold tabular-nums">{order.total}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm">{order.dueLabel}</dt>
        <dd className="text-heading tabular-nums">{order.due}</dd>
      </div>
    </dl>
  );
}

/** Collapsed by default: the policy text is long and the same for most orders. */
function Cancellation({ order }: ReviewOrderOptionProps) {
  return (
    <Accordion className="[&_.accordion\_\_body-inner]:px-0 [&_.accordion\_\_body-inner]:pt-0 [&_.accordion\_\_body-inner]:pb-1 [&_.accordion\_\_trigger]:min-h-11 [&_.accordion\_\_trigger]:px-0 [&_.accordion\_\_trigger]:py-0">
      <Accordion.Item id="cancellation">
        <Accordion.Heading>
          <Accordion.Trigger>
            <span className="flex-1 text-start text-sm font-medium">
              {order.cancellationTitle}
            </span>
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            <p className="text-sm whitespace-pre-line text-muted">
              {order.cancellation}
            </p>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function ItemMeta({ item }: { item: ReviewItemView }) {
  if (!item.option && !item.engraving) return null;

  return (
    <div className="flex flex-col gap-1">
      {item.option && (
        <p className={row}>
          <OptionIcon aria-hidden className={rowIcon} size={16} />
          {item.option}
        </p>
      )}
      {item.engraving && (
        <p className={row}>
          <EngraveIcon aria-hidden className={rowIcon} size={16} />
          {item.engraving}
        </p>
      )}
    </div>
  );
}

/** Photo, name, shop, option and engraving, with quantity and total on the last line. */
function GiftRow({
  item,
  photoSize = "size-16",
}: {
  item: ReviewItemView;
  photoSize?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Media
        alt=""
        className={`${photoSize} shrink-0 rounded-xl`}
        photo={item.photo}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h4 className="font-semibold leading-snug">{item.name}</h4>
          <p className="flex items-start gap-1.5 text-sm text-muted">
            <ShopIcon aria-hidden className={rowIcon} size={14} />
            {item.store}
          </p>
        </div>
        <ItemMeta item={item} />
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted tabular-nums">
            {item.quantity}
          </span>
          <span className="font-semibold tabular-nums">{item.total}</span>
        </div>
      </div>
    </div>
  );
}

/** A · Sectioned card: one card, four sections split by full-width lines. */
export function ReviewSectioned({ order }: ReviewOrderOptionProps) {
  return (
    <section
      aria-label={order.title}
      className={`${card} flex flex-col divide-y divide-separator`}
    >
      <div className="flex flex-col gap-3 p-5">
        <h3 className="font-serif text-card-title">{order.title}</h3>
        <Facts order={order} />
      </div>
      <ul className="flex flex-col divide-y divide-separator px-5">
        {order.items.map((item) => (
          <li key={item.id} className="py-4">
            <GiftRow item={item} />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 p-5">
        <Totals order={order} />
        <p className="text-sm text-muted">{order.rule}</p>
      </div>
      <div className="px-5 py-2">
        <Cancellation order={order} />
      </div>
    </section>
  );
}

/** B · Gift tiles: the gifts sit on soft grey tiles inside the white card. */
export function ReviewTiles({ order }: ReviewOrderOptionProps) {
  return (
    <section
      aria-label={order.title}
      className={`${card} flex flex-col gap-4 p-4`}
    >
      <div className="flex flex-col gap-3 px-1 pt-1">
        <h3 className="font-serif text-card-title">{order.title}</h3>
        <Facts order={order} />
      </div>
      <ul className="flex flex-col gap-2">
        {order.items.map((item) => (
          <li key={item.id} className="rounded-2xl bg-surface-secondary p-3">
            <GiftRow item={item} />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 px-1">
        <Totals order={order} />
        <p className="text-sm text-muted">{order.rule}</p>
      </div>
      <div className="border-t border-separator px-1 pt-1">
        <Cancellation order={order} />
      </div>
    </section>
  );
}

/**
 * C · Receipt with terms band: compact gift lines like a receipt, totals under a dashed
 * rule, and the payment rule and cancellation on a grey band at the foot of the card.
 */
export function ReviewReceipt({ order }: ReviewOrderOptionProps) {
  return (
    <section
      aria-label={order.title}
      className={`${card} flex flex-col overflow-hidden`}
    >
      <div className="flex flex-col gap-3 px-5 pt-5">
        <h3 className="font-serif text-card-title">{order.title}</h3>
        <Facts order={order} />
      </div>
      <ul className="mx-5 mt-4 flex flex-col gap-4 border-t border-separator pt-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <Media
              alt=""
              className="size-12 shrink-0 rounded-lg"
              photo={item.photo}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-medium leading-snug">{item.name}</h4>
                <span className="shrink-0 tabular-nums">{item.total}</span>
              </div>
              {(item.option || item.engraving) && (
                <p className="text-sm text-muted">
                  {[item.option, item.engraving].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="text-sm text-muted tabular-nums">
                {item.quantity} · {item.store}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mx-5 mt-4 mb-5 border-t border-dashed border-separator pt-4">
        <Totals order={order} />
      </div>
      <div className="flex flex-col gap-3 bg-surface-secondary px-5 py-4">
        <p className="text-sm">{order.rule}</p>
        <Cancellation order={order} />
      </div>
    </section>
  );
}

/**
 * D · Due first: the amount due after confirmation leads the card header, beside the
 * title; the order total and terms close the card.
 */
export function ReviewDueFirst({ order }: ReviewOrderOptionProps) {
  return (
    <section
      aria-label={order.title}
      className={`${card} flex flex-col gap-4 p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-card-title">{order.title}</h3>
        <div className="flex flex-col items-end text-end">
          <span className="text-heading tabular-nums">{order.due}</span>
          <span className="text-xs text-muted">{order.dueLabel}</span>
        </div>
      </div>
      <div className="rounded-2xl bg-surface-secondary p-3">
        <Facts order={order} />
      </div>
      <ul className="flex flex-col divide-y divide-separator">
        {order.items.map((item) => (
          <li key={item.id} className="py-3 first:pt-0">
            <GiftRow item={item} photoSize="size-14" />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 border-t border-separator pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm">{order.totalLabel}</span>
          <span className="font-semibold tabular-nums">{order.total}</span>
        </div>
        <p className="text-sm text-muted">{order.rule}</p>
      </div>
      <Cancellation order={order} />
    </section>
  );
}

/* Round 2: variations on A. Same sectioned white card, different layout and styling. */

/** Lab-only section labels; the chosen option would move these into the i18n files. */
function useSectionLabels(order: ReviewOrderView) {
  const { language } = useLocale();
  const n = order.items.length;

  return language === "de"
    ? {
        pickup: "Abholung",
        gifts: n === 1 ? "1 Geschenk" : `${n} Geschenke`,
        payment: "Zahlung",
      }
    : {
        pickup: "Pickup",
        gifts: n === 1 ? "1 gift" : `${n} gifts`,
        payment: "Payment",
      };
}

const sectionLabel = "text-xs font-medium tracking-wide text-muted uppercase";

/** A2 · Labelled sections: a small label opens each section; the lines are inset. */
export function ReviewLabelled({ order }: ReviewOrderOptionProps) {
  const labels = useSectionLabels(order);

  return (
    <section aria-label={order.title} className={`${card} flex flex-col`}>
      <h3 className="px-5 pt-5 font-serif text-card-title">{order.title}</h3>
      <div className="mx-5 flex flex-col gap-2 border-b border-separator py-4">
        <p className={sectionLabel}>{labels.pickup}</p>
        <Facts order={order} />
      </div>
      <div className="mx-5 flex flex-col border-b border-separator pt-4">
        <p className={sectionLabel}>{labels.gifts}</p>
        <ul className="flex flex-col divide-y divide-separator">
          {order.items.map((item) => (
            <li key={item.id} className="py-4">
              <GiftRow item={item} />
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-5 flex flex-col gap-2 border-b border-separator py-4">
        <p className={sectionLabel}>{labels.payment}</p>
        <Totals order={order} />
        <p className="text-sm text-muted">{order.rule}</p>
      </div>
      <div className="px-5 py-2">
        <Cancellation order={order} />
      </div>
    </section>
  );
}

/**
 * A3 · Compact rows: the payment type is a chip under the title, and each gift is a
 * shorter row (48px photo, price beside the name, option and engraving on one line).
 */
export function ReviewCompact({ order }: ReviewOrderOptionProps) {
  return (
    <section
      aria-label={order.title}
      className={`${card} flex flex-col divide-y divide-separator`}
    >
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col items-start gap-2">
          <h3 className="font-serif text-card-title">{order.title}</h3>
          <span className="flex items-center gap-1.5 rounded-full bg-surface-secondary px-2.5 py-1 text-xs">
            <PayLaterIcon aria-hidden size={14} />
            {order.policy}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={row}>
            <PickupDateIcon aria-hidden className={rowIcon} size={16} />
            {order.requestDate}
          </p>
          <p className={row}>
            <PickupIcon aria-hidden className={rowIcon} size={16} />
            {order.place}
          </p>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-separator px-5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-3.5">
            <Media
              alt=""
              className="size-12 shrink-0 rounded-lg"
              photo={item.photo}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-semibold leading-snug">{item.name}</h4>
                <span className="shrink-0 font-semibold tabular-nums">
                  {item.total}
                </span>
              </div>
              {(item.option || item.engraving) && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {item.option && (
                    <span className="flex items-center gap-1.5">
                      <OptionIcon aria-hidden size={14} />
                      {item.option}
                    </span>
                  )}
                  {item.engraving && (
                    <span className="flex items-center gap-1.5">
                      <EngraveIcon aria-hidden size={14} />
                      {item.engraving}
                    </span>
                  )}
                </p>
              )}
              <p className="text-sm text-muted tabular-nums">
                {item.quantity} · {item.store}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 p-5">
        <Totals order={order} />
        <p className="text-sm text-muted">{order.rule}</p>
      </div>
      <div className="px-5 py-2">
        <Cancellation order={order} />
      </div>
    </section>
  );
}

/** A4 · Photo-forward: larger 88px photos with the quantity as a badge on the photo. */
export function ReviewPhotoForward({ order }: ReviewOrderOptionProps) {
  return (
    <section
      aria-label={order.title}
      className={`${card} flex flex-col divide-y divide-separator`}
    >
      <div className="flex flex-col gap-3 p-5">
        <h3 className="font-serif text-card-title">{order.title}</h3>
        <Facts order={order} />
      </div>
      <ul className="flex flex-col divide-y divide-separator px-5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-4 py-4">
            <div className="relative shrink-0">
              <Media
                alt=""
                className="size-[88px] rounded-2xl"
                photo={item.photo}
              />
              {/* `quantity` is "2 × CHF 24.00"; the badge shows the count only when above 1. */}
              {item.quantity.split(" ")[0] !== "1" && (
                <span className="absolute -end-1.5 -top-1.5 flex min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-xs font-semibold text-background tabular-nums">
                  ×{item.quantity.split(" ")[0]}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <h4 className="font-semibold leading-snug">{item.name}</h4>
                <p className="text-sm text-muted">{item.store}</p>
              </div>
              <ItemMeta item={item} />
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted tabular-nums">
                  {item.quantity}
                </span>
                <span className="font-semibold tabular-nums">{item.total}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 p-5">
        <Totals order={order} />
        <p className="text-sm text-muted">{order.rule}</p>
      </div>
      <div className="px-5 py-2">
        <Cancellation order={order} />
      </div>
    </section>
  );
}

/**
 * A5 · Payment-forward totals: the amount due after confirmation is the largest figure
 * in the card, with the order total as a quieter line under it.
 */
export function ReviewPaymentForward({ order }: ReviewOrderOptionProps) {
  return (
    <section
      aria-label={order.title}
      className={`${card} flex flex-col divide-y divide-separator`}
    >
      <div className="flex flex-col gap-3 p-5">
        <h3 className="font-serif text-card-title">{order.title}</h3>
        <Facts order={order} />
      </div>
      <ul className="flex flex-col divide-y divide-separator px-5">
        {order.items.map((item) => (
          <li key={item.id} className="py-4">
            <GiftRow item={item} />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted">{order.dueLabel}</span>
          <span className="font-serif text-title tabular-nums">
            {order.due}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span>{order.totalLabel}</span>
          <span className="font-medium tabular-nums">{order.total}</span>
        </div>
        <p className="text-sm text-muted">{order.rule}</p>
      </div>
      <div className="px-5 py-2">
        <Cancellation order={order} />
      </div>
    </section>
  );
}

/**
 * A6 · Hairline card: the same sections in a flat card with a thin outline instead of a
 * shadow, a tighter radius and the pickup date as the header's lead line.
 */
export function ReviewHairline({ order }: ReviewOrderOptionProps) {
  return (
    <section
      aria-label={order.title}
      className="flex flex-col divide-y divide-separator rounded-2xl border border-separator bg-surface"
    >
      <div className="flex flex-col gap-1 p-5">
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
          {order.title}
        </h3>
        <p className="font-serif text-card-title">{order.requestDate}</p>
        <div className="mt-2 flex flex-col gap-1.5">
          <p className={row}>
            <PickupIcon aria-hidden className={rowIcon} size={16} />
            {order.place}
          </p>
          <p className={row}>
            <PayLaterIcon aria-hidden className={rowIcon} size={16} />
            {order.policy}
          </p>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-separator px-5">
        {order.items.map((item) => (
          <li key={item.id} className="py-4">
            <GiftRow item={item} photoSize="size-14" />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 p-5">
        <Totals order={order} />
        <p className="text-sm text-muted">{order.rule}</p>
      </div>
      <div className="px-5 py-2">
        <Cancellation order={order} />
      </div>
    </section>
  );
}
