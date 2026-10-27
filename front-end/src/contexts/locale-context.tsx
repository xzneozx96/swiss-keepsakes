import type { IntlLocale, Language } from '@sk/domain/shared'
import type { MessageKey } from '@/i18n/en'

import { I18nProvider } from '@heroui/react'
import { useParams, useRouter } from '@tanstack/react-router'
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { en } from '@/i18n/en'
import { isLanguage, switchLanguagePath, writeLanguageCookie } from '@/lib/language-routing'
import { readStored, writeStored } from '@/lib/storage'

export type { Language }

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

const subscribeToNothing = () => () => undefined

/** False on the server and while React hydrates server HTML, true in every later render. */
function usePastHydration(): boolean {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false)
}

const settling: Partial<Record<Language, Promise<void>>> = {}

/** One promise per language, for `use`: it settles when the messages are loaded or failed, and never rejects. */
function settled(language: Language): Promise<void> {
  return settling[language] ??= loadDictionary(language).then(() => undefined, () => undefined)
}

/** The language in the address (`/de/...`), or undefined on a page without one. Needs a router. */
export function useUrlLanguage(): Language | undefined {
  return useParams({ strict: false, select: params => isLanguage(params.lang) ? params.lang : undefined })
}

/** Reads the address when there is a router; a tree without one (a unit test, a preview) just has the saved language. */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return useRouter({ warn: false })
    ? <RoutedLocaleProvider>{children}</RoutedLocaleProvider>
    : <LocaleState navigateTo={undefined} urlLanguage={undefined}>{children}</LocaleState>
}

function RoutedLocaleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const urlLanguage = useUrlLanguage()
  const navigateTo = useCallback((next: Language) => {
    const { pathname, search, hash } = router.state.location
    const target = switchLanguagePath(pathname, next)

    // On a prefixed page the language is part of the address, so the switch is a navigation.
    if (target !== pathname)
      void router.navigate({ to: target, search, hash })
  }, [router])

  return <LocaleState navigateTo={navigateTo} urlLanguage={urlLanguage}>{children}</LocaleState>
}

function LocaleState({ children, navigateTo, urlLanguage }: {
  children: React.ReactNode
  navigateTo: ((language: Language) => void) | undefined
  urlLanguage: Language | undefined
}) {
  // English while hydrating, like the server's HTML; the saved language is applied after it (below).
  const pastHydration = usePastHydration()
  const [storedChoice, setStoredChoice] = useState<Language>(() => pastHydration ? initialLanguage() : 'en')
  const latestRequestRef = useRef(0)
  // The address wins on a prefixed page. The route loader has loaded its messages, so the first render is already in it.
  const wanted = urlLanguage ?? storedChoice

  // The browser hydrates server HTML that is already in the URL's language, before any route loader has run
  // there. Waiting here for its messages keeps the first client render equal to the server's.
  if (urlLanguage && !loaded[urlLanguage])
    use(settled(urlLanguage))
  // If the messages are still missing (a stale page, a failed load), English shows until they arrive.
  const language = useDictionary(wanted) ? wanted : 'en'

  const changeLanguage = useCallback((next: Language) => {
    // The last tap wins, even if an earlier language arrives after it. If the messages cannot
    // be loaded the guest stays in the current language.
    const request = ++latestRequestRef.current

    loadDictionary(next).then(
      () => {
        if (request !== latestRequestRef.current)
          return
        setStoredChoice(next)
        writeStored(STORAGE_KEY, next)
        writeLanguageCookie(next)

        navigateTo?.(next)
      },
      () => undefined,
    )
  }, [navigateTo])

  // A page rendered on the server and hydrated starts in English, like the server's HTML. The saved language
  // arrives after that. A client-only page already starts in it, so this finds nothing to change there.
  // A prefixed page takes its language from the address and leaves the saved one alone.
  useEffect(() => {
    if (urlLanguage)
      return
    const saved = storedLanguage()

    if (saved === 'en')
      return
    const request = latestRequestRef.current

    loadDictionary(saved).then(
      () => {
        // A tap on the language switch while the messages were on their way wins.
        if (request === latestRequestRef.current)
          setStoredChoice(saved)
      },
      () => undefined,
    )
  }, [urlLanguage])

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
