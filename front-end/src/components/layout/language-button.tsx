import type { ActionTone } from '@/components/layout/action-style'
import type { Language } from '@/contexts/locale-context'

import { Drawer } from '@heroui/react'
import { useState } from 'react'

import { CheckIcon, LanguageIcon } from '@/components/icons'
import { roundAction, toneClass } from '@/components/layout/action-style'
import { useLocale, useUrlLanguage } from '@/contexts/locale-context'

// Language names stay in their own language, so they are not dictionary keys.
const languages: { id: Language, name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'de', name: 'Deutsch' },
]

/**
 * Round language action for a public screen's top area; 44px touch target. It opens a sheet with
 * the two languages. `setLanguage` navigates to the same page under the other prefix and stores
 * the choice. Without a language in the URL (account, cart) there is no page language to switch.
 */
export function LanguageButton({ tone = 'floating' }: { tone?: ActionTone }) {
  const { language, setLanguage, t } = useLocale()
  const hasUrlLanguage = useUrlLanguage() !== undefined
  const [open, setOpen] = useState(false)

  if (!hasUrlLanguage)
    return null

  return (
    <>
      <button
        aria-label={t('shell.language.button')}
        className={`${roundAction} ${toneClass[tone]}`}
        type="button"
        onClick={() => setOpen(true)}
      >
        <LanguageIcon size={22} />
      </button>
      <Drawer.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content className="mx-auto max-w-[560px]" placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header className="flex items-center justify-between">
              <Drawer.Heading className="text-title">{t('shell.language.title')}</Drawer.Heading>
              <Drawer.CloseTrigger aria-label={t('merchantOrder.sheet.close')} />
            </Drawer.Header>
            <Drawer.Body className="pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              <div
                aria-label={t('shell.language.title')}
                className="flex flex-col divide-y divide-separator"
                role="radiogroup"
              >
                {languages.map((l) => {
                  const checked = l.id === language
                  return (
                    <button
                      key={l.id}
                      aria-checked={checked}
                      className="flex min-h-12 w-full items-center justify-between gap-3 px-1 text-start text-base outline-none hover:bg-surface-secondary focus-visible:focus-ring active:bg-surface-secondary"
                      role="radio"
                      type="button"
                      onClick={() => {
                        if (!checked)
                          setLanguage(l.id)
                        setOpen(false)
                      }}
                    >
                      {l.name}
                      {checked && <CheckIcon aria-hidden className="shrink-0" size={20} />}
                    </button>
                  )
                })}
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  )
}
