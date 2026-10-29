import type { StepProps } from './step-props'

import { Label, ListBox, Select } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { useStoryOptions } from '../api/queries'
import { Block, Field } from './fields'

const NONE = 'none'

/** Step 5: the optional main story and the one optional outbound link. */
export function StepLinks({ form, patch, errors, storeId }: StepProps) {
  const { t, language } = useLocale()
  const stories = useStoryOptions(storeId)
  const options = stories.data?.items ?? []
  const chosen = options.find(option => option.groupId === form.mainStoryGroupId)
  const titleOf = (title: { en?: string, de?: string }) => title[language] ?? title[language === 'en' ? 'de' : 'en'] ?? t('places.row.untitled')
  // A story that is not published in a language leaves the pin card without a story link in that language.
  const gaps = chosen ? (['en', 'de'] as const).filter(lang => !chosen.publishedLanguages.includes(lang)) : []

  return (
    <div className="flex flex-col gap-6">
      <Block hint={t('places.story.help')} title={t('places.story.label')}>
        {stories.isError
          ? <p className="text-sm text-danger" role="alert">{t('places.story.loadFailed')}</p>
          : (
              <Select fullWidth isDisabled={stories.isPending} selectedKey={form.mainStoryGroupId ?? NONE} onSelectionChange={key => key !== null && patch({ mainStoryGroupId: key === NONE ? null : String(key) })}>
                <Label>{t('places.story.select')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id={NONE} textValue={t('places.story.noneOption')}>
                      {t('places.story.noneOption')}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {options.map((option) => {
                      const label = titleOf(option.title)

                      return (
                        <ListBox.Item key={option.groupId} id={option.groupId} textValue={label}>
                          {label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )
                    })}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
        {!form.mainStoryGroupId && <p className="text-sm text-muted">{t('places.story.empty')}</p>}
        {gaps.map(lang => <p key={lang} className="text-sm text-warning">{t('places.story.gap', { lang: t(`places.lang.${lang}`) })}</p>)}
      </Block>
      <Block hint={t('places.link.help')} title={t('places.link.label')}>
        <Field error={errors.link} inputMode="text" label={t('places.link.label')} maxLength={2000} placeholder="https://" value={form.outboundUrl} onChange={outboundUrl => patch({ outboundUrl })} />
        <p className="text-sm text-warning">{t('places.link.everywhere')}</p>
      </Block>
    </div>
  )
}
