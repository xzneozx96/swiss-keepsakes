import type { CopyKey } from './pins-merchant-copy'
import type { IconComponent } from '@/components/icons'

import { use, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  BackIcon,
  ContentIcon,
  MoreIcon,
  OrdersIcon,
  PartnersIcon,
  PickupDateIcon,
  ProductsIcon,
  SettingsIcon,
  TodayIcon,
} from '@/components/icons'
import { BrandMark } from '@/components/layout/brand-mark'
import { MerchantBarSlotContext } from '@/components/layout/merchant-back-bar'
import { useLocale } from '@/contexts/locale-context'
import { shop } from '@/features/catalog/seed'
import { avatarUrl } from '@/lib/avatars'
import { useCopy } from './pins-merchant-copy'

/** Class strings copied from `components/layout/merchant-shell.tsx`, so the frame reads the same. */
const sideLink
  = 'flex h-10 items-center gap-3 rounded-2xl px-3 text-sm text-foreground'
const subLink
  = 'flex h-9 items-center rounded-xl ps-11 pe-3 text-sm text-muted data-[active=true]:bg-default data-[active=true]:font-semibold data-[active=true]:text-foreground'
const tabLink
  = 'group flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted data-[active=true]:font-semibold data-[active=true]:text-accent'

interface Group {
  label: CopyKey
  icon: IconComponent
  pages: CopyKey[]
}

/** The post-pivot sidebar from docs/development-plan/screen-inventory.md, every group unfolded. */
const groups: Group[] = [
  { label: 'nav.dashboard', icon: TodayIcon, pages: ['nav.today', 'nav.sales', 'nav.traffic', 'nav.map'] },
  { label: 'nav.operations', icon: OrdersIcon, pages: ['nav.orders', 'nav.handovers', 'nav.calendar'] },
  { label: 'nav.products', icon: ProductsIcon, pages: ['nav.keepsakes', 'nav.inventory', 'nav.pickup'] },
  { label: 'nav.partners', icon: PartnersIcon, pages: [] },
  {
    label: 'nav.content',
    icon: ContentIcon,
    pages: ['nav.stories', 'nav.places', 'nav.categories', 'nav.tours', 'nav.media', 'nav.comments', 'nav.reviews', 'nav.inquiries', 'nav.analytics'],
  },
  { label: 'nav.settings', icon: SettingsIcon, pages: [] },
]

const phoneTabs: { label: CopyKey, icon: IconComponent }[] = [
  { label: 'nav.dashboard', icon: TodayIcon },
  { label: 'nav.operations', icon: OrdersIcon },
  { label: 'nav.calendar', icon: PickupDateIcon },
  { label: 'nav.more', icon: MoreIcon },
]

/**
 * The merchant frame for the lab: the real shell's sidebar from 1024px and its bottom bar on
 * phones, with Content › Places open. Navigation is drawn, not wired: the lab has one page.
 */
export function PinsShell({ children }: { children: React.ReactNode }) {
  const { c } = useCopy()
  const { t } = useLocale()
  const [barSlot, setBarSlot] = useState<HTMLElement | null>(null)

  return (
    <div className="flex flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-separator bg-surface lg:flex">
        <div className="sticky top-0 flex max-h-dvh flex-col gap-6 overflow-y-auto p-4 pb-6">
          <div className="flex items-center gap-3 px-2 pt-2">
            <BrandMark />
            <span className="min-w-0 text-sm leading-snug font-semibold">{shop.name}</span>
          </div>
          <nav aria-label={c('nav.label')}>
            <ul className="flex flex-col gap-1">
              {groups.map(group => (
                <li key={group.label}>
                  <span className={sideLink}>
                    <group.icon aria-hidden size={20} />
                    {c(group.label)}
                  </span>
                  {group.pages.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {group.pages.map(page => (
                        <li key={page}>
                          <span
                            aria-current={page === 'nav.places' ? 'page' : undefined}
                            className={subLink}
                            data-active={page === 'nav.places'}
                          >
                            {c(page)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-separator bg-surface py-4 ps-6 pe-4">
          <img alt="" className="size-9 shrink-0 rounded-full bg-default object-cover" decoding="async" loading="lazy" src={avatarUrl(shop.ownerName)} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{shop.ownerName}</span>
            <span className="truncate text-xs text-muted">{t('staff.owner')}</span>
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={setBarSlot} className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl empty:hidden lg:hidden" />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 lg:px-8 lg:pt-8 lg:pb-8">
          <MerchantBarSlotContext value={barSlot}>{children}</MerchantBarSlotContext>
        </main>
        <nav aria-label={c('nav.label')} className="fixed inset-x-0 bottom-0 z-20 border-t border-separator bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
          <ul className="grid grid-cols-4">
            {phoneTabs.map(tab => (
              <li key={tab.label}>
                {/* Content lives under More on phones, so More is the active tab. */}
                <span className={tabLink} data-active={tab.label === 'nav.more'}>
                  <tab.icon aria-hidden size={24} weight={tab.label === 'nav.more' ? 'Filled' : undefined} />
                  {c(tab.label)}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

/**
 * Phone ← bar of a detail screen, docked in the shell's sticky slot like `MerchantBackBar`,
 * with a button instead of a route link because the lab is one page.
 */
export function PinsBackBar({ label, title, onBack }: { label: string, title: string, onBack: () => void }) {
  const slot = use(MerchantBarSlotContext)

  if (!slot)
    return null

  return createPortal(
    <div className="flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top,0px)]">
      <button
        aria-label={label}
        className="-ms-2 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-transform focus-visible:focus-ring active:scale-95 motion-reduce:transition-none"
        type="button"
        onClick={onBack}
      >
        <BackIcon size={22} />
      </button>
      <span aria-hidden className="min-w-0 truncate text-[17px] font-semibold">{title}</span>
    </div>,
    slot,
  )
}
