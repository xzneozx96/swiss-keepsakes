/**
 * B3: the variants table has an open row at its end: a select per option, code, price, On sale and Add. Tab walks the
 * row, Enter adds, and the row keeps the price and every option but the last, so the next variant is one choice away.
 * Edits inline in the Variants step; no sheet.
 */
import type { VariantDraft } from './keepsake-options-b-state'

import { Button, ListBox, Select, Switch } from '@heroui/react'
import { useRef } from 'react'

import { PlusIcon, ProductsIcon } from '@/components/icons'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { Block } from '@/features/places/components/fields'
import { CodeField, CombinationStatus, PriceField, VariantList } from './keepsake-options-b-parts'
import { labelOf } from './keepsake-options-rules'

function AddRow({ draft }: { draft: VariantDraft }) {
  const formRef = useRef<HTMLFormElement>(null)

  if (draft.noOptions) {
    return <p className="text-sm text-pretty text-muted">No options yet, so this keepsake has one variant. Add an option (size, theme, colour…) to sell more than one.</p>
  }

  return (
    <form
      ref={formRef}
      aria-label="Add a variant"
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-muted/50 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (draft.create(true)) {
          // The next variant starts at the option that changed.
          const triggers = Array.from(formRef.current?.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="listbox"]') ?? [])

          requestAnimationFrame(() => triggers.at(-1)?.focus())
        }
      }}
    >
      <div className="grid grid-cols-2 items-start gap-2 lg:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {draft.options.map(option => (
          <Select key={option.ref} fullWidth aria-label={labelOf(option.name)} placeholder={labelOf(option.name)} selectedKey={draft.values[option.ref] ?? null} onSelectionChange={key => draft.setValue(option.ref, key === null ? undefined : String(key))}>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {option.values.map(value => (
                  <ListBox.Item key={value.ref} id={value.ref} textValue={labelOf(value.label)}>
                    <Swatch color={value.swatch} />
                    {labelOf(value.label)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ))}
        <CodeField compact draft={draft} />
        <PriceField compact draft={draft} />
        <Switch aria-label="On sale" className="min-h-11" isSelected={draft.status === 'published'} onChange={on => draft.setStatus(on ? 'published' : 'hidden')}>
          <Switch.Content className="items-center">
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <span className="text-sm">{draft.status === 'published' ? 'On sale' : 'Hidden'}</span>
          </Switch.Content>
        </Switch>
        <Button className="max-lg:h-11" isDisabled={draft.twin !== undefined} type="submit">
          <PlusIcon aria-hidden size={16} />
          Add variant
        </Button>
      </div>
      <CombinationStatus draft={draft} />
      <p className="text-xs text-muted">Enter adds the variant. The price and the first options stay, so the next one is one choice away. Stock starts at 0; set it in Inventory.</p>
    </form>
  )
}

export function VariantsB3({ draft }: { draft: VariantDraft }) {
  return (
    <Block hint="The combinations you sell. Add the next one in the open row." icon={ProductsIcon} title="Variants">
      <VariantList draft={draft} markId={draft.twin?.id} />
      <AddRow draft={draft} />
    </Block>
  )
}
