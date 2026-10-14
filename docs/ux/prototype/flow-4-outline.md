# Flow 4 outline: discovery, content and requests

Step 4.0 in [the Phase 4 checklist](todo-phase4.md). Approved by the owner on 14 October 2026, with decisions D1–D12 and assumptions A1–A5 in section 7.

Sources:
- **PRD v2:** §3.1, §11, §12, AC16, AC17, AC18, AC30
- **UX spec:** §1.3, §1.5, §3.1, §3.2, §4.1, §4.9, §4.10, §4.11, §5.1, §5.2, §5.5, §6 (N16, N17), R02, R08, R09, scenario S10
- **Frontend conventions:** [front-end/README.md](../../../front-end/README.md) and [the design system](../design-system/project/README.md)

Phase 4 builds on approved screens, so it has no design gallery like Phase 2. Each screen names the approved screen it must match (section 2). Guest screens use impeccable. Merchant screens use evon.

## 1. The demo path

The prototype bar switches roles. Each step names the acceptance criterion or scenario it proves. The demo starts signed out, in EN.

**Guest**

1. **Discovery home (C01, step 4.2).** The guest lands on C01. Below the category rail, the time blocks come first: "Have 2 hours in Lucerne?" shows quick-pickup gifts and a short walking story. "A few days here?" shows tours and longer stories. The engraved gifts rail, the stories rail and the Polaroid advice banner (layout J) follow. The stories rail shows real EN articles, and each card opens C20. A floating "Trip advice" button sits bottom-right above the tab bar. The page looks the same with or without a partner source (AC24).
2. **Stories (C19, step 4.3).** "See all" on the stories rail opens C19, which lists EN articles only. Switching to DE changes the list: the DE-only article appears and the EN-only article disappears.
3. **Article (C20, step 4.4).** The guest opens "A morning on the Musegg wall", a blog page per R17: a large cover, the author, a contents bar that follows the reader through four sections, photos, a YouTube video that loads on tap and a recorded tower bell. Below the story are the linked tour (C09) and gift (C03) in the order the shop chose (R16), then the comments. Signed out, the comment box is a "Sign in to comment" button. It opens C05, and sign-in returns to the same article with the comment box open (AC16, S10). The guest posts a comment, and it appears at once (D11).
4. **Other language only (C20, D6).** The guest opens the EN-only article and switches to DE. The article stays in EN with a language notice, and the interface, dates and buttons turn German (R02, AC30).
5. **Trip advice (C21, step 4.5).** The floating button opens C21, a chat with the shop's AI assistant (R19). The assistant greets the guest and asks the shop's questions one at a time as messages; choices are offered in the conversation under the question (in the C03 gift option style), while a counter, a date button (calendar sheet) or a text box sits in the composer; the assistant types briefly before each new message, and only the conversation scrolls. Each answer appears as the guest's message. Optional questions offer "Skip". In DE, the question that has no German text shows the English wording with a language notice (D7). For now the assistant asks only these questions: it answers nothing typed freely and generates no plan. It then asks for the email, required, with no sign-in (AC18, R08), and shows a summary card with "Send" and "Change an answer". After sending it says: "Thank you. Our team has received your details and will contact you by email to continue the conversation." No reply time. Email N16 arrives in the shop's request mailbox (step 4.17).
6. **Private tour (C22, step 4.6).** On the Tours tab, a "Private tour" entry below the list opens `/tours/private-tour`. The guest gives group size, preferred dates, interests and email, then sees the sent state from C07. Email N17 goes to Owner and Manager.
7. **Trip profile (C23, step 4.7).** In Account, a new "Trip profile" row opens the sub-screen. Without answers, the guest sees the empty state with "Add trip details". They add travel style and dates, then edit one. The next C07 or C13 shows these answers instead of asking again (R09).

**Merchant** (switch to **Merchant · Owner**; Manager has the same access, D12)

8. **Products (M11, step 4.8).** Products has tabs for Gifts, Tours and Pickup points (D3). Each gift and tour card shows a publish chip ("Published" or "Draft") and EN/DE completeness, for example "DE missing". The limited-edition print shows "DE missing" but stays published (R02).
9. **Edit gift (M12, step 4.9).** The Owner opens the pocket knife. The EN/DE tabs hold the name, story and cancellation policy. The page also covers variants and stock, engraving (12 characters), preparation days and date mode, pickup places, payment policy with the first-payment deadline (24 hours), and commission rate. After saving, C03 shows the change. Unpublishing a gift removes it from C02 and C01.
10. **Edit tour (M13, step 4.10).** The Owner opens the Lucerne old-town walk. The EN/DE tabs hold the description, itinerary, inclusions, exclusions and meeting point. The page also covers age groups, departures with seats and price, policies and commission. A new departure appears on M05 and C10 with the same seat count. Seats can't be reduced below the seats already booked (A4).
11. **Pickup points (M14, step 4.11).** On the Pickup points tab, the Owner edits Pickup point Bahnhof's opening hours and DE instructions. C03 and the matching C15 order show the new text.
12. **Articles (M17, step 4.12).** Content has tabs for Articles, Comments and Reviews. Articles are listed by language with a Draft or Published chip. The Owner opens the seeded DE draft, adds a photo block, links a gift and a tour and puts the tour first (R16), and publishes it. The article appears on C19 in DE only, with the links in that order on C20 (AC31). Unpublishing the linked gift in M12 removes it from the article.
13. **Comments (M18, step 4.13).** The guest's comment from step 3 is listed with its article. The Owner replies, hides another comment, and deletes a spam comment through the shared confirmation dialog. C20 shows the reply and no longer shows the hidden or deleted comments (AC16).
14. **Reviews (M23, step 4.16).** The Reviews tab lists gift and tour reviews. The Owner replies to one review of each. The replies show on C03 and C09. There is no delete button.
15. **Advice requests and questions (M19, step 4.14).** Requests has tabs for Advice, Private tours and Questions. The request from step 5 shows its language, email, and each question with the wording as sent. In Questions, the Owner adds the missing DE text, which clears the warning. They also reorder two questions, mark one optional and change the recipient email. A seeded older request still shows its old wording. The next C21 request uses the new set (AC18).
16. **Private tour requests (M20, step 4.15).** The request from step 6 is new. The Owner replies by email outside the app, then marks the request "Answered" (D9).

**Side paths shown from seeded data or prototype actions:**

| Case | How it's shown | Proves |
| --- | --- | --- |
| No stories in a language | The Owner unpublishes every DE article in M17. C19 in DE shows the empty state: one sentence and a "Back to home" action. | §5.1 |
| Missing email on advice | The guest sends from the review step with no email. An inline error appears, focus moves to the field, and every answer is kept. | AC18, S10 |
| Questions change mid-request | In one tab: the guest answers two C21 questions, the prototype bar switches to Owner, who edits the set in M19, then switches back to Guest. The open request keeps the set it started with, and the next request uses the new one. (Demo state does not sync between browser tabs.) | AC18 |
| Hidden comment | A seeded hidden comment is visible in M18 with a "Hidden" chip, and C20 doesn't show it. | AC16 |
| Review without reply | Seeded reviews with and without replies show side by side on C03. | §4.11 |
| Private-tour validation | A group size of 0, no dates or an invalid email each show an inline error, and the entered data is kept. | §5.5 |
| Trip profile empty | A new guest sees the C23 empty state. | §5.1 |
| Refresh | Refreshing C21 mid-flow keeps the answers. Refreshing an editor keeps the saved data and drops unsaved edits. | §5.5 |

## 2. Screens and states

| Step | Screen | Content | States | Matches · skill |
| --- | --- | --- | --- | --- |
| 4.2 | C01 Discovery home | Time blocks around the current rails, stories rail with real articles, floating "Trip advice" button (also on C09 and C20) | Skeleton; no stories in this language (stories rail hidden) | Approved C01 (1.2) · impeccable |
| 4.3 | C19 Stories | Article cards: photo, serif title, read time | Empty in this language; skeleton | C02 gift list · impeccable |
| 4.4 | C20 Article | Cover with title, author, date and read time, intro, sticky contents bar with progress, sections with photos, YouTube video and audio (R17), linked gifts and tours in the shop's order (R16), comments, comment bar | Signed out ("Sign in to comment"); only in the other language; no links (section hidden); no comments yet | C03 detail frame; comments match the review cards · impeccable |
| 4.5 | C21 Trip advice | Chat with the shop's AI assistant (R19): question messages, the matching input at the bottom, answers as the guest's messages, email, summary card with Send and Change, thank-you message | Required answer empty; missing email; missing translation; sent | Chat thread in the app's style; answer controls from C07 · impeccable |
| 4.6 | C22 Private tour request | Group size, preferred dates, interests, email | Validation; sent | C06 sheets, C07 sent · impeccable |
| 4.7 | C23 Trip profile | Travel style, arrival date, departure date | Empty; answered; editing | 1.12s account sub-screen · impeccable |
| 4.8 | M11 Products | Gifts, Tours and Pickup points tabs; cards with publish chip and EN/DE completeness | Empty tab | M03 list cards · evon |
| 4.9 | M12 Edit gift | EN/DE tabs, variants and stock, engraving, preparation days and date mode, pickup places, payment policy and deadline, cancellation, commission | Required field missing; DE missing (warning, not a block) | M04 · evon |
| 4.10 | M13 Edit tour | EN/DE tabs, itinerary, inclusions, exclusions, meeting point, age groups, departures with seats and price, policies, commission | Seats below booked; DE missing | M07 and M05 · evon |
| 4.11 | M14 Pickup points | Name, address, opening hours, EN/DE instructions | DE missing | M04 · evon |
| 4.12 | M17 Articles | List by language (Draft or Published); section editor (heading, paragraph, photo, YouTube, audio), author, cover; up to 6 ordered gift and tour links (R16, R17) | Empty language; DE missing; link limit reached; linked item unpublished | M03, M04 · evon |
| 4.13 | M18 Comments | Comment, article, guest, time; hide, delete, reply | Hidden; empty | M03 · evon |
| 4.14 | M19 Advice | Inbox with answers as sent; question set editor (EN/DE text, order, answer type, required, missing-translation warning, recipient email) | Empty inbox; missing translation | M03, M04 · evon |
| 4.15 | M20 Private tours | Inbox with group size, dates, interests, email; "Mark answered" | New; answered; empty | M03 · evon |
| 4.16 | M23 Reviews | Gift and tour reviews; reply, no delete | Replied; not replied; empty | M03 · evon |

## 3. Routes

| Route | Screen | Note |
| --- | --- | --- |
| `#/stories` | C19 | Replaces the placeholder. `stories.tsx` becomes `stories/index.tsx`. |
| `#/stories/{slug}` | C20 | Both language versions of an article share one slug. The route shows the current language, or the other with a notice (D6). |
| `#/plan` | C21 | Replaces the placeholder. The step and answers live in demo state, so refresh keeps them. |
| `#/tours/private-tour` | C22 | A static segment, which takes priority over `/tours/$slug`. No tour may use the slug `private-tour`. |
| `#/account?tab=trip` | C23 | A new `trip` value in `accountSections` (D2). |
| `#/store/products` | M11, M14 | Tabs: Gifts, Tours, Pickup points (D3). |
| `#/store/products/gifts/{id}` | M12 | |
| `#/store/products/tours/{id}` | M13 | |
| `#/store/content` | M17, M18, M23 | Tabs: Articles, Comments, Reviews (spec §3.2). |
| `#/store/content/articles/{id}` | M17 editor | `new` creates a draft. |
| `#/store/requests` | M19, M20 | Tabs: Advice, Private tours, Questions. |
| `#/store/requests/advice/{id}` | M19 request | |

`products`, `content` and `requests` leave the `$section` list. The other placeholders (partners, reports, settings) stay. The folder layout follows `store/orders/` and `store/bookings/`.

## 4. Mock data and model changes

Step 4.1 adds the seeds. Model changes come first, so later steps edit real records.

| Data | Change | Why |
| --- | --- | --- |
| Pickup places | Move from the static `pickupPlaces` export in `catalog/seed` into demo data, then delete the export. It is the only source, imported by 15 files: C03 (`use-gift-detail`), C04, C06, C07, C09 (`tour-detail-page`), C14 rows, C15 (`use-order-detail`), M02 analytics, M03, M04 and its decision block, the mail renderer, and three lab routes. | M14 edits must show on C03 and C15 (D4) |
| Reviews | Add an optional `reply` (text, language, by, at). Gift and tour reviews already live in demo data. | M23 replies must show on C03 and C09 (D4) |
| Products | Add `published` to gifts (tours already have it). A missing value counts as published, so stored products from before Phase 4 stay visible. EN/DE completeness is computed from the required text fields, not stored. | M11 publish state, R02 |
| Articles (new) | `slug`, `language`, title, excerpt, author, intro, sections of blocks (paragraph, image, video, audio), cover photo, read minutes, up to 6 ordered gift and tour links, `draft` or `published`, dates | C19, C20, M17 (R16, R17) |
| Comments (new) | Article slug and language, guest or merchant author, text, time, `hidden`, optional parent comment (one level of replies) | C20, M18 |
| Advice question set (new) | Recipient email, ordered questions: id, EN/DE text, answer type (number, single choice, multiple choice, date, short text), options, required | C21, M19 |
| Advice requests (new) | Time, language, email, and each answer with a copy of the question wording as sent | M19, AC18 |
| Advice draft (new) | The set in use, current step and answers | C21 refresh, mid-request changes |
| Private-tour requests (new) | Time, language, group size, date range, interests, email, `answeredAt` | C22, M20 |

**Keeping stored state (D5).** A browser that saved demo state before Phase 4 has none of the new collections. On load, missing collections are filled from the seed, the same way `demo-store.tsx` already backfills tour data and tour reviews. `DEMO_VERSION` stays the same, so nobody's demo state is wiped. Changed fixtures appear after Reset.

**Seeds (step 4.1).**
- **Articles.** Three published in both EN and DE, including "A morning on the Musegg wall", "The story behind the Lion Monument" and "Crossing the lake by steamboat" from the current teasers. One EN only, one DE only, and one DE draft. Each published article links at least one gift or tour. First-person text is framed as inspiration, and nothing unconfirmed is shown as bookable (PRD §11).
- **Comments.** Four on the Musegg article: one with a merchant reply, one hidden, and one spam for the delete demo.
- **Advice questions.** Seven in this order: adults, children, interests, arrival date, departure date, travel style, anything else. The "anything else" question has no DE text. The recipient is the shop's request address. This set is sample content, not the shop's final questions (PRD §12).
- **Advice requests.** Two. One was sent with older wording, to prove that old requests keep their context.
- **Private-tour requests.** Two: one new and one answered.
- **Reviews.** Existing gift and tour reviews. One of each already has a reply.
- **Pickup places.** Shop Altstadt and Pickup point Bahnhof, unchanged.

## 5. Notifications

Step 4.17 adds two templates to the existing Mail panel. Both types already exist in `MailTemplate`.

| Mail | Recipient | Content | Language |
| --- | --- | --- | --- |
| N16 New advice request | The M19 recipient email | Every question as sent, with its answer, the guest's email and language | The shop's default language, EN (D10) |
| N17 New private-tour request | Owner and Manager | Group size, preferred dates, interests, guest email | Each recipient's interface language |

Each mail links to its request in M19 or M20. The guest gets no confirmation email for either request; the sent screen is the confirmation (A2).

## 6. Not in Phase 4

- Money operations, refunds and adjustments: Phase 3.
- Partner management and full reports, including trip-profile reporting: Phase 5. C23 only stores the answers.
- M22 settings (members, payout account, policies): Phase 6. M14 lives under Products until then (D3).
- Sending replies from the app: merchants reply by email outside the app (D9).
- Review editing, review photos and comment pre-approval. These remain open (O15, Q1). Comments allow one level of replies (A3).
- Blog maps (PRD §11, O12). Pre-recorded audio and YouTube video are in scope (R17).
- Linking advice answers to the trip profile.

## 7. Decisions

| # | Decision | Chosen |
| --- | --- | --- |
| D1 | Trip-advice entry (Q2) | Keep the Polaroid banner (layout J, chosen 13.10.2026) and add the floating button on C01, C09 and C20. Both open C21. |
| D2 | C23 route | `/account?tab=trip`, a 1.12s sub-screen |
| D3 | M14 placement | A Pickup points tab under Products, until Settings arrives in Phase 6 |
| D4 | Editable shared data | Pickup places move into demo data. Reviews, already in demo data, get a `reply`. |
| D5 | Stored demo state | Fill missing collections from the seed on load; no version bump |
| D6 | Article in the other language only | Shown when the guest switches language on an article, or opens a link to a version that doesn't exist in their language. C19 lists the current language only. |
| D7 | Advice question without a translation | Show the existing wording with a language notice (AC30 pattern) |
| D8 | C22 rules | No sign-in. Email required. Group size 1–50. |
| D9 | M20 "Answered" | Marked by hand; the reply happens outside the app |
| D10 | N16 language | The shop's default language, EN |
| D11 | Comment moderation (Q1) | Comments appear at once; the merchant can hide them |
| D12 | Who edits products and content (Q3) | Owner and Manager |
| D13 | Story links, blog layout and related stories (owner, 14.10.2026) | R16: up to 6 published gifts and tours per language version, in the shop's order; unpublished items hide, sold-out gifts show as sold out; links do not change attribution. R17: cover, author, contents bar, photos, YouTube on tap, pre-recorded audio; no AI audio. R18: "More to discover" with up to 3 stories the shop picks per language version, else the newest others; comments show the 3 most recently active threads, all of them in a sheet |
| D14 | Trip advice as an AI chat (owner, 14.10.2026) | R19: C21 is a chat with the shop's AI assistant, labelled as AI. For now it only asks the configured questions in order, with no free answers and no plan; a summary card with Send and Change ends it, then a thank-you that the team will reach out by email. A real AI agent is a later stage (PRD O19). Replaces the earlier "never say AI" rule for C21 only |

**Assumptions beyond D1–D12, confirmed by the owner on 14 October 2026**

| # | Assumption | Why |
| --- | --- | --- |
| A1 | C22: preferred dates required, interests optional | Group size, dates and email are needed to quote; interests help but shouldn't block |
| A2 | The guest gets no confirmation email for advice or private-tour requests; the sent screen is the confirmation | Spec §6 lists N16 and N17 to the shop only |
| A3 | Comments: signed-in guests and the merchant can reply to a comment, one level deep | PRD §11 lets guests reply in discussions; one level keeps C20 and M18 simple |
| A4 | M13: a departure's seats can't drop below the seats already booked | Keeps M05 and M13 consistent |
| A5 | The seven sample advice questions in section 4 | PRD §12 examples, labelled as sample content |

Proposals inherited from the spec and still marked as proposals in the app: the advice-question copy kept with each request (AC18 "as proposed"), review replies (§4.11), and the sample question set.

## 8. Coverage check

Step 4.18 runs each case at 375px in EN and DE. It also runs the typecheck, lint and production build, and rechecks the gift and tour flows where shared data changed.

| Criterion | Demo steps | Verification case |
| --- | --- | --- |
| AC16 | 3, 12, 13 | Signed out, the guest sees "Sign in to comment" and C05 returns to the article. A posted comment appears on C20. A hidden or deleted comment is gone from C20. Publishing a draft shows it on C19 in its language only. Only the Owner and Manager roles reach M17 and M18. The prototype has no Super Admin role, so "Super Admin does not edit the blog" holds by construction. |
| AC17 | 14 | Unchanged from Phases 1 and 2: only a completed order or booking can be reviewed. M23 has no delete control. Replies appear on C03 and C09. |
| AC18 | 5, 15, side paths | C21 works signed out. Sending without an email is blocked and keeps the answers. Questions follow the set order, with no branching. The request appears in M19, and N16 is sent. After a question edit, the old request shows its original wording. |
| AC30 | 4, 5, 8 | The EN-only article in DE and the untranslated question in DE both show a notice. A product missing DE stays published in M11. |
| AC31 | 3, 12 | The links show in the shop's order on C20, per language version; at most 6; an unpublished gift disappears from the article; attribution unchanged. |
| AC32 | 3 | Cover, author and contents bar; the active section follows scrolling; the YouTube player loads only after tapping play; the audio plays from the uploaded file. |
| AC33 | 3, 12 | "More to discover" shows the shop's picks, or the newest other stories in the same language; never the story itself, a draft or another language. |
| AC34 | 5 | The assistant asks one question per message in the shop's order; the input matches the question type; answers show as the guest's messages; nothing typed freely gets an answer; the summary offers Send and Change; the thank-you names email and no reply time. |
| S10 | 3, 5, 7, 15 | Unsigned advice with email, the missing-email prompt with answers kept, the request visible to the merchant, sign-in required to comment, and trip profile answers stored. |
| Shared data | 9, 11, 14 | The M12 edit shows on C03, the M14 edit on C03 and C15, the M13 departure on M05 and C10 with the same seats, and the M23 reply on C03 and C09. |
| General | All | Keyboard and focus, inline validation, empty states, long German labels, refresh, Reset, and no "AI" or reply-time wording |
