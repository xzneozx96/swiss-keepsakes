/**
 * Lab page (v2 variant designs): a bar to pick the design, keepsake, state and width, the frame with the design in it
 * (an iframe, so the width is a real viewport) and the design's note. Mock data; nothing is stored.
 */
import type { VariantLabSearch, VDesignId, VWidth } from './variant-design-data'

import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { vDropped, vIntro, vNotes } from './variant-design-copy'
import { vDesigns, vKeepsakes, vProducts, vStates } from './variant-design-data'
import { useVariantStudio } from './variant-design-state'
import { VariantsV1 } from './variant-design-v1'
import { VariantsV2 } from './variant-design-v2'
import { VariantsV3 } from './variant-design-v3'

const control
  = 'h-9 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

const STEPS = ['Details', 'Options', 'Variants', 'Review and publish']

function frameSrc(search: VariantLabSearch) {
  return `/lab/keepsake-variant-design?${new URLSearchParams({ embed: '1', design: search.design, product: search.product, state: search.state }).toString()}`
}

function StepRail() {
  return (
    <nav aria-label="Steps" className="hidden lg:block">
      <ol className="sticky top-6 flex flex-col gap-1">
        {STEPS.map((step, index) => (
          <li key={step} aria-current={index === 2 ? 'step' : undefined} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${index === 2 ? 'bg-surface font-semibold shadow-surface' : 'text-muted'}`}>
            <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums ${index === 2 ? 'bg-foreground text-background' : index < 2 ? 'bg-success-soft text-success-soft-foreground' : 'bg-default text-muted'}`}>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function Design({ search }: { search: VariantLabSearch }) {
  const studio = useVariantStudio(search.product, search.state)

  if (search.design === 'v2')
    return <VariantsV2 studio={studio} />
  if (search.design === 'v3')
    return <VariantsV3 studio={studio} />

  return <VariantsV1 studio={studio} />
}

/** Inside the frame: the editor's layout with the design in the Variants step. */
export function VariantFrame({ search }: { search: VariantLabSearch }) {
  return (
    <div className="min-h-dvh bg-default/40 px-4 py-4 lg:px-6 lg:py-6">
      <div className="mx-auto grid max-w-[1100px] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <StepRail />
        <main className="flex min-w-0 flex-col gap-3">
          <header className="flex flex-col gap-0.5">
            <p className="text-xs text-muted lg:hidden">Step 3 of 4 · Variants</p>
            <h1 className="text-title">{vKeepsakes[search.product].name}</h1>
          </header>
          {/* Remount on every choice so each design starts from its own data. */}
          <Design key={`${search.design}-${search.product}-${search.state}`} search={search} />
        </main>
      </div>
    </div>
  )
}

function Note({ design }: { design: VDesignId }) {
  const note = vNotes[design]
  const rows: [string, string][] = [
    ['The idea', note.idea],
    ['Removed, and why', note.removed],
    ['On a phone', note.phone],
    ['Keyboard and screen reader', note.keyboard],
    ['New keepsake', note.newKeepsake],
    ['Trade-off', note.tradeoff],
  ]

  return (
    <section aria-label={`Notes on ${design.toUpperCase()}`} className="flex max-w-3xl flex-col gap-3 rounded-3xl bg-surface p-5 shadow-surface" data-testid="design-note">
      <h2 className="text-heading">{vDesigns.find(d => d.id === design)!.title}</h2>
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

export function VariantDesignLab({ search, onChange }: { search: VariantLabSearch, onChange: (patch: Partial<VariantLabSearch>) => void }) {
  const productId = useId()
  const stateId = useId()
  const current = vDesigns.find(design => design.id === search.design)!
  const isPhone = search.width === 'phone'

  return (
    <div className="flex flex-1 flex-col gap-6 bg-default/40 px-4 py-6 lg:px-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Keepsake editor: variants, round 2 (calm)</h1>
        {vIntro.map(line => <p key={line} className="text-sm text-pretty text-muted">{line}</p>)}
      </header>

      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-surface/95 px-4 py-2.5 shadow-surface backdrop-blur">
        <div aria-label="Design" className="flex flex-wrap items-center gap-1" role="group">
          {vDesigns.map(design => (
            <button key={design.id} aria-pressed={search.design === design.id} className={control} type="button" onClick={() => onChange({ design: design.id })}>{design.title}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold" htmlFor={productId}>Keepsake</label>
          <select className={`${control} pe-8`} id={productId} value={search.product} onChange={event => onChange({ product: event.target.value as VariantLabSearch['product'] })}>
            {vProducts.map(product => <option key={product.id} value={product.id}>{product.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold" htmlFor={stateId}>State</label>
          <select className={`${control} pe-8`} id={stateId} value={search.state} onChange={event => onChange({ state: event.target.value as VariantLabSearch['state'] })}>
            {vStates.map(state => <option key={state.id} value={state.id}>{state.label}</option>)}
          </select>
        </div>
        <div aria-label="Width" className="flex items-center gap-1" role="group">
          {(['laptop', 'phone'] as VWidth[]).map(id => (
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
          {vDropped.map(idea => <li key={idea}>{idea}</li>)}
        </ul>
      </section>
    </div>
  )
}
