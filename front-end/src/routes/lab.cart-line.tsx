import type {
  CartLineOptionProps,
  LabCartLine,
} from "@/features/lab/cart-line-options";

import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { useLocale } from "@/contexts/locale-context";
import { products } from "@/features/catalog/seed";
import {
  LineGiftSlip,
  LineOpenBasket,
  LinePhotoLed,
} from "@/features/lab/cart-line-directions";
import {
  LineBinStepper,
  LineCompactRow,
  LineEditSheet,
  LineItemCard,
  LineItemTile,
  LineLargePhoto,
  LinePriceColumn,
  LineQtyMenu,
  LineRoomyRow,
} from "@/features/lab/cart-line-options";
import {
  CartSelectDemo,
  type LabCartOrder,
} from "@/features/lab/cart-select-options";
import { formatMoney } from "@/lib/format";
import { pickText } from "@/lib/localized";

/** Lab: more compact cart lines for C04. Not part of the product. */
export const Route = createFileRoute("/lab/cart-line")({
  component: CartLineLab,
});

/**
 * How the order wraps its lines: "card" is the built C04 order card with lines split by
 * dividers; "tiles" keeps the card but gaps the lines; "open" drops the card so each
 * line is its own card under the order heading.
 */
type Frame = "card" | "tiles" | "open" | "ledger";

const options: {
  id: string;
  title: string;
  note: string;
  Option: (props: CartLineOptionProps) => React.ReactNode;
  frame?: Frame;
}[] = [
  {
    id: "L",
    title: "L · Gift slip",
    note: "A white gift card with complete customization and a full-width quantity and price row. Balanced for everyday use.",
    Option: LineGiftSlip,
    frame: "open",
  },
  {
    id: "M",
    title: "M · Open basket",
    note: "Full-width names and open rows. Small photos support the details; generous controls and clear totals keep editing simple.",
    Option: LineOpenBasket,
    frame: "ledger",
  },
  {
    id: "N",
    title: "N · Photo-led",
    note: "A generous photo above the gift details. A slower, more visual basket with full names and a separate editing row.",
    Option: LinePhotoLed,
    frame: "open",
  },
  {
    id: "F",
    title: "F · Item cards (your reference)",
    note: "Each gift is its own white card under the order heading: 88px photo, name and option, a small bin top-right, price and a round − n + with a filled + on the bottom line.",
    Option: LineItemCard,
    frame: "open",
  },
  {
    id: "G",
    title: "G · Tiles inside the order card",
    note: "Same item as F, on soft grey tiles inside the order card, so the order still reads as one box.",
    Option: LineItemTile,
    frame: "tiles",
  },
  {
    id: "H",
    title: "H · Roomy rows",
    note: "Same item as F as rows split by lines in the order card, no inner cards. Calmest.",
    Option: LineRoomyRow,
  },
  {
    id: "I",
    title: "I · Large photo + unit price",
    note: "104px photo, unit price under the option, outlined round buttons as on the gift page.",
    Option: LineLargePhoto,
  },
  {
    id: "A",
    title: "A · Compact row (Shopify, Etsy)",
    note: "Price beside the name; a small − n + pill and Remove on one line under it. About 80px per gift instead of 140px.",
    Option: LineCompactRow,
  },
  {
    id: "B",
    title: "B · Bin in the stepper (Amazon, Uber Eats)",
    note: "At quantity 1 the minus becomes a bin, so there is no Remove link. Total on the right of the stepper. The tightest row with the quantity visible.",
    Option: LineBinStepper,
  },
  {
    id: "C",
    title: "C · Qty menu (Etsy, Zalando)",
    note: "A small 'Qty 3' chip opens a list of numbers; a bin icon top-right removes. No − and + buttons.",
    Option: LineQtyMenu,
  },
  {
    id: "D",
    title: "D · Price column (Klook)",
    note: "Name, option and unit price on the left; total, small stepper and Remove stacked on the right.",
    Option: LinePriceColumn,
  },
  {
    id: "E",
    title: "E · Summary row + edit sheet (Booking basket)",
    note: "One 64px row: name and option, total over 'Qty 3', and a chevron. Tapping opens a sheet with the quantity row and Remove, like the chosen seller row.",
    Option: LineEditSheet,
  },
];

interface SampleLine {
  id: string;
  productId: string;
  variantId: string;
  engraving?: string;
  quantity: number;
}

const sample: SampleLine[] = [
  {
    id: "l1",
    productId: "p-vx-chapel-bridge",
    variantId: "m",
    engraving: "Anna",
    quantity: 1,
  },
  { id: "l2", productId: "p-chocolate", variantId: "12", quantity: 3 },
];

/** One option with its own lines, so removing in one option leaves the others alone. */
function OptionDemo({
  Option,
  frame = "card",
}: {
  Option: (props: CartLineOptionProps) => React.ReactNode;
  frame?: Frame;
}) {
  const { t, language, intlLocale } = useLocale();
  const [lines, setLines] = useState(sample);
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const pick = (text: Partial<Record<"en" | "de", string>>) =>
    pickText(text, language).text;

  const views = lines.flatMap((l) => {
    const product = products.find((p) => p.id === l.productId);
    const variant = product?.variants.find((v) => v.id === l.variantId);

    if (!product || !variant) return [];
    const meta = [
      product.variants.length > 1 ? pick(variant.label) : undefined,
      l.engraving ? t("cart.line.engraving", { text: l.engraving }) : undefined,
    ].filter(Boolean);
    const view: LabCartLine = {
      id: l.id,
      name: pick(product.name),
      photo: product.photo,
      meta: meta.join(" · "),
      quantity: l.quantity,
      max: Math.min(variant.stock, 9),
      total: money(variant.price * l.quantity),
      unit: money(variant.price),
    };

    return [{ view, cents: variant.price * l.quantity }];
  });

  const subtotal = views.reduce((sum, v) => sum + v.cents, 0);

  return (
    <div
      className={
        frame === "open" || frame === "ledger"
          ? "flex flex-col gap-3"
          : "flex flex-col rounded-3xl border border-separator"
      }
    >
      <div
        className={`flex items-baseline justify-between ${frame === "open" || frame === "ledger" ? "border-b border-separator pb-3" : "border-b border-separator px-5 py-3"}`}
      >
        <span className="font-serif text-card-title">
          {t("cart.order.title", { n: 1 })}
        </span>
        {(lines.length < sample.length ||
          lines.some(
            (line) =>
              line.quantity !==
              sample.find((item) => item.id === line.id)?.quantity,
          )) && (
          <button
            className="min-h-11 px-2 text-label text-muted underline underline-offset-4"
            type="button"
            onClick={() => setLines(sample)}
          >
            {language === "de" ? "Zurücksetzen" : "Reset"}
          </button>
        )}
      </div>
      {views.length === 0 && (
        <p className="py-6 text-sm text-muted">
          {language === "de"
            ? "Keine Geschenke in dieser Bestellung."
            : "No gifts in this order."}
        </p>
      )}
      <ul
        className={
          frame === "ledger"
            ? "flex flex-col divide-y divide-separator"
            : frame === "card"
              ? "flex flex-col divide-y divide-separator px-5"
              : frame === "tiles"
                ? "flex flex-col gap-3 p-3"
                : "flex flex-col gap-3"
        }
      >
        {views.map(({ view }) => (
          <li key={view.id}>
            <Option
              line={view}
              onQuantity={(q) =>
                setLines((ls) =>
                  ls.map((l) => (l.id === view.id ? { ...l, quantity: q } : l)),
                )
              }
              onRemove={() =>
                setLines((ls) => ls.filter((l) => l.id !== view.id))
              }
            />
          </li>
        ))}
      </ul>
      <div
        className={`flex items-baseline justify-between ${frame === "open" || frame === "ledger" ? "border-t border-separator px-1 pt-4" : "border-t border-separator px-5 py-3"}`}
      >
        <span className="text-sm">{t("cart.order.subtotal")}</span>
        <span className="font-semibold tabular-nums">{money(subtotal)}</span>
      </div>
    </div>
  );
}

/** Round 3 sample: two orders, as the cart groups them (pay in full / pay later). */
function useSampleOrders() {
  const { t, language, intlLocale } = useLocale();
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const pick = (text: Partial<Record<"en" | "de", string>>) =>
    pickText(text, language).text;

  const line = (
    id: string,
    productId: string,
    variantId: string,
    quantity: number,
    engraving?: string,
  ) => {
    const product = products.find((p) => p.id === productId);
    const variant = product?.variants.find((v) => v.id === variantId);

    if (!product || !variant) return [];

    return [
      {
        id,
        name: pick(product.name),
        photo: product.photo,
        meta: [
          product.variants.length > 1 ? pick(variant.label) : undefined,
          engraving ? t("cart.line.engraving", { text: engraving }) : undefined,
        ]
          .filter(Boolean)
          .join(" · "),
        quantity,
        max: Math.min(variant.stock, 9),
        total: money(variant.price * quantity),
        unit: money(variant.price),
        cents: variant.price * quantity,
      },
    ];
  };

  const orders: LabCartOrder[] = [
    {
      id: "o1",
      title: t("cart.order.title", { n: 1 }),
      policy: t("cart.policy.full"),
      pickup: "Fri 16 Oct · Shop Altstadt",
      lines: [
        ...line("k", "p-vx-chapel-bridge", "m", 1, "Anna"),
        ...line("r", "p-postcards", "8", 2),
      ],
    },
    {
      id: "o2",
      title: t("cart.order.title", { n: 2 }),
      policy: t("cart.policy.later"),
      pickup: "Thu 15 Oct · Pickup point Bahnhof",
      lines: line("c", "p-chocolate", "12", 3),
    },
  ];

  return {
    orders,
    labels: {
      selectAll: "Select all",
      totalLabel: t("cart.bar.total"),
      nothingNow: t("cart.bar.nothingNow"),
      continueLabel: (n: number) =>
        n === 0
          ? "Select an order"
          : `${t("cart.bar.continue")} · ${n === 1 ? "1 order" : `${n} orders`}`,
      money,
      gifts: (n: number) => (n === 1 ? "1 gift" : `${n} gifts`),
    },
  };
}

const selectOptions = [
  {
    id: "J",
    mode: "order" as const,
    title: "J · Select by order",
    note: "One checkbox per order, plus Select all. An order is requested whole, which keeps the cart's grouping (AC28) intact.",
  },
  {
    id: "K",
    mode: "item" as const,
    title: "K · Select by gift (Klook cart)",
    note: "A checkbox on every gift; the order checkbox selects or clears its gifts and shows a dash when only some are picked.",
  },
];

function CartLineLab() {
  const sampleOrders = useSampleOrders();
  const [selection, setSelection] = useState("L");
  const shown =
    selection === "new"
      ? options.slice(0, 3)
      : options.filter((option) => option.id === selection);

  return (
    <div className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-[1200px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Cart item layouts
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Three fresh directions, with the same engraved knife and chocolate
            set. Try the quantity and remove controls; totals update as you
            edit. These are lab previews.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-3 border-y border-separator py-4">
          <div aria-label="New cart layouts" className="flex flex-wrap gap-2">
            {[
              { id: "new", label: "Compare new" },
              ...options.slice(0, 3).map((option) => ({
                id: option.id,
                label: option.title.split(" · ")[1],
              })),
            ].map(({ id, label }) => (
              <button
                key={id}
                aria-pressed={selection === id}
                className={`min-h-11 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:focus-ring ${selection === id ? "bg-foreground text-background" : "bg-default hover:bg-default-hover"}`}
                type="button"
                onClick={() => setSelection(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted sm:ms-auto">
            Earlier directions
            <select
              aria-label="Earlier directions"
              className="min-h-11 max-w-24 rounded-lg border border-border bg-surface px-3 text-foreground outline-none focus-visible:focus-ring"
              value={
                [...options.slice(3), ...selectOptions].some(
                  (option) => option.id === selection,
                )
                  ? selection
                  : ""
              }
              onChange={(event) => setSelection(event.target.value || "new")}
            >
              <option value="">Select</option>
              {[...selectOptions, ...options.slice(3)].map((option) => (
                <option key={option.id} value={option.id}>
                  {option.id}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectOptions
          .filter((option) => option.id === selection)
          .map(({ id, mode, title, note }) => (
            <section
              key={id}
              className="mx-auto flex w-full max-w-[375px] flex-col gap-3"
            >
              <div className="flex flex-col gap-0.5">
                <h2 className="font-semibold">{title}</h2>
                <p className="text-label text-muted">{note}</p>
              </div>
              <CartSelectDemo mode={mode} {...sampleOrders} />
            </section>
          ))}
        <div
          className={
            selection === "new"
              ? "grid grid-cols-1 items-start justify-items-center gap-8 min-[1100px]:grid-cols-3"
              : "flex justify-center"
          }
        >
          {shown.map(({ id, title, note, Option, frame }) => (
            <section
              key={id}
              aria-label={title}
              className="flex w-full max-w-[375px] flex-col gap-5"
            >
              <div className="flex min-h-28 flex-col gap-2">
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-sm leading-relaxed text-muted">{note}</p>
              </div>
              <div className="rounded-2xl bg-default/60 px-4 py-5">
                {["L", "M", "N"].includes(id) ? (
                  <CartSelectDemo
                    key={id}
                    LineComponent={Option}
                    itemSurface={frame === "ledger" ? "open" : "component"}
                    mode="order"
                    {...sampleOrders}
                  />
                ) : (
                  <OptionDemo key={id} Option={Option} frame={frame} />
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
