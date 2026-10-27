import type { Voice } from '@/features/lab/blog-home/options-v3'
import type { CategoryFilter } from '@/features/lab/blog-home/search-params'

import { createFileRoute } from '@tanstack/react-router'

import { StoryListLab } from '@/features/lab/blog-home/options-v3'
import { categories } from '@/features/lab/blog-home/search-params'
import { LabTabBar } from '@/features/lab/blog-home/shared'
import { noIndexHead } from '@/lib/no-index'

interface StoryListSearch {
  category: CategoryFilter
  voice: Voice
}

/** Lab: the story list (C19) with category circles as its filter, opened from the lab home. */
export const Route = createFileRoute('/lab/blog-home_/stories')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (
    search: Partial<Record<keyof StoryListSearch, unknown>>,
  ): StoryListSearch => ({
    category: categories.includes(search.category as CategoryFilter)
      ? (search.category as CategoryFilter)
      : 'all',
    voice: ['we', 'brand', 'me'].includes(search.voice as Voice)
      ? (search.voice as Voice)
      : 'we',
  }),
  component: StoryListRoute,
})

function StoryListRoute() {
  const { category, voice } = Route.useSearch()

  return (
    <div className="flex flex-1 justify-center bg-default/40">
      <div className="relative flex w-full max-w-[430px] flex-col bg-background sm:shadow-overlay">
        <StoryListLab category={category} voice={voice} />
        <LabTabBar />
      </div>
    </div>
  )
}
