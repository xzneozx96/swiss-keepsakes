/**
 * B1: Create opens the shared sheet. One select per option in a two-column grid, a live answer to "is this combination
 * free?", then code and price side by side, On sale as a switch row, and stock as a line of text.
 */
import type { VariantDraft } from './keepsake-options-b-state'

import { Button, Label, ListBox, Select } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { PlusIcon, ProductsIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { CodeField, CombinationStatus, OnSaleRow, PriceField, StockNote, VariantList } from './keepsake-options-b-parts'
import { labelOf, variantAt } from './keepsake-options-rules'

function OptionSelect({ draft, optionRef }: { draft: VariantDraft, optionRef: string }) {
  const option = draft.options.find(o => o.ref === optionRef)!
  const others = draft.options.filter(o => o.ref !== optionRef)
  const otherChosen = others.every(o => draft.values[o.ref])
  // With the other options chosen, a value that makes a sold combination says so. It can still be picked, and the status line explains.
  const soldWith = (valueRef: string) => (otherChosen ? variantAt(draft.variants, draft.options, { ...draft.values, [optionRef]: valueRef }) : undefined)

  return (
    <Select fullWidth placeholder={`Choose ${labelOf(option.name).toLowerCase()}`} selectedKey={draft.values[optionRef] ?? null} onSelectionChange={key => draft.setValue(optionRef, key === null ? undefined : String(key))}>
      <Label>{labelOf(option.name)}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {option.values.map((value) => {
            const sold = soldWith(value.ref)

            return (
              <ListBox.Item key={value.ref} id={value.ref} textValue={labelOf(value.label)}>
                <Swatch color={value.swatch} />
                {labelOf(value.label)}
                {sold && <span className="ms-auto text-xs text-muted [.select__value_&]:hidden">sold</span>}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

function VariantSheet({ draft, onClose }: { draft: VariantDraft, onClose: () => void }) {
  const close = () => { draft.reset(); onClose() }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button
            fullWidth
            className="min-h-11"
            isDisabled={draft.blocked}
            onPress={() => {
              if (draft.create())
                onClose()
            }}
          >Create variant
          </Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={close}>Cancel</Button>
        </>
      )}
      title="Create variant"
      onClose={close}
    >
      {draft.noOptions
        ? <p className="text-sm text-pretty text-muted">No options yet, so this keepsake has one variant. Add an option (size, theme, colour…) to sell more than one.</p>
        : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                {draft.options.map(option => <OptionSelect key={option.ref} draft={draft} optionRef={option.ref} />)}
              </div>
              <CombinationStatus draft={draft} />
            </div>
          )}
      <div className="grid grid-cols-2 items-start gap-3">
        <CodeField draft={draft} />
        <PriceField draft={draft} />
      </div>
      <OnSaleRow draft={draft} />
      <StockNote />
    </SheetFrame>
  )
}

export function VariantsB1({ draft }: { draft: VariantDraft }) {
  const [isOpen, setIsOpen] = useState(draft.twin !== undefined)

  return (
    <Block hint="The combinations you sell. Each has its own code and price." icon={ProductsIcon} title="Variants">
      <VariantList draft={draft} />
      <Button className="self-start max-lg:h-11" isDisabled={!draft.free && !draft.noOptions} variant="secondary" onPress={() => setIsOpen(true)}>
        <PlusIcon aria-hidden size={16} />
        Create variant
      </Button>
      {!draft.free && !draft.noOptions && <p className="text-xs text-muted">Every combination is already sold. Add an option value to sell more.</p>}
      {isOpen && <VariantSheet draft={draft} onClose={() => setIsOpen(false)} />}
    </Block>
  )
}
