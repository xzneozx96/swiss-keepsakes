import type { CategoryDraft, LabCategory } from './categories-data'
import type { CategoryKind } from './categories-search-params'
import type { CategoryLab } from './categories-state'

import { Form, Input, Label, ListBox, Select, Tabs, TextField } from '@heroui/react'
import { useState } from 'react'

import { StatusWarningIcon } from '@/components/icons'
import { STICKY_TABS } from '@/components/layout/sticky-tabs'
import {
  childrenOf,
  draftOf,
  nameMissing,
  nameOf,
  parentChoices,
  usesLabel,
} from './categories-data'

const KINDS: { id: CategoryKind, label: string }[] = [
  { id: 'map', label: 'Map categories' },
  { id: 'blog', label: 'Blog categories' },
]

/** Title, one line on what the lists do, the screen's one action, and the two lists as tabs pinned on phones. */
export function CategoriesPage({ lab, action, children }: {
  lab: CategoryLab
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-4 pb-16 lg:px-8 lg:pt-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-title">Categories</h1>
          <p className="text-sm text-pretty text-muted">Guests filter the map and the stories by these.</p>
        </div>
        {action}
      </div>
      <Tabs className="w-full" selectedKey={lab.kind} onSelectionChange={key => lab.setKind(key as CategoryKind)}>
        <Tabs.ListContainer className={`w-full ${STICKY_TABS}`}>
          <Tabs.List aria-label="Category lists">
            {KINDS.map((k, index) => (
              <Tabs.Tab key={k.id} className="min-h-11 whitespace-nowrap" id={k.id}>
                {index > 0 && <Tabs.Separator />}
                {k.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      {children}
    </div>
  )
}

/** The second line under a name: the other language, or which language is missing (AC64). */
export function OtherName({ c, className = '' }: { c: LabCategory, className?: string }) {
  if (c.en && c.de)
    return <span className={`block text-xs text-muted [overflow-wrap:anywhere] ${className}`}>{c.de}</span>

  return (
    <span className={`flex items-center gap-1 text-xs text-warning-soft-foreground ${className}`}>
      <StatusWarningIcon aria-hidden className="shrink-0" size={12} />
      {c.en ? 'No German name' : 'No English name'}
    </span>
  )
}

/** A thin ink bar: how much this category is used next to the busiest one in its list. */
export function UsageMeter({ value, max, label }: { value: number, max: number, label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-default">
        <span className="block h-full rounded-full bg-foreground" style={{ width: `${max ? Math.max(value ? 6 : 0, (value / max) * 100) : 0}%` }} />
      </span>
      <span className="text-xs text-muted tabular-nums">{label}</span>
    </span>
  )
}

/** Why the category cannot go yet, and what to do about each reason (AC-4). */
export function RefusalNote({ c, items, kind, compact = false }: {
  c: LabCategory
  items: LabCategory[]
  kind: CategoryKind
  compact?: boolean
}) {
  const children = childrenOf(items, c.id)

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground" role="note">
      {!compact && <p className="font-semibold">{`“${nameOf(c)}” can’t be deleted yet`}</p>}
      <ul className="flex list-disc flex-col gap-1 ps-5">
        {children.length > 0 && (
          <li>
            {`It has ${children.length} sub-categor${children.length === 1 ? 'y' : 'ies'} (${children.map(nameOf).join(', ')}). Delete or move ${children.length === 1 ? 'it' : 'them'} first.`}
          </li>
        )}
        {c.uses > 0 && (
          <li>
            {`${usesLabel(kind, c.uses)} use${c.uses === 1 ? 's' : ''} it. Remove it from ${c.uses === 1 ? 'that' : 'those'} ${kind === 'map' ? 'pins in Places' : 'stories in Stories'} first.`}
          </li>
        )}
      </ul>
    </div>
  )
}

const ROOT = 'root'

/**
 * EN name, DE name and parent (AC-3, AC-5). One name is required; the parent list holds the
 * top-level categories only, and a category with sub-categories stays at the top.
 * Submitting with the form's id from any button saves.
 */
export function CategoryForm({ formId, category, parentId = null, items, onSave }: {
  formId: string
  category: LabCategory | undefined
  /** Preselected parent for a new sub-category. */
  parentId?: string | null
  items: LabCategory[]
  onSave: (draft: CategoryDraft) => void
}) {
  const [draft, setDraft] = useState(() => draftOf(category, parentId))
  const [showError, setShowError] = useState(false)
  const parents = parentChoices(items, category)
  const set = (patch: Partial<CategoryDraft>) => {
    setDraft({ ...draft, ...patch })
    setShowError(false)
  }
  const field = (label: string, value: string, lang: 'en' | 'de') => (
    <TextField fullWidth isInvalid={showError} maxLength={300} value={value} onChange={next => set({ [lang]: next })}>
      <Label>{label}</Label>
      <Input lang={lang} />
    </TextField>
  )

  return (
    <Form
      className="flex flex-col gap-4"
      id={formId}
      validationBehavior="aria"
      onSubmit={(event) => {
        event.preventDefault()
        if (nameMissing(draft))
          setShowError(true)
        else onSave(draft)
      }}
    >
      {field('English name', draft.en, 'en')}
      {field('German name', draft.de, 'de')}
      <p className={`-mt-2 text-xs ${showError ? 'text-danger' : 'text-muted'}`} role={showError ? 'alert' : undefined}>
        {showError ? 'Give it an English or a German name.' : 'One is enough. Guests see the other language’s name with a note.'}
      </p>
      {parents === null
        ? <p className="text-sm text-pretty text-muted">{`It has ${childrenOf(items, category!.id).length} sub-categories, so it stays at the top level.`}</p>
        : (
            <Select
              fullWidth
              selectedKey={draft.parentId ?? ROOT}
              onSelectionChange={next => next !== null && set({ parentId: next === ROOT ? null : String(next) })}
            >
              <Label>Sits under</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id={ROOT} textValue="Nothing (top level)">
                    Nothing (top level)
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {parents.map(r => (
                    <ListBox.Item key={r.id} id={r.id} textValue={nameOf(r)}>
                      {nameOf(r)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
    </Form>
  )
}
