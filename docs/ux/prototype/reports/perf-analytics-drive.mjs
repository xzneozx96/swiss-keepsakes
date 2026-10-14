// Analytics performance in the browser: for M02 Overview, P02 and the M15 Analytics tab,
// times opening the screen (hash change -> charts drawn), the main-thread work it costs (CDP
// TaskDuration / ScriptDuration), a period switch on each screen, and the hottest functions
// of one opening (CPU profile, self time). Reads a few rendered numbers for a before/after diff.
// Run: PW=<path to playwright-core> node perf-analytics-drive.mjs <label>  (Vite on 5207)
import { readdirSync, writeFileSync } from "node:fs";

const { chromium } = await import(process.env.PW ?? "playwright-core");
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const LABEL = process.argv[2] ?? "run";
const BASE = process.env.BASE ?? "http://localhost:5207/";
const RUNS = 5;
const browser = await chromium.launch({
  executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`,
});
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Performance.enable");
// Counts React commits through the DevTools hook, to tell more renders from slower renders.
await page.addInitScript(() => {
  window.__commits = 0;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false,
    supportsFiber: true,
    renderers: new Map(),
    inject(r) { this.renderers.set(1, r); return 1; },
    onCommitFiberRoot() { window.__commits++; },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    onScheduleFiberRoot() {},
    checkDCE() {},
  };
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const metrics = async () => {
  const { metrics: m } = await cdp.send("Performance.getMetrics");
  const get = (n) => m.find((x) => x.name === n).value * 1000;
  return { task: get("TaskDuration"), script: get("ScriptDuration") };
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const setRole = async (role) => {
  await page.evaluate((r) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = r;
    // P02 opens only after the P01 code (step 5.6): a verified session for Hotel am See.
    if (r === "partner" && s.data.partnerSessions)
      s.data.partnerSessions = [{ token: "r7Kq2mVx", partnerId: "hotel-am-see", verifiedAt: "2026-10-13T08:00:00.000Z" }];
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, role);
};

/** Runs `act`, waits until `ready` holds, then 800 ms to settle; wall time and CPU work. */
async function measure(act, ready) {
  await page.waitForTimeout(400);
  const before = await metrics();
  const c0 = await page.evaluate(() => window.__commits);
  const t0 = await page.evaluate(() => performance.now());
  await act();
  await page.waitForFunction(ready, null, { polling: "raf", timeout: 30_000 }).catch(async (e) => {
    console.log("TIMEOUT at", await page.evaluate(() => `${location.hash} ${document.querySelector("main")?.innerText.slice(0, 200)}`));
    throw e;
  });
  const t1 = await page.evaluate(() => performance.now());
  await page.waitForTimeout(800);
  const after = await metrics();
  const commits = (await page.evaluate(() => window.__commits)) - c0;
  return { wall: t1 - t0, task: after.task - before.task, script: after.script - before.script, commits };
}

async function profile(act, ready) {
  await page.waitForTimeout(400);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
  await cdp.send("Profiler.start");
  await act();
  await page.waitForFunction(ready, null, { polling: "raf", timeout: 60_000 });
  await page.waitForTimeout(800);
  const { profile: p } = await cdp.send("Profiler.stop");
  const self = new Map();
  const dt = new Map(p.samples.map((id, i) => [i, p.timeDeltas[i] ?? 0]));
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  p.samples.forEach((id, i) => {
    const f = byId.get(id).callFrame;
    if (["(idle)", "(program)", "(garbage collector)", "(root)"].includes(f.functionName)) {
      self.set(f.functionName, (self.get(f.functionName) ?? 0) + dt.get(i) / 1000);
      return;
    }
    const file = f.url.replace(/^.*\/(src|node_modules\/\.vite\/deps)\//, "").replace(/\?.*$/, "");
    const key = `${f.functionName || "(anonymous)"} ${file}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + dt.get(i) / 1000);
  });
  return [...self.entries()].filter(([k]) => k !== "(idle)").sort((a, b) => b[1] - a[1]).slice(0, 14);
}

const go = (hash) => () => page.evaluate((h) => { location.hash = h; }, hash);
const fmt = (r) => `wall ${r.wall.toFixed(0)} ms to ready · main-thread task ${r.task.toFixed(0)} ms · script ${r.script.toFixed(0)} ms · ${r.commits} React commits`;

const screens = [
  {
    name: "M02 Overview (#/store)",
    role: "manager",
    from: "#/store/orders",
    to: "#/store",
    ready: () => document.querySelectorAll('section[aria-labelledby="overview-analytics"] .recharts-surface').length > 0,
    tab: { name: "30 days", ready: () => /30/.test(document.querySelector('section[aria-labelledby="overview-analytics"] [role="tab"][aria-selected="true"]')?.textContent ?? "") },
    read: () => [...document.querySelectorAll('section[aria-labelledby="overview-analytics"] dl dd, section[aria-labelledby="overview-alltime"] dd')].map((e) => e.textContent.trim()).slice(0, 30),
  },
  {
    name: "P02 Partner report (#/partner/r7Kq2mVx)",
    role: "partner",
    from: "#/partner/r7Kq2mVx?period=day",
    to: "#/partner/r7Kq2mVx",
    ready: () => !!document.querySelector('section[aria-labelledby="report-chart"]') && location.hash === "#/partner/r7Kq2mVx",
    tab: { name: "Week", ready: () => /period=week/.test(location.hash) && !!document.querySelector('section[aria-labelledby="report-chart"]') },
    read: () => [...document.querySelectorAll('section[aria-labelledby="report-numbers"] dd, section[aria-labelledby="report-alltime"] dd')].map((e) => e.textContent.trim()).slice(0, 30),
  },
  {
    name: "M15 Analytics tab (#/store/partners?view=analytics)",
    role: "manager",
    from: "#/store/partners",
    to: "#/store/partners?view=analytics",
    ready: () => document.querySelectorAll(`section[aria-labelledby="partner-daily"] .recharts-surface`).length > 0,
    tab: { name: "7 days", ready: () => [...document.querySelectorAll(`[role="tab"][aria-selected="true"]`)].some((e) => e.textContent === "7 days") && !!document.querySelector(`section[aria-labelledby="partner-daily"] .recharts-surface`) },
    read: () => [...document.querySelectorAll(`dl dd, section[aria-labelledby="partner-compare"] td`)].map((e) => e.textContent.trim()).slice(0, 40),
  },
];

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(1500);

const out = { label: LABEL, screens: {} };
console.log(`perf-analytics drive (${LABEL}), 375x812, chrome-headless-shell ${dir}`);
for (const s of screens) {
  await page.goto(BASE + s.from);
  await setRole(s.role);
  await page.reload();
  await page.waitForTimeout(1500);
  // First opening after a reload: the route chunk loads too.
  const cold = await measure(go(s.to), s.ready);
  const opens = [];
  for (let i = 0; i < RUNS; i++) {
    await go(s.from)();
    await page.waitForTimeout(600);
    opens.push(await measure(go(s.to), s.ready));
  }
  const values = await page.evaluate(s.read);
  // Period switch on the open screen.
  const tab = await measure(
    () => page.getByRole("tab", { name: s.tab.name, exact: true }).first().click(),
    s.tab.ready,
  );
  await go(s.from)();
  await page.waitForTimeout(600);
  const hot = await profile(go(s.to), s.ready);
  const m = {
    wall: median(opens.map((r) => r.wall)),
    task: median(opens.map((r) => r.task)),
    script: median(opens.map((r) => r.script)),
    commits: median(opens.map((r) => r.commits)),
  };
  console.log(`\n${s.name}`);
  console.log(`  first open after reload: ${fmt(cold)}`);
  console.log(`  open, median of ${RUNS}: ${fmt(m)}`);
  console.log(`  period switch to "${s.tab.name}": ${fmt(tab)}`);
  console.log("  hottest functions while opening (self ms):");
  for (const [k, v] of hot) console.log(`    ${v.toFixed(1).padStart(7)}  ${k}`);
  out.screens[s.name] = { cold, open: m, tab, values };
}
console.log(`\npage errors: ${errors.length ? errors.join(" | ") : "none"}`);
writeFileSync(new URL(`./perf-analytics-drive-${LABEL}.json`, import.meta.url), JSON.stringify(out, null, 1));
await browser.close();
