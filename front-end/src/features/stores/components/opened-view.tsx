import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { StatusSuccessIcon, TodayIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'

/**
 * The store is open. "Go to your dashboard" opens Today, where the merchant menu shows from then on. The stores
 * the person belongs to are read again first, so the "Open your store" link of the store area is gone on arrival.
 */
export function OpenedView({ storeName }: { storeName: string }) {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const goToDashboard = async () => {
    setLeaving(true)
    await queryClient.refetchQueries({ queryKey: queryKeys.stores.me })
    await navigate({ to: '/store', replace: true })
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <section aria-labelledby="stores-opened" className="flex w-full max-w-[520px] flex-col items-center gap-5 rounded-3xl bg-surface p-8 text-center shadow-surface" role="status">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <StatusSuccessIcon size={36} />
        </span>
        <h2 ref={headingRef} className="font-serif text-display text-balance outline-none" id="stores-opened" tabIndex={-1}>
          {t('stores.opened.title', { store: storeName })}
        </h2>
        <p className="text-body text-pretty text-muted">{t('stores.opened.text')}</p>
        <Button className="min-h-11" isPending={leaving} onPress={goToDashboard}>
          <TodayIcon aria-hidden size={18} />
          {t('stores.opened.dashboard')}
        </Button>
      </section>
    </div>
  )
}
