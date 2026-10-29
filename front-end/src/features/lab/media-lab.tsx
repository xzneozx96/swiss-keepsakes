/**
 * Lab, slice S4: the merchant media library (N18, story E4.11), option B as the owner picked it,
 * in a frame at laptop (1280 px) or phone (375 px) width. One compact toolbar sets the state and
 * the width. Mock data, Wed 28 Oct 2026; nothing is stored.
 */
import type { LabState, LabWidth, MediaLabSearch } from './media-search-params'

import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { isUnused, seedRefs, seedRows } from './media-data'
import { libraryRules } from './media-rules'

const control
  = 'h-9 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

/** Counted from the mock data, so the notes stay true when the data changes. */
const counts = {
  files: seedRows.length,
  pdfs: seedRows.filter(r => r.kind === 'pdf').length,
  processing: seedRows.filter(r => r.status === 'processing').length,
  retired: seedRows.filter(r => r.status === 'retired').length,
  unused: seedRows.filter(r => r.status !== 'retired' && isUnused(r.id, seedRefs, libraryRules)).length,
  keepsakeOnly: seedRows.filter(r => !isUnused(r.id, seedRefs, { countKeepsakes: true }) && isUnused(r.id, seedRefs, libraryRules)).length,
}

const states: { id: LabState, label: string, note: string }[] = [
  { id: 'normal', label: 'Normal', note: `${counts.files} files: the lab’s photos and recordings plus ${counts.pdfs} tour PDFs. ${counts.processing} processing, ${counts.retired} retired, ${counts.unused} shown as unused (${counts.keepsakeOnly} of them are keepsake photos, see open point 2). Click a file: name, description, where it is used, Replace and Retire all work. Upload takes real files from your computer; try a .heic or a large file to see the refusal toast.` },
  { id: 'loading', label: 'Loading', note: 'The library is still loading: grey tiles hold the wall’s shape so nothing jumps when it fills.' },
  { id: 'empty', label: 'Empty', note: 'A new shop with no files yet: one sentence and the Upload button.' },
  { id: 'nomatch', label: 'No match', note: 'The search box holds “fondue”, which no file name contains.' },
  { id: 'upload', label: 'Upload in progress', note: 'Four files just uploaded: two photos at the top of Photos, a recording at the top of Audio and a PDF at the top of PDFs, each processing while its sizes are built.' },
  { id: 'refused', label: 'Retire refused', note: 'The merchant asked to retire old-swiss-house.jpg while it was unused; a moment earlier someone added it to the German draft of “The dying lion of Lucerne”. The database refused, the sheet says why, and Retire is now off with its reason. (Retire on any used file is off in every state, with the reason beside it.)' },
]

const openPoints: { title: string, text: string, decided?: boolean }[] = [
  {
    title: 'Search matches the name.',
    text: 'Decided: a media row gets a name, by default the uploaded file name, editable in the detail sheet. Search matches the name only. This adds a name column to content.media.',
    decided: true,
  },
  {
    title: 'Keepsake photos are not counted as uses.',
    text: `Keepsake photos (catalog.product_media) are not in media_refs, and the library leaves them out. The risk: ${counts.keepsakeOnly} photos used only by keepsakes show “Unused”, and the merchant can retire them, which would take the photo off those keepsakes. Open: list keepsakes in “Where it is used” and block Retire for them?`,
  },
  {
    title: 'The only description.',
    text: 'The library edits the one description of a file (what a screen reader says for it). The pin editor and the story image node, which carry their own today, would show it read-only. Open: or a default that a pin or story may override?',
  },
  {
    title: 'A pin’s extra photos are ordered in the pin editor (N17).',
    text: 'Where it is used says “Order in the pin editor” on a pin’s extra photos. Open: is that the right place?',
  },
]

function frameSrc(state: LabState) {
  return `/lab/media?${new URLSearchParams({ embed: '1', state }).toString()}`
}

export function MediaLab({ search, onChange }: { search: MediaLabSearch, onChange: (patch: Partial<MediaLabSearch>) => void }) {
  const stateId = useId()
  const current = states.find(s => s.id === search.state) ?? states[0]!
  const isPhone = search.width === 'phone'

  return (
    <div className="flex flex-1 flex-col gap-8 bg-default/40 px-4 py-6 lg:px-8">
      <div className="flex max-w-3xl flex-col gap-3">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Media library (N18, E4.11, S4)</h1>
        <p className="text-sm text-muted">
          Where the merchant finds a file among hundreds, sees where it is used, names it and describes it, replaces it
          everywhere at once, and retires it once nothing uses it. There is no delete. Same merchant frame as the pins list (N16).
          Mock data from the lab’s stories, pins and the three seeded tours; today is Wed 28 Oct 2026. English only.
        </p>
        <details open className="rounded-2xl bg-surface p-4 text-sm shadow-surface">
          <summary className="cursor-pointer font-semibold outline-none focus-visible:focus-ring">Open points</summary>
          <ol className="mt-3 flex list-decimal flex-col gap-3 ps-5">
            {openPoints.map(point => (
              <li key={point.title}>
                <p className="font-medium">
                  {point.title}
                  {point.decided && <span className="ms-2 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success-soft-foreground">Decided</span>}
                </p>
                <p className="text-muted">{point.text}</p>
              </li>
            ))}
          </ol>
        </details>
      </div>

      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface/95 px-4 py-2.5 shadow-surface backdrop-blur">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold" htmlFor={stateId}>State</label>
          <select className={`${control} pe-8`} id={stateId} value={search.state} onChange={event => onChange({ state: event.target.value as LabState })}>
            {states.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div aria-label="Width" className="flex items-center gap-1" role="group">
          {(['desktop', 'phone'] as LabWidth[]).map(id => (
            <button key={id} aria-pressed={search.width === id} className={control} type="button" onClick={() => onChange({ width: id })}>
              {id === 'desktop' ? 'Desktop 1280' : 'Phone 375'}
            </button>
          ))}
        </div>
        <p className="w-full text-xs text-muted">{current.note}</p>
      </div>

      <section aria-labelledby="media-option-b-title" className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface lg:p-8">
        <header className="flex max-w-3xl flex-col gap-1 border-b border-separator pb-4">
          <h2 className="text-heading" id="media-option-b-title">Media library (N18), option B</h2>
          <p className="text-sm text-muted">
            Tabs for Photos, Audio and PDFs; photos as a wall of 24 a page with each name under its tile, the others as lists of 10.
            Select several and retire the unused ones at once. The detail opens in a sheet. Search by name.
          </p>
        </header>
        <div className={isPhone ? 'flex justify-center' : 'overflow-x-auto rounded-2xl border border-separator'}>
          <iframe
            key={`${search.state}-${search.width}`}
            className={isPhone
              ? 'box-content h-[812px] w-[375px] shrink-0 rounded-[2rem] border-8 border-foreground bg-background'
              : 'block h-[880px] w-[1280px] bg-background'}
            src={frameSrc(search.state)}
            title={`Media library at ${isPhone ? '375' : '1280'} px`}
          />
        </div>
      </section>
    </div>
  )
}
