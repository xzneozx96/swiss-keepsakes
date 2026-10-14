/* T0 self-check: walks outline §1 steps 9–14 and the side paths through the pure order logic. */
import type { DemoState } from "@/features/demo/types";
import type { Order, OrderLine } from "@/features/orders/types";
import type { MessageKey } from "@/i18n/en";
import type { OrderBlock, TransitionContext } from "@/features/orders/lib/transitions";

import { DEMO_START } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { en } from "@/i18n/en";
import { de } from "@/i18n/de";
import * as tr from "@/features/orders/lib/transitions";
import {
  blockLabel,
  commissionLabel,
  formatLabel,
  paymentLabel,
  progressLabel,
} from "@/features/orders/lib/labels";
import {
  amountPaid,
  balance,
  commission,
  firstPaymentAmount,
  orderTotal,
  variantAvailable,
} from "@/features/orders/lib/selectors";
import { formatOrderDateTime } from "@/features/orders/lib/format";

const T = (min: number) => new Date(DEMO_START + min * 60_000);
const staff = (min: number): TransitionContext<"manager"> => ({ actor: "manager", now: T(min), staffLanguage: "en" });
const guest = (min: number): TransitionContext<"guest"> => ({ actor: "guest", now: T(min), staffLanguage: "en" });
const system = (min: number): TransitionContext<"system"> => ({ actor: "system", now: T(min), staffLanguage: "en" });

const fill = (text: string, vars?: Record<string, string | number>) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, n: string) => (n in vars ? String(vars[n]) : m)) : text;
const tEn = (k: MessageKey, v?: Record<string, string | number>) => fill(en[k], v);
const tDe = (k: MessageKey, v?: Record<string, string | number>) => fill(de[k], v);

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  // formatMoney puts a no-break space after "CHF"; compare as plain spaces.
  const ok = JSON.stringify(actual)?.replace(/\u00a0/g, " ") === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"} ${label}${ok ? "" : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

const chf = (r: number) => `CHF ${(r / 100).toFixed(2)}`;
const get = (s: DemoState, id: string) => s.data.orders.find((o) => o.id === id)!;
const labels = (s: DemoState, id: string, min: number, audience: "guest" | "staff" = "guest") => {
  const o = get(s, id);
  const p = progressLabel(o, audience);
  const pay = paymentLabel(o, T(min));
  return {
    en: `${formatLabel(p, tEn, "en-CH")} · ${formatLabel(pay, tEn, "en-CH")}`,
    de: `${formatLabel(p, tDe, "de-CH")} · ${formatLabel(pay, tDe, "de-CH")}`,
    tones: `${p.tone}/${pay.tone}`,
  };
};
function show(s: DemoState, id: string, min: number, audience: "guest" | "staff" = "guest") {
  const o = get(s, id);
  const l = labels(s, id, min, audience);
  console.log(`  ${o.ref} [${o.status}] total ${chf(orderTotal(o))} paid ${chf(amountPaid(o))} balance ${chf(balance(o))} (${l.tones})`);
  console.log(`    EN: ${l.en}`);
  console.log(`    DE: ${l.de}`);
}
const blockText = (b: OrderBlock | null) =>
  b ? `${formatLabel(blockLabel(b, "en"), tEn, "en-CH")} | DE: ${formatLabel(blockLabel(b, "de"), tDe, "de-CH")}` : "null";
const newMail = (before: DemoState, after: DemoState) =>
  after.data.mail.slice(before.data.mail.length).map((m) => `${m.template}→${m.to}`);
const lastLog = (s: DemoState, id: string) => {
  const e = get(s, id).log.at(-1)!;
  return `${e.type} · ${e.actor} · ${formatOrderDateTime(e.at, "en-CH")}`;
};

/** Anna's two orders as step 1.7 would create them (fixtures only; 1.7 owns cart → orders). */
function fresh(): DemoState {
  const s = createSeedState(0);
  const product = (id: string) => s.data.products.find((p) => p.id === id)!;
  const line = (pid: string, vid: string, qty: number, engraving?: string): OrderLine => {
    const p = product(pid);
    const v = p.variants.find((x) => x.id === vid)!;
    return { id: `${pid}-${vid}`, productId: pid, variantId: vid, productName: p.name, variantLabel: v.label, unitPrice: v.price, quantity: qty, engraving, commissionRate: p.commissionRate };
  };
  const order = (ref: string, pid: string, l: OrderLine[], pickupDate: string): Order => ({
    id: ref.toLowerCase(), ref, guestId: "g-anna", language: "en", createdAt: T(10).toISOString(), lines: l,
    pickupDate, pickupPlaceId: "altstadt", paymentPolicy: product(pid).paymentPolicy, cancellationPolicy: product(pid).cancellationPolicy,
    status: "requested", partnerId: "hotel-am-see", payments: [], log: [{ type: "requested", at: T(10).toISOString(), actor: "guest" }],
  });
  s.data.orders.push(
    order("SK-1043", "p-knife", [line("p-knife", "m", 1, "Anna")], "2026-10-21"),
    order("SK-1044", "p-giftbox", [line("p-giftbox", "std", 1)], "2026-10-20"),
    order("SK-1045", "p-chocolate", [line("p-chocolate", "12", 1)], "2026-10-16"),
  );
  return s;
}

const KNIFE = "sk-1043";
const BOX = "sk-1044";

console.log("=== Main demo path, steps 9–14 ===");
let s = fresh();
let before: DemoState;

console.log("\nStep 9: change place, accept the gift box (10:30)");
before = s;
s = tr.changePickup(s, BOX, { field: "place", to: "bahnhof", note: "" }, staff(30));
expect("empty note blocked", tr.changePickupBlock(get(before, BOX), { field: "place", to: "bahnhof", note: " " })?.code, "note-required");
s = tr.changePickup(s, BOX, { field: "place", to: "bahnhof", note: "Guest asked by email, hotel is near the station" }, staff(30));
console.log(`  log: ${JSON.stringify(get(s, BOX).log.at(-1))}`);
console.log(`  stock gift box before accept: ${variantAvailable(s.data, "p-giftbox", "std")}`);
before = s;
s = tr.accept(s, BOX, staff(30));
const box = get(s, BOX);
console.log(`  confirm copy values: prepare ${box.lines[0].quantity} item for ${box.pickupDate} at ${box.pickupPlaceId}; pay ${chf(firstPaymentAmount(box))} within 24 hours, by ${formatOrderDateTime(box.firstPaymentDueAt!, "en-CH")}`);
console.log(`  stock gift box after accept: ${variantAvailable(s.data, "p-giftbox", "std")}  mail: ${newMail(before, s)}`);
expect("deposit CHF 26.70 due 14.10.2026, 10:30", [chf(firstPaymentAmount(box)), formatOrderDateTime(box.firstPaymentDueAt!, "en-CH")], ["CHF 26.70", "14.10.2026, 10:30"]);

console.log("\nStep 10: accept the knife (10:35)");
before = s;
s = tr.accept(s, KNIFE, staff(35));
console.log(`  mail: ${newMail(before, s)}  log: ${lastLog(s, KNIFE)}`);
show(s, KNIFE, 36);

console.log("\nStep 11: guest pays the knife");
show(s, BOX, 36);
expect("knife payment label", labels(s, KNIFE, 36).en, "Accepted, payment due · Payment due · CHF 54.00 by 14.10.2026, 10:35");
before = s;
s = tr.startOnlinePayment(s, KNIFE, guest(40));
s = tr.resolveOnlinePayment(s, KNIFE, "succeeded", system(40));
console.log(`  mail: ${newMail(before, s)}`);
show(s, KNIFE, 41);
expect("knife after pay", labels(s, KNIFE, 41).en, "Confirmed, being prepared · Paid in full · CHF 54.00");

console.log("\nStep 12: guest pays the gift box deposit");
s = tr.startOnlinePayment(s, BOX, guest(42));
s = tr.resolveOnlinePayment(s, BOX, "succeeded", system(42));
show(s, BOX, 43);
expect("deposit label", labels(s, BOX, 43).en, "Confirmed, being prepared · Deposit paid · CHF 26.70 · CHF 62.30 left, due 24.10.2026");

console.log("\nStep 13: ready, handed over, complete locked");
before = s;
s = tr.markReady(s, BOX, staff(50));
console.log(`  mail: ${newMail(before, s)}`);
const onHandBefore = s.data.products.find((p) => p.id === "p-giftbox")!.variants[0].stock;
s = tr.handOver(s, BOX, staff(51));
console.log(`  on-hand gift boxes ${onHandBefore} → ${s.data.products.find((p) => p.id === "p-giftbox")!.variants[0].stock}; available ${variantAvailable(s.data, "p-giftbox", "std")}`);
show(s, BOX, 52, "staff");
console.log(`  complete blocked: ${blockText(tr.completeBlock(get(s, BOX)))}`);
expect("complete locked reason", formatLabel(blockLabel(tr.completeBlock(get(s, BOX))!, "en"), tEn, "en-CH"), "CHF 62.30 still owed");
expect("complete transition is a no-op", tr.complete(s, BOX, staff(52)) === s, true);

console.log("\nStep 14: record CHF 62.30 cash, duplicate/above-balance, complete");
const cash = { amount: 6230, method: "cash" as const, at: T(55).toISOString() };
expect("first record passes guard", tr.recordOfflinePaymentBlock(get(s, BOX), cash), null);
console.log(`  button: Record ${chf(cash.amount)} cash. Balance will be ${chf(balance(get(s, BOX)) - cash.amount)}.`);
s = tr.recordOfflinePayment(s, BOX, cash, staff(55));
show(s, BOX, 55, "staff");
console.log(`  same CHF 62.30 again at 10:57: ${blockText(tr.recordOfflinePaymentBlock(get(s, BOX), { ...cash, at: T(57).toISOString() }))}`);
console.log(`  commission before complete: ${commission(get(s, BOX)).state} ${chf(commission(get(s, BOX)).total)} (${formatLabel(commissionLabel(commission(get(s, BOX)).state), tEn, "en-CH")})`);
before = s;
s = tr.complete(s, BOX, staff(56));
const done = get(s, BOX);
console.log(`  mail: ${newMail(before, s)}  completedBy ${done.completedBy} at ${formatOrderDateTime(done.completedAt!, "en-CH")}`);
console.log(`  commission after complete: ${commission(done).state} ${chf(commission(done).total)} (${formatLabel(commissionLabel(commission(done).state), tEn, "en-CH")})`);
show(s, BOX, 57);
expect("completed once (second complete no-op)", tr.complete(s, BOX, staff(58)) === s, true);
expect("commission recorded once", done.commissionRecordedAt, T(56).toISOString());
const mainMail = s.data.mail;

console.log("\n=== Side paths ===");

console.log("\nDuplicate payment warning (SK-1021, ready with CHF 62.30 owed)");
s = fresh();
const pay20 = (min: number, allowDuplicate?: boolean) => ({ amount: 2000, method: "cash" as const, at: T(min).toISOString(), allowDuplicate });
s = tr.recordOfflinePayment(s, "sk-1021", pay20(0), staff(0));
console.log(`  CHF 20.00 again 5 min later: ${blockText(tr.recordOfflinePaymentBlock(get(s, "sk-1021"), pay20(5)))}`);
expect("duplicate within 10 min blocked without confirm", tr.recordOfflinePayment(s, "sk-1021", pay20(5), staff(5)) === s, true);
s = tr.recordOfflinePayment(s, "sk-1021", pay20(5, true), staff(5));
console.log(`  confirmed duplicate recorded; paid ${chf(amountPaid(get(s, "sk-1021")))}`);
expect("CHF 20.00 11 min after the last one: no warning", tr.recordOfflinePaymentBlock(get(s, "sk-1021"), pay20(16)), null);
console.log(`  CHF 50.00 (above balance ${chf(balance(get(s, "sk-1021")))}): ${blockText(tr.recordOfflinePaymentBlock(get(s, "sk-1021"), { ...pay20(20), amount: 5000 }))}`);
show(s, "sk-1021", 20, "staff");

console.log("\nOverdue first payment (SK-1028, accepted knife L, unpaid)");
s = fresh();
console.log(`  knife L available before: ${variantAvailable(s.data, "p-knife", "l")}`);
show(s, "sk-1028", 1);
before = s;
s = tr.expirePaymentDeadline(s, "sk-1028", system(1));
console.log(`  mail: ${newMail(before, s)}  log: ${lastLog(s, "sk-1028")}`);
console.log(`  knife L available after: ${variantAvailable(s.data, "p-knife", "l")}`);
show(s, "sk-1028", 2);
console.log(`  Pay button guard: ${blockText(tr.startOnlinePaymentBlock(get(s, "sk-1028")))}`);
expect("overdue label", labels(s, "sk-1028", 2).en, "Cancelled · payment overdue · Nothing paid");
expect("other orders unchanged", s.data.orders.filter((o) => o.id !== "sk-1028"), before.data.orders.filter((o) => o.id !== "sk-1028"));

console.log("\nPayment fails, then processing; late provider result after cancellation (SK-1043 knife)");
s = tr.accept(fresh(), KNIFE, staff(35));
before = s;
s = tr.startOnlinePayment(s, KNIFE, guest(36));
s = tr.resolveOnlinePayment(s, KNIFE, "failed", system(36));
console.log(`  failed → mail: ${newMail(before, s)}`);
show(s, KNIFE, 36);
s = tr.startOnlinePayment(s, KNIFE, guest(37));
show(s, KNIFE, 37);
console.log(`  second Pay: ${blockText(tr.startOnlinePaymentBlock(get(s, KNIFE)))}`);
console.log(`  guest cancel while processing: ${blockText(tr.cancelBlock(get(s, KNIFE), "guest"))}`);
s = tr.expirePaymentDeadline(s, KNIFE, system(38));
show(s, KNIFE, 38);
before = s;
s = tr.resolveOnlinePayment(s, KNIFE, "succeeded", system(39));
console.log(`  provider succeeds after cancellation → mail: ${JSON.stringify(newMail(before, s))}`);
show(s, KNIFE, 40);
expect("late result label", labels(s, KNIFE, 40).en, "Cancelled · payment overdue · Received after cancellation · awaiting reconciliation");

console.log("\nPay later (SK-1045 chocolate, Anna)");
s = fresh();
console.log(`  chocolate available before: ${variantAvailable(s.data, "p-chocolate", "12")}`);
before = s;
s = tr.accept(s, "sk-1045", staff(30));
console.log(`  mail: ${newMail(before, s)}  payments: ${get(s, "sk-1045").payments.length}`);
console.log(`  chocolate available after: ${variantAvailable(s.data, "p-chocolate", "12")}`);
show(s, "sk-1045", 31);
expect("pay later label", labels(s, "sk-1045", 31).en, "Confirmed, being prepared · Pay later · CHF 24.00, due 18.10.2026");

console.log("\nDecline (SK-1044 gift box); the knife order is unaffected");
s = fresh();
console.log(`  empty reason: ${blockText(tr.declineBlock(get(s, BOX), ""))}`);
before = s;
s = tr.decline(s, BOX, "We can't make that date", staff(30));
console.log(`  mail: ${newMail(before, s)} params ${JSON.stringify(s.data.mail.at(-1)!.params)}`);
show(s, BOX, 31);
show(s, KNIFE, 31);

console.log("\nLast item race (SK-1032 and SK-1033 both want the one print)");
s = fresh();
console.log(`  print available: ${variantAvailable(s.data, "p-print", "std")}`);
s = tr.accept(s, "sk-1032", staff(5));
console.log(`  after accepting SK-1032: ${variantAvailable(s.data, "p-print", "std")}`);
before = s;
const raced = tr.accept(s, "sk-1033", staff(6));
console.log(`  accept SK-1033: ${blockText(tr.acceptBlock(s, get(s, "sk-1033")))}`);
expect("SK-1033 stays requested, no mail", [raced === before, get(raced, "sk-1033").status, newMail(before, raced)], [true, "requested", []]);
show(s, "sk-1032", 6, "staff");
show(s, "sk-1033", 6, "staff");

console.log("\nGuest cancels before paying; ready and fully paid → combined button");
s = tr.accept(fresh(), KNIFE, staff(35));
console.log(`  knife M available accepted: ${variantAvailable(s.data, "p-knife", "m")}`);
const cancelled = tr.cancel(s, KNIFE, "guest", guest(36));
console.log(`  after guest cancel: ${variantAvailable(cancelled.data, "p-knife", "m")}  mail: ${JSON.stringify(newMail(s, cancelled))}`);
show(cancelled, KNIFE, 36);
show(cancelled, KNIFE, 36, "staff");
s = tr.resolveOnlinePayment(tr.startOnlinePayment(s, KNIFE, guest(40)), KNIFE, "succeeded", system(40));
console.log(`  guest cancel after paying: ${blockText(tr.cancelBlock(get(s, KNIFE), "guest"))}`);
s = tr.markReady(s, KNIFE, staff(41));
const knifeStock = (st: DemoState) => st.data.products.find((p) => p.id === "p-knife")!.variants.find((v) => v.id === "m")!.stock;
const stockBefore = knifeStock(s);
s = tr.handOverAndComplete(s, KNIFE, staff(42));
console.log(`  on-hand knife M ${stockBefore} → ${knifeStock(s)}; log: ${get(s, KNIFE).log.slice(-2).map((e) => e.type).join(", ")}`);
show(s, KNIFE, 43);
expect("stock decremented once", stockBefore - knifeStock(s), 1);

console.log("\nMail log of the main path, by recipient");
console.log(`  ${mainMail.map((m) => `${m.template}→${m.to}${m.guestId ? `(${m.guestId})` : ""}`).join(", ")}`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures ? 1 : 0);
