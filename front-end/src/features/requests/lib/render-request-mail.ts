import type { Language } from "@/contexts/locale-context";
import type { Role } from "@/features/demo/types";
import type { Mail } from "@/features/notifications/types";
import type { RenderedMail } from "@/features/notifications/components/render-mail";
import type { MessageKey } from "@/i18n/en";
import type { IntlLocale } from "@/lib/format";

import {
  formatOrderDate,
  formatOrderDateTime,
} from "@/features/orders/lib/format";
import { de } from "@/i18n/de";
import { en } from "@/i18n/en";

const messages: Record<Language, Record<MessageKey, string>> = { en, de };

function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** "24.10.2026 – 25.10.2026", or one date for a single day. */
export function formatDateRange(
  from: string,
  to: string,
  locale: IntlLocale,
): string {
  const start = formatOrderDate(from, locale);

  return to && to !== from
    ? `${start} – ${formatOrderDate(to, locale)}`
    : start;
}

/**
 * N16 and N17 (step 4.17) in the recipient's language: N16 in the shop's default language,
 * N17 in the Owner's or the Manager's. Questions and answers stay as the guest sent them.
 * Each mail links to its request in M19 or M20.
 */
export function renderRequestMail(mail: Mail): RenderedMail {
  const copy = messages[mail.language];
  const locale = mail.language === "de" ? "de-CH" : "en-CH";
  const p = mail.params;
  const line = (key: MessageKey, vars: Record<string, string | number> = {}) =>
    fill(copy[key], vars);
  const guestLanguage = line(
    p.guestLanguage === "de"
      ? "merchantRequests.language.de"
      : "merchantRequests.language.en",
  );
  const at = formatOrderDateTime(String(p.sentAt), locale);

  if (mail.template === "N16") {
    const count = Number(p.count ?? 0);
    const answers = Array.from({ length: count }, (_, i) =>
      line("requestMail.N16.answer", {
        question: String(p[`q${i}`] ?? ""),
        answer: String(p[`a${i}`] ?? ""),
      }),
    );

    return {
      subject: line("requestMail.N16.subject", { email: p.email }),
      body: [
        line("requestMail.N16.intro", { at }),
        line("requestMail.guestEmail", { email: p.email }),
        line("requestMail.guestLanguage", { language: guestLanguage }),
        ...answers,
        line("requestMail.N16.skipped"),
        line("requestMail.N16.reply"),
      ],
      link: {
        label: line("requestMail.link.advice"),
        href: `#/store/requests/advice/${String(p.requestId)}`,
        role: "owner",
      },
    };
  }

  const size = Number(p.groupSize);
  const group = line(
    size === 1
      ? "merchantRequests.private.people.one"
      : "merchantRequests.private.people.other",
    { count: size },
  );
  const dates = formatDateRange(String(p.dateFrom), String(p.dateTo), locale);
  const interests = String(p.interests ?? "").trim();

  return {
    subject: line("requestMail.N17.subject", { group, dates }),
    body: [
      line("requestMail.N17.greeting", { name: p.staffName }),
      line("requestMail.N17.intro", { at }),
      line("requestMail.N17.group", { group }),
      line("requestMail.N17.dates", { dates }),
      ...(interests ? [line("requestMail.N17.interests", { interests })] : []),
      line("requestMail.guestEmail", { email: p.email }),
      line("requestMail.guestLanguage", { language: guestLanguage }),
      line("requestMail.N17.reply"),
    ],
    link: {
      label: line("requestMail.link.private"),
      href: "#/store/requests/private",
      role: (p.staffRole === "manager" ? "manager" : "owner") satisfies Role,
    },
  };
}
