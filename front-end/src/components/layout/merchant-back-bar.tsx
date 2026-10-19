import type { LinkProps } from '@tanstack/react-router'

import { Link } from '@tanstack/react-router'
import { createContext, use } from 'react'
import { createPortal } from 'react-dom'

import { BackIcon } from '@/components/icons'

/** The sticky phone slot above the merchant page; the shell provides it, detail screens fill it. */
export const MerchantBarSlotContext = createContext<HTMLElement | null>(null)

/**
 * Phone top bar for merchant detail screens, the guest pattern (← round back + title).
 * It docks into the shell's sticky slot, so it pins while the page scrolls and runs
 * edge to edge. The page keeps its own h1 for screen readers and the desktop layout;
 * the title here is the same text, so it is hidden from assistive tech.
 */
export function MerchantBackBar({
  label,
  title,
  ...link
}: LinkProps & { label: string, title: string }) {
  const slot = use(MerchantBarSlotContext)

  if (!slot)
    return null

  return createPortal(
    <div className="flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top,0px)]">
      <Link
        aria-label={label}
        className="-ms-2 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-transform focus-visible:focus-ring active:scale-95"
        {...link}
      >
        <BackIcon size={22} />
      </Link>
      <span aria-hidden className="min-w-0 truncate text-[17px] font-semibold">
        {title}
      </span>
    </div>,
    slot,
  )
}
