// 2.8 round 3: C13's money section must not change while C16 takes the deadline and Pay into its
// ticket. Element shots of C13's "Booking total" section (deposit and pay later), EN and DE.
// The C13 thumbnail moves the page, so this compares the section, not the full page.
// Usage: SHOTS=2.8-r3/money-regress/<before|after> node 2.8-r3-money-regress.mjs [repo root]   (Vite on 5232, no HMR)
import { chooseDeparture, fillContact, start, submitReview, toReview } from "./2.5-2.9-lib.mjs";

const t = await start(process.env.SHOTS);
const { page, wait } = t;
const book = async (slug, day, group) => {
  await chooseDeparture(t, slug, day, group);
  await toReview(t);
  await fillContact(t);
  await submitReview(t);
};
const money = async (name) => {
  for (const lang of ["EN", "DE"]) {
    await t.lang(lang);
    await wait(300);
    await page.locator("section[aria-labelledby=booking-total]").screenshot({ path: `${t.OUT}/${name}-${lang.toLowerCase()}.png` });
    console.log("SHOT", name, lang);
  }
  await t.lang("EN");
};

await t.reset();
await t.signIn();
await book("lucerne-old-town-walk", "Fri 16 Oct", { adults: 2, children: 1, infants: 0 });
await page.getByRole("button", { name: /^Pay CHF 66\.90/ }).click();
await wait(1000);
await money("c13-money-deposit");
await book("lake-lucerne-stories", "17 Oct", { adults: 2, children: 0, infants: 0 });
await money("c13-money-pay-later");
await t.finish();
