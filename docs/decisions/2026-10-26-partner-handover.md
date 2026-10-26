# Partner handover for group orders

- Date: 2026-10-26
- Status: approved by the owner on 2026-10-26
- Answers: gate G6 and the order-binding part of O24 in `docs/PRD/Swiss_keepsakes_PRD.md` §10.4
- Run: `.factory/runs/20261025-storytelling-pivot`

## Intent

Tour groups stay in Lucerne for a few hours. The guide hands out a printed QR flyer with free city tips. Guests read the content, and some of them order a Victorinox knife on their phone. The shop prepares each order after it arrives, delivers the group's orders to a pickup point, and hands them to the guide. The guide then gives each guest their order, like a Shopee Express driver. A hotel receptionist can do the same job for hotel guests.

The partner keeps the order status up to date because their commission depends on it. An order completes only when it is delivered and paid (PRD §8).

This record decides three things that the PRD left open: how an order is tied to a partner's handover, how the guide and the merchant agree on the handover time, and what each party records along the way.

## Goals

- A guest in a group can order and receive a knife before the group leaves, without going to the shop.
- The guide and the merchant agree on one handover place and time before guests order. Guests see that place and time at checkout.
- Every order going through a partner has a clear owner at every step: the shop, the courier, the partner, or the guest.
- Commission goes to the partner who actually delivered the order.

## Non-goals

- Money held by the partner. Cash collected, what the partner owes the shop, and settlement are out of this record. The owner moved them out of scope on 2026-10-26. G1 still applies: the partner's cash record counts as paid immediately.
- Courier routing, tracking, or a delivery company integration. The merchant arranges delivery outside the app (PRD §4.2).
- Cancellation rules. G5 removed the cancellation cutoff from Phase 1.
- How partners sign in to make changes (O24). This record assumes partners can sign in and records only what they do once signed in.

## Anti-goals

- The app guesses where an order goes and the guest finds out at the pickup point. The guest must see and confirm the handover before paying.
- A stale or shared flyer attaches a guest to a stranger's group.
- Guests negotiate times. Guests follow their guide, so they only need to be told the time.

## Constraints

- Preparation starts only after an order arrives. The shop does not stock ready-made bags on a schedule.
- Preparation takes a few hours (PRD §7.2). An order fits a handover only if there is enough preparation time before the handover.
- Groups run late. The handover time must be able to change on the day.
- Guides may have little experience with apps. The merchant must be able to set up a handover for them.
- Orders accept themselves when the SKU is in stock and preparation time fits (G2).
- Partners see only the guest's name, not email or phone (PRD §10.3).

## Approaches considered

### How an order is tied to a partner

| Option | How it works | Trade-off |
|---|---|---|
| A. Handover plus QR (chosen) | The partner and the merchant agree a handover. The partner's QR fills in that handover at checkout, and the guest confirms it. The guest shows an order code at handover. | The partner or the merchant sets up each handover. In return, delivery and commission follow an explicit choice, not a guess. |
| B. Standing partner QR | No handover record. The QR fills in "hand to Anna", and the guest picks the place and time. | No setup, but the group's times have no home and one group's orders spread across many times. |
| C. Automatic link plus claim | Keep the 30-day last-click rule. The partner finds orders by guest name and claims them. | Least new work. Last-click gives commission to the wrong partner, which is the main problem affiliate programmes report. |

The owner chose A on 2026-10-26.

### How the handover time is agreed

| Option | How it works | Trade-off |
|---|---|---|
| A. Partner proposes, merchant accepts or counters (chosen) | Like booking a group table at a restaurant. The time can move on the day. | One round trip between partner and merchant for each handover. |
| B. Partner gives a time window, merchant picks the time | The merchant sets the exact time after seeing the orders. | Guests ordering early see only a time range, which does not work for someone with a bus to catch. |
| C. Fixed rule | The handover is always a set number of minutes before the group leaves. | No negotiation, but it breaks when the shop cannot cover two groups leaving at the same time. |

The owner chose A on 2026-10-26. The 24 October minutes support it: the guide updates arrival, departure, pickup, and delivery times. The guide knows the group's day, and the merchant knows what the shop can deliver.

An earlier draft gave the merchant handover slots, such as every 60 minutes between 10:00 and 17:00. The owner rejected it because real handover times come from agreement, not from a published timetable.

## Decisions

### Words used here

- **Partner**: a referral partner from PRD §10. That is a guide, a hotel, or another partner.
- **Pickup point**: an entry in the merchant's existing pickup point list (`PickupPlace`, screen M12).
- **Handover**: an agreement that a partner meets the merchant's staff at a pickup point at a set time, takes the orders, and gives them to guests.
- **Collect it yourself**: the existing flow in PRD §6.2, where the guest meets the merchant's staff.

### Pickup points

There is one list of pickup points, and both ways of collecting use it. Pickup points keep their current fields: name, address, opening hours, and instructions. The difference between the two ways is who the merchant's staff member meets.

- **Collect it yourself.** The guest picks any pickup point and a time within that point's hours. A merchant staff member or courier meets the guest there.
- **Through a partner.** A merchant staff member or courier meets the partner there at the agreed handover time.

### The handover record

A handover has these parts:

| Part | Values |
|---|---|
| Partner | One partner |
| Pickup point | One entry from the merchant's list |
| Time | One-off: a date and time. Repeating: a time every day, for a hotel desk. |
| Group times | Optional arrival and leaving times, for a guide's group |
| State | Proposed, agreed, done, or cancelled |
| Created by | The partner or the merchant |

### Agreeing the time

1. The partner proposes a handover with a pickup point and a time. This can happen days ahead or on the day.
2. The merchant accepts it or proposes a different time.
3. If the merchant proposes a different time, the partner accepts it or proposes again.
4. When both have agreed, the handover goes live and starts taking orders.
5. The merchant can also create an agreed handover directly, for example after a phone call with a guide. It goes live immediately.

A repeating handover, such as a hotel desk every day at 18:00, is agreed once.

### Changing the time after agreement

- The partner can move the time **later** without approval.
- The partner can move the time **earlier** only with the merchant's approval, because orders may not be ready.
- The merchant can move the time. The partner and every guest with an order are told.
- A guest who cannot make the new time can switch to collecting it themselves.

### Tying an order to a handover

- **The partner's printed QR** (the existing `/r/{code}` link) looks only at that partner's agreed handovers **today**. It fills in the soonest one that can still take the order. "Can still take the order" means the remaining time before the handover covers the order's preparation time. If the partner has more than one handover today, the guest can pick another one. Each option shows the place, the time, and the group's arrival and leaving times. Limiting the QR to today stops last week's flyer from attaching a guest to a stranger's group.
- **A handover link**, which the partner shares in a group chat, fills in that exact handover on any day. Multi-day groups use it, for example a group that orders on day 1 for a handover at the hotel on day 3.
- **No live handover**: the QR opens the normal shop, and the guest collects it themselves.
- At checkout the guest sees the full handover line, for example "Anna, Schwanenplatz, today 13:00". The guest confirms it or switches to collecting it themselves.
- After an order is placed, the partner can move it to another of the partner's handovers. The merchant is told.
- A handover repeating every day rolls an order to the next day's time when today's time is too soon.

### Commission

The owner decided these rules on 2026-10-26:

- Commission is recorded only when the order is marked Delivered.
- Whoever hands over the order updates its status. The partner is responsible for every order in their handover, whatever happens to it. If the guest collects the order at the shop instead, the merchant marks it Delivered.
- If the guest does not show up and a full refund is agreed, no commission is recorded.
- If the guest does not show up and a partial refund is agreed, the partner earns commission on the amount the guest keeps paying.

The brainstormer's reading, confirmed by the owner:

- The handover's partner is fixed on the order when the guest places it, as `Order.partnerId` is today. The partner keeps the order if it moves to another of the partner's handovers, or if the guest later collects it at the shop. This replaces the 30-day last-click rule for orders placed on the partner path.
- An order placed as "collect it yourself" from the start follows the 30-day last-click rule (PRD §10.1), as today.
- PRD §10.2 records commission at completion, which means delivered and paid. On the partner path, a cash payment counts when the partner records it (G1), and an online order is paid before preparation. So Delivered and completed fall at the same moment in the normal case.

### Order statuses on the partner path

| Step | Who records it | Status | What the guest sees |
|---|---|---|---|
| The guest orders | The guest | Ordered | "Anna hands this over at Schwanenplatz, 13:00" |
| The shop starts packing | The merchant | Preparing | "Being prepared" |
| The courier leaves the shop | The merchant | On the way to partner | "On its way to Anna" |
| The partner takes the bags | The partner | With partner | "With Anna, ready at 13:00" |
| The partner gives the guest the order | The partner | Delivered | "Delivered" |

- **Receipt.** The partner's handover screen lists the orders due, all ticked. The partner unticks any missing bag and taps "Received 5 of 6". Ticked orders move to With partner. An unticked order stays On the way to partner, and the merchant gets an alert immediately.
- **Delivery.** The guest shows their order code. The partner finds the order and taps Delivered. If the guest pays cash, the partner records it there (G1).
- **Guest does not show up.** The partner returns the bag to the shop, and the order goes back to the merchant. Then one of these happens: the guest collects it at the shop and the merchant marks it Delivered, or the merchant and the guest agree a full or partial refund. Commission follows the rules in "Commission".
- Orders the guest collects themselves keep today's statuses.

### Payment and acceptance on the partner path

- The guest chooses to pay online at checkout or to pay the partner in cash. Both options apply to every partner, hotels included (Q10).
- The order accepts itself when the SKU is in stock and preparation fits the handover (G2). The merchant can still reject it before preparation, and the guest is told.
- An online order is paid at checkout. An online order that is still unpaid when the handover stops taking orders is cancelled automatically, so the shop never prepares an unpaid online order.
- A cash order goes to preparation without waiting for payment and is never cancelled for non-payment (G1).
- The order completes when it is Delivered and paid. For a cash order, the partner records the cash when tapping Delivered.

### Repeating handovers

- A repeating handover is one rule, such as every day at 18:00 at the desk of Hotel Schweizerhof. Each day it creates a dated occurrence, and each order points to one occurrence.
- A time change or cancellation applies to one day only, unless the partner and merchant change the rule itself.
- The merchant can pause or end a repeating handover.

### Checks when a time or an order moves

- The partner moves a handover earlier only with the merchant's approval (see "Changing the time after agreement").
- If the merchant moves a handover earlier, the app lists the orders that no longer have enough preparation time. The merchant decides what to do with each one.
- The partner can move an order only to another of the partner's handovers that still leaves enough preparation time for it.

### Pickup time for orders the guest collects

"Collect it yourself" now has a time of day within the pickup point's hours. `Order.pickupDate` has only a date today, so this decision adds a pickup time to every order, not only partner orders.

### What the partner sees

The handover screen shows, for each order: the guest's name, the order code, the items, and whether the order is paid or cash is due. It shows no email or phone number (PRD §10.3).

## Calls made by the brainstormer (confirmed by the owner on 2026-10-26)

- The term "handover" replaces "visit", because a hotel desk is not a visit.
- An earlier "trusted partner goes live without approval" setting was dropped. Every handover goes through the agree step in "Agreeing the time", so the setting had no job.
- The partner confirms receipt for the whole batch at once, with a checklist, not one bag at a time.
- A no-show order returns to the merchant's normal self-collect flow at the shop.
- The partner's handover screen shows items and payment state in addition to name and order code.
- The partner on the order is fixed at order time (see "Commission").
- The printed QR looks only at today's handovers, and the guest can pick among them.
- Online partner-path orders that are still unpaid when the handover stops taking orders are cancelled. Cash orders are never cancelled for non-payment.
- A repeating handover is one rule with dated occurrences. Changes apply to one day unless the rule changes.
- When the merchant moves a handover earlier, the merchant decides what happens to orders that no longer fit. The partner can move an order only where preparation still fits.

## Left to the builder

- Status names in code, and how the new statuses fit `packages/domain/src/orders/transitions.ts`.
- Whether a handover is its own module or part of `orders`.
- The format of the order code and how the partner finds an order by it.
- The notification channel for time changes and alerts, following the existing notification rules.
- How the QR picks between two handovers that are equally soon.

## What the code has today

- `/r/{code}` (`front-end/src/routes/r.$code.tsx`) records a visit `{partnerId, at}` and redirects to the home page. The guest sees no partner name.
- `attributedPartnerId` (`front-end/src/features/partners/referral.ts`) applies the 30-day last-click rule. `create-orders.ts` stamps `Order.partnerId` at order time.
- `PickupPlace` (`packages/domain/src/catalog/types.ts`) and screen M12 exist. `Order.pickupDate` is a date with no time of day.
- `groupCartIntoOrders` (`packages/domain/src/orders/group-cart.ts`) splits the cart by payment policy, pickup date, and pickup point. A handover becomes part of that key.
- Order statuses are `requested`, `accepted`, `preparing`, `ready`, `handed_over`, `completed`, `declined`, and `cancelled`. Only staff record payments.
- Partners can only read their report today (`/partner/{token}` with an emailed code). There are no partner write actions.
- The backend has no partner, order, or pickup tables yet. `docs/architecture/backend.md` plans them and a `/api/partner/` route group.

## Research notes

**Web** (researcher sub-agent, standard search):

- Group ordering in Uber Eats and DoorDash: one organiser creates the group, guests join by link, and the organiser closes the order. Delivery goes to the organiser's chosen address, not to a guessed one. https://help.doordash.com/consumers/s/article/What-is-a-group-order-and-how-can-I-create-one , https://www.uber.com/au/en/business/solutions/eats/group-ordering/
- Collection points: Shopee and Lazada let the buyer choose the point at checkout. The buyer shows a 6-digit code at collection. Amazon Counter works the same way with a code or barcode. https://help.shopee.sg/portal/4/article/81808-[Shopee-Collection-Point]-What-is-Shopee-Collection-Point , https://press.aboutamazon.com/news-releases/news-release-details/amazon-introduces-counter-us-where-customers-can-pick-their
- Community group buying in China (Meituan Youxuan and similar) is the closest model. A group leader shares links, goods arrive in bulk at the leader, members collect from the leader, and the leader earns a sales commission. https://technode.com/2020/07/28/the-battle-for-chinas-community-group-buying-market/
- Affiliate practitioners report that last-click lets a later link or coupon take commission from the partner who did the work. https://tapfiliate.com/blog/coupon-codes-vs-affiliate-links-vs-server-to-server-traking-gp/
- A code at handover proves that a code was entered, not who received the order. Pairing it with a timestamp and a named recipient helps in disputes. https://www.shipbob.com/blog/proof-of-delivery-confirmation/
- Not found: how Swiss or European shops identify tour guides for group shopping commission (guide cards, group vouchers). Sonja can answer from practice.

**Codebase** (researcher sub-agent, read-only): see "What the code has today". The research found no existing group, visit, or handover concept.

## Open questions

| Question | Who can settle it |
|---|---|
| Cash the partner holds: does the app track what each partner owes the shop? | Owner, later (moved out of scope on 2026-10-26) |
| How partners sign in to make changes, since the current link and email code only allow reading (O24) | Owner and engineering |
| Whether guests can cancel an order on the partner path (G5 removed the cutoff) | Owner, with the cancellation decision |

### Settled after approval (owner, 2026-10-26, closing PRD O38)

- **The merchant does not answer a proposal.** The proposal takes no orders, and the merchant gets a reminder. If the merchant has not answered by the handover time minus preparation time, the proposal expires and the partner is told.
- **An agreed handover is cancelled** by the partner or the merchant. Every guest with an order is told immediately and chooses one of two options: collect it themselves at a pickup point and time, or cancel with a full refund. The order keeps its original partner. If the guest collects it and the merchant marks it Delivered, that partner earns the commission, even if the partner cancelled.
- **How Lucerne shops identify guides today**: dropped. The merchant setting up each partner with a code and QR is enough.
