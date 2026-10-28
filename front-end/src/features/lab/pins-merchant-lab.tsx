import type { EditorOption, LabScreen, LabWidth, ListState, PinsLabSearch, Scenario } from './pins-merchant-search-params'

import { useLocale } from '@/contexts/locale-context'
import { labChip, LabGroup } from '@/features/lab/map-guest-lab'
import { seedPins } from './pins-merchant-data'

const listStates: { id: ListState, label: string }[] = [
  { id: 'normal', label: `${seedPins.length} pins` },
  { id: 'loading', label: 'Loading' },
  { id: 'empty', label: 'Empty (no pins yet)' },
  { id: 'nomatch', label: 'No matches (search “fondue”)' },
]

const options: { id: EditorOption, title: string, note: string }[] = [
  {
    id: 'S',
    title: 'S · Steps, like the tour editor',
    note: 'The tour editor’s stepper (M13): Place on the map, Text and photo, Hours and dates, Categories and tags, Story and link, Review and publish. The steps are a numbered column from 1024 px (Step 2 of 6 and All steps on phones), with done, needs-attention and error marks. A new pin walks the steps with Next and can Save draft at any time; an existing pin opens any step and saves from any step. Review lists each step’s facts with Edit, and the publish rules.',
  },
  {
    id: 'A',
    title: 'A · One page with a section bar',
    note: 'The story editor’s frame: six cards in one column (Location, Text and photo, Opening hours, Dates, Categories and tags, Story and link), a section bar that jumps and shows a red dot where something needs attention, and the publication panel with the checklist in a 320 px column. Phones: panel first, the bar pinned under the back bar, buttons at the end.',
  },
  {
    id: 'B',
    title: 'B · Tabs and a save bar',
    note: 'A status strip with the three publish rules, five tabs (Text, Place, When, Tags, Links) pinned on phones, one tab at a time, and a save bar pinned to the bottom. Add event opens on When. Short screens, but a problem can sit in a tab you are not looking at, so tabs carry a red dot.',
  },
  {
    id: 'C',
    title: 'C · Form and live guest card',
    note: 'Five larger cards (hours and dates share one When card) and, from 1024 px, the guest’s pin card redrawn as you type, in EN or DE, with the checklist and buttons under it. Phones: a pinned mini card that opens the preview sheet. With the guest phone beside it on this page, the column repeats the phone’s card.',
  },
]

const scenarios: { id: Scenario, label: string, expect: string }[] = [
  { id: 'new-place', label: 'New place', expect: 'Add place: empty form, no dates. Publish is off and the panel lists the three missing rules. Tap the map: the pin appears on the guest phone at once (preview). Type a title: the map link fills itself.' },
  { id: 'new-event', label: 'New event', expect: 'Add event: the same form with one empty date entry open. Place it and set a day: the guest pin gets its date tag. Try 22:00 to 00:30 to see the midnight rule.' },
  { id: 'published', label: 'Published pin (Lion Monument)', expect: 'On the map, and open on the guest phone. Edit the tip or drag the pin and watch the card and the marker follow. Save changes, then switch the phone to “What guests see now”. Hide asks first; the pin leaves the guests’ map. No delete.' },
  { id: 'hidden', label: 'Hidden pin (toilets)', expect: 'Hidden: not on the guests’ map, and its link shows the notice. The preview still draws it. Show on map again; still no delete.' },
  { id: 'ended', label: 'Ended event (organ concert)', expect: 'Published, but its only date (Mon 26 Oct) is over, so it is off the guests’ map. Add a future date and save: it comes back.' },
  { id: 'draft-errors', label: 'Draft with errors (Christmas market)', expect: 'German title only, no location, a map link another pin uses, a 22:00 to 00:30 entry and a link with a space. Publish is off; Save draft shows “Fix 3 problems”. Not on the phone until it has a location.' },
]

/**
 * The dashboard side of `/lab/pins`: which screen, editor structure, pin, width and language,
 * and the frame. The dashboard renders in a same-origin frame, so its breakpoints, fixed bars
 * and sheets behave as they would on a laptop or a 375 px phone.
 */
export function DashboardPanel({ search, onChange, frameRef }: {
  search: PinsLabSearch
  onChange: (patch: Partial<PinsLabSearch>) => void
  frameRef: React.Ref<HTMLIFrameElement>
}) {
  const { language, setLanguage } = useLocale()
  const option = options.find(o => o.id === search.option)!
  const scenario = scenarios.find(s => s.id === search.scenario)!
  const isPhone = search.width === 'phone'

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface">
        <h2 className="text-base font-semibold">Dashboard: pins list (N16) and pin editor (N17)</h2>
        <LabGroup label="Screen">
          {(['list', 'editor'] as LabScreen[]).map(id => (
            <button key={id} aria-pressed={search.screen === id} className={labChip} type="button" onClick={() => onChange({ screen: id })}>
              {id === 'list' ? 'N16 Pins list' : 'N17 Pin editor'}
            </button>
          ))}
        </LabGroup>
        <LabGroup label="Editor structure">
          {options.map(o => (
            <button key={o.id} aria-pressed={search.option === o.id} className={labChip} type="button" onClick={() => onChange({ option: o.id })}>{o.title}</button>
          ))}
          <p className="w-full text-sm text-muted">{option.note}</p>
        </LabGroup>
        {search.screen === 'list'
          ? (
              <LabGroup label="List state">
                {listStates.map(s => (
                  <button key={s.id} aria-pressed={search.list === s.id} className={labChip} type="button" onClick={() => onChange({ list: s.id })}>{s.label}</button>
                ))}
                <p className="w-full text-sm text-muted">
                  Add place and Add event open editor
                  {' '}
                  {search.option}
                  ; a pin’s row opens it filled in.
                </p>
              </LabGroup>
            )
          : (
              <LabGroup label="Pin">
                {scenarios.map(s => (
                  <button key={s.id} aria-pressed={search.scenario === s.id} className={labChip} type="button" onClick={() => onChange({ scenario: s.id })}>{s.label}</button>
                ))}
                <p className="w-full rounded-2xl bg-surface-secondary px-3 py-2 text-sm">
                  <span className="font-medium">Try: </span>
                  {scenario.expect}
                </p>
              </LabGroup>
            )}
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <LabGroup label="Dashboard width">
            {(['desktop', 'phone'] as LabWidth[]).map(id => (
              <button key={id} aria-pressed={search.width === id} className={labChip} type="button" onClick={() => onChange({ width: id })}>
                {id === 'desktop' ? 'Desktop' : 'Phone (375 px)'}
              </button>
            ))}
          </LabGroup>
          <LabGroup label="Dashboard language">
            {(['en', 'de'] as const).map(l => (
              <button key={l} aria-pressed={language === l} className={labChip} type="button" onClick={() => setLanguage(l)}>{l.toUpperCase()}</button>
            ))}
          </LabGroup>
        </div>
        <p className="text-sm text-muted">Switching the screen, structure, pin or language reloads the dashboard and its pins.</p>
      </div>

      <div className={isPhone ? 'flex justify-center' : 'overflow-x-auto rounded-3xl shadow-surface'}>
        <iframe
          key={`${frameSrc(search)}|${language}`}
          ref={frameRef}
          className={isPhone
            ? 'box-content h-[812px] w-[375px] shrink-0 rounded-[2rem] border-8 border-foreground bg-background'
            : 'h-[860px] w-full min-w-[1024px] bg-background'}
          src={frameSrc(search)}
          title={isPhone ? 'Merchant dashboard at 375 px' : 'Merchant dashboard at desktop width'}
        />
      </div>
    </div>
  )
}

/** The dashboard frame's address; a new address means a fresh dashboard with the seed pins. */
export function frameSrc(search: PinsLabSearch) {
  const params = new URLSearchParams({
    embed: '1',
    screen: search.screen,
    list: search.list,
    option: search.option,
    scenario: search.scenario,
  })

  return `/lab/pins?${params.toString()}`
}
