import type { Key } from '@heroui/react'

import { Autocomplete, Description, EmptyState, FieldError, Label, ListBox, SearchField, Tag, TagGroup, useFilter } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'

export interface MultiSelectOption {
  id: string
  label: string
  /** The id of the parent option. One level only: an option whose parent is not in the list is shown at the top. */
  parentId?: string | null
}

/** The options as the list shows them: each top-level option followed by its sub-options. */
function inTreeOrder(options: MultiSelectOption[]) {
  const ids = new Set(options.map(option => option.id))
  const isChild = (option: MultiSelectOption) => option.parentId != null && ids.has(option.parentId)

  return options.filter(option => !isChild(option)).flatMap(option => [
    { option, parent: undefined },
    ...options.filter(child => isChild(child) && child.parentId === option.id).map(child => ({ option: child, parent: option })),
  ])
}

/**
 * A field that picks several values. The chosen ones are chips inside the input, each removable; a tap opens a list
 * with a search field, a tick on the chosen items, and sub-options indented under their parent. The keys follow the
 * HeroUI Autocomplete: Enter, Space or the arrow down opens the list, the arrows move, Enter or Space ticks, Escape
 * closes. Label, input, then the help line, like every field.
 */
export function MultiSelect({ label, options, value, onChange, description, placeholder, isDisabled, error }: {
  label: string
  options: MultiSelectOption[]
  /** The ids of the chosen options, in the order they were chosen. */
  value: string[]
  onChange: (value: string[]) => void
  description?: string
  placeholder?: string
  isDisabled?: boolean
  /** The words under the field when it is invalid. */
  error?: string
}) {
  const { t } = useLocale()
  const { contains } = useFilter({ sensitivity: 'base' })
  const rows = inTreeOrder(options)
  const chosen = value.flatMap((id) => {
    const option = options.find(other => other.id === id)

    return option ? [option] : []
  })

  return (
    <Autocomplete
      fullWidth
      isDisabled={isDisabled}
      isInvalid={error !== undefined}
      placeholder={placeholder ?? t('multiSelect.placeholder')}
      selectionMode="multiple"
      value={value}
      variant="secondary"
      onChange={keys => onChange((keys as Key[]).map(String))}
    >
      <Label>{label}</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({ defaultChildren }) => chosen.length === 0
            ? defaultChildren
            : (
                <TagGroup aria-label={label} className="min-w-0 flex-1" size="sm" onRemove={keys => onChange(value.filter(id => !keys.has(id)))}>
                  <TagGroup.List>
                    {chosen.map(option => <Tag key={option.id} id={option.id}>{option.label}</Tag>)}
                  </TagGroup.List>
                </TagGroup>
              )}
        </Autocomplete.Value>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      {description && !error && <Description>{description}</Description>}
      {error && <FieldError>{error}</FieldError>}
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          {/* The list opens on the search: typing narrows it at once. */}
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <SearchField autoFocus aria-label={t('multiSelect.search', { label })} variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('multiSelect.search', { label })} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>{t('multiSelect.empty')}</EmptyState>}>
            {rows.map(({ option, parent }) => (
              <ListBox.Item key={option.id} className={parent ? 'ps-8' : undefined} id={option.id} textValue={option.label}>
                {option.label}
                {parent && <span className="sr-only">{`, ${t('multiSelect.under', { parent: parent.label })}`}</span>}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  )
}
