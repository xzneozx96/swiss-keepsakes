import type { IconComponent } from "@/components/icons";

import { Button, Dropdown, Label } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { SellerRow } from "@/features/catalog/components/seller-row";
import {
  CallIcon,
  DirectionsIcon,
  EmailIcon,
  ShopIcon,
} from "@/components/icons";

/** Lab only: compact seller blocks for C03. Same data as the built seller card. */
export interface SellerOptionProps {
  initial: string;
  /** "Swiss Keepsakes Luzern". */
  name: string;
  /** "Sold by Swiss Keepsakes Luzern". */
  title: string;
  /** "Kornmarkt 9, 6004 Luzern". */
  address: string;
  /** "Mon–Sat 10:00–18:30". */
  hours: string;
  contacts: {
    kind: "call" | "email" | "directions";
    label: string;
    href: string;
  }[];
  visitLabel: string;
  contactLabel: string;
}

const contactIcon: Record<
  SellerOptionProps["contacts"][number]["kind"],
  IconComponent
> = {
  call: CallIcon,
  email: EmailIcon,
  directions: DirectionsIcon,
};

const external = (kind: string) =>
  kind === "directions" ? { target: "_blank", rel: "noreferrer" } : {};

function Avatar({
  initial,
  size = "size-10",
}: {
  initial: string;
  size?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-foreground font-serif text-lg text-background`}
    >
      {initial}
    </span>
  );
}

const roundIcon =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-separator text-foreground outline-none transition-transform focus-visible:focus-ring active:scale-95";

/** A · Host row + round icon actions: one 56px row, icons on the right. */
export function SellerIconRow(p: SellerOptionProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar initial={p.initial} />
      <Link
        className="flex min-w-0 flex-1 flex-col rounded outline-none focus-visible:focus-ring"
        to="/gifts"
      >
        <span className="truncate font-semibold">{p.title}</span>
        <span className="truncate text-xs text-muted">
          {p.address} · {p.hours}
        </span>
      </Link>
      {p.contacts.map((c) => {
        const Icon = contactIcon[c.kind];

        return (
          <a
            key={c.kind}
            aria-label={c.label}
            className={roundIcon}
            href={c.href}
            {...external(c.kind)}
          >
            <Icon size={18} />
          </a>
        );
      })}
    </div>
  );
}

/** B · Airbnb host row with chevron (chosen 13.10.2026): the shared SellerRow. */
export function SellerSheetRow(p: SellerOptionProps) {
  return (
    <SellerRow
      address={p.address}
      contacts={p.contacts}
      hours={p.hours}
      name={p.name}
      sub={p.address}
      title={p.title}
      visitLabel={p.visitLabel}
    />
  );
}

/** C · Info line + small chips: name and address, then four soft pills in one row. */
export function SellerChips(p: SellerOptionProps) {
  const chip =
    "flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-surface-secondary px-3 text-xs font-medium outline-none focus-visible:focus-ring active:scale-95";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar initial={p.initial} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{p.title}</span>
          <span className="truncate text-xs text-muted">
            {p.address} · {p.hours}
          </span>
        </div>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
        {p.contacts.map((c) => {
          const Icon = contactIcon[c.kind];

          return (
            <a
              key={c.kind}
              className={chip}
              href={c.href}
              {...external(c.kind)}
            >
              <Icon aria-hidden size={14} />
              {c.label}
            </a>
          );
        })}
        <Link className={chip} to="/gifts">
          <ShopIcon aria-hidden size={14} />
          {p.visitLabel}
        </Link>
      </div>
    </div>
  );
}

/** D · Row + "Contact" menu: one row, a small button opens a menu of actions. */
export function SellerMenu(p: SellerOptionProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar initial={p.initial} />
      <Link
        className="flex min-w-0 flex-1 flex-col rounded outline-none focus-visible:focus-ring"
        to="/gifts"
      >
        <span className="truncate font-semibold">{p.title}</span>
        <span className="truncate text-xs text-muted">{p.address}</span>
      </Link>
      <Dropdown>
        <Button size="sm" variant="secondary">
          {p.contactLabel}
        </Button>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu aria-label={p.contactLabel}>
            {p.contacts.map((c) => {
              const Icon = contactIcon[c.kind];

              return (
                <Dropdown.Item
                  key={c.kind}
                  href={c.href}
                  id={c.kind}
                  textValue={c.label}
                  {...external(c.kind)}
                >
                  <Icon aria-hidden size={18} />
                  <Label>{c.label}</Label>
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}

/** E · Contact strip (iOS contact card): name row, then one joined bar of four actions. */
export function SellerStrip(p: SellerOptionProps) {
  const cell =
    "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium outline-none focus-visible:focus-ring active:bg-default";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar initial={p.initial} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{p.title}</span>
          <span className="truncate text-xs text-muted">
            {p.address} · {p.hours}
          </span>
        </div>
      </div>
      <div className="flex divide-x divide-separator overflow-hidden rounded-2xl bg-surface-secondary">
        {p.contacts.map((c) => {
          const Icon = contactIcon[c.kind];

          return (
            <a
              key={c.kind}
              className={cell}
              href={c.href}
              {...external(c.kind)}
            >
              <Icon aria-hidden size={18} />
              {c.label}
            </a>
          );
        })}
        <Link className={cell} to="/gifts">
          <ShopIcon aria-hidden size={18} />
          {p.visitLabel}
        </Link>
      </div>
    </div>
  );
}
