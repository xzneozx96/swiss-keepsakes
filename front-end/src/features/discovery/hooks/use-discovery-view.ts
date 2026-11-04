import type { Article } from '@sk/domain/content'
import type {
  DiscoveryHomeView,
  StoryView,
} from '../lib/home-view'

import { isPublished, isSoldOut } from '@sk/domain/catalog'

import { useLocale } from '@/contexts/locale-context'
import { useProducts } from '@/features/catalog/api/queries'
import { useProductCard } from '@/features/catalog/hooks/use-product-card'
import { useArticles } from '@/features/content/api/queries'
import { publishedArticles } from '@/features/content/lib/articles'
import { useOrders } from '@/features/orders/api/queries'
import { useTourRecords } from '@/features/tours/api/queries'
import { timeBlockStories } from '../seed'

/** Builds the discovery home from the catalogue, the stories, the tours and the language. */
export function useDiscoveryView(): DiscoveryHomeView {
  const { t, language } = useLocale()
  const demoArticles = useArticles()
  const orders = useOrders()
  const products = useProducts()
  const demoTours = useTourRecords()

  const available = products.filter(
    p => isPublished(p) && !isSoldOut(p, orders),
  )

  const articles = publishedArticles(demoArticles, language)
  const blockStory = (slug: string): StoryView | undefined => {
    const article = articles.find(a => a.slug === slug)

    return article
      ? {
          slug: article.slug,
          photo: article.photo,
          title: article.title,
          meta: t('home.storyRow', { minutes: article.readMinutes }),
        }
      : undefined
  }

  const toCard = useProductCard()

  const isVictorinox = (p: { subcategoryId: string }) =>
    p.subcategoryId === 'victorinox'
  const victorinox = available.filter(isVictorinox).map(toCard)
  const keepsakes = available.filter(p => !isVictorinox(p)).map(toCard)

  // Published tours from the tour data, shown on the same card as the C08 list.
  const tours = (demoTours?.tours ?? []).filter(tour => tour.published)
  // The story a tour comes from: the newest story in this language that links to it (R16).
  const storyFor = (tourId: string): Article | undefined =>
    articles.find(a =>
      a.links.some(l => l.kind === 'tour' && l.id === tourId),
    )

  return {
    hero: {
      appName: t('app.name'),
      hello: t('home.hello'),
      title: t('home.heroTitle'),
      photoAlt: t('home.photoAlt'),
      searchLabel: t('search.open'),
      searchPrompt: t('home.searchPrompt'),
    },
    tours: {
      eyebrow: t('home.part.walk'),
      title: t('home.tours.title'),
      subtitle: t('home.tours.subtitle'),
      seeAll: t('home.seeAll'),
      items: tours,
      fromStory: t('home.tours.fromStory'),
      storyFor: (tourId) => {
        const article = storyFor(tourId)

        return article && { slug: article.slug, title: article.title }
      },
      story: blockStory(timeBlockStories.fewDays),
    },
    keep: {
      eyebrow: t('home.part.keep'),
      title: t('home.keep.title'),
      subtitle: t('home.keep.subtitle'),
    },
    victorinox: {
      title: t('home.victorinox.title'),
      subtitle: t('home.victorinox.subtitle'),
      eyebrow: t('home.victorinox.eyebrow'),
      since: t('home.victorinox.fact1'),
      seeAll: t('home.victorinox.seeAll', { count: victorinox.length }),
      intro: t('home.victorinox.intro'),
      items: victorinox,
      story: blockStory(timeBlockStories.victorinox),
    },
    keepsakes: {
      title: t('home.keepsakes.title'),
      subtitle: t('home.keepsakes.subtitle'),
      seeAll: t('home.seeAll'),
      items: keepsakes,
    },
    advice: {
      title: t('home.advice.title'),
      body: t('home.advice.body'),
      action: t('home.advice.action'),
      captions: [
        t('home.advice.caption1'),
        t('home.advice.caption2'),
        t('home.advice.caption3'),
      ],
    },
  }
}
