import type { StepProps } from './step-props'
import type { MessageKey } from '@/i18n/en'

import { Checkbox, CheckboxGroup, Label, ListBox, Radio, RadioGroup, Select, Switch } from '@heroui/react'
import { foodKinds, interestCodes, serviceTypes } from '@sk/domain/content'

import { useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'
import { Block, choiceCard } from './fields'

const NONE = 'none'
const STAYS = ['short_stay', 'multi_day', 'both'] as const

function Choice<T extends string>({ label, value, options, onChange }: { label: string, value: T | null, options: { id: T, label: string }[], onChange: (value: T | null) => void }) {
  const { t } = useLocale()

  return (
    <Select fullWidth selectedKey={value ?? NONE} onSelectionChange={key => key !== null && onChange(key === NONE ? null : (String(key) as T))}>
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
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

function Check({ value, label, hint }: { value: string, label: string, hint?: string }) {
  return (
    <Checkbox className={choiceCard} value={value}>
      <Checkbox.Content className="w-full flex-row items-center gap-3">
        <Checkbox.Control className="size-6 shrink-0 rounded-lg">
          <Checkbox.Indicator className="size-4 [&_[data-slot$=checkmark]]:size-4" />
        </Checkbox.Control>
        <span className="flex flex-1 flex-col">
          <span className="font-medium">{label}</span>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </span>
      </Checkbox.Content>
    </Checkbox>
  )
}

function MapCategories({ form, patch, storeId }: Pick<StepProps, 'form' | 'patch' | 'storeId'>) {
  const { t, language } = useLocale()
  const categories = useCategories(storeId, 'map')
  const items = categories.data?.items ?? []
  const name = (item: { name: { en?: string | null, de?: string | null } }) => item.name[language] ?? item.name[language === 'en' ? 'de' : 'en'] ?? ''

  return (
    <Block hint={t('places.categories.help')} title={t('places.categories.label')}>
      <CheckboxGroup className="gap-2" value={form.categoryIds} onChange={categoryIds => patch({ categoryIds })}>
        <Label className="sr-only">{t('places.categories.label')}</Label>
        {items.map((item) => {
          const parent = item.parentId ? items.find(other => other.id === item.parentId) : undefined

          return (
            <div key={item.id} className={parent ? 'ms-6' : undefined}>
              <Check hint={parent ? t('places.categories.under', { parent: name(parent) }) : undefined} label={name(item)} value={item.id} />
            </div>
          )
        })}
      </CheckboxGroup>
      <p className="text-sm text-muted">{t('places.categories.manage')}</p>
    </Block>
  )
}

/** Step 4: map categories, stay tag, the five interests, and what the home reads (service, must-visit, food and drink kind). */
export function StepTags({ form, patch, storeId }: StepProps) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-6">
      <MapCategories form={form} patch={patch} storeId={storeId} />
      <Block hint={t('places.stay.help')} title={t('places.stay.label')}>
        <RadioGroup aria-label={t('places.stay.label')} value={form.stayTag} onChange={stayTag => patch({ stayTag: stayTag as typeof form.stayTag })}>
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
      <Block hint={t('places.interests.help')} title={t('places.interests.label')}>
        <CheckboxGroup className="gap-2" value={form.interests} onChange={interests => patch({ interests })}>
          <Label className="sr-only">{t('places.interests.label')}</Label>
          {interestCodes.map(code => <Check key={code} label={t(`places.interest.${code}`)} value={code} />)}
        </CheckboxGroup>
      </Block>
      <Block hint={t('places.service.help')} title={t('places.service.label')}>
        <Choice label={t('places.service.label')} options={serviceTypes.map(id => ({ id, label: t(`places.service.${id}` as MessageKey) }))} value={form.serviceType} onChange={serviceType => patch({ serviceType })} />
        <Choice label={t('places.food.label')} options={foodKinds.map(id => ({ id, label: t(`places.food.${id}` as MessageKey) }))} value={form.foodKind} onChange={foodKind => patch({ foodKind })} />
        <p className="text-sm text-muted">{t('places.food.help')}</p>
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
