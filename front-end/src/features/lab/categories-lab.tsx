import type { CategoriesLabSearch, CategoryOption } from './categories-search-params'

import { Link } from '@tanstack/react-router'

import { useIsWide } from '@/hooks/use-is-wide'

const chip
  = 'min-h-9 rounded-full border border-separator bg-surface px-3.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

const categoryOptions: { id: CategoryOption, title: string, note: string }[] = [
  {
    id: 'A',
    title: 'Outline',
    note: 'One list, rows open in place to edit or say why delete is refused; Reorder mode with arrows.',
  },
  {
    id: 'B',
    title: 'Drill-in',
    note: 'A list of top-level categories; each opens its own page with position arrows, sub-categories and a Delete checklist.',
  },
  {
    id: 'C',
    title: 'Table',
    note: 'The dashboard table with grouped rows and the ⋯ menu (cards on phones); edit and refused delete open sheets.',
  },
]

const groups = [
  { key: 'width', label: 'Width', values: [['phone', 'Phone 375'], ['desktop', 'Desktop']] },
  { key: 'kind', label: 'List', values: [['map', 'Map'], ['blog', 'Blog']] },
  { key: 'state', label: 'Opens on', values: [['list', 'List'], ['edit', 'Edit'], ['refused', 'Refused delete']] },
] as const

/** A frame's address: a new address is a fresh screen with the seed lists. */
function categoriesFrameSrc(search: CategoriesLabSearch, option: CategoryOption) {
  return `/lab/categories?${new URLSearchParams({ embed: '1', option, kind: search.kind, state: search.state }).toString()}`
}

function Panel({ search, option, n, wide }: { search: CategoriesLabSearch, option: (typeof categoryOptions)[number], n: number, wide: boolean }) {
  const desktop = search.width === 'desktop'

  return (
    <section aria-label={`Option ${option.id}`} className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">{n}</span>
        <h2 className="font-semibold">{`${option.id} · ${option.title}`}</h2>
      </div>
      <p className={`text-label text-pretty text-muted ${desktop ? 'max-w-3xl' : ''}`}>{option.note}</p>
      <div className={desktop ? 'overflow-x-auto rounded-3xl shadow-surface' : wide ? 'flex justify-center' : '-mx-4'}>
        <iframe
          className={desktop
            ? 'h-[760px] w-full min-w-[1024px] bg-background'
            : wide
              ? 'h-[760px] w-[375px] shrink-0 rounded-[28px] bg-background shadow-overlay ring-1 ring-separator'
              : 'h-[720px] w-full border-y border-separator bg-background'}
          src={categoriesFrameSrc(search, option.id)}
          title={`Option ${option.id}, ${option.title}`}
        />
      </div>
    </section>
  )
}

/**
 * Lab for N23, the category editor: three structures, each in its own frame so its breakpoints and
 * sheets act as on a 375 px phone or a laptop. Side by side from 1024 px; one at a time with a switcher below.
 */
export function CategoriesLab({ search, onChange }: {
  search: CategoriesLabSearch
  onChange: (patch: Partial<CategoriesLabSearch>) => void
}) {
  const wide = useIsWide()
  const sideBySide = wide && search.width === 'phone'
  const shown = sideBySide || search.width === 'desktop' ? categoryOptions : categoryOptions.filter(o => o.id === search.option)

  return (
    <div className="flex flex-1 flex-col gap-4 bg-default/40 px-4 py-5 lg:px-8">
      <div className="flex flex-col gap-1">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Categories editor (N23): three options</h1>
        <p className="max-w-3xl text-sm text-pretty text-muted">
          Map and blog categories: EN and DE names (one required), one level of sub-categories, order among
          siblings, and delete refused while it has sub-categories or is used. Every frame works; nothing is stored.
          Recommendation: C, then A.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-3xl bg-surface px-4 py-3 shadow-surface">
        {!sideBySide && search.width === 'phone' && (
          <div aria-label="Option" className="flex items-center gap-1.5" role="group">
            {categoryOptions.map((o, i) => (
              <button key={o.id} aria-pressed={search.option === o.id} className={chip} type="button" onClick={() => onChange({ option: o.id })}>
                {`${i + 1} ${o.id}`}
              </button>
            ))}
          </div>
        )}
        {groups.map(g => (
          <div key={g.key} aria-label={g.label} className="flex flex-wrap items-center gap-1.5" role="group">
            <span className="text-label text-muted">{g.label}</span>
            {g.values.map(([value, label]) => (
              <button key={value} aria-pressed={search[g.key] === value} className={chip} type="button" onClick={() => onChange({ [g.key]: value })}>
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className={sideBySide ? 'grid grid-cols-3 items-start gap-4' : 'flex flex-col gap-8'}>
        {shown.map(o => (
          <Panel key={`${o.id}|${categoriesFrameSrc(search, o.id)}`} n={categoryOptions.indexOf(o) + 1} option={o} search={search} wide={wide} />
        ))}
      </div>
    </div>
  )
}
