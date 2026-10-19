import type { ReviewOrderView } from './order-card'

import { Alert, Button, Drawer } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { ChevronDownIcon, StatusSuccessIcon } from '@/components/icons'

import { InfoNote } from '@/components/info-note'
import { BackButton } from '@/components/layout/cart-button'
import { OrderCard } from './order-card'

export type { ReviewItemView, ReviewOrderView } from './order-card'

export interface ReviewViewProps {
  title: string
  backLabel: string
  /** Nothing is charged now; the seller confirms each order first. */
  intro: string
  /** Some text is shown in the other language (R02, AC30). */
  languageNotice?: string
  orders: ReviewOrderView[]
  bar: {
    /** "Combined total, for reference". */
    totalLabel: string
    total: string
    /** "Nothing to pay now". */
    chip: string
    /** Accessible name of the total, which opens the breakdown sheet. */
    detailsLabel: string
    /** "Send request · no payment yet". */
    sendLabel: string
  }
  /** Bottom sheet opened from the bar total: each order's total and due amount (C04 pattern). */
  breakdown: {
    title: string
    closeLabel: string
  }
  /** Shown after a send that could not go through; the cart is unchanged. */
  error?: {
    title: string
    /** One line per gift that is short, naming it. */
    lines: string[]
    message: string
    actionLabel: string
  }
  onBack: () => void
  onSend: () => void
  onEditCart: () => void
}

/**
 * C06 Review and send: each order as one white card holding its request date, place,
 * payment type, gifts, amount due, total, deadline rule and cancellation policy. The
 * sticky bar holds the reference total (opens the breakdown sheet) and the send button.
 */
export function ReviewView({
  title,
  backLabel,
  intro,
  languageNotice,
  orders,
  bar,
  breakdown,
  error,
  onBack,
  onSend,
  onEditCart,
}: ReviewViewProps) {
  const errorRef = useRef<HTMLDivElement>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  // The error sits above the orders; bring it into view and give it focus so it is read out.
  useEffect(() => {
    if (!error)
      return
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    errorRef.current?.focus({ preventScroll: true })
  }, [error])

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/90 ps-4 pe-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <BackButton label={backLabel} onPress={onBack} />
        <h1 className="font-serif text-title">{title}</h1>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-5">
        <InfoNote text={intro} />

        {error && (
          <div
            ref={errorRef}
            className="rounded-3xl outline-none focus-visible:focus-ring"
            role="alert"
            tabIndex={-1}
          >
            <Alert className="alert--soft w-full min-w-0" status="danger">
              <Alert.Indicator />
              <Alert.Content className="min-w-0 items-start gap-2">
                <Alert.Title>{error.title}</Alert.Title>
                {error.lines.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm font-medium">
                    {error.lines.map(line => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                <Alert.Description>{error.message}</Alert.Description>
                <Button size="sm" variant="tertiary" onPress={onEditCart}>
                  {error.actionLabel}
                </Button>
              </Alert.Content>
            </Alert>
          </div>
        )}

        {languageNotice && <InfoNote text={languageNotice} />}

        <div className="flex flex-col gap-4 pt-1">
          {orders.map(order => (
            <OrderCard key={order.key} order={order} />
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 z-30 flex flex-col gap-3 border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <div className="flex items-center justify-between gap-3">
          {/* As on C04: the underlined total opens the price breakdown. */}
          <button
            aria-haspopup="dialog"
            aria-label={`${bar.detailsLabel}, ${bar.totalLabel} ${bar.total}`}
            className="-ms-1 flex min-w-0 flex-col items-start rounded-lg px-1 text-start outline-none focus-visible:focus-ring"
            type="button"
            onClick={() => setShowBreakdown(true)}
          >
            <span className="text-xs text-muted">{bar.totalLabel}</span>
            <span className="flex items-center gap-1 text-lg font-semibold tabular-nums underline underline-offset-4">
              {bar.total}
              <ChevronDownIcon aria-hidden className="rotate-180" size={16} />
            </span>
          </button>
          <Chip>{bar.chip}</Chip>
        </div>
        <Button fullWidth size="lg" onPress={onSend}>
          {bar.sendLabel}
        </Button>
      </div>

      <Drawer.Backdrop isOpen={showBreakdown} onOpenChange={setShowBreakdown}>
        <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.CloseTrigger aria-label={breakdown.closeLabel} />
            <Drawer.Header>
              <Drawer.Heading className="text-heading">
                {breakdown.title}
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] text-foreground">
              <ul className="flex flex-col gap-3">
                {orders.map(order => (
                  <li key={order.key} className="flex items-start gap-3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>{order.title}</span>
                      <span className="text-sm text-muted">
                        {order.dueLabel}: {order.due}
                      </span>
                    </span>
                    <span className="tabular-nums">{order.total}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-separator pt-4">
                <span className="font-semibold">{bar.totalLabel}</span>
                <span className="text-heading tabular-nums">{bar.total}</span>
              </div>
              <Chip>{bar.chip}</Chip>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 self-start rounded-full bg-surface-secondary px-2 py-0.5 text-xs whitespace-nowrap">
      <StatusSuccessIcon aria-hidden size={12} />
      {children}
    </span>
  )
}
