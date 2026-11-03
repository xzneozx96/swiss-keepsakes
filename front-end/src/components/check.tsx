import { Checkbox, Label } from '@heroui/react'

/** HeroUI Checkbox, 24px box (lab CartSelectDemo); the label is visible or only for screen readers. Used by the cart's and the Variants block's "Select all". */
export function Check({
  label,
  hideLabel = false,
  isSelected,
  isIndeterminate,
  onChange,
}: {
  label: string
  hideLabel?: boolean
  isSelected: boolean
  isIndeterminate?: boolean
  onChange: (selected: boolean) => void
}) {
  return (
    <Checkbox
      aria-label={hideLabel ? label : undefined}
      className="items-center"
      isIndeterminate={isIndeterminate}
      isSelected={isSelected}
      onChange={onChange}
    >
      <Checkbox.Content className="flex-row items-center gap-2">
        <Checkbox.Control className="size-6 rounded-lg">
          <Checkbox.Indicator className="size-4 [&_[data-slot$=checkmark]]:size-4 [&_[data-slot$=indeterminate]]:size-3.5" />
        </Checkbox.Control>
        {!hideLabel && <Label>{label}</Label>}
      </Checkbox.Content>
    </Checkbox>
  )
}
