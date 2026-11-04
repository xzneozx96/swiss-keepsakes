import type { EditorCase, Lang } from './cases'
import type { HeaderProps, Kind } from './parts'

import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { CASES } from './cases'
import { OptionNameThenBar, OptionOneLine, OptionStepsInHeader } from './options'

const OPTIONS: {
  id: string
  name: string
  idea: string
  sticky: string
  gains: string
  costs: string
  Header: (props: HeaderProps) => React.ReactNode
}[] = [
  {
    id: 'a',
    name: 'A · One line',
    idea: 'The story editor’s bar becomes every editor’s bar: name over “status · save state”, and every control in one row on the right.',
    sticky: 'Pinned at the top of the page, flush under the store notice (the shell’s BAR_PULL_UP: no pull-up while the notice shows). Phones: it docks in the shell’s bar slot; the full switch and the step line open the page.',
    gains: 'Shortest change: the story editor already has it, the floating save bar and the second header go. Nothing at the bottom, so it never meets the bulk ActionBar or the tab bar.',
    costs: 'The big keepsake name becomes a 16 px line. A desktop row with switch, arrows, red action and ⋯ is busy on an editor with steps.',
    Header: OptionOneLine,
  },
  {
    id: 'b',
    name: 'B · Name, then the bar',
    idea: 'The big name and its status stay as the page’s heading and scroll away; the white save bar moves to the top and pins, holding the switch, the save state, the arrows and the red action.',
    sticky: 'The name row scrolls; the white bar pins under the store notice (the same BAR_PULL_UP rule for its top edge). Phones: the ← bar with the name and ⋯ docks in the bar slot, the white bar pins right under it.',
    gains: 'Keeps the white bar the owner knows and the keepsake editor’s big title. Save state sits next to the action it belongs to.',
    costs: 'Two layers to pin on phones (about 112 px of the 812 px screen). Once the name scrolls away, the bar does not say which item is open.',
    Header: OptionNameThenBar,
  },
  {
    id: 'c',
    name: 'C · Steps in the header',
    idea: 'One pinned header in two rows: name over “status · save state” with switch, red action and ⋯; under it the steps (or Write | Review) as the app’s thin tabs.',
    sticky: 'Both rows pin under the store notice (BAR_PULL_UP). Phones: both rows dock in the bar slot; the tabs scroll sideways; the full switch opens the page.',
    gains: 'Step navigation is always in reach, so the left step list and the step arrows go, and the content gets the full width. The story editor’s two screens read the same way.',
    costs: 'Drops the approved left step list (and its status words) for a row of tabs. Six place steps need a sideways scroll on phones. The biggest change of the three.',
    Header: OptionStepsInHeader,
  },
]

/** One case of one option, with its own open language and step. */
function CaseFrame({ c, kind, Header }: { c: EditorCase, kind: Kind, Header: (props: HeaderProps) => React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const [step, setStep] = useState(c.current)

  return <Header c={c} kind={kind} lang={lang} step={step} onLang={setLang} onStep={setStep} />
}

/** Lab: three directions for the one header every merchant editor shares, the save bar folded in. */
export function EditorHeaderLab() {
  return (
    <div className="flex flex-1 flex-col gap-12 bg-background px-4 py-8 xl:px-10">
      <div className="flex max-w-3xl flex-col gap-3">
        <Link className="w-fit text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-title">One editor header (options for the owner to pick)</h1>
        <p className="text-sm text-pretty text-muted">
          Today the keepsake editor has a big title with a chip and a wide switch, the story editor a slim pinned bar,
          and the keepsake, place, gift and tour editors a floating white save bar. Each option below folds all three
          into one header with the same slots: Back, the name, one line “status · save state”, the EN | DE switch with
          each language’s state, back and next arrows where the editor has steps, one red action and ⋯ for delete or hide. Autosave
          and explicit save use the same line: “Saved 10:07”, “No changes” or “Unsaved changes”; the red action is
          Review and publish (autosave) or Save changes (explicit, off while nothing changed). Each frame scrolls
          inside, so the pinning shows. Buttons do nothing here except the switch, the arrows and the steps.
        </p>
      </div>
      {OPTIONS.map(option => (
        <section key={option.id} aria-labelledby={`option-${option.id}`} className="flex flex-col gap-5">
          <div className="flex max-w-3xl flex-col gap-2">
            <h2 className="text-lg font-semibold" id={`option-${option.id}`}>{option.name}</h2>
            <p className="text-pretty">{option.idea}</p>
            <dl className="grid gap-x-4 gap-y-1 text-sm text-pretty sm:grid-cols-[6rem_1fr]">
              <dt className="font-medium">Pinning</dt>
              <dd className="text-muted">{option.sticky}</dd>
              <dt className="font-medium">Gains</dt>
              <dd className="text-muted">{option.gains}</dd>
              <dt className="font-medium">Costs</dt>
              <dd className="text-muted">{option.costs}</dd>
            </dl>
          </div>
          <div className="flex flex-col gap-6 max-lg:hidden">
            {CASES.map(c => (
              <figure key={c.id} className="flex flex-col gap-2">
                <figcaption className="text-sm text-muted">{`Desktop · ${c.caption}`}</figcaption>
                <CaseFrame Header={option.Header} c={c} kind="desktop" />
              </figure>
            ))}
          </div>
          <div className="flex flex-wrap gap-6">
            {CASES.map(c => (
              <figure key={c.id} className="flex w-full max-w-[375px] flex-col gap-2">
                <figcaption className="text-sm text-muted">{`375 px · ${c.caption}`}</figcaption>
                <CaseFrame Header={option.Header} c={c} kind="phone" />
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
