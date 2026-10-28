import type { StepStatus, TextFieldId } from '@sk/domain/catalog'
import type { CopyKey } from './pins-merchant-copy'
import type { PinEditor } from './pins-merchant-editor-state'
import type { Language } from '@/contexts/locale-context'
import type { StepView } from '@/features/merchant/products/components/step-shell'

import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { ClockIcon, ContentIcon, LinkIcon, OptionIcon, PickupIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'
import {
  ReviewRow,
  ReviewSection,
  StepBar,
  StepBody,
  StepLayout,
} from '@/features/merchant/products/components/step-shell'
import { useCopy } from './pins-merchant-copy'
import { categoryName, completeness, mapCategories, stories } from './pins-merchant-data'
import { ContentFields, LinkFields, LocationFields, Need, TagFields } from './pins-merchant-fields'
import { Checklist, panelState } from './pins-merchant-publish'
import { DatesFields, HoursFields } from './pins-merchant-schedule'

export const PIN_STEPS = ['place', 'content', 'when', 'tags', 'links', 'review'] as const
export type PinStep = (typeof PIN_STEPS)[number]

/** A step's state on the stepper: red where a publish rule or a field error sits, green when filled. */
function statusOf(step: PinStep, editor: PinEditor): StepStatus {
  const { pin, checks, errors, attempt } = editor
  const fieldError = (prefix: string) => Object.keys(errors).some(key => key.startsWith(prefix))

  switch (step) {
    case 'place':
      if (errors.slug || (attempt && (!checks.location || !checks.slug)))
        return 'error'
      return checks.location && checks.slug ? 'done' : 'todo'
    case 'content': {
      if (attempt && !checks.title)
        return 'error'
      if (!checks.title)
        return 'todo'
      const en = completeness(pin, 'en')
      const de = completeness(pin, 'de')

      return en.done === en.total && de.done === de.total ? 'done' : 'warning'
    }
    case 'when':
      if (fieldError('date:') || fieldError('hours:'))
        return 'error'
      return pin.hours.length > 0 || pin.dates.length > 0 ? 'done' : 'todo'
    case 'tags':
      return pin.categories.length > 0 || pin.interests.length > 0 ? 'done' : 'todo'
    case 'links':
      if (errors.link)
        return 'error'
      return pin.storyId || pin.link ? 'done' : 'todo'
    default:
      return editor.ready && editor.errorCount === 0 ? 'done' : attempt ? 'error' : 'todo'
  }
}

const stepLabel: Record<PinStep, CopyKey> = {
  place: 'step.place',
  content: 'step.content',
  when: 'step.when',
  tags: 'step.tags',
  links: 'step.links',
  review: 'step.review',
}

/** One step on the Review step, with Edit and what it still needs. */
function Section({ step, steps, issues = [], onGo, children }: {
  step: PinStep
  steps: StepView[]
  issues?: string[]
  onGo: (step: PinStep) => void
  children: React.ReactNode
}) {
  const index = PIN_STEPS.indexOf(step)

  return (
    <ReviewSection
      index={index}
      issues={issues.map(text => ({ text, tone: 'danger' as const }))}
      step={steps[index]!}
      onEdit={() => onGo(step)}
    >
      {children}
    </ReviewSection>
  )
}

/** Step 6: each step's facts and what it still needs, with Edit; the publish rules on top. */
function Review({ editor, steps, onGo }: { editor: PinEditor, steps: StepView[], onGo: (step: PinStep) => void }) {
  const { c, language } = useCopy()
  const { pin } = editor
  const state = panelState(editor)
  const none = c('review.none')
  const story = stories.find(s => s.id === pin.storyId)
  const photos = [pin.photo, ...pin.morePhotos].filter(Boolean)
  const days = new Set(pin.hours.map(h => h.day)).size
  const fieldIssue = (prefixes: string[]) =>
    Object.keys(editor.errors).some(key => prefixes.some(p => key.startsWith(p))) ? [c('review.fix')] : []
  const shared = { steps, onGo }
  const intro = state === 'hidden' ? 'review.intro.hidden' : state === 'published' || state === 'ended' ? 'review.intro.live' : 'review.intro.draft'
  const placeIssues = [
    ...(editor.checks.location ? [] : [c('review.missing.location')]),
    ...(editor.checks.slug ? [] : [c('review.missing.slug')]),
  ]
  const categoryNames = pin.categories
    .flatMap(id => mapCategories.filter(m => m.id === id))
    .map(m => categoryName(m, language))
    .join(', ')

  return (
    <>
      <section className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
        <p className="text-sm text-pretty">{c(intro)}</p>
        <div className="border-t border-separator pt-3">
          <Checklist editor={editor} />
        </div>
      </section>
      <Section {...shared} issues={placeIssues} step="place">
        <ReviewRow label={c('review.location')}>{pin.lat !== null && pin.lng !== null ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : none}</ReviewRow>
        <ReviewRow label={c('review.link')}>{pin.slug || none}</ReviewRow>
        <ReviewRow label={c('review.address')}>{pin.address || none}</ReviewRow>
      </Section>
      <Section {...shared} issues={editor.checks.title ? [] : [c('review.missing.title')]} step="content">
        <ReviewRow label={c('review.title')}>{pin.title[language] || pin.title[language === 'en' ? 'de' : 'en'] || none}</ReviewRow>
        <ReviewRow label={c('review.languages')}>
          {(['en', 'de'] as const).filter(l => pin.title[l].trim()).map(l => c(`lang.${l}`)).join(', ') || none}
        </ReviewRow>
        <ReviewRow label={c('review.photos')}>
          {photos.length
            ? (
                <span className="ms-auto flex justify-end gap-1">
                  {photos.slice(0, 4).map(photo => <Media key={photo} alt="" className="size-10 rounded-lg" photo={photo} />)}
                </span>
              )
            : none}
        </ReviewRow>
      </Section>
      <Section {...shared} issues={fieldIssue(['date:', 'hours:'])} step="when">
        <ReviewRow label={c('review.hours')}>{days ? c('review.days', { count: days }) : none}</ReviewRow>
        <ReviewRow label={c('review.dates')}>{pin.dates.length ? c('review.entries', { count: pin.dates.length }) : none}</ReviewRow>
      </Section>
      <Section {...shared} step="tags">
        <ReviewRow label={c('review.categories')}>{categoryNames || none}</ReviewRow>
        <ReviewRow label={c('review.stay')}>{c(`stay.${pin.stay}`)}</ReviewRow>
        <ReviewRow label={c('review.interests')}>{pin.interests.map(i => c(`interest.${i}`)).join(', ') || none}</ReviewRow>
      </Section>
      <Section {...shared} issues={fieldIssue(['link'])} step="links">
        <ReviewRow label={c('review.story')}>{story ? (story.title[language] || story.title.en || story.title.de) : none}</ReviewRow>
        <ReviewRow label={c('review.website')}>{pin.link || none}</ReviewRow>
      </Section>
    </>
  )
}

/**
 * N17 as a stepper, the tour editor's pattern (M13): the steps in a numbered column from
 * 1024 px ("Step 2 of 6" and All steps on phones), one step at a time, and the step bar.
 * A new pin walks the steps with Next; an existing pin opens any step and saves from any step.
 */
export function StepsEditor({ editor, isEvent, onDelete }: {
  editor: PinEditor
  isEvent: boolean
  onDelete: () => void
}) {
  const { c, language: uiLanguage } = useCopy()
  const { confirm, dialog } = useConfirm()
  const [step, setStep] = useState<PinStep>(isEvent ? 'when' : 'place')
  const [reached, setReached] = useState(() => PIN_STEPS.indexOf(isEvent ? 'when' : 'place'))
  const [language, setLanguage] = useState(uiLanguage)
  const state = panelState(editor)
  const isDraft = state === 'new' || state === 'draft' || state === 'ready'
  const index = PIN_STEPS.indexOf(step)
  const name = editor.pin.title.en || editor.pin.title.de || c('row.untitled')

  // The text step gets the tour editor's EN | DE tabs, with a dot on a language that misses text.
  const missingIn = (l: Language): TextFieldId[] => [
    ...(editor.pin.title[l].trim() ? [] : ['name' as const]),
    ...(editor.pin.tip[l].trim() ? [] : ['description' as const]),
  ]
  const steps: StepView[] = PIN_STEPS.map(id => ({
    id,
    label: c(stepLabel[id]),
    status: statusOf(id, editor),
    missing: id === 'content' ? { en: missingIn('en'), de: missingIn('de') } : undefined,
  }))
  const go = (next: PinStep) => {
    setStep(next)
    setReached(r => Math.max(r, PIN_STEPS.indexOf(next)))
    window.scrollTo(0, 0)
  }
  const canGo = (id: string) => !editor.isNew || PIN_STEPS.indexOf(id as PinStep) <= reached
  const firstProblem = () => PIN_STEPS.find(id => statusOf(id, { ...editor, attempt: true }) === 'error')

  const publish = () => {
    if (!editor.ready || editor.errorCount > 0) {
      editor.markAttempt()
      const problem = firstProblem()

      if (problem)
        go(problem)

      return
    }
    editor.commit('published', () => {})
  }
  const hide = async () => {
    const ok = await confirm({ title: c('hide.title', { name }), body: c('hide.body'), confirmLabel: c('hide.confirm') })

    if (ok)
      editor.setStatus('hidden')
  }

  const status = editor.attempt && editor.errorCount > 0
    ? { status: editor.errorCount === 1 ? c('save.errors.one') : c('save.errors.other', { count: editor.errorCount }), tone: 'danger' as const }
    : editor.attempt && !editor.ready
      ? { status: c('steps.needsRules'), tone: 'danger' as const }
      : editor.save === 'saving'
        ? { status: c('save.saving'), tone: 'muted' as const }
        : editor.save === 'saved' && !editor.dirty
          ? { status: c('save.saved'), tone: 'success' as const }
          : { status: c(editor.isNew ? 'steps.notSaved' : editor.dirty ? 'save.unsaved' : 'steps.noChanges'), tone: 'muted' as const }
  const isReview = step === 'review'
  const back = index > 0 ? () => go(PIN_STEPS[index - 1]!) : undefined
  const forward = () => go(PIN_STEPS[index + 1]!)
  const saveDraft = { label: c('steps.saveDraft'), onPress: () => editor.commit('draft', () => {}) }
  const bar: React.ComponentProps<typeof StepBar> = isDraft
    ? {
        ...status,
        isSaving: editor.save === 'saving',
        onBack: back,
        onForward: editor.isNew || isReview ? undefined : forward,
        secondary: saveDraft,
        primary: isReview
          ? { label: c('steps.publish'), onPress: publish }
          : editor.isNew
            ? { label: c('steps.next'), onPress: forward }
            : { label: c('steps.publish'), onPress: publish },
      }
    : {
        ...status,
        isSaving: editor.save === 'saving',
        onBack: back,
        onForward: isReview ? undefined : forward,
        secondary: isReview
          ? state === 'hidden'
            ? { label: c('action.unhide'), onPress: () => editor.setStatus('published') }
            : { label: c('action.hide'), onPress: () => void hide() }
          : undefined,
        primary: { label: c('steps.save'), onPress: () => editor.commit(editor.stored.status, () => {}) },
      }

  const card = (icon: React.ComponentProps<typeof DetailCard>['icon'], title: CopyKey, required: boolean, children: React.ReactNode) => (
    <DetailCard icon={icon} title={c(title)} trailing={<Need required={required} />}>{children}</DetailCard>
  )
  const render = (lang: Language) => {
    switch (step) {
      case 'place':
        return card(PickupIcon, 'section.location', true, <LocationFields editor={editor} />)
      case 'content':
        return card(ContentIcon, 'section.content', true, <ContentFields inTabs editor={editor} language={lang} onLanguage={setLanguage} />)
      case 'when':
        return (
          <>
            {card(ClockIcon, 'section.dates', false, <DatesFields editor={editor} />)}
            {card(ClockIcon, 'section.hours', false, <HoursFields editor={editor} />)}
          </>
        )
      case 'tags':
        return card(OptionIcon, 'section.tags', false, <TagFields editor={editor} />)
      case 'links':
        return card(LinkIcon, 'section.links', false, <LinkFields editor={editor} />)
      default:
        return <Review editor={editor} steps={steps} onGo={go} />
    }
  }

  return (
    <StepLayout quietTitle canGo={canGo} current={step} steps={steps} onGo={id => go(id as PinStep)}>
      <StepBody language={language} render={render} step={steps[index]!} onLanguage={setLanguage} />
      {isReview && state !== 'new' && isDraft && (
        <button
          className="self-start text-sm text-danger underline underline-offset-4"
          type="button"
          onClick={async () => {
            if (await confirm({ title: c('delete.title', { name }), body: c('delete.body'), confirmLabel: c('delete.confirm') }))
              onDelete()
          }}
        >
          {c('action.delete')}
        </button>
      )}
      <StepBar {...bar} />
      {dialog}
    </StepLayout>
  )
}
