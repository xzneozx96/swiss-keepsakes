import type { IconComponent } from '@/components/icons'

/**
 * The frame of every card on the Write screen: a 36 px icon tile, a title and an optional trailing control. On a phone the
 * card runs edge to edge between two rules; from 1024 px it is a rounded surface.
 */
export function WriteCard({ icon: Icon, title, trailing, children, className = '' }: {
  icon: IconComponent
  title: string
  trailing?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section aria-label={title} className={`flex flex-col gap-4 border-y border-separator bg-surface p-4 lg:rounded-3xl lg:border-none lg:p-6 lg:shadow-surface ${className}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
          <Icon aria-hidden size={18} />
        </span>
        <h2 className="min-w-0 flex-1 text-base font-semibold">{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  )
}
