import type { Place } from './use-place-search'

import { Button, Input, Label, TextField } from '@heroui/react'
import { useState } from 'react'

import { CloseIcon, PickupIcon, SearchIcon } from '@/components/icons'

import { useLocale } from '@/contexts/locale-context'
import { usePlaceSearch } from './use-place-search'

/**
 * "Add a stop": searches real places (swisstopo, no key) as you type and adds the one you
 * pick. Loading, nothing found and unavailable each say so; the map need not be loaded.
 */
export function PlaceSearch({ onPick }: { onPick: (place: Place) => void }) {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  const search = usePlaceSearch(query, attempt)
  const typed = query.trim().length >= 2

  return (
    <div className="flex flex-col gap-3">
      <TextField fullWidth value={query} onChange={setQuery}>
        <Label>{t('products.itinerary.search.label')}</Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
            size={18}
          />
          <Input
            autoComplete="off"
            className="ps-10 pe-11"
            enterKeyHint="search"
            placeholder={t('products.itinerary.search.placeholder')}
          />
          {query && (
            <Button
              isIconOnly
              aria-label={t('products.itinerary.search.clear')}
              className="absolute end-0 top-1/2 size-11 -translate-y-1/2"
              size="sm"
              variant="ghost"
              onPress={() => setQuery('')}
            >
              <CloseIcon aria-hidden size={16} />
            </Button>
          )}
        </div>
      </TextField>
      <div aria-live="polite" className="flex flex-col gap-1">
        {typed && search.status === 'loading' && (
          <p className="px-1 text-sm text-muted">
            {t('products.itinerary.search.loading')}
          </p>
        )}
        {typed && search.status === 'error' && (
          <div className="flex flex-col items-start gap-2 rounded-2xl bg-surface-secondary p-3">
            <p className="text-sm text-pretty">
              {t('products.itinerary.search.error')}
            </p>
            <Button
              size="sm"
              variant="tertiary"
              onPress={() => setAttempt(n => n + 1)}
            >
              {t('products.itinerary.search.retry')}
            </Button>
          </div>
        )}
        {typed && search.status === 'done' && search.places.length === 0 && (
          <p className="rounded-2xl bg-surface-secondary p-3 text-sm text-pretty text-muted">
            {t('products.itinerary.search.empty', { query: query.trim() })}
          </p>
        )}
        {typed && search.status === 'done' && search.places.length > 0 && (
          <ul
            aria-label={t('products.itinerary.search.results')}
            className="flex flex-col divide-y divide-separator rounded-2xl bg-surface-secondary"
          >
            {search.places.map(place => (
              <li key={place.key}>
                <button
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start outline-none hover:bg-surface-tertiary focus-visible:focus-ring"
                  type="button"
                  onClick={() => {
                    onPick(place)
                    setQuery('')
                  }}
                >
                  <PickupIcon
                    aria-hidden
                    className="shrink-0 text-muted"
                    size={18}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {place.name}
                    </span>
                    {place.detail && (
                      <span className="truncate text-xs text-muted">
                        {place.detail}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
