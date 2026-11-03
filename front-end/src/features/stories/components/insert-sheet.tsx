import type { MediaItem, MediaList } from '@sk/api-contract'
import type { MediaNodeInput } from '../lib/media-block'
import type { StoryLanguage } from '../lib/search-params'
import type { RecordingChoice } from './insert-recording'

import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { PageTabs, TabPanel } from '@/components/page-tabs'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { LibraryChoice } from '@/features/media/components/library-picker'
import { audioNode, imageNode, MEDIA_LIMIT, videoNode, youtubeId } from '../lib/media-block'
import { InsertRecording } from './insert-recording'
import { InsertVideo } from './insert-video'

type Tab = 'image' | 'video' | 'audio'

/**
 * Insert a photo, a YouTube video or a recording between paragraphs. One sheet with three tabs; the photo wall sits inside it (a sheet
 * never opens from another sheet). `getMediaCount` is the editor's live count, read on every render and again when Insert is pressed, and
 * `onInsert` answers false when the editor refused (the limit), so two quick presses at 99 still end at 100. At the limit the sheet says so
 * and Insert is off.
 */
export function InsertSheet({ storeId, language, isOpen, firstTab, getMediaCount, onInsert, onClose }: {
  storeId: string
  language: StoryLanguage
  isOpen: boolean
  firstTab: Tab
  getMediaCount: () => number
  onInsert: (node: MediaNodeInput) => boolean
  onClose: () => void
}) {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>(firstTab)
  const [photos, setPhotos] = useState<string[]>([])
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')
  const [recording, setRecording] = useState<RecordingChoice | null>(null)
  const [refused, setRefused] = useState(false)
  const atLimit = refused || getMediaCount() >= MEDIA_LIMIT
  const videoId = youtubeId(link)
  const valid = tab === 'image' ? photos.length > 0 : tab === 'video' ? videoId !== null : recording !== null

  const close = () => {
    setTab(firstTab)
    setPhotos([])
    setLink('')
    setTitle('')
    setRecording(null)
    setRefused(false)
    onClose()
  }

  /** The library item of a photo the wall showed, for its description. */
  const photoItem = (id: string): Pick<MediaItem, 'id' | 'alt'> => {
    const lists = queryClient.getQueriesData<MediaList>({ queryKey: queryKeys.media.list })

    return lists.flatMap(([, data]) => data?.items ?? []).find(item => item.id === id) ?? { id, alt: {} }
  }

  const insert = () => {
    if (getMediaCount() >= MEDIA_LIMIT) {
      setRefused(true)

      return
    }
    const node = tab === 'image' ? imageNode(photoItem(photos[0]!), language) : tab === 'video' ? videoNode(videoId!, title) : audioNode(recording!, language)

    if (onInsert(node))
      close()
    else
      setRefused(true)
  }

  return (
    <SheetFrame
      footer={(
        <>
          <Button isDisabled={!valid || atLimit} onPress={insert}>{t(`storyMedia.insert.add.${tab}`)}</Button>
          <Button variant="tertiary" onPress={close}>{t('storyMedia.insert.cancel')}</Button>
        </>
      )}
      isOpen={isOpen}
      title={t('storyMedia.insert.title')}
      onClose={close}
    >
      {atLimit && <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning-soft-foreground" role="alert">{t('storyMedia.insert.limit', { count: MEDIA_LIMIT })}</p>}
      <PageTabs
        equal
        label={t('storyMedia.insert.tabs')}
        selected={tab}
        sticky={false}
        tabs={[
          { id: 'image', label: t('storyMedia.insert.tab.image') },
          { id: 'video', label: t('storyMedia.insert.tab.video') },
          { id: 'audio', label: t('storyMedia.insert.tab.audio') },
        ]}
        onSelect={setTab}
      >
        <TabPanel className="mt-4" id="image">
          <LibraryChoice readyOnly single room={1} selected={photos} storeId={storeId} used={[]} onSelectedChange={setPhotos} />
        </TabPanel>
        <TabPanel className="mt-4" id="video">
          <InsertVideo link={link} title={title} onLink={setLink} onTitle={setTitle} />
        </TabPanel>
        <TabPanel className="mt-4" id="audio">
          <InsertRecording language={language} selected={recording?.id ?? null} storeId={storeId} onSelect={setRecording} />
        </TabPanel>
      </PageTabs>
    </SheetFrame>
  )
}
