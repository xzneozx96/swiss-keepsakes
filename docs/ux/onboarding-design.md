# Onboarding design: N01 full-screen flow and N24 deep-link card

- Status: **final** (chosen in chat on 2026-10-28): N01 is F1 "Guided", and N24 is N2, a card floating at the top while the guest reads a story. Section 6 lists what is still open (none of it blocks building).
- Screens: N01 (full-screen two-step flow) and N24 (floating card). Slice S1, Track 1, story E4.5.
- Read first: `docs/decisions/2026-10-28-onboarding-full-screen.md` (the rule and why), PRD §3.1 to §3.3, AC24, AC36, AC37, AC38, AC91, AC92, `docs/adr/ADR-006-browser-personalisation-and-map-data.md`.
- Visual reference: the lab page `/lab/onboarding-fullscreen` (run the front end and open `/lab/onboarding-fullscreen`). The files are listed in "Lab files". **The lab is a design reference, not product code.** It keeps state in React, draws its own phone frame and builds its own dialog. Do not copy it. Build the screens in the product with the rules in "Build notes".
- Owner references (structure only, not brand or colours): `docs/ux/references/onboarding/ref-1-interest-picker.webp`.

## 1. Who sees what

The entry of the current visit decides. The entry is the first page of the visit and whether it came from a partner QR code or link or from a search result. It lives in memory or `sessionStorage` for the visit. It is not the 30-day attribution and not part of `sk.onboarding`.

| Visitor | What shows |
| --- | --- |
| Guest, unanswered, visit began at the home with no QR, link or search result | N01 covers the whole guest shell, tab bar included |
| Guest, unanswered, visit began on a story, map pin, keepsake, partner QR or link, or search result | The page shows at once. On a story page N24 can appear. Other pages show nothing. N01 opens the first time the guest opens Explore from inside the app |
| Guest who closed N24 | N24 stays hidden for this visit only. It is not a skip. N01 still opens at the next Explore opening |
| Guest who skipped or closed N01 | Nothing returns by itself. The reopen entry brings the flow back |
| Guest who answered | Nothing interrupts. The list is sorted. The reopen entry changes the answers |
| Signed-in merchant, partner or Super Admin, and the `/store`, `/partner`, `/admin`, `/sign-in`, `/invitation` screens | Nothing, ever (AC92). Default order. The Account "Your trip" row is hidden |

## 2. N01: the full-screen flow (option F1 "Guided")

### Layout, top to bottom (375 px wide frame, 20 px side padding)

1. **Progress.** Two segments, 6 px high, 6 px apart. Done segments fill with the foreground colour. The fill animates in 500 ms (none under reduced motion).
2. **Control row.** 44 px high. On the left a Back button (step 2 only). Then a spacer. On the right a **Skip** text button (first run only, not in change mode) and a close button (×). Every target is at least 44 × 44 px.
3. **Heading block**, centred: the title in the serif display face, 30 px on a 36 px line, balanced wrap, with one muted line under it. No label or badge above the title.
4. **Choices**, 32 px below the heading, one full-width card per row, 12 px apart. See "Choice cards".
5. **Footer**, pinned to the bottom: the privacy line ("Your answers stay on this phone."), the "Forget my answers" link (change mode, step 2 only), and one full-width large button.

The step content rises in on each step (short entrance, none under reduced motion). The Back/Skip row has a fixed height, so the heading sits at the same place on both steps.

### Steps

| Step | Title | Choices | Main button |
| --- | --- | --- | --- |
| 1 | How long are you in Lucerne? | Single choice: "Just today" (value `short-stay`, photo `lucerne-swan`) or "A few days" (value `multi-day`, photo `rigi-kaltbad`). Each card has a 64 px photo, the label and a one-line hint | **Continue**, disabled until one is chosen. It saves the stay and goes to step 2 |
| 2 | What would you like to see? | Multi-select of the four fixed interests, one per row: history-culture, food-drink, lake-mountains, shopping-keepsakes (labels in PRD §3.3) | **Show my Lucerne**, disabled until one interest is chosen. It saves and closes. In change mode the button is **Save** and is enabled |

### Choice cards (the app's existing selected pattern)

Do not invent a selected style. Reuse the pattern of `front-end/src/features/catalog/components/gift-detail.tsx` (the variant option cards): a HeroUI `TagGroup` with `Tag` items (`selectionMode` single on step 1, multiple on step 2).

- Unselected: transparent 2 px border, normal fill (`bg-default`), `rounded-2xl`, full width, `before:hidden`.
- Selected (`data-[selected=true]`): `border-accent` (red), the fill stays, and a check badge sits on the **top-right edge**, outside the text: `SelectedIcon`, `absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-accent`. Selection never relies on colour alone.
- Step 2 cards are at least 52 px high (`min-h-13`) with a leading plus icon. The plus keeps its slot (`invisible`, not removed) when the card is selected, so the label never moves.
- **Cards never change position or size between states.** The lab verified this with bounding boxes: step 1 cards at x 20, y 254 and 353, 335 × 87 px, and step 2 cards at x 20, y 232, 296, 360, 424, 335 × 52 px, identical with none, one and all chosen.
- Rejected: a red tint fill with an inline check, and a wrapping row of centred chips (the row reflowed when the plus disappeared).

### Skip, close and Escape

| Where | Skip button | × and Escape |
| --- | --- | --- |
| Step 1, first run | Goes to step 2. Saves no stay, even if one card was tapped | Close the whole flow. Count as skipped. Save nothing |
| Step 2, first run | Ends the flow. Keeps the stay answer if there is one, drops the interests | Same as Skip |
| Change mode (reopened) | Not shown | Close and keep whatever was already changed. There is no revert |

- In change mode a tap on a different stay on step 1 saves at once, so × keeps it. On a first run the stay is saved only by Continue.
- Any skip or close of N01 is final: the flow never returns by itself. The reopen entry opens it again.
- "Forget my answers" (change mode, step 2) clears everything and ends the flow.

### End of the flow (hand-off)

- While N01 is open, the list behind it keeps the order it had when the flow opened.
- When it closes, the list re-ranks with a slide (only the rows that move animate, each from its true old position), and the "Sorted for: {answers} · Change" line rises in above the list.
- After a skip with no answers the line reads "Newest first · Sort for my trip".
- Ranking is `rankItems` of PRD §3.2 and ADR-006. Check it against the AC38 fixture.

### Reopen entry

The guest shell has no menu. There are two entries, both open the same two steps pre-filled, in change mode:

1. The "Sorted for … Change" line on the home (the "Newest first · Sort for my trip" form after a skip).
2. The **Account tab**, row "Your trip" with the value ("Not set yet" when empty). Hide this row for merchants, partners and Super Admins.

### Accessibility of the blocking layer

- A modal dialog (`role="dialog"`, `aria-modal`), labelled by the step heading. The heading reads "1 of 2" or "2 of 2" to screen readers.
- Covers the whole frame including the tab bar. Everything behind it is `inert`.
- Focus moves to the heading when it opens and on each step. Tab wraps inside. Escape and the visible Skip close it. Focus returns to where it was, or to the "Change" button if nothing was focused.
- `prefers-reduced-motion`: no open, close or step animation.
- Use the HeroUI `Modal` in the product. The lab builds its own dialog only to stay inside its phone frame.

## 3. N24: the deep-link card (option N2, a card while reading)

A card that floats under the top edge of the screen while the guest reads a story. **It is never inserted into the content.** The text never moves or reflows when it appears, hides or returns. No backdrop, the page stays scrollable.

Note on size: research (Nielsen Norman Group, Google) recommends a thin, easily dismissed banner. The owner tried a thin banner (359 × 52 px) on 2026-10-28 and rejected it as visually poor, then chose this card knowingly. Do not slim it again without asking the owner.

### Anatomy (lab version: 351 px wide; 168 px high in EN, 186 px in DE, where the description wraps to three lines)

- A floating `aside`, 12 px from the top and sides, `rounded-2xl`, surface fill, overlay shadow, 12 px padding, 12 px between rows. `aria-label` is the title.
- Top row: a 44 px rounded photo (`lake-steamboat`), the title in the serif face (17 px on a 22 px line, balanced wrap, up to two lines), and a × button (44 × 44 px).
- The description in muted small text across the full card width.
- One full-width 44 px button.
- The privacy line is not on the card. It is in the flow.
- No text clips in EN or DE at 375 px.

### When it shows

- Shows only when all of these hold: the visitor is a guest, unanswered, the visit began on a deep link, a partner QR or link, or a search landing (not the home), the guest has not hidden it this visit, and **the page is a story page**. On any page without a first paragraph (a map pin card, a keepsake page, a short page) it never shows. Those visitors still get N01 at their first Explore opening.
- It is **not shown at load.** It drops in the first time the story has scrolled past the end of its first paragraph (the standfirst).
- It tucks away after about 160 px of further scrolling down, and returns on any scroll up (4 px tolerance).
- It hides again when the visitor is back above the end of the first paragraph.
- Entry and exit: a 300 ms slide and fade. None under reduced motion.
- Keep the scroll position in a ref and flip state only when the shown value changes (AGENTS.md rule 3: no `setState` on every frame).

### Actions

- **Personalize my visit** opens N01 (the same two steps), focus on the heading.
- **×** and **Escape** (with focus inside the card) hide it for this visit only. It is not a skip. N01 still opens at the first Explore opening.
- While hidden or tucked away the card is `inert` and `aria-hidden`.

### Rejected

The inline card inside the story text, the thin banner of 52 px (tried and rejected on 2026-10-28), a dark one-line pill above the tab bar (N1) and a corner button that expands into a panel (N3). The owner chose N2 as a card.

## 4. Copy (EN and DE)

DE marked "proposal" is not reviewed by the merchant. The DE rows without the mark come from the first lab copy file. Have the merchant review all DE before release. Keep copy in the feature's message files, not inline (`docs/development-rules/frontend/code-structure.md`). The German dictionary is a lazy chunk (AGENTS.md rule 6).

| Screen | Element | EN | DE |
| --- | --- | --- | --- |
| N24 | Title, also the card label | Find what you’ll love in Lucerne | Entdecken Sie, was Sie in Luzern begeistern wird (proposal) |
| N24 | Description | Tell us a little about what you love, and discover places and stories picked just for you. | Erzählen Sie uns ein wenig von Ihren Vorlieben und entdecken Sie Orte und Geschichten, die genau für Sie ausgewählt sind. (proposal) |
| N24 | Button | Personalize my visit | Meinen Besuch personalisieren (proposal) |
| N24 | × label | Hide for now | Vorerst ausblenden (proposal) |
| N01 | Back label | Back | Zurück |
| N01 | Skip (first run only) | Skip | Überspringen |
| N01 | × label | Close | Schliessen |
| N01 | Step text for screen readers | 1 of 2 / 2 of 2 | 1 von 2 / 2 von 2 (proposal) |
| N01 step 1 | Title | How long are you in Lucerne? | Wie lange sind Sie in Luzern? |
| N01 step 1 | Subtitle | Two quick questions, so we can put the right things first. | Zwei kurze Fragen, damit wir das Passende zuerst zeigen. |
| N01 step 1 | "short-stay" card: label / hint | Just today / A few hours, often with a group | Nur heute / Ein paar Stunden, oft mit einer Gruppe |
| N01 step 1 | "multi-day" card: label / hint | A few days / One night or more | Ein paar Tage / Eine Nacht oder länger |
| N01 step 1 | Main button | Continue | Weiter (proposal) |
| N01 step 2 | Title | What would you like to see? | Was möchten Sie sehen? |
| N01 step 2 | Subtitle | Pick one or more. | Wählen Sie eines oder mehrere. |
| N01 step 2 | Interests | History and culture · Food and drink · Lake and mountains · Shopping and keepsakes | Geschichte und Kultur · Essen und Trinken · See und Berge · Shopping und Andenken (PRD §3.3; merchant review) |
| N01 steps 1 and 2 | Privacy line | Your answers stay on this phone. | Ihre Antworten bleiben auf diesem Handy. |
| N01 step 2 | Main button, first run | Show my Lucerne | Mein Luzern zeigen (proposal) |
| N01 step 2 | Main button, change mode | Save | Speichern (proposal) |
| N01 step 2 | Change-mode link | Forget my answers | Antworten löschen |
| Home after the flow | Sorted line | Sorted for: {answers} · Change | Sortiert für: {answers} · Ändern |
| Home after a skip | Sorted line | Newest first · Sort for my trip | Neueste zuerst · Für meine Reise sortieren |
| Account | Reopen row, label / empty value | Your trip / Not set yet | Ihre Reise / Noch nicht festgelegt |

## 5. Build notes for E4.5

- **Storage and ranking** are decided in ADR-006: `localStorage` key `sk.onboarding` holds `{ v: 1, segment, interests[], answeredAt, dismissedAt }`, and `rankItems` lives in `packages/domain/src/content/`. Nothing about the answers goes to the server except as anonymous values on analytics events (AC37).
- **The visit flag** that remembers "N24 hidden this visit" and the **entry** of the visit belong in `sessionStorage` or memory, separate from `sk.onboarding`. Use `readStored` and `writeStored` as in `docs/development-rules/frontend/error-handling.md`. Blocked storage stays silent and the app keeps working.
- **Role gating** reads the session. Wait until the session is known before showing anything, so a signed-in merchant never sees a flash of the flow. Hide the Account "Your trip" row for staff.
- **Client only.** Neither N01 nor N24 is in the server HTML (ADR-001, ADR-006).
- **First load.** The flow shows only on a first visit, so load it as a lazy chunk and keep it out of the first-load path (`docs/development-rules/frontend/performance.md`, AGENTS.md). Load only the photos it uses, `lucerne-swan` and `rigi-kaltbad` for step 1, through `@/lib/photos`. The card uses `lake-steamboat`.
- **Layout shift.** The list re-ranks once after hydration. Re-rank only on first render and on an answer change (ADR-006), with the slide described above.
- **Components.** HeroUI `Modal`, `TagGroup`, `Tag`, `Button`. Icons from `@/components/icons` (`SelectedIcon`, `PlusIcon`, `ChevronLeftIcon`, `CloseIcon`). Do not use `SheetFrame` (a modal drawer).
- **Tests.** Playwright `[E4.5][AC24][AC36][AC37][AC44][AC91][AC92]` in EN and DE at 375 px. Cover: step 1 Skip lands on step 2 with focus on the heading, × and Escape rules, nothing returns after a skip, hide-then-Explore still opens the flow, staff see nothing, a returning guest sees only the sorted line.

## 6. Open points

Decided on 2026-10-28 and no longer open: N24 shows on story pages only, N24 stays a card (the thin banner was tried and rejected), and in change mode a tapped stay saves at once.

1. **Consent box (O32).** Order against N01 and the card is open. Proposal: onboarding first, consent second, never both at once.
2. **German copy** needs merchant review. The German description wraps to three lines (section 3).
3. **Search engines.** Check a crawler render of the home before launch to see whether N01 covers it (E9.6).
4. **Card size against guidance.** The card is larger than the thin banner that Nielsen Norman Group and Google favour. The owner chose it on purpose. Revisit only if a launch check (for example a crawler render or a search-landing review) flags it.
5. **Not tested in a real browser:** reduced motion, screen readers, touch, Shift+Tab wrapping, Escape pressed from the card's button, and real-device font rendering of the German card. Test them in E4.5.
6. **The visit-scoped flag** (card hidden for this visit) is not shown by the lab. Build it in `sessionStorage` or memory.

## 7. Lab files (visual reference)

All under `front-end/src/`:

- `routes/lab.onboarding-fullscreen.tsx`: the page, with a visitor switcher that shows the rule matrix.
- `features/lab/onboarding-fs-options.tsx`: F1 (steps, controls, choice cards).
- `features/lab/onboarding-fs-nudges.tsx`: N2.
- `features/lab/onboarding-fs-kit.tsx`: the dialog shell, the stage rules, the sorted line, the scroll logic of N2.
- `features/lab/onboarding-fs-data.ts` and `onboarding-data.ts`: copy, the AC38 fixture, a lab-only ranker, the flow hook.
- `features/lab/onboarding-kit.tsx`: the phone frame, the ranked list and the mock story.

## 8. Rejected alternatives

- In-page cards and strips for N01, and a bottom peek (the first lab page, removed).
- Photo-led full-screen flow (F2), one-tap flow (F3) and an optional welcome screen. F2 loaded 8 photos on a first visit and had unproven text contrast on photos.
- A wrapping row of centred chips, and a red tint fill with an inline check for the selected state.
