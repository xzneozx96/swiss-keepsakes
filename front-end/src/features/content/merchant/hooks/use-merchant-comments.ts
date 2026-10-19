import type { ArticleComment } from '@sk/domain/content'
import type { Language } from '@/contexts/locale-context'

import { reviewerName } from '@sk/domain/catalog'

import { dateTimeFormat } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { useDemo } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { avatarUrl } from '@/lib/avatars'
import { publicStaffName } from '../lib/staff'

export const COMMENT_FILTERS = ['notReplied', 'hidden'] as const
export type CommentFilter = (typeof COMMENT_FILTERS)[number]

export interface CommentRowProps {
  id: string
  authorName: string
  avatar: string
  isShop: boolean
  text: string
  /** "13.10.2026, 18:05" in Zurich time. */
  posted: string
  article: { title: string, href: string, language: Language, code: string }
  /** Set on a reply: the name of the comment it answers (one level, A3). */
  replyTo: string | null
  hidden: boolean
  /** A reply whose comment is hidden: C20 hides the whole thread. */
  hiddenWithThread: boolean
  replies: number
  shopReplied: boolean
  /** Only a top-level comment takes a reply (one level, A3). */
  canReply: boolean
}

/**
 * M18 Comments (spec §4.11, AC16): every comment on every story version, newest first. The
 * shop hides, shows again, deletes (with its replies, so none is left without its comment) or
 * replies as the signed-in staff member. C20 reads the same records, so changes show at once.
 */
export function useMerchantComments(filter: CommentFilter[]) {
  const { t, intlLocale } = useLocale()
  const { state, update } = useDemo()
  const { comments, articles, guests } = state.data
  const time = dateTimeFormat(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  })
  const byId = new Map(comments.map(c => [c.id, c]))
  const name = ({ author }: ArticleComment) => {
    if (author.kind === 'shop')
      return author.staffName
    const guest = guests.find(g => g.id === author.guestId)

    return reviewerName(guest?.name ?? 'Guest')
  }

  const all: CommentRowProps[] = [...comments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => {
      const article = articles.find(a => a.id === c.articleId)
      const parent = c.parentId ? byId.get(c.parentId) : undefined
      const replies = comments.filter(r => r.parentId === c.id)

      return {
        id: c.id,
        authorName: name(c),
        avatar: avatarUrl(name(c)),
        isShop: c.author.kind === 'shop',
        text: c.text,
        posted: time.format(new Date(c.createdAt)),
        article: {
          title: article?.title ?? c.articleId,
          href: `#/store/content/articles/${encodeURIComponent(c.articleId)}`,
          language: article?.language ?? 'en',
          code: (article?.language ?? 'en').toUpperCase(),
        },
        replyTo: parent ? name(parent) : null,
        hidden: c.hidden,
        hiddenWithThread: !c.hidden && !!parent?.hidden,
        replies: replies.length,
        shopReplied: replies.some(r => r.author.kind === 'shop'),
        canReply: !c.parentId,
      }
    })

  const inFilter = (row: CommentRowProps, id: CommentFilter) => {
    if (id === 'hidden')
      return row.hidden || row.hiddenWithThread

    return row.canReply && !row.isShop && !row.hidden && !row.shopReplied
  }

  const setComments = (fn: (list: ArticleComment[]) => ArticleComment[]) =>
    update(s => ({
      ...s,
      data: { ...s.data, comments: fn(s.data.comments) },
    }))

  return {
    rows: all.filter(
      row => !filter.length || filter.some(id => inFilter(row, id)),
    ),
    filters: COMMENT_FILTERS.map(id => ({
      id,
      label: t(`merchantComments.filter.${id}`),
      count: all.filter(row => inFilter(row, id)).length,
    })),
    total: all.length,
    staffName: publicStaffName(state.role),
    setHidden: (id: string, hidden: boolean) =>
      setComments(list =>
        list.map(c => (c.id === id ? { ...c, hidden } : c)),
      ),
    remove: (id: string) =>
      setComments(list =>
        list.filter(c => c.id !== id && c.parentId !== id),
      ),
    reply: (parentId: string, text: string) => {
      const parent = byId.get(parentId)

      if (!parent || parent.parentId || !text.trim())
        return
      const reply: ArticleComment = {
        id: `c-${Date.now().toString(36)}`,
        articleId: parent.articleId,
        author: { kind: 'shop', staffName: publicStaffName(state.role) },
        text: text.trim(),
        createdAt: demoNow(state.clockStartedAt).toISOString(),
        hidden: false,
        parentId,
      }

      setComments(list => [...list, reply])
    },
  }
}
