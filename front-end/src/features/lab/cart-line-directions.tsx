import type { CartLineOptionProps } from './cart-line-options'

import { CartRemoveIcon, MinusIcon, PlusIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'

function Quantity({
  line,
  onQuantity,
}: Pick<CartLineOptionProps, 'line' | 'onQuantity'>) {
  const { language } = useLocale()
  const button
    = 'flex size-11 items-center justify-center rounded-lg outline-none transition-colors hover:bg-default focus-visible:focus-ring active:bg-default-hover disabled:opacity-30'

  return (
    <div
      aria-label={`${language === 'de' ? 'Menge' : 'Quantity'}, ${line.name}`}
      className="inline-flex items-center rounded-xl border border-border bg-surface"
      role="group"
    >
      <button
        aria-label={
          language === 'de' ? 'Menge verringern' : 'Decrease quantity'
        }
        className={button}
        disabled={line.quantity <= 1}
        type="button"
        onClick={() => onQuantity(line.quantity - 1)}
      >
        <MinusIcon aria-hidden size={16} />
      </button>
      <span
        aria-live="polite"
        className="w-7 text-center text-sm font-semibold tabular-nums"
      >
        {line.quantity}
      </span>
      <button
        aria-label={language === 'de' ? 'Menge erhöhen' : 'Increase quantity'}
        className={button}
        disabled={line.quantity >= line.max}
        type="button"
        onClick={() => onQuantity(line.quantity + 1)}
      >
        <PlusIcon aria-hidden size={16} />
      </button>
    </div>
  )
}

function Remove({
  line,
  onRemove,
}: Pick<CartLineOptionProps, 'line' | 'onRemove'>) {
  const { language } = useLocale()

  return (
    <button
      aria-label={`${language === 'de' ? 'Entfernen' : 'Remove'} ${line.name}`}
      className="-me-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-lg bg-transparent text-danger outline-none transition-colors hover:bg-danger-soft focus-visible:focus-ring active:bg-danger-soft-hover"
      type="button"
      onClick={onRemove}
    >
      <CartRemoveIcon aria-hidden size={19} />
    </button>
  )
}

function Price({ line }: Pick<CartLineOptionProps, 'line'>) {
  const { language } = useLocale()

  return (
    <div className="flex min-w-0 flex-col items-end gap-0.5">
      <span className="text-xs text-muted">
        {language === 'de' ? 'Artikel gesamt' : 'Item total'}
      </span>
      <span className="font-semibold tabular-nums">{line.total}</span>
    </div>
  )
}

function Unit({ line }: Pick<CartLineOptionProps, 'line'>) {
  const { language } = useLocale()

  return (
    <p className="text-sm text-muted tabular-nums">
      {line.unit}
      {' '}
      {language === 'de' ? 'pro Stück' : 'each'}
    </p>
  )
}

export function LineGiftSlip(props: CartLineOptionProps) {
  const { line } = props

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-surface">
      <div className="flex items-start gap-3">
        <Media
          alt=""
          className="size-[72px] shrink-0 rounded-xl"
          photo={line.photo}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-1">
            <h3 className="min-w-0 flex-1 font-semibold leading-snug">
              {line.name}
            </h3>
            <Remove {...props} />
          </div>
          {line.meta && (
            <p className="text-sm leading-relaxed text-muted">{line.meta}</p>
          )}
          <Unit line={line} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-separator pt-3">
        <Quantity {...props} />
        <Price line={line} />
      </div>
    </div>
  )
}

export function LineOpenBasket(props: CartLineOptionProps) {
  const { line } = props

  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 text-lg font-semibold leading-snug">
          {line.name}
        </h3>
        <Remove {...props} />
      </div>
      <div className="flex items-center gap-3">
        <Media
          alt=""
          className="size-16 shrink-0 rounded-lg"
          photo={line.photo}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {line.meta && (
            <p className="text-sm leading-relaxed text-muted">{line.meta}</p>
          )}
          <Unit line={line} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Quantity {...props} />
        <Price line={line} />
      </div>
    </div>
  )
}

export function LinePhotoLed(props: CartLineOptionProps) {
  const { line } = props

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-surface">
      <div className="relative">
        <Media
          alt=""
          className="h-44 w-full [&_img]:object-contain"
          photo={line.photo}
        />
        <div className="absolute end-3 top-3 [&_button]:m-0">
          <Remove {...props} />
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-lg font-semibold leading-snug">{line.name}</h3>
        {line.meta && (
          <p className="text-sm leading-relaxed text-muted">{line.meta}</p>
        )}
        <Unit line={line} />
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-separator pt-4">
          <Quantity {...props} />
          <Price line={line} />
        </div>
      </div>
    </div>
  )
}
