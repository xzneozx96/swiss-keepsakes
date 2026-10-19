import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { BackButton } from '@/components/layout/cart-button'
import { useLocale } from '@/contexts/locale-context'

/**
 * An account sub-screen (1.12s): a sticky bar with Back and the screen's name, centred like
 * a native settings page, over the content. Back returns to wherever the guest came from
 * (the hub, or C15 / a tour booking that linked here), else to the hub.
 */
export function AccountScreen({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const { t } = useLocale()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [title])

  return (
    <div className="flex flex-col pb-12">
      <header className="sticky top-0 z-20 grid grid-cols-[44px_1fr_44px] items-center gap-2 bg-background/90 px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 backdrop-blur-xl">
        <BackButton
          label={t('account.back')}
          onPress={() =>
            canGoBack
              ? router.history.back()
              : void navigate({ to: '/account' })}
        />
        <h1 className="truncate text-center text-base font-semibold">
          {title}
        </h1>
      </header>
      <div className="flex flex-col gap-8 px-4 pt-4">{children}</div>
    </div>
  )
}
