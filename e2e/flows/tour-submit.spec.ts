import { expect, goto, test, type Language } from "../fixtures/demo";
import type { Page } from "@playwright/test";

const words: Record<Language, Record<string, string>> = {
  en: {
    choose: "Choose a departure",
    reviewBooking: "Review booking · CHF 223.00",
    reviewTitle: "Review your booking",
    contactName: "Contact name",
    mobile: "Mobile number",
    toPayment: "Continue to payment · CHF 66.90",
    payTitle: "Places reserved for 15:00",
    capacity: "There are not enough places left for your group",
  },
  de: {
    choose: "Termin wählen",
    reviewBooking: "Buchung prüfen · CHF 223.00",
    reviewTitle: "Buchung prüfen",
    contactName: "Kontaktname",
    mobile: "Mobilnummer",
    toPayment: "Zur Zahlung · CHF 66.90",
    payTitle: "Plätze noch 15:00 reserviert",
    capacity: "Für Ihre Gruppe sind nicht genug Plätze frei",
  },
};

async function openReview(page: Page, w: Record<string, string>) {
  await goto(page, "/tours/lucerne-the-things-that-remain");
  await page.getByText(w.choose).first().click();
  await page.getByRole("dialog").getByRole("button", { name: w.reviewBooking }).click();
  await expect(page.getByRole("heading", { name: w.reviewTitle })).toBeVisible();
  await page.getByRole("textbox", { name: w.contactName }).fill("Test Guest");
  await page.getByRole("textbox", { name: w.mobile }).fill("+41 79 123 45 67");
}

const guestBookings = (page: Page) =>
  page.evaluate(() => {
    const { data } = JSON.parse(localStorage.getItem("sk.demo")!);

    // Every real user is the demo guest until the account feature moves to the API.
    return data.tours.bookings.filter((b: { guestId: string }) => b.guestId === "g-anna").length as number;
  });

// A phone is slower than the test machine: 4x CPU throttle, as the render checks use.
async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);

  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

test("[E1.11] tour: a successful booking never shows the capacity alert", async ({ seedDemo, language }) => {
  const w = words[language];
  const page = await seedDemo();

  await openReview(page, w);
  await throttle(page);
  // Records the alert even if it shows for a single frame before the payment page opens.
  await page.evaluate((needle) => {
    const seen = { capacity: false };

    Object.assign(window, { seen });
    new MutationObserver(() => {
      if (document.body.innerText.includes(needle)) seen.capacity = true;
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  }, w.capacity);
  await page.getByRole("button", { name: w.toPayment }).click();

  await expect(page.getByText(w.payTitle)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { seen: { capacity: boolean } }).seen.capacity)).toBe(false);
});

test("[E1.11] tour: tapping Continue to payment again books once", async ({ seedDemo, language }) => {
  const w = words[language];
  const page = await seedDemo();

  await openReview(page, w);
  const before = await guestBookings(page);

  const button = await page.getByRole("button", { name: w.toPayment }).elementHandle();

  await throttle(page);
  // Taps through the DOM, so Playwright's own waits add no delay: two in the same task, before
  // React can re-render, and a third 10 ms later.
  await button!.evaluate(async (element: HTMLElement) => {
    element.click();
    element.click();
    await new Promise(resolve => setTimeout(resolve, 10));
    if (element.isConnected) element.click();
  });

  await expect(page.getByText(w.payTitle)).toBeVisible();
  await page.waitForTimeout(500);
  expect(await guestBookings(page)).toBe(before + 1);
});
