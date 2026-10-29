import type { LanguageStatus } from './language-version-switch'
import type { Language } from './story-editor-data'
import type { Check } from './story-editor-rules'
import type { LabState } from './story-editor-search-params'
import type { StoryEditorModel } from './story-editor-state'
import type { StoryEditorProps } from './story-editor-tiptap'

import { Button, Description, FieldError, Input, Label, Skeleton, TextArea, TextField, toast } from '@heroui/react'
import { formatShortDate } from '@sk/domain/shared'
import { lazy, Suspense, useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { PhotoAddIcon, StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon, TrashIcon } from '@/components/icons'
import { LanguageVersionSwitch } from './language-version-switch'
import { LAB_TODAY, LANG_NAME } from './story-editor-data'
import { contentsList, readingMinutes, wordCount } from './story-editor-rules'
import { MediaInsertSheet, PhotoById } from './story-editor-sheets'

/** Tiptap and ProseMirror load only when a writing surface shows (performance rule 9). */
const StoryBodyEditor = lazy(() => import('./story-editor-tiptap'))

// ---------------------------------------------------------------------------------------------
// The body, lazily

export function BodySkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton className="h-4 w-11/12 rounded-full" />
      <Skeleton className="h-4 w-full rounded-full" />
      <Skeleton className="h-4 w-4/5 rounded-full" />
      <Skeleton className="mt-3 h-6 w-1/2 rounded-full" />
      <Skeleton className="h-4 w-full rounded-full" />
      <Skeleton className="h-4 w-3/4 rounded-full" />
      <Skeleton className="mt-3 aspect-[4/3] w-full rounded-2xl" />
    </div>
  )
}

/** The body editor for the open version; a new language version is a new editor. */
export function BodyEditor({ model, state }: { model: StoryEditorModel, state: LabState }) {
  const { language } = model
  const start: StoryEditorProps['start'] = state === 'media' ? 'media' : state === 'pinpicker' ? 'pinpicker' : state === 'typing' ? 'typing' : undefined

  return (
    <Suspense fallback={<BodySkeleton />}>
      <StoryBodyEditor
        key={language}
        body={model.version.body}
        language={language}
        placeholder={language === 'de' ? 'Erzählen Sie Ihre Geschichte …' : 'Tell your story…'}
        start={start}
        onChange={body => model.setBody(body, language)}
        onDirty={model.markDirty}
      />
    </Suspense>
  )
}

/** Computed, never entered: words, reading time, and the contents list from the H2s. */
export function BodyFacts({ model, className = '' }: { model: StoryEditorModel, className?: string }) {
  const { body } = model.version
  const contents = contentsList(body)

  return (
    <p className={`text-xs text-muted tabular-nums ${className}`}>
      {`${wordCount(body)} words · ${readingMinutes(body)} min read · `}
      {contents.length ? `Contents: ${contents.length} sections` : 'No contents list (needs 2 headings)'}
    </p>
  )
}

// ---------------------------------------------------------------------------------------------
// Language versions and saving

function statusText(model: StoryEditorModel, l: Language) {
  const v = model.story.versions[l]

  if (v.status === 'missing')
    return 'Not started'
  if (v.status === 'published')
    return model.pending[l] ? 'Published · edits not live' : `Published ${formatShortDate(v.publishedOn ?? LAB_TODAY, LAB_TODAY, 'en-CH')}`

  return 'Draft'
}

function statusTone(model: StoryEditorModel, l: Language): LanguageStatus['tone'] {
  const v = model.story.versions[l]

  return v.status === 'missing' ? 'muted' : v.status === 'published' && !model.pending[l] ? 'success' : 'warning'
}

/** Off the header, a version not started says that choosing it starts it (it creates the draft). */
function versionText(model: StoryEditorModel, l: Language, compact: boolean) {
  return !compact && model.story.versions[l].status === 'missing' ? 'Not started · choose to start it' : statusText(model, l)
}

const VERSIONS = (['en', 'de'] as const).map(l => ({ id: l, label: LANG_NAME[l], short: l.toUpperCase() }))

/** EN | DE with each version's state, on the shared switch. Choosing a version not started yet starts it. */
export function VersionSwitch({ model, compact = false }: { model: StoryEditorModel, compact?: boolean }) {
  return (
    <LanguageVersionSwitch
      compact={compact}
      languages={VERSIONS}
      selected={model.language}
      status={{
        en: { text: versionText(model, 'en', compact), tone: statusTone(model, 'en') },
        de: { text: versionText(model, 'de', compact), tone: statusTone(model, 'de') },
      }}
      onChange={l => (model.story.versions[l].status === 'missing' ? model.startVersion(l) : model.setLanguage(l))}
    />
  )
}

/** Autosave's state: unsaved edits, saving, or the time of the last save. */
export function SaveStatus({ model }: { model: StoryEditorModel }) {
  const text = model.save === 'saving'
    ? 'Saving…'
    : model.save === 'unsaved'
      ? 'Unsaved changes'
      : model.savedAt ? `Saved ${model.savedAt}` : 'Not saved yet'

  return (
    <span aria-live="polite" className={`flex min-w-0 items-center gap-1.5 truncate text-xs whitespace-nowrap lg:text-sm ${model.save === 'unsaved' ? 'font-medium text-warning' : 'text-muted'}`} role="status">
      {model.save === 'unsaved' && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {model.save === 'saved' && model.savedAt && <StatusSuccessIcon aria-hidden className="text-success" size={14} />}
      {text}
    </span>
  )
}

// ---------------------------------------------------------------------------------------------
// Cover, title, excerpt (the author is the signed-in account)

function CoverField({ model, invalid, startOpen }: { model: StoryEditorModel, invalid: boolean, startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const { coverId } = model.version

  return (
    <div className="flex flex-col gap-1.5" id="write-cover">
      <span className="text-sm font-medium">
        Cover photo
        <span className="text-danger"> *</span>
      </span>
      {coverId
        ? (
            <PhotoById className="aspect-[16/9] w-full rounded-2xl" mediaId={coverId}>
              <span className="absolute end-3 bottom-3 flex gap-2">
                <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={() => setOpen(true)}>Change cover</Button>
                <Button isIconOnly aria-label="Remove cover" className="max-lg:size-11" size="sm" variant="secondary" onPress={() => model.patchVersion({ coverId: null })}>
                  <TrashIcon aria-hidden size={16} />
                </Button>
              </span>
            </PhotoById>
          )
        : (
            <button
              className={`flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium outline-none hover:bg-default/50 focus-visible:focus-ring ${invalid ? 'border-danger text-danger' : 'border-separator text-muted'}`}
              type="button"
              onClick={() => setOpen(true)}
            >
              <PhotoAddIcon aria-hidden size={24} />
              Add a cover photo
              <span className="text-xs font-normal">From your media library, or upload one</span>
            </button>
          )}
      {open && (
        <MediaInsertSheet
          only="image"
          onClose={() => setOpen(false)}
          onInsert={(node) => {
            model.patchVersion({ coverId: String(node.attrs?.mediaId) })
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

/** Card (a) of Write: the cover, the title and the excerpt, all three needed to publish. */
export function CoverAndTitle({ model, showErrors, startCover = false }: { model: StoryEditorModel, showErrors: boolean, startCover?: boolean }) {
  const v = model.version
  const missing = (id: string) => showErrors && model.checks.blocking.some(c => c.id === id)

  return (
    <div className="flex flex-col gap-4">
      <CoverField invalid={missing('cover')} model={model} startOpen={startCover} />
      <TextField fullWidth isRequired id="write-title" isInvalid={missing('title')} value={v.title} onChange={title => model.patchVersion({ title })}>
        <Label>Title</Label>
        <Input className="font-serif text-lg max-lg:h-12" lang={model.language} maxLength={140} placeholder="A morning on the Musegg wall" />
        {missing('title') && <FieldError>Add a title to publish.</FieldError>}
      </TextField>
      <TextField fullWidth isRequired id="write-excerpt" isInvalid={missing('excerpt')} value={v.excerpt} onChange={excerpt => model.patchVersion({ excerpt })}>
        <Label>Excerpt</Label>
        <TextArea lang={model.language} maxLength={300} rows={2} />
        <Description>{`Under the title, on story cards and in search results. ${v.excerpt.length} / 300`}</Description>
        {missing('excerpt') && <FieldError>Add an excerpt to publish.</FieldError>}
      </TextField>
      <p className="text-xs text-muted">{`Written by ${model.story.author}, the name of the account you are signed in with.`}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Publish checks and the publish action

export function ChecksList({ model, onFix }: { model: StoryEditorModel, onFix: (check: Check) => void }) {
  const { blocking, warnings } = model.checks

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        {blocking.length ? `${blocking.length} ${blocking.length === 1 ? 'thing stops' : 'things stop'} publishing` : 'Ready to publish'}
      </h3>
      <ul className="flex flex-col gap-2">
        {blocking.map(c => (
          <li key={c.id} className="flex items-start gap-2 text-sm font-medium">
            <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0 text-danger" size={16} />
            <span className="min-w-0 flex-1">{c.text}</span>
            <button className="shrink-0 text-sm text-foreground underline underline-offset-4" type="button" onClick={() => onFix(c)}>{c.step === 'write' ? 'Edit' : 'Show'}</button>
          </li>
        ))}
        {!blocking.length && (
          <li className="flex items-start gap-2 text-sm">
            <StatusSuccessIcon aria-hidden className="mt-0.5 shrink-0 text-success" size={16} />
            <span>Cover, title, excerpt and link are all set. The other language is never required.</span>
          </li>
        )}
      </ul>
      {warnings.length > 0 && (
        <>
          <h3 className="pt-1 text-sm font-semibold">{`${warnings.length} to look at (publishing still works)`}</h3>
          <ul className="flex flex-col gap-2">
            {warnings.map(c => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <StatusWarningIcon aria-hidden className="mt-0.5 shrink-0 text-warning" size={16} />
                <span className="min-w-0 flex-1 text-pretty">{c.text}</span>
                <button className="shrink-0 text-sm text-muted underline underline-offset-4" type="button" onClick={() => onFix(c)}>{c.step === 'write' ? 'Edit' : 'Show'}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Publish, publish the edits of a live version, or unpublish it (asks first). */
/** `bar`: the phone's pinned bar, one row, short labels, no note. */
export function PublishActions({ model, layout = 'stack' }: { model: StoryEditorModel, layout?: 'stack' | 'row' | 'bar' }) {
  const { confirm, dialog } = useConfirm()
  const v = model.version
  const name = LANG_NAME[model.language]
  const blocked = model.checks.blocking.length > 0
  const live = v.status === 'published'

  const publish = () => {
    model.publish()
    toast.success(`${name} version published. Guests see it within about a minute.`)
  }
  const unpublish = async () => {
    const ok = await confirm({
      title: `Unpublish the ${name} version?`,
      body: 'Guests stop seeing it at once, and links to it show the other language or a not-found page. It stays here as a draft.',
      confirmLabel: 'Unpublish',
    })

    if (ok) {
      model.unpublish()
      toast(`${name} version is a draft again.`)
    }
  }

  return (
    <div className={`flex gap-2 ${layout === 'stack' ? 'flex-col' : 'shrink-0 flex-row flex-wrap items-center'}`}>
      {live && (
        <Button className="max-lg:h-11" fullWidth={layout === 'stack'} variant="tertiary" onPress={() => void unpublish()}>
          Unpublish
        </Button>
      )}
      {(!live || model.pending[model.language]) && (
        <Button className={`max-lg:h-11 ${layout === 'stack' ? 'order-first' : ''}`} fullWidth={layout === 'stack'} isDisabled={blocked} onPress={publish}>
          {layout === 'bar' ? (live ? 'Publish changes' : 'Publish') : live ? `Publish changes (${model.language.toUpperCase()})` : `Publish ${name}`}
        </Button>
      )}
      {blocked && layout !== 'bar' && <p className="text-xs text-danger">Fix what stops publishing first.</p>}
      {dialog}
    </div>
  )
}
