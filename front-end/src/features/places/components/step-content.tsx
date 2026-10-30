import type { Lang, PhotoEntry, PlaceForm } from '../lib/form'
import type { StepProps } from './step-props'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { ChevronDownIcon, HeadingIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { useLocale } from '@/contexts/locale-context'
import { LANGS } from '../lib/form'
import { Block, Field } from './fields'
import { PhotoPicker } from './photo-field'

const MAX_PHOTOS = 10

function langName(t: ReturnType<typeof useLocale>['t'], lang: 'en' | 'de') {
  return t(`places.lang.${lang}`)
}

type TextState = 'ready' | 'missingTitle' | 'notWritten'

const TEXT_TONE = { ready: 'success', missingTitle: 'warning', notWritten: 'muted' } as const

/** A language is ready with a title (the one thing a publish needs); text without a title is a gap; nothing is not written yet. */
function textState(form: PlaceForm, lang: Lang): TextState {
  const upper = lang === 'en' ? 'En' : 'De'

  if (form[`title${upper}` as 'titleEn'].trim())
    return 'ready'

  return form[`tip${upper}` as 'tipEn'].trim() || form[`localTip${upper}` as 'localTipEn'].trim() ? 'missingTitle' : 'notWritten'
}

/** The shared language switch, each language with its state. */
function PlaceLanguageSwitch({ form, selected, onChange }: { form: PlaceForm, selected: Lang, onChange: (lang: Lang) => void }) {
  const { t } = useLocale()
  const status = (lang: Lang) => {
    const state = textState(form, lang)

    return { text: t(`places.text.state.${state}`), tone: TEXT_TONE[state] }
  }

  return (
    <LanguageVersionSwitch
      label={t('places.lang.switch')}
      languages={LANGS.map(id => ({ id, label: langName(t, id), short: id.toUpperCase() }))}
      selected={selected}
      status={{ en: status('en'), de: status('de') }}
      onChange={onChange}
    />
  )
}

function TextBlock({ form, patch }: Pick<StepProps, 'form' | 'patch'>) {
  const { t, language } = useLocale()
  const [lang, setLang] = useState<Lang>(language)
  const upper = lang === 'en' ? 'En' : 'De'
  const name = langName(t, lang)

  return (
    <Block hint={t('places.text.hint')} icon={HeadingIcon} title={t('places.text.title')}>
      <PlaceLanguageSwitch form={form} selected={lang} onChange={setLang} />
      <Field key={`title-${lang}`} label={t('places.content.title', { lang: name })} lang={lang} maxLength={300} value={form[`title${upper}` as 'titleEn']} onChange={value => patch({ [`title${upper}`]: value })} />
      <Field key={`tip-${lang}`} description={t('places.content.tipHelp')} label={t('places.content.tip', { lang: name })} lang={lang} maxLength={20000} rows={3} value={form[`tip${upper}` as 'tipEn']} onChange={value => patch({ [`tip${upper}`]: value })} />
      <Field key={`local-${lang}`} description={t('places.localTip.help')} label={t('places.localTip.label', { lang: name })} lang={lang} maxLength={300} value={form[`localTip${upper}` as 'localTipEn']} onChange={value => patch({ [`localTip${upper}`]: value })} />
    </Block>
  )
}

function AltFields({ en, de, onChange, label }: { en: string, de: string, onChange: (changes: { en?: string, de?: string }) => void, label: string }) {
  const { t } = useLocale()

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LANGS.map(lang => (
        <Field
          key={lang}
          description={t('places.photo.altHelp')}
          label={`${label} · ${t('places.photo.alt', { lang: langName(t, lang) })}`}
          lang={lang}
          maxLength={300}
          value={lang === 'en' ? en : de}
          onChange={value => onChange({ [lang]: value })}
        />
      ))}
    </div>
  )
}

function MorePhotos({ form, patch, storeId }: Pick<StepProps, 'form' | 'patch' | 'storeId'>) {
  const { t } = useLocale()
  const move = (index: number, to: number) => patch((current) => {
    const photos = [...current.photos]
    const [photo] = photos.splice(index, 1)

    photos.splice(to, 0, photo!)

    return { photos }
  })
  const change = (index: number, changes: Partial<PhotoEntry>) => patch(current => ({ photos: current.photos.map((photo, at) => (at === index ? { ...photo, ...changes } : photo)) }))

  return (
    <Block hint={t('places.photos.help')} title={t('places.photos.label')}>
      <ol className="flex flex-col gap-4">
        {form.photos.map((photo, index) => (
          <li key={photo.mediaId} className="flex flex-col gap-3 rounded-2xl border border-separator p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold">{t('places.photos.title', { n: index + 1 })}</span>
              <div className="flex gap-1">
                <Button isIconOnly aria-label={t('places.photos.up', { n: index + 1 })} isDisabled={index === 0} size="sm" variant="tertiary" onPress={() => move(index, index - 1)}>
                  <ChevronDownIcon aria-hidden className="rotate-180" size={16} />
                </Button>
                <Button isIconOnly aria-label={t('places.photos.down', { n: index + 1 })} isDisabled={index === form.photos.length - 1} size="sm" variant="tertiary" onPress={() => move(index, index + 1)}>
                  <ChevronDownIcon aria-hidden size={16} />
                </Button>
                <Button isIconOnly aria-label={t('places.photos.remove', { n: index + 1 })} size="sm" variant="tertiary" onPress={() => patch(current => ({ photos: current.photos.filter((_, at) => at !== index) }))}>
                  <TrashIcon aria-hidden size={16} />
                </Button>
              </div>
            </div>
            <PhotoPicker alt={photo.altEn || photo.altDe} chooseLabel="places.photo.choose" mediaId={photo.mediaId} storeId={storeId} onChange={mediaId => change(index, { mediaId })} />
            <AltFields de={photo.altDe} en={photo.altEn} label={t('places.photos.title', { n: index + 1 })} onChange={changes => change(index, { ...(changes.en === undefined ? {} : { altEn: changes.en }), ...(changes.de === undefined ? {} : { altDe: changes.de }) })} />
          </li>
        ))}
      </ol>
      {form.photos.length < MAX_PHOTOS
        ? <PhotoAdder storeId={storeId} onAdd={mediaId => patch(current => ({ photos: [...current.photos, { mediaId, altEn: '', altDe: '' }] }))} />
        : <p className="text-sm text-muted">{t('places.photos.limit')}</p>}
    </Block>
  )
}

function PhotoAdder({ storeId, onAdd }: { storeId: string, onAdd: (mediaId: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <PlusIcon aria-hidden className="shrink-0 text-muted" size={16} />
      <PhotoPicker alt="" chooseLabel="places.photos.add" mediaId={null} storeId={storeId} onChange={onAdd} />
    </div>
  )
}

/** Step 2: the text in both languages, the main photo with its description, and more photos in order. */
export function StepContent({ form, patch, storeId }: StepProps) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-6">
      <TextBlock form={form} patch={patch} />
      <Block hint={t('places.photo.help')} title={t('places.photo.label')}>
        <PhotoPicker
          alt={form.coverAltEn || form.coverAltDe}
          chooseLabel="places.photo.choose"
          mediaId={form.coverMediaId}
          storeId={storeId}
          onChange={coverMediaId => patch({ coverMediaId })}
          onRemove={() => patch({ coverMediaId: null, coverAltEn: '', coverAltDe: '' })}
        />
        {form.coverMediaId && (
          <AltFields de={form.coverAltDe} en={form.coverAltEn} label={t('places.photo.label')} onChange={changes => patch({ ...(changes.en === undefined ? {} : { coverAltEn: changes.en }), ...(changes.de === undefined ? {} : { coverAltDe: changes.de }) })} />
        )}
      </Block>
      <MorePhotos form={form} patch={patch} storeId={storeId} />
    </div>
  )
}
