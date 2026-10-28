import type { ChecklistItem, Pin } from './pins-merchant-data'
import type { PinEditor } from './pins-merchant-editor-state'
import type { StatusTone } from '@/components/status-chip'
import type { Language } from '@/contexts/locale-context'

import { Button, toast } from '@heroui/react'
import { formatShortDate } from '@sk/domain/shared'
import { useId, useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import {
  ArrowUpRightIcon,
  ContentIcon,
  InfoIcon,
  StatusDangerIcon,
  StatusSuccessIcon,
} from '@/components/icons'
import { InfoNote } from '@/components/info-note'
import { PhotoGallery } from '@/components/photo-gallery'
import { SheetFrame } from '@/components/sheet-frame'
import { LocaleOverride } from '@/contexts/locale-context'
import { PinFacts, PinTip } from '@/features/lab/map-guest-card'
import { toGuestPin } from '@/features/lab/map-guest-data'
import { ActionPanel } from '@/features/merchant/order-detail/components/detail-card'
import { useCopy } from './pins-merchant-copy'
import { isEnded, LAB_TODAY, lastEntry } from './pins-merchant-data'

export type PanelState = 'new' | 'draft' | 'ready' | 'published' | 'ended' | 'hidden'

/** The publication state the panel shows: the stored status, read against the form's dates. */
export function panelState(editor: PinEditor): PanelState {
  const status = editor.stored.status

  if (status === 'hidden')
    return 'hidden'
  if (status === 'published')
    return isEnded({ ...editor.pin, status }) ? 'ended' : 'published'
  if (editor.ready)
    return 'ready'

  return editor.isNew ? 'new' : 'draft'
}

const tone: Record<PanelState, StatusTone> = {
  new: 'neutral',
  draft: 'neutral',
  ready: 'info',
  published: 'success',
  ended: 'info',
  hidden: 'warning',
}

const ITEMS: ChecklistItem[] = ['title', 'location', 'slug']

/** The three publish rules, each ticked or missing; nothing else is asked for (AC68). */
export function Checklist({ editor, compact }: { editor: PinEditor, compact?: boolean }) {
  const { c } = useCopy()

  return (
    <div className="flex flex-col gap-2">
      {!compact && <h3 className="text-sm font-semibold">{c('checklist.title')}</h3>}
      <ul className="flex flex-col gap-1.5">
        {ITEMS.map((item) => {
          const done = editor.checks[item]

          return (
            <li key={item} className={`flex items-start gap-2 text-sm ${done ? '' : 'font-medium'}`}>
              {done
                ? <StatusSuccessIcon aria-hidden className="mt-0.5 shrink-0 text-success" size={16} />
                : <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0 text-danger" size={16} />}
              <span>
                {c(`checklist.${item}.item`)}
                <span className="sr-only">{`, ${c(done ? 'checklist.done' : 'checklist.missing')}`}</span>
              </span>
            </li>
          )
        })}
      </ul>
      {!compact && <p className="text-xs text-pretty text-muted">{c('checklist.optional')}</p>}
    </div>
  )
}

/** Unsaved, saving, saved and the error count, in that order of urgency. */
export function SaveNote({ editor }: { editor: PinEditor }) {
  const { c } = useCopy()

  return (
    <div aria-live="polite" className="flex flex-col gap-1">
      {editor.attempt && editor.errorCount > 0 && (
        <p className="text-sm text-danger" role="alert">
          {editor.errorCount === 1 ? c('save.errors.one') : c('save.errors.other', { count: editor.errorCount })}
        </p>
      )}
      {editor.save === 'saving' && <p className="text-sm text-muted">{c('save.saving')}</p>}
      {editor.save !== 'saving' && editor.dirty && (
        <p className="flex items-center gap-2 text-sm font-medium text-warning">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
          {c('save.unsaved')}
        </p>
      )}
      {editor.save === 'saved' && !editor.dirty && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <StatusSuccessIcon aria-hidden className="shrink-0" size={16} />
          {c('save.saved')}
        </p>
      )}
    </div>
  )
}

/**
 * The buttons for the state: Publish and Save draft (Publish off until the checklist is done),
 * or Save changes and Hide, or Save changes and Show again. One red action at a time.
 */
export function EditorActions({ editor, onDelete, layout = 'stack' }: {
  editor: PinEditor
  onDelete: () => void
  layout?: 'stack' | 'row'
}) {
  const { c } = useCopy()
  const { confirm, dialog } = useConfirm()
  const [pressed, setPressed] = useState<string | null>(null)
  const state = panelState(editor)
  const isSaving = editor.save === 'saving'
  const name = editor.pin.title.en || editor.pin.title.de || c('row.untitled')

  const run = (id: string, status: Pin['status'], toastText: string) => {
    setPressed(id)
    editor.commit(status, () => toast.success(toastText))
  }
  const hide = async () => {
    const ok = await confirm({ title: c('hide.title', { name }), body: c('hide.body'), confirmLabel: c('hide.confirm') })

    if (ok) {
      editor.setStatus('hidden')
      toast.success(c('toast.hidden', { name }))
    }
  }
  const remove = async () => {
    const ok = await confirm({ title: c('delete.title', { name }), body: c('delete.body'), confirmLabel: c('delete.confirm') })

    if (ok)
      onDelete()
  }
  const wrap = layout === 'row' ? 'flex flex-wrap items-center gap-2' : 'flex flex-col gap-2'
  const full = layout === 'stack'

  const isDraft = state === 'new' || state === 'draft' || state === 'ready'

  return (
    <div className={wrap}>
      {isDraft && (
        <>
          <Button fullWidth={full} isDisabled={!editor.ready || isSaving} isPending={isSaving && pressed === 'publish'} onPress={() => run('publish', 'published', c('toast.published'))}>
            {c('action.publish')}
          </Button>
          <Button fullWidth={full} isDisabled={isSaving} isPending={isSaving && pressed === 'draft'} variant="tertiary" onPress={() => run('draft', 'draft', c('toast.draftSaved'))}>
            {c('action.saveDraft')}
          </Button>
          {!editor.isNew && (
            <Button className="text-danger" fullWidth={full} isDisabled={isSaving} variant="ghost" onPress={() => void remove()}>
              {c('action.delete')}
            </Button>
          )}
        </>
      )}
      {!isDraft && (
        <>
          <Button fullWidth={full} isDisabled={!editor.dirty || isSaving} isPending={isSaving} onPress={() => run('save', editor.stored.status, c('toast.saved'))}>
            {c('action.save')}
          </Button>
          {state === 'hidden'
            ? (
                <Button
                  fullWidth={full}
                  isDisabled={!editor.ready || isSaving}
                  variant="tertiary"
                  onPress={() => {
                    editor.setStatus('published')
                    toast.success(c('toast.shown', { name }))
                  }}
                >
                  {c('action.unhide')}
                </Button>
              )
            : (
                <Button fullWidth={full} isDisabled={isSaving} variant="tertiary" onPress={() => void hide()}>
                  {c('action.hide')}
                </Button>
              )}
        </>
      )}
      {dialog}
    </div>
  )
}

/** The words under the panel title for each state. */
function useStateBody(editor: PinEditor) {
  const { c, intlLocale } = useCopy()
  const date = (iso: string) => formatShortDate(iso, LAB_TODAY, intlLocale)
  const state = panelState(editor)
  const last = lastEntry(editor.pin.dates)

  switch (state) {
    case 'new':
    case 'ready':
      return editor.isNew ? c('publish.newBody') : c('publish.draftBody')
    case 'draft':
      return c('publish.draftBody')
    case 'published':
      return [
        c('publish.publishedBody', { date: date(editor.stored.firstPublished ?? LAB_TODAY) }),
        last ? c('publish.leaves', { date: date(last.lastDay) }) : '',
      ].join(' ').trim()
    case 'ended':
      return c('publish.endedBody', { date: date(last?.lastDay ?? LAB_TODAY) })
    default:
      return c('publish.hiddenBody')
  }
}

const titleKey = {
  new: 'publish.new',
  draft: 'publish.draft',
  ready: 'publish.ready',
  published: 'publish.published',
  ended: 'publish.ended',
  hidden: 'publish.hidden',
} as const

/** The M04/M17 action panel: state band, the rule in words, the checklist while a draft, notes, buttons. */
export function PublishPanel({ editor, onDelete, onPreview }: {
  editor: PinEditor
  onDelete: () => void
  onPreview?: (language: Language) => void
}) {
  const { c } = useCopy()
  const state = panelState(editor)
  const body = useStateBody(editor)
  const isDraft = state === 'new' || state === 'draft' || state === 'ready'

  return (
    <ActionPanel
      eyebrow={c('publish.eyebrow')}
      icon={state === 'published' ? StatusSuccessIcon : ContentIcon}
      title={c(titleKey[state])}
      tone={tone[state]}
    >
      <p className="text-sm text-pretty text-muted">{body}</p>
      {(isDraft || state === 'hidden') && <Checklist editor={editor} />}
      {isDraft && !editor.ready && <p className="text-sm text-muted">{c('checklist.blocked')}</p>}
      <SaveNote editor={editor} />
      <EditorActions editor={editor} onDelete={onDelete} />
      {onPreview && <PreviewButtons onPreview={onPreview} />}
    </ActionPanel>
  )
}

/** Preview EN and Preview DE: each opens the guest card in that language (an ssr:false route in the product). */
export function PreviewButtons({ onPreview }: { onPreview: (language: Language) => void }) {
  const { c } = useCopy()

  return (
    <div className="grid grid-cols-2 gap-2">
      {(['en', 'de'] as const).map(l => (
        <Button key={l} size="sm" variant="secondary" onPress={() => onPreview(l)}>
          <ArrowUpRightIcon aria-hidden size={16} />
          {c('action.preview', { lang: l.toUpperCase() })}
        </Button>
      ))}
    </div>
  )
}

/**
 * What a guest gets on opening the pin: the body of the guest map's place sheet (option B):
 * the name, the photos as a gallery, the tip and the facts, fed from the form through the
 * adapter the guest map uses. Never a price.
 */
export function GuestCard({ pin, isOffMap }: { pin: Pin, isOffMap: boolean }) {
  const { c, language } = useCopy()
  const headingId = useId()
  const placed = pin.lat !== null && pin.lng !== null
  // Without a location the card still previews; only the directions button needs one.
  const guest = toGuestPin(placed ? pin : { ...pin, lat: 0, lng: 0 })!
  const title = guest.title[language] ?? guest.title[language === 'en' ? 'de' : 'en']
  const fallback = !guest.title[language] && Boolean(title)

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface">
      {isOffMap && <p className="-mx-5 -mt-5 rounded-t-3xl bg-warning-soft px-5 py-2 text-sm text-warning-soft-foreground">{c('preview.offMap')}</p>}
      <h3 className={`text-center text-title ${title ? '' : 'text-muted'}`} id={headingId}>{title || c('preview.noTitle')}</h3>
      {fallback && <InfoNote text={c('preview.notice', { lang: c(`lang.${language}`), other: c(`lang.${language === 'en' ? 'de' : 'en'}`) })} />}
      {guest.photos.length > 0 && (
        <PhotoGallery
          key={guest.photos.join()}
          className="aspect-[16/10] w-full shrink-0 rounded-2xl"
          labels={{
            gallery: title ?? '',
            photo: (n, count) => c('preview.photoN', { n, count }),
            previous: c('preview.prevPhoto'),
            next: c('preview.nextPhoto'),
            close: c('preview.close'),
          }}
          photos={guest.photos}
        />
      )}
      <PinTip language={language} pin={guest} />
      <PinFacts directions={placed ? { language, onDirections: () => {} } : undefined} language={language} pin={guest} />
    </article>
  )
}

/**
 * The pin editor's guest preview, as M13's tour preview: a title, EN | DE, a note, the
 * guest's place sheet in a phone-width frame, and Back to editing.
 */
export function PinPreview({ pin, isOffMap, onClose }: { pin: Pin, isOffMap: boolean, onClose: () => void }) {
  const { c, language: uiLanguage } = useCopy()
  const [language, setLanguage] = useState<Language>(uiLanguage)

  return (
    <section className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[430px] flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{c('preview.title')}</h2>
          <PreviewLanguage value={language} onChange={setLanguage} />
        </div>
        <p className="flex items-start gap-2 text-sm text-pretty text-muted">
          <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {c('preview.note')}
        </p>
      </div>
      <div className="w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-[2rem] border border-separator bg-background p-3 shadow-surface [transform:translateZ(0)]">
        <GuestPreview isOffMap={isOffMap} language={language} pin={pin} />
      </div>
      <Button variant="secondary" onPress={onClose}>{c('preview.close')}</Button>
    </section>
  )
}

/** The guest card in a fixed language, as M13's preview does with `LocaleOverride`. */
export function GuestPreview({ pin, language, isOffMap }: { pin: Pin, language: Language, isOffMap: boolean }) {
  return (
    <LocaleOverride language={language}>
      <GuestCard isOffMap={isOffMap} pin={pin} />
    </LocaleOverride>
  )
}

/** EN | DE pills, the tour preview's language switch. */
export function PreviewLanguage({ value, onChange }: { value: Language, onChange: (language: Language) => void }) {
  const { c } = useCopy()

  return (
    <div aria-label={c('preview.language')} className="flex gap-1 rounded-full bg-surface-secondary p-1" role="group">
      {(['en', 'de'] as const).map(l => (
        <Button key={l} aria-pressed={value === l} size="sm" variant={value === l ? 'primary' : 'tertiary'} onPress={() => onChange(l)}>
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}

/** The lab's stand-in for the ssr:false preview route: the guest card in a sheet. */
export function PreviewSheet({ editor, language, onLanguage, onClose }: {
  editor: PinEditor
  language: Language
  onLanguage: (language: Language) => void
  onClose: () => void
}) {
  const { c } = useCopy()
  const state = panelState(editor)

  return (
    <SheetFrame
      isOpen
      footer={<Button fullWidth variant="tertiary" onPress={onClose}>{c('preview.close')}</Button>}
      title={c('preview.title')}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-3">
        <InfoNote text={c('preview.note')} />
      </div>
      <PreviewLanguage value={language} onChange={onLanguage} />
      <GuestPreview isOffMap={state !== 'published'} language={language} pin={editor.pin} />
    </SheetFrame>
  )
}
