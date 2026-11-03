/**
 * A screen's top bar pulls up into the main column's padding (-mt-4, and -mt-8 from 1024px). When the store
 * notice is shown, the shell drops that desktop top padding (see merchant-shell.tsx), so the bar must stop
 * pulling up there or it covers the notice's lower edge. The variant must match the shell's selector.
 */
export const BAR_PULL_UP
  = '-mt-4 lg:-mt-8 group-has-[[data-merchant-notice]:not(:empty)]/content:lg:mt-0'
