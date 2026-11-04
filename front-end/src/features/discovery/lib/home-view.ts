import type { Tour } from '@sk/domain/bookings'
import type { ProductCardProps } from '@/features/catalog/components/product-card'

// The view the lab pages (/lab/victorinox, /lab/blog-home) still read through `useDiscoveryView`. The guest home no longer uses it (E4.13).

export interface StoryView {
  slug: string
  photo: string
  title: string
  meta: string
}

interface PartView {
  eyebrow: string
  title: string
  subtitle: string
}

export interface DiscoveryHomeView {
  hero: {
    appName: string
    hello: string
    title: string
    photoAlt: string
    searchLabel: string
    searchPrompt: string
  }
  tours: PartView & {
    seeAll: string
    items: Tour[]
    fromStory: string
    storyFor: (tourId: string) => { slug: string, title: string } | undefined
    /** The tours' story for the lab's earlier layouts. */
    story?: StoryView
  }
  keep: PartView
  victorinox: {
    title: string
    subtitle: string
    eyebrow: string
    since: string
    seeAll: string
    intro: string
    items: ProductCardProps[]
    story?: StoryView
  }
  keepsakes: {
    title: string
    subtitle: string
    seeAll: string
    items: ProductCardProps[]
  }
  advice: {
    title: string
    body: string
    action: string
    captions: [string, string, string]
  }
}
