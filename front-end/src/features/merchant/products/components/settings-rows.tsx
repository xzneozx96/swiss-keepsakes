import type { IconComponent } from '@/components/icons'
import type { Language } from '@/contexts/locale-context'

import { Button } from '@heroui/react'
import { LANGUAGES } from '@sk/domain/catalog'

import { useState } from 'react'

import { ChevronRightIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { rowClass, RowIcon } from '@/features/account/components/settings-list'

/** A hairline above every row but the first, inset past the icon tile (as on the account screen). */
export const rowHairline
  = 'relative not-first:before:absolute not-first:before:end-0 not-first:before:top-0 not-first:before:h-px not-first:before:bg-separator/70 not-first:before:start-4'

/** A titled group of rows in one rounded surface, as on the account screen. */
export function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold text-muted">{title}</h2>
      <div className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-surface">
        {children}
      </div>
    </section>
  )
}

/** One tappable row: icon tile, title, one muted line, chevron. */
export function NavRow({
  icon,
  title,
  description,
  tone = 'default',
  isInvalid = false,
  onPress,
}: {
  icon: IconComponent
  title: string
  description?: string
  tone?: 'default' | 'accent'
  isInvalid?: boolean
  onPress: () => void
}) {
  return (
    <button
      className={`${rowClass} min-w-0 flex-1`}
      type="button"
      onClick={onPress}
    >
      <RowIcon icon={icon} tone={isInvalid ? 'danger' : tone} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-1 font-medium">{title}</span>
        {description && (
          <span
            className={`line-clamp-2 text-sm ${isInvalid ? 'text-danger' : 'text-muted'}`}
          >
            {description}
          </span>
        )}
      </span>
      <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={20} />
    </button>
  )
}

/** EN | DE inside a sheet, which hides the step's own switch. */
export function SheetLanguage({
  language,
  onChange,
}: {
  language: Language
  onChange: (language: Language) => void
}) {
  const { t } = useLocale()

  return (
    <div
      aria-label={t('products.sections.sheetLanguage')}
      className="flex w-fit gap-1 rounded-full bg-surface-secondary p-1"
      role="group"
    >
      {LANGUAGES.map(lang => (
        <Button
          key={lang}
          aria-pressed={language === lang}
          size="sm"
          variant={language === lang ? 'primary' : 'tertiary'}
          onPress={() => onChange(lang)}
        >
          {lang.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}

/** A sheet with the step's EN | DE switch inside it, a Done button, and whatever fields `children` draws. */
export function TextSheet({
  title,
  language,
  onClose,
  children,
}: {
  title: string
  language: Language
  onClose: () => void
  children: (language: Language) => React.ReactNode
}) {
  const { t } = useLocale()
  const [lang, setLang] = useState<Language>(language)

  return (
    <SheetFrame
      isOpen
      footer={(
        <Button fullWidth size="lg" onPress={onClose}>
          {t('products.sections.sheetDone')}
        </Button>
      )}
      title={title}
      onClose={onClose}
    >
      <SheetLanguage language={lang} onChange={setLang} />
      {children(lang)}
    </SheetFrame>
  )
}
