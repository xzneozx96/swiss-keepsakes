import { FieldError, Input, Label, TextField } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { youtubeId, youtubePoster } from '../lib/media-block'

/**
 * The Video tab: a YouTube link and a title. The error shows only once something is typed; an empty field shows the help line.
 * A valid link shows YouTube's poster picture, which loads nothing else from YouTube (guests load the player on play).
 */
export function InsertVideo({ link, title, onLink, onTitle }: {
  link: string
  title: string
  onLink: (value: string) => void
  onTitle: (value: string) => void
}) {
  const { t } = useLocale()
  const id = youtubeId(link)
  const invalid = link.trim() !== '' && id === null

  return (
    <div className="flex flex-col gap-4">
      <TextField fullWidth isInvalid={invalid} type="url" value={link} onChange={onLink}>
        <Label>{t('storyMedia.video.link')}</Label>
        <Input placeholder="https://www.youtube.com/watch?v=…" />
        <FieldError>{t('storyMedia.video.invalid')}</FieldError>
      </TextField>
      {!invalid && <p className="-mt-2 text-sm text-muted">{t('storyMedia.video.help')}</p>}
      {id && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-default">
          <img alt="" className="absolute inset-0 size-full object-cover" src={youtubePoster(id)} />
        </div>
      )}
      <TextField fullWidth maxLength={300} value={title} onChange={onTitle}>
        <Label>{t('storyMedia.video.title')}</Label>
        <Input />
      </TextField>
      <p className="-mt-2 text-sm text-muted">{t('storyMedia.video.titleHint')}</p>
    </div>
  )
}
