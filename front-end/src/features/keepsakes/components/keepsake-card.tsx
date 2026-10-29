import type { IconComponent } from '@/components/icons'

/** A section of the keepsake page: the M04 card with an icon tile, a title and an optional button on the right. */
export function KeepsakeCard({ id, icon: Icon, title, trailing, children }: {
  id: string
  icon?: IconComponent
  title: string
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex min-w-0 scroll-mt-20 flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5" id={id}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
            <Icon aria-hidden size={18} />
          </span>
        )}
        <h2 className="min-w-0 flex-1 text-base font-semibold" id={`${id}-title`}>{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  )
}
