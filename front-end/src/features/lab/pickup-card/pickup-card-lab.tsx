import type { ListProps } from './options'

import { Link } from '@tanstack/react-router'

import { OptionA, OptionB, OptionC } from './options'
import { samples } from './samples'

type List = (props: ListProps) => React.ReactNode

const options: { id: string, title: string, idea: string, List: List }[] = [
  { id: 'A', title: 'Ledger', idea: 'One white list split by hairlines, like the Media files: three lines per point, the status at the edge.', List: OptionA },
  { id: 'B', title: 'Placard', idea: 'Each card reads like the sign the guest looks for: serif name, the finding note quoted, hours in a hairline foot.', List: OptionB },
  { id: 'C', title: 'Week', idea: 'The opening week drawn as seven day cells with the time once beside them; the rest stays out.', List: OptionC },
]

export function PickupCardLab() {
  return (
    <div className="flex flex-1 flex-col gap-14 bg-background px-4 py-10 xl:px-10">
      <header className="flex max-w-2xl flex-col gap-2">
        <Link className="w-fit text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-title">Pickup point card, round 2</h1>
        <p className="text-sm text-pretty text-muted">
          Three new directions; round 1 is gone. Each shows a complete point, one with no German and an archived one.
          Status is dot text (only the missing language, or Archived). The name opens the editor; Archive or Restore and
          Delete sit in the ⋯ menu, where Delete is the only red. Buttons do nothing here.
        </p>
      </header>
      {options.map(({ id, title, idea, List }) => (
        <section key={id} aria-labelledby={`pickup-${id}`} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading" id={`pickup-${id}`}>
              <span className="text-muted">{id}</span>
              {' '}
              {title}
            </h2>
            <p className="max-w-2xl text-sm text-pretty text-muted">{idea}</p>
          </div>
          <div className="flex flex-wrap items-start gap-10">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-label text-muted">Desktop, one column of the two-column list (544 px)</p>
              <div className="w-136 max-w-full">
                <List places={samples} />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-label text-muted">Phone, 375 px with the 16 px gutter</p>
              <div className="w-93.75 max-w-full rounded-4xl bg-background px-4 py-4 ring-1 ring-separator">
                <List places={samples} />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
