# Task C (round 3 follow-ups): report

Verified on the isolated no-HMR server (port 5248), 390x844 EN+DE, plus desktop 1280x900. Touch: headless Chromium `hasTouch/isMobile`, CDP `Input.dispatchTouchEvent` on the grip; a swipe on a card body scrolled the page (scrollY 856 -> 986) without dragging. Not tested on a real iOS/Android device.

## 1 Commission
Root cause (reproduced before the fix): react-aria NumberField keeps editable text. Backspace turned `50%` into `50`, `5`, then empty; blur on empty left the input empty (value NaN); select-all+Delete same. Letters ignored. `isReadOnly` is not usable: useSpinButton sets `isDisabled: isDisabled || isReadOnly`, which also kills arrows/Home/End/hold.
Fix: DOM `readOnly` on the input (stepping stays), explicit `role="spinbutton"` + aria-valuenow/min/max/valuetext + `aria-label` (react-aria nulls the role), paste blocked in capture on the Group (react-aria commits a paste over a fully selected input even when readOnly: a synthetic empty paste produced NaN until blocked). Visible "Commission rate" label removed. Title: EN "Partner's commission rate (%)", DE "Provisionssatz für Partner (%)". `products.commission.rate` unchanged (review row + aria-label).

| Action (after fix) | Result |
|---|---|
| Backspace / Delete / type letters or digits / select-all+type | unchanged, `%` stays |
| Cut, paste ('', 'abc', '99') over select-all, then blur | unchanged (0%), never empty/NaN |
| Home / End | 0% / 50% |
| ArrowUp/Down at bounds | stays 0 / 50 |
| - / + click | 1 percentage point |
| press-and-hold + 2.2s | repeats (32-33%) |
Checked in tour and keepsake editors, EN and DE (aria-label "Commission rate" / "Provisionssatz").

## 2 Trash icon
Compared Trash..Trash9 at 18/36px. `TrashIcon` is now `Reicon.Trash4` (outline can + lid, no mesh; same glyph as `CartRemoveIcon`). Screens using the shared icon: stop card, partner row menu (delete), categories menu, question sheet, article OrderActions (editor-fields), comment rows, lab cart line. Proof on categories menu.

## 3 Round buttons
Up/down/trash are 40x40 `rounded-full` (measured 40x40), 44px touch target via `before:-inset-0.5`, disabled opacity 0.3, trash `text-danger`. Row fits one line in EN and DE with the label kept ("Time, tip, photo" / "Zeit, Tipp, Foto"): gap-1, `-me-1.5` on the button group, `whitespace-nowrap` on the label. The 8px `scrollWidth` difference measured on the row is that negative margin plus the hit-area pseudo-element; the trash circle sits inside the card. `IconAction` unchanged (`buttonProps` was enough).

## 4 Drag handles
react-aria DnD evaluated and not used: its drag is native HTML5 DnD on the row (long-press on touch), needs the `<ol>/<li>` timeline turned into GridList rows with nested inputs/textareas, and cannot honour handle-only `touch-action:none`. Built `itinerary/use-stop-drag.ts` (pointer events: mouse, touch, pen; no new dependency). Grip on every card header, collapsed and expanded; grip keys ArrowUp/Down also move; up/down buttons stay on expanded cards. Dragging an open card folds it (flushSync, then measure). Lifted card `shadow-overlay`, dashed accent placeholder marks the slot, page auto-scrolls near screen edges, Escape cancels. `moveTo(from,to)` lives in `itinerary-editor.tsx` (`use-tour-editor.ts` untouched: it has no reorder action; order is saved through `change({itinerary})`).
Owner feedback applied: grip is a local six-dot SVG (`GripIcon` in icons.ts), not a bar icon.
Gotcha: `globals.css` gives every `button` unlayered `touch-action: manipulation`, which beats Tailwind `touch-none`, so the grip uses an inline `touchAction: none`. (Outside scope, not changed.)

Drag demo (mouse and touch, same results):
- before: Chapel Bridge 1, Kornmarkt 2, Weinmarkt 3, Hirschenplatz 4, Victorinox 5; pins 1..5 same.
- drag open Kornmarkt (#2) down: Chapel, Weinmarkt, Hirschenplatz, Victorinox, Kornmarkt; badges 1-5, pins Kornmarkt=5, Weinmarkt=2 ...
- then Chapel down one, then last card to top: Kornmarkt 1, Weinmarkt 2, Chapel 3, Hirschenplatz 4, Victorinox 5; pins 1..5 match the same order.
- click a card after dragging selects it (map sync intact); grip ArrowUp keeps focus on the grip.
- save, guest tour map pins: Stop 1 Chapel Bridge, 2 Weinmarkt, 3 Kornmarkt, 4 Hirschenplatz, 5 Victorinox (matches editor).
Not tested: dragging a card held open by a validation error (could not trigger the error state in the time-box; placeholder uses measured heights, collapsed 72px = 72px verified).

## Screenshots (docs/round2/)
- Item 1: r3-item1-after-{en,de}-390, r3-item1-keepsake-{en,de}-390, r3-item1-desktop, r3-item1-before-en-390 (no DE before shot exists)
- Item 2: r3-item2-icon-candidates, r3-item2-categories-trash-390, r3-item23-{before,after}-{en,de}-390
- Item 3: r3-item23-*, r3-item3-disabled-en-390
- Item 4: r3-item4-{mouse,touch}-{en,de}-{mid,after,select}-390, r3-item4-guest-map-after-save-390, r3-item234-desktop

## Files changed
components/icons.ts (TrashIcon, GripIcon), gift-editor.tsx (CommissionCard), messages.ts (commission.title EN/DE), itinerary-messages.ts (new key `products.itinerary.stop.grip` EN+DE), itinerary/stop-card.tsx, itinerary/itinerary-editor.tsx, itinerary/use-stop-drag.ts (new).
Noticed, not mine: `routes/__root.tsx` became dirty during the run.
