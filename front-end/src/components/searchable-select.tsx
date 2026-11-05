import type { Key } from '@heroui/react'

import { Autocomplete, Description, EmptyState, FieldError, Label, ListBox, SearchField, useFilter } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { useSearchBox } from '@/hooks/use-search-box'

export interface SearchableSelectOption {
  id: string
  label: string
}

/** The key of the "none" row. An option id is a uuid or a slug, so it never equals this. */
const NONE = '__none__'
const noop = () => {}
const everything = () => true

/**
 * A field that picks one value from a long list: a tap opens a list with a search field above it and a tick on the
 * chosen item. It is the single-choice twin of `MultiSelect`, with the same field look, search field, empty state
 * and keys (Enter, Space or the arrow down opens the list, the arrows move, Enter picks, Escape closes). Pass
 * `noneLabel` to add a first row that clears the choice: it calls `onChange(null)` and shows while nothing is chosen.
 * Label, input, then the help line, like every field.
 *
 * With `serverSearch` the list is not filtered here: the typing goes to `serverSearch.onChange` a moment after the last key
 * (`serverSearch.value` is what `options` was last read for), and `options` is what the server answered (search as you type).
 */
export function SearchableSelect({ label, hideLabel, options, value, onChange, noneLabel, description, placeholder, isDisabled, error, serverSearch }: {
  label: string
  /** The label is only for screen readers, because a title next to the field already says it. */
  hideLabel?: boolean
  options: SearchableSelectOption[]
  /** The id of the chosen option, or null for none. */
  value: string | null
  onChange: (value: string | null) => void
  /** The words of the row that clears the choice ("None"). Without it the choice cannot be cleared. */
  noneLabel?: string
  description?: string
  placeholder?: string
  isDisabled?: boolean
  /** The words under the field when it is invalid. */
  error?: string
  serverSearch?: { value: string, onChange: (text: string) => void }
}) {
  const { t } = useLocale()
  const { contains } = useFilter({ sensitivity: 'base' })
  const [text, setText] = useSearchBox(serverSearch?.value ?? '', serverSearch?.onChange ?? noop)
  const rows = noneLabel === undefined ? options : [{ id: NONE, label: noneLabel }, ...options]
  const key: Key | null = value ?? (noneLabel === undefined ? null : NONE)
  const chosen = rows.find(row => row.id === key)

  return (
    <Autocomplete
      fullWidth
      isDisabled={isDisabled}
      isInvalid={error !== undefined}
      placeholder={placeholder ?? t('multiSelect.placeholder')}
      selectionMode="single"
      value={key}
      onChange={next => next !== null && !Array.isArray(next) && onChange(next === NONE ? null : String(next))}
    >
      <Label className={hideLabel ? 'sr-only' : undefined}>{label}</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({ defaultChildren }) => chosen ? chosen.label : defaultChildren}
        </Autocomplete.Value>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      {description && !error && <Description>{description}</Description>}
      {error && <FieldError>{error}</FieldError>}
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={serverSearch ? everything : contains}>
          {/* The list opens on the search: typing narrows it at once. */}
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <SearchField autoFocus aria-label={t('multiSelect.search', { label })} {...(serverSearch ? { value: text, onChange: setText } : {})}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('multiSelect.search', { label })} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>{t('multiSelect.empty')}</EmptyState>}>
            {rows.map(row => (
              <ListBox.Item key={row.id} id={row.id} textValue={row.label}>
                {row.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  )
}
