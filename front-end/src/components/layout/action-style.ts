export const roundAction
  = 'flex size-11 items-center justify-center rounded-full outline-none transition-transform focus-visible:focus-ring active:scale-95'

/**
 * "floating" sits on a banner (white pill with shadow); "pill" sits on a product photo
 * (the product card's pill, owner request); "glass" is the earlier frosted glass, kept
 * for the hero Lab; "bar" sits in the compact bar.
 */
export type ActionTone = 'floating' | 'pill' | 'glass' | 'bar'

export const toneClass: Record<ActionTone, string> = {
  floating: 'bg-surface/90 text-foreground shadow-surface backdrop-blur',
  pill: 'pill',
  glass: 'glass',
  bar: 'bg-transparent text-foreground',
}
