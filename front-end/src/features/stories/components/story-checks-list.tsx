import type { Check, PublishChecks } from '../lib/publish-checks'

import { StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { checkText } from '../lib/check-text'

/** What stops publishing (each with Edit, which jumps to where it is fixed), then what only warns (each with Show). */
export function StoryChecksList({ checks, onFix }: { checks: PublishChecks, onFix: (check: Check) => void }) {
  const { t } = useLocale()
  const { blocking, warnings } = checks

  return (
    <div className="flex flex-col gap-3" data-testid="publish-checks">
      <h3 className="text-sm font-semibold">
        {blocking.length > 0 ? t(blocking.length === 1 ? 'storyPublish.checks.blocking.one' : 'storyPublish.checks.blocking.other', { count: blocking.length }) : t('storyPublish.checks.ready')}
      </h3>
      <ul className="flex flex-col gap-2">
        {blocking.map(check => (
          <li key={check.code} className="flex items-start gap-2 text-sm font-medium" data-check={check.code}>
            <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0 text-danger" size={16} />
            <span className="min-w-0 flex-1 text-pretty">{checkText(t, check)}</span>
            <button className="min-h-11 min-w-11 shrink-0 text-sm text-foreground underline underline-offset-4 lg:min-h-0 lg:min-w-0" type="button" onClick={() => onFix(check)}>{t('storyPublish.checks.edit')}</button>
          </li>
        ))}
        {blocking.length === 0 && (
          <li className="flex items-start gap-2 text-sm">
            <StatusSuccessIcon aria-hidden className="mt-0.5 shrink-0 text-success" size={16} />
            <span>{t('storyPublish.checks.allSet')}</span>
          </li>
        )}
      </ul>
      {warnings.length > 0 && (
        <>
          <h3 className="pt-1 text-sm font-semibold">{t('storyPublish.checks.warnings', { count: warnings.length })}</h3>
          <ul className="flex flex-col gap-2">
            {warnings.map(check => (
              <li key={`${check.code}-${check.name ?? ''}`} className="flex items-start gap-2 text-sm" data-check={check.code}>
                <StatusWarningIcon aria-hidden className="mt-0.5 shrink-0 text-warning" size={16} />
                <span className="min-w-0 flex-1 text-pretty">{checkText(t, check)}</span>
                <button className="min-h-11 min-w-11 shrink-0 text-sm text-muted underline underline-offset-4 lg:min-h-0 lg:min-w-0" type="button" onClick={() => onFix(check)}>{t('storyPublish.checks.show')}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
