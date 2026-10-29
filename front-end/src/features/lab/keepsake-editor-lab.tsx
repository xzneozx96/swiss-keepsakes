/**
 * Lab, slice S7: the merchant catalog shaped like the Medusa admin (owner, 29 Oct 2026): separate,
 * linked screens. Keepsakes list (M11) → keepsake page (M12, edited in place, with the N14 and N15
 * sheets) → variant page; Inventory list (N13) → inventory item → back to the variant. One frame at
 * laptop (1280 px) or phone (375 px) width; the toolbar sets the state and the width. Mock data,
 * Thu 29 Oct 2026; nothing is stored.
 */
import type { KeepsakeLabSearch, LabState, LabWidth } from './keepsake-editor-search-params'

import { Link } from '@tanstack/react-router'
import { useId } from 'react'

const control
  = 'h-9 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

const states: { id: LabState, label: string, note: string }[] = [
  { id: 'products', label: 'Keepsakes list', note: 'M11, the entry point: Keepsakes only. Open the Victorinox keepsake, or Create to start the create flow; a created keepsake joins the list.' },
  { id: 'product', label: 'Keepsake: edit', note: 'M12 on the story editor’s flow (M17): the cards edited in place. Name and text (English / Deutsch switch), Media and Commission autosave; the top bar shows the name with its status under it as coloured text with a dot, and the save status. Options is a table with each option’s values as small chips; Variants is a flat table with a column per option, the All / For sale / Sold out / Hidden / Archived tabs, and the stock as available over reserved. Add option and each option row’s ⋯ open the N14 sheet; Create opens the N15 sheet; a variant row opens the variant page. 10 variants of 36 combinations: VX-L-SWAN sold out (both units reserved), VX-S-LION sold out at 0, one hidden, one archived.' },
  { id: 'unsaved', label: 'Keepsake: unsaved changes', note: 'Edits not yet autosaved and the merchant pressed Back: the shared confirm asks first. Keep editing, type anything: “Unsaved changes”, then “Saving…”, then “Saved” with the time.' },
  { id: 'newoption', label: 'Keepsake: new option needs values', note: 'Add option with Colour (mock, O26): eight variants have a colour, two do not, so Save is refused and names them. “Give all” fills every variant; then Save works and the Variants table gets a Colour column.' },
  { id: 'inuse', label: 'Keepsake: value in use', note: 'Editing Theme, the merchant tried to delete “Lion Monument”: refused, used by VX-S-LION and VX-L-LION. Deleting “Furka Pass” works. Delete on an option row is refused the same way.' },
  { id: 'duplicate', label: 'Keepsake: duplicate variant', note: 'Create variant with Small · Swan on the lake, which VX-S-SWAN already is: refused at Save. Change the theme and it creates the variant with 0 in stock.' },
  { id: 'review', label: 'Keepsake: review and publish', note: 'M17’s Review: the guest page in the phone preview on the left (a stand-in from the keepsake’s data, not a C03 design), the publish card on the right: English / Deutsch switch (the preview follows it), what goes live, Unpublish, the checks with Show. Phones: only the preview with the language switch above it, and the bar pinned at the bottom (checks, Publish or Unpublish).' },
  { id: 'blocked', label: 'Keepsake: review, blocked', note: 'A draft with only an English name, no text and no photo: two checks stop publishing (red) and Publish is off. Edit jumps back to the field, which shows its error. On phones the pinned bar opens with the checks.' },
  { id: 'create-details', label: 'Create: details', note: 'The create flow from an empty keepsake. Next needs a name in one language. The back arrow asks before dropping what was typed.' },
  { id: 'create-options', label: 'Create: options', note: 'The SwissCard example (a mock second product line on the same generic options): Colour and Theme.' },
  { id: 'create-variants', label: 'Create: variants', note: 'All 9 combinations, two unticked (Navy / Pilatus, Black / Chapel Bridge). Codes suggested, CHF 39 set. Untick, set a code and price per row or for all ticked. Only ticked rows become variants.' },
  { id: 'create-stock', label: 'Create: stock', note: 'Opening stock per ticked variant, then Create keepsake: it opens on its product page as a draft.' },
  { id: 'variant', label: 'Variant page', note: 'Small / Pilatus (VX-S-PILATUS): Details with ⋯ (Edit, Hide, Archive: refused while units are reserved), Stock linking to its inventory item, Media. Edit opens the N15 sheet; the back arrow goes to the keepsake.' },
  { id: 'inventory', label: 'Inventory list', note: 'N13: every live variant with reserved, in stock (edit in place; saved when the field is left or stepped) and available. Search, and the All / In stock / Sold out tabs. Try 1 in stock for VX-L-SWAN: refused, 2 are reserved.' },
  { id: 'item', label: 'Inventory item', note: 'VX-S-PILATUS: Details (5 in stock, 3 reserved, 2 available), Reserved by orders (SK-1044 reserves 2, SK-1049 reserves 1), the associated variant. ⋯ Adjust stock.' },
  { id: 'belowheld', label: 'Inventory: below reserved', note: 'Adjusting VX-L-SWAN to 1 while 2 units are reserved by SK-1039: refused, naming the 2 reserved units. 2 or more saves.' },
  { id: 'loading', label: 'Loading', note: 'The product page skeleton.' },
]

/** The toolbar's screen links: each opens the frame on that screen. */
const screens: { label: string, state: LabState }[] = [
  { label: 'Keepsakes', state: 'products' },
  { label: 'Keepsake', state: 'product' },
  { label: 'Review', state: 'review' },
  { label: 'Create', state: 'create-details' },
  { label: 'Variant', state: 'variant' },
  { label: 'Inventory', state: 'inventory' },
  { label: 'Item', state: 'item' },
]

const adopted = [
  'Navigation: the sidebar has Keepsakes and Inventory under Products (Pickup points stays), and no Options or product categories item. No breadcrumbs: a page reached by clicking has a back arrow before its title (keepsake → Keepsakes, Review → editing, variant → its keepsake, inventory item → Inventory or the variant it was opened from, New keepsake → Keepsakes after the discard question). The keepsake page, New keepsake and the variant page keep Keepsakes highlighted; the inventory item keeps Inventory highlighted, also when reached from a variant. Options (N14) and variants (N15) are sheets on the keepsake page, with no page of their own.',
  'From the story editor (M17): the keepsake page is an edit screen with cards edited in place and autosave, then Review and publish with the phone preview and the publish card. From Medusa: the list → keepsake → variant links; options and variants as flat tables with a column per option; create as a focused flow that generates the combinations; inventory as its own area with an item page, reservations (our “Reserved by orders”) and the associated variant.',
  'Left out: stock locations (ADR-022, one figure per SKU), sales channels, shipping profiles, price lists (one CHF price per variant), collections, types, tags and categories (no category UI in Phase 1), attributes, metadata and JSON views, and shared global options (each keepsake owns its options, ADR-027).',
]

const openPoints: { title: string, text: string }[] = [
  { title: 'O26: themes, colours, rights, prices.', text: 'The twelve themes are the client’s concepts from the prototype; the colours, the SwissCard example and every price are mock. Who prints the designs and the design rights are open.' },
  { title: 'A photo per theme value?', text: 'Photos belong to the product (catalog.product_media); a value has no photo. Variant rows and the variant page show the design by its theme in this lab only. Should a value carry a photo?' },
  { title: 'Payment deadline and preparation hours.', text: 'The screen inventory lists a payment deadline for M12, and products have preparation_hours (O22). Neither is on these screens yet. Where do they live?' },
  { title: 'Keepsake photos are not uses in the media library.', text: 'N18 open point 2: a photo used only by a keepsake shows as unused there and can be retired, which takes it off the keepsake.' },
  { title: 'Restore an archived variant.', text: 'It comes back as hidden, with its code, price and stock. Adding the same combination again is refused (the unique key counts archived variants) and points to Restore.' },
]

function frameSrc(search: KeepsakeLabSearch) {
  return `/lab/keepsake-editor?${new URLSearchParams({ embed: '1', state: search.state }).toString()}`
}

export function KeepsakeEditorLab({ search, onChange }: { search: KeepsakeLabSearch, onChange: (patch: Partial<KeepsakeLabSearch>) => void }) {
  const stateId = useId()
  const current = states.find(s => s.id === search.state) ?? states[0]!
  const isPhone = search.width === 'phone'

  return (
    <div className="flex flex-1 flex-col gap-8 bg-default/40 px-4 py-6 lg:px-8">
      <div className="flex max-w-3xl flex-col gap-3">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Keepsake catalog: M11, M12 with N14 and N15, variant page, N13 (E6.1 to E6.3, S7)</h1>
        <p className="text-sm text-muted">
          Separate, linked screens as in the Medusa admin (list, keepsake, variant, inventory). The keepsake
          page follows the story editor (M17): edit in place with autosave, then Review and publish; a focused create flow;
          a variant page; Inventory as its own area. Every link in the frame works. Rules kept: generic options with ordered
          values and swatches, only sold combinations are variants, no duplicate combination, a used value can’t be deleted, a new
          option needs a value on every variant in one save, stock never below the reserved units, one full language to publish. No engraving,
          sub-category, deposit or pay-later. Mock data; today is Thu 29 Oct 2026. English UI only.
        </p>
        <details className="rounded-2xl bg-surface p-4 text-sm shadow-surface">
          <summary className="cursor-pointer font-semibold outline-none focus-visible:focus-ring">What we took from Medusa, what we left out, open points</summary>
          <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 text-muted">
            {adopted.map(a => <li key={a}>{a}</li>)}
          </ul>
          <p className="mt-3 font-medium">Open points</p>
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
        <nav aria-label="Screens" className="flex flex-wrap items-center gap-1">
          {screens.map(s => (
            <button key={s.state} aria-pressed={search.state === s.state} className={control} type="button" onClick={() => onChange({ state: s.state })}>{s.label}</button>
          ))}
        </nav>
        <p className="w-full text-xs text-muted">{current.note}</p>
        <p className="w-full text-xs text-muted">The screen links are for review only. In the app the sidebar has two items under Products, Keepsakes and Inventory (Pickup points stays); everything else is reached by clicking, with a back arrow before the title.</p>
      </div>

      <section aria-label="The merchant screens" className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface lg:p-8">
        <div className={isPhone ? 'flex justify-center' : 'overflow-x-auto rounded-2xl border border-separator'}>
          <iframe
            key={frameSrc(search) + search.width}
            className={isPhone
              ? 'box-content h-[812px] w-[375px] shrink-0 rounded-[2rem] border-8 border-foreground bg-background'
              : 'block h-[880px] w-[1280px] bg-background'}
            src={frameSrc(search)}
            title={`Keepsake catalog at ${isPhone ? '375' : '1280'} px`}
          />
        </div>
      </section>
    </div>
  )
}
