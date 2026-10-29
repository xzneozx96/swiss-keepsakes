import type { ReactNode } from 'react'
import type { InviteRole } from '../lib/refusals'

import heroPhoto from '@/assets/photos/lucerne-kapellbruecke-1200.jpg'
import { BrandLogo } from '@/components/layout/brand-logo'
import { useLocale } from '@/contexts/locale-context'

/**
 * The page of an invitation (A02 Owner, M01 Store Manager): the sign-in screen's column, header, spacing and type
 * (`features/auth/components/sign-in-screen.tsx`), so the invitation reads as the first page of sign-in. The Lucerne
 * photo carries the store's name, and goes grey once the link can never work again.
 */
export function InvitationFrame({ photo, storeName, audience, children }: {
  photo: 'colour' | 'grey'
  storeName?: string
  audience: InviteRole
  children: ReactNode
}) {
  const { t } = useLocale()

  return (
    <main className="flex flex-1 justify-center bg-default/60 lg:bg-background" data-invitation-role={audience}>
      <div className="relative flex w-full max-w-[430px] flex-1 flex-col bg-background sm:shadow-overlay lg:grid lg:max-w-none lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:shadow-none">
        <figure className="relative h-[clamp(220px,36dvh,320px)] shrink-0 overflow-hidden lg:order-2 lg:m-3 lg:h-auto lg:rounded-[28px]">
          <img
            alt=""
            className={`absolute inset-0 size-full object-cover object-[50%_40%] transition-[filter] duration-500 ${photo === 'grey' ? 'grayscale' : ''}`}
            data-photo={photo}
            decoding="async"
            src={heroPhoto}
          />
          <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent lg:hidden" />
          <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-6 pt-20 pb-11 text-white lg:px-10 lg:pt-32 lg:pb-9">
            <span className="text-xs text-white/80">{t('app.name')}</span>
            {storeName && <span className="font-serif text-title text-balance [overflow-wrap:anywhere]">{storeName}</span>}
          </figcaption>
        </figure>

        <div className="relative -mt-7 flex flex-1 flex-col rounded-t-[28px] bg-background px-6 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] lg:order-1 lg:mt-0 lg:rounded-none lg:px-12 lg:pt-6 lg:pb-10 xl:px-20">
          <header className="hidden h-14 items-center justify-between gap-4 lg:flex">
            <BrandLogo label={t('app.name')} />
          </header>
          <div className="w-full min-w-0 lg:my-auto lg:max-w-[400px] lg:self-center lg:py-12">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
