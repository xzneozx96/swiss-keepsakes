import type { Article, ArticleComment } from '@sk/domain/content'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const contentQueries = {
  articles: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.content.articles,
      queryFn: client.content.articles,
    }),
  comments: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.content.comments,
      queryFn: client.content.comments,
    }),
}

/** Every story version, drafts included. `select` narrows it, and the screen re-renders only when that part changes. */
export function useArticles<T = Article[]>(
  select?: (articles: Article[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...contentQueries.articles(client), select }).data
}

export function useComments<T = ArticleComment[]>(
  select?: (comments: ArticleComment[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...contentQueries.comments(client), select }).data
}
