/**
 * Lab, slice S3: the merchant story editor (M17, story E4.3), the owner's mix of the three first
 * options on option B, in a frame at laptop (1280 px) or phone (375 px) width. One compact toolbar sets the state
 * and the width. Mock data, Wed 28 Oct 2026; nothing is stored. Rules:
 * `docs/decisions/2026-10-28-story-editor.md`.
 */
import type { LabState, LabWidth, StoryLabSearch } from './story-editor-search-params'

import { Link } from '@tanstack/react-router'
import { useId } from 'react'

const control
  = 'h-9 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

const states: { id: LabState, label: string, note: string }[] = [
  { id: 'draft', label: 'Draft with content', note: '“A morning on the Musegg wall”: the English version is a draft with every allowed node (H2, H3, quote, both lists, bold, italic, a photo with caption, the video, a recording without caption, a pin link to Musegg Wall, a normal link) and a raw link to the Hotel am See website, which is pin p10’s link, so the yellow pin-link warning shows. The German version is published. Format with the pinned bar or the bubble on selected text; Insert or “+” on an empty line adds a photo, video or recording.' },
  { id: 'new', label: 'New story (empty)', note: 'A new story: English draft started, German not started. Press Review: cover, title, excerpt and link block publishing.' },
  { id: 'typing', label: 'Writing on a phone', note: 'Phone width: the formatting bar docks above the keyboard (drawn by the lab, a frame cannot open one). Buttons are 44 px. On a laptop the text simply has focus.' },
  { id: 'media', label: 'Insert media', note: 'The insert picker: the media library’s photo wall with names (N18), search, Upload into the library; a YouTube link; a recording. The shared sheet at every width.' },
  { id: 'pinpicker', label: 'Pin link picker', note: '“Zyt tower” is selected and the pin picker is open with the 15 lab pins. Unpublished pins can be linked; guests see plain text until the pin is published.' },
  { id: 'publish', label: 'Review and publish', note: 'The Musegg draft, ready: nothing blocks, the warnings list the pin-website link, the recording without a caption and the like. Phone preview on the left; on the right the publish card, headed by the language switch (title, link, Publish and checks follow it, and so does the preview), then the Details cards, shared by both languages (open where something needs a look). Keepsakes and More to discover reorder by their grip (drag, or arrow keys).' },
  { id: 'blocked', label: 'Review: blocked', note: 'The Hotel am See review without its check date: one check stops publishing (red) and the Editorial review card is open; the rest only warn. Publish is off.' },
  { id: 'reviewtype', label: 'Review: editorial review', note: 'An editorial review of Hotel am See (PRD §11.3): the Editorial review card with the reviewed pin, who checked and the check date.' },
  { id: 'categories', label: 'Review: blog categories', note: 'The category sheet open on the Musegg story, tagged Old Town (a sub-category of Swiss history): Swiss history shows as included, not as its own chip. Choose Swiss history to replace Old Town, then Old Town to replace it back.' },
  { id: 'loading', label: 'Loading', note: 'The skeleton mirrors the Write screen.' },
  { id: 'unsaved', label: 'Unsaved changes', note: 'Edits not yet autosaved and the merchant pressed Back: the shared confirm asks before the edits are lost.' },
  { id: 'de', label: 'German version (published)', note: 'The German version, live since 17 Oct, converted from the prototype’s sections. Edit it and the switch says “edits not live” until you publish the changes.' },
]

const answered: string[] = [
  'Cover, title, excerpt and the link block publishing, plus the pin and check date of an editorial review. Everything else only warns.',
  'The link stays in Details. Drafts save themselves. No author role: the byline is the signed-in account’s name.',
  'Keepsakes: every published keepsake (only Victorinox knives today). No partner label on hotel reviews.',
  'Blog categories: chips, and “Choose categories” opens the shared sheet with search and the tree (option A). A sub-category replaces its parent chip, the parent replaces its sub-category chip, and a parent never selects its children.',
]

const openPoints: { title: string, text: string }[] = [
  { title: 'Phone Review: a Details / Preview switch.', text: 'Eight Details cards plus a full story preview would be one very long page, so the phone shows one at a time (Details first when something blocks). The language switch sits above them at the top, since it changes the preview too; the checks and Publish stay pinned at the bottom.' },
  { title: 'Media ids.', text: 'The image and audio nodes keep the library row id (e.g. img-musegg-wall) where the real node keeps a uuid; the shape is otherwise the decision’s.' },
]

function frameSrc(state: LabState) {
  return `/lab/story-editor?${new URLSearchParams({ embed: '1', state }).toString()}`
}

export function StoryEditorLab({ search, onChange }: { search: StoryLabSearch, onChange: (patch: Partial<StoryLabSearch>) => void }) {
  const stateId = useId()
  const current = states.find(s => s.id === search.state) ?? states[0]!
  const isPhone = search.width === 'phone'

  return (
    <div className="flex flex-1 flex-col gap-8 bg-default/40 px-4 py-6 lg:px-8">
      <div className="flex max-w-3xl flex-col gap-3">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Story editor (M17, E4.3, S3)</h1>
        <p className="text-sm text-muted">
          The owner’s mix of the three first options, built on option B: write on a calm page in two cards (Cover and title, Story). The
          Story card has a formatting bar that stays pinned while the text scrolls, the same tools in a bubble on selected text, and “+” on
          an empty line; Review and publish shows the phone preview beside the checks, Publish and the
          Details cards. One Tiptap document per language version with only the decision’s nodes and marks. Everything works in the frame;
          nothing is stored. Mock data from the lab’s stories, pins and media library; today is Wed 28 Oct 2026. English UI only.
        </p>
        <details className="rounded-2xl bg-surface p-4 text-sm shadow-surface">
          <summary className="cursor-pointer font-semibold outline-none focus-visible:focus-ring">Answered and open points</summary>
          <p className="mt-3 font-medium">Answered by the owner (29 Oct)</p>
          <ul className="mt-1 flex list-disc flex-col gap-1 ps-5 text-muted">
            {answered.map(a => <li key={a}>{a}</li>)}
          </ul>
          <p className="mt-3 font-medium">Open</p>
          <ol className="mt-1 flex list-decimal flex-col gap-3 ps-5">
            {openPoints.map(point => (
              <li key={point.title}>
                <p className="font-medium">{point.title}</p>
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

      <section aria-labelledby="story-editor-title" className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface lg:p-8">
        <header className="flex max-w-3xl flex-col gap-1 border-b border-separator pb-4">
          <h2 className="text-heading" id="story-editor-title">Story editor (M17)</h2>
          <p className="text-sm text-muted">Write, then Review and publish. Details live on the Review screen as collapsible cards; drafts save themselves.</p>
        </header>
        <div className={isPhone ? 'flex justify-center' : 'overflow-x-auto rounded-2xl border border-separator'}>
          <iframe
            key={`${search.state}-${search.width}`}
            className={isPhone
              ? 'box-content h-[812px] w-[375px] shrink-0 rounded-[2rem] border-8 border-foreground bg-background'
              : 'block h-[880px] w-[1280px] bg-background'}
            src={frameSrc(search.state)}
            title={`Story editor at ${isPhone ? '375' : '1280'} px`}
          />
        </div>
      </section>

    </div>
  )
}
