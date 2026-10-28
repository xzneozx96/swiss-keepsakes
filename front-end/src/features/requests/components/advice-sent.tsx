import { buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { AssistantHeader, AssistantSays } from '@/components/assistant'
import { EmptyState } from '@/components/empty-state'

import { MessageIcon } from '@/components/icons'
import { LanguageButton } from '@/components/layout/language-button'
import { useLocale } from '@/contexts/locale-context'
import { shop } from '@/features/catalog/seed'
import { useAdviceRequests } from '@/features/requests/api/queries'

/**
 * C21 sent (spec §4.10, R19): the chat ends with the assistant's thank-you; the team takes
 * over by email. No reply time is promised (R03) and nothing is generated; the answers are
 * listed as sent.
 */
export function AdviceSent({ requestId }: { requestId?: string }) {
  const { language, t } = useLocale()
  const request = useAdviceRequests(requests =>
    requests.find(r => r.id === requestId),
  )

  if (!request) {
    return (
      <div className="flex flex-col gap-6 px-6 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
        <div className="flex items-center gap-2">
          <h1 className="min-w-0 flex-1 font-serif text-display">{t('advice.title')}</h1>
          <LanguageButton tone="bar" />
        </div>
        <EmptyState
          action={{ label: t('placeholder.backHome'), to: '/$lang', params: { lang: language } }}
          icon={MessageIcon}
          message={t('advice.sent.missing')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <AssistantHeader subtitle={shop.name} />
      <h1 className="sr-only">{t('advice.title')}</h1>
      <ol
        aria-label={t('advice.thread')}
        className="flex flex-1 flex-col gap-3 px-4 pt-5 pb-6"
      >
        <AssistantSays avatar={false}>
          {t('advice.sent.thanks', { email: request.email })}
        </AssistantSays>
        <AssistantSays>
          <span className="mb-2 block font-medium">
            {t('advice.sent.answers')}
          </span>
          <dl className="flex flex-col divide-y divide-separator">
            {request.answers.map(a => (
              <div key={a.questionId} className="flex flex-col py-2.5">
                <dt className="text-xs text-muted" lang={a.questionLanguage}>
                  {a.question}
                </dt>
                <dd className="font-medium">{a.answer}</dd>
              </div>
            ))}
          </dl>
        </AssistantSays>
      </ol>
      <div className="sticky bottom-0 z-30 flex border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <Link
          className={buttonVariants({ fullWidth: true, size: 'lg' })}
          params={{ lang: language }}
          to="/$lang"
        >
          {t('placeholder.backHome')}
        </Link>
      </div>
    </div>
  )
}
