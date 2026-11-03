import type { ReactNode } from 'react'
import type { Check, PublishChecks } from '../lib/publish-checks'

import { useState } from 'react'

import { ChevronDownIcon, StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { StoryChecksList } from './story-checks-list'

/**
 * Phones: the checks fold into one line above Publish, fixed over the page and above the merchant tab bar (h-16). The
 * line opens the list, which opens by itself while something blocks; Edit and Show close it and jump.
 */
export function StoryPublishBar({ checks, publishButton, onFix }: { checks: PublishChecks, publishButton: ReactNode, onFix: (check: Check) => void }) {
  const { t } = useLocale()
  const { blocking, warnings } = checks
  const [expanded, setExpanded] = useState(blocking.length > 0)
  const summary = blocking.length > 0
    ? t(blocking.length === 1 ? 'storyPublish.checks.blocking.one' : 'storyPublish.checks.blocking.other', { count: blocking.length })
    : warnings.length > 0 ? t('storyPublish.bar.readyLook', { count: warnings.length }) : t('storyPublish.bar.ready')
  const Icon = blocking.length > 0 ? StatusDangerIcon : warnings.length > 0 ? StatusWarningIcon : StatusSuccessIcon

  return (
    <div className="fixed inset-x-0 bottom-16 z-20 flex flex-col border-t border-separator bg-surface shadow-overlay" data-testid="publish-bar">
      {expanded && (
        <div className="max-h-[42dvh] overflow-y-auto border-b border-separator px-4 py-3">
          <StoryChecksList
            checks={checks}
            onFix={(check) => {
              setExpanded(false)
              onFix(check)
            }}
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <button aria-expanded={expanded} aria-label={t('storyPublish.bar.toggle')} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-start text-sm font-medium outline-none focus-visible:focus-ring" type="button" onClick={() => setExpanded(open => !open)}>
          <Icon aria-hidden className={`shrink-0 ${blocking.length > 0 ? 'text-danger' : warnings.length > 0 ? 'text-warning' : 'text-success'}`} size={18} />
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <ChevronDownIcon aria-hidden className={`shrink-0 text-muted transition-transform ${expanded ? '' : 'rotate-180'}`} size={16} />
        </button>
        {publishButton}
      </div>
    </div>
  )
}
