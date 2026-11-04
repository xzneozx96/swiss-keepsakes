import type { EditorCase, Lang } from './cases'

import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { EditorHeader } from '@/components/layout/editor-header'
import { CASES } from './cases'

const LANGUAGES = [
  { id: 'en' as const, label: 'English', short: 'EN' },
  { id: 'de' as const, label: 'Deutsch', short: 'DE' },
]

/** One case: the shipped header in a frame that scrolls, so its pinning shows. */
function CaseFrame({ c }: { c: EditorCase }) {
  const [lang, setLang] = useState<Lang>('en')
  const languages = c.languages
  const switcher = (compact: boolean) => languages && (
    <LanguageVersionSwitch compact={compact} label="Language version" languages={LANGUAGES} selected={lang} status={languages} onChange={setLang} />
  )

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm text-muted">{c.caption}</figcaption>
      <div className="h-80 overflow-y-auto rounded-3xl border border-separator bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-4 pb-10 lg:px-8 lg:pt-8">
          <EditorHeader {...c.header} languageSwitch={switcher(true)} onAction={() => {}} onBack={() => {}} />
          {languages && <div className="lg:hidden">{switcher(false)}</div>}
          {['w-full', 'w-11/12', 'w-5/6', 'w-2/3'].map(width => (
            <div key={width} aria-hidden className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-surface">
              <span className="h-4 w-40 rounded-full bg-default" />
              <span className={`h-3 rounded-full bg-surface-secondary ${width}`} />
              <span className="h-3 w-1/2 rounded-full bg-surface-secondary" />
            </div>
          ))}
        </div>
      </div>
    </figure>
  )
}

/** Lab: the one editor header every merchant editor uses, the owner's option A (04.11.2026). */
export function EditorHeaderLab() {
  return (
    <div className="flex flex-1 flex-col gap-8 bg-background px-4 py-8 xl:px-10">
      <div className="flex max-w-3xl flex-col gap-3">
        <Link className="w-fit text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-title">One editor header (option A, approved)</h1>
        <p className="text-sm text-pretty text-muted">
          The owner chose A “One line” on 04.11.2026; B and C were removed. This is the shared
          {' '}
          <code>EditorHeader</code>
          {' '}
          the keepsake, story and place editors use: Back, the name over “status · save state”, the compact EN | DE
          switch, the step arrows, the one red action and the secondary actions. One secondary action is its own icon
          button with a tooltip; two or more sit in ⋯. Each editor keeps its shipped save model: “Saved 10:07” where it
          saves by itself, “No changes” or “Unsaved changes” with Save changes where it saves by hand. The buttons keep
          one size at every width. The header follows the window width: below 1024 px the switch moves onto the page and
          the arrows to the step line. In the store it pins under the store notice. Buttons do nothing here except the
          switch.
        </p>
      </div>
      <div className="flex w-full max-w-6xl flex-col gap-6">
        {CASES.map(c => <CaseFrame key={c.id} c={c} />)}
      </div>
    </div>
  )
}
