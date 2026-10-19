import { Button, Drawer, Dropdown, Label, NumberField } from '@heroui/react'
import { useState } from 'react'

import {
  ChevronDownIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import { QuantityStepper } from '@/components/quantity-stepper'

/** Lab only: one cart line, the same data the built C04 line shows. */
export interface LabCartLine {
  id: string
  name: string
  photo?: string
  /** Option and engraving, e.g. "Medium · Engraving “Anna”". */
  meta: string
  quantity: number
  max: number
  /** Line total and unit price, already formatted. */
  total: string
  unit: string
}

export interface CartLineOptionProps {
  line: LabCartLine
  onQuantity: (value: number) => void
  onRemove: () => void
}

const removeLink
  = 'rounded text-sm font-semibold underline underline-offset-4 outline-none focus-visible:focus-ring'

/** Small outlined − n + pill (HeroUI NumberField), 32px buttons. */
function MiniStepper({
  name,
  value,
  max,
  onChange,
}: {
  name: string
  value: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <NumberField
      aria-label={`Quantity, ${name}`}
      className="quantity-stepper w-auto"
      maxValue={max}
      minValue={1}
      value={value}
      onChange={v => onChange(Number.isNaN(v) ? 1 : v)}
    >
      <NumberField.Group className="flex h-8 w-auto items-center rounded-full border border-field-border bg-transparent shadow-none">
        <NumberField.DecrementButton className="size-8 border-0 bg-transparent disabled:opacity-30" />
        <NumberField.Input className="w-6 p-0 text-center text-sm font-medium" />
        <NumberField.IncrementButton className="size-8 border-0 bg-transparent disabled:opacity-30" />
      </NumberField.Group>
    </NumberField>
  )
}

/** A · Compact row (Shopify / Etsy): price beside the name, small stepper and Remove below. */
export function LineCompactRow({
  line,
  onQuantity,
  onRemove,
}: CartLineOptionProps) {
  return (
    <div className="flex gap-3 py-3">
      <Media
        alt=""
        className="size-[72px] shrink-0 rounded-xl"
        photo={line.photo}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="line-clamp-2 min-w-0 flex-1 font-medium">
            {line.name}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {line.total}
          </span>
        </div>
        {line.meta && (
          <span className="truncate text-sm text-muted">{line.meta}</span>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <MiniStepper
            max={line.max}
            name={line.name}
            value={line.quantity}
            onChange={onQuantity}
          />
          <button className={removeLink} type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * B · Bin in the stepper (Amazon / Uber Eats): at 1 the minus becomes a bin, so
 * there is no separate Remove. The tightest row.
 */
export function LineBinStepper({
  line,
  onQuantity,
  onRemove,
}: CartLineOptionProps) {
  const button
    = 'flex size-8 items-center justify-center rounded-full outline-none focus-visible:focus-ring active:scale-95 disabled:opacity-30'
  const atOne = line.quantity <= 1

  return (
    <div className="flex gap-3 py-3">
      <Media
        alt=""
        className="size-16 shrink-0 rounded-xl"
        photo={line.photo}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 font-medium">{line.name}</span>
        {line.meta && (
          <span className="truncate text-sm text-muted">{line.meta}</span>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div
            aria-label={`Quantity, ${line.name}`}
            className="flex h-8 items-center rounded-full border border-field-border"
            role="group"
          >
            <button
              aria-label={atOne ? `Remove ${line.name}` : 'Decrease'}
              className={button}
              type="button"
              onClick={() =>
                atOne ? onRemove() : onQuantity(line.quantity - 1)}
            >
              {atOne ? <TrashIcon size={16} /> : <MinusIcon size={16} />}
            </button>
            <span
              aria-live="polite"
              className="w-6 text-center text-sm font-medium tabular-nums"
            >
              {line.quantity}
            </span>
            <button
              aria-label="Increase"
              className={button}
              disabled={line.quantity >= line.max}
              type="button"
              onClick={() => onQuantity(line.quantity + 1)}
            >
              <PlusIcon size={16} />
            </button>
          </div>
          <span className="font-semibold tabular-nums">{line.total}</span>
        </div>
      </div>
    </div>
  )
}

/** C · Qty menu (Etsy / Zalando): a "Qty 3" chip opens a short list; a bin on the right. */
export function LineQtyMenu({
  line,
  onQuantity,
  onRemove,
}: CartLineOptionProps) {
  const counts = Array.from({ length: line.max }, (_, i) => i + 1)

  return (
    <div className="flex gap-3 py-3">
      <Media
        alt=""
        className="size-16 shrink-0 rounded-xl"
        photo={line.photo}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start gap-2">
          <span className="line-clamp-2 min-w-0 flex-1 font-medium">
            {line.name}
          </span>
          <button
            aria-label={`Remove ${line.name}`}
            className="-me-1.5 -mt-1 flex size-8 items-center justify-center rounded-full text-muted outline-none focus-visible:focus-ring active:scale-95"
            type="button"
            onClick={onRemove}
          >
            <TrashIcon size={18} />
          </button>
        </div>
        {line.meta && (
          <span className="truncate text-sm text-muted">{line.meta}</span>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <Dropdown>
            <Button
              aria-label={`Quantity ${line.quantity}, change`}
              className="h-8 gap-1 rounded-full px-3 text-sm"
              size="sm"
              variant="outline"
            >
              Qty
              {' '}
              {line.quantity}
              <ChevronDownIcon aria-hidden size={14} />
            </Button>
            <Dropdown.Popover placement="bottom start">
              <Dropdown.Menu
                aria-label="Quantity"
                selectedKeys={new Set([String(line.quantity)])}
                selectionMode="single"
                onAction={key => onQuantity(Number(key))}
              >
                {counts.map(n => (
                  <Dropdown.Item key={n} id={String(n)} textValue={String(n)}>
                    <Label>{n}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
          <span className="font-semibold tabular-nums">{line.total}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * D · Price column (Klook): name and meta on the left with the unit price; total and
 * the small stepper stacked on the right. Remove sits under the unit price.
 */
export function LinePriceColumn({
  line,
  onQuantity,
  onRemove,
}: CartLineOptionProps) {
  return (
    <div className="flex gap-3 py-3">
      <Media
        alt=""
        className="size-16 shrink-0 rounded-xl"
        photo={line.photo}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 font-medium">{line.name}</span>
        {line.meta && (
          <span className="truncate text-sm text-muted">{line.meta}</span>
        )}
        <span className="text-sm whitespace-nowrap text-muted tabular-nums">
          {line.unit} each
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <span className="font-semibold tabular-nums">{line.total}</span>
        <MiniStepper
          max={line.max}
          name={line.name}
          value={line.quantity}
          onChange={onQuantity}
        />
        <button className={removeLink} type="button" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  )
}

/**
 * E · Summary row + edit sheet (Booking basket, same idea as the chosen seller row):
 * one line with "3 ×", name, meta and total; tapping opens a sheet with the full
 * quantity row and Remove.
 */
export function LineEditSheet({
  line,
  onQuantity,
  onRemove,
}: CartLineOptionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="flex w-full items-center gap-3 py-3 text-start outline-none focus-visible:focus-ring"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Media
          alt=""
          className="size-12 shrink-0 rounded-lg"
          photo={line.photo}
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{line.name}</span>
          {line.meta && (
            <span className="truncate text-sm text-muted">{line.meta}</span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-sm font-semibold tabular-nums">
            {line.total}
          </span>
          <span className="text-sm text-muted tabular-nums">
            Qty {line.quantity}
          </span>
        </span>
        <ChevronRightIcon aria-hidden className="shrink-0" size={18} />
      </button>

      <Drawer.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header className="flex flex-row items-center gap-3 text-start">
              <Media
                alt=""
                className="size-12 shrink-0 rounded-lg"
                photo={line.photo}
              />
              <div className="flex min-w-0 flex-col">
                <Drawer.Heading className="text-heading">
                  {line.name}
                </Drawer.Heading>
                {line.meta && (
                  <span className="text-sm text-muted">{line.meta}</span>
                )}
              </div>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] text-foreground">
              <QuantityStepper
                hint={`${line.unit} each`}
                label="Quantity"
                max={line.max}
                value={line.quantity}
                onChange={onQuantity}
              />
              <Button
                className="w-full"
                variant="secondary"
                onPress={() => {
                  setOpen(false)
                  onRemove()
                }}
              >
                Remove from cart
              </Button>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  )
}

/* ---------------------------------------------------------------------- Round 2 */

/**
 * Round stepper from the owner's reference: plain −, the number, and a filled ink +.
 * HeroUI NumberField underneath, so typing and arrow keys still work.
 */
function RoundStepper({
  name,
  value,
  max,
  onChange,
  filled = true,
}: {
  name: string
  value: number
  max: number
  onChange: (value: number) => void
  /** false: both buttons outlined, as in the C03 quantity row. */
  filled?: boolean
}) {
  const round
    = 'size-8 shrink-0 rounded-full disabled:opacity-30 data-[pressed=true]:scale-95'
  const outlined = `${round} border border-field-border bg-transparent text-foreground`
  const minus = filled
    ? `${round} border-0 bg-surface-secondary text-foreground`
    : outlined
  const plus = filled
    ? `${round} border-0 bg-foreground text-background`
    : outlined

  return (
    <NumberField
      aria-label={`Quantity, ${name}`}
      className="quantity-stepper w-auto"
      maxValue={max}
      minValue={1}
      value={value}
      onChange={v => onChange(Number.isNaN(v) ? 1 : v)}
    >
      <NumberField.Group className="flex h-auto w-auto items-center gap-1 overflow-visible border-0 bg-transparent shadow-none">
        <NumberField.DecrementButton className={minus} />
        <NumberField.Input className="w-6 p-0 text-center text-base font-semibold" />
        <NumberField.IncrementButton className={plus} />
      </NumberField.Group>
    </NumberField>
  )
}

function BinButton({ name, onRemove }: { name: string, onRemove: () => void }) {
  return (
    <button
      aria-label={`Remove ${name}`}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-muted outline-none focus-visible:focus-ring active:scale-95"
      type="button"
      onClick={onRemove}
    >
      <TrashIcon size={16} />
    </button>
  )
}

/**
 * The reference layout: a large square photo, name and option with a small bin on the
 * right, and price with the round stepper on the bottom line.
 */
export function RoomyItem({
  line,
  onQuantity,
  onRemove,
  photoSize = 'size-[88px]',
  filled = true,
  showUnit = false,
}: CartLineOptionProps & {
  photoSize?: string
  filled?: boolean
  showUnit?: boolean
}) {
  return (
    <div className="flex gap-4">
      <Media
        alt=""
        className={`${photoSize} shrink-0 rounded-2xl`}
        photo={line.photo}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="line-clamp-2 font-semibold">{line.name}</span>
            {line.meta && (
              <span className="text-sm text-muted">{line.meta}</span>
            )}
            {showUnit && (
              <span className="text-sm text-muted tabular-nums">
                {line.unit} each
              </span>
            )}
          </div>
          <BinButton name={line.name} onRemove={onRemove} />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-semibold tabular-nums">{line.total}</span>
          <RoundStepper
            filled={filled}
            max={line.max}
            name={line.name}
            value={line.quantity}
            onChange={onQuantity}
          />
        </div>
      </div>
    </div>
  )
}

/** F · Item cards (owner reference): each gift is its own white card under the order heading. */
export function LineItemCard(props: CartLineOptionProps) {
  return (
    <div className="rounded-3xl bg-surface p-3 shadow-surface">
      <RoomyItem {...props} />
    </div>
  )
}

/** G · Tiles in the order card: each gift on a soft grey tile inside the order card. */
export function LineItemTile(props: CartLineOptionProps) {
  return (
    <div className="rounded-2xl bg-surface-secondary p-3">
      <RoomyItem {...props} />
    </div>
  )
}

/** H · Roomy rows: the reference layout as rows split by lines, no inner cards. */
export function LineRoomyRow(props: CartLineOptionProps) {
  return (
    <div className="py-4">
      <RoomyItem {...props} />
    </div>
  )
}

/**
 * I · Large photo + unit price: 104px photo, the unit price under the option, outlined
 * round buttons as on the gift page.
 */
export function LineLargePhoto(props: CartLineOptionProps) {
  return (
    <div className="py-4">
      <RoomyItem {...props} showUnit filled={false} photoSize="size-26" />
    </div>
  )
}
