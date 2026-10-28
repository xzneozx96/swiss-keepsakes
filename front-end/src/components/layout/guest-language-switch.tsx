import type { Language } from '@/contexts/locale-context'

import { useLocale } from '@/contexts/locale-context'

const languages: { id: Language, label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'de', label: 'DE' },
]

/** The visible EN and DE switch of every public page. `setLanguage` navigates to the same page under the other prefix and stores the choice. */
export function GuestLanguageSwitch() {
  const { language, setLanguage, t } = useLocale()

  return (
    <div className="flex justify-end px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
      <div
        aria-label={t('shell.language.label')}
        className="flex rounded-full bg-surface p-0.5"
        role="group"
      >
        {languages.map(l => (
          <button
            key={l.id}
            aria-pressed={language === l.id}
            className={`h-8 min-w-10 rounded-full px-3 text-xs font-medium outline-none focus-visible:focus-ring ${
              language === l.id ? 'bg-accent text-accent-foreground' : 'text-muted'
            }`}
            type="button"
            onClick={() => setLanguage(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
