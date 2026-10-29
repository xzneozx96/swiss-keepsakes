import type { BlogCategory } from './story-editor-data'

import { Button, SearchField } from '@heroui/react'
import { useState } from 'react'

import { CloseIcon, MinusIcon } from '@/components/icons'
import { blogCategories } from './story-editor-data'
import { PickerFrame } from './story-editor-picker'
import { includedParents, toggleCategory } from './story-editor-rules'
import { ChosenMark } from './story-editor-selected'

/**
 * The Blog categories card body (owner's pick, option A, 29.10.2026): the chosen categories as
 * removable chips, and "Choose categories", styled like "Choose keepsakes", opening the shared
 * sheet with search and the tree at every width. Tree rows use the app's selected pattern (red
 * border, tick on the corner), the category editor's (N23) curved connector for a sub-category,
 * and the EN name with the DE name under it. Parent and child follow `toggleCategory`.
 */

const HELP = 'A sub-category includes its parent. Choosing the parent instead puts the story in the general category.'

const nameOf = (c: BlogCategory) => c.name.en || c.name.de
const byId = new Map(blogCategories.map(c => [c.id, c]))

function matches(c: BlogCategory, query: string) {
  const q = query.trim().toLowerCase()

  return !q || `${c.name.en} ${c.name.de}`.toLowerCase().includes(q)
}

/** Parents in order, each followed by its sub-categories; a match keeps its parent or children in view. */
function visible(query: string) {
  const out: BlogCategory[] = []

  for (const parent of blogCategories.filter(c => !c.parentId)) {
    const children = blogCategories.filter(c => c.parentId === parent.id)
    const shownChildren = matches(parent, query) ? children : children.filter(c => matches(c, query))

    if (matches(parent, query) || shownChildren.length)
      out.push(parent, ...shownChildren)
  }

  return out
}

function Connector() {
  // The category editor's (N23) connector: the sub-category hangs under its parent.
  return <span aria-hidden className="h-4 w-3 shrink-0 self-start rounded-bl-md border-s-2 border-b-2 border-separator" />
}

/** The tree as tappable rows with the app's selected pattern. */
function CategoryTree({ value, onChange, query = '' }: { value: string[], onChange: (ids: string[]) => void, query?: string }) {
  const included = includedParents(value, blogCategories)
  const shown = visible(query)

  if (!shown.length)
    return <p className="py-6 text-center text-sm text-muted">{`No category matches “${query}”.`}</p>

  return (
    <ul aria-label="Blog categories" className="flex flex-col gap-2 p-1">
      {shown.map((c) => {
        const chosen = value.includes(c.id)
        const isIncluded = included.includes(c.id)
        const through = value.filter(id => byId.get(id)?.parentId === c.id).map(id => nameOf(byId.get(id)!)).join(', ')

        return (
          <li key={c.id} className={c.parentId ? 'flex items-center gap-2 ps-3' : ''}>
            {c.parentId && <Connector />}
            <button
              aria-pressed={chosen}
              className={`relative flex min-h-11 w-full min-w-0 items-center rounded-2xl border-2 bg-surface-secondary px-3 py-2 text-start outline-none focus-visible:focus-ring ${chosen ? 'border-accent' : isIncluded ? 'border-dashed border-separator' : 'border-transparent'}`}
              type="button"
              onClick={() => onChange(toggleCategory(value, c.id, blogCategories))}
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{nameOf(c)}</span>
                <span className="text-xs text-muted">
                  {isIncluded ? `Included through ${through}. Choose to use ${nameOf(c)} instead` : c.name.de && c.name.en ? c.name.de : 'No German name yet'}
                </span>
              </span>
              {chosen && <ChosenMark />}
              {isIncluded && <MinusIcon aria-label="Included" className="absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-muted" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Search({ query, onQuery }: { query: string, onQuery: (q: string) => void }) {
  return (
    <SearchField aria-label="Search categories" className="w-full" value={query} onChange={onQuery}>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input className="w-full" placeholder="Search categories" />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  )
}

/** The shared sheet: search and the tree, saved with its button. */
function CategorySheet({ value, onSave, onClose }: { value: string[], onSave: (ids: string[]) => void, onClose: () => void }) {
  const [draft, setDraft] = useState(value)
  const [query, setQuery] = useState('')

  return (
    <PickerFrame doneLabel="Save categories" title="Blog categories" onClose={onClose} onDone={() => onSave(draft)}>
      <Search query={query} onQuery={setQuery} />
      <p className="-mt-2 text-xs text-pretty text-muted">{HELP}</p>
      <CategoryTree query={query} value={draft} onChange={setDraft} />
    </PickerFrame>
  )
}

function includedLine(value: string[]) {
  return includedParents(value, blogCategories)
    .map(p => `${nameOf(byId.get(p)!)} is included through ${value.filter(id => byId.get(id)?.parentId === p).map(id => nameOf(byId.get(id)!)).join(', ')}.`)
    .join(' ')
}

/** The chosen categories as removable chips; a sub-category reads "Old Town in Swiss history". */
function Chips({ value, onChange }: { value: string[], onChange: (ids: string[]) => void }) {
  if (!value.length)
    return null

  return (
    <ul aria-label="Chosen categories" className="flex flex-wrap gap-2">
      {value.map((id) => {
        const c = byId.get(id)
        const parent = c?.parentId ? byId.get(c.parentId) : undefined

        return c && (
          <li key={id} className="flex items-center gap-1 rounded-full bg-default py-1 ps-3 pe-1 text-sm">
            <span className="font-medium">{nameOf(c)}</span>
            {parent && <span className="text-xs text-muted">{`in ${nameOf(parent)}`}</span>}
            <button aria-label={`Remove ${nameOf(c)}`} className="flex size-8 items-center justify-center rounded-full outline-none hover:bg-default-hover focus-visible:focus-ring max-lg:-my-2 max-lg:size-11" type="button" onClick={() => onChange(value.filter(x => x !== id))}>
              <CloseIcon aria-hidden size={14} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** The chips, and "Choose categories" opening the shared sheet, as Keepsakes does. */
function SheetField({ value, onChange, startOpen }: FieldProps) {
  const [open, setOpen] = useState(startOpen)

  return (
    <div className="flex flex-col gap-2">
      <Chips value={value} onChange={onChange} />
      <p className="text-xs text-pretty text-muted">{includedLine(value) || HELP}</p>
      <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setOpen(true)}>
        {value.length ? 'Change categories' : 'Choose categories'}
      </Button>
      {open && (
        <CategorySheet
          value={value}
          onClose={() => setOpen(false)}
          onSave={(ids) => {
            onChange(ids)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

interface FieldProps {
  value: string[]
  onChange: (ids: string[]) => void
  startOpen: boolean
}

export function CategoryField({ value, onChange, startOpen = false }: {
  value: string[]
  onChange: (ids: string[]) => void
  startOpen?: boolean
}) {
  return <SheetField startOpen={startOpen} value={value} onChange={onChange} />
}
