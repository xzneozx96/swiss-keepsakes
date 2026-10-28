import type { Language } from '@/contexts/locale-context'

import { useMatches } from '@tanstack/react-router'

import { InfoIcon } from '@/components/icons'
import { useLocale, useUrlLanguage } from '@/contexts/locale-context'

function hasAvailableLanguages(data: unknown): data is { availableLanguages: Language[] } {
  return typeof data === 'object' && data !== null && 'availableLanguages' in data && Array.isArray(data.availableLanguages)
}

/** Says the page is shown in the address language only, when the stored language has no version of it (ADR-002 step 7). The stored language is known only after hydration, so the notice appears then. */
export function LanguageNotice() {
  const { preferredLanguage, t } = useLocale()
  const urlLanguage = useUrlLanguage()
  const available = useMatches({
    select: (matches) => {
      const data = matches.at(-1)?.loaderData

      // An empty list means no published version is known for the page: no notice.
      return hasAvailableLanguages(data) && data.availableLanguages.length > 0 ? data.availableLanguages : undefined
    },
  })

  const shown = urlLanguage && preferredLanguage && available && !available.includes(preferredLanguage)

  // The live region is always in the page and empty until the stored language is known, so screen readers announce the text when it arrives.
  return (
    <div aria-live="polite" role="status">
      {shown && (
        <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
          <p className="flex items-start gap-2 rounded-xl bg-surface-secondary px-3 py-2 text-sm text-foreground">
            <InfoIcon aria-hidden className="mt-0.5 shrink-0 text-muted" size={16} />
            {t(urlLanguage === 'en' ? 'shell.notice.onlyEn' : 'shell.notice.onlyDe')}
          </p>
        </div>
      )}
    </div>
  )
}
