import type { Mail } from "../types";

import { Button, Drawer, Tabs, buttonVariants } from "@heroui/react";
import { useState } from "react";

import { renderMail } from "./render-mail";

import { EmailIcon } from "@/components/icons";
import { useDemo } from "@/features/demo";

/**
 * Prototype Mail panel (outline §3): emails are never sent; each one the demo "sends"
 * is listed here per recipient, rendered in the recipient's language. Presenter chrome
 * stays in English like the rest of the prototype bar; the emails themselves do not.
 */
export function MailPanel() {
  const { state } = useDemo();
  const [open, setOpen] = useState(false);
  const mail = state.data.mail;
  const guestMail = mail.filter((m) => m.to === "guest").reverse();
  const staffMail = mail.filter((m) => m.to === "staff").reverse();
  const partnerMail = mail.filter((m) => m.to === "partner").reverse();

  return (
    <Drawer isOpen={open} onOpenChange={setOpen}>
      <Button
        aria-label={`Mail, ${mail.length} emails`}
        className="h-7 min-w-0 shrink-0 gap-1 rounded-full bg-white/12 px-2 text-xs text-white"
        size="sm"
        variant="ghost"
      >
        {/* Icon and count only: the bar has no room for a word at 375px with a merchant role. */}
        <EmailIcon size={16} />
        {mail.length > 0 && (
          <span className="rounded-full bg-white px-1.5 text-[10px] leading-4 font-semibold text-foreground tabular-nums">
            {mail.length}
          </span>
        )}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content className="mx-auto max-w-[480px]" placement="bottom">
          <Drawer.Dialog className="flex h-[85dvh] flex-col">
            <Drawer.Handle />
            <Drawer.Header className="flex items-center justify-between">
              <Drawer.Heading>Mail (prototype)</Drawer.Heading>
              <Drawer.CloseTrigger aria-label="Close mail" />
            </Drawer.Header>
            <Drawer.Body className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+24px)] text-foreground">
              <p className="text-sm text-muted">
                Emails are not sent in the prototype. Each one appears here, in
                the recipient’s language, newest first.
              </p>
              <Tabs className="w-full">
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Recipient">
                    <Tabs.Tab id="guest">
                      Guest ({guestMail.length})
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="staff">
                      Staff ({staffMail.length})
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="partner">
                      Partner ({partnerMail.length})
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel className="pt-3" id="guest">
                  <MailList items={guestMail} />
                </Tabs.Panel>
                <Tabs.Panel className="pt-3" id="staff">
                  <MailList
                    items={staffMail}
                    onOpenLink={() => setOpen(false)}
                  />
                </Tabs.Panel>
                <Tabs.Panel className="pt-3" id="partner">
                  <MailList items={partnerMail} />
                </Tabs.Panel>
              </Tabs>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

function MailList({
  items,
  onOpenLink,
}: {
  items: Mail[];
  /** A mail's link was followed (N16, N17): close the panel. */
  onOpenLink?: () => void;
}) {
  const { state, setRole } = useDemo();

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">No emails yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((mail, i) => {
        const { subject, body, link } = renderMail(
          mail,
          state.data.pickupPlaces,
        );
        const guest = state.data.guests.find((g) => g.id === mail.guestId);
        const partner = state.data.partners.find(
          (p) => p.id === mail.partnerId,
        );
        const to = mail.recipient
          ? mail.recipient
          : mail.to === "staff"
            ? "Shop staff (Chị Ngọc, Lukas)"
            : partner
              ? `${partner.name} <${partner.email}>`
              : guest
                ? `${guest.name} <${String(mail.params.email ?? guest.email)}>`
                : "Guest";

        return (
          <li key={mail.id}>
            <details
              className="group rounded-2xl border border-separator bg-surface"
              open={i === 0}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-0.5 rounded-2xl px-4 py-3 outline-none focus-visible:focus-ring">
                <span className="flex items-center gap-2 font-mono text-[11px] text-muted">
                  <span className="rounded bg-surface-secondary px-1.5">
                    {mail.template}
                  </span>
                  {mail.language.toUpperCase()} · {formatSentAt(mail.at)}
                </span>
                <span className="text-sm font-semibold">{subject}</span>
              </summary>
              <div className="flex flex-col gap-3 border-t border-separator px-4 py-3 text-sm">
                <p className="text-xs text-muted">To: {to}</p>
                {body.map((paragraph, n) => (
                  <p key={n}>{paragraph}</p>
                ))}
                {link && (
                  // Opens the shop as the recipient when the presenter is not a merchant yet.
                  <a
                    className={`${buttonVariants({ variant: "secondary", size: "sm" })} w-fit`}
                    href={link.href}
                    onClick={() => {
                      if (state.role !== "owner" && state.role !== "manager")
                        setRole(link.role);
                      onOpenLink?.();
                    }}
                  >
                    {link.label}
                  </a>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

function formatSentAt(iso: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  }).format(new Date(iso));
}
