import type { ContentLanguage, StoryBody } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { MediaRecord, MediaRepository, StoryRepository, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { emptyStoryBody, storyBodyMediaRefs } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface StoryVersionText {
  // `published` only when this text is what guests read: a published version with no draft on top of it.
  status: 'draft' | 'published'
  title: string
  cover: MediaRecord | null
  body: StoryBody
  media: MediaRecord[]
  updatedAt: Date
}

// The text of one language version as the editor last left it, for a staff preview: the draft if there is one, else
// the published text. A version that holds no document yet reads as an empty draft.
export function makeGetStoryVersionText<T>({ uow, stories, media }: { uow: UnitOfWork<T>, stories: Pick<StoryRepository<T>, 'findVersion'>, media: Pick<MediaRepository<T>, 'findMany'> }) {
  return async (actor: Actor, storeId: string, groupId: string, language: ContentLanguage): Promise<Result<StoryVersionText>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const version = await stories.findVersion(tx, storeId, groupId, language)
      if (!version)
        return fail({ reason: 'not-found' })
      const doc = version.draft ?? version.published
      const body = doc?.body ?? emptyStoryBody
      // The database ids are lower case; a stored node may spell its id in capitals.
      const bodyIds = storyBodyMediaRefs(body).map(ref => ref.id.toLowerCase())
      const wanted = [...new Set([...(doc?.coverMediaId ? [doc.coverMediaId.toLowerCase()] : []), ...bodyIds])]
      const files = wanted.length > 0 ? await media.findMany(tx, storeId, wanted) : []
      const byId = new Map(files.map(file => [file.id, file]))
      return ok({
        status: version.status === 'published' && version.draft === null ? 'published' : 'draft',
        title: doc?.title ?? '',
        cover: (doc?.coverMediaId && byId.get(doc.coverMediaId.toLowerCase())) || null,
        body,
        media: [...new Set(bodyIds)].flatMap(id => byId.get(id) ?? []),
        updatedAt: version.updatedAt,
      })
    })
  }
}
