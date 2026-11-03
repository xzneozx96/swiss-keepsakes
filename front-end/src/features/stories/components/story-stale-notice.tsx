import { Button } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'

/** Someone saved this story after it was opened (412): nothing more is saved from this page until it is reloaded. */
export function StoryStaleNotice({ onReload }: { onReload: () => void }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground" role="alert">
      <p>{t('storyEditor.stale')}</p>
      <Button className="min-h-11" variant="secondary" onPress={onReload}>{t('storyEditor.reload')}</Button>
    </div>
  )
}
