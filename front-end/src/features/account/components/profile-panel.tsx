import type { Language } from '@/contexts/locale-context'

import { Radio, RadioGroup } from '@heroui/react'
import { useRouter } from '@tanstack/react-router'

import { lastPublicPath } from '@/components/layout/last-public-path'
import { useLocale } from '@/contexts/locale-context'
import { switchLanguagePath } from '@/lib/language-routing'

import { plainItemClass } from './settings-list'

const languages: Language[] = ['en', 'de']

/**
 * Preferences (1.12s): app language. Trip answers moved to each order and booking (C15, C16;
 * 2.17), so the account no longer has a trip card.
 */
export function ProfilePanel() {
  const { t, language, setLanguage } = useLocale()
  const router = useRouter()

  // /account has no language prefix, so the change does not move the page by itself. If the guest came
  // from a public page, return there in the new language. `setLanguage` saves the choice once its messages
  // load, while the target route loads the same messages and takes its language from the address, so
  // starting both together lands in the new language.
  const change = (next: Language) => {
    setLanguage(next)
    const path = lastPublicPath()

    if (path) {
      const queryAt = path.indexOf('?')
      const pathname = queryAt === -1 ? path : path.slice(0, queryAt)
      const query = queryAt === -1 ? '' : path.slice(queryAt)

      router.history.push(switchLanguagePath(pathname, next) + query)
    }
  }

  return (
    <section aria-labelledby="profile-language" className="flex flex-col gap-2">
      <h2
        className="px-1 text-sm font-semibold text-muted"
        id="profile-language"
      >
        {t('account.profile.language.title')}
      </h2>
      <RadioGroup
        aria-labelledby="profile-language"
        className="flex flex-col gap-0 overflow-hidden rounded-2xl bg-surface shadow-surface"
        value={language}
        onChange={v => change(v as Language)}
      >
        {languages.map(l => (
          <Radio
            key={l}
            className={`${plainItemClass} m-0 min-h-14 px-4 py-3`}
            lang={l}
            value={l}
          >
            <Radio.Content className="flex w-full flex-row-reverse items-center justify-between gap-3">
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <span className="font-medium">
                {t(`account.profile.language.${l}`)}
              </span>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      <p className="px-1 text-sm text-muted">
        {t('account.profile.language.hint')}
      </p>
    </section>
  )
}
