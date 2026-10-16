import type { Guest, LogEntry, Order, OrderLine, Payment } from "./types";
import type { Product } from "@/features/catalog/types";

import { products } from "@/features/catalog/seed";
import { demoAt } from "@/features/demo/clock";

/** The demo guest who walks the flow. Signs in during C05, so not signed in at start. */
export const demoGuest: Guest = {
  id: "g-anna",
  name: "Anna Keller",
  email: "anna.keller@example.com",
  // 1.12t: default photo, the reviewer-style avatar src/assets/avatars/anna-k.svg (CC0).
  avatar: "sample:anna-k",
};

/** Other guests, so merchant screens have work in every state. Invented people. */
export const otherGuests: Guest[] = [
  { id: "g-tom", name: "Tom Becker", email: "tom.becker@example.com" },
  { id: "g-yuki", name: "Yuki Tanaka", email: "yuki.tanaka@example.com" },
  { id: "g-sofia", name: "Sofia Rossi", email: "sofia.rossi@example.com" },
  { id: "g-daniel", name: "Daniel Meier", email: "daniel.meier@example.com" },
  { id: "g-elena", name: "Elena Novak", email: "elena.novak@example.com" },
  { id: "g-lars", name: "Lars Jensen", email: "lars.jensen@example.com" },
  { id: "g-marie", name: "Marie Dubois", email: "marie.dubois@example.com" },
  { id: "g-peter", name: "Peter Schmid", email: "peter.schmid@example.com" },
];

function product(id: string): Product {
  const found = products.find((p) => p.id === id);

  if (!found) throw new Error(`seed: unknown product ${id}`);

  return found;
}

function line(
  productId: string,
  variantId: string,
  quantity: number,
  engraving?: string,
): OrderLine {
  const p = product(productId);
  const v = p.variants.find((x) => x.id === variantId);

  if (!v) throw new Error(`seed: unknown variant ${productId}/${variantId}`);

  return {
    id: `${productId}-${variantId}`,
    productId,
    variantId,
    productName: p.name,
    variantLabel: v.label,
    unitPrice: v.price,
    quantity,
    engraving,
    commissionRate: p.commissionRate,
  };
}

function base(
  ref: string,
  guestId: string,
  productId: string,
  lines: OrderLine[],
  pickupDate: string,
  pickupPlaceId: string,
  partnerId: string | null,
  createdAt: string,
): Omit<Order, "status" | "payments" | "log"> {
  const p = product(productId);

  return {
    id: ref.toLowerCase(),
    ref,
    guestId,
    language: "en",
    createdAt,
    lines,
    pickupDate,
    pickupPlaceId,
    paymentPolicy: p.paymentPolicy,
    cancellationPolicy: p.cancellationPolicy,
    partnerId,
  };
}

const requestedLog = (at: string): LogEntry => ({
  type: "requested",
  at,
  actor: "guest",
});

function payment(
  id: string,
  amount: number,
  method: Payment["method"],
  at: string,
  recordedBy?: Payment["recordedBy"],
): Payment {
  return { id, amount, method, status: "succeeded", at, recordedBy };
}

export function seedOrders(): Order[] {
  const t1 = demoAt({ hours: -2 });
  const t2 = demoAt({ days: -1, hours: -1 });
  const t3 = demoAt({ hours: -20 });
  const t4c = demoAt({ days: -1 });
  const t4a = demoAt({ hours: -3 });
  const t5c = demoAt({ days: -2 });
  const t5a = demoAt({ days: -1, hours: -4 });
  const t6c = demoAt({ days: -4 });
  const t6a = demoAt({ days: -4, hours: 2 });
  const t6p = demoAt({ days: -3, hours: -20 });
  const t6r = demoAt({ hours: -1 });
  const t7c = demoAt({ days: -8 });
  const t7a = demoAt({ days: -8, hours: 3 });
  const t7p = demoAt({ days: -7, hours: -18 });
  // Monday 12.10.2026, 11:00: Shop Altstadt is closed on Sundays.
  const t7d = demoAt({ days: -1, hours: 1 });
  const t8c = demoAt({ days: -4 });
  const t8a = demoAt({ days: -3, hours: -2 });
  const t8x = demoAt({ days: -2, hours: -2 });
  const t9c = demoAt({ days: -7 });
  const t9a = demoAt({ days: -7, hours: 2 });
  const t9d = demoAt({ days: -4, hours: 1 });
  const t10c = demoAt({ days: -3 });
  const t10x = demoAt({ days: -3, hours: 3 });

  return [
    // Awaiting confirmation
    {
      ...base(
        "SK-1031",
        "g-tom",
        "p-vx-chapel-bridge",
        [line("p-vx-chapel-bridge", "s", 1, "Tom")],
        "2026-10-19",
        "altstadt",
        "hotel-am-see",
        t1,
      ),
      status: "requested",
      payments: [],
      log: [requestedLog(t1)],
    },
    // Two requests competing for the single limited-edition print (S2, AC05)
    {
      ...base(
        "SK-1032",
        "g-yuki",
        "p-print",
        [line("p-print", "std", 1)],
        "2026-10-16",
        "altstadt",
        null,
        t2,
      ),
      status: "requested",
      payments: [],
      log: [requestedLog(t2)],
    },
    {
      ...base(
        "SK-1033",
        "g-sofia",
        "p-print",
        [line("p-print", "std", 1)],
        "2026-10-17",
        "bahnhof",
        "guide-marco",
        t3,
      ),
      status: "requested",
      payments: [],
      log: [requestedLog(t3)],
    },
    // Accepted, payment due within 24 hours
    {
      ...base(
        "SK-1028",
        "g-daniel",
        "p-vx-chapel-bridge",
        [line("p-vx-chapel-bridge", "l", 1, "Daniel")],
        "2026-10-20",
        "bahnhof",
        "hotel-am-see",
        t4c,
      ),
      status: "accepted",
      acceptedAt: t4a,
      firstPaymentDueAt: demoAt({ hours: 21 }),
      payments: [],
      log: [requestedLog(t4c), { type: "accepted", at: t4a, actor: "manager" }],
    },
    // Pay later, being prepared
    {
      ...base(
        "SK-1025",
        "g-elena",
        "p-chocolate",
        [line("p-chocolate", "12", 2)],
        "2026-10-14",
        "altstadt",
        null,
        t5c,
      ),
      status: "preparing",
      acceptedAt: t5a,
      balanceDueDate: "2026-10-16",
      payments: [],
      log: [requestedLog(t5c), { type: "accepted", at: t5a, actor: "owner" }],
    },
    // Deposit paid, ready for pickup, balance owed
    {
      ...base(
        "SK-1021",
        "g-lars",
        "p-giftbox",
        [line("p-giftbox", "std", 1)],
        "2026-10-13",
        "altstadt",
        "guide-marco",
        t6c,
      ),
      status: "ready",
      acceptedAt: t6a,
      firstPaymentDueAt: demoAt({ days: -3, hours: 2 }),
      balanceDueDate: "2026-10-17",
      payments: [payment("pay-1021-1", 2670, "online", t6p)],
      log: [
        requestedLog(t6c),
        { type: "accepted", at: t6a, actor: "manager" },
        { type: "payment", paymentId: "pay-1021-1", at: t6p, actor: "guest" },
        { type: "ready", at: t6r, actor: "manager" },
      ],
    },
    // Completed and paid in full
    {
      ...base(
        "SK-1017",
        "g-marie",
        "p-vx-chapel-bridge",
        [line("p-vx-chapel-bridge", "m", 1, "Papa")],
        "2026-10-12",
        "altstadt",
        "hotel-am-see",
        t7c,
      ),
      status: "completed",
      acceptedAt: t7a,
      firstPaymentDueAt: demoAt({ days: -7, hours: 3 }),
      completedAt: t7d,
      completedBy: "manager",
      commissionRecordedAt: t7d,
      payments: [payment("pay-1017-1", 5400, "online", t7p)],
      log: [
        requestedLog(t7c),
        { type: "accepted", at: t7a, actor: "owner" },
        { type: "payment", paymentId: "pay-1017-1", at: t7p, actor: "guest" },
        { type: "ready", at: demoAt({ days: -3 }), actor: "manager" },
        { type: "handed-over", at: t7d, actor: "manager" },
        { type: "completed", at: t7d, actor: "manager" },
      ],
    },
    // Cancelled automatically: first payment not made within 24 hours (R05)
    {
      ...base(
        "SK-1019",
        "g-peter",
        "p-giftbox",
        [line("p-giftbox", "std", 1)],
        "2026-10-15",
        "bahnhof",
        null,
        t8c,
      ),
      status: "cancelled",
      acceptedAt: t8a,
      firstPaymentDueAt: t8x,
      payments: [],
      log: [
        requestedLog(t8c),
        { type: "accepted", at: t8a, actor: "manager" },
        { type: "cancelled", reason: "overdue", at: t8x, actor: "system" },
      ],
    },
    // Step 1.12: Anna's earlier orders, so C14 has rows before she sends a request (1.7).
    // Closed states only: they hold no stock and add no work to the merchant queues.
    {
      ...base(
        "SK-1012",
        demoGuest.id,
        "p-chocolate",
        [line("p-chocolate", "12", 2)],
        "2026-10-09",
        "altstadt",
        null,
        t9c,
      ),
      status: "completed",
      acceptedAt: t9a,
      balanceDueDate: "2026-10-11",
      completedAt: t9d,
      completedBy: "owner",
      payments: [payment("pay-1012-1", 4800, "cash", t9d, "owner")],
      log: [
        requestedLog(t9c),
        { type: "accepted", at: t9a, actor: "owner" },
        { type: "ready", at: demoAt({ days: -5 }), actor: "owner" },
        { type: "handed-over", at: t9d, actor: "owner" },
        { type: "payment", paymentId: "pay-1012-1", at: t9d, actor: "owner" },
        { type: "completed", at: t9d, actor: "owner" },
      ],
      // 2.17: answered on C07 for an earlier trip, so C15 shows the answered "Your trip" card.
      // The dates are past, so they never pre-fill a new request or booking.
      trip: {
        travelStyle: "independent",
        arriveOn: "2026-10-07",
        leaveOn: "2026-10-10",
        answeredAt: t9c,
      },
    },
    {
      ...base(
        "SK-1015",
        demoGuest.id,
        "p-print",
        [line("p-print", "std", 1)],
        "2026-10-15",
        "altstadt",
        null,
        t10c,
      ),
      status: "declined",
      payments: [],
      log: [
        requestedLog(t10c),
        {
          type: "declined",
          reason: "The last print is already promised to another guest.",
          at: t10x,
          actor: "owner",
        },
      ],
    },
    // Phase 5: Guide Sophie's transactions (outline §4), so the third partner has a ledger.
    completedOrder(
      "SK-1004",
      "g-yuki",
      [line("p-swiss-chocolate-box", "24", 1)],
      "guide-sophie",
      "2026-09-16T11:00:00+02:00",
      "2026-09-20T15:00:00+02:00",
    ),
    completedOrder(
      "SK-1011",
      "g-daniel",
      [line("p-old-town-print", "a4", 1)],
      "guide-sophie",
      "2026-10-03T10:00:00+02:00",
      "2026-10-06T14:00:00+02:00",
    ),
  ];
}

/** A paid, handed-over and completed order, with commission recorded at completion (AC10). */
function completedOrder(
  ref: string,
  guestId: string,
  lines: OrderLine[],
  partnerId: string | null,
  createdAt: string,
  completedAt: string,
): Order {
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const paymentId = `pay-${ref.slice(3)}-1`;
  const paidAt = new Date(Date.parse(createdAt) + 6 * 3_600_000).toISOString();

  return {
    ...base(
      ref,
      guestId,
      lines[0].productId,
      lines,
      completedAt.slice(0, 10),
      "altstadt",
      partnerId,
      createdAt,
    ),
    status: "completed",
    acceptedAt: createdAt,
    completedAt,
    completedBy: "owner",
    commissionRecordedAt: partnerId ? completedAt : undefined,
    payments: [payment(paymentId, total, "online", paidAt)],
    log: [
      requestedLog(createdAt),
      { type: "accepted", at: createdAt, actor: "owner" },
      { type: "payment", paymentId, at: paidAt, actor: "guest" },
      { type: "handed-over", at: completedAt, actor: "owner" },
      { type: "completed", at: completedAt, actor: "owner" },
    ],
  };
}
