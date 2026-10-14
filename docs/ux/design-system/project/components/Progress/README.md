# Progress

Loading and progress indicators: bars for tasks and quantities, a circle, a spinner and skeleton placeholders.

## Covers
HeroUI ProgressBar, Meter, ProgressCircle, Spinner, Skeleton.

## Spec
- ProgressBar / Meter: grid, label and output (14/20 weight 500, tabular numerals) above the track, gap 4px. Track bg `color-default`. Sizes sm 4px (radius 2), md 8px (radius 4, default), lg 12px (radius 6). Fill colours: `default` (= `color-foreground`), accent, success, warning, danger. Width transition 300ms ease-out.
- ProgressBar indeterminate: fill 40% wide, slides over 1.5s.
- Meter: a fixed quantity in a known range; never indeterminate.
- ProgressCircle: sm 20, md 28, lg 36; track ring `color-default`.
- Spinner: sm 16, md 24, lg 32, xl 40; rotates 0.75s linear; `color="current"` inside buttons.
- Skeleton: radius 4px, bg `color-surface-tertiary` at 70%, shimmer 2s linear (pulse or none optional). Size set by the consumer.
- The ring and spinner geometry is set in HeroUI's component code, not its CSS; the drawings here approximate it.

## Our changes
- Default fill is ink (`color="default"`, `color-foreground`), not HeroUI's accent: Swiss red is kept for actions and selection. Use `warning` for the hold timer (see Alert) and `success` only for a completed task.
- Spinner uses `current` inside buttons and ink elsewhere.

## Use
- Meter: seats taken on a departure (M05, C10), data completeness (M24).
- Spinner: inside a pending Button (16px, current colour) and Toast promise state.
- Skeleton: every loading state (UX spec §5.5: skeletons, never a full-page spinner). Mirror the real layout's shapes and mark the region `aria-busy`.
- The track is 1.07:1 on the page ground, so always show the value as text ("8 / 12", "72 %").

## Don't
- Don't use a full-page spinner.
- Don't use a ProgressBar for the 15-minute hold timer alone; pair it with text and an Alert (C12).
- Don't fill bars with Swiss red.
