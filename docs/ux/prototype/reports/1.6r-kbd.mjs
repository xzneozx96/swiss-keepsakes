// 1.6r keyboard pass: Tab order from load at 375 and 1024, with the focused element's name and whether it shows a ring.
import { chromium } from "/home/ross-geller/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core/index.mjs";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const b = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
for (const w of [375, 1024]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 812 } })).newPage();
  await p.goto("http://localhost:5215/#/sign-in?returnTo=%2Faccount");
  await p.waitForTimeout(1200);
  await p.locator("main, body").first().click({ position: { x: 1, y: 300 } }).catch(() => {});
  const seen = [];
  for (let i = 0; i < 14; i++) {
    await p.keyboard.press("Tab");
    seen.push(await p.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return "body";
      const cs = getComputedStyle(e);
      const ring = cs.outlineStyle !== "none" || cs.boxShadow !== "none";
      const name = e.getAttribute("aria-label") || e.innerText?.trim() || e.getAttribute("autocomplete") || e.tagName;
      const inBar = !!e.closest('[aria-label="Prototype controls"]');
      return `${inBar ? "[bar] " : ""}${name.slice(0, 40)}${ring ? " (ring)" : " (NO RING)"}`;
    }));
  }
  console.log(w, "\n  " + seen.join("\n  "));
}
await b.close();
