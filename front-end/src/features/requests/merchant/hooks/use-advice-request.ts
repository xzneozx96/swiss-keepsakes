import type { Language } from "@/contexts/locale-context";

import { useEffect } from "react";

import { replyHref } from "./use-merchant-requests";

import { useLocale } from "@/contexts/locale-context";
import { useDemoActions, useDemoSelector } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { formatOrderDateTime } from "@/features/orders/lib/format";

export interface AdviceRequestView {
  email: string;
  languageName: string;
  sentAt: string;
  mailto: string;
  answers: {
    id: string;
    question: string;
    /** The language the question was shown in (D7: may differ from the guest's). */
    language: Language;
    /** "Asked in English" when that differs from the guest's language, else null. */
    askedIn: string | null;
    answer: string;
  }[];
}

/**
 * M19 request detail (outline step 15, AC18): every question with the wording the guest saw
 * when sending, and the answers. Opening it marks the request read, once.
 */
export function useAdviceRequest(id: string): AdviceRequestView | null {
  const { t, intlLocale } = useLocale();
  const { update } = useDemoActions();
  const adviceRequests = useDemoSelector((s) => s.data.adviceRequests);
  const request = adviceRequests.find((r) => r.id === id);
  const isUnread = !!request && !request.readAt;

  useEffect(() => {
    if (!isUnread) return;
    update((s) => ({
      ...s,
      data: {
        ...s.data,
        adviceRequests: s.data.adviceRequests.map((r) =>
          r.id === id && !r.readAt
            ? { ...r, readAt: demoNow(s.clockStartedAt).toISOString() }
            : r,
        ),
      },
    }));
  }, [id, isUnread, update]);

  if (!request) return null;

  return {
    email: request.email,
    languageName: t(
      request.language === "de"
        ? "merchantRequests.language.de"
        : "merchantRequests.language.en",
    ),
    sentAt: formatOrderDateTime(request.sentAt, intlLocale),
    mailto: replyHref(request.email, request.language, "advice"),
    answers: request.answers.map((a) => ({
      id: a.questionId,
      question: a.question,
      language: a.questionLanguage,
      askedIn:
        a.questionLanguage === request.language
          ? null
          : t(
              a.questionLanguage === "de"
                ? "adviceRequest.answers.askedIn.de"
                : "adviceRequest.answers.askedIn.en",
            ),
      answer: a.answer,
    })),
  };
}
