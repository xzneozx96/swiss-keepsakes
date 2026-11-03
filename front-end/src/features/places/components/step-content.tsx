import type { Lang, PlaceForm } from '../lib/form'
import type { StepProps } from './step-props'

import { useState } from 'react'

import { Block } from '@/components/form-block'
import { CameraIcon, HeadingIcon } from '@/components/icons'
import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { useLocale } from '@/contexts/locale-context'
import { PhotosField } from '@/features/media/components/photos-field'
import { LANGS, MAX_PHOTOS, photoIds, withPhotoIds } from '../lib/form'
import { Field } from './fields'

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

  return form[`tip${upper}` as 'tipEn'].trim() ? 'missingTitle' : 'notWritten'
}

/** The shared language switch, each language with its state. */
export function PlaceLanguageSwitch({ form, selected, onChange }: { form: PlaceForm, selected: Lang, onChange: (lang: Lang) => void }) {
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
      <Field key={`tip-${lang}`} description={t('places.content.tipHelp')} label={t('places.content.tip')} lang={lang} maxLength={20000} rows={3} value={form[`tip${upper}` as 'tipEn']} onChange={value => patch({ [`tip${upper}`]: value })} />
    </Block>
  )
}

function PhotosBlock({ form, patch, storeId }: Pick<StepProps, 'form' | 'patch' | 'storeId'>) {
  const { t } = useLocale()

  return (
    <Block hint={t('places.photos.help')} icon={CameraIcon} title={t('places.photos.card')}>
      <PhotosField
        ids={photoIds(form)}
        max={MAX_PHOTOS}
        storeId={storeId}
        onAdd={mediaId => patch(current => withPhotoIds([...photoIds(current), mediaId]))}
        onChange={next => patch(withPhotoIds(next))}
      />
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
