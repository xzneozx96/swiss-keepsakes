# Gift order detail: empty space at the bottom (owner, 14 October 2026)

**Reported:** "there is this huge white empty space on my order detail (from account management screen)".

**Root cause:** `routes/_guest/account_.orders.$orderId.tsx` hides the bottom tab bar (`hideTabBar`) but did not set `ownsBottomSpace`. The guest shell therefore kept `main`'s 88px bottom padding for a tab bar that isn't there, and the page's own `pb-12` added 48px more. The tour booking detail already set both flags.

**Fix:** `staticData: { hideTabBar: true, ownsBottomSpace: true }`. C15 has no fixed bottom bar, so nothing needs that reserve. The page keeps its own 48px bottom margin.

**Evidence:** `c15-space-drive.mjs` → `c15-space-drive.out`: 9/9 pass. All four tabs in EN and DE have no reserve, and a scrolling tab now ends 56–70px below its last content; the Overview tab of the order in the owner's screenshot dropped from 158px to 70px. A tab shorter than the screen ends at the screen edge. The account hub still reserves the tab bar's space. Screenshots: `screens/c15-space-r3/`.

**Not changed:** The gift payment page (`account_.orders.$orderId_.pay.tsx`, approved C12) has the same missing flag. It is left for the owner to decide; the tour payment page already sets it.
