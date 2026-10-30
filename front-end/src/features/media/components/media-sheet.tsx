import type { MediaItem, MediaUse } from '@sk/api-contract'

import { Alert, Button, Description, Drawer, FieldError, Input, Label, Skeleton, TextField } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { ChevronRightIcon, CloseIcon, FilePdfIcon, MusicIcon, PickupIcon, TrashIcon, UploadIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { useMediaUses } from '../api/queries'
import { canReplace, duration, EDITOR_PATH, fileSize, retireCheck, titleOf } from '../lib/rules'
import { FileThumb } from './file-thumb'

/** Replace and Retire on the preview: 44 px pills on a white surface, so they read on any photo. */
const OVERLAY_BUTTON = 'h-11 min-w-11 rounded-full bg-surface/95 px-3.5 text-sm font-medium text-foreground shadow-overlay backdrop-blur hover:bg-surface data-[disabled=true]:opacity-60'

export interface SheetActions {
  askReplace: (item: MediaItem) => void
  retire: (item: MediaItem) => void
  save: (item: MediaItem, details: { name: string, alt: { en: string, de: string } }) => void
}

/** The file with Replace and Retire at its top-right corner. While Retire is refused, the reason sits right under it. */
function Preview({ item, busy, actions }: { item: MediaItem, busy: boolean, actions: SheetActions }) {
  const { t } = useLocale()
  const check = retireCheck(item)
  const isRetired = item.status === 'retired'
  const reason = check.ok || isRetired
    ? null
    : check.reason === 'in-use'
      ? t(check.pages === 1 ? 'media.retire.inUseOne' : 'media.retire.inUse', { count: check.pages })
      : t('media.retire.processing')
  const Icon = item.kind === 'audio' ? MusicIcon : FilePdfIcon

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {item.kind === 'image'
          ? <FileThumb busy={busy} className={`w-full rounded-2xl ${item.width && item.height && item.height > item.width ? 'aspect-[3/4] max-h-80' : 'aspect-[4/3]'}`} item={item} width={640} />
          : (
              <div className="flex min-h-40 flex-col justify-end gap-3 rounded-2xl bg-surface-secondary p-4 pt-16">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon aria-hidden size={20} />
                  <span className="min-w-0 break-words">{item.fileName}</span>
                </span>
                {/* A recording has no captions track of its own. */}
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                {item.kind === 'audio' && item.publicUrl && <audio controls className="w-full" preload="none" src={item.publicUrl} />}
                {item.kind === 'pdf' && item.publicUrl && (
                  <a className="inline-flex min-h-11 items-center self-start rounded-full bg-default px-4 text-sm font-medium text-foreground" href={item.publicUrl} rel="noreferrer" target="_blank">
                    {t('media.detail.openPdf')}
                  </a>
                )}
              </div>
            )}
        {!isRetired && (
          <div className="absolute end-2 top-2 flex gap-2">
            <Button className={OVERLAY_BUTTON} isDisabled={!canReplace(item) || busy} onPress={() => actions.askReplace(item)}>
              <UploadIcon aria-hidden size={16} />
              {t('media.row.replace')}
            </Button>
            <Button aria-describedby={reason ? `retire-${item.id}` : undefined} className={OVERLAY_BUTTON} isDisabled={!check.ok || busy} onPress={() => actions.retire(item)}>
              <TrashIcon aria-hidden size={16} />
              {t('media.retire.button')}
            </Button>
          </div>
        )}
      </div>
      {reason && <p className="text-xs text-pretty text-muted" id={`retire-${item.id}`}>{reason}</p>}
      {isRetired && <p className="rounded-2xl bg-surface-secondary px-3 py-2 text-sm text-muted">{t('media.detail.retired')}</p>}
    </div>
  )
}

const HYPHENS = /-/g
const NON_BREAKING_HYPHEN = '\u2011'

function Facts({ item }: { item: MediaItem }) {
  const { t, intlLocale } = useLocale()
  const date = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.createdAt))
  const dims = item.width && item.height ? `${item.width} × ${item.height}` : t('media.detail.pending')
  const facts = [
    { label: t('media.detail.uploadedAs'), value: item.fileName },
    { label: t('media.detail.type'), value: item.contentType },
    { label: t('media.detail.fileSize'), value: fileSize(item.byteSize, intlLocale) },
    ...(item.kind === 'image' ? [{ label: t('media.detail.dimensions'), value: dims }] : []),
    ...(item.kind === 'audio' ? [{ label: t('media.detail.length'), value: item.durationSeconds === null ? '–' : duration(item.durationSeconds) }] : []),
    { label: t('media.detail.added'), value: date },
    { label: t('media.detail.version'), value: t('media.detail.versionValue', { n: item.version }) },
  ]

  // A file name breaks only as a whole word: its hyphens are shown as non-breaking ones.
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

/** Name and description (the alt text), saved together. The name is what search matches; it starts as the uploaded file name. */
function DetailsEditor({ item, actions }: { item: MediaItem, actions: SheetActions }) {
  const { t } = useLocale()
  const [name, setName] = useState(item.name)
  const [en, setEn] = useState(item.alt.en ?? '')
  const [de, setDe] = useState(item.alt.de ?? '')
  const changed = name.trim() !== item.name || en.trim() !== (item.alt.en ?? '') || de.trim() !== (item.alt.de ?? '')
  const nameMissing = !name.trim()
  const readOnly = item.status === 'retired'

  return (
    <section aria-labelledby={`details-${item.id}`} className="flex flex-col gap-3">
      <h3 className="sr-only" id={`details-${item.id}`}>{t('media.name.label')}</h3>
      <TextField fullWidth isInvalid={nameMissing} isReadOnly={readOnly} value={name} onChange={setName}>
        <Label>{t('media.name.label')}</Label>
        <Input />
        <Description>{t('media.name.help')}</Description>
        <FieldError>{t('media.name.required')}</FieldError>
      </TextField>
      <div className="flex flex-col gap-0.5 pt-1">
        <span className="text-sm font-semibold">{t('media.alt.title')}</span>
        <p className="text-xs text-pretty text-muted">{t(item.kind === 'image' ? 'media.alt.noteOnly' : 'media.alt.noteOther')}</p>
      </div>
      {(['en', 'de'] as const).map(lang => (
        <TextField key={lang} fullWidth isReadOnly={readOnly} value={lang === 'en' ? en : de} onChange={lang === 'en' ? setEn : setDe}>
          <Label>{t(lang === 'en' ? 'media.alt.en' : 'media.alt.de')}</Label>
          <Input lang={lang} placeholder={t('media.alt.missing')} />
          {lang === 'de' && !de && en && <Description>{t('media.alt.germanMissing')}</Description>}
        </TextField>
      ))}
      {!readOnly && (
        <Button
          className="self-start max-lg:h-11"
          isDisabled={!changed || nameMissing}
          size="sm"
          variant="secondary"
          onPress={() => actions.save(item, { name: name.trim(), alt: { en: en.trim(), de: de.trim() } })}
        >
          {t('media.details.save')}
        </Button>
      )}
    </section>
  )
}

function PageRow({ use }: { use: MediaUse }) {
  const { t, language } = useLocale()
  const title = titleOf(use, language, t('media.where.untitled'))
  const meta = [t(`media.kindLabel.${use.pageKind}`), ...(use.language ? [use.language.toUpperCase()] : []), t(`media.role.${use.role}`)].join(' · ')

  return (
    <li>
      <Link className="flex min-h-11 w-full items-center gap-3 rounded-xl py-2.5 text-start outline-none hover:bg-default/60 focus-visible:focus-ring" to={EDITOR_PATH[use.pageKind](use.pageId) as never}>
        <span className="relative block size-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary">
          {use.thumbnailUrl
            ? <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" loading="lazy" src={use.thumbnailUrl} />
            : (
                <span className="absolute inset-0 flex items-center justify-center text-foreground/70">
                  <PickupIcon aria-hidden size={20} />
                </span>
              )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium [overflow-wrap:anywhere]">{title}</span>
          <span className="text-xs text-muted">{meta}</span>
        </span>
        <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
      </Link>
    </li>
  )
}

function WhereUsed({ storeId, item }: { storeId: string, item: MediaItem }) {
  const { t } = useLocale()
  const uses = useMediaUses(storeId, item.id)
  const none = uses.data && !uses.data.published.length && !uses.data.drafts.length

  return (
    <section aria-labelledby={`where-${item.id}`} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold" id={`where-${item.id}`}>{t('media.where.title')}</h3>
      {uses.isPending && (
        <div aria-hidden className="flex flex-col gap-2">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3 rounded-lg" />
                <Skeleton className="h-3 w-1/3 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}
      {uses.isError && <p className="text-sm text-danger">{t('media.where.loadFailed')}</p>}
      {none && <p className="text-sm text-muted">{t('media.where.none')}</p>}
      {!!uses.data?.published.length && (
        <div className="flex flex-col">
          <h4 className="text-label text-muted">{`${t('media.where.published')} (${uses.data.published.length})`}</h4>
          <ul className="flex flex-col divide-y divide-separator">{uses.data.published.map(use => <PageRow key={`${use.pageKind}-${use.pageId}-${use.language}`} use={use} />)}</ul>
        </div>
      )}
      {!!uses.data?.drafts.length && (
        <div className="flex flex-col">
          <h4 className="text-label text-muted">{`${t('media.where.drafts')} (${uses.data.drafts.length})`}</h4>
          <p className="text-xs text-muted">{t('media.where.draftNote')}</p>
          <ul className="flex flex-col divide-y divide-separator">{uses.data.drafts.map(use => <PageRow key={`${use.pageKind}-${use.pageId}-${use.language}`} use={use} />)}</ul>
        </div>
      )}
    </section>
  )
}

function Detail({ storeId, item, busy, refused, actions, onDismiss }: { storeId: string, item: MediaItem, busy: boolean, refused: boolean, actions: SheetActions, onDismiss: () => void }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-5">
      {refused && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('media.retire.refusedTitle')}</Alert.Title>
            <Alert.Description>{t('media.retire.refusedBody')}</Alert.Description>
          </Alert.Content>
          <Button isIconOnly aria-label={t('media.alert.dismiss')} className="max-lg:size-11" size="sm" variant="ghost" onPress={onDismiss}>
            <CloseIcon size={16} />
          </Button>
        </Alert>
      )}
      <Preview actions={actions} busy={busy} item={item} />
      {item.status === 'processing' && <p className="text-sm text-muted">{t('media.detail.processing')}</p>}
      <WhereUsed item={item} storeId={storeId} />
      <DetailsEditor key={`${item.id}-${item.version}-${item.name}`} actions={actions} item={item} />
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{t('media.detail.facts')}</h3>
        <Facts item={item} />
      </section>
    </div>
  )
}

/** One file in a sheet: from the right on a laptop, from the bottom on a phone. */
export function MediaSheet({ storeId, item, busy, refused, actions, onDismissRefusal, onClose }: {
  storeId: string
  item: MediaItem | null
  busy: boolean
  refused: boolean
  actions: SheetActions
  onDismissRefusal: () => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const isWide = useIsWide()

  return (
    <Drawer.Backdrop isOpen={!!item} onOpenChange={open => !open && onClose()}>
      {/* The width sits on the panel: Drawer.Content is the full-screen positioner. */}
      <Drawer.Content className={isWide ? undefined : 'mx-auto max-w-[560px]'} placement={isWide ? 'right' : 'bottom'}>
        <Drawer.Dialog className={`flex flex-col ${isWide ? 'h-full w-[26rem] max-w-full' : 'sheet-max'}`}>
          {!isWide && <Drawer.Handle />}
          <Drawer.Header className="flex items-center justify-between gap-3">
            <Drawer.Heading className="min-w-0 truncate text-heading">{item?.name}</Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t('media.sheet.close')} />
          </Drawer.Header>
          <Drawer.Body className="overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            {item && <Detail actions={actions} busy={busy} item={item} refused={refused} storeId={storeId} onDismiss={onDismissRefusal} />}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
