/**
 * A screen's top bar pulls up into the main column's padding (-mt-4, and -mt-8 from 1024px). When the store
 * notice is shown, the shell drops that desktop top padding (see merchant-shell.tsx), so the bar must stop
 * pulling up there or it covers the notice's lower edge. The variant must match the shell's selector.
 */
export const BAR_PULL_UP
  = '-mt-4 lg:-mt-8 group-has-[[data-merchant-notice]:not(:empty)]/content:lg:mt-0'

/**
 * Where a pinned editor header sits: the top of the window on phones (the notice scrolls away there), and the bottom
 * edge of the store notice from 1024 px, where the notice sticks too. The shell writes the notice's height to
 * `--merchant-notice-height` (0 without a notice), so the header never covers it.
 */
export const BAR_TOP = 'top-0 lg:top-[var(--merchant-notice-height,0px)]'

/** Where something that pins under the 64 px editor header sits (the story's formatting bar, the review columns). */
export const BELOW_BAR_TOP = 'top-16 lg:top-[calc(var(--merchant-notice-height,0px)+4rem)]'
