# Back button loops (owner, 14 October 2026)

**Reported:** On `#/account?tab=bookings`, opening a booking and tapping ← returned to the list correctly, but ← on the list went back to the booking, forever. The owner had seen something similar in the gift flow.

**Root cause:** Some ← buttons pushed the parent screen as a new history entry, e.g. `navigate({ to: "/account", search: { tab: "bookings" } })`, instead of stepping back. History became list → detail → list. The list's ← calls `history.back()`, which returned to the detail. Reproduced in the browser before fixing: `#/account?tab=bookings → #/account/bookings/tour-anna → #/account?tab=bookings → #/account/bookings/tour-anna`.

The same mistake was in five places:

| Screen | File | Loop |
| --- | --- | --- |
| C16 guest booking detail | `features/tours/booking/guest-tour-booking-page.tsx` | detail ↔ bookings list (the owner's report) |
| C06 Review and send (gift) | `routes/_guest/cart_.review.tsx` (Back and Edit cart) | review ↔ cart (the gift-flow case, reproduced: `#/cart → #/cart/review → #/cart → #/cart/review`) |
| C09 tour detail | `features/tours/discovery/tour-detail-page.tsx` | pushed the tour list |
| C10 departure and group | `features/tours/discovery/tour-selection-page.tsx` | pushed the tour detail |
| C11 Edit | `features/tours/booking/tour-review-page.tsx` | pushed C10 |

A related older issue surfaced while testing. Sign-in opened over the screen it returns to (C06, C11, Account) and then replaced itself with a second copy of that screen. Back from there showed the same screen again, so the first tap seemed to do nothing.

**Fix:**
- New `src/hooks/use-back.ts`: `history.back()` when the guest came from inside the app, otherwise navigate to the parent with `replace: true`. The five screens above use it.
- `useRequireSignIn` marks sign-in opened over its own return screen (history state `signInOverReturnTo`). On success, sign-in steps back to that entry instead of adding a copy. A direct visit to sign-in, and cart → sign-in → C06, still replace as before.

**Evidence:** `backnav-drive.mjs` → `backnav-drive.out`: 17/17 pass.
- A: the owner's path. Booking ← list ← leaves to the account.
- B: cart → C06 ← cart ← leaves, no bounce.
- D: tours → detail → C10 → C11, then Edit ← C10 ← detail ← list.
- E: signed out, C11 → sign-in → C11 → Edit leaves C11 at once.
- F: signed out, cart → sign-in → C06 ← cart ← leaves.
- G: the account tab's sign-in → browser Back leaves the account.
- No page errors.
