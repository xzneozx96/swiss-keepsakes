import type { LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Button, buttonVariants, SearchField } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { MerchantPageHeader } from '@/components/layout/merchant-page-header'

/** The one size of a list screen's action: the Media screen's Upload button, full width on phones. */
const ACTION_CLASS = 'shrink-0 max-lg:h-11 max-lg:w-full'

/**
 * The header of a merchant list screen: title, intro and the screen's action. From 1024 px the action sits at
 * the end of the title row, below it the action is full width under the intro (the Media screen's layout).
 */
export function ListHeader({ title, description, action }: { title: string, description: string, action?: ReactNode }) {
  return <MerchantPageHeader action={action} className="max-lg:flex-col max-lg:items-stretch" description={description} title={title} />
}

/**
 * A list screen's button: the Media screen's Upload style (default size, 16 px icon before the label). Pass
 * `link` for a link that looks like a button, else `onPress`. `variant="secondary"` is for a second action.
 */
export function ListAction({ icon: Icon, children, link, variant, isDisabled, isPending, onPress }: {
  icon?: React.ComponentType<{ 'aria-hidden'?: boolean, 'size'?: number }>
  children: ReactNode
  link?: LinkProps
  variant?: 'secondary'
  isDisabled?: boolean
  isPending?: boolean
  onPress?: () => void
}) {
  const content = (
    <>
      {Icon && <Icon aria-hidden size={16} />}
      {children}
    </>
  )

  if (link)
    return <Link aria-disabled={isDisabled} className={buttonVariants({ className: ACTION_CLASS, variant })} {...link}>{content}</Link>

  return <Button className={ACTION_CLASS} isDisabled={isDisabled} isPending={isPending} variant={variant} onPress={onPress}>{content}</Button>
}

/** The search box of a list screen: 20rem from 1024 px, full width below. */
export function ListSearch({ label, placeholder = label, value, isDisabled, onChange }: {
  label: string
  placeholder?: string
  value?: string
  isDisabled?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <SearchField aria-label={label} className="w-full" isDisabled={isDisabled} value={value} onChange={onChange}>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input className="w-full" placeholder={placeholder} />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  )
}

/**
 * The toolbar under a list screen's header, with three slots, each one element. With `tabs` or `filters` (not both)
 * it is one line: the tabs or the filter buttons at the left, `search` at the right from 1024 px. With both it is two
 * lines: the tabs alone, then the filters at the left and `search` at the right. On phones the order is tabs, filters,
 * search (full width). Below 1024 px the wrappers are `display: contents`, so a sticky tab row still pins against the
 * page and not against this box.
 */
export function ListToolbar({ tabs, filters, search }: { tabs?: ReactNode, filters?: ReactNode, search?: ReactNode }) {
  if (!tabs && !filters && !search)
    return null

  const left = tabs && filters ? filters : tabs ?? filters
  const line = 'max-lg:contents lg:flex lg:items-center lg:justify-between lg:gap-4'
  const row = (
    <>
      {left && <div className="min-w-0 max-lg:contents">{left}</div>}
      {search && <div className="w-full lg:ms-auto lg:w-80 lg:shrink-0">{search}</div>}
    </>
  )

  if (tabs && filters) {
    return (
      <div className="max-lg:contents lg:flex lg:flex-col lg:gap-4" data-testid="list-toolbar">
        <div className="max-lg:contents">{tabs}</div>
        <div className={line} data-testid="list-toolbar-line">{row}</div>
      </div>
    )
  }

  return <div className={line} data-testid="list-toolbar">{row}</div>
}
