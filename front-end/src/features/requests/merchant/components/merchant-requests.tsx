import type { RequestsTab } from '@/features/requests/merchant/lib/search-params'
import type { MessageKey } from '@/i18n/en'

import { Skeleton } from '@heroui/react'

import { RequestsIcon } from '@/components/icons'

import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { useLocale } from '@/contexts/locale-context'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

import { useMerchantRequests } from '../hooks/use-merchant-requests'
import { AdviceRows } from './advice-rows'
import { QuestionSetEditor } from './question-set-editor'

/** The question set: a card per question with its text lines and a switch. */
function QuestionsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-surface"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3 rounded-lg" />
            <Skeleton className="h-3.5 w-1/2 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Requests (spec §3.2: M19 advice; outline step 15) in the M03 page shape: the title, then
 * the page of its tab. Advice and Questions are pages under Inquiries (/store/requests,
 * /questions). Advice is an inbox, phone cards and a table from 1024px; Questions holds the
 * trip assistant's question set (M19). Private tour requests are dormant (ADR-012).
 */
export function MerchantRequests({ tab }: { tab: RequestsTab }) {
  const { t } = useLocale()
  const { tabs, adviceRows } = useMerchantRequests()
  const isLoading = useSimulatedLoading()

  const emptyState = (message: MessageKey) => ({
    action: {
      label: t('merchantRequests.empty.action'),
      to: '/store' as const,
    },
    icon: RequestsIcon,
    message: t(message),
  })

  const label = (id: RequestsTab) => tabs.find(x => x.id === id)?.label ?? ''

  return (
    <div className="flex flex-col gap-4">
      <MerchantPageHeader
        description={t('merchantRequests.intro')}
        title={t(`merchantRequests.tab.${tab}`)}
      />
      {tab === 'advice' && (
        <AdviceRows
          empty={emptyState('merchantRequests.advice.empty')}
          isLoading={isLoading}
          label={label('advice')}
          rows={adviceRows}
        />
      )}
      {tab === 'questions'
        && (isLoading ? <QuestionsSkeleton /> : <QuestionSetEditor />)}
    </div>
  )
}
