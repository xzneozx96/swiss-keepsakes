import type { Lang, PlaceForm } from '../lib/form'
import type { StepProps } from './step-props'

import { useState } from 'react'

import { CameraIcon, HeadingIcon } from '@/components/icons'
import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { PhotoOrder } from '@/components/photo-order'
import { useLocale } from '@/contexts/locale-context'
import { LANGS, MAX_PHOTOS, photoIds, withPhotoIds } from '../lib/form'
import { Block, Field } from './fields'
import { PhotoAdd, PhotoState, PhotoThumb } from './photo-field'

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

function PhotosBlock({ form, patch, storeId }: Pick<StepProps, 'form' | 'patch' | 'storeId'>) {
  const { t } = useLocale()
  const ids = photoIds(form)
  const nameOf = (index: number) => t('places.photos.title', { n: index + 1 })

  return (
    <Block hint={t('places.photos.help')} icon={CameraIcon} title={t('places.photos.card')}>
      {ids.length > 0
        ? (
            <PhotoOrder
              items={ids.map((id, index) => ({
                id,
                name: nameOf(index),
                thumbnail: <PhotoThumb mediaId={id} storeId={storeId} />,
                note: <PhotoState mediaId={id} storeId={storeId} />,
              }))}
              labels={{
                list: t('places.photos.list'),
                cover: t('places.photos.cover'),
                move: (name, position, count) => t('places.photos.move', { name, position, count }),
                moved: (name, position, count) => t('places.photos.moved', { name, position, count }),
                remove: name => t('places.photos.remove', { name }),
              }}
              onChange={next => patch(withPhotoIds(next))}
            />
          )
        : <p className="text-sm text-pretty text-muted">{t('places.photos.empty')}</p>}
      {ids.length < MAX_PHOTOS
        ? <PhotoAdd storeId={storeId} onAdd={mediaId => patch(current => withPhotoIds([...photoIds(current), mediaId]))} />
        : <p className="text-sm text-muted">{t('places.photos.limit')}</p>}
    </Block>
  )
}

/** Step 2: the text in both languages, then the photos in one ordered list: the first is the main photo. */
export function StepContent({ form, patch, storeId }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <TextBlock form={form} patch={patch} />
      <PhotosBlock form={form} patch={patch} storeId={storeId} />
    </div>
  )
}
