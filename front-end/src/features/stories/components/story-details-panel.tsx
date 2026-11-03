import type { ReactNode } from 'react'
import type { PublishChecks } from '../lib/publish-checks'
import type { IconComponent } from '@/components/icons'

import { createContext, use, useEffect, useRef, useState } from 'react'

import { ChevronDownIcon, StatusDangerIcon, StatusWarningIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

export type DetailCardId = 'link' | 'review' | 'categories' | 'pins' | 'stay' | 'interests' | 'keepsakes' | 'related'

const CARD_IDS: DetailCardId[] = ['link', 'review', 'categories', 'pins', 'stay', 'interests', 'keepsakes', 'related']

export interface DetailsPanelState {
  open: Record<DetailCardId, boolean>
  toggle: (id: DetailCardId) => void
  /** Opens the card and scrolls it into view (the Edit and Show buttons of a check). */
  reveal: (id: DetailCardId) => void
  checks: PublishChecks
}

const PanelContext = createContext<DetailsPanelState | undefined>(undefined)

export const detailsAnchor = (id: DetailCardId) => `details-${id}`

/**
 * Which cards of the Details panel are open. A card starts open when a check targets it, so what needs the merchant is
 * in view; later the merchant decides. Held by the Review screen so a check outside the panel can reveal a card.
 */
export function useDetailsPanel(checks: PublishChecks): DetailsPanelState {
  const [open, setOpen] = useState<Record<DetailCardId, boolean>>(() =>
    Object.fromEntries(CARD_IDS.map(id => [id, [...checks.blocking, ...checks.warnings].some(check => check.target === id)])) as Record<DetailCardId, boolean>)

  const revealRef = useRef<DetailCardId>(undefined)

  // The card must be open before its anchor is scrolled to, so the scroll waits for the render that opens it.
  useEffect(() => {
    if (revealRef.current) {
      document.getElementById(detailsAnchor(revealRef.current))?.scrollIntoView?.({ block: 'start' })
      revealRef.current = undefined
    }
  }, [open])

  return {
    open,
    checks,
    toggle: id => setOpen(current => ({ ...current, [id]: !current[id] })),
    reveal: (id) => {
      revealRef.current = id
      setOpen(current => ({ ...current, [id]: true }))
    },
  }
}

/** The container of the cards that both languages share. It cannot be closed; its cards can. T-E4.3f and g render their cards inside it. */
export function DetailsPanel({ panel, children }: { panel: DetailsPanelState, children: ReactNode }) {
  const { t } = useLocale()

  return (
    <PanelContext value={panel}>
      <section aria-labelledby="details-title" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold" id="details-title">{t('storyPublish.details.title')}</h2>
          <p className="text-sm text-muted">{t('storyPublish.details.shared')}</p>
        </div>
        {children}
      </section>
    </PanelContext>
  )
}

/** The state of one card: open or closed, and whether a check names it (blocking first). */
export function useDetailsCard(id: DetailCardId) {
  const panel = use(PanelContext)

  if (!panel)
    throw new Error('A details card must sit inside DetailsPanel')
  const problem = panel.checks.blocking.some(check => check.target === id) ? 'danger' as const : panel.checks.warnings.some(check => check.target === id) ? 'warning' as const : undefined

  return { open: panel.open[id], toggle: () => panel.toggle(id), problem, anchor: detailsAnchor(id) }
}

/** A card of the Details panel: the header is the open and close control, with the status icon after the title and the summary under it while closed. */
export function CollapsibleCard({ id, icon: Icon, title, summary, children }: {
  id: DetailCardId
  icon: IconComponent
  title: string
  summary: string
  children: ReactNode
}) {
  const { t } = useLocale()
  const { open, toggle, problem, anchor } = useDetailsCard(id)
  const bodyId = `${anchor}-body`

  return (
    <section aria-labelledby={`${anchor}-title`} className="flex scroll-mt-36 flex-col rounded-3xl bg-surface shadow-surface" id={anchor}>
      <button aria-controls={bodyId} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 rounded-3xl p-4 text-start outline-none focus-visible:focus-ring lg:px-5" type="button" onClick={toggle}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
          <Icon aria-hidden size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 text-base font-semibold" id={`${anchor}-title`}>
            {title}
            {problem === 'danger' && <StatusDangerIcon aria-label={t('storyPublish.card.stops')} className="shrink-0 text-danger" size={16} />}
            {problem === 'warning' && <StatusWarningIcon aria-label={t('storyPublish.card.look')} className="shrink-0 text-warning" size={16} />}
          </span>
          {!open && <span className="truncate text-sm text-muted">{summary}</span>}
        </span>
        <ChevronDownIcon aria-hidden className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} size={18} />
      </button>
      {open && <div className="flex flex-col gap-4 px-4 pb-4 lg:px-5 lg:pb-5" id={bodyId}>{children}</div>}
    </section>
  )
}
