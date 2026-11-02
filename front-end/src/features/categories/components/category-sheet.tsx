import type { CategoryIcon, CategoryKind, MerchantCategory } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { Button, Description, Form, Input, Label, ListBox, Radio, RadioGroup, Select, Switch, TextField } from '@heroui/react'
import { useId, useState } from 'react'

import { choiceCard } from '@/components/choice-card'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { categoryIconComponents, categoryIconKeys, iconLabelKey } from '../lib/category-icons'
import { problemTypeToMessageKey } from '../lib/category-problems'
import { nameOf } from '../lib/category-tree'

const ROOT = 'root'
const NO_ICON = 'none'

/**
 * The add and edit sheet. The parent list holds the top-level categories only, never the category itself,
 * and a category with sub-categories gets no parent field because the API refuses to nest it. It closes on
 * success, so a refusal keeps what was typed and the key of the attempt.
 */
export function CategorySheet({ storeId, kind, category, parentId: initialParent, roots, onClose }: {
  storeId: string
  kind: CategoryKind
  /** The category to edit, or none to add one. */
  category: MerchantCategory | undefined
  /** The parent to preselect: the category's own, or the one "Add sub-category" came from. */
  parentId: string | null
  /** The top-level categories of the list. */
  roots: MerchantCategory[]
  onClose: () => void
}) {
  const { t } = useLocale()
  const title = category ? t('categories.sheet.editTitle', { name: nameOf(category) }) : t(initialParent ? 'categories.sheet.addSubTitle' : 'categories.sheet.addTitle')
  const formId = useId()
  const [nameEn, setNameEn] = useState(category?.name.en ?? '')
  const [nameDe, setNameDe] = useState(category?.name.de ?? '')
  const [parent, setParent] = useState(initialParent ?? ROOT)
  const [icon, setIcon] = useState<CategoryIcon | null>(category?.icon ?? null)
  const [showOnHome, setShowOnHome] = useState(category?.showOnHome ?? false)
  const [nameMissing, setNameMissing] = useState(false)
  // Both show their refusal inline (failureKey below), so the cache stays silent on error.
  const create = useSubmit('categories', 'create', { meta: { success: () => t('categories.toast.added'), silent: true } })
  const save = useSubmit('categories', 'save', { meta: { success: () => t('categories.toast.saved'), silent: true } })
  const { isPending, error, reset } = category ? save : create
  const fixedAtTop = category !== undefined && category.childCount > 0
  const name = {
    ...(nameEn.trim() === '' ? {} : { en: nameEn.trim() }),
    ...(nameDe.trim() === '' ? {} : { de: nameDe.trim() }),
  }
  const parentId = parent === ROOT ? null : parent
  const key = useIdempotencyKey({ storeId, kind, id: category?.id, name, parentId, icon, showOnHome })
  const failure = error instanceof ApiProblem ? error : undefined
  const failureKey: MessageKey | undefined = error ? (failure ? problemTypeToMessageKey(failure.type) : 'categories.problem.generic') : undefined
  const parents = roots.filter(root => root.id !== category?.id)

  const submit = () => {
    if (!name.en && !name.de) {
      setNameMissing(true)

      return
    }
    const callbacks = {
      onSuccess: () => {
        key.settled()
        onClose()
      },
      onError: (failed: Error) => key.settled(failed),
    }

    if (category) {
      save.submit({
        storeId,
        kind,
        id: category.id,
        name,
        ...(fixedAtTop || parentId === category.parentId ? {} : { parentId }),
        ...(kind === 'map' && icon !== category.icon ? { icon } : {}),
        ...(kind === 'map' && showOnHome !== category.showOnHome ? { showOnHome } : {}),
        idempotencyKey: key.next(),
      }, callbacks)
    }
    else {
      create.submit({ storeId, kind, name, ...(parentId === null ? {} : { parentId }), ...(kind === 'map' && icon !== null ? { icon } : {}), ...(kind === 'map' && showOnHome ? { showOnHome } : {}), idempotencyKey: key.next() }, callbacks)
    }
  }

  const field = (label: MessageKey, lang: 'en' | 'de', value: string, set: (value: string) => void) => (
    <TextField
      fullWidth
      isInvalid={nameMissing}
      maxLength={300}
      value={value}
      onChange={(next) => {
        set(next)
        setNameMissing(false)
        reset()
      }}
    >
      <Label>{t(label)}</Label>
      <Input lang={lang} />
    </TextField>
  )

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" form={formId} isPending={isPending} type="submit">
            {t(category ? 'categories.sheet.save' : 'categories.sheet.create')}
          </Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={onClose}>
            {t('categories.sheet.cancel')}
          </Button>
        </>
      )}
      title={title}
      onClose={onClose}
    >
      <Form
        className="flex flex-col gap-4"
        id={formId}
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {field('categories.sheet.nameEn', 'en', nameEn, setNameEn)}
        {field('categories.sheet.nameDe', 'de', nameDe, setNameDe)}
        <p className={`-mt-2 text-xs ${nameMissing ? 'text-danger' : 'text-muted'}`} role={nameMissing ? 'alert' : undefined}>
          {t(nameMissing ? 'categories.problem.name' : 'categories.sheet.nameHint')}
        </p>
        {fixedAtTop
          ? <p className="text-sm text-pretty text-muted">{t('categories.sheet.hasChildren')}</p>
          : (
              <Select
                fullWidth
                selectedKey={parent}
                onSelectionChange={(next) => {
                  if (next === null)
                    return
                  setParent(String(next))
                  reset()
                }}
              >
                <Label>{t('categories.sheet.parent')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id={ROOT} textValue={t('categories.sheet.parentNone')}>
                      {t('categories.sheet.parentNone')}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {parents.map((root) => {
                      const label = nameOf(root)

                      return (
                        <ListBox.Item key={root.id} id={root.id} textValue={label}>
                          {label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )
                    })}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
        {kind === 'map' && (
          <>
            <RadioGroup
              className="gap-2"
              orientation="horizontal"
              value={icon ?? NO_ICON}
              onChange={(next) => {
                setIcon(next === NO_ICON ? null : (next as CategoryIcon))
                reset()
              }}
            >
              <Label>{t('categories.icon.label')}</Label>
              <div className="flex flex-wrap gap-2">
                <Radio className={`${choiceCard} flex min-h-11 items-center px-3 py-0 text-sm`} value={NO_ICON}>
                  <Radio.Content>{t('categories.icon.none')}</Radio.Content>
                </Radio>
                {categoryIconKeys.map((key) => {
                  const Icon = categoryIconComponents[key]

                  return (
                    <Radio key={key} className={`${choiceCard} flex size-11 items-center justify-center p-0`} value={key}>
                      <Radio.Content>
                        <Icon aria-hidden size={20} />
                        <Label className="sr-only">{t(iconLabelKey(key))}</Label>
                      </Radio.Content>
                    </Radio>
                  )
                })}
              </div>
              <Description>{t('categories.icon.hint')}</Description>
            </RadioGroup>
            <Switch
              isSelected={showOnHome}
              onChange={(next) => {
                setShowOnHome(next)
                reset()
              }}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <span className="flex flex-col">
                  <Label>{t('categories.home.label')}</Label>
                  <span className="text-xs text-muted">{t('categories.home.hint')}</span>
                </span>
              </Switch.Content>
            </Switch>
          </>
        )}
        {failureKey && (
          <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">{t(failureKey)}</p>
        )}
      </Form>
    </SheetFrame>
  )
}
