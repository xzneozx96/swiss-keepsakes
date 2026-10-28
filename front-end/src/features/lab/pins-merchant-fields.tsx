import type { Key } from '@heroui/react'
import type { Interest, StayTag } from './pins-merchant-data'
import type { PinEditor } from './pins-merchant-editor-state'
import type { Language } from '@/contexts/locale-context'

import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Radio,
  RadioGroup,
  SearchField,
  Tag,
  TagGroup,
  TextArea,
  TextField,
} from '@heroui/react'
import { useState } from 'react'

import {
  InfoIcon,
  LinkIcon,
  SelectedIcon,
  StatusDangerIcon,
  StatusSuccessIcon,
  StatusWarningIcon,
  TrashIcon,
} from '@/components/icons'
import { InfoNote } from '@/components/info-note'
import { Media } from '@/components/media'
import { SheetFrame } from '@/components/sheet-frame'
import { PhotoSheet } from '@/features/content/merchant/components/media-sheets'
import { useCopy } from './pins-merchant-copy'
import {
  categoryName,
  completeness,
  INTERESTS,
  linkParts,
  mapCategories,
  STAY_TAGS,
  stories,
  suggestSlug,
} from './pins-merchant-data'
import { MapPickerCanvas } from './pins-merchant-map-picker'

/** Same choice card as the story editor (M08, M15, M17): ink frame when selected. */
export const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'

/** The app's selected option (C03 variant tiles): red border, normal fill, check on the top edge. */
const accentTag
  = 'group relative h-auto min-h-11 items-center justify-start rounded-2xl border-2 border-transparent px-3 py-2 before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover'

function TagCheck() {
  return (
    <SelectedIcon
      aria-hidden
      className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block"
      weight="Filled"
    />
  )
}

const OTHER: Record<Language, Language> = { en: 'de', de: 'en' }

function keysOf(keys: 'all' | Set<Key>) {
  return keys === 'all' ? [] : Array.from(keys, String)
}

/** A labelled text field with its description and its error under it. */
export function TextInput({ label, value, onChange, description, error, rows, lang, inputMode, placeholder, className, type }: {
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
  error?: string
  rows?: number
  lang?: Language
  inputMode?: 'numeric' | 'url'
  placeholder?: string
  className?: string
  type?: 'text' | 'date' | 'url'
}) {
  return (
    <TextField className={className} fullWidth isInvalid={!!error} value={value} onChange={onChange}>
      <Label>{label}</Label>
      {rows
        ? <TextArea lang={lang} rows={rows} />
        : <Input inputMode={inputMode} lang={lang} placeholder={placeholder} type={type} />}
      {description && <Description>{description}</Description>}
      <FieldError>{error ?? ''}</FieldError>
    </TextField>
  )
}

/** A small "Optional" or "Needed to publish" mark after a field group's title. */
export function Need({ required }: { required?: boolean }) {
  const { c } = useCopy()

  return (
    <span className={`rounded-full px-2 text-xs leading-5 font-medium ${required ? 'bg-accent-soft text-accent-soft-foreground' : 'bg-default text-muted'}`}>
      {c(required ? 'editor.required' : 'editor.optional')}
    </span>
  )
}

/**
 * The coordinates picker: the guest map's own aerial style with one marker, so the pin lands
 * where guests will see it. A tap places the pin, the marker drags, the arrow keys nudge it.
 */
function MapPicker({ editor }: { editor: PinEditor }) {
  const { c } = useCopy()
  const { pin } = editor
  const placed = pin.lat !== null && pin.lng !== null
  const missing = editor.attempt && !editor.checks.location

  return (
    <div className="flex flex-col gap-2" data-error={missing ? true : undefined}>
      <span className={`text-sm font-medium ${missing ? 'text-danger' : ''}`} id="pin-map-label">{c('map.label')}</span>
      <div className={`relative aspect-[4/3] w-full cursor-crosshair overflow-hidden rounded-2xl bg-default ${missing ? 'ring-2 ring-danger' : ''}`}>
        <MapPickerCanvas
          describedBy="pin-map-help"
          lat={pin.lat}
          lng={pin.lng}
          markerLabel={c('map.marker')}
          onPlace={editor.patch}
        />
        {!placed && (
          <span className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-full bg-surface/90 px-3 py-1.5 text-sm font-medium shadow-surface">
            {c('map.empty')}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="text-muted" id="pin-map-help">{c('map.help')}</span>
        <span className="tabular-nums">{placed ? `${pin.lat?.toFixed(5)}, ${pin.lng?.toFixed(5)}` : c('map.notSet')}</span>
      </div>
      {missing && (
        <p className="flex items-start gap-1.5 text-sm text-danger">
          <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {c('checklist.location.item')}
        </p>
      )}
    </div>
  )
}

/** Location: the map picker, the map link (slug) and the optional address. */
export function LocationFields({ editor }: { editor: PinEditor }) {
  const { c, language } = useCopy()
  const { pin, errors } = editor
  const suggestion = suggestSlug(pin)
  const owner = editor.slugOwner
  const slugError = errors.slug
    ? c(`error.${errors.slug}`, { name: owner ? owner.title[language] || owner.title.en || owner.title.de : '' })
    : editor.attempt && !pin.slug ? c('checklist.slug.item') : undefined
  const isLive = editor.stored.firstPublished !== null

  return (
    <>
      <MapPicker editor={editor} />
      <div className="flex flex-col gap-2">
        <TextInput
          description={c('slug.help', { slug: pin.slug || '…' })}
          error={slugError}
          label={c('slug.label')}
          value={pin.slug}
          onChange={editor.setSlug}
        />
        {!editor.slugTouched && pin.slug && <p className="text-xs text-muted">{c('slug.suggested')}</p>}
        {editor.slugTouched && suggestion && suggestion !== pin.slug && !isLive && (
          <Button className="self-start" size="sm" variant="tertiary" onPress={() => editor.patch({ slug: suggestion })}>
            {c('slug.useSuggestion', { slug: suggestion })}
          </Button>
        )}
        {isLive && pin.slug !== editor.stored.slug && (
          <p className="flex items-start gap-1.5 text-sm text-warning">
            <StatusWarningIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            {c('slug.published')}
          </p>
        )}
      </div>
      <TextInput
        description={c('address.help')}
        label={c('address.label')}
        value={pin.address}
        onChange={address => editor.patch({ address })}
      />
    </>
  )
}

/** EN or DE, each card saying how much of that language is filled (the M17 language cards). */
export function LanguageSwitch({ editor, value, onChange }: {
  editor: PinEditor
  value: Language
  onChange: (language: Language) => void
}) {
  const { c } = useCopy()

  return (
    <RadioGroup value={value} onChange={v => onChange(v as Language)}>
      <Label>{c('content.language')}</Label>
      <div className="grid grid-cols-2 gap-2">
        {(['en', 'de'] as const).map((l) => {
          const { done, total } = completeness(editor.pin, l)
          const isComplete = done === total

          return (
            <Radio key={l} className={choiceCard} value={l}>
              <Radio.Content className="w-full">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{c(`lang.${l}`)}</span>
                  <span className={`flex items-center gap-1 text-xs ${isComplete ? 'text-success' : 'text-muted'}`}>
                    {isComplete && <StatusSuccessIcon aria-hidden className="shrink-0" size={14} />}
                    {isComplete ? c('content.complete') : c('content.progress', { done, total })}
                  </span>
                </span>
              </Radio.Content>
            </Radio>
          )
        })}
      </div>
    </RadioGroup>
  )
}

/** Title and tip in one language, then the shared photo with this language's description. */
export function ContentFields({ editor, language, onLanguage, inTabs = false }: {
  editor: PinEditor
  language: Language
  onLanguage: (language: Language) => void
  /** Inside the stepper's EN | DE tabs (the tour editor's pattern): no switch, no fallback note. */
  inTabs?: boolean
}) {
  const { c } = useCopy()
  const { pin } = editor
  const [photoOpen, setPhotoOpen] = useState(false)
  const langName = c(`lang.${language}`)
  const other = OTHER[language]
  const titleMissing = editor.attempt && !editor.checks.title

  return (
    <>
      {!inTabs && <LanguageSwitch editor={editor} value={language} onChange={onLanguage} />}
      {!inTabs && !pin.title[language].trim() && pin.title[other].trim() && (
        <InfoNote text={c('content.fallback', { lang: langName, other: c(`lang.${other}`) })} />
      )}
      <TextInput
        error={titleMissing ? c('checklist.title.item') : undefined}
        label={c('content.title', { lang: langName })}
        lang={language}
        value={pin.title[language]}
        onChange={value => editor.patch({ title: { ...pin.title, [language]: value } })}
      />
      <TextInput
        description={c('content.tipHelp')}
        label={c('content.tip', { lang: langName })}
        lang={language}
        rows={3}
        value={pin.tip[language]}
        onChange={value => editor.patch({ tip: { ...pin.tip, [language]: value } })}
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{c('photo.label')}</span>
        <div className="flex items-center gap-3">
          <Media alt="" className="aspect-[4/3] w-28 shrink-0 rounded-xl" photo={pin.photo || undefined} />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <span className="text-sm text-muted">{pin.photo ? `${pin.photo}.jpg · ${c('photo.help')}` : c('photo.none')}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="tertiary" onPress={() => setPhotoOpen(true)}>
                {c(pin.photo ? 'photo.change' : 'photo.choose')}
              </Button>
              {pin.photo && (
                <Button isIconOnly aria-label={c('photo.remove')} size="sm" variant="tertiary" onPress={() => editor.patch({ photo: '' })}>
                  <TrashIcon aria-hidden size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {pin.photo && (
        <TextInput
          description={c('photo.altHelp')}
          label={c('photo.alt', { lang: langName })}
          lang={language}
          value={pin.alt[language]}
          onChange={value => editor.patch({ alt: { ...pin.alt, [language]: value } })}
        />
      )}
      {photoOpen && (
        <PhotoSheet
          value={pin.photo}
          onChoose={(photo) => {
            editor.patch({ photo })
            setPhotoOpen(false)
          }}
          onClose={() => setPhotoOpen(false)}
        />
      )}
    </>
  )
}

/** Map categories (one level of sub-categories), the stay tag and the four fixed interests. */
export function TagFields({ editor }: { editor: PinEditor }) {
  const { c, language } = useCopy()
  const { pin } = editor
  const parents = mapCategories.filter(m => !m.parentId)

  return (
    <>
      <TagGroup
        selectedKeys={new Set(pin.categories)}
        selectionMode="multiple"
        size="lg"
        onSelectionChange={keys => editor.patch({ categories: keysOf(keys) })}
      >
        <Label>{c('categories.label')}</Label>
        <Description>{c('categories.help')}</Description>
        <TagGroup.List className="flex flex-col gap-2 pt-2">
          {parents.flatMap((parent) => {
            const children = mapCategories.filter(m => m.parentId === parent.id)

            return [parent, ...children].map(m => (
              <Tag
                key={m.id}
                className={`${accentTag} ${m.parentId ? 'ms-6 w-[calc(100%-1.5rem)]' : 'w-full'}`}
                id={m.id}
                textValue={categoryName(m, language)}
              >
                <span className="flex min-w-0 flex-1 flex-col items-start leading-5">
                  <span className="font-medium">
                    {m.parentId && <span aria-hidden className="me-1 text-muted">↳</span>}
                    {categoryName(m, language)}
                  </span>
                  {language === 'de' && !m.name.de && (
                    <span className="text-xs text-muted">{c('categories.noGerman')}</span>
                  )}
                  {m.parentId && <span className="sr-only">{c('categories.under', { parent: categoryName(parent, language) })}</span>}
                </span>
                <TagCheck />
              </Tag>
            ))
          })}
        </TagGroup.List>
        <Description>{c('categories.manage')}</Description>
      </TagGroup>

      <RadioGroup value={pin.stay} onChange={v => editor.patch({ stay: v as StayTag })}>
        <Label>{c('stay.label')}</Label>
        <Description>{c('stay.help')}</Description>
        <div className="grid gap-2 sm:grid-cols-3">
          {STAY_TAGS.map(tag => (
            <Radio key={tag} className={choiceCard} value={tag}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <span className="flex flex-col">
                  <span className="font-medium">{c(`stay.${tag}`)}</span>
                  <span className="text-xs text-muted">{c(`stay.${tag}.hint`)}</span>
                </span>
              </Radio.Content>
            </Radio>
          ))}
        </div>
      </RadioGroup>

      <TagGroup
        selectedKeys={new Set(pin.interests)}
        selectionMode="multiple"
        size="lg"
        onSelectionChange={keys => editor.patch({ interests: keysOf(keys) as Interest[] })}
      >
        <Label>{c('interests.label')}</Label>
        <Description>{c('interests.help')}</Description>
        <TagGroup.List className="grid grid-cols-2 gap-2 pt-2">
          {INTERESTS.map(interest => (
            <Tag key={interest} className={accentTag} id={interest} textValue={c(`interest.${interest}`)}>
              <span className="font-medium">{c(`interest.${interest}`)}</span>
              <TagCheck />
            </Tag>
          ))}
        </TagGroup.List>
      </TagGroup>
    </>
  )
}

/** The language versions of a story as small chips: published, draft or missing. */
/** Which language versions are published, as one quiet line with a green dot per published one. */
function StoryVersions({ storyId }: { storyId: string }) {
  const { c } = useCopy()
  const story = stories.find(s => s.id === storyId)

  if (!story)
    return null

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
      {(['en', 'de'] as const).map((l) => {
        const state = story.versions[l]

        return (
          <span key={l} className={`flex items-center gap-1.5 ${state === 'published' ? 'text-success' : ''}`}>
            <span aria-hidden className={`size-1.5 rounded-full ${state === 'published' ? 'bg-success' : 'bg-muted/60'}`} />
            {c(`story.${state}`, { lang: l.toUpperCase() })}
          </span>
        )
      })}
    </span>
  )
}

/** A story as a row: its cover, its title on up to two lines, and its language versions. */
function StoryRow({ storyId }: { storyId: string }) {
  const { c, language } = useCopy()
  const story = stories.find(s => s.id === storyId)

  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Media alt="" className="size-14 shrink-0 rounded-xl" photo={story?.photo} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-sm font-medium">{storyTitle(storyId, language, c('story.untitled'))}</span>
        <StoryVersions storyId={storyId} />
      </span>
    </span>
  )
}

function storyTitle(storyId: string, language: Language, untitled: string) {
  const story = stories.find(s => s.id === storyId)

  return story ? story.title[language] || story.title[OTHER[language]] || untitled : untitled
}

/** Search the shop's stories and pick one; each row says which languages are published. */
function StorySheet({ value, onChoose, onClose }: {
  value: string | null
  onChoose: (id: string) => void
  onClose: () => void
}) {
  const { c } = useCopy()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(value ?? '')
  const needle = query.trim().toLowerCase()
  const found = stories.filter(s => !needle || `${s.title.en} ${s.title.de}`.toLowerCase().includes(needle))

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth isDisabled={!selected} onPress={() => onChoose(selected)}>{c('story.use')}</Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>{c('sheet.back')}</Button>
        </>
      )}
      title={c('story.sheet')}
      onClose={onClose}
    >
      <SearchField aria-label={c('story.search')} value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-full" placeholder={c('story.search')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {found.length
        ? (
            <RadioGroup className="gap-0" value={selected} onChange={setSelected}>
              <Label className="sr-only">{c('story.sheet')}</Label>
              {found.map(s => (
                <Radio key={s.id} className="border-b border-separator py-2.5 last:border-b-0" value={s.id}>
                  <Radio.Content className="w-full flex-row items-center gap-3">
                    <StoryRow storyId={s.id} />
                    <Radio.Control className="shrink-0">
                      <Radio.Indicator />
                    </Radio.Control>
                  </Radio.Content>
                </Radio>
              ))}
            </RadioGroup>
          )
        : <p className="text-sm text-muted">{c('story.noMatch')}</p>}
    </SheetFrame>
  )
}

/** The optional main story and the optional outbound link. */
export function LinkFields({ editor }: { editor: PinEditor }) {
  const { c } = useCopy()
  const { pin, errors } = editor
  const [sheetOpen, setSheetOpen] = useState(false)
  const story = stories.find(s => s.id === pin.storyId)
  const gaps = story ? (['en', 'de'] as const).filter(l => story.versions[l] !== 'published') : []
  const parts = !errors.link && pin.link ? linkParts(pin.link) : undefined

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{c('story.label')}</span>
        <p className="text-sm text-muted">{c('story.help')}</p>
        {story
          ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-separator p-3">
                <StoryRow storyId={story.id} />
                {gaps.map(l => (
                  <p key={l} className="flex items-start gap-1.5 text-sm text-warning">
                    <StatusWarningIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
                    {c('story.gap', { lang: c(`lang.${l}`) })}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="tertiary" onPress={() => setSheetOpen(true)}>{c('story.change')}</Button>
                  <Button size="sm" variant="tertiary" onPress={() => editor.patch({ storyId: null })}>{c('story.remove')}</Button>
                </div>
              </div>
            )
          : (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm">{c('story.empty')}</p>
                <Button size="sm" variant="tertiary" onPress={() => setSheetOpen(true)}>{c('story.choose')}</Button>
              </div>
            )}
      </div>
      <div className="flex flex-col gap-2">
        <TextInput
          description={c('link.help')}
          error={errors.link ? c(`error.${errors.link}`) : undefined}
          inputMode="url"
          label={c('link.label')}
          placeholder="https://"
          type="url"
          value={pin.link}
          onChange={link => editor.patch({ link })}
        />
        {parts && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-secondary p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-muted">
              <LinkIcon aria-hidden size={18} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{parts.host}</span>
              <span className="truncate text-xs text-muted">{parts.path || '/'}</span>
            </span>
          </div>
        )}
        {pin.link && (
          <p className="flex items-start gap-1.5 text-sm text-muted">
            <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            {c('link.everywhere')}
          </p>
        )}
      </div>
      {sheetOpen && (
        <StorySheet
          value={pin.storyId}
          onChoose={(storyId) => {
            editor.patch({ storyId })
            setSheetOpen(false)
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
