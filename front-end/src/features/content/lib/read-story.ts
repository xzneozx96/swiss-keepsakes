import { notFound, redirect } from '@tanstack/react-router'

import { isLanguage } from '@/lib/language-routing'
import { loadPublicStory } from '../api/public-story'

/**
 * What the story route's loader returns (ADR-002). A slug with no published version is a not-found, which the server answers
 * with 404. An address that is not the version's own (the language has no version, or the slug belongs to the other
 * language) redirects with 302 to that version's own address (ADR-002 step 6): the other language's text is never shown at
 * the wrong address. The shell's language notice then runs on the page the guest lands on, from `availableLanguages`.
 */
export async function readStoryPage(lang: string, slug: string) {
  if (!isLanguage(lang))
    throw notFound()

  const found = await loadPublicStory(slug, lang)
  if (!found)
    throw notFound()

  const own = found.versions.find(version => version.language === found.language)?.slug ?? slug
  if (found.language !== lang || own !== slug)
    throw redirect({ to: '/$lang/stories/$slug', params: { lang: found.language, slug: own }, statusCode: 302 })

  return { story: found, availableLanguages: found.availableLanguages }
}
