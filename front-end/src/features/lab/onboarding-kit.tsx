/**
 * Lab kit for the guest onboarding (N01): the ranked list and a static phone frame that looks
 * like the guest shell at 375px.
 */
import type { IconComponent } from '@/components/icons'
import type { Flow, Language, Page } from '@/features/lab/onboarding-data'

import { Chip } from '@heroui/react'
import { useLayoutEffect, useRef } from 'react'

import {
  AccountIcon,
  ChevronRightIcon,
  ExploreIcon,
  GiftIcon,
  LanguageIcon,
  MusicIcon,
  SparkleIcon,
  TourIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import { answerSummary, copy, rankStories } from '@/features/lab/onboarding-data'
import { photoUrl } from '@/lib/photos'

const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)'

/**
 * The ranked list. When the ranking changes, rows glide to their new place. Rows keep ranked
 * DOM order, so screen readers hear the same order that is shown.
 */
export function RankedList({ flow, language }: { flow: Flow, language: Language }) {
  const c = copy[language]
  const listRef = useRef<HTMLUListElement>(null)
  const topsRef = useRef(new Map<string, number>())
  const orderRef = useRef('')
  const seenVersionRef = useRef(flow.version)
  const ranked = rankStories(flow.answers)
  const order = ranked.map(s => s.id).join('')

  // Runs after every commit, so the stored row positions never go stale when content above
  // the list grows or shrinks. Positions are relative to the list itself.
  useLayoutEffect(() => {
    const list = listRef.current

    if (!list)
      return
    const rows = Array.from(list.children) as HTMLElement[]
    const before = topsRef.current
    // A new visitor in the lab is a new page: it snaps, only the ranking after it animates.
    const reordered = orderRef.current !== '' && orderRef.current !== order
      && seenVersionRef.current === flow.version

    topsRef.current = new Map(rows.map(r => [r.dataset.id ?? '', r.offsetTop]))
    orderRef.current = order
    seenVersionRef.current = flow.version
    if (!reordered || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return
    for (const row of rows) {
      const shift = (before.get(row.dataset.id ?? '') ?? row.offsetTop) - row.offsetTop

      if (shift !== 0) {
        row.animate([{ translate: `0 ${shift}px` }, { translate: '0 0' }], {
          duration: 520,
          easing: EASE,
        })
      }
    }
  })

  return (
    <ul ref={listRef} className="relative flex flex-col gap-3">
      {ranked.map((s) => {
        const { segment } = flow.answers
        // "For you" only where both answers agree, so a matching interest at the bottom never says it.
        const match
          = (!segment || s.stay === 'both' || s.stay === segment)
            && s.interests.some(i => flow.answers.interests.includes(i))

        return (
          <li key={s.id} className="flex items-center gap-3 py-1" data-id={s.id}>
            <Media alt="" className="size-16 shrink-0 rounded-2xl" photo={s.photo} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="font-serif text-card-title text-balance">{s.title[language]}</p>
              <p className="flex items-center gap-2 text-label text-muted">
                <span>
                  {s.kind[language]}
                  {' · '}
                  {s.minutes}
                  {' '}
                  {c.readTime}
                </span>
                {match && (
                  <Chip color="accent" size="sm" variant="soft">
                    {c.forYou}
                  </Chip>
                )}
              </p>
            </div>
            <span className="w-4 shrink-0 text-center font-mono text-[10px] text-muted" title="AC38 fixture id">
              {s.id}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Mock story, long enough to scroll a few screens. DE is a lab translation, not reviewed copy. */
const storyText = {
  en: {
    title: 'The paintings under the Chapel Bridge',
    meta: 'Story · 6 min read',
    lede: 'Look up as you cross. Under the roof hang triangular paintings from the 1600s, telling Lucerne’s history to everyone who walks to market.',
    body: [
      'Most were painted by Hans Heinrich Wägmann and paid for by the city’s families, whose coats of arms still sit beside each scene.',
      'Read them from the Old Town end and the story runs forward: the city’s patron saints first, then sieges, plagues and the founding of the town.',
      'The bridge was never only a crossing. It closed the lake side of the town walls, and the Water Tower beside it held the city’s treasure, its archives and, for a while, its prisoners.',
      'On the night of 18 August 1993 a moored boat caught fire beneath the bridge. Within hours most of the roof had fallen into the Reuss.',
      'Of 147 paintings, only about thirty came back whole. The rebuilt bridge opened eight months later; the blank and scorched frames you see were left on purpose.',
      'Go early, before the tour groups, when the light comes in low off the lake and you can stop under each panel without being carried along.',
      'From the far bank, look back: the bridge bends because it once followed the old shoreline, long since filled in.',
    ],
  },
  de: {
    title: 'Die Bilder unter der Kapellbrücke',
    meta: 'Geschichte · 6 Min. Lesezeit',
    lede: 'Schauen Sie beim Gehen nach oben. Unter dem Dach hängen dreieckige Bilder aus dem 17. Jahrhundert und erzählen allen auf dem Weg zum Markt die Geschichte Luzerns.',
    body: [
      'Die meisten malte Hans Heinrich Wägmann, bezahlt von Luzerner Familien, deren Wappen noch neben jeder Szene stehen.',
      'Von der Altstadt her gelesen läuft die Geschichte vorwärts: zuerst die Stadtheiligen, dann Belagerungen, Seuchen und die Gründung der Stadt.',
      'Die Brücke war nie nur ein Übergang. Sie schloss die Stadtmauer zum See hin, und der Wasserturm daneben barg den Stadtschatz, das Archiv und eine Zeit lang Gefangene.',
      'In der Nacht auf den 18. August 1993 fing unter der Brücke ein Boot Feuer. Innert Stunden stürzte der grösste Teil des Dachs in die Reuss.',
      'Von 147 Bildern kamen nur etwa dreissig ganz zurück. Die neue Brücke öffnete acht Monate später; die leeren und verkohlten Rahmen blieben bewusst.',
      'Kommen Sie früh, vor den Reisegruppen, wenn das Licht flach vom See kommt und Sie unter jedem Bild stehen bleiben können.',
      'Schauen Sie vom anderen Ufer zurück: Die Brücke knickt, weil sie einst dem alten Ufer folgte, das längst aufgeschüttet ist.',
    ],
  },
}

/**
 * Phone frame like the guest shell at 375px: a scroller with the page, an optional top slot,
 * a dock slot for anything that floats over the page, the music launcher and the tab bar.
 * Everything is absolute inside the frame so nothing escapes into the lab page.
 */
export function PhoneFrame({
  flow,
  language,
  page,
  top,
  listHeader,
  dock,
  tab,
  onTab,
  onScroll,
  accountTrip,
}: {
  flow: Flow
  language: Language
  page: Page
  top?: React.ReactNode
  listHeader?: React.ReactNode
  dock?: React.ReactNode
  tab: 'explore' | 'account'
  onTab: (tab: 'explore' | 'account') => void
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  /** The "Your trip" row on the mock Account page. */
  accountTrip: () => void
}) {
  const c = copy[language]
  const s = storyText[language]
  const list = (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading">{page === 'home' ? c.listTitle : c.storyMore}</h2>
      {listHeader}
      <RankedList flow={flow} language={language} />
    </section>
  )

  return (
    <div className="relative h-[740px] w-[375px] max-w-full overflow-hidden rounded-[28px] bg-background shadow-overlay ring-1 ring-separator">
      <div className="h-full overflow-y-auto pb-[150px] [scrollbar-width:none]" data-phone-scroller onScroll={onScroll}>
        {tab === 'explore' && top}
        {tab === 'account'
          ? (
              <div className="flex flex-col gap-4 px-4 pt-6">
                <h1 className="text-title">{c.accountTitle}</h1>
                <div className="flex flex-col divide-y divide-separator rounded-2xl bg-surface shadow-surface">
                  <AccountRow icon={AccountIcon} label={c.signIn} value={c.signInHint} />
                  <AccountRow
                    icon={ExploreIcon}
                    label={c.yourTrip}
                    value={answerSummary(flow.answers, language) ?? c.notSet}
                    onPress={accountTrip}
                  />
                  <AccountRow icon={LanguageIcon} label={c.languageRow} value={c.languageValue} />
                </div>
              </div>
            )
          : page === 'home'
            ? (
                <div className="flex flex-col gap-5">
                  <div className="bg-gradient-to-b from-hero-sky to-background px-4 pt-6 pb-2">
                    <p className="text-sm text-muted">{c.hello}</p>
                    <h1 className="font-serif text-[26px] leading-8">{c.homeTitle}</h1>
                  </div>
                  <div className="px-4">{list}</div>
                </div>
              )
            : (
                <article className="flex flex-col gap-4">
                  <img
                    alt=""
                    className="h-56 w-full object-cover"
                    data-story-hero
                    src={photoUrl('lucerne-kapellbruecke-1200')}
                  />
                  <div className="flex flex-col gap-1 px-4">
                    <h1 className="font-serif text-title text-balance">{s.title}</h1>
                    <p className="text-label text-muted">{s.meta}</p>
                  </div>
                  <p className="px-4 text-body" data-story-lede>{s.lede}</p>
                  {s.body.map(p => (
                    <p key={p} className="px-4 text-body">{p}</p>
                  ))}
                  <div className="px-4 pt-2">{list}</div>
                </article>
              )}
      </div>

      {dock}

      <div className="pointer-events-none absolute right-4 bottom-[72px] z-20">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-foreground text-background shadow-overlay"
        >
          <MusicIcon size={22} />
        </span>
      </div>

      <TabBar language={language} tab={tab} onTab={onTab} />
    </div>
  )
}

function AccountRow({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: IconComponent
  label: string
  value: string
  onPress?: () => void
}) {
  const content = (
    <>
      <Icon className="shrink-0 text-muted" size={22} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="truncate text-label text-muted">{value}</span>
      </span>
      <ChevronRightIcon className="shrink-0 text-muted" size={18} />
    </>
  )
  const row = 'flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start'

  return onPress
    ? (
        <button className={`${row} outline-none focus-visible:focus-ring active:bg-default`} type="button" onClick={onPress}>
          {content}
        </button>
      )
    : <div className={row}>{content}</div>
}

const tabIcons = [ExploreIcon, GiftIcon, SparkleIcon, TourIcon, AccountIcon]

function TabBar({
  language,
  tab,
  onTab,
}: {
  language: Language
  tab: 'explore' | 'account'
  onTab: (tab: 'explore' | 'account') => void
}) {
  const labels = copy[language].tabs

  return (
    <nav aria-label="Mock tab bar" className="absolute inset-x-0 bottom-0 z-30">
      <div
        aria-hidden
        className="absolute inset-0 flex [filter:drop-shadow(0_-1px_0_color-mix(in_oklab,var(--separator)_70%,transparent))_drop-shadow(0_-6px_14px_rgba(0,0,0,0.07))]"
      >
        <div className="flex-1 bg-surface" />
        <div className="flex w-[92px] flex-col">
          <svg className="block h-[30px] w-full text-surface" viewBox="0 0 92 30">
            <path
              d="M0 30V0H8.53A6 6 0 0 1 14.15 3.9A34 34 0 0 0 77.85 3.9A6 6 0 0 1 83.47 0H92V30Z"
              fill="currentColor"
            />
          </svg>
          <div className="-mt-px flex-1 bg-surface" />
        </div>
        <div className="flex-1 bg-surface" />
      </div>
      <ul className="relative grid grid-cols-5 pb-2">
        {tabIcons.map((Icon, i) => {
          const target = i === 0 ? 'explore' : i === 4 ? 'account' : undefined
          const active = target === tab

          return (
            <li key={labels[i]} className="relative">
              <button
                className={`flex h-[60px] w-full flex-col items-center gap-0.5 text-[11px] leading-4 font-medium outline-none focus-visible:focus-ring ${i === 2 ? 'justify-end pb-[7px]' : 'justify-center'} ${active ? 'text-accent' : 'text-muted'}`}
                type="button"
                onClick={() => target && onTab(target)}
              >
                {i === 2
                  ? (
                      <span
                        aria-hidden
                        className="absolute -top-9 flex size-14 items-center justify-center rounded-full bg-assistant text-white shadow-[0_10px_18px_-6px_rgba(213,43,30,0.5)]"
                      >
                        <Icon size={26} weight="Filled" />
                      </span>
                    )
                  : <Icon size={26} weight={active ? 'Filled' : 'Outline'} />}
                {labels[i]}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
