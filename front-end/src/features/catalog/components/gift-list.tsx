import type { Key } from '@heroui/react'
import type { ProductCardProps } from './product-card'

import {
  ScrollShadow,
  SearchField,
  Skeleton,
  Tag,
  TagGroup,
} from '@heroui/react'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { GiftIcon } from '@/components/icons'

import {
  BackButton,
  CartButton,
  CompactBar,
  SearchButton,
} from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { CategoryThumb, categoryThumbItemClass } from './category-thumb'
import { ProductCard } from './product-card'

export const ALL_CATEGORIES = 'all'

interface GiftListProps {
  banner: {
    title: string
    tagline: string
    countLabel: string
    photo?: string
  }
  search: {
    /** Scope label, e.g. "Search in Gift boxes"; also the field's accessible name. */
    label: string
    openLabel: string
    backLabel: string
    value: string
    onChange: (v: string) => void
  }
  filter: {
    label: string
    items: { id: string, name: string, photo?: string }[]
    selected: string
    onChange: (id: string) => void
  }
  cards: ProductCardProps[]
  empty: { message: string, actionLabel: string } | null
  isLoading: boolean
}

/**
 * C02 Gifts, native-app layout: a full-bleed photo banner for the selected category,
 * then a sheet with photo category tiles (a single-selection TagGroup; selected = red ring
 * plus check badge, never hue alone) and the shared gift cards, one per row (owner: few products, larger photos). Search is scoped
 * to this screen and works like a native nav-bar search: 🔍 (on the banner or the
 * collapsing bar) turns the top bar into ← back + the search field in place, pinned at the
 * current scroll position, and the grid filters live underneath. Back clears it and
 * restores the bar.
 */
export function GiftList({
  banner,
  search,
  filter,
  cards,
  empty,
  isLoading,
}: GiftListProps) {
  const { language } = useLocale()
  const [searchOpen, setSearchOpen] = useState(search.value !== '')
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()

  const openSearch = () => setSearchOpen(true)

  const closeSearch = () => {
    search.onChange('')
    setSearchOpen(false)
  }

  const onSelectionChange = (keys: 'all' | Set<Key>) => {
    const [first] = keys === 'all' ? [] : [...keys]

    // Single selection never clears: tapping the selected tile keeps it selected.
    if (first !== undefined)
      filter.onChange(String(first))
  }

  return (
    <div className="flex flex-col">
      {searchOpen
        ? (
            <CompactBar visible>
              <BackButton label={search.backLabel} onPress={closeSearch} />
              <SearchField
                // Opened on purpose by the 🔍 action, so the keyboard comes up.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                aria-label={search.label}
                className="flex-1"
                value={search.value}
                onChange={search.onChange}
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input
                    className="w-full"
                    placeholder={search.label}
                  />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
              <LanguageButton tone="bar" />
            </CompactBar>
          )
        : (
            <CompactBar title={banner.title} visible={scrolledPast}>
              <SearchButton
                label={search.openLabel}
                tone="bar"
                onPress={openSearch}
              />
              <LanguageButton tone="bar" />
              <CartButton tone="bar" />
            </CompactBar>
          )}
      <Media alt="" className="h-[260px]" photo={banner.photo}>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70"
        />
        {/* Actions top right (owner: no logo here, 13.10.2026). While searching, the top
            bar holds the field and the banner's own row steps aside. */}
        {!searchOpen && (
          <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center justify-end gap-2">
            <SearchButton label={search.openLabel} onPress={openSearch} />
            <LanguageButton />
            <CartButton />
          </div>
        )}
        <div className="absolute inset-x-4 bottom-10 flex flex-col gap-1 text-white">
          <h1 className="font-serif text-display">{banner.title}</h1>
          <p className="text-body text-white/85">{banner.tagline}</p>
          <p className="text-label text-white/85 tabular-nums">
            {banner.countLabel}
          </p>
        </div>
      </Media>
      <div ref={bannerEnd} aria-hidden className="h-px" />

      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        <TagGroup
          aria-label={filter.label}
          selectedKeys={new Set([filter.selected])}
          selectionMode="single"
          onSelectionChange={onSelectionChange}
        >
          <ScrollShadow
            hideScrollBar
            className="-mx-4"
            orientation="horizontal"
            size={40}
          >
            <TagGroup.List className="flex-nowrap gap-1 px-4 pt-2 pb-1">
              {filter.items.map(item => (
                <Tag
                  key={item.id}
                  className={`${categoryThumbItemClass} bg-transparent p-0 before:hidden hover:bg-transparent data-[selected=true]:bg-transparent data-[selected=true]:font-semibold data-[selected=true]:text-foreground`}
                  id={item.id}
                  textValue={item.name}
                >
                  <CategoryThumb name={item.name} photo={item.photo} />
                </Tag>
              ))}
            </TagGroup.List>
          </ScrollShadow>
        </TagGroup>

        {isLoading
          ? (
              <ul className="flex flex-col gap-7">
                {Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="flex flex-col gap-2.5">
                    <Skeleton className="aspect-[4/3] rounded-3xl" />
                    <Skeleton className="h-5 w-4/5 rounded-lg" />
                    <Skeleton className="h-4 w-3/5 rounded-lg" />
                  </li>
                ))}
              </ul>
            )
          : empty
            ? (
                <EmptyState
                  action={{ label: empty.actionLabel, to: '/$lang/gifts', params: { lang: language } }}
                  icon={GiftIcon}
                  message={empty.message}
                />
              )
            : (
                <ul className="flex flex-col gap-7">
                  {cards.map(card => (
                    <li key={card.slug}>
                      <ProductCard {...card} layout="grid" />
                    </li>
                  ))}
                </ul>
              )}
      </div>
    </div>
  )
}
