import type { AdviceRequestView } from '../hooks/use-advice-request'

import { buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { CopyText } from '@/components/copy-text'
import {
  AccountIcon,
  BackIcon,
  EmailIcon,
  MessageIcon,
} from '@/components/icons'
import { MerchantBackBar } from '@/components/layout/merchant-back-bar'
import { useLocale } from '@/contexts/locale-context'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'

/**
 * M19 request detail (outline step 15, AC18) in the M04 frame: back link, the request as the
 * one h1 with when and in which language it was sent, then the questions and answers as the
 * guest saw them. The guest card holds the email and the reply link (D9: replies go by email).
 * Phones: one column; from 1024px the guest card sits in a 300px column on the right.
 */
export function AdviceRequestDetail({ view }: { view: AdviceRequestView }) {
  const { t } = useLocale()

  const answers = (
    <DetailCard
      icon={MessageIcon}
      id="m19-answers"
      title={t('adviceRequest.answers.title')}
    >
      <p className="-mt-2 text-sm text-muted">
        {t('adviceRequest.answers.note')}
      </p>
      <dl className="flex flex-col divide-y divide-separator">
        {view.answers.map((a, i) => (
          <div
            key={`${a.id}-${i}`}
            className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
          >
            <dt className="text-sm text-muted" lang={a.language}>
              {a.question}
              {a.askedIn && (
                <span className="ms-2 inline-block rounded-md bg-surface-secondary px-1.5 text-xs whitespace-nowrap">
                  {a.askedIn}
                </span>
              )}
            </dt>
            <dd className="font-medium whitespace-pre-line [overflow-wrap:anywhere]">
              {a.answer}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">{t('adviceRequest.answers.skipped')}</p>
    </DetailCard>
  )

  const guest = (
    <DetailCard
      icon={AccountIcon}
      id="m19-guest"
      title={t('adviceRequest.guest.title')}
    >
      <CopyText label={t('merchantOrder.guest.email')} value={view.email} />
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-muted">{t('adviceRequest.guest.language')}</span>
        <span className="font-medium">{view.languageName}</span>
      </div>
      <a
        className={`${buttonVariants({ variant: 'secondary' })} w-full`}
        href={view.mailto}
      >
        <EmailIcon aria-hidden size={20} />
        {t('merchantRequests.write')}
      </a>
    </DetailCard>
  )

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-3">
        <MerchantBackBar
          label={t('adviceRequest.back')}
          title={t('adviceRequest.title')}
          to="/store/requests"
        />
        <Link
          className="hidden w-fit items-center gap-1.5 rounded-lg text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:flex"
          to="/store/requests"
        >
          <BackIcon aria-hidden size={16} />
          {t('adviceRequest.back')}
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-title max-lg:sr-only">
            {t('adviceRequest.title')}
          </h1>
          <p className="text-sm text-muted tabular-nums [overflow-wrap:anywhere]">
            {view.email} ·{' '}
            {t('adviceRequest.sent', {
              at: view.sentAt,
              language: view.languageName,
            })}
          </p>
        </div>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        {answers}
        {guest}
      </div>
    </div>
  )
}
