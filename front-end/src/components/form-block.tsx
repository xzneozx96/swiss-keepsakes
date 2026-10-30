import type { ReactNode } from 'react'
import type { IconComponent } from '@/components/icons'

import { useId } from 'react'

/**
 * A block of the step, in a card: rounded, light surface, soft shadow, not collapsible. A block that groups several
 * different fields has a header (icon tile, title, one line on what it is for). A block that holds one field has none:
 * the field's own label, input and help line are the whole block, so no heading repeats the label.
 *
 * `id` makes the block a link target (the publish check scrolls to it), and `trailing` puts an action, such as a button,
 * at the end of the title row. It shows only when the block has a title. `headingLevel` is the title's heading level,
 * h3 unless the screen puts the blocks straight under its h1 (then 2).
 */
export function Block({ id, icon: Icon, title, hint, trailing, headingLevel = 3, children }: {
  id?: string
  icon?: IconComponent
  title?: string
  hint?: string
  trailing?: ReactNode
  headingLevel?: 2 | 3
  children: ReactNode
}) {
  const titleId = useId()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section aria-labelledby={title ? titleId : undefined} className="flex min-w-0 scroll-mt-20 flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5" data-testid="place-block" id={id}>
      {title && (
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
              <Icon aria-hidden size={18} />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Heading className="font-semibold" id={titleId}>{title}</Heading>
            {hint && <p className="text-sm text-pretty text-muted">{hint}</p>}
          </div>
          {trailing}
        </div>
      )}
      {children}
    </section>
  )
}
