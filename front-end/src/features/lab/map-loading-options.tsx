import type { ReactNode } from 'react'

import { Button, Spinner } from '@heroui/react'

import {
  ChevronRightIcon,
  DirectionsIcon,
  ExploreIcon,
} from '@/components/icons'

import '@/features/tours/map/tour-itinerary-map.css'

/** The map frame as it looks while the next stop's tiles load: the old view stays on screen. */
function MockMap({
  background,
  cardLoading = false,
  children,
}: {
  background: string
  cardLoading?: boolean
  children?: ReactNode
}) {
  return (
    <div className="tour-map-frame relative overflow-hidden rounded-3xl bg-surface-secondary">
      <img
        alt=""
        className="absolute inset-0 size-full object-cover"
        src={background}
      />
      <div className="absolute start-3 top-3 flex gap-2">
        <span className="pill flex min-h-11 items-center gap-2 bg-surface px-4 text-sm shadow-sm">
          <DirectionsIcon size={17} />
          Whole route
        </span>
        <span className="pill flex min-h-11 items-center gap-2 bg-surface px-4 text-sm shadow-sm">
          <ExploreIcon size={17} />
          3D view
        </span>
      </div>
      {children}
      <div className="tour-map-card absolute inset-x-3 flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-overlay">
        {cardLoading && (
          <span className="absolute inset-x-4 top-0 h-0.5 overflow-hidden rounded-full bg-accent/20">
            <span className="lab-slide block h-full w-1/3 bg-accent" />
          </span>
        )}
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-xs text-muted">Stop 3 · 125 min into the tour</p>
            <h3 className="truncate font-serif text-card-title font-semibold">
              Steingletscher
            </h3>
            <p className="line-clamp-2 text-sm text-muted">
              A longer stop by the glacier lake, with time for lunch or a short
              walk.
            </p>
          </div>
          <div
            className={`size-[76px] shrink-0 rounded-xl bg-default ${cardLoading ? 'animate-pulse' : ''}`}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button isIconOnly size="sm" variant="secondary">
            <ChevronRightIcon className="rotate-180" size={18} />
          </Button>
          <span className="px-2 text-sm text-muted">3 of 3</span>
          <Button isIconOnly size="sm" variant="secondary">
            {cardLoading
              ? (
                  <Spinner size="sm" />
                )
              : (
                  <ChevronRightIcon size={18} />
                )}
          </Button>
          <span className="flex-1" />
          <Button size="sm" variant="secondary">
            View more
          </Button>
        </div>
      </div>
    </div>
  )
}

interface Props { background: string }

export function LoadingPill({ background }: Props) {
  return (
    <MockMap background={background}>
      <div className="absolute inset-x-0 top-[28%] flex justify-center">
        <span className="flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm shadow-sm">
          <Spinner size="sm" />
          Loading the view…
        </span>
      </div>
    </MockMap>
  )
}

export function LoadingTopBar({ background }: Props) {
  return (
    <MockMap background={background}>
      <span className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-accent/20">
        <span className="lab-slide block h-full w-1/3 bg-accent" />
      </span>
    </MockMap>
  )
}

export function LoadingInCard({ background }: Props) {
  return <MockMap cardLoading background={background} />
}

export function LoadingDestination({ background }: Props) {
  return (
    <MockMap background={background}>
      <div className="absolute inset-x-0 top-[28%] flex justify-center px-6">
        <span className="flex min-h-11 items-center gap-2.5 rounded-full bg-surface py-1.5 ps-2 pe-4 text-sm shadow-sm">
          <span className="flex size-8 items-center justify-center">
            <Spinner size="sm" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-muted">Heading to</span>
            <span className="font-medium">Steingletscher</span>
          </span>
        </span>
      </div>
    </MockMap>
  )
}

export function LoadingDimmed({ background }: Props) {
  return (
    <MockMap background={background}>
      <div className="absolute inset-0 flex items-start justify-center bg-black/15 pt-[26%]">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface shadow-overlay">
          <Spinner size="md" />
        </span>
      </div>
    </MockMap>
  )
}
