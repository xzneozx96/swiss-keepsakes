import type { PartnerAccess } from '../hooks/use-partner-access'

import { Button } from '@heroui/react'

import { EmailIcon, StatusDangerIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { CodeStep } from '@/features/auth/components/sign-in-form'
import { shop } from '@/features/catalog/seed'

/**
 * P01 Partner access (spec §4.8, §5.3, AC12): the shop name and the masked email, "Send
 * code", then C05's code step (1.6r) with the same messages and limits. An unknown, revoked
 * or archived link shows why it does not open and who to ask.
 */
export function PartnerAccessScreen({
  access,
}: {
  access: Exclude<PartnerAccess, { kind: 'report' }>
}) {
  const { t } = useLocale()

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl bg-surface p-5 shadow-surface sm:p-6">
      {access.kind === 'invalid'
        ? (
            <div className="flex flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-danger-soft text-danger-soft-foreground">
                <StatusDangerIcon aria-hidden size={20} />
              </span>
              <h2 className="text-title">{t('partnerAccess.invalid.title')}</h2>
              <p className="text-pretty text-muted">
                {t('partnerAccess.invalid.body', { shop: shop.name })}
              </p>
            </div>
          )
        : (
            <>
              <div className="flex flex-col gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-surface-secondary text-muted">
                  <EmailIcon aria-hidden size={20} />
                </span>
                <h2 className="text-title">
                  {t(
                    access.isSent
                      ? 'partnerAccess.code.title'
                      : 'partnerAccess.start.title',
                  )}
                </h2>
                <p className="text-pretty text-muted">
                  {t(
                    access.isSent
                      ? 'partnerAccess.code.sent'
                      : 'partnerAccess.start.body',
                    { shop: shop.name, email: access.maskedEmail },
                  )}
                </p>
              </div>
              {access.isSent
                ? (
                    <CodeStep view={access} />
                  )
                : (
                    <Button fullWidth size="lg" onPress={access.send}>
                      {t('partnerAccess.start.send')}
                    </Button>
                  )}
              <p className="text-xs text-pretty text-muted">
                {t('partnerAccess.privacy')}
              </p>
            </>
          )}
    </div>
  )
}
