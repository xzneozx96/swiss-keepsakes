import type { IconComponent } from "@/components/icons";
import type { AccountSection } from "../lib/sections";

import { Link } from "@tanstack/react-router";

import { ChevronRightIcon } from "@/components/icons";

/**
 * Grouped settings list (1.12s, the Instagram / Accounts Center pattern): a heading over one
 * white rounded group of rows, hairlines inset past the icon.
 */
export function SettingsGroup({
  id,
  title,
  children,
}: {
  id: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className="flex flex-col gap-2"
    >
      {title && (
        <h2 className="px-1 text-sm font-semibold text-muted" id={id}>
          {title}
        </h2>
      )}
      <ul className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-surface">
        {children}
      </ul>
    </section>
  );
}

const hairline =
  "relative not-first:before:absolute not-first:before:end-0 not-first:before:top-0 not-first:before:h-px not-first:before:bg-separator/70";

/** A group item: a hairline above every row but the first, inset past the 36px icon. */
export const itemClass = `${hairline} not-first:before:start-16`;

/** A group item without an icon: the hairline starts at the text. */
export const plainItemClass = `${hairline} not-first:before:start-4`;

export const rowClass =
  "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start outline-none transition-colors hover:bg-default/50 focus-visible:-outline-offset-2 focus-visible:focus-ring active:bg-default/70";

/** The tinted square that holds a row's icon. */
export function RowIcon({
  icon: Icon,
  tone = "default",
}: {
  icon: IconComponent;
  tone?: "default" | "accent";
}) {
  return (
    <span
      aria-hidden
      className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
        tone === "accent"
          ? "bg-accent-soft text-accent-soft-foreground"
          : "bg-default text-foreground"
      }`}
    >
      <Icon size={20} />
    </span>
  );
}

/** Title, one muted line under it, an optional count or value, and a chevron. */
function RowBody({
  title,
  description,
  descriptionLang,
  value,
}: {
  title: string;
  description?: string;
  descriptionLang?: string;
  value?: React.ReactNode;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        {description && (
          <span
            className="line-clamp-2 text-sm text-muted"
            lang={descriptionLang}
          >
            {description}
          </span>
        )}
      </span>
      {value !== undefined && (
        <span className="shrink-0 text-sm text-muted tabular-nums">
          {value}
        </span>
      )}
      <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={20} />
    </>
  );
}

/** A row that drills into an account sub-screen (pushes history, so Back returns to the hub). */
export function SectionRow({
  section,
  icon,
  tone,
  ...body
}: {
  section: AccountSection;
  icon: IconComponent;
  tone?: "default" | "accent";
  title: string;
  description?: string;
  descriptionLang?: string;
  value?: React.ReactNode;
}) {
  return (
    <li className={itemClass}>
      <Link className={rowClass} search={{ tab: section }} to="/account">
        <RowIcon icon={icon} tone={tone} />
        <RowBody {...body} />
      </Link>
    </li>
  );
}
