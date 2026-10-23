import { Toast, toast } from '@heroui/react'
import { useEffect, useEffectEvent } from 'react'

import { useLocale } from '@/contexts/locale-context'

const liveRegion = { 'role': 'status', 'aria-live': 'polite' } as const

/**
 * The one toast region, mounted at the app root. Bottom placement, lifted above the
 * guest bottom bar and tab bar, and no wider than the 430px guest frame. Renders the
 * HeroUI default toast with translated labels (HeroUI's close label is English only).
 * Action sits under the text, as on phones. `storageFull` raises the one warning that the
 * latest changes could not be kept in this browser. HeroUI announces every toast as
 * `role=alert`. Only `danger` keeps that. The rest are `role=status` (polite).
 */
export function AppToasts({ storageFull }: { storageFull: boolean }) {
  const { t } = useLocale()

  const warn = useEffectEvent(() => toast.danger(t('demo.storageFull')))

  useEffect(() => {
    if (storageFull)
      warn()
  }, [storageFull])

  return (
    <Toast.Provider
      aria-label={t('cartToast.region')}
      className="bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] w-[min(398px,calc(100vw-2rem))] sm:min-w-0"
      placement="bottom"
    >
      {({ toast: item }) => {
        const { title, description, actionProps, variant } = item.content

        return (
          <Toast placement="bottom" toast={item} variant={variant}>
            <Toast.Indicator variant={variant} />
            <Toast.Content {...(variant === 'danger' ? {} : liveRegion)}>
              {title && <Toast.Title>{title}</Toast.Title>}
              {description && (
                <Toast.Description>{description}</Toast.Description>
              )}
              {actionProps?.children && <Toast.ActionButton {...actionProps} />}
            </Toast.Content>
            <Toast.CloseButton aria-label={t('cartToast.close')} />
          </Toast>
        )
      }}
    </Toast.Provider>
  )
}
