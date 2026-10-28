import type { CopyKey } from './pins-merchant-copy'
import type { Pin, ShownStatus } from './pins-merchant-data'
import type { GroupId, PinEditor } from './pins-merchant-editor-state'
import type { EditorOption } from './pins-merchant-search-params'
import type { IconComponent } from '@/components/icons'
import type { StatusTone } from '@/components/status-chip'
import type { Language } from '@/contexts/locale-context'

import { Button, Tabs } from '@heroui/react'
import { formatShortDate } from '@sk/domain/shared'
import { useEffect, useRef, useState } from 'react'

import {
  BackIcon,
  ClockIcon,
  ContentIcon,
  LinkIcon,
  OptionIcon,
  PickupDateIcon,
  PickupIcon,
} from '@/components/icons'
import { STICKY_TABS_BELOW_BAR } from '@/components/layout/sticky-tabs'
import { Media } from '@/components/media'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'
import { useIsWide } from '@/hooks/use-is-wide'
import { postToPage } from './pins-lab-sync'
import { useCopy } from './pins-merchant-copy'
import { LAB_TODAY, nextEntry, shownStatus } from './pins-merchant-data'
import { usePinEditor } from './pins-merchant-editor-state'
import { ContentFields, LinkFields, LocationFields, Need, TagFields } from './pins-merchant-fields'
import {
  Checklist,
  EditorActions,
  GuestPreview,
  panelState,
  PinPreview,
  PreviewButtons,
  PreviewLanguage,
  PreviewSheet,
  PublishPanel,
  SaveNote,
} from './pins-merchant-publish'
import { DatesFields, HoursFields } from './pins-merchant-schedule'
import { PinsBackBar } from './pins-merchant-shell'
import { StepsEditor } from './pins-merchant-steps'

const statusTone: Record<ShownStatus, StatusTone> = { draft: 'neutral', published: 'success', hidden: 'warning', ended: 'info' }
const statusKey: Record<ShownStatus, CopyKey> = { draft: 'status.draft', published: 'status.published', hidden: 'status.hidden', ended: 'status.ended' }

type SectionId = 'location' | 'content' | 'hours' | 'dates' | 'tags' | 'links'

interface Section {
  id: SectionId
  group: GroupId
  title: CopyKey
  icon: IconComponent
  required?: boolean
}

const SECTIONS: Section[] = [
  { id: 'location', group: 'location', title: 'section.location', icon: PickupIcon, required: true },
  { id: 'content', group: 'content', title: 'section.content', icon: ContentIcon, required: true },
  { id: 'hours', group: 'when', title: 'section.hours', icon: ClockIcon },
  { id: 'dates', group: 'when', title: 'section.dates', icon: PickupDateIcon },
  { id: 'tags', group: 'tags', title: 'section.tags', icon: OptionIcon },
  { id: 'links', group: 'links', title: 'section.links', icon: LinkIcon },
]

interface EditorProps {
  editor: PinEditor
  isEvent: boolean
  language: Language
  onLanguage: (language: Language) => void
  onPreview: (language: Language) => void
  onBack: () => void
  onDelete: () => void
}

/** One section's fields, the same in every structure. */
function SectionFields({ id, editor, language, onLanguage }: { id: SectionId } & Pick<EditorProps, 'editor' | 'language' | 'onLanguage'>) {
  switch (id) {
    case 'location':
      return <LocationFields editor={editor} />
    case 'content':
      return <ContentFields editor={editor} language={language} onLanguage={onLanguage} />
    case 'hours':
      return <HoursFields editor={editor} />
    case 'dates':
      return <DatesFields editor={editor} />
    case 'tags':
      return <TagFields editor={editor} />
    default:
      return <LinkFields editor={editor} />
  }
}

function IssueDot() {
  return <span aria-hidden className="size-2 shrink-0 rounded-full bg-danger" />
}

/** Back link, the pin's name, its status and its map link: the M17 header. */
function Header({ editor, isEvent, onBack }: Pick<EditorProps, 'editor' | 'isEvent' | 'onBack'>) {
  const { c, language } = useCopy()
  const { stored } = editor
  const name = stored.title[language] || stored.title[language === 'en' ? 'de' : 'en']
  const title = name || c(isEvent ? 'editor.newEvent' : 'editor.newPlace')
  const status = shownStatus({ ...editor.pin, status: stored.status })

  return (
    <header className="flex flex-col gap-3">
      <PinsBackBar label={c('editor.back')} title={title} onBack={onBack} />
      <button className="hidden w-fit items-center gap-1.5 rounded-lg text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:flex" type="button" onClick={onBack}>
        <BackIcon aria-hidden size={16} />
        {c('editor.back')}
      </button>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-title text-pretty [overflow-wrap:anywhere] max-lg:sr-only">{title}</h1>
          {stored.slug && <p className="text-sm text-muted [overflow-wrap:anywhere]">{`…/map?place=${stored.slug}`}</p>}
        </div>
        {!editor.isNew && (
          <div className="flex flex-wrap gap-2 [&_svg]:shrink-0">
            <StatusChip tone={statusTone[status]}>{c(statusKey[status])}</StatusChip>
          </div>
        )}
      </div>
    </header>
  )
}

/** Phones: the actions at the end of the form, as the story editor does. */
function PhoneActions({ editor, onDelete }: Pick<EditorProps, 'editor' | 'onDelete'>) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface">
      <SaveNote editor={editor} />
      <EditorActions editor={editor} onDelete={onDelete} />
    </div>
  )
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Option A, one page: every section as a card in one column, a section bar that jumps and
 * marks the section in view (and the ones that need attention), and the publication panel
 * in a 320px column. The story editor's frame.
 */
function OnePageEditor(props: EditorProps) {
  const { c } = useCopy()
  const { editor } = props
  const isWide = useIsWide()
  const [active, setActive] = useState<SectionId>('location')
  const rootRef = useRef<HTMLDivElement>(null)

  // Marks the section nearest the top; the observer fires on crossings, not per frame.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]

        if (top)
          setActive(top.target.id.replace('pin-', '') as SectionId)
      },
      { rootMargin: '-120px 0px -60% 0px' },
    )

    rootRef.current?.querySelectorAll('[data-section]').forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const nav = (
    <nav aria-label={c('editor.sections')} className={`flex gap-1.5 overflow-x-auto py-2 ${STICKY_TABS_BELOW_BAR} lg:sticky lg:top-0 lg:z-10 lg:-mx-1 lg:bg-background/90 lg:px-1 lg:backdrop-blur-xl`}>
      {SECTIONS.map(s => (
        <button
          key={s.id}
          aria-current={active === s.id ? 'location' : undefined}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:focus-ring aria-[current=location]:border-foreground aria-[current=location]:bg-foreground aria-[current=location]:text-background lg:h-9"
          type="button"
          onClick={() => document.getElementById(`pin-${s.id}`)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })}
        >
          {c(s.title)}
          {props.editor.groupIssue[s.group] && <IssueDot />}
          {props.editor.groupIssue[s.group] && <span className="sr-only">{c('tab.hasIssue')}</span>}
        </button>
      ))}
    </nav>
  )

  const panel = <PublishPanel editor={editor} onDelete={props.onDelete} onPreview={props.onPreview} />

  return (
    <div ref={rootRef} className="flex flex-col gap-5 lg:gap-6">
      <Header editor={editor} isEvent={props.isEvent} onBack={props.onBack} />
      <div className={isWide ? 'grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6' : 'flex flex-col gap-5'}>
        <div className="flex min-w-0 flex-col gap-5">
          {!isWide && panel}
          {nav}
          {SECTIONS.map(s => (
            <div key={s.id} className="scroll-mt-28 lg:scroll-mt-16" data-section id={`pin-${s.id}`}>
              <DetailCard icon={s.icon} id={`card-${s.id}`} title={c(s.title)} trailing={<Need required={s.required} />}>
                <SectionFields editor={editor} id={s.id} language={props.language} onLanguage={props.onLanguage} />
              </DetailCard>
            </div>
          ))}
          {!isWide && <PhoneActions editor={editor} onDelete={props.onDelete} />}
        </div>
        {isWide && <div className="sticky top-6 flex min-w-0 flex-col gap-6">{panel}</div>}
      </div>
    </div>
  )
}

type TabId = 'content' | 'location' | 'when' | 'tags' | 'links'

const TABS: { id: TabId, label: CopyKey, sections: SectionId[] }[] = [
  { id: 'content', label: 'tab.content', sections: ['content'] },
  { id: 'location', label: 'tab.location', sections: ['location'] },
  { id: 'when', label: 'tab.when', sections: ['dates', 'hours'] },
  { id: 'tags', label: 'tab.tags', sections: ['tags'] },
  { id: 'links', label: 'tab.links', sections: ['links'] },
]

/**
 * Option B, tabs: a status strip with the checklist on top, five tabs (pinned on phones), one
 * tab's fields at a time, and a save bar pinned to the bottom of the screen.
 */
function TabsEditor(props: EditorProps) {
  const { c } = useCopy()
  const { editor } = props
  const [tab, setTab] = useState<TabId>(props.isEvent ? 'when' : 'content')
  const state = panelState(editor)
  const datedCount = editor.pin.dates.length

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Header editor={editor} isEvent={props.isEvent} onBack={props.onBack} />
      <section aria-label={c('publish.eyebrow')} className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">{c('publish.eyebrow')}</span>
          <span className="text-heading">{c(`publish.${state}`)}</span>
        </div>
        {(state === 'new' || state === 'draft' || state === 'ready') && <Checklist compact editor={editor} />}
        <div className="lg:w-64">
          <PreviewButtons onPreview={props.onPreview} />
        </div>
      </section>
      <div className={`py-1 ${STICKY_TABS_BELOW_BAR}`}>
        <Tabs className="w-full" selectedKey={tab} onSelectionChange={key => setTab(key as TabId)}>
          <Tabs.ListContainer className="w-full overflow-x-auto">
            <Tabs.List aria-label={c('editor.sections')} className="w-full">
              {TABS.map((t, index) => {
                const issue = t.sections.some(s => editor.groupIssue[SECTIONS.find(x => x.id === s)!.group])

                return (
                  <Tabs.Tab key={t.id} className="flex-1 whitespace-nowrap" id={t.id}>
                    {index > 0 && <Tabs.Separator />}
                    <span className="flex items-center gap-1.5">
                      {c(t.label)}
                      {t.id === 'when' && datedCount > 0 && (
                        <span className="min-w-5 rounded-full bg-default px-1.5 text-xs leading-5 tabular-nums">{datedCount}</span>
                      )}
                      {issue && <IssueDot />}
                      {issue && <span className="sr-only">{c('tab.hasIssue')}</span>}
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                )
              })}
            </Tabs.List>
          </Tabs.ListContainer>
          {TABS.map(t => (
            <Tabs.Panel key={t.id} className="pt-4" id={t.id}>
              <div className="flex flex-col gap-4">
                {t.sections.map(id => (
                  <section key={id} aria-labelledby={`b-${id}`} className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
                    <div className="flex items-center gap-2">
                      <h2 className="flex-1 text-base font-semibold" id={`b-${id}`}>{c(SECTIONS.find(s => s.id === id)!.title)}</h2>
                      <Need required={SECTIONS.find(s => s.id === id)!.required} />
                    </div>
                    <SectionFields editor={editor} id={id} language={props.language} onLanguage={props.onLanguage} />
                  </section>
                ))}
              </div>
            </Tabs.Panel>
          ))}
        </Tabs>
      </div>
      {/* The save bar: above the phone tab bar, at the bottom edge from 1024px. */}
      <div className="sticky bottom-16 z-10 -mx-4 flex flex-col gap-2 border-t border-separator bg-surface/95 px-4 py-3 backdrop-blur-xl lg:bottom-0 lg:mx-0 lg:flex-row lg:items-center lg:justify-between lg:rounded-3xl lg:border-0 lg:px-5 lg:shadow-surface">
        <SaveNote editor={editor} />
        <EditorActions editor={editor} layout="row" onDelete={props.onDelete} />
      </div>
    </div>
  )
}

/** Phones in option C: the pin as guests will see it, pinned under the back bar. */
function MiniPreview({ editor, onOpen }: { editor: PinEditor, onOpen: () => void }) {
  const { c, language, intlLocale } = useCopy()
  const { pin } = editor
  const next = nextEntry(pin.dates)
  const title = pin.title[language] || pin.title[language === 'en' ? 'de' : 'en'] || c('preview.noTitle')

  return (
    <div className={`py-2 ${STICKY_TABS_BELOW_BAR}`}>
      <button className="flex w-full items-center gap-3 rounded-2xl bg-surface p-2 pe-3 text-start shadow-surface outline-none focus-visible:focus-ring" type="button" onClick={onOpen}>
        <Media alt="" className="size-11 shrink-0 rounded-xl" photo={pin.photo || undefined} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{title}</span>
          <span className="truncate text-xs text-muted">
            {next ? formatShortDate(next.firstDay, LAB_TODAY, intlLocale) : c('preview.show')}
          </span>
        </span>
        <span className="text-xs font-medium underline underline-offset-4">{c('preview.title')}</span>
      </button>
    </div>
  )
}

/**
 * Option C, form and live preview: fewer, larger cards on the left (hours and dates share one
 * "When" card) and the guest card on the right, redrawn as the merchant types, with the
 * checklist and buttons under it. Phones get a pinned mini card that opens the preview.
 */
function PreviewEditor(props: EditorProps) {
  const { c } = useCopy()
  const { editor } = props
  const isWide = useIsWide()
  const [previewLanguage, setPreviewLanguage] = useState<Language>(props.language)
  const state = panelState(editor)
  const cards: { id: string, title: CopyKey, icon: IconComponent, required?: boolean, sections: SectionId[] }[] = [
    { id: 'content', title: 'section.content', icon: ContentIcon, required: true, sections: ['content'] },
    { id: 'location', title: 'section.location', icon: PickupIcon, required: true, sections: ['location'] },
    { id: 'when', title: 'tab.when', icon: PickupDateIcon, sections: ['dates', 'hours'] },
    { id: 'tags', title: 'section.tags', icon: OptionIcon, sections: ['tags'] },
    { id: 'links', title: 'section.links', icon: LinkIcon, sections: ['links'] },
  ]

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <Header editor={editor} isEvent={props.isEvent} onBack={props.onBack} />
      {!isWide && <MiniPreview editor={editor} onOpen={() => props.onPreview(props.language)} />}
      <div className={isWide ? 'grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6' : 'flex flex-col gap-5'}>
        <div className="flex min-w-0 flex-col gap-5">
          {cards.map(card => (
            <DetailCard key={card.id} icon={card.icon} id={`c-${card.id}`} title={c(card.title)} trailing={<Need required={card.required} />}>
              {card.sections.map((id, index) => (
                <div key={id} className={`flex flex-col gap-4 ${index > 0 ? 'border-t border-separator pt-4' : ''}`}>
                  {card.sections.length > 1 && <h3 className="text-sm font-semibold">{c(SECTIONS.find(s => s.id === id)!.title)}</h3>}
                  <SectionFields editor={editor} id={id} language={props.language} onLanguage={props.onLanguage} />
                </div>
              ))}
            </DetailCard>
          ))}
          {!isWide && (
            <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface">
              <span className="text-heading">{c(`publish.${state}`)}</span>
              <Checklist compact editor={editor} />
              <SaveNote editor={editor} />
              <EditorActions editor={editor} onDelete={props.onDelete} />
            </div>
          )}
        </div>
        {isWide && (
          <aside aria-label={c('preview.live')} className="sticky top-6 flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{c('preview.live')}</h2>
              <PreviewLanguage value={previewLanguage} onChange={setPreviewLanguage} />
            </div>
            <GuestPreview isOffMap={state !== 'published'} language={previewLanguage} pin={editor.pin} />
            <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface">
              <span className="text-heading">{c(`publish.${state}`)}</span>
              <Checklist compact editor={editor} />
              <SaveNote editor={editor} />
              <EditorActions editor={editor} onDelete={props.onDelete} />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

/**
 * Option S, as M13's tour editor: the header, Edit | Preview, then the stepper
 * (`pins-merchant-steps.tsx`) or the guest preview. The stepper stays mounted, so the step
 * and its language survive a look at the preview.
 */
function StepsStructure(props: EditorProps) {
  const { t } = useLocale()
  const [previewing, setPreviewing] = useState(false)

  return (
    <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
      <Header editor={props.editor} isEvent={props.isEvent} onBack={props.onBack} />
      <div aria-label={t('products.preview.mode')} className="flex w-fit gap-1 rounded-full bg-surface-secondary p-1" role="group">
        <Button aria-pressed={!previewing} size="sm" variant={previewing ? 'tertiary' : 'primary'} onPress={() => setPreviewing(false)}>
          {t('products.preview.edit')}
        </Button>
        <Button aria-pressed={previewing} size="sm" variant={previewing ? 'primary' : 'tertiary'} onPress={() => setPreviewing(true)}>
          {t('products.preview.show')}
        </Button>
      </div>
      {previewing && (
        <PinPreview isOffMap={panelState(props.editor) !== 'published'} pin={props.editor.pin} onClose={() => setPreviewing(false)} />
      )}
      <div hidden={previewing}>
        <StepsEditor editor={props.editor} isEvent={props.isEvent} onDelete={props.onDelete} />
      </div>
    </div>
  )
}

/** N17 in the structure the lab asks for, with the preview sheet every structure can open. */
export function PinEditorScreen({ option, initial, others, isEvent, startWithErrors, onSaved, onBack, onDelete }: {
  option: EditorOption
  initial: Pin
  others: Pin[]
  isEvent: boolean
  startWithErrors: boolean
  onSaved: (pin: Pin) => void
  onBack: () => void
  onDelete: (id: string) => void
}) {
  const { language: uiLanguage } = useCopy()
  const editor = usePinEditor({ initial, others, startWithErrors, onSaved })
  const [language, setLanguage] = useState<Language>(uiLanguage)
  const [preview, setPreview] = useState<Language | null>(null)
  const Structure = option === 'A' ? OnePageEditor : option === 'B' ? TabsEditor : option === 'C' ? PreviewEditor : StepsStructure

  // The guest phone beside the frame shows the form as it is typed, before it is saved.
  useEffect(() => {
    postToPage({ type: 'draft', pin: editor.pin })
  }, [editor.pin])
  useEffect(() => () => postToPage({ type: 'draft', pin: null }), [])

  return (
    <>
      <Structure
        editor={editor}
        isEvent={isEvent}
        language={language}
        onBack={onBack}
        onDelete={() => onDelete(editor.stored.id)}
        onLanguage={setLanguage}
        onPreview={setPreview}
      />
      {preview && (
        <PreviewSheet editor={editor} language={preview} onClose={() => setPreview(null)} onLanguage={setPreview} />
      )}
    </>
  )
}
