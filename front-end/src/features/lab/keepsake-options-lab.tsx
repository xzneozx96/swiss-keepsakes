/**
 * Lab page: a bar to pick the control, the design, the keepsake, a starting state and the width, the frame with the
 * design in it (an iframe, so the width is a real viewport), and a note per design. Mock data; nothing is stored.
 */
import type { DesignId, LabWidth, OptionsLabSearch } from './keepsake-options-data'

import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { droppedIdeas, intro, notes, summary } from './keepsake-options-copy'
import { designs, products, scenarios } from './keepsake-options-data'

const control
  = 'h-9 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

function frameSrc(search: OptionsLabSearch) {
  return `/lab/keepsake-options?${new URLSearchParams({ embed: '1', design: search.design, product: search.product, scenario: search.scenario }).toString()}`
}

function Note({ design }: { design: DesignId }) {
  const note = notes[design]
  const rows: [string, string][] = [
    ['The idea', note.idea],
    ['Why', note.why],
    ['German text', note.german],
    ['Inline or sheet', note.where],
    ['On a phone', note.phone],
    ['Keyboard and screen reader', note.keyboard],
    ['Trade-off', note.tradeoff],
  ]

  return (
    <section aria-label={`Notes on ${design.toUpperCase()}`} className="flex max-w-3xl flex-col gap-3 rounded-3xl bg-surface p-5 shadow-surface" data-testid="design-note">
      <h2 className="text-heading">{designs.find(d => d.id === design)!.title}</h2>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
        {rows.map(([term, text]) => (
          <div key={term} className="contents">
            <dt className="font-semibold">{term}</dt>
            <dd className="text-pretty text-muted">{text}</dd>
          </div>
        ))}
        <dt className="font-semibold">Sources</dt>
        <dd>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-muted">
            {note.sources.map(source => (
              <li key={source.label}>
                {source.url ? <a className="underline underline-offset-4" href={source.url} rel="noreferrer" target="_blank">{source.label}</a> : source.label}
                {!source.checked && ' (from memory, not re-checked)'}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
    </section>
  )
}

export function KeepsakeOptionsLab({ search, onChange }: { search: OptionsLabSearch, onChange: (patch: Partial<OptionsLabSearch>) => void }) {
  const productId = useId()
  const scenarioId = useId()
  const current = designs.find(design => design.id === search.design)!
  const isPhone = search.width === 'phone'
  const kinds = [{ id: 'options', label: 'A · Options' }, { id: 'variants', label: 'B · Create a variant' }] as const

  return (
    <div className="flex flex-1 flex-col gap-6 bg-default/40 px-4 py-6 lg:px-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Keepsake editor: option management and variant creation</h1>
        {intro.map(line => <p key={line} className="text-sm text-pretty text-muted">{line}</p>)}
        <p className="text-sm font-medium">{summary.a}</p>
        <p className="text-sm font-medium">{summary.b}</p>
      </header>

      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-surface/95 px-4 py-2.5 shadow-surface backdrop-blur">
        <div aria-label="Control" className="flex items-center gap-1" role="group">
          {kinds.map(kind => (
            <button
              key={kind.id}
              aria-pressed={current.control === kind.id}
              className={control}
              type="button"
              onClick={() => onChange({ design: kind.id === 'options' ? 'a1' : 'b1', scenario: 'normal' })}
            >
              {kind.label}
            </button>
          ))}
        </div>
        <div aria-label="Design" className="flex flex-wrap items-center gap-1" role="group">
          {designs.filter(design => design.control === current.control).map(design => (
            <button key={design.id} aria-pressed={search.design === design.id} className={control} type="button" onClick={() => onChange({ design: design.id })}>{design.title}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold" htmlFor={productId}>Keepsake</label>
          <select className={`${control} pe-8`} id={productId} value={search.product} onChange={event => onChange({ product: event.target.value as OptionsLabSearch['product'] })}>
            {products.map(product => <option key={product.id} value={product.id}>{product.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold" htmlFor={scenarioId}>Start from</label>
          <select className={`${control} pe-8`} id={scenarioId} value={search.scenario} onChange={event => onChange({ scenario: event.target.value as OptionsLabSearch['scenario'] })}>
            {scenarios.filter(scenario => scenario.controls.includes(current.control)).map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}
          </select>
        </div>
        <div aria-label="Width" className="flex items-center gap-1" role="group">
          {(['laptop', 'phone'] as LabWidth[]).map(id => (
            <button key={id} aria-pressed={search.width === id} className={control} type="button" onClick={() => onChange({ width: id })}>{id === 'laptop' ? 'Laptop 1280' : 'Phone 375'}</button>
          ))}
        </div>
      </div>

      <section aria-label="The design in the editor" className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface lg:p-8">
        <div className={isPhone ? 'flex justify-center' : 'overflow-x-auto rounded-2xl border border-separator'}>
          <iframe
            key={frameSrc(search) + search.width}
            className={isPhone
              ? 'box-content h-[812px] w-[375px] shrink-0 rounded-[2rem] border-8 border-foreground bg-background'
              : 'block h-[880px] w-[1280px] bg-background'}
            src={frameSrc(search)}
            title={`${current.title} at ${isPhone ? '375' : '1280'} px`}
          />
        </div>
      </section>

      <Note design={search.design} />

      <section aria-label="Ideas dropped" className="flex max-w-3xl flex-col gap-2 text-sm">
        <h2 className="font-semibold">Ideas tried and dropped</h2>
        <ul className="flex list-disc flex-col gap-1 ps-5 text-muted">
          {droppedIdeas.map(idea => <li key={idea}>{idea}</li>)}
        </ul>
      </section>
    </div>
  )
}
