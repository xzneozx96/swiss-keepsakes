import type { LinkProps } from '@tanstack/react-router'

import { MerchantBackBar } from '@/components/layout/merchant-back-bar'

/**
 * Header of a merchant screen that has no status chips: the title as the one h1 with its
 * intro underneath, and an optional action (the screen's one red button) at the end,
 * centred on the title and the intro together. With `back`, the phone shows the
 * guest-style ← bar instead of the big title (the h1 stays for screen readers).
 */
export function MerchantPageHeader({
  title,
  description,
  action,
  back,
  className = '',
}: {
  title: string
  description: string
  action?: React.ReactNode
  back?: LinkProps & { label: string }
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {back && <MerchantBackBar {...back} title={title} />}
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className={`text-title ${back ? 'max-lg:sr-only' : ''}`}>
          {title}
        </h1>
        <p className="text-sm text-pretty text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
