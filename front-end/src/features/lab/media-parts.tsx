import type { FileActions } from './media-actions'
import type { CopyKey } from './media-copy'
import type { MediaRef, MediaRow, OwnerKind, Usage, UsedPage, UseOptions } from './media-data'
import type { Library } from './media-state'
import type { RowAction } from '@/components/row-actions'
import type { StatusTone } from '@/components/status-chip'

import { Alert, AlertDialog, Button, Description, FieldError, Input, Label, Spinner, TextField, toast } from '@heroui/react'
import { useRef, useState } from 'react'

import { ChevronRightIcon, CloseIcon, EditIcon, PickupIcon, ResetIcon, TrashIcon, UploadIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { audioUrl } from '@/lib/audio'
import { mc } from './media-copy'
import { ACCEPT, canReplace, fileSize, pagePhoto, replaceImpact, retireCheck, shapeOf, usageOf } from './media-data'
import { kindIcon, shortDate, usageLine } from './media-rules'

/** A square preview: the photo, or the kind's icon on the hero ground; a spinner while processing. */
export function Thumb({ row, className = 'size-12 rounded-lg' }: { row: MediaRow, className?: string }) {
  const Icon = kindIcon[row.kind]

  return (
    <Media alt="" className={`shrink-0 ${className} ${row.status === 'retired' ? 'opacity-50 grayscale' : ''}`} photo={row.kind === 'image' ? row.preview || undefined : undefined}>
      {row.kind !== 'image' && (
        <span className="absolute inset-0 flex items-center justify-center text-foreground/70">
          <Icon aria-hidden size={22} />
        </span>
      )}
      {row.status === 'processing' && (
        <span className="absolute inset-0 flex items-center justify-center bg-surface/60">
          <Spinner size="sm" />
        </span>
      )}
    </Media>
  )
}

const statusTone: Record<MediaRow['status'], StatusTone> = { processing: 'info', ready: 'success', retired: 'neutral' }

/** Only the unusual states get a chip; "Ready" is the normal case and stays quiet. */
export function StatusTag({ row }: { row: MediaRow }) {
  if (row.status === 'ready')
    return null

  return <StatusChip tone={statusTone[row.status]}>{mc(`status.${row.status}`)}</StatusChip>
}

export function UsageText({ usage }: { usage: Usage }) {
  return (
    <span className={usage.pages.length ? (usage.published.length ? '' : 'text-warning') : 'text-muted'}>
      {usageLine(usage)}
    </span>
  )
}

/** The ⋯ menu of a file: details, Replace, and Retire with its reason in the label when it is refused. */
export function FileMenu({ row, refs, rules, onOpen, actions }: {
  row: MediaRow
  refs: MediaRef[]
  rules: UseOptions
  onOpen: () => void
  actions: FileActions
}) {
  const check = retireCheck(row, refs, rules)
  const retireLabel = !check.ok && check.reason === 'in-use'
    ? (check.pages === 1 ? mc('row.retireUsedOne') : mc('row.retireUsed', { count: check.pages }))
    : mc('row.retire')
  const items: RowAction<'open' | 'replace' | 'retire'>[] = [
    { id: 'open', label: mc('row.open'), icon: EditIcon },
    { id: 'replace', label: mc('row.replace'), icon: ResetIcon, isDisabled: !canReplace(row) },
    { id: 'retire', label: retireLabel, icon: TrashIcon, isDisabled: !check.ok },
  ]

  return (
    <RowActions
      actions={items}
      label={mc('row.actions', { name: row.name })}
      onAction={(id) => {
        if (id === 'open')
          onOpen()
        else if (id === 'replace')
          actions.askReplace(row)
        else
          void actions.askRetire(row)
      }}
    />
  )
}

/** Before Replace: how many pages change, published and draft-only (AC51). */
export function ReplaceDialog({ row, refs, rules, onConfirm, onCancel }: {
  row: MediaRow | null
  refs: MediaRef[]
  rules: UseOptions
  onConfirm: () => void
  onCancel: () => void
}) {
  const impact = row ? replaceImpact(row.id, refs, rules) : null

  return (
    <AlertDialog.Backdrop isDismissable isOpen={!!row} onOpenChange={open => !open && onCancel()}>
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status="accent" />
            <AlertDialog.Heading>{row ? mc('replace.title', { name: row.name }) : ''}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="flex flex-col gap-2">
            <p>
              {impact?.pages
                ? mc('replace.bodyPages', { pages: impact.pages, published: impact.published, drafts: impact.drafts })
                : mc('replace.bodyNone')}
            </p>
            {row?.kind === 'pdf' && <p className="text-muted">{mc('replace.pdf')}</p>}
          </AlertDialog.Body>
          <AlertDialog.Footer className="flex-col-reverse sm:flex-row">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus starts on the least changing action, as ConfirmDialog does */}
            <Button autoFocus className="w-full sm:w-auto" variant="tertiary" onPress={onCancel}>{mc('replace.cancel')}</Button>
            <Button className="w-full sm:w-auto" onPress={onConfirm}>{mc('replace.confirm')}</Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  )
}

// ---------------------------------------------------------------------------------------------
// Detail: preview with Replace and Retire, where used, name and description, info.

/** Replace and Retire on the preview: 44 px pills on a white surface, so they read on any photo. */
const overlayButton
  = 'h-11 min-w-11 rounded-full bg-surface/95 px-3.5 text-sm font-medium text-foreground shadow-overlay backdrop-blur hover:bg-surface data-[disabled=true]:opacity-60'

/**
 * The file, with Replace and Retire at its top-right corner. While Retire is refused, the reason
 * sits right under the preview and the button points to it.
 */
function Preview({ row, refs, rules, actions }: { row: MediaRow, refs: MediaRef[], rules: UseOptions, actions: FileActions }) {
  const check = retireCheck(row, refs, rules)
  const isRetired = row.status === 'retired'
  const reason = check.ok || isRetired
    ? null
    : check.reason === 'in-use'
      ? (check.pages === 1 ? mc('retire.inUseOne') : mc('retire.inUse', { count: check.pages }))
      : mc('retire.processing')
  const src = row.kind === 'audio' ? audioUrl(row.preview) : undefined
  const Icon = kindIcon[row.kind]

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {row.kind === 'image'
          ? <Thumb className={`w-full rounded-2xl ${row.width && row.height && row.height > row.width ? 'aspect-[3/4] max-h-80' : 'aspect-[4/3]'}`} row={row} />
          : (
              <div className="flex min-h-40 flex-col justify-end gap-3 rounded-2xl bg-surface-secondary p-4 pt-16">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon aria-hidden size={20} />
                  <span className="min-w-0 break-words">{row.fileName}</span>
                </span>
                {/* The lab plays the bundled sample; a recording has no captions track of its own. */}
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                {src && <audio controls className="w-full" preload="none" src={src} />}
                {row.kind === 'pdf' && (
                  <Button className="self-start max-lg:h-11" size="sm" variant="tertiary" onPress={() => toast.success(mc('where.open', { name: row.fileName }))}>
                    {mc('detail.openPdf')}
                  </Button>
                )}
              </div>
            )}
        {!isRetired && (
          <div className="absolute end-2 top-2 flex gap-2">
            <Button className={overlayButton} isDisabled={!canReplace(row)} onPress={() => actions.askReplace(row)}>
              <UploadIcon aria-hidden size={16} />
              {mc('row.replace')}
            </Button>
            <Button aria-describedby={reason ? `retire-${row.id}` : undefined} className={overlayButton} isDisabled={!check.ok} onPress={() => void actions.askRetire(row)}>
              <TrashIcon aria-hidden size={16} />
              {mc('retire.button')}
            </Button>
          </div>
        )}
      </div>
      {reason && <p className="text-xs text-pretty text-muted" id={`retire-${row.id}`}>{reason}</p>}
      {isRetired && <p className="rounded-2xl bg-surface-secondary px-3 py-2 text-sm text-muted">{mc('detail.retired')}</p>}
    </div>
  )
}

const HYPHENS = /-/g
const NON_BREAKING_HYPHEN = '\u2011'

function Facts({ row }: { row: MediaRow }) {
  const facts = [
    { label: mc('detail.uploadedAs'), value: row.fileName },
    { label: mc('detail.type'), value: row.contentType },
    { label: mc('detail.fileSize'), value: fileSize(row.byteSize) },
    ...(row.kind === 'image' ? [{ label: mc('detail.dimensions'), value: shapeOf(row) }] : []),
    ...(row.kind === 'audio' ? [{ label: mc('detail.length'), value: shapeOf(row) }] : []),
    { label: mc('detail.added'), value: shortDate(row.createdAt) },
    { label: mc('detail.version'), value: mc('detail.versionValue', { n: row.version }) },
  ]

  // One row per fact, as the M04 and partner rows do it. A file name breaks only as a whole word:
  // its hyphens are shown as non-breaking ones, and an over-long one still wraps as a last resort.
  return (
    <dl className="flex flex-col divide-y divide-separator text-sm">
      {facts.map(fact => (
        <div key={fact.label} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-muted">{fact.label}</dt>
          <dd className="min-w-0 text-end break-words tabular-nums">{fact.value.replace(HYPHENS, NON_BREAKING_HYPHEN)}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Name and description (the alt text), saved together. The name is what search matches (open
 * point 1, decided); it starts as the uploaded file name. The description is the only one (open
 * point 3, still open).
 */
function DetailsEditor({ row, onSave }: { row: MediaRow, onSave: (details: { name: string, alt: MediaRow['alt'] }) => void }) {
  const [name, setName] = useState(row.name)
  const [en, setEn] = useState(row.alt.en ?? '')
  const [de, setDe] = useState(row.alt.de ?? '')
  const isPhoto = row.kind === 'image'
  const changed = name.trim() !== row.name || en !== (row.alt.en ?? '') || de !== (row.alt.de ?? '')
  const nameMissing = !name.trim()
  const readOnly = row.status === 'retired'

  return (
    <section aria-labelledby={`details-${row.id}`} className="flex flex-col gap-3">
      <h3 className="sr-only" id={`details-${row.id}`}>{mc('name.label')}</h3>
      <TextField fullWidth isInvalid={nameMissing} isReadOnly={readOnly} value={name} onChange={setName}>
        <Label>{mc('name.label')}</Label>
        <Input />
        <Description>{mc('name.help')}</Description>
        <FieldError>{mc('name.required')}</FieldError>
      </TextField>
      <div className="flex flex-col gap-0.5 pt-1">
        <span className="text-sm font-semibold">{mc('alt.title')}</span>
        <p className="text-xs text-pretty text-muted">{isPhoto ? mc('alt.noteOnly') : mc('alt.noteOther')}</p>
      </div>
      {(['en', 'de'] as const).map(lang => (
        <TextField key={lang} fullWidth isReadOnly={readOnly} value={lang === 'en' ? en : de} onChange={lang === 'en' ? setEn : setDe}>
          <Label>{lang === 'en' ? mc('alt.en') : mc('alt.de')}</Label>
          <Input lang={lang} placeholder={mc('alt.missing')} />
          {lang === 'de' && !de && en && <Description>Guests reading German see no description yet.</Description>}
        </TextField>
      ))}
      {!readOnly && (
        <Button
          className="self-start max-lg:h-11"
          isDisabled={!changed || nameMissing}
          size="sm"
          variant="secondary"
          onPress={() => onSave({ name: name.trim(), alt: { en: en.trim() || undefined, de: de.trim() || undefined } })}
        >
          {mc('details.save')}
        </Button>
      )}
    </section>
  )
}

const ownerLabel: Record<OwnerKind, CopyKey> = {
  story: 'kindLabel.story',
  place: 'kindLabel.place',
  tour: 'kindLabel.tour',
  keepsake: 'kindLabel.keepsake',
}

/** "Story · EN · cover", "Place · extra photo · 2 of 3 · Order in the pin editor", "Tour · tour PDF". */
function pageMeta(page: UsedPage, refs: MediaRef[], mediaId: string) {
  const parts = [mc(ownerLabel[page.ownerKind])]

  if (page.language)
    parts.push(page.language.toUpperCase())
  parts.push(page.roles.map(role => mc(`role.${role}`)).join(', '))
  if (page.roles.includes('more')) {
    const extras = refs.filter(r => r.ownerKind === 'place' && r.ownerId === page.ownerId && r.role === 'more')
    const mine = extras.find(r => r.mediaId === mediaId)

    if (mine?.position)
      parts.push(`${mine.position} of ${extras.length}`)
    parts.push(mc('where.orderElsewhere'))
  }

  return parts.join(' · ')
}

/**
 * One row per page, the whole row a link: the page's own photo, its title, and what the file is
 * there. In the lab a link would leave the frame, so the row says where it would go.
 */
function PageList({ pages, refs, mediaId }: { pages: UsedPage[], refs: MediaRef[], mediaId: string }) {
  return (
    <ul className="flex flex-col divide-y divide-separator">
      {pages.map((page) => {
        const photo = pagePhoto(page.ownerKind, page.ownerId)

        return (
          <li key={page.key}>
            <button
              className="flex min-h-11 w-full items-center gap-3 rounded-xl py-2.5 text-start outline-none hover:bg-default/60 focus-visible:focus-ring"
              type="button"
              onClick={() => toast.success(mc('where.open', { name: page.ownerName }))}
            >
              <Media alt="" className="size-12 shrink-0 rounded-xl" photo={photo}>
                {!photo && (
                  <span className="absolute inset-0 flex items-center justify-center text-foreground/70">
                    <PickupIcon aria-hidden size={20} />
                  </span>
                )}
              </Media>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium [overflow-wrap:anywhere]">{page.ownerName}</span>
                <span className="text-xs text-muted">{pageMeta(page, refs, mediaId)}</span>
              </span>
              <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function WhereUsed({ row, refs, rules }: { row: MediaRow, refs: MediaRef[], rules: UseOptions }) {
  const usage = usageOf(row.id, refs, rules)

  return (
    <section aria-labelledby={`where-${row.id}`} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold" id={`where-${row.id}`}>{mc('where.title')}</h3>
      {!usage.pages.length && <p className="text-sm text-muted">{mc('where.none')}</p>}
      {usage.published.length > 0 && (
        <div className="flex flex-col">
          <h4 className="text-label text-muted">{`${mc('where.published')} (${usage.published.length})`}</h4>
          <PageList mediaId={row.id} pages={usage.published} refs={refs} />
        </div>
      )}
      {usage.draftOnly.length > 0 && (
        <div className="flex flex-col">
          <h4 className="text-label text-muted">{`${mc('where.drafts')} (${usage.draftOnly.length})`}</h4>
          <p className="text-xs text-muted">{mc('where.draftNote')}</p>
          <PageList mediaId={row.id} pages={usage.draftOnly} refs={refs} />
        </div>
      )}
    </section>
  )
}

/** Everything about one file, in the detail sheet. */
export function MediaDetail({ row, lib, rules, actions }: {
  row: MediaRow
  lib: Library
  rules: UseOptions
  actions: FileActions
}) {
  const refused = lib.refusal?.mediaId === row.id ? lib.refusal.ref : null

  return (
    <div className="flex flex-col gap-5">
      {refused && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{mc('retire.refusedTitle')}</Alert.Title>
            <Alert.Description>{mc('retire.refusedBody', { name: refused.ownerName, lang: (refused.language ?? '').toUpperCase() })}</Alert.Description>
          </Alert.Content>
          <Button isIconOnly aria-label="Dismiss" className="max-lg:size-11" size="sm" variant="ghost" onPress={lib.dismissRefusal}>
            <CloseIcon size={16} />
          </Button>
        </Alert>
      )}
      <Preview actions={actions} refs={lib.refs} row={row} rules={rules} />
      {row.status === 'processing' && <p className="text-sm text-muted">{mc('detail.processing')}</p>}
      <WhereUsed refs={lib.refs} row={row} rules={rules} />
      <DetailsEditor key={`${row.id}-${row.version}`} row={row} onSave={details => lib.saveDetails(row.id, details)} />
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{mc('detail.facts')}</h3>
        <Facts row={row} />
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Upload: one button for several files; the files appear in the list as they are built.

export function UploadButton({ lib, className = '' }: { lib: Library, className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Button className={`max-lg:h-11 ${className}`} onPress={() => inputRef.current?.click()}>
        <UploadIcon aria-hidden size={16} />
        {mc('upload')}
      </Button>
      <input
        ref={inputRef}
        hidden
        multiple
        accept={`${ACCEPT},.heic`}
        type="file"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]

          event.target.value = ''
          void lib.upload(files)
        }}
      />
    </>
  )
}
