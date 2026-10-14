# Toast

Transient, stacked notification that confirms an action just taken.

## Covers
HeroUI Toast (variants `default | accent | success | warning | danger`; `toast()`, `toast.success/info/warning/danger`, promise form with spinner).

## Spec
- Toast: flex row, items-start, gap 6px, padding 16px x / 12px y, bg `color-surface`, shadow `shadow-overlay`, radius `radius-3xl`, no border.
- Indicator 4px padding + 16px icon (24px box). Title 14/20 weight 500; description 14/20 `color-muted`. Title and icon take the variant's `-soft-foreground`.
- Action: any Button (here tertiary `sm`, 32px); on phones it sits 8px below the text, from 640px inline.
- Stack: max 3 visible, gap 12px, scale factor 0.05. Region width `calc(100vw - 2rem)` on phones (343px at 375px), min 460px from 640px. Default placement bottom, 16px from the edge.
- Motion: transform/height 350ms `cubic-bezier(0.32,0.72,0,1)`, opacity 150ms; exit 250ms.

## Our changes
- Close button is 24px (CloseButton, `radius-xl`, `color-default`) and always visible. HeroUI shows a 20px close only on hover, which touch users never trigger.
- Only success toasts without an action auto-dismiss (4s). Toasts with an action ("Rückgängig") or a danger status stay until closed (WCAG 2.2.1); repeat failure details inline on the page as well.
- Add the bottom safe-area inset to the 16px offset on phones (HeroUI has no safe-area handling).
- Danger uses brick `color-danger`; never Swiss red.

## Use
- Merchant confirmations after a money action (M08 "Zahlung erfasst", with "Rückgängig" when the action is reversible).
- Background save failures that keep the user's data.

## Don't
- Don't put anything the user must decide in a toast; use Alert or AlertDialog.
- Don't use a toast to confirm a booking or payment to a customer; show the confirmed state on the page.
