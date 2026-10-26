# ADR-010: Let guides write through signed-in partner accounts, and keep report links read-only

Status: accepted
Date: 2026-10-26
Source: AD-11
Applies to: `api/src/modules/partners/`, `api/src/modules/identity/`, `api/src/modules/orders/`, `api/src/modules/money/`, `api/src/platform/http/`, `packages/domain/src/identity/`, `packages/domain/src/partners/`

Security class. It changes backend.md D8 and section 9 ("Partners have no user rows"). The owner decided the account rule on 2026-10-26 (gate D1): guides sign in by invitation only. The owner approved the partner handover record on 2026-10-26 (gate G6, `docs/decisions/2026-10-26-partner-handover.md`), which settles how an order joins a group. Cash held by the partner (O34) is out of scope for now. No new dependency, vendor or paid service.

## Context
A guide is a referral partner with extra rights (Q9). The guide updates arrival and departure times, pickup and delivery times, and the cash amount collected, for orders from the guide's own source (§10.4, AC58). A cash amount counts at once (G1), and it can lead to the guide's own commission (O34).

Today a partner has no user account. The partner opens a private link and enters a six-digit code to start a session that lasts 30 days on the device, scoped to `/partner` (backend.md section 9). That session reads reports only. The PRD proposes accounts with a partner role for guides (O24). How a guest order attaches to a guide's group is still open and awaits the owner's brainstorm (G6, O38).

## Decision
The owner's answer (gate D1) and the design that follows from it:

- **Read stays as is.** The report-link session keeps read access to the partner's own report and nothing else.
- **Write needs an account.** A guide signs in with Google or an emailed code through Better Auth (D8). The `partners` module stores a link from the partner to the user id as a plain value, with no foreign key (the rule in backend.md section 5). The merchant invites a guide by email, as an Owner invites a manager.
- **Invitation only (gate D1).** The merchant invites a partner by email. The partner signs in through the existing Better Auth flow (Google or emailed code) and receives the partner role from the accepted invitation, the way an Owner invitation grants a store role. Self sign-up yields the guest (visitor) role only. No route, hook or job grants a partner or staff role without an accepted invitation. A generated test over the OpenAPI document and the auth hooks checks this.
- **Actor.** An actor holds a set of capabilities, because a guide is also a guest who may buy. The actor gains a `guide` capability that carries the partner id. `can(actor, permission, ctx)` allows a guide write only on an order whose `partner_id` equals the actor's partner id.
- **What a guide can write.** Arrival and departure times, pickup and delivery times, and a cash amount, each as a use case that stores who, when and the previous value in `audit_log`. A cash amount cannot exceed the order's open balance.
- **One path for pickup time.** One `orders` use case changes a pickup or delivery time for every actor (staff or guide). It reruns the auto-accept policy of ADR-009 and applies the same rules, including the note that staff must give.
- **What a guide cannot see.** Customer email, phone, address or custom requests. The guide sees the guest's name only (AC12, AC58).
- **Handovers (gate G6).** A handover is an agreement between a partner and the merchant that the merchant delivers orders to a pickup point at a time and the partner gives them to guests. It replaces the earlier "group" idea, and no group entity exists. The `orders` module owns handovers and their dated occurrences, which the data model puts in the `orders` schema (ADR-024). An order on the partner path points at one occurrence, and its `partner_id` is fixed from the handover (not from the 30-day last-click rule). The partner proposes, the merchant accepts or counters, and both can move the time under the rules of the decision record. Pickup points stay in `catalog` (the existing M12 list), and orders and handovers refer to them by id. The partner's statuses are `With partner` and `Delivered`, and commission is recorded at `Delivered` when the order is fully paid, otherwise when payment completes (owner gate C1), through `partners/index.ts`.
- **Why `orders` owns handovers.** The invariants are about orders: preparation time before the occurrence, auto-accept, moving an order between a partner's occurrences, and listing the orders that no longer fit when the merchant moves a time earlier. `partners` would need to read `orders` to enforce them, and `orders` already calls `partners` for commission, which would make a cycle. `partners` keeps identity, referral visits, commission and guide accounts.
- **Safety.** A cash entry shows a distinct method in the ledger and in the dashboard (AC19, AC59). The Owner can adjust or void it with a reason (§9.1). A daily list of the guide's cash entries against merchant receipts is the reconciliation tool for O34.

## Consequences
- Guides need real identities, which gives a trustworthy `recorded_by`. They also need an invitation flow and a sign-in on a phone.
- The partner session cookie scope stays `/partner`. The guide's session is a normal Better Auth session.
- Staff routes, partner report routes and guide routes become three actor families in `requireStoreMember`-style guards. The generated permission test (AC02) must cover them.
- D8's sentence "Partners have no user rows" stops being true for guides. The doc change goes through the diff in the run folder.
- The PRD settles two edge rules of the decision record: an unanswered proposal (AC77), and a cancelled handover, where guests choose self-collect or a full refund and the order keeps its partner (AC78). Whether guests can cancel on the partner path stays open under O36 (G5 removed the cutoff). Cash the partner holds is out of scope. Whether the guide's cash can earn the guide's own commission without a second check is still O34.

## Assumptions
- Each guide can sign in with an email address on a phone.
- The number of guides in Phase 1 is small (the plan targets about five).
- Partners sign in to propose and update handovers, as the decision record assumes (O24 is answered by gate D1).
- Better Auth's existing options (Google, emailed code) are enough for guides. No new plugin is needed.

## Considered options
- **A. Accounts for guides, by invitation only, links for reading (chosen by the owner, gate D1).** Strong identity for money-adjacent writes. More build: invitation and sign-in for a new actor kind.
- **B. Use the report-link session for writes too.** No new flow. A link plus a code on a shared phone for 30 days is too weak for a record that creates commission, and it gives `recorded_by` no stable person. Rejected.
- **C. A per-visit token for each group.** Replaced by handovers (gate G6). A handover link shared in a group chat fills in the handover for guests, but partners still sign in to change it.
- **Handovers in `partners` (rejected).** Fits the partner-merchant agreement, but needs a read of `orders` and creates a cycle with the commission call.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
