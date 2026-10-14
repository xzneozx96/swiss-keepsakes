# Alert

Inline, persistent status message on a white surface; the icon and title carry the status colour.

## Covers
HeroUI Alert (status `default | accent | success | warning | danger`), plus our extra `info` status and the C12 hold-timer pattern.

## Spec
- Root: flex row, items-start, gap 16px, padding 16px x / 12px y, bg `color-surface`, shadow `shadow-surface`, radius `radius-3xl` (24px), no border.
- Indicator: 4px padding around a 16x16 icon (24x24 box).
- Title 14/24, weight 500, in the status `-soft-foreground` (info: `color-info`). Description 14/20, `color-muted`.
- Background stays `color-surface` for every status. No states, no motion.

## Our changes
- Extra `info` status: icon and title `color-info`. HeroUI has no info role.
- Danger uses the brick `color-danger`, never Swiss red.
- Alerts are the one status shape without a tint: white surface plus coloured icon and title, always with words (UX spec §5.5).
- The retry action inside an error alert is a tertiary Button `sm` (36px, `color-default`, ink text). Secondary would set red text next to the brick title; tertiary keeps the error reading as one colour.
- Hold timer (C12): the countdown text sits in an element with `role="timer"` (not live). A separate visually hidden `aria-live="polite"` region announces the remaining time at 10, 5, 2 and 1 minutes and when it expires. A `sm` ProgressBar in `color-warning` sits under the text. The hold cannot be extended (the seat is released for others), so state the exact end time ("bis 14:52 Uhr").
- Expired hold: warning alert "Reservierung abgelaufen", keeps all entered data, primary "Neu buchen".

## Use
- Booking and order state on C13, C15, C16 ("Wartet auf Bestätigung", "Buchung bestätigt").
- Hold timer and its expiry on C12.
- Error pattern (spec §5.5): plain words, keep entered data, one retry action.
- Full width of its container; fits 343px at 375px.

## Don't
- Don't fill the alert with a status colour; keep `color-surface`.
- Don't use red (`color-accent`) for errors.
- Don't use an Alert for transient confirmations; use Toast.
