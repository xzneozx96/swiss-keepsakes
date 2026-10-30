/**
 * O3 · List and detail. The options are a short list on the left; the chosen one fills the right. On a phone the list
 * is one screen and the option another, with a back link. Values read as plain text rows (a tap renames one), new values
 * come from one field at the top, and German is its own small section at the foot: a translation list, closed until
 * asked for. Borrowed from Apple's list-detail layouts (Settings, the split view) and Stripe's product editor.
 */
import type { OptionDraft, ValueDraft } from './keepsake-options-data'
import type { OptionDesignDraft } from './option-design-state'

import { Button, Input, Label, Switch, TextField } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, OptionIcon, PlusIcon } from '@/components/icons'
import { Reorder, SwatchPicker } from './keepsake-options-parts'
import { labelOf, named, plural, variantsUsing } from './keepsake-options-rules'
import { AssignPanel, NotesAt, QuietNote, RevealLink, SaveLine } from './option-design-parts'

function focusSoon(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

function needsLook(draft: OptionDesignDraft, option: OptionDraft) {
  return [option.ref, ...option.values.map(v => v.ref), `${option.ref}:assign`].some(at => draft.problemsAt(at).length > 0 || draft.refusalAt(at))
}

function OptionList({ draft, selected, onPick, onAdd }: { draft: OptionDesignDraft, selected: string | undefined, onPick: (ref: string) => void, onAdd: () => void }) {
  return (
    <nav aria-label="Options" className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {draft.options.map((option) => {
          const current = option.ref === selected

          return (
            <li key={option.ref}>
              <button
                aria-current={current ? 'true' : undefined}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start outline-none transition-colors duration-150 hover:bg-default/50 focus-visible:focus-ring lg:aria-[current]:bg-default"
                type="button"
                onClick={() => onPick(option.ref)}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{labelOf(option.name) || 'Unnamed option'}</span>
                  <span className={`truncate text-sm ${needsLook(draft, option) ? 'text-danger' : 'text-muted'}`}>
                    {needsLook(draft, option) ? 'Needs a look' : named(option).map(v => labelOf(v.label)).join(', ') || 'No values yet'}
                  </span>
                </span>
                <ChevronRightIcon aria-hidden className="shrink-0 text-muted lg:hidden" size={18} />
              </button>
            </li>
          )
        })}
      </ul>
      <Button className="-ms-1 self-start max-lg:h-11" variant="ghost" onPress={onAdd}>
        <PlusIcon aria-hidden size={16} />
        Add option
      </Button>
    </nav>
  )
}

/** A value as plain text; a tap turns it into a field, Enter or leaving it keeps the change. */
function ValueRow({ draft, option, value, grip, colours }: { draft: OptionDesignDraft, option: OptionDraft, value: ValueDraft, grip: React.ReactNode, colours: boolean }) {
  const [editing, setEditing] = useState(false)
  const name = labelOf(value.label) || 'value'
  const users = draft.savedRefs.has(value.ref) ? variantsUsing(draft.variants, option.ref, value.ref).length : 0

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="flex min-h-11 min-w-0 items-center gap-1">
        {grip}
        {colours && <SwatchPicker name={name} size="size-5" value={value.swatch} onChange={swatch => draft.patchValue(option.ref, value.ref, { swatch })} />}
        {editing
          ? (
              <TextField fullWidth aria-label={`Rename ${name}`} className="min-w-0 flex-1" value={value.label.en} onChange={en => draft.patchValue(option.ref, value.ref, { label: { ...value.label, en } })}>
                <Input id={`${value.ref}-rename`} onBlur={() => setEditing(false)} onKeyDown={event => (event.key === 'Enter' || event.key === 'Escape') && setEditing(false)} />
              </TextField>
            )
          : (
              <button aria-label={`Rename ${name}`} className="min-h-11 min-w-0 flex-1 truncate rounded-lg px-2 text-start outline-none hover:bg-default/50 focus-visible:focus-ring lg:min-h-9" type="button" onClick={() => { setEditing(true); focusSoon(`${value.ref}-rename`) }}>
                {name}
              </button>
            )}
        {users > 0 && <span className="shrink-0 text-xs text-muted tabular-nums">{plural(users, 'variant')}</span>}
        <Button isIconOnly aria-label={`Remove ${name}`} className="size-11 shrink-0 text-muted lg:size-9" variant="ghost" onPress={() => draft.removeValue(option.ref, value.ref)}>
          <CloseIcon aria-hidden size={16} />
        </Button>
      </div>
      <div className="ps-12 lg:ps-10">
        <NotesAt at={value.ref} draft={draft} />
      </div>
    </div>
  )
}

function AddValue({ draft, option }: { draft: OptionDesignDraft, option: OptionDraft }) {
  const [text, setText] = useState('')
  const [refused, setRefused] = useState<string[]>([])
  const commit = () => {
    if (!text.trim())
      return
    const result = draft.addValues(option.ref, text)

    setRefused(result.refused)
    setText(result.refused.join(', '))
  }

  return (
    <div className="flex flex-col gap-1">
      <TextField fullWidth aria-label={`Add values to ${labelOf(option.name) || 'the option'}`} value={text} onChange={(next) => { setText(next); setRefused([]) }}>
        <Input
          id={`${option.ref}-add`}
          placeholder="Add a value and press Enter"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          }}
        />
      </TextField>
      {refused.length > 0
        ? <QuietNote>{`${refused.join(', ')} ${refused.length === 1 ? 'is' : 'are'} already in the list.`}</QuietNote>
        : <p className="text-xs text-muted">Paste a list to add several: Small, Medium, Large</p>}
    </div>
  )
}

function GermanNames({ draft, option }: { draft: OptionDesignDraft, option: OptionDraft }) {
  const [open, setOpen] = useState(false)
  const rows = [{ ref: option.ref, text: option.name, kind: 'name' as const }, ...named(option).map(value => ({ ref: value.ref, text: value.label, kind: 'value' as const }))]
  const missing = rows.filter(row => !row.text.de.trim()).length
  const id = `${option.ref}-german`

  return (
    <div className="flex flex-col gap-2">
      <RevealLink controls={id} expanded={open} onToggle={() => setOpen(o => !o)}>
        {missing > 0 ? `German names (optional) · ${missing} missing` : 'German names · all set'}
      </RevealLink>
      {open && (
        <div className="flex flex-col gap-2" id={id}>
          <p className="text-xs text-pretty text-muted">Left empty, German readers see the English.</p>
          {rows.map(row => (
            <TextField
              fullWidth
              key={row.ref}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3"
              value={row.text.de}
              onChange={de => (row.kind === 'name'
                ? draft.patchName(option.ref, { ...option.name, de })
                : draft.patchValue(option.ref, row.ref, { label: { ...row.text, de } }))}
            >
              <Label className={`truncate text-sm ${row.kind === 'name' ? 'font-medium' : 'font-normal text-muted'}`}>{row.text.en || '—'}</Label>
              <Input lang="de" placeholder="German" variant="secondary" />
            </TextField>
          ))}
        </div>
      )}
    </div>
  )
}

function OptionDetail({ draft, option, onBack, onDeleted }: { draft: OptionDesignDraft, option: OptionDraft, onBack: () => void, onDeleted: () => void }) {
  const colours = option.values.some(v => v.swatch !== null)
  const name = labelOf(option.name) || 'the option'

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="option-detail">
      <Button className="-ms-2 self-start max-lg:h-11 lg:hidden" variant="ghost" onPress={onBack}>
        <ChevronLeftIcon aria-hidden size={16} />
        All options
      </Button>
      <div className="flex flex-col gap-1">
        <TextField fullWidth value={option.name.en} onChange={en => draft.patchName(option.ref, { ...option.name, en })}>
          <Label>Name</Label>
          <Input id={`${option.ref}-name`} placeholder="Size, Colour, Theme…" />
        </TextField>
        <NotesAt at={option.ref} draft={draft} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Values</span>
          <span className="text-xs text-muted">In the order guests see them</span>
        </div>
        <AddValue draft={draft} option={option} />
        {option.values.length > 0 && (
          <Reorder
            items={option.values}
            label={`Values of ${name}, in the order guests see them`}
            nameOf={value => labelOf(value.label) || 'value'}
            row={(value, _index, grip) => <ValueRow colours={colours} draft={draft} grip={grip} option={option} value={value} />}
            onMove={(from, to) => draft.moveValue(option.ref, from, to)}
          />
        )}
      </div>

      {draft.needValues.some(o => o.ref === option.ref) && <AssignPanel draft={draft} option={option} />}

      <div className="flex flex-col gap-1">
        <Switch className="min-h-11 lg:min-h-9" isSelected={colours} onChange={on => draft.setSwatches(option.ref, on)}>
          <Switch.Content className="items-center">
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label className="text-sm">Show values as colour swatches</Label>
          </Switch.Content>
        </Switch>
        <GermanNames draft={draft} option={option} />
      </div>

      <Button
        className="-ms-4 self-start text-danger max-lg:h-11"
        variant="ghost"
        onPress={() => {
          if (draft.removeOption(option.ref))
            onDeleted()
        }}
      >Delete option
      </Button>
    </div>
  )
}

export function OptionsO3({ draft }: { draft: OptionDesignDraft }) {
  const attention = draft.options.find(option => draft.isNew(option.ref) || needsLook(draft, option))
  const [selected, setSelected] = useState<string | undefined>(() => (attention ?? draft.options[0])?.ref)
  const [view, setView] = useState<'list' | 'detail'>(() => (attention ? 'detail' : 'list'))
  const option = draft.options.find(o => o.ref === selected) ?? draft.options[0]

  const add = () => {
    const ref = draft.addOption()

    setSelected(ref)
    setView('detail')
    focusSoon(`${ref}-name`)
  }

  return (
    <Block hint="What guests choose between, like size or colour." icon={OptionIcon} title="Options">
      {draft.options.length === 0 || !option
        ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="max-w-xs text-sm text-pretty text-muted">Add an option if this keepsake comes in versions, for example a size or a colour.</p>
              <Button className="max-lg:h-11" onPress={add}>
                <PlusIcon aria-hidden size={16} />
                Add option
              </Button>
            </div>
          )
        : (
            <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
              <div className={view === 'detail' ? 'max-lg:hidden' : ''}>
                <OptionList draft={draft} selected={option.ref} onAdd={add} onPick={(ref) => { setSelected(ref); setView('detail') }} />
              </div>
              <div className={view === 'list' ? 'max-lg:hidden' : ''}>
                <OptionDetail
                  key={option.ref}
                  draft={draft}
                  option={option}
                  onBack={() => setView('list')}
                  onDeleted={() => { setSelected(undefined); setView('list') }}
                />
              </div>
            </div>
          )}
      {draft.options.length > 0 && <SaveLine draft={draft} />}
    </Block>
  )
}
