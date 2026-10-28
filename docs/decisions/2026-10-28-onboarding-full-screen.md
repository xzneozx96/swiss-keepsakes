# Full-screen onboarding for guests, a small prompt for deep links

- Date: 2026-10-28
- Status: **approved on 2026-10-28** (approval given in chat by the person who made the request). The documents named below were updated on the same day
- Changes (once approved): `docs/PRD/Swiss_keepsakes_PRD.md` §3.1, §6.1, AC24, AC36, new AC91 and AC92, O32; `docs/adr/ADR-006-browser-personalisation-and-map-data.md`; `docs/specs/001-storytelling-pivot/architecture.md`; `docs/development-plan/delivery-plan.md` E4.5 and E4.13; `docs/development-plan/screen-inventory.md` N01, Area 1 and slice S1
- Source: the request of 28.10.2026 with two reference images (`docs/ux/references/onboarding/`), and the stated rule that onboarding is for guests only. Approved as above

## Intent

The request is for the usual kind of onboarding: a full-screen flow shown the first time a visitor uses the app, which records their preferences. PRD v3 asked for the opposite. It says onboarding "never blocks the page the visitor opened" (§3.1, AC24, AC36), so that a visitor who arrives from a partner QR code, a search result or a link to a story reads the content at once.

The proposal keeps that promise for visitors who arrive on a deep link and gives it up for the visitor who opens the app at its front door.

## The rule

**Terms.**
- *Unanswered* means `sk.onboarding` holds no answers and no skip.
- *Visit* means one session in the browser. A guest who comes back days later starts a new visit.
- *Entry* is how the current visit began: the first page, and whether it came from a partner QR code or link (`/r/$code` in this visit) or from a search result. It belongs to this visit only. It is not the 30-day attribution of PRD §10.1, which may not exist without consent (O32), and it is not part of `sk.onboarding`. The client keeps it in memory or `sessionStorage`.

**Rules.**
1. **Guests only.** Onboarding never shows to a merchant, a partner or a Super Admin. That covers a signed-in account with one of those roles and the screens `/store`, `/partner`, `/admin`, `/sign-in` and `/invitation`. A signed-out visitor and a signed-in guest are guests.
2. **Front door: full screen.** The two-step full-screen flow shows when the guest is unanswered and the entry of the visit is the home (`/$lang`) with no partner QR or link and no search result. Step 1 is the visitor type, step 2 is the interests. Both steps can be skipped and closing counts as skipping.
3. **Deep link: never covered.** If the entry is any other page (a story, a map pin, a keepsake), or a partner QR code or link, or a search result, the page shows at once. Only a small prompt appears, floating over the screen and not inserted into the content, with the same two steps (screen N24). The full-screen flow then shows the first time that guest opens Explore from inside the app during the same visit, while still unanswered.
4. **Returning guest.** An unanswered guest who ignored the small prompt and returns days later straight to the home starts a new visit with the home as the entry, so the full-screen flow shows.
5. **No return after a skip.** Skipping or closing the full-screen flow does not bring it back on its own. The guest reopens it from the Account tab or from the "Sorted for … Change" line on the home (the guest shell has no menu). Closing the small prompt only hides it for the current visit (decided on 28.10.2026, below).
6. **Answers stay on the device.** Nothing changes in ADR-006 on storage, ranking or analytics.

**Decided on 28.10.2026: closing the small deep-link prompt only hides it for this visit.** It is not a skip. The full-screen flow still shows at the first Explore opening of that visit or of a later one, while the guest is unanswered. A skip inside the full-screen flow stays permanent. The alternative, counting the close as a skip, was rejected because it would stop the full-screen flow from recording preferences for every guest who arrives by a deep link.

Cost: one more interruption for a guest who closed the small prompt, and a visit-scoped flag in `sessionStorage` besides `sk.onboarding`. AC91 and the ADR-006 note already say this. 

## What this changes

### PRD §3.1 (Vietnamese, replaces the first paragraph)

Before:

> Khi khách chưa trả lời, trang hiện onboarding hai bước dưới dạng lời nhắc đóng được. Onboarding không bao giờ chặn trang khách đang mở, kể cả khi khách vào thẳng một câu chuyện, bản đồ hoặc sản phẩm qua link hay tìm kiếm: nội dung hiện ngay, lời nhắc nằm phía trên hoặc bên cạnh nội dung. Đóng lời nhắc tương đương bỏ qua. Thứ tự hiện của lời nhắc và hộp đồng ý theo dõi còn mở (O32).

After:

> Onboarding chỉ dành cho khách. Merchant, đối tác và Super Admin không bao giờ thấy onboarding, kể cả khi mở trang công khai, và các màn hình `/store`, `/partner`, `/admin`, đăng nhập và lời mời không hiện onboarding.
>
> Khi khách chưa trả lời và chưa bỏ qua, nếu trang đầu tiên của lượt truy cập hiện tại là trang chủ (màn hình Khám phá) và khách không đến từ QR hoặc link đối tác hay từ kết quả tìm kiếm, ứng dụng hiện onboarding hai bước **toàn màn hình** trước nội dung. Nguồn của lượt truy cập chỉ tính cho lượt đó, không phải cửa sổ giới thiệu 30 ngày của §10.1; khách quay lại sau vài ngày bắt đầu một lượt mới. Khách bỏ qua được ở cả hai bước và đóng được bất cứ lúc nào. Đóng tương đương bỏ qua và onboarding không tự hiện lại.
>
> Khách vào một trang khác trang chủ (câu chuyện, điểm bản đồ, sản phẩm), hoặc đến từ QR hay link đối tác hoặc từ tìm kiếm, không bao giờ bị che trang đó: nội dung hiện ngay và chỉ có một lời nhắc nhỏ đóng được, nổi trên màn hình, không chèn vào nội dung, với cùng hai bước. Lời nhắc hiện 10 giây sau khi trang mở, nên trang đích hiện ngay và không bị che lúc đầu. Onboarding toàn màn hình hiện ở lần đầu khách mở màn hình Khám phá từ trong ứng dụng trong cùng lượt truy cập, nếu khách chưa trả lời và chưa bỏ qua. Thứ tự giữa onboarding và hộp đồng ý theo dõi còn mở (O32).

The numbered steps, the four rules and §3.2, §3.3 stay as they are.

### PRD §6.1, step 1 of the typical journey

Before: `1. Khách mở trang, nội dung hiện ngay. Khách trả lời onboarding hoặc đóng lời nhắc (§3.1).`

After: `1. Khách mở trang qua QR, link hoặc tìm kiếm: nội dung hiện ngay, khách trả lời lời nhắc nhỏ hoặc đóng nó. Khách mở thẳng màn hình Khám phá lần đầu thấy onboarding toàn màn hình (§3.1).`

Examples 1 (Mai, partner QR) and 2 (Tom, search) stay as written. Both arrive on a deep link or a referral, so each sees the small prompt, which matches "above" and "beside".

### PRD acceptance criteria

| Id | Change | New wording of the Result column (Vietnamese) |
| --- | --- | --- |
| AC24 | Reword | Nội dung hiện ngay, khách không phải chọn gì trước; trên trang đích onboarding chỉ là lời nhắc nhỏ đóng được, không toàn màn hình; referral ghi theo cửa sổ 30 ngày |
| AC36 | Reword. New situation: `Khách mở ứng dụng lần đầu và vào thẳng trang chủ, không qua QR, link đối tác hay tìm kiếm` | Onboarding toàn màn hình hiện trước nội dung: bước 1 (short-stay hoặc multi-day) rồi bước 2 (bốn sở thích, chọn một hoặc nhiều); bỏ qua được ở cả hai bước; đóng hoặc bỏ qua thì không hiện lại; không cần tài khoản. Khách quay lại sau vài ngày vào thẳng trang chủ khi vẫn chưa trả lời cũng thấy onboarding toàn màn hình |
| AC91 | New. Situation: `Khách lần đầu mở trang qua QR hoặc link đối tác, kết quả tìm kiếm hoặc link sâu (câu chuyện, điểm bản đồ, sản phẩm)` | Trang đích hiện ngay và không bị che; chỉ có lời nhắc nhỏ nổi trên màn hình, không chèn vào nội dung, đóng được (đóng chỉ ẩn lời nhắc trong lượt này); lần đầu khách mở Khám phá từ trong ứng dụng trong cùng lượt, nếu chưa trả lời và chưa bỏ qua, onboarding toàn màn hình hiện |
| AC92 | New. Situation: `Merchant, đối tác hoặc Super Admin đăng nhập mở trang công khai, hoặc bất kỳ ai mở /store, /partner, /admin, đăng nhập, lời mời` | Onboarding không hiện; nội dung theo thứ tự mặc định (mới nhất trước) nếu không có câu trả lời |

AC37 is unchanged. The ids AC91 and AC92 are free. The phase column of all four stays "Phase 1".

### PRD O32

Before: `Thứ tự và vị trí giữa lời nhắc onboarding và hộp đồng ý theo dõi lần đầu; …`

After: `Thứ tự giữa onboarding (toàn màn hình hoặc lời nhắc nhỏ) và hộp đồng ý theo dõi lần đầu; đề xuất: onboarding trước, hộp đồng ý sau, không bao giờ cùng lúc; …` The rest of the row stays. It remains open and still needs the lawyer.

### ADR-006

Add under the first amendment: **Amended 2026-10-28.** The prompt has two forms. A full-screen flow on a guest's first visit at the home, and a small in-page prompt on a deep link or a referral (this record). Guests only. Both forms are client code after hydration, so the server HTML stays the same for every visitor and crawler. The form is chosen from the entry of the current visit (first page, a partner QR or link in this visit, the search referrer), kept in memory or `sessionStorage` for that visit. It is not the 30-day attribution and not part of `sk.onboarding`. The reopen entry sits on the Account tab and on the "Sorted for … Change" line, because the guest shell has no menu. The storage record `sk.onboarding` and `rankItems` do not change.

### Architecture document

Quote and replace these sentences (line numbers drift in the shared tree):
- In the personalisation rule, "A dismissed onboarding prompt does not return on its own, and the visitor reopens it from the menu (orchestrator ruling)." becomes the same sentence ending "from the Account tab or the home".
- In the release table, row 4: "onboarding prompt that never blocks" becomes "full-screen onboarding on a first visit at the home and a small prompt on deep links, for guests only".
- In the orchestrator rulings paragraph, "a dismissed onboarding prompt does not return on its own and is reopened from the menu (ADR-006)" gets the same fix.

### Delivery plan

- **E4.5.** Rename to "Onboarding N01: full-screen flow and the deep-link prompt." The first sentence becomes: a full-screen two-step flow on a first visit at the home and a small non-blocking prompt on a deep link or a referral, for guests only. The rest stays (answers in `sk.onboarding`, reopen entry on the Account tab and the home line, immediate re-rank). Add acceptance criteria for AC36, AC91 and AC92 and the focus rules below. Replace "the prompt never blocks (AC24, AC36)" with "a deep link is never covered (AC24, AC91)". **Re-estimate the points (now 5):** there are two forms, entry detection and an accessible blocking layer.
- **E4.13.** "the onboarding prompt while unanswered" becomes "the full-screen onboarding on a first visit, or the small prompt after a deep link". The AC24 check stays, since a QR visitor still sees content at once.

### Screen inventory

Suffixed ids do not work in this repo (the trace script does not read `E3.5b`, and removed ids are never reused), so the small prompt gets a new id.

- **N01** becomes the full-screen flow, a layer over the whole guest shell, tab bar included. Its "Reused components" cell drops `SheetFrame`, which is a modal drawer and fits neither form.
- **N24 is new:** the small in-page prompt for deep links, in slice S1, Track 1, guest, client only, UI work Design. It shares the two steps and the copy with N01.
- **Area 1** is rewritten from this rule, and the slice S1 goal becomes "A full-screen first-visit flow and a small deep-link prompt whose answers re-rank every public list".
- **Counts that move:** table 2 New 21 to 22; the Counts table Guest New 4 to 5 and Track 1 New 10 to 11; the S1 index row to New 2 and UI design 2; the index Total row to 22 New and 39 Design. The "Hide", "Keep" and "Redesign" counts do not change.
- **Open items:** O25 and O32 name `N01` in the "Blocks" column. Add `N24` to both rows. S1 already lists O25 and O32, so the build script's "Blocked by" check is unaffected either way.
- Add this decision to the "Decisions" table as D8, and record the owner's answer to the closing-the-prompt question there.

## Build notes for E4.5

- The full-screen flow is a modal dialog: `role="dialog"` and `aria-modal`, focus moves into it and returns after, the background is inert, Escape and a visible Skip close it, and it respects reduced motion.
- Role gating reads the session. Wait until the session is known before showing anything, so a signed-in merchant never sees a flash of the overlay.
- Entry detection runs on the client after hydration: first page of the visit, the referral state from `/r/$code`, and `document.referrer`. When the referrer is empty and the page is the home, treat it as a direct visit.
- Server-rendered HTML never contains the overlay.

## Risks and what was not checked

- **Search engines.** A full-screen layer on a home page reached from a search result could count as an intrusive interstitial. I believe Google's mobile guidance penalises that, but I did not read the current text. The rule already sends search landings to the small prompt. A crawler has no stored answers and arrives with no referrer, so it may render the home in the first-visit state and see the overlay. Check this against a crawler render before launch, and decide whether the overlay waits for the first user interaction. Put this on the E9.6 list.
- **Merchants testing personalisation.** A signed-in merchant sees the default order and no onboarding on public pages. They must use a guest session or a private window to test ranking.
- **QR to a deep path.** A partner QR that points to a story already gets the small prompt. A partner QR that points to the home gets it too, because referral state wins over the landing page. The PRD example 1 relies on this.
- **Cost.** Two forms of the same two steps mean two designs, two sets of tests and the entry-detection logic. The lab has both: `/lab/onboarding` (small prompt, option A) and `/lab/onboarding-fullscreen`.
- **Not verified.** The legal side (O32), the German wording, and any behaviour in a real browser.

## Addendum: final design (2026-10-28)

After the lab review the requester chose the designs below. N01 (F1) is final. N24 is final too: option N2, a card that floats at the top while the guest reads. The full specification, with copy, states and build notes, is `docs/ux/onboarding-design.md`. The visual reference is the lab page `/lab/onboarding-fullscreen`.

- **N01, the full-screen flow: option F1 "Guided".** Two progress bars, a big title with one line under it, full-width option cards, one full-width red button. No step label above the heading. Every choice uses the app's existing selected pattern (red border, normal fill, check badge on the top-right edge, as in `gift-detail.tsx`). Cards never change position or size between states.
- **N24, the small prompt: option N2, a card at the top while reading.** A 168 px card with a small photo, a title, a one-line description and a full-width button. It was slimmed to a thin banner (title, button and close, no description, no photo) on 2026-10-28 because research (Nielsen Norman Group, Google) favours thin, easily dismissed banners. The requester then rejected the banner as visually poor and restored the card. The card is therefore larger than that guidance suggests, and the requester chose it knowingly. It floats at the top of the screen. It is never inserted into the content, and the content never moves when it appears or closes. It appears 10 seconds after the story page opens and stays until the guest hides it or leaves the story. The requester replaced the first trigger (after the first paragraph scrolled away, tucked away on scrolling down, back on scrolling up) on 2026-10-28 because it felt unstable. Because it is timed, it can float over text the guest is reading. The close button and Escape hide it for this visit only. The earlier inline card, the thin banner and the other two floating options (a pill above the tab bar, a corner button) were rejected.
- **N24 wording** (EN), chosen on 2026-10-28: title "Find what you’ll love in Lucerne", description "Tell us about what you love, and discover places picked just for you.", button "Personalize my visit". The German is a proposal that needs merchant review.
- **N24 shows on story pages only.** On a map pin card, a keepsake page or any page that is not a story it does not show. Those visitors still get N01 at their first Explore opening.
- **In change-my-answers mode a tapped stay saves at once**, so Close keeps it.
- **Skip on step 1 goes to step 2** and saves no stay answer. The close button and Escape end the whole flow and count as skipping. On step 2, Skip, close and Escape end the flow, keep the stay answer and drop the interests.
- **In change-my-answers mode, Close keeps what was already changed.** There is no revert.
- **Rejected:** the in-page options of the first lab page, the photo-led option F2, the one-tap option F3 and the optional welcome screen.
- **Still open:** where the nudge sits next to the consent box (O32), German copy review, and the visit-scoped flag for the nudge, which the lab cannot show. Details in `docs/ux/onboarding-design.md` section 6.
