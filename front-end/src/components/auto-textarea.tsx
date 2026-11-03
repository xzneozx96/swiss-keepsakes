import type { ComponentProps } from 'react'

import { TextArea } from '@heroui/react'
import { useCallback, useLayoutEffect, useRef } from 'react'

const NATIVE_AUTO_SIZE
  = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('field-sizing', 'content')

/**
 * A TextArea that grows with its text: no inner scrollbar, no resize handle.
 * `rows` is the minimum height; `maxRows` (optional) caps it, and the text scrolls inside past the cap. Browsers with `field-sizing: content` size it natively;
 * the rest (iOS Safari before 26) fall back to measuring scrollHeight. The text stays 16px
 * on phones (HeroUI's text-base), so iOS does not zoom on focus.
 */
export function AutoTextArea({
  rows = 4,
  maxRows,
  className,
  style,
  onInput,
  ...props
}: ComponentProps<typeof TextArea> & { maxRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const fit = useCallback(() => {
    const el = ref.current

    if (!el || NATIVE_AUTO_SIZE)
      return
    el.style.height = 'auto'
    const { borderTopWidth, borderBottomWidth } = getComputedStyle(el)

    el.style.height = `${el.scrollHeight + (Number.parseFloat(borderTopWidth) || 0) + (Number.parseFloat(borderBottomWidth) || 0)}px`
  }, [])

  // Every render: the value comes from the parent field, so a typed, pasted or swapped
  // (language switch) text all pass through here.
  useLayoutEffect(fit)

  // Width changes (rotation, sidebar) re-wrap the text.
  useLayoutEffect(() => {
    const el = ref.current

    if (!el || NATIVE_AUTO_SIZE)
      return
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width)
        return
      width = el.clientWidth
      fit()
    })

    observer.observe(el)

    return () => observer.disconnect()
  }, [fit])

  return (
    <TextArea
      {...props}
      ref={ref}
      className={`resize-none ${maxRows ? 'overflow-y-auto' : 'overflow-hidden'} [field-sizing:content] ${className ?? ''}`}
      rows={rows}
      style={{
        // field-sizing ignores `rows`; padding (0.5rem x2) and border are inside min-height.
        minHeight: `calc(${rows}lh + 1rem + 2 * var(--border-width-field, 1px))`,
        ...(maxRows && { maxHeight: `calc(${maxRows}lh + 1rem + 2 * var(--border-width-field, 1px))` }),
        ...style,
      }}
      onInput={(event) => {
        fit()
        onInput?.(event)
      }}
    />
  )
}
