import type { PublicStory } from '@sk/api-contract'

import { readSiteConfig } from '@/features/seo/lib/site-config'
import { widestVariant } from '@/lib/pick-variant'

type StoryHeadInput = Pick<PublicStory, 'title' | 'excerpt' | 'cover' | 'language' | 'versions'>

/**
 * The document head of a story page (ADR-002): title, description, share tags, the canonical address of the version the page
 * shows (its own language's slug, so a page opened in the other language's address never counts as a second copy), and the
 * alternate of every published version, with x-default on the English one. No `noindex`.
 */
export function storyHead(story: StoryHeadInput) {
  const { siteUrl } = readSiteConfig()
  const url = (version: { language: string, slug: string }) => `${siteUrl}/${version.language}/stories/${encodeURIComponent(version.slug)}`
  const own = story.versions.find(version => version.language === story.language)
  const english = story.versions.find(version => version.language === 'en')
  const image = story.cover ? (widestVariant(story.cover.variants)?.url ?? story.cover.url) : undefined

  return {
    meta: [
      { title: story.title },
      { name: 'description', content: story.excerpt },
      { property: 'og:title', content: story.title },
      { property: 'og:description', content: story.excerpt },
      { property: 'og:type', content: 'article' },
      ...(image ? [{ property: 'og:image', content: image }] : []),
    ],
    links: [
      ...(own ? [{ rel: 'canonical', href: url(own) }] : []),
      ...story.versions.map(version => ({ rel: 'alternate', hrefLang: version.language, href: url(version) })),
      ...(english ? [{ rel: 'alternate', hrefLang: 'x-default', href: url(english) }] : []),
    ] as { rel: string, href: string, hrefLang?: string }[],
  }
}
