import type { BodyNode, LabMedia, LabPin } from './story-editor-data'

import { Button, Input, Label, SearchField, Tabs, TextField, toast } from '@heroui/react'
import { useRef, useState } from 'react'

import { MusicIcon, PickupIcon, UploadIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { parseYoutubeId } from '@/features/content/merchant/lib/youtube'
import { checkUpload } from './media-data'
import { addUpload, keepsakes, media, mediaOf, otherStories, pins, uploadUrls } from './story-editor-data'
import { PickerFrame } from './story-editor-picker'
import { MAX_KEEPSAKES, MAX_RELATED } from './story-editor-rules'
import { ChosenMark } from './story-editor-selected'

/**
 * The editor's pickers: insert a photo, video or recording (the N18 library's wall, or an upload
 * into it), pick a pin, keepsakes and related stories. The shared sheet at every width (`PickerFrame`).
 */

export type MediaKind = 'image' | 'video' | 'audio'

/** The app's chosen border (gift options C03): 2 px red when chosen, transparent otherwise. */
const chosenBorder = (chosen: boolean) => `border-2 ${chosen ? 'border-accent' : 'border-transparent'}`

const DASHES = /[-_]/g
const EXTENSION = /\.[a-z0-9]+$/i

/** A library photo by its media id; a photo uploaded in this frame uses its object URL. */
export function PhotoById({ mediaId, className, alt = '', children }: { mediaId: string | null | undefined, className: string, alt?: string, children?: React.ReactNode }) {
  const url = mediaId ? uploadUrls.get(mediaId) : undefined

  if (url) {
    return (
      <div className={`relative overflow-hidden bg-default ${className}`}>
        <img alt={alt} className="absolute inset-0 size-full object-cover" src={url} />
        {children}
      </div>
    )
  }

  return <Media alt={alt} className={className} photo={mediaOf(mediaId)?.preview || undefined}>{children}</Media>
}

function PhotoTile({ item, className }: { item: LabMedia, className: string }) {
  return <PhotoById className={className} mediaId={item.id} />
}

/** One button for the upload; the file joins the library and is chosen at once. */
function UploadInto({ kind, onAdded }: { kind: 'image' | 'audio', onAdded: (item: LabMedia) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
        <UploadIcon aria-hidden size={16} />
        {kind === 'image' ? 'Upload a photo' : 'Upload a recording'}
      </Button>
      <input
        ref={inputRef}
        hidden
        accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'audio/mpeg,audio/mp4,audio/x-m4a'}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0]

          event.target.value = ''
          if (!file)
            return
          const check = checkUpload(file)

          if (!check.ok || check.kind !== kind) {
            toast.danger(check.ok || check.reason !== 'size' ? `${file.name} is not a ${kind === 'image' ? 'JPEG, PNG or WebP photo' : 'MP3 or M4A recording'}.` : `${file.name} is over ${check.maxMb} MB.`)

            return
          }
          onAdded(addUpload(file, kind))
          toast.success(`${file.name} is in your media library.`)
        }}
      />
    </>
  )
}

/** Photos of the library as a wall with the name under each tile, as in N18; search by name. */
function PhotoWall({ selected, onSelect }: { selected: string, onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const photos = media.filter(m => m.kind === 'image' && m.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchField aria-label="Search photos by name" className="w-full" value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" placeholder="Search by name" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <UploadInto kind="image" onAdded={item => onSelect(item.id)} />
      </div>
      {photos.length === 0 && <p className="py-6 text-center text-sm text-muted">{`No photo name contains “${query}”.`}</p>}
      <ul className="grid grid-cols-3 gap-x-2 gap-y-3 p-1 sm:grid-cols-4">
        {photos.map((item) => {
          const isSelected = item.id === selected

          return (
            <li key={item.id}>
              <button
                aria-label={item.ready ? item.name : `${item.name}, still processing`}
                aria-pressed={isSelected}
                className="flex w-full flex-col gap-1 rounded-xl text-start outline-none focus-visible:focus-ring disabled:opacity-60"
                disabled={!item.ready}
                type="button"
                onClick={() => onSelect(item.id)}
              >
                <span className="relative block w-full">
                  <span className={`relative block w-full overflow-hidden rounded-xl ${chosenBorder(isSelected)}`}>
                    <PhotoTile className="aspect-square w-full" item={item} />
                    {!item.ready && <span className="absolute start-1.5 bottom-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold">Processing</span>}
                  </span>
                  {isSelected && <ChosenMark />}
                </span>
                <span aria-hidden className="truncate px-0.5 text-xs text-muted">{item.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** A chosen row: the app's red 2 px border; the mark is added by the row (`ChosenMark`). */
const choiceRow = 'relative flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-transparent bg-surface-secondary p-3 text-start outline-none focus-visible:focus-ring aria-pressed:border-accent disabled:opacity-60'

/**
 * Insert a photo, a YouTube video or a recording between two paragraphs. Photos and recordings
 * come from the media library (N18) or are uploaded into it; a video is a YouTube link.
 * `only` limits the sheet to photos (the cover).
 */
export function MediaInsertSheet({ kind: firstKind = 'image', only, onInsert, onClose }: {
  kind?: MediaKind
  only?: 'image'
  onInsert: (node: BodyNode) => void
  onClose: () => void
}) {
  const [kind, setKind] = useState<MediaKind>(firstKind)
  const [photo, setPhoto] = useState('')
  const [recording, setRecording] = useState('')
  const [youtube, setYoutube] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [tried, setTried] = useState(false)
  const youtubeId = parseYoutubeId(youtube)
  const recordings = media.filter(m => m.kind === 'audio')

  const insert = () => {
    if (kind === 'image') {
      const item = media.find(m => m.id === photo)

      if (item)
        onInsert({ type: 'image', attrs: { mediaId: item.id, alt: item.alt, caption: '' } })
    }
    else if (kind === 'video') {
      if (!youtubeId) {
        setTried(true)

        return
      }
      onInsert({ type: 'video', attrs: { youtubeId, title: videoTitle.trim() || 'Video', caption: '' } })
    }
    else {
      const item = media.find(m => m.id === recording)

      if (item)
        onInsert({ type: 'audio', attrs: { mediaId: item.id, title: item.alt || item.name.replace(EXTENSION, '').replace(DASHES, ' '), caption: '' } })
    }
  }
  const ready = kind === 'image' ? Boolean(photo) : kind === 'audio' ? Boolean(recording) : Boolean(youtube.trim())
  const label = only ? 'Use as cover' : kind === 'image' ? 'Insert photo' : kind === 'video' ? 'Insert video' : 'Insert recording'

  return (
    <PickerFrame
      doneDisabled={!ready}
      doneLabel={label}
      title={only ? 'Cover photo' : 'Insert'}
      onClose={onClose}
      onDone={insert}
    >
      {!only && (
        <Tabs className="w-full" selectedKey={kind} onSelectionChange={key => setKind(key as MediaKind)}>
          <Tabs.ListContainer className="w-full">
            <Tabs.List aria-label="What to insert" className="w-full">
              {(['image', 'video', 'audio'] as const).map((id, index) => (
                <Tabs.Tab key={id} className="flex-1 whitespace-nowrap" id={id}>
                  {index > 0 && <Tabs.Separator />}
                  {id === 'image' ? 'Photo' : id === 'video' ? 'Video' : 'Recording'}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      )}
      {kind === 'image' && <PhotoWall selected={photo} onSelect={setPhoto} />}
      {kind === 'video' && (
        <div className="flex flex-col gap-4">
          <TextField fullWidth isInvalid={tried && !youtubeId} value={youtube} onChange={setYoutube}>
            <Label>YouTube link</Label>
            <Input inputMode="url" placeholder="https://youtu.be/…" />
            <p className="text-xs text-muted">{tried && !youtubeId ? 'This is not a YouTube link. Copy the address from the video’s Share button.' : 'YouTube only. Guests load the video when they press play.'}</p>
          </TextField>
          {youtubeId && (
            <img alt="" className="aspect-video w-full rounded-2xl bg-default object-cover" src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} />
          )}
          <TextField fullWidth value={videoTitle} onChange={setVideoTitle}>
            <Label>Title</Label>
            <Input placeholder="Read by screen readers and shown on the poster" />
          </TextField>
        </div>
      )}
      {kind === 'audio' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted">Recordings you made. Never AI voices.</p>
            <UploadInto kind="audio" onAdded={item => setRecording(item.id)} />
          </div>
          <ul className="flex flex-col gap-2 p-1">
            {recordings.map(item => (
              <li key={item.id}>
                <button aria-pressed={recording === item.id} className={choiceRow} type="button" onClick={() => setRecording(item.id)}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default">
                    <MusicIcon aria-hidden size={20} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    <span className="truncate text-xs text-muted">{item.alt || 'No description'}</span>
                  </span>
                  {recording === item.id && <ChosenMark />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PickerFrame>
  )
}

function PinRow({ pin, selected, onPress }: { pin: LabPin, selected: boolean, onPress: () => void }) {
  return (
    <button aria-pressed={selected} className={choiceRow} type="button" onClick={onPress}>
      <Media alt="" className="size-11 shrink-0 rounded-xl" photo={pin.photo || undefined}>
        {!pin.photo && <PickupIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={20} />}
      </Media>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{pin.name}</span>
        <span className="truncate text-xs text-muted">
          {pin.status === 'published' ? (pin.link ? pin.link.replace('https://', '') : 'Opens on the map') : pin.status === 'draft' ? 'Draft: shows as plain text until published' : 'Hidden: shows as plain text'}
        </span>
      </span>
      {selected && <ChosenMark />}
    </button>
  )
}

/**
 * Pick one pin (a pin link, the reviewed place) or several (the story's places). Any pin of the
 * store can be linked, published or not; an unpublished one shows as plain text to guests.
 */
export function PinPickerSheet({ title, selected, multiple = false, note, onDone, onClose }: {
  title: string
  selected: string[]
  multiple?: boolean
  note?: string
  onDone: (ids: string[]) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState(selected)
  const shown = pins.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <PickerFrame
      doneDisabled={!chosen.length && !multiple}
      doneLabel={multiple ? `Save ${chosen.length} ${chosen.length === 1 ? 'place' : 'places'}` : 'Link this pin'}
      title={title}
      onClose={onClose}
      onDone={() => onDone(chosen)}
    >
      {note && <p className="text-sm text-muted">{note}</p>}
      <SearchField aria-label="Search pins" className="w-full" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-full" placeholder="Search your pins" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <ul className="flex flex-col gap-2 p-1">
        {shown.map(p => (
          <li key={p.id}>
            <PinRow
              pin={p}
              selected={chosen.includes(p.id)}
              onPress={() => setChosen(c => (multiple ? (c.includes(p.id) ? c.filter(x => x !== p.id) : [...c, p.id]) : [p.id]))}
            />
          </li>
        ))}
      </ul>
    </PickerFrame>
  )
}

/** Keepsakes: only published ones can be chosen, at most 6, shared by both languages (AC31). */
export function KeepsakeSheet({ selected, onDone, onClose }: { selected: string[], onDone: (ids: string[]) => void, onClose: () => void }) {
  const [chosen, setChosen] = useState(selected)
  const full = chosen.length >= MAX_KEEPSAKES

  return (
    <PickerFrame
      doneLabel={`Save ${chosen.length} of ${MAX_KEEPSAKES}`}
      title="Keepsakes"
      onClose={onClose}
      onDone={() => onDone(chosen)}
    >
      <p aria-live="polite" className="text-sm text-muted">{full ? `${MAX_KEEPSAKES} chosen, the most a story can show. Remove one to add another.` : `Up to ${MAX_KEEPSAKES}, shown without prices. The same list for English and German.`}</p>
      <ul className="grid grid-cols-2 gap-2 p-1 sm:grid-cols-3">
        {keepsakes.map((k) => {
          const isChosen = chosen.includes(k.id)
          const disabled = !k.published || (full && !isChosen)

          return (
            <li key={k.id}>
              <button
                aria-pressed={isChosen}
                className="flex w-full flex-col gap-1 rounded-xl text-start outline-none focus-visible:focus-ring disabled:opacity-50"
                disabled={disabled}
                type="button"
                onClick={() => setChosen(c => (c.includes(k.id) ? c.filter(x => x !== k.id) : [...c, k.id]))}
              >
                <span className="relative block">
                  <span className={`block overflow-hidden rounded-xl ${chosenBorder(isChosen)}`}>
                    <Media alt="" className="aspect-square w-full" photo={k.photo || undefined} />
                  </span>
                  {isChosen && <ChosenMark order={chosen.indexOf(k.id) + 1} />}
                </span>
                <span className="line-clamp-2 px-0.5 text-xs">{k.name}</span>
                {!k.published && <span className="px-0.5 text-[11px] text-muted">Not published</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </PickerFrame>
  )
}

/** "More to discover": at most 3, shared by both languages; a story missing the reader's language is hidden (AC33). */
export function RelatedSheet({ selected, onDone, onClose }: { selected: string[], onDone: (ids: string[]) => void, onClose: () => void }) {
  const [chosen, setChosen] = useState(selected)
  const full = chosen.length >= MAX_RELATED

  return (
    <PickerFrame
      doneLabel={`Save ${chosen.length} of ${MAX_RELATED}`}
      title="More to discover"
      onClose={onClose}
      onDone={() => onDone(chosen)}
    >
      <p aria-live="polite" className="text-sm text-muted">{full ? `${MAX_RELATED} chosen, the most. Remove one to add another.` : `Up to ${MAX_RELATED}, the same for English and German. With none, guests see the newest stories.`}</p>
      <ul className="flex flex-col gap-2 p-1">
        {otherStories.map((s) => {
          const isChosen = chosen.includes(s.slug)

          return (
            <li key={s.slug}>
              <button
                aria-pressed={isChosen}
                className={choiceRow}
                disabled={full && !isChosen}
                type="button"
                onClick={() => setChosen(c => (c.includes(s.slug) ? c.filter(x => x !== s.slug) : [...c, s.slug]))}
              >
                <Media alt="" className="size-11 shrink-0 rounded-xl" photo={s.photo} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 text-sm font-medium">{s.title}</span>
                  <span className="text-xs text-muted">{(['en', 'de'] as const).map(l => `${l.toUpperCase()} ${s.versions[l] ? 'published' : 'missing'}`).join(' · ')}</span>
                </span>
                {isChosen && <ChosenMark order={chosen.indexOf(s.slug) + 1} />}
              </button>
            </li>
          )
        })}
      </ul>
    </PickerFrame>
  )
}
