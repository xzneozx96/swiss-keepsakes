import type { PinStoryOption } from '@sk/api-contract'
import type { StepProps } from './step-props'

import { Block } from '@/components/form-block'
import { SearchableSelect } from '@/components/searchable-select'
import { useLocale } from '@/contexts/locale-context'
import { useStoryOptions } from '../api/queries'
import { Field } from './fields'

const LANGUAGES = ['en', 'de'] as const

/** A story shows in the picker once a language is live. The linked one stays, so the field never loses its value. */
const isLive = (option: PinStoryOption) => option.publishedLanguages.length > 0

/** Step 5: the optional main story and the one optional outbound link. */
export function StepLinks({ form, patch, errors, storeId }: StepProps) {
  const { t, language } = useLocale()
  const stories = useStoryOptions(storeId)
  const chosen = stories.data?.items.find(option => option.groupId === form.mainStoryGroupId)
  const titleOf = (title: { en?: string, de?: string }) => title[language] ?? title[language === 'en' ? 'de' : 'en'] ?? t('places.row.untitled')
  const options = (stories.data?.items ?? [])
    .filter(option => isLive(option) || option.groupId === form.mainStoryGroupId)
    .map(option => ({ id: option.groupId, label: isLive(option) ? titleOf(option.title) : `${titleOf(option.title)} (${t('places.story.notPublished')})` }))
  // A language without a live version leaves the pin card without a story link in that language.
  const gaps = chosen ? LANGUAGES.filter(lang => chosen.languages[lang] !== 'published') : []

  return (
    <div className="flex flex-col gap-6">
      <Block>
        {stories.isError
          ? <p className="text-sm text-danger" role="alert">{t('places.story.loadFailed')}</p>
          : (
              <SearchableSelect
                description={t('places.story.help')}
                isDisabled={stories.isPending}
                label={t('places.story.select')}
                noneLabel={t('places.story.noneOption')}
                options={options}
                value={form.mainStoryGroupId}
                onChange={mainStoryGroupId => patch({ mainStoryGroupId })}
              />
            )}
        {chosen && gaps.map(lang => (
          <p key={lang} className="text-sm text-warning">
            {t(`places.story.${chosen.languages[lang] === 'draft' ? 'draftVersion' : 'noVersion'}.${lang}`)}
          </p>
        ))}
      </Block>
      <Block>
        <Field description={t('places.link.help')} error={errors.link} inputMode="text" label={t('places.link.label')} maxLength={2000} placeholder="https://" value={form.outboundUrl} onChange={outboundUrl => patch({ outboundUrl })} />
      </Block>
    </div>
  )
}
