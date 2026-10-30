/**
 * Lab v2 pieces the three option designs share: the save line, a quiet note for refusals and errors, a disclosure link,
 * value pills, and the calm "a value for every variant" panel. Throwaway; not product code.
 */
import type { ReactNode } from 'react'
import type { OptionDraft } from './keepsake-options-data'
import type { OptionDesignDraft } from './option-design-state'

import { Button, Label, ListBox, Select } from '@heroui/react'
import { useState } from 'react'

import { CheckIcon, ChevronDownIcon, StatusDangerIcon } from '@/components/icons'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { combinationName, labelOf, named, unassigned } from './keepsake-options-rules'

/** One line in the danger tone with a small icon. No box: the owner asked for fewer frames. */
export function QuietNote({ children, detail }: { children: ReactNode, detail?: string }) {
  return (
    <p className="flex items-start gap-2 text-sm text-pretty" role="alert">
      <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0 text-danger" size={14} />
      <span className="flex flex-col gap-0.5">
        <span className="text-danger">{children}</span>
        {detail && <span className="text-muted">{detail}</span>}
      </span>
    </p>
  )
}

/** The refusal and the rule texts that belong to one place. */
export function NotesAt({ draft, at }: { draft: OptionDesignDraft, at: string }) {
  const refusal = draft.refusalAt(at)
  const problems = draft.problemsAt(at)

  if (!refusal && problems.length === 0)
    return null

  return (
    <div className="flex flex-col gap-1">
      {refusal && <QuietNote detail={refusal.detail}>{refusal.text}</QuietNote>}
      {problems.map(problem => <QuietNote key={problem.text}>{problem.text}</QuietNote>)}
    </div>
  )
}

/** A text button that opens something below it. */
export function RevealLink({ expanded, onToggle, children, controls }: { expanded: boolean, onToggle: () => void, children: ReactNode, controls?: string }) {
  return (
    <button
      aria-controls={controls}
      aria-expanded={expanded}
      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-medium text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:min-h-9"
      type="button"
      onClick={onToggle}
    >
      {children}
      <ChevronDownIcon aria-hidden className={`transition-transform duration-200 ease-out ${expanded ? 'rotate-180' : ''}`} size={14} />
    </button>
  )
}

/** The values as soft pills, the way a guest reads them. */
export function ValuePills({ option, max = 8 }: { option: OptionDraft, max?: number }) {
  const values = named(option)
  const more = values.length - max

  return (
    <span className="flex flex-wrap gap-1.5">
      {values.slice(0, max).map(value => (
        <span key={value.ref} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-default px-2.5 text-sm">
          <Swatch className="size-3" color={value.swatch} />
          {labelOf(value.label)}
        </span>
      ))}
      {more > 0 && <span className="inline-flex h-7 items-center px-1 text-sm text-muted">{`+${more}`}</span>}
      {values.length === 0 && <span className="text-sm text-muted">No values yet</span>}
    </span>
  )
}

/**
 * The save line at the foot of the block. Only a status until something changed; then Discard and Save appear, and Save
 * is the one filled button (Shopify's contextual save bar). Options never autosave and save whole (ADR-027).
 */
export function SaveLine({ draft }: { draft: OptionDesignDraft }) {
  const blocking = draft.problems.filter(problem => problem.code !== 'value-duplicate')

  return (
    <div className="flex flex-col gap-3 pt-2" data-testid="save-line">
      {draft.tried && blocking.length > 0 && (
        <p className="text-sm text-pretty text-danger" role="alert">
          {blocking.length === 1 ? 'Not saved. One thing to fix, shown above.' : `Not saved. ${blocking.length} things to fix, shown above.`}
        </p>
      )}
      <div className="flex items-center gap-2">
        <p aria-live="polite" className="me-auto text-sm text-pretty text-muted" role="status">
          {draft.dirty ? 'Unsaved changes' : draft.notice || 'All changes saved'}
        </p>
        {draft.dirty && <Button className="max-lg:h-11" variant="ghost" onPress={draft.discard}>Discard</Button>}
        {draft.dirty && <Button className="max-lg:h-11" onPress={() => draft.save()}>Save</Button>}
      </div>
    </div>
  )
}

/**
 * A new option on a keepsake with variants: one sentence, one row of "give all" buttons, and the per-variant choice
 * behind a disclosure. Every variant needs a value in the same save (ADR-017).
 */
export function AssignPanel({ draft, option }: { draft: OptionDesignDraft, option: OptionDraft }) {
  const [open, setOpen] = useState(false)
  const name = (labelOf(option.name) || 'new option').toLocaleLowerCase()
  const values = named(option)
  const others = draft.options.filter(o => o.ref !== option.ref && draft.savedRefs.has(o.ref))
  const missing = unassigned(option, draft.variants, draft.assigned)
  const total = draft.variants.length
  const allOf = (ref: string) => draft.variants.every(variant => draft.assigned[variant.id]?.[option.ref] === ref)
  const problem = draft.problemsAt(`${option.ref}:assign`)[0]
  const listId = `${option.ref}-per-variant`

  return (
    <section aria-label={`A ${name} for each variant`} className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-4" data-testid="assign-panel">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{`Your ${total} variants each need a ${name}`}</p>
        <p className="text-sm text-pretty text-muted">Give them all one, then change any that differ.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {values.map(value => (
          <Button key={value.ref} aria-pressed={allOf(value.ref)} className="max-lg:h-11" size="sm" variant="tertiary" onPress={() => draft.assignAll(option.ref, value.ref)}>
            {allOf(value.ref) ? <CheckIcon aria-hidden size={14} /> : <Swatch className="size-3" color={value.swatch} />}
            {`All ${labelOf(value.label)}`}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <RevealLink controls={listId} expanded={open} onToggle={() => setOpen(o => !o)}>Choose per variant</RevealLink>
        <span aria-live="polite" className={`ms-auto text-sm tabular-nums ${missing.length > 0 ? 'text-muted' : 'text-success'}`}>
          {missing.length > 0 ? `${total - missing.length} of ${total} set` : `All ${total} set`}
        </span>
      </div>
      {open && (
        <ul className="flex flex-col gap-1" id={listId}>
          {draft.variants.map(variant => (
            <li key={variant.id} className="flex items-center gap-3 py-1">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{combinationName(variant.values, others) || variant.code}</span>
                <span className="truncate font-mono text-xs text-muted">{`${variant.code}${variant.status === 'hidden' ? ' · hidden' : ''}`}</span>
              </span>
              <Select
                aria-label={`${labelOf(option.name) || 'Value'} of ${variant.code}`}
                className="w-36 shrink-0"
                placeholder="Choose"
                selectedKey={draft.assigned[variant.id]?.[option.ref] ?? null}
                onSelectionChange={key => key !== null && draft.assign(variant.id, option.ref, String(key))}
              >
                <Label className="sr-only">{`${labelOf(option.name) || 'Value'} of ${variant.code}`}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {values.map(value => (
                      <ListBox.Item key={value.ref} id={value.ref} textValue={labelOf(value.label)}>
                        {labelOf(value.label)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </li>
          ))}
        </ul>
      )}
      {problem && <QuietNote>{problem.text}</QuietNote>}
    </section>
  )
}
