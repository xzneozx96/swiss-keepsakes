/**
 * Phone tab rows stay pinned while the page scrolls, with the page background behind them so
 * content passes under. From 1024px they scroll with the page (the sidebar leads there).
 */
export const STICKY_TABS =
  "max-lg:sticky max-lg:top-0 max-lg:z-10 max-lg:-mx-4 max-lg:bg-background/90 max-lg:px-4 max-lg:backdrop-blur-xl";

/** The same on detail screens, under the 56px back bar they dock at the top. */
export const STICKY_TABS_BELOW_BAR =
  "max-lg:sticky max-lg:top-14 max-lg:z-10 max-lg:-mx-4 max-lg:bg-background/90 max-lg:px-4 max-lg:backdrop-blur-xl";
