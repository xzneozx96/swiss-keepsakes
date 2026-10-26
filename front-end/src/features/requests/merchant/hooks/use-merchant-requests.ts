import type { AdviceRequest } from '@sk/domain/requests'
import type { StatusTone } from '@/components/status-chip'
import type { Language } from '@/contexts/locale-context'

import { formatOrderDateTime } from '@sk/domain/orders'

import { useLocale } from '@/contexts/locale-context'
import { useAdviceQuestions, useAdviceRequests } from '@/features/requests/api/queries'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

/** How many answers an M19 card shows before "+n more". */
const PREVIEW = 3

export interface RequestStatus {
  tone: StatusTone
  text: string
}

export interface AdviceRow {
  id: string
  /** Opens the request at `/store/requests/advice/{id}`, which marks it read. */
  href: string
  email: string
  /** "German · 14.10.2026, 09:00". */
  meta: string
  sentAt: string
  languageName: string
  status: RequestStatus
  /** The first answers, each with its question as the guest saw it. */
  preview: { question: string, language: Language, answer: string }[]
  /** "+4 more answers", or null. */
  more: string | null
  /** "7 answers". */
  count: string
}

const guestCopy = { en, de }

/** mailto: for a reply, the subject in the guest's language. */
export function replyHref(email: string, language: Language) {
  return `mailto:${email}?subject=${encodeURIComponent(
    guestCopy[language]['merchantRequests.mailSubject.advice'],
  )}`
}

function newestFirst<T extends { sentAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.sentAt.localeCompare(a.sentAt))
}

/**
 * M19 inbox (spec §3.2, outline step 15). Newest first. An advice request is new until a
 * staff member opens it. Tab counts are the requests in each tab, as on M03.
 */
export function useMerchantRequests() {
  const { t, intlLocale } = useLocale()
  const adviceRequests = useAdviceRequests()
  const adviceQuestions = useAdviceQuestions()

  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === 'one' ? 'one' : 'other'
  const languageName = (language: Language) =>
    t(
      language === 'de'
        ? 'merchantRequests.language.de'
        : 'merchantRequests.language.en',
    )
  const time = (iso: string) => formatOrderDateTime(iso, intlLocale)

  const adviceRow = (r: AdviceRequest): AdviceRow => {
    const rest = r.answers.length - PREVIEW

    return {
      id: r.id,
      href: `/store/requests/advice/${r.id}`,
      email: r.email,
      meta: t('merchantRequests.meta', {
        language: languageName(r.language),
        at: time(r.sentAt),
      }),
      sentAt: time(r.sentAt),
      languageName: languageName(r.language),
      status: r.readAt
        ? { tone: 'neutral', text: t('merchantRequests.status.read') }
        : { tone: 'info', text: t('merchantRequests.status.new') },
      preview: r.answers.slice(0, PREVIEW).map(a => ({
        question: a.question,
        language: a.questionLanguage,
        answer: a.answer,
      })),
      more:
        rest > 0
          ? t(`merchantRequests.advice.more.${plural(rest)}`, { count: rest })
          : null,
      count: t(`merchantRequests.advice.count.${plural(r.answers.length)}`, {
        count: r.answers.length,
      }),
    }
  }

  return {
    tabs: [
      {
        id: 'advice' as const,
        label: t('merchantRequests.tab.advice'),
        count: adviceRequests.length,
      },
      {
        id: 'questions' as const,
        label: t('merchantRequests.tab.questions'),
        count: adviceQuestions.questions.length,
      },
    ],
    adviceRows: newestFirst(adviceRequests).map(adviceRow),
  }
}
