import type { MessageKey } from '@/i18n/en'
import type { IntlLocale } from '@/lib/format'

import { I18nProvider } from '@heroui/react'
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { en } from '@/i18n/en'
import { readStored, writeStored } from '@/lib/storage'

export type Language = 'en' | 'de'

type Dictionary = Record<MessageKey, string>

const loaded: Partial<Record<Language, Dictionary>> = { en }
const loaders: Record<Language, () => Promise<Dictionary>> = {
  en: () => Promise.resolve(en),
  de: () => import('@/i18n/de').then(module => module.de),
}
const intlLocales: Record<Language, IntlLocale> = { en: 'en-CH', de: 'de-CH' }
const STORAGE_KEY = 'sk.language'

/** Only English ships in the first load. German is its own chunk, fetched once it is needed. */
export function loadDictionary(language: Language): Promise<Dictionary> {
  return loaders[language]().then((dictionary) => {
    loaded[language] = dictionary

    return dictionary
  })
}

export function storedLanguage(): Language {
  return readStored<unknown>(STORAGE_KEY, 'en') === 'de' ? 'de' : 'en'
}

/** The saved language, or English when its messages could not be loaded (offline, a stale page). The saved choice stays, so the next visit tries again. */
function initialLanguage(): Language {
  const saved = storedLanguage()

  return loaded[saved] ? saved : 'en'
}

function dictionaryOf(language: Language): Dictionary {
  const dictionary = loaded[language]

  if (!dictionary)
    throw new Error(`The ${language} messages are not loaded`)

  return dictionary
}

function useDictionary(language: Language): Dictionary | undefined {
  const [, setLoadedCount] = useState(0)

  useEffect(() => {
    if (loaded[language])
      return
    let live = true

    loadDictionary(language).then(
      () => live && setLoadedCount(count => count + 1),
      () => undefined,
    )

    return () => {
      live = false
    }
  }, [language])

  return loaded[language]
}

interface LocaleContextValue {
  language: Language
  /** Intl locale for numbers, dates and HeroUI's date components. */
  intlLocale: IntlLocale
  setLanguage: (language: Language) => void
  /** Copy for the current language; `{name}` placeholders are filled from `vars`. */
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const PLACEHOLDER = /\{(\w+)\}/g

function fill(text: string, vars?: Record<string, string | number>): string {
  return vars
    ? text.replace(PLACEHOLDER, (match, name: string) =>
        name in vars ? String(vars[name]) : match)
    : text
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const latestRequestRef = useRef(0)

  const changeLanguage = useCallback((next: Language) => {
    // The last tap wins, even if an earlier language arrives after it. If the messages cannot
    // be loaded the guest stays in the current language.
    const request = ++latestRequestRef.current

    loadDictionary(next).then(
      () => {
        if (request !== latestRequestRef.current)
          return
        setLanguage(next)
        writeStored(STORAGE_KEY, next)
      },
      () => undefined,
    )
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      intlLocale: intlLocales[language],
      setLanguage: changeLanguage,
      t: (key, vars) => fill(dictionaryOf(language)[key], vars),
    }),
    [language, changeLanguage],
  )

  return (
    <LocaleContext value={value}>
      {/* React Aria locale: Swiss date order and Monday as first weekday. */}
      <I18nProvider locale={value.intlLocale}>{children}</I18nProvider>
    </LocaleContext>
  )
}

/**
 * Renders its children in a fixed language without touching the visitor's saved choice: M13's
 * guest preview shows the page in English or German whatever language the merchant uses.
 */
export function LocaleOverride({
  language,
  children,
}: {
  language: Language
  children: React.ReactNode
}) {
  const messages = useDictionary(language)
  const value = useMemo<LocaleContextValue | undefined>(
    () =>
      messages && {
        language,
        intlLocale: intlLocales[language],
        setLanguage: () => undefined,
        t: (key, vars) => fill(messages[key], vars),
      },
    [language, messages],
  )

  if (!value)
    return null

  return (
    <LocaleContext value={value}>
      <I18nProvider locale={value.intlLocale}>{children}</I18nProvider>
    </LocaleContext>
  )
}

export function useLocale(): LocaleContextValue {
  const context = use(LocaleContext)

  if (!context) {
    throw new Error('useLocale must be used inside LocaleProvider')
  }

  return context
}
