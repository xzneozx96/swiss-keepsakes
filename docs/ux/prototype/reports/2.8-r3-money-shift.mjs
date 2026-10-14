// 2.8 round 3: proof that C13's money section renders as before. The C13 thumbnail makes the
// booking card taller, so the section starts lower and its icon anti-aliases differently in an
// element shot (2.8-r3-money-regress.out). This shifts the section by whole CSS pixels (up to 60 either way) and
// reports the offset at which each shot equals the round-2 baseline (AE 0).
// Usage: node 2.8-r3-money-shift.mjs   (Vite on 5232, no HMR; baseline in screens/2.8-r3/money-regress/before)
import { spawnSync } from "node:child_process";
import { chooseDeparture, fillContact, start, submitReview, toReview } from "./2.5-2.9-lib.mjs";

const t = await start("2.8-r3/money-regress/shift");
const { page, wait } = t;
const base = `${t.OUT}/../before`;
const book = async (slug, day, group) => {
  await chooseDeparture(t, slug, day, group);
  await toReview(t);
  await fillContact(t);
  await submitReview(t);
};
const match = async (name) => {
  for (const lang of ["EN", "DE"]) {
    await t.lang(lang);
    await wait(300);
    const sec = page.locator("section[aria-labelledby=booking-total]");
    const file = `${name}-${lang.toLowerCase()}.png`;
    let found = null;
    for (const d of [...Array(121).keys()].map((i) => (i % 2 ? -1 : 1) * Math.ceil(i / 2))) {
      if (found !== null) break;
      await sec.evaluate((s, d) => { s.style.marginTop = `${d}px`; }, d);
      await wait(120);
      await sec.screenshot({ path: `${t.OUT}/${file}` });
      const ae = spawnSync("compare", ["-metric", "AE", `${base}/${file}`, `${t.OUT}/${file}`, "null:"]).stderr.toString().trim();
      if (ae === "0") found = d;
    }
    await sec.evaluate((s) => { s.style.marginTop = ""; });
    t.check(`C13 money section ${file} equals the baseline when shifted`, found !== null, `offset ${found} px`);
  }
  await t.lang("EN");
};

await t.reset();
await t.signIn();
await book("lucerne-old-town-walk", "Fri 16 Oct", { adults: 2, children: 1, infants: 0 });
await page.getByRole("button", { name: /^Pay CHF 66\.90/ }).click();
await wait(1000);
await match("c13-money-deposit");
await book("lake-lucerne-stories", "17 Oct", { adults: 2, children: 0, infants: 0 });
await match("c13-money-pay-later");
await t.finish();
