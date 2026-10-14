// Back-button navigation check (owner bug, 14 Oct): Back must never push the parent, which made
// two screens bounce forever. Run: node backnav-drive.mjs (BASE env, default localhost:5240).
import { chromium } from "playwright-core";
const exe = process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const B = process.env.BASE || "http://localhost:5240/";
let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, x); };
const br = await chromium.launch({ executablePath: exe });
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
const hash = () => decodeURIComponent(new URL(page.url()).hash);
// The screen's ← : the topmost icon-only button below the prototype bar.
const back = async () => {
  const ok = await page.evaluate(() => {
    const bs = [...document.querySelectorAll("button[aria-label]")].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.top > 36 && r.top < 200 && !b.innerText.trim() && /back|zurück|edit|bearbeiten|bookings|buchungen/i.test(b.getAttribute("aria-label"));
    }).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    if (!bs.length) return false;
    bs[0].click();
    return bs[0].getAttribute("aria-label");
  });
  await page.waitForTimeout(800);
  return ok ? hash() : "(no back)";
};
const fresh = async (signIn = true) => {
  await page.goto(B); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  if (signIn) {
    await page.goto(B + "#/sign-in?returnTo=/"); await page.waitForTimeout(600);
    await page.getByRole("button", { name: /Continue with Google/ }).click(); await page.waitForTimeout(800);
  }
};
const seedCart = async () => {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    const p = s.data.products.find((x) => x.slug === "kapellbruecke-pocket-knife");
    const d = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    s.data.cart = [{ id: "loop-1", productId: p.id, variantId: p.variants[0].id, quantity: 1, pickupDate: d, pickupPlaceId: (p.pickupPlaceIds || [])[0] || "altstadt", selected: true }];
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(800);
};
const tap = async (re) => { await page.getByRole("link", { name: re }).or(page.getByRole("button", { name: re })).first().click(); await page.waitForTimeout(900); };

// A. Owner's report: account?tab=bookings -> booking detail -> Back -> Back
await fresh();
await page.goto(B + "#/"); await page.waitForTimeout(400);
await page.goto(B + "#/account?tab=bookings"); await page.waitForTimeout(900);
await page.locator('a[href*="/account/bookings/tour-anna"]').first().click(); await page.waitForTimeout(900);
const a1 = await back(), a2 = await back();
check("A booking detail Back returns to the list", a1 === "#/account?tab=bookings", a1);
check("A list Back does not bounce to the detail", !a2.includes("/account/bookings/"), a2);

// B. Gift: cart -> C06 review -> Back -> Back
await fresh(); await seedCart();
await page.goto(B + "#/"); await page.waitForTimeout(400);
await page.goto(B + "#/cart"); await page.waitForTimeout(1200);
await page.getByRole("button", { name: /Continue|Weiter|Review/i }).last().click(); await page.waitForTimeout(1200);
const b0 = hash(), b1 = await back(), b2 = await back();
check("B reached C06", b0 === "#/cart/review", b0);
check("B C06 Back returns to the cart", b1 === "#/cart", b1);
check("B cart Back does not bounce to C06", b2 !== "#/cart/review", b2);

// C. C06 Edit cart, then cart Back
await fresh(); await seedCart();
await page.goto(B + "#/"); await page.waitForTimeout(400);
await page.goto(B + "#/cart"); await page.waitForTimeout(1200);
await page.getByRole("button", { name: /Continue|Weiter|Review/i }).last().click(); await page.waitForTimeout(1200);
const editCart = page.getByRole("button", { name: /Edit cart|Warenkorb bearbeiten/i }).or(page.getByRole("link", { name: /Edit cart|Warenkorb bearbeiten/i })).first();
if (await editCart.count()) {
  await editCart.click(); await page.waitForTimeout(900);
  const c1 = hash(), c2 = await back();
  check("C Edit cart returns to the cart", c1 === "#/cart", c1);
  check("C cart Back after Edit cart does not bounce to C06", c2 !== "#/cart/review", c2);
} else console.log("INFO C06 has no Edit cart control in this state");

// D. Tour booking: list -> detail -> C10 -> C11 -> Edit -> Back -> Back
await fresh();
await page.goto(B + "#/tours"); await page.waitForTimeout(1000);
await page.locator('a[href*="/tours/lucerne-old-town-walk"]').first().click(); await page.waitForTimeout(1200);
await tap(/Choose a departure|Termin wählen/i);
const d0 = hash();
await page.getByRole("button", { name: /Continue|Weiter|Review/i }).last().click(); await page.waitForTimeout(1200);
const d1 = hash(), d2 = await back(), d3 = await back(), d4 = await back();
check("D reached C10 then C11", d0.endsWith("/book") && d1.endsWith("/book/review"), `${d0} ${d1}`);
check("D C11 Edit returns to C10", d2.endsWith("/book"), d2);
check("D C10 Back returns to the tour", /#\/tours\/lucerne-old-town-walk$/.test(d3), d3);
check("D tour Back returns to the list, no bounce", d4 === "#/tours", d4);

// E. Signed out: C10 -> C11 -> sign in -> C11 -> Edit
await fresh(false);
await page.goto(B + "#/tours/lucerne-old-town-walk"); await page.waitForTimeout(1200);
await tap(/Choose a departure|Termin wählen/i);
await page.getByRole("button", { name: /Continue|Weiter|Review/i }).last().click(); await page.waitForTimeout(1200);
// The form validates first: fill the contact and participant fields.
for (const box of await page.getByRole("textbox").all()) {
  const type = await box.getAttribute("type");
  await box.fill(type === "tel" ? "+41 79 123 45 67" : "Anna Keller");
}
await page.getByRole("button", { name: /^Sign in$|^Anmelden$/ }).last().click(); await page.waitForTimeout(1200);
console.log("INFO after Sign in:", hash(), (await page.getByRole("button").allInnerTexts()).filter(Boolean).join(" | ").slice(0, 200));
await page.getByRole("button", { name: /Continue with Google/ }).click(); await page.waitForTimeout(1200);
const e0 = hash(), e1 = await back();
check("E sign-in returns to C11", e0.endsWith("/book/review"), e0);
check("E Edit after sign-in leaves C11", !e1.endsWith("/book/review"), e1);

// F. Gift, signed out: cart -> Continue -> sign in -> C06 -> Back -> Back
await fresh(false);
await seedCart();
await page.goto(B + "#/"); await page.waitForTimeout(400);
await page.goto(B + "#/cart"); await page.waitForTimeout(1200);
await page.getByRole("button", { name: /Continue|Weiter|Review/i }).last().click(); await page.waitForTimeout(1200);
const f0 = hash();
if (f0.startsWith("#/sign-in")) {
  await page.getByRole("button", { name: /Continue with Google/ }).click(); await page.waitForTimeout(1200);
}
const f1 = hash(), f2 = await back(), f3 = await back();
check("F sign-in from the cart lands on C06", f1 === "#/cart/review", `${f0} -> ${f1}`);
check("F C06 Back returns to the cart", f2 === "#/cart", f2);
check("F cart Back leaves the flow (no C06, no sign-in)", f3 !== "#/cart/review" && !f3.startsWith("#/sign-in"), f3);

// G. Account tab signed out: sign in from the hub, then Back leaves the hub
await fresh(false);
await page.goto(B + "#/"); await page.waitForTimeout(400);
await page.goto(B + "#/account?tab=bookings"); await page.waitForTimeout(900);
const signInBtn = page.getByRole("button", { name: /^Sign in$|^Anmelden$/ }).first();
if (await signInBtn.count()) {
  await signInBtn.click(); await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Continue with Google/ }).click(); await page.waitForTimeout(1200);
  const g0 = hash();
  await page.goBack(); await page.waitForTimeout(800);
  const g1 = hash();
  check("G sign-in returns to the bookings tab", g0 === "#/account?tab=bookings", g0);
  check("G browser Back leaves the account (no duplicate, no sign-in)", g1 === "#/", g1);
} else console.log("INFO account tab shows no Sign in button");

check("no page errors", errs.length === 0, errs.join("; ").slice(0, 200));
await br.close();
console.log(`${pass} passed, ${fail} failed`);
