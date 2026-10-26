import { expect, goto, test, type Language } from "../fixtures/demo";
import type { Page } from "@playwright/test";

// E3.1 hides tour booking (ADR-012, AC50): no menu leads to it, and its old addresses render nothing of it.
const bookingPath = /\/book|bookings|private-tour|requests\/private|products\/categories/;
const bookingButton = /\bbook|\bbuch(en|ung)/i;
const tour = "lucerne-the-things-that-remain";
const more: Record<Language, RegExp> = { en: /More/, de: /Mehr/ };
const about: Record<Language, string> = { en: "About this experience", de: "Über dieses Erlebnis" };
const notFound: Record<Language, { page: string; tour: string }> = {
  en: { page: "This page does not exist", tour: "This tour is unavailable" },
  de: { page: "Diese Seite gibt es nicht", tour: "Diese Tour ist nicht verfügbar" },
};
// Booking content of the old tour page: group prices, age bands, seats and the payment-by-departure row.
const bookingText: Record<Language, string[]> = {
  en: ["Prices for your group", "Depends on the departure", "no seat needed", "Ages 0–5", "CHF 89.00", "CHF 45.00", "CHF 0.00", "ordered separately from your booking"],
  de: ["Preise für Ihre Gruppe", "Je nach Termin", "kein Platz nötig", "0–5 Jahre", "CHF 89.00", "CHF 45.00", "CHF 0.00", "getrennt von Ihrer Buchung"],
};

const hrefs = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll(anchors => anchors.map(a => a.getAttribute("href") ?? ""));

async function expectNoBooking(page: Page, where: string) {
  expect(page.url(), `${where}: url`).not.toMatch(bookingPath);
  expect(await hrefs(page, "a[href]"), `${where}: links on the page`).not.toContainEqual(expect.stringMatching(bookingPath));
  await expect(page.getByRole("button", { name: bookingButton }), `${where}: booking button`).toHaveCount(0);
  await expect(page.getByRole("link", { name: bookingButton }), `${where}: booking link`).toHaveCount(0);
}

const mainText = (page: Page) => page.locator("main").first().innerText().catch(() => "");

// A route is a lazy chunk, so the old page stays up for a moment: wait until the main text changes.
async function visit(page: Page, hash: string) {
  const before = await mainText(page);
  const already = await page.evaluate(h => location.hash === `#${h}`, hash);

  await goto(page, hash);
  if (!already) await page.waitForFunction(prev => (document.querySelector("main") as HTMLElement | null)?.innerText.trim() && (document.querySelector("main") as HTMLElement).innerText !== prev, before);
  // Skeletons come before the content: wait until the text stops changing.
  let last = "";

  await expect.poll(async () => {
    const now = await mainText(page);
    const settled = now === last;

    last = now;

    return settled;
  }, { intervals: [200] }).toBe(true);
}

async function walk(page: Page, label: string, sources: Record<string, string[]>) {
  const all = new Set<string>();

  for (const [source, links] of Object.entries(sources)) {
    expect(links.length, `${label} ${source}: menu links found`).toBeGreaterThanOrEqual(minimum[source]);
    expect(links, `${label} ${source}: menu links`).not.toContainEqual(expect.stringMatching(bookingPath));
    links.filter(href => href.startsWith("/#/")).forEach(href => all.add(href));
  }
  expect(all.size, `${label}: pages visited`).toBeGreaterThan(0);
  for (const href of all) {
    await visit(page, href.slice(2));
    expect(page.url(), `${label} ${href}`).toContain(href.slice(1));
    await expectNoBooking(page, `${label} ${href}`);
  }
}

const minimum: Record<string, number> = { tabBar: 5, account: 3, phoneBar: 4, moreSheet: 5, sidebar: 10 };

test("[E3.1][AC50] no menu link leads to booking", async ({ seedDemo, language }) => {
  test.slow();
  const guest = await seedDemo("guest");
  const tabBar = await hrefs(guest, "nav a[href]");

  await visit(guest, "/account");
  const account = await hrefs(guest, "main a[href]");

  await walk(guest, "guest", { tabBar, account });

  const owner = await seedDemo("owner");

  await visit(owner, "/store");
  await expect(owner.getByRole("button", { name: more[language] })).toBeVisible();
  const phoneBar = await hrefs(owner, "nav a[href]");

  await owner.getByRole("button", { name: more[language] }).click();
  await expect(owner.getByRole("dialog")).toBeVisible();
  const moreSheet = await hrefs(owner, "[role=dialog] a[href]");

  await owner.keyboard.press("Escape");
  await owner.setViewportSize({ width: 1280, height: 800 });
  const sidebar = await hrefs(owner, "aside a[href]");

  await walk(owner, "owner", { phoneBar, moreSheet, sidebar });
});

test("[E3.1][AC50] old booking addresses render no booking", async ({ seedDemo, language }) => {
  const page = await seedDemo("guest");
  const expected = [
    [`/tours/${tour}/book`, notFound[language].page],
    ["/store/bookings", notFound[language].page],
    ["/account/bookings/x", notFound[language].page],
    ["/tours/private-tour", notFound[language].tour],
    ["/store/requests/private", notFound[language].page],
    ["/store/products/categories", notFound[language].page],
    ["/store/bookings/departures/x", notFound[language].page],
    ["/tours/x/book/review", notFound[language].page],
    ["/account/bookings/x/pay", notFound[language].page],
  ];

  for (const [hash, message] of expected) {
    // A fresh load each time, so the previous address's message cannot satisfy the next check.
    await page.goto("/favicon.png");
    await page.goto(`/#${hash}`);
    await expect(page.getByText(message), hash).toBeVisible();
    await expect(page.getByRole("dialog"), hash).toHaveCount(0);
    await expect(page.getByRole("button", { name: bookingButton }), hash).toHaveCount(0);
    await expect(page.getByRole("textbox"), `${hash}: no booking form`).toHaveCount(0);
    expect(await hrefs(page, "a[href]"), `${hash}: links`).not.toContainEqual(expect.stringMatching(bookingPath));
  }

  // The retired ?book=true parameter: the plain tour page, with no booking sheet.
  await page.goto("/favicon.png");
  await page.goto(`/#/tours/${tour}?book=true`);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByText(about[language])).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: bookingButton })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect(await hrefs(page, "a[href]"), "?book=true: links").not.toContainEqual(expect.stringMatching(bookingPath));
  const text = await page.locator("body").innerText();

  for (const needle of bookingText[language]) expect(text, needle).not.toContain(needle);
});
