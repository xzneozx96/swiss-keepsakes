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

export interface ReviewItemView {
  id: string;
  name: string;
  photo?: string;
  /** Seller shop name. */
  store: string;
  /** Chosen option ("Small"); undefined for a one-option ("Standard") gift. */
  option?: string;
  /** "Engraving “Anna”"; undefined without engraving. */
  engraving?: string;
  /** "1 × CHF 54.00". */
  quantity: string;
  total: string;
}

export interface ReviewOrderView {
  key: string;
  /** "Order 1". */
  title: string;
  /** "Full payment after confirmation". */
  policy: string;
  items: ReviewItemView[];
  /** "Request to receive on Wed 21 Oct". */
  requestDate: string;
  /** Pickup place: "Shop Altstadt". */
  place: string;
  totalLabel: string;
  total: string;
  /** "Due after the seller confirms". */
  dueLabel: string;
  due: string;
  /** Payment deadline rule, including the automatic cancel. */
  rule: string;
  cancellationTitle: string;
  cancellation: string;
}

const row = "flex items-start gap-2 text-sm";
const rowIcon = "mt-0.5 shrink-0";

/**
 * One order as a single white card, split by lines into pickup facts, gift rows, payment
 * and the cancellation policy. The amount due once the seller confirms is the card's
 * largest figure; the cancellation policy is collapsed, as it is long and mostly the same.
 * C06 shows it as is; C07 adds the order's status under the title and a link row at the end.
 */
export function OrderCard({
  order,
  status,
  footer,
  headingLevel = 2,
}: {
  order: ReviewOrderView;
  /** 2 on C06; 3 on C07, where the cards sit under "Your orders". Gift names are one below. */
  headingLevel?: 2 | 3;
  /** Under the title (C07: reference and status chips). */
  status?: React.ReactNode;
  /** Last row of the card (C07: link to the order). */
  footer?: React.ReactNode;
}) {
  const headingId = `review-${order.key}`;
  const Heading = `h${headingLevel}` as const;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col divide-y divide-separator rounded-3xl bg-surface shadow-surface"
    >
      <div className="flex flex-col gap-3 p-5">
        <Heading className="font-serif text-card-title" id={headingId}>
          {order.title}
        </Heading>
        {status}
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
      </div>

      <ul className="flex flex-col divide-y divide-separator px-5">
        {order.items.map((item) => (
          <OrderItem
            key={item.id}
            headingLevel={headingLevel === 2 ? 3 : 4}
            item={item}
          />
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
      </div>

      {footer}
    </section>
  );
}

/** A gift as a read-only row in the order card (no checkbox, stepper or remove). */
function OrderItem({
  item,
  headingLevel,
}: {
  item: ReviewItemView;
  headingLevel: 3 | 4;
}) {
  const Heading = `h${headingLevel}` as const;

  return (
    <li className="flex items-start gap-3 py-4">
      <Media
        alt=""
        className="size-16 shrink-0 rounded-xl"
        photo={item.photo}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <Heading className="font-semibold leading-snug">{item.name}</Heading>
          <p className="flex items-start gap-1.5 text-sm text-muted">
            <ShopIcon aria-hidden className={rowIcon} size={14} />
            {item.store}
          </p>
        </div>
        {(item.option || item.engraving) && (
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
        )}
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted tabular-nums">
            {item.quantity}
          </span>
          <span className="font-semibold tabular-nums">{item.total}</span>
        </div>
      </div>
    </li>
  );
}
