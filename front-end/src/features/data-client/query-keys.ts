/** Every query key in the app: one per collection a screen reads, grouped by feature. */
export const queryKeys = {
  content: {
    articles: ['content', 'articles'],
    comments: ['content', 'comments'],
  },
} as const
