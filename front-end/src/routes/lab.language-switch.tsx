import type { LanguageStatus } from '@/components/language-version-switch'

import { Button, Chip, Input, Label, TextField } from '@heroui/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { BackIcon } from '@/components/icons'
import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { noIndexHead } from '@/lib/no-index'

/** Lab: the chosen design of the merchant language version switch (story and keepsake editors). Not part of the product. */
export const Route = createFileRoute('/lab/language-switch')({
  ssr: false,
  head: noIndexHead,
  component: LanguageSwitchLab,
})

type Lang = 'en' | 'de'

const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'de', label: 'Deutsch', short: 'DE' },
] as const

/** A story with English live and German a draft; a new story with German not started; a keepsake whose German lacks its text. */
const STORY: Record<Lang, LanguageStatus> = {
  en: { text: 'Published Sat 17 Oct', tone: 'success' },
  de: { text: 'Draft', tone: 'warning' },
}
const NEW_STORY: Record<Lang, LanguageStatus> = {
  en: { text: 'Draft', tone: 'warning' },
  de: { text: 'Not started', tone: 'muted' },
}
const KEEPSAKE: Record<Lang, LanguageStatus> = {
  en: { text: 'Complete', tone: 'success' },
  de: { text: 'Missing text', tone: 'warning' },
}

function Header() {
  const [language, setLanguage] = useState<Lang>('en')

  return (
    <div className="flex h-16 items-center gap-2 border-b border-separator bg-background px-2 lg:gap-3 lg:px-4">
      <Button isIconOnly aria-label="Back to Stories" className="size-11 shrink-0" variant="ghost">
        <BackIcon aria-hidden size={20} />
      </Button>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-semibold">{`${language === 'en' ? 'English' : 'Deutsch'} · ${NEW_STORY[language].text}`}</span>
        <span className="truncate text-xs text-muted">Saved 10:42</span>
      </div>
      <LanguageVersionSwitch compact languages={LANGUAGES} selected={language} status={NEW_STORY} onChange={setLanguage} />
      <Button className="shrink-0 max-lg:h-11">Review</Button>
    </div>
  )
}

function PublishCard() {
  const [language, setLanguage] = useState<Lang>('de')

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-surface">
      <div className="flex flex-col gap-1.5">
        <LanguageVersionSwitch languages={LANGUAGES} selected={language} status={STORY} onChange={setLanguage} />
        <p className="text-xs text-muted">Title, text and cover are per language.</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-lg text-pretty" lang={language}>
          {language === 'en' ? 'A morning on the Chapel Bridge' : 'Ein Morgen auf der Kapellbrücke'}
        </p>
        <p className="text-xs break-all text-muted">{`/${language}/stories/chapel-bridge-morning · guests see it within about a minute`}</p>
      </div>
      <Button className="max-lg:h-11" fullWidth>{language === 'en' ? 'Publish changes' : 'Publish Deutsch'}</Button>
    </div>
  )
}

function FormCard() {
  const [language, setLanguage] = useState<Lang>('en')

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-surface">
      <h3 className="font-semibold">Name and text</h3>
      <div className="flex flex-col gap-1.5">
        <LanguageVersionSwitch languages={LANGUAGES} selected={language} status={KEEPSAKE} onChange={setLanguage} />
        <p className="text-xs text-pretty text-muted">One full language is enough to publish. Readers of the other see it with a note.</p>
      </div>
      <TextField fullWidth value={language === 'en' ? 'Victorinox pocket knife, Lucerne designs' : 'Victorinox Taschenmesser, Luzerner Motive'}>
        <Label>{`Name (${language === 'en' ? 'English' : 'German'})`}</Label>
        <Input className="max-lg:h-12" lang={language} />
      </TextField>
    </div>
  )
}

function Contexts() {
  return (
    <>
      <Header />
      <PublishCard />
      <FormCard />
    </>
  )
}

function LanguageSwitchLab() {
  return (
    <div className="flex flex-1 flex-col gap-8 bg-default/40 px-4 py-8 lg:px-8">
      <header className="flex max-w-2xl flex-col gap-1">
        <Link className="text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="flex items-center gap-2 text-heading">
          Language version switch
          <Chip color="success" size="sm" variant="soft">Chosen</Chip>
        </h1>
        <p className="text-sm text-muted">
          The shared thin pill, chosen for the story editor and the keepsake editor: the app&apos;s own tab row with a status icon after each name
          and the open version&apos;s status on one line below. Phone target 32 px, the same as every other tab row in the app. Arrow keys move
          the focus; Enter, Space or a tap chooses. Shown in a compact header, the publish card and a form card, at laptop width and in a 375 px column.
        </p>
      </header>
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex w-full max-w-[760px] flex-col gap-4" data-frame="desktop">
          <span className="text-xs font-medium text-muted">Laptop</span>
          <Contexts />
        </div>
        <div className="flex w-[375px] max-w-full flex-col gap-4 bg-background py-4 shadow-overlay" data-frame="phone">
          <span className="px-4 text-xs font-medium text-muted">375 px</span>
          <Contexts />
        </div>
      </div>
    </div>
  )
}
