import { Button } from '@heroui/react'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import heroPhoto from '@/assets/photos/lucerne-water-tower.jpg'

import { BackIcon } from '@/components/icons'

import { BrandLogo } from '@/components/layout/brand-logo'
import { BackButton } from '@/components/layout/cart-button'
import { useLocale } from '@/contexts/locale-context'
import { useDemoSelector } from '@/features/demo'
import { useSignIn } from '../hooks/use-sign-in'
import { SignInForm } from './sign-in-form'

/**
 * C05 sign-in screen (owner review 1.6r). Phones, inside the 430px guest frame: the Luzerne
 * photo on top and the form on a sheet that overlaps it, so the code slots and errors sit on
 * a plain surface. From 1024px: two columns, form on the left, the photo filling the right.
 * Once signed in (or when opened signed in) it replaces itself with `returnTo`. `googleFailed`: Neon
 * Auth sent the guest back here because Google sign-in did not finish.
 */
export function SignInScreen({
  returnTo,
  googleFailed,
}: {
  returnTo: string
  googleFailed: boolean
}) {
  const { t } = useLocale()
  const signedIn = useDemoSelector(s => s.data.signedInGuestId !== null)
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const view = useSignIn(returnTo, googleFailed)

  // Leave sign-in out of history. Opened over its own return screen (C06, C11, Account), step
  // back to that entry: replacing would leave a second copy, so Back there seemed to do nothing.
  // Otherwise (cart → C06, or a direct visit) replace sign-in with the return screen.
  useEffect(() => {
    if (!signedIn)
      return
    if (canGoBack && router.state.location.state.signInOverReturnTo)
      router.history.back()
    else router.history.replace(returnTo)
  }, [signedIn, router, returnTo, canGoBack])

  if (signedIn)
    return null

  // Leaving without signing in goes back to where the guest came from (C04, not C06).
  const back = () =>
    canGoBack ? router.history.back() : void navigate({ to: '/' })

  return (
    <div className="flex flex-1 justify-center bg-default/60 lg:bg-background">
      <div className="relative flex w-full max-w-[430px] flex-1 flex-col bg-background sm:shadow-overlay lg:grid lg:max-w-none lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:shadow-none">
        <figure className="relative h-[clamp(220px,36dvh,320px)] shrink-0 overflow-hidden lg:order-2 lg:m-3 lg:h-auto lg:rounded-[28px]">
          <img
            alt={t('auth.hero.alt')}
            className="absolute inset-0 size-full object-cover object-[50%_14%] lg:object-[50%_45%]"
            decoding="async"
            fetchPriority="high"
            height={1600}
            src={heroPhoto}
            width={1200}
          />
          {/* Phone: a short shade keeps the round Back button legible on the sky. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent lg:hidden"
          />
          <div className="absolute start-4 top-[calc(env(safe-area-inset-top,0px)+12px)] lg:hidden">
            <BackButton label={t('auth.back')} tone="pill" onPress={back} />
          </div>
          <figcaption className="absolute inset-x-0 bottom-0 hidden flex-col gap-1 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-10 pt-32 pb-9 text-white lg:flex">
            <span className="font-serif text-title text-balance">
              {t('auth.hero.place')}
            </span>
            <span className="text-xs text-white/80">
              {t('auth.hero.credit')}
            </span>
          </figcaption>
        </figure>

        <div className="relative -mt-7 flex flex-1 flex-col rounded-t-[28px] bg-background px-6 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] lg:order-1 lg:mt-0 lg:rounded-none lg:px-12 lg:pt-6 lg:pb-10 xl:px-20">
          <header className="hidden h-14 items-center justify-between gap-4 lg:flex">
            <BrandLogo label={t('app.name')} />
            <Button size="sm" variant="ghost" onPress={back}>
              <BackIcon size={18} />
              {t('auth.back')}
            </Button>
          </header>
          <div className="w-full lg:my-auto lg:max-w-[400px] lg:self-center lg:py-12">
            <SignInForm view={view} />
          </div>
        </div>
      </div>
    </div>
  )
}
