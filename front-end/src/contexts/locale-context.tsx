import type { IntlLocale } from "@/lib/format";
import type { MessageKey } from "@/i18n/en";

import { I18nProvider } from "@heroui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { de } from "@/i18n/de";
import { en } from "@/i18n/en";
import { readStored, writeStored } from "@/lib/storage";

export type Language = "en" | "de";

const messages: Record<Language, Record<MessageKey, string>> = { en, de };
const intlLocales: Record<Language, IntlLocale> = { en: "en-CH", de: "de-CH" };
const STORAGE_KEY = "sk.language";

interface LocaleContextValue {
  language: Language;
  /** Intl locale for numbers, dates and HeroUI's date components. */
  intlLocale: IntlLocale;
  setLanguage: (language: Language) => void;
  /** Copy for the current language; `{name}` placeholders are filled from `vars`. */
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

function fill(text: string, vars?: Record<string, string | number>): string {
  return vars
    ? text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      )
    : text;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    readStored<unknown>(STORAGE_KEY, "en") === "de" ? "de" : "en",
  );

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    writeStored(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      intlLocale: intlLocales[language],
      setLanguage,
      t: (key, vars) => fill(messages[language][key], vars),
    }),
    [language, setLanguage],
  );

  return (
    <LocaleContext.Provider value={value}>
      {/* React Aria locale: Swiss date order and Monday as first weekday. */}
      <I18nProvider locale={value.intlLocale}>{children}</I18nProvider>
    </LocaleContext.Provider>
  );
}

/**
 * Renders its children in a fixed language without touching the visitor's saved choice: M13's
 * guest preview shows the page in English or German whatever language the merchant uses.
 */
export function LocaleOverride({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      intlLocale: intlLocales[language],
      setLanguage: () => undefined,
      t: (key, vars) => fill(messages[language][key], vars),
    }),
    [language],
  );

  return (
    <LocaleContext.Provider value={value}>
      <I18nProvider locale={value.intlLocale}>{children}</I18nProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}
