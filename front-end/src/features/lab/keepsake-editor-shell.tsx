import type { IconComponent } from '@/components/icons'

import {
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
import { shop } from '@/features/catalog/seed'
import { avatarUrl } from '@/lib/avatars'

/**
 * The merchant frame with Products › Keepsakes open, copied from `story-editor-shell.tsx` (itself
 * from `media-shell.tsx`) so the frames read the same. Navigation is drawn,
 * except Keepsakes and Inventory, which open the lab's screens.
 */
const sideLink = 'flex h-10 items-center gap-3 rounded-2xl px-3 text-sm text-foreground'
const subLink
  = 'flex h-9 items-center rounded-xl ps-11 pe-3 text-sm text-muted data-[active=true]:bg-default data-[active=true]:font-semibold data-[active=true]:text-foreground'
const tabLink
  = 'group flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted data-[active=true]:font-semibold data-[active=true]:text-accent'

const groups: { label: string, icon: IconComponent, pages: string[] }[] = [
  { label: 'Dashboard', icon: TodayIcon, pages: ['Today', 'Sales', 'Traffic', 'Map'] },
  { label: 'Operations', icon: OrdersIcon, pages: ['Orders', 'Handovers', 'Calendar'] },
  { label: 'Products', icon: ProductsIcon, pages: ['Keepsakes', 'Inventory', 'Pickup points'] },
  { label: 'Partners', icon: PartnersIcon, pages: [] },
  { label: 'Content', icon: ContentIcon, pages: ['Stories', 'Places', 'Categories', 'Tours', 'Media', 'Comments', 'Reviews', 'Inquiries', 'Analytics'] },
  { label: 'Settings', icon: SettingsIcon, pages: [] },
]

const phoneTabs: { label: string, icon: IconComponent }[] = [
  { label: 'Dashboard', icon: TodayIcon },
  { label: 'Operations', icon: OrdersIcon },
  { label: 'Calendar', icon: PickupDateIcon },
  { label: 'More', icon: MoreIcon },
]

/** The two pages this lab wires: Products › Keepsakes and Products › Inventory. */
export type ShellPage = 'Keepsakes' | 'Inventory'

export function KeepsakeShell({ active, onNav, children }: { active: ShellPage, onNav: (page: ShellPage) => void, children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-separator bg-surface lg:flex">
        <div className="sticky top-0 flex max-h-dvh flex-col gap-6 overflow-y-auto p-4 pb-6">
          <div className="flex items-center gap-3 px-2 pt-2">
            <BrandMark />
            <span className="min-w-0 text-sm leading-snug font-semibold">{shop.name}</span>
          </div>
          <nav aria-label="Merchant">
            <ul className="flex flex-col gap-1">
              {groups.map(group => (
                <li key={group.label}>
                  <span className={sideLink}>
                    <group.icon aria-hidden size={20} />
                    {group.label}
                  </span>
                  {group.pages.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {group.pages.map(page => (
                        <li key={page}>
                          {page === 'Keepsakes' || page === 'Inventory'
                            ? (
                                <button aria-current={page === active ? 'page' : undefined} className={`${subLink} w-full text-start outline-none focus-visible:focus-ring`} data-active={page === active} type="button" onClick={() => onNav(page)}>
                                  {page}
                                </button>
                              )
                            : <span className={subLink}>{page}</span>}
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
            <span className="truncate text-xs text-muted">Owner</span>
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">{children}</div>
        <nav aria-label="Merchant" className="fixed inset-x-0 bottom-0 z-20 border-t border-separator bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
          <ul className="grid grid-cols-4">
            {phoneTabs.map(tab => (
              <li key={tab.label}>
                <span className={tabLink} data-active={tab.label === 'More'}>
                  <tab.icon aria-hidden size={24} weight={tab.label === 'More' ? 'Filled' : undefined} />
                  {tab.label}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
