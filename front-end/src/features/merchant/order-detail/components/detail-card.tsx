import type { IconComponent } from "@/components/icons";
import type { StatusTone } from "@/components/status-chip";

/**
 * M04 card (same surface as the M02/M03 cards): white, 24px radius, the soft surface
 * shadow, no border. Header row: a 36px icon tile, the title, an optional trailing slot.
 */
export function DetailCard({
  icon: Icon,
  title,
  trailing,
  children,
  id,
}: {
  icon: IconComponent;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  const titleId = id ? `${id}-title` : undefined;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
          <Icon aria-hidden size={18} />
        </span>
        <h2 className="min-w-0 flex-1 text-base font-semibold" id={titleId}>
          {title}
        </h2>
        {trailing}
      </div>
      {children}
    </section>
  );
}

const bandClass: Record<StatusTone, string> = {
  info: "bg-info-soft text-info-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
  neutral: "bg-surface-secondary text-foreground",
};

/**
 * M04 primary action area: the one card that asks the staff member to do something.
 * A tinted band (tone of the order's progress label) carries a small eyebrow and the
 * title; the body holds the facts to check and the buttons. Step 1.15r reuses it for
 * the fulfilment steps, so the next step always sits in the same place and shape.
 */
export function ActionPanel({
  tone,
  eyebrow,
  title,
  icon: Icon,
  headingRef,
  children,
}: {
  tone: StatusTone;
  eyebrow: string;
  title: string;
  icon: IconComponent;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="action-panel-title"
      className="overflow-hidden rounded-3xl bg-surface shadow-surface"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3.5 lg:px-5 ${bandClass[tone]}`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface/70">
          <Icon aria-hidden size={18} />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium tracking-wide uppercase">
            {eyebrow}
          </span>
          <h2
            ref={headingRef}
            className="text-heading text-foreground outline-none"
            id="action-panel-title"
            tabIndex={-1}
          >
            {title}
          </h2>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4 lg:p-5">{children}</div>
    </section>
  );
}
