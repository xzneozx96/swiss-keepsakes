import type { CategoryKind, MerchantCategory } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { Button, Form, Input, Label, ListBox, Select, TextField, toast } from '@heroui/react'
import { useId, useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { problemTypeToMessageKey } from '../lib/category-problems'
import { nameOf } from '../lib/category-tree'

const ROOT = 'root'

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
  const [nameMissing, setNameMissing] = useState(false)
  const create = useSubmit('categories', 'create')
  const save = useSubmit('categories', 'save')
  const { isPending, error, reset } = category ? save : create
  const fixedAtTop = category !== undefined && category.childCount > 0
  const name = {
    ...(nameEn.trim() === '' ? {} : { en: nameEn.trim() }),
    ...(nameDe.trim() === '' ? {} : { de: nameDe.trim() }),
  }
  const parentId = parent === ROOT ? null : parent
  const key = useIdempotencyKey({ storeId, kind, id: category?.id, name, parentId })
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
        toast.success(t(category ? 'categories.toast.saved' : 'categories.toast.added'))
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
        idempotencyKey: key.next(),
      }, callbacks)
    }
    else {
      create.submit({ storeId, kind, name, ...(parentId === null ? {} : { parentId }), idempotencyKey: key.next() }, callbacks)
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
        {failureKey && (
          <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">{t(failureKey)}</p>
        )}
      </Form>
    </SheetFrame>
  )
}
