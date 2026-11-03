/**
 * The class of a choice card: a radio or checkbox in a bordered, rounded card (HeroUI `Radio` or `Checkbox`, laid out by
 * the screen). Selected, the border turns the theme's red accent, the same red as the radio dot. A screen never keeps its
 * own copy; `tests/choice-card-guard.test.ts` fails when one does.
 */
export const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-accent data-[selected=true]:ring-1 data-[selected=true]:ring-accent'
