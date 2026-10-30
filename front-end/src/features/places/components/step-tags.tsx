import type { StepProps } from './step-props'
import type { MessageKey } from '@/i18n/en'

import { Description, Label, ListBox, Radio, RadioGroup, Select, Switch } from '@heroui/react'
import { foodKinds, interestCodes, serviceTypes } from '@sk/domain/content'

import { choiceCard } from '@/components/choice-card'
import { AudienceIcon, CategoryIcon, FavouriteIcon, SparkleIcon } from '@/components/icons'
import { MultiSelect } from '@/components/multi-select'
import { useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'
import { Block } from './fields'

const NONE = 'none'
const STAYS = ['short_stay', 'multi_day', 'both'] as const

function Choice<T extends string>({ label, description, value, options, onChange }: { label: string, description: string, value: T | null, options: { id: T, label: string }[], onChange: (value: T | null) => void }) {
  const { t } = useLocale()

  return (
    <Select fullWidth selectedKey={value ?? NONE} onSelectionChange={key => key !== null && onChange(key === NONE ? null : (String(key) as T))}>
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Description>{description}</Description>
      <Select.Popover>
        <ListBox>
          {[{ id: NONE, label: t('places.review.none') }, ...options].map(option => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

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

/** Step 4: map categories, stay tag, the five interests, and what the home reads (service, must-visit, food and drink kind). */
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
      <Block icon={SparkleIcon} title={t('places.home.title')}>
        <Choice description={t('places.service.help')} label={t('places.service.label')} options={serviceTypes.map(id => ({ id, label: t(`places.service.${id}` as MessageKey) }))} value={form.serviceType} onChange={serviceType => patch({ serviceType })} />
        <Choice description={t('places.food.help')} label={t('places.food.label')} options={foodKinds.map(id => ({ id, label: t(`places.food.${id}` as MessageKey) }))} value={form.foodKind} onChange={foodKind => patch({ foodKind })} />
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
    </div>
  )
}
