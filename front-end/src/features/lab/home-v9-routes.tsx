/**
 * Lab, home V9, revision 4: "Walk it the way we would" in the shipped home's tour rail look
 * (`discovery-home.tsx`, "Walk it"): the same `Rail`, a 240 px `ListingCard` carousel card (4:3
 * photo with the 3xl radius, serif card title, the clock line). The "From the story" link
 * is left out (owner, revision 6). `TourCard` itself needs the tours data, the router and a price, so its look is
 * copied here: no price pill, no heart, no departure line, no booking. Where the shipped card
 * shows the next departure, this one says where the route starts and ends.
 * Stay length orders the cards.
 */
import type { Language } from '@/features/lab/home-data'
import type { HomeModel } from '@/features/lab/home-kit'
import type { Route } from '@/features/lab/home-v9-data'

import { ClockIcon, PickupIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { Rail } from '@/features/discovery/components/section'
import { routeHref, routeMeta, routesFor, v9Copy } from '@/features/lab/home-v9-data'
import { SectionHead } from '@/features/lab/home-v9-parts'

/** The shipped carousel card's look, without price, heart or departure. */
function RouteCard({ route, home, language }: { route: Route, home: HomeModel, language: Language }) {
  const c = v9Copy[language]
  const start = route.stops[0]!.name[language]
  const finish = route.stops.at(-1)!.name[language]

  return (
    <button
      className="flex w-60 shrink-0 snap-start flex-col gap-2.5 rounded-3xl text-start outline-none focus-visible:focus-ring transition-transform active:scale-[0.98]"
      type="button"
      onClick={() => home.open(routeHref(route, language))}
    >
      <Media alt="" className="aspect-[4/3] w-full rounded-3xl" photo={route.photo} />
      <span className="flex flex-col gap-0.5 px-0.5">
        <span className="font-serif text-card-title text-balance">{route.title[language]}</span>
        <span className="flex items-start gap-1.5 text-label text-muted tabular-nums">
          <ClockIcon className="mt-0.5 shrink-0" size={14} />
          {routeMeta(route, language)}
        </span>
        <span className="flex items-start gap-1.5 text-label text-muted">
          <PickupIcon className="mt-0.5 shrink-0" size={14} />
          {c.startFinish(start, finish)}
        </span>
      </span>
    </button>
  )
}

export function Routes({ home, language }: { home: HomeModel, language: Language }) {
  const c = v9Copy[language]

  return (
    <section aria-labelledby={home.headingId('v9-routes')} className="flex flex-col gap-3" data-v9-routes>
      <SectionHead body={c.routesBody} home={home} id="v9-routes" title={c.routesTitle} />
      <div className="px-4">
        <Rail label={c.routesTitle}>
          {routesFor(home.answers).map(route => (
            <li key={route.id} className="relative flex" data-settle={`route/${route.id}`}>
              <RouteCard home={home} language={language} route={route} />
            </li>
          ))}
        </Rail>
      </div>
    </section>
  )
}
