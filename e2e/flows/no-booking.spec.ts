import { expect, goto, test, type Language } from "../fixtures/demo";
import type { Page } from "@playwright/test";

// E3.1 hides tour booking (ADR-012, AC50): no menu leads to it, and its old addresses render nothing of it.
const bookingPath = /\/book|bookings|private-tour|requests\/private|products\/categories/;
const bookingButton = /\bbook|\bbuch(en|ung)/i;
const tour = "lucerne-the-things-that-remain";
const more: Record<Language, RegExp> = { en: /More/, de: /Mehr/ };

const hrefs = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll(anchors => anchors.map(a => a.getAttribute("href") ?? ""));

async function expectNoBooking(page: Page, where: string) {
  expect(page.url(), `${where}: url`).not.toMatch(bookingPath);
  expect(await hrefs(page, "a[href]"), `${where}: links on the page`).not.toContainEqual(expect.stringMatching(bookingPath));
  await expect(page.getByRole("button", { name: bookingButton }), `${where}: booking button`).toHaveCount(0);
  await expect(page.getByRole("link", { name: bookingButton }), `${where}: booking link`).toHaveCount(0);
}

async function walk(page: Page, label: string, collected: string[]) {
  const unique = [...new Set(collected)].filter(href => href.startsWith("/#/"));

  expect(unique.length, `${label}: menu links found`).toBeGreaterThan(3);
  expect(unique, `${label}: menu links`).not.toContainEqual(expect.stringMatching(bookingPath));
  for (const href of unique) {
    await goto(page, href.slice(2));
    await expect(page.locator("main").first()).toBeVisible();
    await expectNoBooking(page, `${label} ${href}`);
  }
}

test("[E3.1][AC50] no menu link leads to booking", async ({ seedDemo, language }) => {
  const guest = await seedDemo("guest");

  await goto(guest, "/");
  const guestLinks = await hrefs(guest, "nav a[href]");

  await goto(guest, "/account");
  await expect(guest.locator("main").first()).toBeVisible();
  guestLinks.push(...await hrefs(guest, "main a[href]"));
  await walk(guest, "guest", guestLinks);

  const owner = await seedDemo("owner");

  await goto(owner, "/store");
  await expect(owner.getByRole("button", { name: more[language] })).toBeVisible();
  const ownerLinks = await hrefs(owner, "nav a[href]");

  await owner.getByRole("button", { name: more[language] }).click();
  await expect(owner.getByRole("dialog")).toBeVisible();
  ownerLinks.push(...await hrefs(owner, "[role=dialog] a[href]"));
  await owner.keyboard.press("Escape");
  await owner.setViewportSize({ width: 1280, height: 800 });
  ownerLinks.push(...await hrefs(owner, "aside a[href]"));
  await walk(owner, "owner", ownerLinks);
});

test("[E3.1][AC50] old booking addresses render no booking", async ({ seedDemo }) => {
  const page = await seedDemo("guest");

  for (const hash of [`/tours/${tour}/book`, "/store/bookings", "/account/bookings/x", "/tours/private-tour"]) {
    await goto(page, hash);
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog"), hash).toHaveCount(0);
    await expect(page.getByRole("button", { name: bookingButton }), hash).toHaveCount(0);
    await expect(page.getByRole("textbox"), `${hash}: no booking form`).toHaveCount(0);
    expect(await hrefs(page, "a[href]"), `${hash}: links`).not.toContainEqual(expect.stringMatching(bookingPath));
  }

  // The retired ?book=true parameter: the plain tour page, with no booking sheet.
  await goto(page, `/tours/${tour}?book=true`);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: bookingButton })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
