// Round 3 (worker S, 14 Oct 2026): M06 outcome buttons in their own dashed box, as the locked Complete
// booking panel (M04 1.15r), one full-width button per row; M07 renders the same component.
//   PHASE=before|after: M06 walk-13 (ended) and walk-14 (upcoming), M07 tour-anna (confirmed, ended)
//     and tour-marie (delivered, Complete locked), 375 and 1024, EN, into screens/2.11-r3/<PHASE>/.
//   PHASE=final (default): gift-vs-tour pairs into screens/2.11-r3/: M04 with the locked Complete
//     panel against M06 and M07, 375 and 1024, tour EN and DE; plus the box and button measurements.
// Run next to 2.10-lib.mjs, against the dev server on 5233: node 2.11-r3-capture.mjs
import * as d from "./2.10-lib.mjs";
import { mkdirSync } from "node:fs";

const PHASE = process.env.PHASE ?? "final";
const DIR = PHASE === "final" ? "2.11-r3" : `2.11-r3/${PHASE}`;

/** Full page by growing the viewport, after every visible image has loaded; overflow and raw-key checks. */
async function snap(page, name) {
  mkdirSync(`${d.ROOT}/${DIR}`, { recursive: true });
  await d.wait(page, 400);
  const size = page.viewportSize();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
  await d.wait(page, 300);
  await page.waitForFunction(() => [...document.images].filter((i) => i.offsetParent).every((i) => i.complete), null, { timeout: 5000 }).catch(() => console.log("WARN images still loading"));
  await page.screenshot({ path: `${d.ROOT}/${DIR}/${name}.png` });
  await page.setViewportSize(size);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  d.check(`${DIR}/${name}.png: no horizontal overflow`, overflow <= 0, `overflow ${overflow}px`);
  if (name.endsWith("-de")) {
    const raw = (await page.locator("body").innerText()).match(/\b(tourMerchant|tours|tourBooking|fulfilment|merchantOrders)\.[a-zA-Z]/);
    d.check(`${DIR}/${name}.png: no raw i18n keys`, !raw, raw?.[0] ?? "");
  }
}
const tourBoth = async (page, name) => { await snap(page, `${name}-tour-en`); await d.setLang(page, "DE"); await snap(page, `${name}-tour-de`); await d.setLang(page, "EN"); };

/**
 * The dashed box around a visible button with the given name: its look, and each button's width
 * against the box's content width and its height.
 */
const box = (page, name) => page.evaluate((label) => {
  const button = [...document.querySelectorAll("main button")].find((b) => b.offsetParent && b.textContent.trim() === label);
  if (!button) return null;
  const panel = button.closest(".border-dashed");
  const s = getComputedStyle(panel);
  const inner = panel.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  return {
    look: `${s.borderTopStyle} ${s.borderTopWidth} ${s.borderTopColor} r${s.borderTopLeftRadius} p${s.paddingTop}`,
    buttons: [...panel.querySelectorAll("button")].map((b) => ({ text: b.textContent.trim(), full: Math.abs(b.getBoundingClientRect().width - inner) < 1, height: b.getBoundingClientRect().height, top: Math.round(b.getBoundingClientRect().top) })),
  };
}, name);

/** First gift order that is ready and still owes money; marked handed over, its Complete is locked. */
async function giftLocked(page) {
  const id = (await d.state(page)).data.orders.find((o) => o.status === "ready" &&
    o.payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0) < o.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))?.id;
  await d.go(page, `/store/orders/${id}`, 1500);
  await page.getByRole("button", { name: "Mark as handed over" }).click();
  await d.wait(page, 900);
  return id;
}

for (const width of [375, 1024]) {
  console.log(`\n=== width ${width}`);
  const { browser, page } = await d.open(width);
  await d.reset(page, "owner");
  if (PHASE !== "final") {
    await d.go(page, "/store/bookings/departures/walk-13", 1500);
    await snap(page, `m06-${width}-en`);
    await d.go(page, "/store/bookings/departures/walk-14", 1500);
    await snap(page, `m06-upcoming-${width}-en`);
    await d.go(page, "/store/bookings/tour-anna", 1500);
    await snap(page, `m07-anna-${width}-en`);
    await d.go(page, "/store/bookings/tour-marie", 1500);
    await snap(page, `m07-marie-${width}-en`);
  } else {
    const gift = await giftLocked(page);
    console.log("gift M04 order (handed over, still owes):", gift);
    await snap(page, `m04-locked-${width}-gift-en`);
    const giftBox = await box(page, "Complete order");
    console.log("M04 locked Complete box:", JSON.stringify(giftBox));

    await d.go(page, "/store/bookings/departures/walk-13", 1500);
    await tourBoth(page, `m06-${width}`);
    const outcome = await box(page, "Service delivered");
    const locked = await box(page, "Complete booking");
    console.log("M06 outcome box:", JSON.stringify(outcome), "\nM06 locked Complete box:", JSON.stringify(locked));
    d.check(`M06 ${width}: outcome buttons sit in a dashed box with the locked Complete box's look`, outcome && locked && outcome.look === locked.look && outcome.look === giftBox.look, `${outcome?.look} · Complete ${locked?.look} · M04 ${giftBox?.look}`);
    d.check(`M06 ${width}: Service delivered and No-show each take the full box width, one per row`, outcome?.buttons.length === 2 && outcome.buttons.every((b) => b.full) && outcome.buttons[0].top < outcome.buttons[1].top, JSON.stringify(outcome?.buttons));
    d.check(`M06 ${width}: outcome buttons are the Complete booking button's size`, outcome?.buttons.every((b) => b.height === locked.buttons[0].height), `${outcome?.buttons.map((b) => b.height)} vs ${locked?.buttons[0].height}`);

    await d.go(page, "/store/bookings/departures/walk-14", 1500);
    await tourBoth(page, `m06-upcoming-${width}`);

    await d.go(page, "/store/bookings/tour-anna", 1500);
    await tourBoth(page, `m07-${width}`);
    const m07 = await box(page, "Service delivered");
    const m07Locked = await box(page, "Complete booking");
    console.log("M07 outcome box:", JSON.stringify(m07), "\nM07 locked Complete box:", JSON.stringify(m07Locked));
    d.check(`M07 ${width}: same dashed box, full-width buttons one per row, Complete's size`, m07 && m07Locked && m07.look === m07Locked.look && m07.buttons.length === 2 && m07.buttons.every((b) => b.full && b.height === m07Locked.buttons[0].height) && m07.buttons[0].top < m07.buttons[1].top, JSON.stringify(m07?.buttons));
  }
  await browser.close();
}
d.summary();
