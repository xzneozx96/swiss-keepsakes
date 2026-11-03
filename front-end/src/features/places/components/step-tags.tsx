import type { StepProps } from './step-props'

import { Label, Radio, RadioGroup, Switch } from '@heroui/react'
import { interestCodes } from '@sk/domain/content'

import { choiceCard } from '@/components/choice-card'
import { Block } from '@/components/form-block'
import { AudienceIcon, CategoryIcon, FavouriteIcon } from '@/components/icons'
import { MultiSelect } from '@/components/multi-select'
import { useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'

const STAYS = ['short_stay', 'multi_day', 'both'] as const

function MapCategories({ form, patch, storeId }: Pick<StepProps, 'form' | 'patch' | 'storeId'>) {
  const { t, language } = useLocale()
  const categories = useCategories(storeId, 'map')
  const name = (item: { name: { en?: string | null, de?: string | null } }) => item.name[language] ?? item.name[language === 'en' ? 'de' : 'en'] ?? ''
  const options = (categories.data?.items ?? []).map(item => ({ id: item.id, label: name(item), parentId: item.parentId }))

  return (
    <Block hint={`${t('places.categories.help')} ${t('places.categories.manage')}`} icon={CategoryIcon} title={t('places.categories.label')}>
      <MultiSelect
        hideLabel
        label={t('places.categories.label')}
        options={options}
        value={form.categoryIds}
        onChange={categoryIds => patch({ categoryIds })}
      />
    </Block>
  )
}

/** Step 4: map categories, who the place is recommended for (stay tag and must-visit), and the five interests. */
export function StepTags({ form, patch, storeId }: StepProps) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-6">
      <MapCategories form={form} patch={patch} storeId={storeId} />
      <Block hint={t('places.stay.help')} icon={AudienceIcon} title={t('places.stay.label')}>
        <RadioGroup value={form.stayTag} onChange={stayTag => patch({ stayTag: stayTag as typeof form.stayTag })}>
          <Label className="sr-only">{t('places.stay.label')}</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {STAYS.map(id => (
              <Radio key={id} className={choiceCard} value={id}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <span className="flex flex-col">
                    <span className="font-medium">{t(`places.stay.${id}`)}</span>
                    <span className="text-xs text-muted">{t(`places.stay.${id}.hint`)}</span>
                  </span>
                </Radio.Content>
              </Radio>
            ))}
          </div>
        </RadioGroup>
        <Switch isSelected={form.mustVisit} onChange={mustVisit => patch({ mustVisit })}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <span className="flex flex-col">
              <Label>{t('places.mustVisit.label')}</Label>
              <span className="text-xs text-muted">{t('places.mustVisit.help')}</span>
            </span>
          </Switch.Content>
        </Switch>
      </Block>
      <Block hint={t('places.interests.help')} icon={FavouriteIcon} title={t('places.interests.label')}>
        <MultiSelect
          hideLabel
          label={t('places.interests.label')}
          options={interestCodes.map(code => ({ id: code, label: t(`places.interest.${code}`) }))}
          value={form.interests}
          onChange={interests => patch({ interests })}
        />
      </Block>
    </div>
  )
}
