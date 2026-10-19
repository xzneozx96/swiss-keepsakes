import type { ContentClient } from './client'
import type { DemoStore } from '@/features/demo/store'

import { demoNow } from '@/features/demo/clock'
import { updateCollection } from '@/features/demo/store'
import { publicStaffName } from '../merchant/lib/staff'

export function createContentDemoClient(store: DemoStore): ContentClient {
  const data = () => store.getState().data

  return {
    articles: async () => data().articles,
    comments: async () => data().comments,
    createArticle: async (article) => {
      updateCollection(store, 'articles', (articles, s) => [
        ...articles,
        { ...article, updatedAt: demoNow(s.clockStartedAt).toISOString() },
      ])
    },
    updateArticle: async ({ id, content, publication }) => {
      updateCollection(store, 'articles', (articles, s) =>
        articles.map(a =>
          a.id === id
            ? {
                ...a,
                ...content,
                publication: publication ?? a.publication,
                updatedAt: demoNow(s.clockStartedAt).toISOString(),
              }
            : a,
        ))
    },
    addComment: async ({ id, articleId, text, parentId }) => {
      updateCollection(store, 'comments', (comments, s) => {
        const guestId = s.data.signedInGuestId

        if (!guestId)
          return comments

        return [
          ...comments,
          {
            id,
            articleId,
            author: { kind: 'guest', guestId },
            text: text.trim(),
            createdAt: demoNow(s.clockStartedAt).toISOString(),
            hidden: false,
            ...(parentId && { parentId }),
          },
        ]
      })
    },
    replyAsShop: async ({ id, parentId, text }) => {
      updateCollection(store, 'comments', (comments, s) => {
        const parent = comments.find(c => c.id === parentId)

        if (!parent || parent.parentId)
          return comments

        return [
          ...comments,
          {
            id,
            articleId: parent.articleId,
            author: { kind: 'shop', staffName: publicStaffName(s.role) },
            text: text.trim(),
            createdAt: demoNow(s.clockStartedAt).toISOString(),
            hidden: false,
            parentId,
          },
        ]
      })
    },
    setCommentHidden: async ({ id, hidden }) => {
      updateCollection(store, 'comments', comments =>
        comments.map(c => (c.id === id ? { ...c, hidden } : c)))
    },
    deleteComment: async ({ id }) => {
      updateCollection(store, 'comments', comments =>
        comments.filter(c => c.id !== id && c.parentId !== id))
    },
  }
}
