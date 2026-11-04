import type { LinkProps } from '@tanstack/react-router'
import type { IconComponent } from '@/components/icons'
import type { MessageKey } from '@/i18n/en'

import { Button, Drawer } from '@heroui/react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import {
  ChevronDownIcon,
  ContentIcon,
  LogoutIcon,
  MoreIcon,
  OrdersIcon,
  PartnersIcon,
  PickupDateIcon,
  ProductsIcon,
  ReportsIcon,
  RequestsIcon,
  SettingsIcon,
  TodayIcon,
} from '@/components/icons'
import { BrandMark } from '@/components/layout/brand-mark'
import { MerchantBarSlotContext } from '@/components/layout/merchant-back-bar'
import { isReady } from '@/components/layout/nav-ready'
import { SECTION_PAGES } from '@/components/layout/section-pages'
import { useLocale } from '@/contexts/locale-context'
import { shop } from '@/features/catalog/seed'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { avatarUrl } from '@/lib/avatars'

export type MerchantSection
  = | 'products'
    | 'partners'
    | 'content'
    | 'requests'
    | 'reports'
    | 'settings'

/** A page listed under its group in the sidebar; it stays active on its own detail screens (see `activePageOf`). */
interface NavPage {
  label: MessageKey
  to: LinkProps['to']
}

interface NavItem {
  label: MessageKey
  icon: IconComponent
  /** Where the item lives; "/store" itself matches only the exact path. */
  paths: string[]
  /** A single page. Items with `pages` are groups that fold open in the sidebar. */
  to?: LinkProps['to']
  exact?: boolean
  pages?: NavPage[]
  settings?: true
}

function pagesOf(section: keyof typeof SECTION_PAGES): NavPage[] {
  return SECTION_PAGES[section].map(({ label, to }) => ({ label, to }))
}

const contentPages = pagesOf('content')

/**
 * The sidebar (owner review 15.10.2026): six items, four of them folding groups. Dashboard holds
 * Today and every analytics page of the shop; Operations the work on orders and departures;
 * Content the articles, guest voices and inquiries. Partners keeps its own analytics page.
 */
const sidebarItems: NavItem[] = [
  {
    label: 'nav.today',
    icon: TodayIcon,
    paths: ['/store', '/store/sales', '/store/reports'],
    pages: [
      { label: 'overviewPages.today', to: '/store' },
      { label: 'overviewPages.sales', to: '/store/sales' },
      { label: 'sectionPages.sales', to: '/store/reports/sales' },
      { label: 'sectionPages.money', to: '/store/reports' },
      { label: 'sectionPages.guests', to: '/store/reports/guests' },
      { label: 'sectionPages.margin', to: '/store/reports/margin' },
    ],
  },
  {
    label: 'nav.operations',
    icon: OrdersIcon,
    paths: ['/store/orders', '/store/calendar'],
    pages: [
      { label: 'nav.orders', to: '/store/orders' },
      { label: 'nav.calendar', to: '/store/calendar' },
    ],
  },
  {
    label: 'nav.products',
    icon: ProductsIcon,
    paths: ['/store/products'],
    pages: [
      { label: 'products.tab.gifts', to: '/store/products' },
      { label: 'inventory.nav', to: '/store/products/inventory' },
      { label: 'products.tab.pickup', to: '/store/products/pickup' },
    ],
  },
  {
    label: 'nav.partners',
    icon: PartnersIcon,
    paths: ['/store/partners'],
    pages: pagesOf('partners'),
  },
  {
    label: 'nav.content',
    icon: ContentIcon,
    paths: ['/store/content', '/store/requests'],
    pages: [
      ...contentPages.filter(page => page.to !== '/store/content/analytics'),
      { label: 'nav.requests', to: '/store/requests' },
      ...contentPages.filter(page => page.to === '/store/content/analytics'),
    ],
  },
  {
    label: 'nav.settings',
    icon: SettingsIcon,
    paths: ['/store/settings'],
    settings: true,
  },
]

/**
 * Phones: Dashboard, Operations and Calendar, with the other sections in the More sheet (Bookings
 * left the bar with ADR-012). Dashboard's analytics pages are the Sales tab here and Analytics in More.
 */
const phoneItems: NavItem[] = [
  {
    label: 'nav.today',
    icon: TodayIcon,
    paths: ['/store', '/store/sales'],
    to: '/store',
    exact: true,
  },
  {
    label: 'nav.operations',
    icon: OrdersIcon,
    paths: ['/store/orders'],
    to: '/store/orders',
  },
  {
    label: 'nav.calendar',
    icon: PickupDateIcon,
    paths: ['/store/calendar'],
    to: '/store/calendar',
  },
  {
    label: 'nav.products',
    icon: ProductsIcon,
    paths: ['/store/products'],
    to: '/store/products',
  },
  {
    label: 'nav.partners',
    icon: PartnersIcon,
    paths: ['/store/partners'],
    to: '/store/partners',
  },
  {
    label: 'nav.content',
    icon: ContentIcon,
    paths: ['/store/content'],
    to: '/store/content',
  },
  {
    label: 'nav.requests',
    icon: RequestsIcon,
    paths: ['/store/requests'],
    to: '/store/requests',
  },
  {
    label: 'nav.reports',
    icon: ReportsIcon,
    paths: ['/store/reports'],
    to: '/store/reports',
  },
  {
    label: 'nav.settings',
    icon: SettingsIcon,
    paths: ['/store/settings'],
    settings: true,
  },
]

/**
 * What the menus show: items and pages that are not in HIDDEN_UNTIL_READY (nav-ready.ts). A group
 * with no page left goes; a hidden page still opens by URL. Read on every render so the list is
 * the only place to change.
 */
function readySidebar() {
  return sidebarItems.flatMap((item) => {
    if (!item.pages)
      return [item]
    const pages = item.pages.filter(page => isReady(page.to))

    return pages.length ? [{ ...item, pages }] : []
  })
}

function readyPhone() {
  const items = phoneItems.filter(item => item.settings || isReady(item.to))

  // Up to four items fit in the bar itself; More appears only when there are more.
  return items.length <= 4
    ? { primary: items, more: [] }
    : { primary: items.slice(0, 3), more: items.slice(3) }
}

function isUnder(pathname: string, base: string) {
  return base === '/store'
    ? pathname === base
    : pathname === base || pathname.startsWith(`${base}/`)
}

/**
 * The page of a group that is open: the one whose path is the longest match for the URL, so a page
 * stays active on its own detail and editor screens (Places on /store/content/places/:id, Partners
 * on /store/partners/:id) while a shorter sibling (Articles at /store/content) yields to it.
 */
function activePageOf(pathname: string, pages: NavPage[]) {
  let best: NavPage | undefined

  for (const page of pages) {
    const base = String(page.to)

    if (
      isUnder(pathname, base)
      && (!best || base.length > String(best.to).length)
    ) {
      best = page
    }
  }

  return best
}

function isInside(pathname: string, item: NavItem) {
  return item.paths.some(base => isUnder(pathname, base))
}

function NavLink({
  item,
  className,
  children,
  onClick,
}: {
  item: NavItem
  className: string
  children: React.ReactNode
  onClick?: () => void
}) {
  const { pathname } = useLocation()
  // The item is active anywhere inside its paths (Today also on Sales, Analytics on its costs
  // screen); Settings is still a placeholder.
  const status = isInside(pathname, item) ? 'active' : undefined

  if (item.settings) {
    return (
      <Link
        className={className}
        data-status={status}
        params={{ section: 'settings' }}
        to="/store/$section"
        onClick={onClick}
      >
        {children}
      </Link>
    )
  }

  return (
    <Link
      activeOptions={{ exact: item.exact }}
      className={className}
      data-status={status}
      to={item.to}
      onClick={onClick}
    >
      {children}
    </Link>
  )
}

const sideLink
  = 'flex h-10 items-center gap-3 rounded-2xl px-3 text-sm text-muted outline-none hover:bg-default focus-visible:focus-ring data-[status=active]:bg-default data-[status=active]:font-semibold data-[status=active]:text-foreground'

/** A parent row: no active fill of its own, the open page below carries it. */
const parentLink
  = 'flex h-10 items-center gap-3 rounded-2xl px-3 text-sm text-foreground outline-none hover:bg-default focus-visible:focus-ring'

const subLink
  = 'flex h-9 items-center rounded-xl ps-11 pe-3 text-sm text-muted outline-none hover:bg-default focus-visible:focus-ring data-[status=active]:bg-default data-[status=active]:font-semibold data-[status=active]:text-foreground'

const tabLink
  = 'group relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted outline-none focus-visible:focus-ring data-[status=active]:font-semibold data-[status=active]:text-accent'

/**
 * Merchant dashboard frame (UX spec §3.2). Phones: bottom navigation with Dashboard,
 * Operations, Calendar and More (a sheet with the other sections). From 1024px: a sidebar.
 */
export function MerchantShell({ children, notice }: {
  children: React.ReactNode
  /** A notice for every page of the area (the store-setup warning): the very top of the content column, above the phone bar. */
  notice?: React.ReactNode
}) {
  const { language, t } = useLocale()
  const { setRole } = useDemoActions()
  const demoRole = useDemoSelector(s => s.role)
  const staffName = demoRole === 'manager' ? 'Lukas' : shop.ownerName
  const staffRole
    = demoRole === 'manager' ? t('staff.manager') : t('staff.owner')
  const [moreOpen, setMoreOpen] = useState(false)
  // Groups start unfolded; the set holds the ones the user folded.
  const [folded, setFolded] = useState<Set<string>>(() => new Set())
  const [barSlot, setBarSlot] = useState<HTMLElement | null>(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const labelOf = (item: NavItem) => t(item.label)
  const sidebar = readySidebar()
  const { primary: phonePrimary, more: phoneMore } = readyPhone()
  // The shop mark opens the first ready page (Today is a prototype for now).
  const landing = sidebar[0]?.pages?.[0]?.to ?? sidebar[0]?.to ?? '/store'

  return (
    <div className="flex flex-1">
      {/* The aside stretches with the page; its contents stay pinned while the page scrolls. */}
      {/* Standard dashboard sidebar (owner, 15.10.2026): the shop's mark and name on top,
          the signed-in person pinned to the bottom. */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-separator bg-surface lg:flex">
        {/* The menu scrolls on its own when it is taller than the screen, so every section
            stays reachable above the pinned profile (the extra bottom padding clears the
            prototype bar's height before the page scrolls). */}
        <div className="sticky top-0 flex max-h-[calc(100dvh-4.5rem)] flex-col gap-6 overflow-y-auto p-4 pb-14">
          <Link
            className="flex items-center gap-3 rounded-xl px-2 pt-2 outline-none focus-visible:focus-ring"
            to={landing}
          >
            <BrandMark />
            <span className="min-w-0 text-sm leading-snug font-semibold">
              {shop.name}
            </span>
          </Link>
          <nav aria-label={t('nav.merchant.label')}>
            <ul className="flex flex-col gap-1">
              {sidebar.map((item) => {
                const pages = item.pages ?? []
                const id = `nav-pages-${item.label.replace('.', '-')}`
                const inside = isInside(pathname, item)
                const isOpen = !folded.has(item.label)

                return (
                  <li key={item.label}>
                    {pages.length
                      ? (
                    // A group. Inside it the row folds or unfolds its pages; from another
                    // group it unfolds them and opens the first page. Folded while one of its
                    // pages is open, it shows where you are.
                          <button
                            aria-controls={id}
                            aria-expanded={isOpen}
                            className={`${parentLink} w-full text-start ${
                              !isOpen && inside ? 'bg-default font-semibold' : ''
                            }`}
                            type="button"
                            onClick={() => {
                              const next = new Set(folded)

                              if (isOpen && inside) {
                                next.add(item.label)
                              }
                              else {
                                next.delete(item.label)
                                void navigate({ to: pages[0].to })
                              }
                              setFolded(next)
                            }}
                          >
                            <item.icon size={20} />
                            <span className="flex-1">{labelOf(item)}</span>
                            <ChevronDownIcon
                              aria-hidden
                              className={`text-muted transition-transform ${isOpen ? '' : '-rotate-90'}`}
                              size={16}
                            />
                          </button>
                        )
                      : (
                          <NavLink className={sideLink} item={item}>
                            <item.icon size={20} />
                            {labelOf(item)}
                          </NavLink>
                        )}
                    {pages.length > 0 && isOpen && (
                      <ul className="mt-1 flex flex-col gap-0.5" id={id}>
                        {pages.map(page => (
                          <li key={page.label}>
                            <Link
                              // The router only knows the exact path; the detail screens are
                              // marked through inactiveProps (see activePageOf).
                              activeOptions={{ exact: true }}
                              className={subLink}
                              inactiveProps={
                                page === activePageOf(pathname, pages)
                                  ? { 'data-status': 'active' }
                                  : undefined
                              }
                              to={page.to}
                            >
                              {t(page.label)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
        <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-separator bg-surface py-4 ps-6 pe-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              alt=""
              className="size-9 shrink-0 rounded-full bg-default object-cover"
              decoding="async"
              src={avatarUrl(staffName)}
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{staffName}</span>
              <span className="truncate text-xs text-muted">{staffRole}</span>
            </span>
          </div>
          {/* The prototype has no merchant login: signing out leaves the shop for the guest
              side, as the prototype bar's guest role does. */}
          <Button
            isIconOnly
            aria-label={t('account.signOut')}
            className="text-danger"
            size="sm"
            variant="ghost"
            onPress={() => {
              setRole('guest')
              void navigate({ to: '/$lang', params: { lang: language } })
            }}
          >
            <LogoutIcon aria-hidden size={18} />
          </Button>
        </div>
      </aside>

      <div className="group/content flex min-w-0 flex-1 flex-col">
        {/* The page notice sits above everything, the phone bar included; it scrolls away on phones (the
            bar pins to the top) and sticks on desktop. It takes the width and padding of the main column;
            a notice brings its own vertical padding, so the main column drops its top padding below it. */}
        <div
          data-merchant-notice=""
          className="mx-auto w-full max-w-6xl bg-background px-4 empty:hidden lg:sticky lg:top-0 lg:z-10 lg:px-8"
        >
          {notice}
        </div>

        {/* Phones: no shop header. Detail screens dock their ← title bar here (guest pattern). */}
        <div
          ref={setBarSlot}
          data-merchant-bar-slot=""
          className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl empty:hidden lg:hidden"
        />

        {/* The calendar fills the content area edge to edge (owner, 15.10.2026). */}
        <main
          className={
            pathname === '/store/calendar'
              ? 'flex w-full flex-1 flex-col'
              : 'mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 group-has-[[data-merchant-notice]:not(:empty)]/content:lg:pt-0 lg:px-8 lg:pt-8 lg:pb-8'
          }
        >
          <MerchantBarSlotContext value={barSlot}>{children}</MerchantBarSlotContext>
        </main>

        <nav
          aria-label={t('nav.merchant.label')}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-separator bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        >
          <ul className={phonePrimary.length === 3 && !phoneMore.length ? 'grid grid-cols-3' : 'grid grid-cols-4'}>
            {phonePrimary.map(item => (
              <li key={item.label}>
                <NavLink className={tabLink} item={item}>
                  {/* The guest tab pattern: the active tab fills its icon and takes the accent tint. */}
                  <item.icon
                    className="group-data-[status=active]:hidden"
                    size={24}
                  />
                  <item.icon
                    className="hidden group-data-[status=active]:block"
                    size={24}
                    weight="Filled"
                  />
                  {labelOf(item)}
                </NavLink>
              </li>
            ))}
            {phoneMore.length > 0 && (
              <li>
                <Drawer isOpen={moreOpen} onOpenChange={setMoreOpen}>
                  <Drawer.Trigger
                    className="flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted outline-none focus-visible:focus-ring data-[status=active]:font-semibold data-[status=active]:text-accent"
                    data-status={
                      phoneMore.some(item => isInside(pathname, item))
                        ? 'active'
                        : undefined
                    }
                  >
                    <MoreIcon size={24} />
                    {t('nav.more')}
                  </Drawer.Trigger>
                  <Drawer.Backdrop>
                    <Drawer.Content placement="bottom">
                      <Drawer.Dialog>
                        <Drawer.Handle />
                        <Drawer.Header>
                          <Drawer.Heading>{t('nav.moreTitle')}</Drawer.Heading>
                          <p className="text-label text-muted">
                            {shop.name} · {staffName} · {staffRole}
                          </p>
                        </Drawer.Header>
                        <Drawer.Body>
                          <ul className="flex flex-col gap-1 pb-4">
                            {phoneMore.map(item => (
                              <li key={item.label}>
                                <NavLink
                                  className="group flex h-12 items-center gap-3 rounded-2xl px-3 text-base outline-none hover:bg-default focus-visible:focus-ring data-[status=active]:bg-default data-[status=active]:font-semibold data-[status=active]:text-accent"
                                  item={item}
                                  onClick={() => setMoreOpen(false)}
                                >
                                  <item.icon
                                    className="group-data-[status=active]:hidden"
                                    size={20}
                                  />
                                  <item.icon
                                    className="hidden group-data-[status=active]:block"
                                    size={20}
                                    weight="Filled"
                                  />
                                  {labelOf(item)}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </Drawer.Body>
                      </Drawer.Dialog>
                    </Drawer.Content>
                  </Drawer.Backdrop>
                </Drawer>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  )
}
