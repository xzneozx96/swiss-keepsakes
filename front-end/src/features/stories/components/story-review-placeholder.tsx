import { Button } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'

/** Stands in for the Review and publish screen until it is built (T-E4.3e replaces this file). */
export function StoryReviewPlaceholder({ onBack }: { onBack: () => void }) {
  const { t } = useLocale()

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-start gap-3 py-4">
      <h2 className="text-base font-semibold">{t('storyEditor.review.title')}</h2>
      <p className="text-sm text-muted">{t('storyEditor.review.placeholder')}</p>
      <Button className="min-h-11" variant="secondary" onPress={onBack}>{t('storyEditor.back.toWriting')}</Button>
    </div>
  )
}
