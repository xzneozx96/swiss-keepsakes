import type { ActionTone } from '@/components/layout/action-style'
import type { Language } from '@/contexts/locale-context'

import { Drawer, Label, Radio, RadioGroup } from '@heroui/react'
import { useState } from 'react'

import { LanguageIcon } from '@/components/icons'
import { roundAction, toneClass } from '@/components/layout/action-style'
import { useLocale, useUrlLanguage } from '@/contexts/locale-context'
import { isLanguage } from '@/lib/language-routing'

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
              <RadioGroup
                aria-label={t('shell.language.title')}
                name="language"
                value={language}
                onChange={(id) => {
                  if (!isLanguage(id))
                    return
                  setLanguage(id)
                  setOpen(false)
                }}
              >
                {languages.map(l => (
                  // onChange does not fire for the checked option; tapping it just closes.
                  <Radio key={l.id} value={l.id} onClick={() => l.id === language && setOpen(false)}>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    <Radio.Content>
                      <Label>{l.name}</Label>
                    </Radio.Content>
                  </Radio>
                ))}
              </RadioGroup>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  )
}
