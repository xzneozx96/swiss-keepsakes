import type { IconComponent } from '@/components/icons'

import { Link, useMatches } from '@tanstack/react-router'

import { BackgroundMusic } from '@/components/background-music'
import {
  AccountIcon,
  ExploreIcon,
  GiftIcon,
  SparkleIcon,
  TourIcon,
} from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { GuestAvatar } from '@/features/account/components/guest-avatar'
import { useDemoSelector } from '@/features/demo'

type GuestNavTarget = '/$lang' | '/$lang/gifts' | '/$lang/tours' | '/account'

interface NavItem {
  to: GuestNavTarget
  label: 'nav.explore' | 'nav.gifts' | 'nav.tours' | 'nav.account'
  icon: IconComponent
}

const leftItems: NavItem[] = [
  { to: '/$lang', label: 'nav.explore', icon: ExploreIcon },
  { to: '/$lang/gifts', label: 'nav.gifts', icon: GiftIcon },
]
const rightItems: NavItem[] = [
  { to: '/$lang/tours', label: 'nav.tours', icon: TourIcon },
  { to: '/account', label: 'nav.account', icon: AccountIcon },
]

/**
 * Guest app frame (UX spec §3.1), built to feel like a native app (owner request):
 * a phone-width column (max 430px; centred like a phone on larger screens), no website
 * header (each screen owns its top area), and a translucent tab bar with four tabs.
 * Detail screens (route staticData `hideTabBar`) hide the tab bar for their own action bar.
 */
export function GuestShell({ children }: { children: React.ReactNode }) {
  const { language, t } = useLocale()
  const guests = useGuests()
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  // 1.12s: a signed-in guest with a profile photo sees it on the Account tab (Instagram pattern).
  const photoGuest = guests.find(g => g.id === signedInGuestId && g.avatar)
  const hideTabBar = useMatches({
    select: matches => matches.some(m => m.staticData.hideTabBar),
  })
  const ownsBottomSpace = useMatches({
    select: matches => matches.some(m => m.staticData.ownsBottomSpace),
  })

  return (
    <div className="flex flex-1 justify-center bg-default/60">
      <div className="relative flex w-full max-w-[430px] flex-1 flex-col bg-background sm:shadow-overlay">
        <main
          className={
            ownsBottomSpace
              ? 'flex flex-1 flex-col'
              : 'flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+88px)]'
          }
        >
          {children}
        </main>

        <BackgroundMusic showDock={!hideTabBar} />

        {!hideTabBar && (
          <nav
            aria-label={t('nav.guest.label')}
            className="fixed bottom-0 z-30 w-full max-w-[430px]"
          >
            <div
              aria-hidden
              className="absolute inset-0 flex [filter:drop-shadow(0_-1px_0_color-mix(in_oklab,var(--separator)_70%,transparent))_drop-shadow(0_-6px_14px_rgba(0,0,0,0.07))]"
            >
              <div className="flex-1 bg-surface" />
              <div className="flex w-[92px] flex-col">
                <svg
                  className="block h-[30px] w-full text-surface"
                  viewBox="0 0 92 30"
                >
                  <path
                    d="M0 30V0H8.53A6 6 0 0 1 14.15 3.9A34 34 0 0 0 77.85 3.9A6 6 0 0 1 83.47 0H92V30Z"
                    fill="currentColor"
                  />
                </svg>
                <div className="-mt-px flex-1 bg-surface" />
              </div>
              <div className="flex-1 bg-surface" />
            </div>
            <ul className="relative grid grid-cols-5 pb-[env(safe-area-inset-bottom,0px)]">
              {leftItems.map(item => (
                <TabItem key={item.to} item={item} photoGuest={photoGuest} />
              ))}
              <li className="relative">
                <Link
                  className="group flex h-[60px] flex-col items-center justify-end gap-0.5 pb-[7px] text-[11px] leading-4 font-medium text-muted data-[status=active]:text-accent outline-none select-none focus-visible:focus-ring"
                  to="/$lang/plan"
                  params={{ lang: language }}
                >
                  <span
                    aria-hidden
                    className="absolute -top-9 flex size-14 items-center justify-center rounded-full bg-assistant text-white shadow-[0_10px_18px_-6px_rgba(213,43,30,0.5)] transition-transform group-active:scale-95"
                  >
                    <SparkleIcon
                      className="animate-sparkle"
                      size={26}
                      weight="Filled"
                    />
                  </span>
                  {t('nav.assistant')}
                </Link>
              </li>
              {rightItems.map(item => (
                <TabItem key={item.to} item={item} photoGuest={photoGuest} />
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}

function TabItem({
  item: { to, label, icon: Icon },
  photoGuest,
}: {
  item: NavItem
  photoGuest: React.ComponentProps<typeof GuestAvatar>['guest'] | undefined
}) {
  const { language, t } = useLocale()

  return (
    <li>
      <Link
        activeOptions={{ exact: to === '/$lang' }}
        className="flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] leading-4 font-medium text-muted select-none outline-none focus-visible:focus-ring active:opacity-70 data-[status=active]:text-accent"
        params={to === '/account' ? undefined : { lang: language }}
        to={to}
      >
        {({ isActive }) => (
          <>
            {/* Native tab pattern: the active tab's icon fills and takes the tint (accent = selection). */}
            {to === '/account' && photoGuest
              ? (
                  <GuestAvatar
                    className={`size-[26px] ${isActive ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : ''}`}
                    guest={photoGuest}
                  />
                )
              : (
                  <Icon size={26} weight={isActive ? 'Filled' : 'Outline'} />
                )}
            {t(label)}
          </>
        )}
      </Link>
    </li>
  )
}
