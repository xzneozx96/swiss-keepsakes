import type { Keepsake, Language, Localized } from './keepsake-editor-data'
import type { Check } from './keepsake-editor-rules'
import type { ProductModel } from './keepsake-editor-state'
import type { IconComponent } from '@/components/icons'
import type { RowAction } from '@/components/row-actions'

import { Button, Description, FieldError, Input, Label, Skeleton, TextArea, TextField, toast } from '@heroui/react'
import { useState } from 'react'

import { ConfirmDialog, useConfirm } from '@/components/confirm-dialog'
import { BackIcon, ChevronDownIcon, StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { LANG_NAME } from './keepsake-editor-data'
import { fullLanguages, label, languageState } from './keepsake-editor-rules'
import { mediaOf } from './story-editor-data'
import { OrderedRows } from './story-editor-ordered'

/**
 * The pieces the read views share: the page header with its back arrow, the section card with ⋯,
 * the fields a section sheet edits (name and text, photo order, commission), and the publish card
 * with M17's blocking checks and warnings.
 */

const NOT_SLUG = /[^a-z0-9]+/g
const EDGE_DASHES = /^-|-$/g

/** Where a page reached by clicking goes back to; a list in the sidebar has none. */
export interface Back {
  label: string
  onPress: () => void
}

/** The 44px back arrow before a title (M17's top bar has the same). */
export function BackButton({ back }: { back: Back }) {
  return (
    <Button isIconOnly aria-label={back.label} className="size-11 shrink-0" variant="ghost" onPress={back.onPress}>
      <BackIcon aria-hidden size={20} />
    </Button>
  )
}

const STATUS_TONE: Record<'success' | 'warning' | 'danger' | 'neutral', { text: string, dot: string }> = {
  success: { text: 'text-success', dot: 'bg-success' },
  warning: { text: 'text-warning', dot: 'bg-warning' },
  danger: { text: 'text-danger', dot: 'bg-danger' },
  neutral: { text: 'text-muted', dot: 'border border-muted' },
}

/** The status as text in its tone, with a dot so colour is not the only signal: "● Published". */
export function StatusText({ tone, text }: { tone: keyof typeof STATUS_TONE, text: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap lg:text-sm ${STATUS_TONE[tone].text}`}>
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${STATUS_TONE[tone].dot}`} />
      {text}
    </span>
  )
}

/** The back arrow (pages reached by clicking), the title on one line (full text in `title`) over the status line; the page's actions on the right. */
export function PageHeader({ back, title, status, actions }: { back?: Back, title: string, status?: React.ReactNode, actions?: React.ReactNode }) {
  return (
    <header className={`flex min-w-0 items-center gap-2 pt-4 lg:pt-0 ${back ? 'ps-2 pe-4 lg:px-0' : 'px-4 lg:px-0'}`}>
      {back && <BackButton back={back} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="truncate text-heading" title={title}>{title}</h1>
        {status && <div className="flex min-w-0 items-center gap-2">{status}</div>}
      </div>
      {actions && <span className="shrink-0">{actions}</span>}
    </header>
  )
}

/** A read section: the M04 card (icon tile, title) with a ⋯ menu or a button on the right. */
export function ReadCard<Id extends string>({ id, icon: Icon, title, actions, onAction, trailing, children }: {
  id: string
  icon: IconComponent
  title: string
  actions?: RowAction<Id>[]
  onAction?: (id: Id) => void
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex min-w-0 scroll-mt-20 flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface max-lg:mx-4 lg:p-5" id={id}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
          <Icon aria-hidden size={18} />
        </span>
        <h2 className="min-w-0 flex-1 text-base font-semibold" id={`${id}-title`}>{title}</h2>
        {trailing}
        {actions && <RowActions actions={actions} label={`${title} actions`} onAction={onAction} />}
      </div>
      {children}
    </section>
  )
}

/** One fact of a read card: label left, value right (Medusa's rows). */
export function Fact({ name, children }: { name: string, children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-separator pt-3 text-sm first:border-none first:pt-0">
      <dt className="shrink-0 text-muted">{name}</dt>
      <dd className="min-w-0 text-end break-words">{children}</dd>
    </div>
  )
}

/** The edit screen's shape: the top bar, then the cards in one column (as M17's Write). */
export function PageSkeleton() {
  const block = (lines: number) => (
    <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface max-lg:mx-4 lg:p-5">
      <Skeleton className="h-6 w-40 rounded-full" />
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className="h-9 w-full rounded-xl" />)}
    </div>
  )

  return (
    <div aria-busy="true" aria-label="Loading the keepsake" className="flex flex-col">
      <div className="flex h-[5.0625rem] items-center gap-3 border-b border-separator px-4">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-40 rounded-full" />
          <Skeleton className="h-4 w-64 max-w-full rounded-full" />
        </div>
        <Skeleton className="h-10 w-40 rounded-full max-lg:w-20" />
      </div>
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-3 pt-3 lg:gap-6 lg:px-5 lg:pt-8">
        {block(3)}
        {block(2)}
        {block(3)}
        {block(5)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Fields the section sheets edit

/** The switch's own labels, as the story editor's `VersionSwitch` writes them. */
const SWITCH_NAME: Record<Language, string> = { en: 'English', de: 'Deutsch' }

/** EN | DE on the shared language switch (the story editor's too); each status is that language's completeness. */
export function LanguageSwitch({ value, onChange, text }: { value: Language, onChange: (l: Language) => void, text: { name: Localized, text: Localized } }) {
  const status = (l: Language) => {
    const state = languageState(text, l)

    return { text: state, tone: state === 'Complete' ? 'success' as const : state === 'Not written' ? 'muted' as const : 'warning' as const }
  }

  return (
    <LanguageVersionSwitch
      languages={(['en', 'de'] as const).map(l => ({ id: l, label: SWITCH_NAME[l], short: l.toUpperCase() }))}
      selected={value}
      status={{ en: status('en'), de: status('de') }}
      onChange={onChange}
    />
  )
}

export function BasicsFields({ value, onChange, showErrors }: {
  value: Pick<Keepsake, 'name' | 'text'>
  onChange: (next: Pick<Keepsake, 'name' | 'text'>) => void
  showErrors: boolean
}) {
  const [language, setLanguage] = useState<Language>('en')
  const { name, text } = value
  const invalid = showErrors && !fullLanguages(value).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <LanguageSwitch text={value} value={language} onChange={setLanguage} />
        <p className="text-xs text-pretty text-muted">One full language is enough to publish. Readers of the other see it with a note.</p>
      </div>
      <TextField fullWidth isRequired isInvalid={invalid && !name[language].trim()} value={name[language]} onChange={v => onChange({ ...value, name: { ...name, [language]: v } })}>
        <Label>{`Name (${LANG_NAME[language]})`}</Label>
        <Input lang={language} maxLength={90} placeholder={language === 'en' ? 'Victorinox pocket knife, Lucerne designs' : 'Victorinox Taschenmesser, Luzerner Motive'} />
        <FieldError>Add a name in English or German to publish.</FieldError>
      </TextField>
      <TextField fullWidth isRequired isInvalid={invalid && !text[language].trim()} value={text[language]} onChange={v => onChange({ ...value, text: { ...text, [language]: v } })}>
        <Label>{`Text (${LANG_NAME[language]})`}</Label>
        <TextArea lang={language} maxLength={1200} rows={6} />
        <Description>{`What the keepsake is, the sizes, and anything a guest should know. ${text[language].length} / 1200`}</Description>
        <FieldError>Add the text in the same language as the name.</FieldError>
      </TextField>
    </div>
  )
}

/** The photos in order (first is the cover): drag by the grip, remove. Adding is the N18 picker. */
export function PhotoOrder({ photos, onChange }: { photos: string[], onChange: (ids: string[]) => void }) {
  return photos.length
    ? (
        <OrderedRows
          items={photos.map((id, i) => ({ id, name: mediaOf(id)?.name ?? id, photo: mediaOf(id)?.preview ?? '', note: i === 0 ? 'Cover' : undefined }))}
          label="Photos, in order"
          onChange={onChange}
        />
      )
    : <p className="text-sm text-muted">No photos.</p>
}

// ---------------------------------------------------------------------------------------------
// Status and publishing

export function productStatus(p: Keepsake): { tone: 'success' | 'warning' | 'neutral', text: string } {
  if (p.status === 'published')
    return p.editsNotLive ? { tone: 'warning', text: 'Published · edits not live' } : { tone: 'success', text: 'Published' }

  return { tone: 'neutral', text: 'Draft' }
}

export function ProductStatusChip({ product }: { product: Keepsake }) {
  const { tone, text } = productStatus(product)

  return <StatusChip tone={tone}>{text}</StatusChip>
}

/** Autosave's state, as M17 says it: unsaved edits, saving, or the time of the last save. */
export function SaveStatus({ model }: { model: ProductModel }) {
  const text = model.save === 'saving' ? 'Saving…' : model.save === 'unsaved' ? 'Unsaved changes' : `Saved ${model.savedAt}`

  return (
    <span aria-live="polite" className={`flex min-w-0 items-center gap-1.5 truncate text-xs whitespace-nowrap lg:text-sm ${model.save === 'unsaved' ? 'font-medium text-warning' : 'text-muted'}`} role="status">
      {model.save === 'unsaved' && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {model.save === 'saved' && <StatusSuccessIcon aria-hidden className="text-success" size={14} />}
      {text}
    </span>
  )
}

/**
 * M17's top bar for the keepsake page: back, the name with its status badge (the
 * page's one badge), the save status, and the screen's action (Review and publish).
 */
export function EditorTopBar({ model, onBack, backLabel, children }: {
  model: ProductModel
  onBack: () => void
  backLabel: string
  children?: React.ReactNode
}) {
  const name = label(model.product.name) || 'Untitled keepsake'

  return (
    <div className="sticky top-0 z-30 border-b border-separator bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-2 px-2 py-2 lg:gap-3 lg:px-6">
        <BackButton back={{ label: backLabel, onPress: onBack }} />
        {/* The name on one line, then status and save state as one line. */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="truncate text-sm font-semibold lg:text-base" title={name}>{name}</h1>
          <div className="flex min-w-0 items-center gap-1.5">
            <StatusText {...productStatus(model.product)} />
            <span aria-hidden className="text-xs text-muted">·</span>
            <SaveStatus model={model} />
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Leaving with edits not yet saved asks first (the shared confirm, as M17). */
export function useLeaveGuard(model: ProductModel, openAtStart: boolean, leave: () => void) {
  const [open, setOpen] = useState(openAtStart)
  const dialog = (
    <ConfirmDialog
      body="Your last edits are not saved yet. If you leave now, they are lost."
      cancelLabel="Keep editing"
      confirmLabel="Leave without saving"
      isOpen={open}
      title="Leave without saving?"
      onCancel={() => setOpen(false)}
      onConfirm={() => {
        setOpen(false)
        leave()
      }}
    />
  )

  return { leave: () => (model.save === 'unsaved' ? setOpen(true) : leave()), dialog }
}

/** The checks: blocking (red, Edit jumps to the field) and warnings (amber, Show). */
export function ChecksList({ model, onFix }: { model: ProductModel, onFix: (check: Check) => void }) {
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
            <span className="min-w-0 flex-1 text-pretty">{c.text}</span>
            <button className="min-h-11 min-w-11 shrink-0 text-sm text-foreground underline underline-offset-4 lg:min-h-0 lg:min-w-0" type="button" onClick={() => onFix(c)}>Edit</button>
          </li>
        ))}
        {!blocking.length && (
          <li className="flex items-start gap-2 text-sm">
            <StatusSuccessIcon aria-hidden className="mt-0.5 shrink-0 text-success" size={16} />
            <span>Name, text, photos and a variant on sale are all set. The other language is never required.</span>
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
                <button className="min-h-11 min-w-11 shrink-0 text-sm text-muted underline underline-offset-4 lg:min-h-0 lg:min-w-0" type="button" onClick={() => onFix(c)}>Show</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Publish, publish the edits of a live keepsake, or unpublish it (asks first). `bar`: the phone's pinned bar. */
export function PublishActions({ model, layout = 'stack' }: { model: ProductModel, layout?: 'stack' | 'bar' }) {
  const { confirm, dialog } = useConfirm()
  const { product } = model
  const blocked = model.checks.blocking.length > 0
  const live = product.status === 'published'
  const full = fullLanguages(product)

  const publish = () => {
    model.publish()
    toast.success(`Published in ${full.map(l => LANG_NAME[l]).join(' and ')}. Guests see it within about a minute.`)
  }
  const unpublish = async () => {
    const ok = await confirm({
      title: 'Unpublish this keepsake?',
      body: 'Guests stop seeing it at once and can’t order it. Open orders stay as they are. It stays here as a draft.',
      confirmLabel: 'Unpublish',
    })

    if (ok) {
      model.unpublish()
      toast('The keepsake is a draft again.')
    }
  }

  return (
    <div className={`flex gap-2 ${layout === 'stack' ? 'flex-col' : 'shrink-0 flex-row items-center'}`}>
      {(!live || product.editsNotLive) && (
        <Button className={`max-lg:h-11 ${layout === 'stack' ? 'order-first' : ''}`} fullWidth={layout === 'stack'} isDisabled={blocked} onPress={publish}>
          {live ? 'Publish changes' : 'Publish'}
        </Button>
      )}
      {live && (layout === 'stack' || !product.editsNotLive) && (
        <Button className="max-lg:h-11" fullWidth={layout === 'stack'} variant="danger-soft" onPress={() => void unpublish()}>Unpublish</Button>
      )}
      {blocked && layout === 'stack' && <p className="text-xs text-danger">Fix what stops publishing first.</p>}
      {dialog}
    </div>
  )
}

/** The head of M17's publish card: the language switch (it drives the preview), the name, what goes live. */
export function PublishHead({ model, language, onLanguage }: { model: ProductModel, language: Language, onLanguage: (l: Language) => void }) {
  const { product } = model
  const full = fullLanguages(product)
  const slug = (label(product.name) || 'new-keepsake').toLowerCase().normalize('NFKD').replace(NOT_SLUG, '-').replace(EDGE_DASHES, '')

  return (
    <div className="flex flex-col gap-3" id="publish-card">
      <div className="flex flex-col gap-1.5">
        <LanguageSwitch text={product} value={language} onChange={onLanguage} />
        <p className="text-xs text-muted">The preview follows the switch. Name and text are per language.</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-lg text-pretty" lang={language}>{label(product.name, language) || 'Untitled keepsake'}</p>
        <p className="text-sm text-pretty text-muted">
          {full.length === 2
            ? 'Goes live in English and German.'
            : full.length === 1
              ? `Goes live in ${LANG_NAME[full[0]!]}. ${LANG_NAME[full[0] === 'en' ? 'de' : 'en']} readers see it with a note.`
              : 'Needs a name and text in one language.'}
        </p>
        <p className="truncate text-xs text-muted">{`/${full[0] ?? 'en'}/gifts/${slug} · guests see it within about a minute`}</p>
      </div>
    </div>
  )
}

/** Phones: the checks fold into one line above Publish, pinned over the tab bar (M17's bar). */
export function PhonePublishBar({ model, onFix, startExpanded = false }: { model: ProductModel, onFix: (check: Check) => void, startExpanded?: boolean }) {
  const { blocking, warnings } = model.checks
  const [expanded, setExpanded] = useState(startExpanded)
  const summary = blocking.length
    ? `${blocking.length} ${blocking.length === 1 ? 'thing stops' : 'things stop'} publishing`
    : warnings.length ? `Ready · ${warnings.length} to look at` : 'Ready to publish'
  const Icon = blocking.length ? StatusDangerIcon : warnings.length ? StatusWarningIcon : StatusSuccessIcon

  return (
    <div className="fixed inset-x-0 bottom-16 z-20 flex flex-col border-t border-separator bg-surface shadow-overlay">
      {expanded && (
        <div className="max-h-[42dvh] overflow-y-auto border-b border-separator px-4 py-3">
          <ChecksList
            model={model}
            onFix={(check) => {
              setExpanded(false)
              onFix(check)
            }}
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <button aria-expanded={expanded} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-start text-sm font-medium outline-none focus-visible:focus-ring" type="button" onClick={() => setExpanded(e => !e)}>
          <Icon aria-hidden className={`shrink-0 ${blocking.length ? 'text-danger' : warnings.length ? 'text-warning' : 'text-success'}`} size={18} />
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <ChevronDownIcon aria-hidden className={`shrink-0 text-muted transition-transform ${expanded ? '' : 'rotate-180'}`} size={16} />
        </button>
        <PublishActions layout="bar" model={model} />
      </div>
    </div>
  )
}
