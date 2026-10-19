import type { Article } from '../types'
import type { Language } from '@/contexts/locale-context'

function publishedAt(a: Article) {
  return a.publication.status === 'published' ? a.publication.publishedAt : ''
}

/**
 * Published articles in one language, newest first. Stories are published per language and
 * never mixed (R02), so C01, C19 and search list only the guest's current language.
 */
export function publishedArticles(
  articles: Article[],
  language: Language,
): Article[] {
  return articles
    .filter(a => a.language === language && publishedAt(a))
    .sort((a, b) => publishedAt(b).localeCompare(publishedAt(a)))
}
