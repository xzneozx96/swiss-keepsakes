import { Button, Drawer } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { AccountIcon, LogoutIcon, ShopIcon } from '@/components/icons'
import { BrandMark } from '@/components/layout/brand-mark'
import { useLocale } from '@/contexts/locale-context'
import { useSignOut } from '@/features/auth/hooks/use-sign-out'
import { avatarUrl } from '@/lib/avatars'
import { sessionUserQuery } from '../api/queries'

const sideLink
  = 'flex h-10 items-center gap-3 rounded-2xl px-3 text-sm text-muted outline-none hover:bg-default focus-visible:focus-ring data-[status=active]:bg-default data-[status=active]:font-semibold data-[status=active]:text-foreground'

const tabLink
  = 'group relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted outline-none focus-visible:focus-ring data-[status=active]:font-semibold data-[status=active]:text-accent'

/**
 * The frame of the Super Admin's screens, built like the merchant dashboard's (MerchantShell): from 1024px a
 * sidebar with the mark, the one page and the signed-in account pinned to the bottom, on phones a bottom bar
 * with the page and an account sheet. Stores is the only page, so no other link is shown.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { language, t } = useLocale()
  const navigate = useNavigate()
  const session = useQuery(sessionUserQuery)
  const { signOutThen, pending } = useSignOut()
  const [accountOpen, setAccountOpen] = useState(false)
  const email = session.data?.email ?? ''
  const signOut = () => signOutThen(() => void navigate({ to: '/$lang', params: { lang: language } }))

  return (
    <div className="flex flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-separator bg-surface lg:flex">
        <div className="sticky top-0 flex max-h-[calc(100dvh-4.5rem)] flex-col gap-6 overflow-y-auto p-4 pb-14">
          <Link className="flex items-center gap-3 rounded-xl px-2 pt-2 outline-none focus-visible:focus-ring" to="/admin">
            <BrandMark />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm leading-snug font-semibold">Swiss Keepsakes</span>
              <span className="text-xs text-muted">{t('stores.nav.role')}</span>
            </span>
          </Link>
          <nav aria-label={t('stores.nav.label')}>
            <ul className="flex flex-col gap-1">
              <li>
                <Link className={sideLink} to="/admin">
                  <ShopIcon size={20} />
                  {t('stores.nav.stores')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-separator bg-surface py-4 ps-6 pe-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              alt=""
              className="size-9 shrink-0 rounded-full bg-default object-cover"
              decoding="async"
              src={avatarUrl(email)}
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium" title={email}>{email}</span>
              <span className="truncate text-xs text-muted">{t('stores.nav.role')}</span>
            </span>
          </div>
          <Button
            isIconOnly
            aria-label={t('account.signOut')}
            className="text-danger"
            isPending={pending}
            size="sm"
            variant="ghost"
            onPress={signOut}
          >
            <LogoutIcon aria-hidden size={18} />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 lg:px-8 lg:pt-8 lg:pb-8">
          {children}
        </main>

        <nav
          aria-label={t('stores.nav.label')}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-separator bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        >
          <ul className="grid grid-cols-2">
            <li>
              <Link className={tabLink} to="/admin">
                <ShopIcon className="group-data-[status=active]:hidden" size={24} />
                <ShopIcon className="hidden group-data-[status=active]:block" size={24} weight="Filled" />
                {t('stores.nav.stores')}
              </Link>
            </li>
            <li>
              <Drawer isOpen={accountOpen} onOpenChange={setAccountOpen}>
                <Drawer.Trigger className="flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted outline-none focus-visible:focus-ring">
                  <AccountIcon size={24} />
                  {t('stores.nav.account')}
                </Drawer.Trigger>
                <Drawer.Backdrop>
                  <Drawer.Content placement="bottom">
                    <Drawer.Dialog>
                      <Drawer.Handle />
                      <Drawer.Header>
                        <Drawer.Heading>{t('stores.nav.accountTitle')}</Drawer.Heading>
                        <p className="text-label break-all text-muted">{email} · {t('stores.nav.role')}</p>
                      </Drawer.Header>
                      <Drawer.Body>
                        <div className="pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
                          <Button fullWidth className="min-h-11" isPending={pending} variant="secondary" onPress={signOut}>
                            <LogoutIcon aria-hidden size={18} />
                            {t('account.signOut')}
                          </Button>
                        </div>
                      </Drawer.Body>
                    </Drawer.Dialog>
                  </Drawer.Content>
                </Drawer.Backdrop>
              </Drawer>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
