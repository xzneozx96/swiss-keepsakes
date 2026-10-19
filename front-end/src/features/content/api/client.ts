import type {
  Article,
  ArticleComment,
  ArticlePublication,
} from '@sk/domain/content'

export type ArticleContent = Omit<
  Article,
  'id' | 'slug' | 'publication' | 'updatedAt'
>

/** Stories (M17, C20) and their comments (M18). */
export interface ContentClient {
  articles: () => Promise<Article[]>
  comments: () => Promise<ArticleComment[]>
  createArticle: (article: Omit<Article, 'updatedAt'>) => Promise<void>
  updateArticle: (input: {
    id: string
    content: ArticleContent
    /** Absent: the article keeps its publication. */
    publication?: ArticlePublication
  }) => Promise<void>
  /** By the signed-in guest. */
  addComment: (input: {
    id: string
    articleId: string
    text: string
    parentId?: string
  }) => Promise<void>
  /** By the signed-in staff member, under their public name. */
  replyAsShop: (input: {
    id: string
    parentId: string
    text: string
  }) => Promise<void>
  setCommentHidden: (input: { id: string, hidden: boolean }) => Promise<void>
  /** Removes the comment and its replies, so none is left without its comment. */
  deleteComment: (input: { id: string }) => Promise<void>
}
