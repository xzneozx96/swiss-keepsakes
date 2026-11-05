import type { StoryGroupDetail, StoryVersionText } from '@sk/api-contract'
import type { StoryPreviewPageProps } from '../components/story-preview-page'
import type { StoryFields } from '../lib/draft'
import type { StoryLanguage } from '../lib/search-params'

import { storyBodyMediaRefs, storyBodyPinIds } from '@sk/domain/content'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { useDataClient } from '@/features/data-client'
import { useKeepsakeLookup } from '@/features/keepsakes/api/queries'
import { mediaQueries } from '@/features/media/api/queries'
import { thumbOf } from '@/features/media/lib/rules'
import { usePinLookup } from '@/features/places/api/queries'
import { sessionUserQuery } from '@/features/stores/api/queries'
import { useStoryLookup } from '../api/queries'
import { accountNameOf } from '../lib/draft'
import { keepsakesOf, pinHrefFor, placesOf, previewPin, relatedOf } from '../lib/preview-rules'

type Body = StoryVersionText['body']
type Media = StoryVersionText['media'][number]

/** The width of the cover on a phone at twice the density. */
const COVER_WIDTH = 800
const NO_FILES: Media[] = []

/**
 * Everything the story page needs to draw the draft held in memory (`fields`, not the stored copy): the files of the cover
 * and of the body's photos and recordings, the pins, keepsakes and stories the story names, and the account's name. A list
 * is read only when the story names something in it, and while it loads its part of the page is empty.
 */
export function useStoryPreview({ group, language, fields }: { group: StoryGroupDetail, language: StoryLanguage, fields: StoryFields }): StoryPreviewPageProps {
  const client = useDataClient()
  const { storeId } = group
  const body = fields.body as Body
  const pinIds = storyBodyPinIds(fields.body as Parameters<typeof storyBodyPinIds>[0])
  const fileIds = [...new Set([...(fields.coverMediaId ? [fields.coverMediaId] : []), ...storyBodyMediaRefs(fields.body as Parameters<typeof storyBodyMediaRefs>[0]).map(ref => ref.id)])]
  const files = useQueries({
    queries: fileIds.map(id => mediaQueries.file(client, storeId, id)),
    combine: results => results.flatMap(result => (result.data?.status === 'ready' ? [result.data] : NO_FILES)),
  })
  const pins = usePinLookup(storeId, [...pinIds, ...group.placeIds])
  const keepsakes = useKeepsakeLookup(storeId, group.keepsakeProductIds)
  const stories = useStoryLookup(storeId, group.relatedGroupIds)
  const session = useQuery(sessionUserQuery)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const version = group.versions[language]
  const cover = fields.coverMediaId ? files.find(file => file.id === fields.coverMediaId) : undefined
  const previewPins = (pins.data?.items ?? []).map(item => previewPin(item, language))
  const accountName = accountNameOf(session.data)

  return {
    language,
    title: fields.title,
    excerpt: fields.excerpt,
    cover: cover ? thumbOf(cover, COVER_WIDTH) ?? undefined : undefined,
    author: accountName || version?.draft?.authorName || version?.published?.authorName || '',
    publishedOn: version?.publishedAt?.slice(0, 10) ?? today,
    today,
    review: group.kind === 'editorial_review' && fields.checkedOn ? { checkedOn: fields.checkedOn } : null,
    body,
    media: files,
    pinHref: pinHrefFor(previewPins, language),
    places: placesOf(group.placeIds, previewPins),
    keepsakes: keepsakesOf(group.keepsakeProductIds, keepsakes.data?.items ?? [], language),
    related: relatedOf(group.relatedGroupIds, stories.data?.items ?? [], language, group.id),
  }
}
