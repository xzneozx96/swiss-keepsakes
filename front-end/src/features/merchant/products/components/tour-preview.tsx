import type { Tour } from '@sk/domain/bookings'
import type { Language } from '@/contexts/locale-context'

import { Button } from '@heroui/react'
import { pickText } from '@sk/domain/shared'

import { useState } from 'react'
import { InfoIcon } from '@/components/icons'
import { LocaleOverride, useLocale } from '@/contexts/locale-context'
import { TourDetail } from '@/features/tours/discovery/tour-detail-page'

const LANGUAGES: Language[] = ['en', 'de']

/**
 * M13's guest preview: the draft rendered by the real C09 page inside a phone frame, in the
 * language the merchant picks. The frame's transform makes the page's fixed bars sit inside
 * it, and the page switches off back, save and booking.
 */
export function TourPreview({
  tour,
  onClose,
}: {
  tour: Tour
  onClose: () => void
}) {
  const { t, language: interfaceLanguage } = useLocale()
  const [language, setLanguage] = useState<Language>(interfaceLanguage)

  return (
    <section className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[430px] flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {t('products.preview.title')}
          </h2>
          <div
            aria-label={t('products.preview.language')}
            className="flex gap-1 rounded-full bg-surface-secondary p-1"
            role="group"
          >
            {LANGUAGES.map(lang => (
              <Button
                key={lang}
                aria-pressed={language === lang}
                size="sm"
                variant={language === lang ? 'primary' : 'tertiary'}
                onPress={() => setLanguage(lang)}
              >
                {lang.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        <p className="flex items-start gap-2 text-sm text-pretty text-muted">
          <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {t('products.preview.note')}
        </p>
      </div>
      <LocaleOverride language={language}>
        <PreviewFrame tour={tour} />
      </LocaleOverride>
      <Button variant="secondary" onPress={onClose}>
        {t('products.preview.backToEdit')}
      </Button>
    </section>
  )
}

function PreviewFrame({ tour }: { tour: Tour }) {
  const { t, language } = useLocale()

  return (
    <div
      aria-label={t('products.preview.frame', {
        name: pickText(tour.name, language).text,
      })}
      className="relative flex h-[min(760px,78vh)] w-full max-w-[430px] flex-col overflow-y-auto overscroll-contain rounded-[2rem] border border-separator bg-background shadow-surface [transform:translateZ(0)]"
      role="region"
    >
      <TourDetail preview tour={tour} />
    </div>
  )
}
