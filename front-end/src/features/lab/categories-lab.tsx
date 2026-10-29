import type { CategoriesLabSearch } from './categories-search-params'

import { Link } from '@tanstack/react-router'

const chip
  = 'min-h-9 rounded-full border border-separator bg-surface px-3.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

const groups = [
  { key: 'kind', label: 'List', values: [['map', 'Map'], ['blog', 'Blog']] },
  {
    key: 'state',
    label: 'Opens on',
    values: [['list', 'List'], ['page', 'Category page (phone)'], ['add', 'Add'], ['edit', 'Edit'], ['refused', 'Refused delete']],
  },
] as const

/** A frame's address: a new address is a fresh screen with the seed lists. */
function frameSrc(search: CategoriesLabSearch) {
  return `/lab/categories?${new URLSearchParams({ embed: '1', kind: search.kind, state: search.state }).toString()}`
}

/**
 * Lab for N23, the category editor, round 2: one design, shown in a 375 px phone frame and a
 * desktop frame, so the breakpoints and sheets act as they would on each.
 */
export function CategoriesLab({ search, onChange }: {
  search: CategoriesLabSearch
  onChange: (patch: Partial<CategoriesLabSearch>) => void
}) {
  const src = frameSrc(search)

  return (
    <div className="flex flex-1 flex-col gap-4 bg-default/40 px-4 py-5 lg:px-8">
      <div className="flex flex-col gap-1">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Categories editor (N23), round 2</h1>
        <p className="max-w-3xl text-sm text-pretty text-muted">
          The grouped table from 1024 px and the drill-in on phones. Drag ⋮⋮ to reorder: parents among parents, a
          sub-category among its siblings (ArrowUp and ArrowDown on the handle, or Move up and Move down in ⋯, from the
          keyboard). Every frame works; nothing is stored.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-3xl bg-surface px-4 py-3 shadow-surface">
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

      <div className="flex flex-col items-start gap-8">
        <section aria-label="Phone" className="flex w-full flex-col gap-2 lg:w-auto">
          <h2 className="font-semibold">Phone, 375 px: drill-in</h2>
          <div className="-mx-4 lg:mx-0">
            <iframe
              key={`phone|${src}`}
              className="h-[760px] w-full shrink-0 border-y border-separator bg-background lg:w-[375px] lg:rounded-[28px] lg:border-0 lg:shadow-overlay lg:ring-1 lg:ring-separator"
              src={src}
              title="Category editor at 375 px"
            />
          </div>
        </section>
        <section aria-label="Desktop" className="flex w-full min-w-0 flex-col gap-2">
          <h2 className="font-semibold">Desktop: grouped table</h2>
          <div className="overflow-x-auto rounded-3xl shadow-surface">
            <iframe key={`desktop|${src}`} className="h-[760px] w-full min-w-[1024px] bg-background" src={src} title="Category editor at desktop width" />
          </div>
        </section>
      </div>
    </div>
  )
}
