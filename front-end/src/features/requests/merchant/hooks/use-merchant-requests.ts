import type { AdviceRequest, PrivateTourRequest } from '../../types'
import type { StatusTone } from '@/components/status-chip'
import type { Language } from '@/contexts/locale-context'

import { useLocale } from '@/contexts/locale-context'

import { useDemo } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { formatOrderDateTime } from '@/features/orders/lib/format'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { calendarDay, dateTimeFormat } from '@/lib/format'
import { formatDateRange } from '../../lib/render-request-mail'

/** How many answers an M19 card shows before "+n more". */
const PREVIEW = 3

export interface RequestStatus {
  tone: StatusTone
  text: string
}

export interface AdviceRow {
  id: string
  /** Opens the request at `#/store/requests/advice/{id}`, which marks it read. */
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

export interface PrivateTourRow {
  id: string
  email: string
  meta: string
  sentAt: string
  languageName: string
  status: RequestStatus
  isAnswered: boolean
  /** "Answered on 13.10.2026, 11:00", or null while new. */
  answeredOn: string | null
  group: string
  dates: string
  /** Null when the guest gave none. */
  interests: string | null
  /** The first preferred day as the M03 date tile. */
  day: { weekday: string, day: string, month: string }
  /** mailto: with a subject in the guest's language (D9: the reply goes by email). */
  mailto: string
}

const guestCopy = { en, de }

/** mailto: for a reply, the subject in the guest's language. */
export function replyHref(email: string, language: Language, kind: 'advice' | 'private') {
  return `mailto:${email}?subject=${encodeURIComponent(
    guestCopy[language][
      kind === 'advice'
        ? 'merchantRequests.mailSubject.advice'
        : 'merchantRequests.mailSubject.private'
    ],
  )}`
}

function newestFirst<T extends { sentAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.sentAt.localeCompare(a.sentAt))
}

/**
 * M19 and M20 inboxes (spec §3.2, outline steps 15 and 16). Newest first. An advice request
 * is new until a staff member opens it; a private-tour request is new until marked answered
 * by hand (D9). Tab counts are the requests in each tab, as on M03.
 */
export function useMerchantRequests() {
  const { t, intlLocale } = useLocale()
  const { state, update } = useDemo()
  const { adviceRequests, privateTourRequests, adviceQuestions } = state.data

  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === 'one' ? 'one' : 'other'
  const languageName = (language: Language) =>
    t(
      language === 'de'
        ? 'merchantRequests.language.de'
        : 'merchantRequests.language.en',
    )
  const time = (iso: string) => formatOrderDateTime(iso, intlLocale)
  const datePart = (iso: string, option: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(intlLocale, { ...option, timeZone: 'UTC' }).format(
      calendarDay(iso),
    )

  const adviceRow = (r: AdviceRequest): AdviceRow => {
    const rest = r.answers.length - PREVIEW

    return {
      id: r.id,
      href: `#/store/requests/advice/${r.id}`,
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

  const privateRow = (r: PrivateTourRequest): PrivateTourRow => ({
    id: r.id,
    email: r.email,
    meta: t('merchantRequests.meta', {
      language: languageName(r.language),
      at: time(r.sentAt),
    }),
    sentAt: time(r.sentAt),
    languageName: languageName(r.language),
    status: r.answeredAt
      ? { tone: 'success', text: t('merchantRequests.status.answered') }
      : { tone: 'info', text: t('merchantRequests.status.new') },
    isAnswered: !!r.answeredAt,
    answeredOn: r.answeredAt
      ? t('merchantRequests.private.answeredOn', { at: time(r.answeredAt) })
      : null,
    group: t(`merchantRequests.private.people.${plural(r.groupSize)}`, {
      count: r.groupSize,
    }),
    dates: formatDateRange(r.dateFrom, r.dateTo, intlLocale),
    interests: r.interests.trim() || null,
    day: {
      weekday: datePart(r.dateFrom, { weekday: 'short' }),
      day: datePart(r.dateFrom, { day: 'numeric' }),
      month: datePart(r.dateFrom, { month: 'short' }),
    },
    mailto: replyHref(r.email, r.language, 'private'),
  })

  const setAnswered = (id: string, answered: boolean) =>
    update(s => ({
      ...s,
      data: {
        ...s.data,
        privateTourRequests: s.data.privateTourRequests.map((r) => {
          if (r.id !== id)
            return r
          if (!answered) {
            const reopened = { ...r }

            delete reopened.answeredAt

            return reopened
          }

          return { ...r, answeredAt: demoNow(s.clockStartedAt).toISOString() }
        }),
      },
    }))

  return {
    tabs: [
      {
        id: 'advice' as const,
        label: t('merchantRequests.tab.advice'),
        count: adviceRequests.length,
      },
      {
        id: 'private' as const,
        label: t('merchantRequests.tab.private'),
        count: privateTourRequests.length,
      },
      {
        id: 'questions' as const,
        label: t('merchantRequests.tab.questions'),
        count: adviceQuestions.questions.length,
      },
    ],
    adviceRows: newestFirst(adviceRequests).map(adviceRow),
    privateRows: newestFirst(privateTourRequests).map(privateRow),
    markAnswered: (id: string) => setAnswered(id, true),
    undoAnswered: (id: string) => setAnswered(id, false),
  }
}
