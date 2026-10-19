import { expect, goto, test, type Language } from "../fixtures/demo";

const words: Record<Language, Record<string, string>> = {
  en: {
    declineOrder: "Order SK-1031",
    decline: "Decline",
    declineSheet: "Decline order SK-1031",
    reason: "The keepsake is out of stock",
    declineSubmit: "Decline order",
    alertTitle: "Decline order SK-1031?",
    alertBody: "Tom Becker gets an email with your reason. Their other orders are not affected. This can’t be undone.",
    declined: "Declined by seller",
    acceptOrder: "Order SK-1032",
    accept: "Accept",
    acceptSheet: "Accept order SK-1032?",
    acceptSubmit: "Accept and request CHF 119.00",
    accepted: "Accepted, payment due",
    owed: "Payment due · CHF 119.00 by 14.10.2026, 10:00",
    record: "Record payment",
    recordSheet: "Record payment · SK-1032",
    amount: "Amount received",
    recordFirst: "Record CHF 20.00 cash. Balance will be CHF 99.00.",
    recordedFirst: "CHF 20.00 recorded. Balance CHF 99.00.",
    afterFirst: "Payment due · CHF 99.00 by 14.10.2026, 10:00",
    duplicate: "Possible duplicate",
    recordSecond: "Record CHF 20.00 cash again. Balance will be CHF 79.00.",
    recordedSecond: "CHF 20.00 recorded. Balance CHF 79.00.",
    afterSecond: "Payment due · CHF 79.00 by 14.10.2026, 10:00",
  },
  de: {
    declineOrder: "Bestellung SK-1031",
    decline: "Ablehnen",
    declineSheet: "Bestellung SK-1031 ablehnen",
    reason: "Das Andenken ist nicht mehr an Lager",
    declineSubmit: "Bestellung ablehnen",
    alertTitle: "Bestellung SK-1031 ablehnen?",
    alertBody: "Tom Becker erhält eine E-Mail mit Ihrem Grund. Andere Bestellungen sind nicht betroffen. Das lässt sich nicht rückgängig machen.",
    declined: "Vom Verkäufer abgelehnt",
    acceptOrder: "Bestellung SK-1032",
    accept: "Annehmen",
    acceptSheet: "Bestellung SK-1032 annehmen?",
    acceptSubmit: "Annehmen und CHF 119.00 anfordern",
    accepted: "Angenommen, Zahlung fällig",
    owed: "Zahlung fällig · CHF 119.00 bis 14.10.2026, 10:00",
    record: "Zahlung erfassen",
    recordSheet: "Zahlung erfassen · SK-1032",
    amount: "Erhaltener Betrag",
    recordFirst: "CHF 20.00 bar erfassen. Danach offen: CHF 99.00.",
    recordedFirst: "CHF 20.00 erfasst. Offen: CHF 99.00.",
    afterFirst: "Zahlung fällig · CHF 99.00 bis 14.10.2026, 10:00",
    duplicate: "Möglicherweise doppelt",
    recordSecond: "CHF 20.00 bar nochmals erfassen. Danach offen: CHF 79.00.",
    recordedSecond: "CHF 20.00 erfasst. Offen: CHF 79.00.",
    afterSecond: "Zahlung fällig · CHF 79.00 bis 14.10.2026, 10:00",
  },
};

test("[E0.8] merchant: decline one order, accept another, record a payment twice", async ({ seedDemo, language }) => {
  const w = words[language];
  const page = await seedDemo("owner");

  await goto(page, "/store/orders/sk-1031");
  await expect(page.getByRole("heading", { name: w.declineOrder }).first()).toBeVisible();
  await page.getByRole("button", { name: w.decline, exact: true }).click();

  const sheet = page.getByRole("dialog");

  await expect(sheet.getByText(w.declineSheet)).toBeVisible();
  await expect(sheet.getByRole("button", { name: w.declineSubmit })).toBeEnabled();
  await sheet.getByRole("radio", { name: w.reason }).check({ force: true });
  await expect(sheet.getByRole("radio", { name: w.reason })).toBeChecked();
  await sheet.getByRole("button", { name: w.declineSubmit }).click();

  const alert = page.getByRole("alertdialog");

  await expect(alert.getByText(w.alertTitle)).toBeVisible();
  await expect(alert.getByText(w.alertBody)).toBeVisible();
  await alert.getByRole("button", { name: w.declineSubmit }).click();
  await expect(page.getByText(w.declined).first()).toBeVisible();

  await goto(page, "/store/orders/sk-1032");
  await expect(page.getByRole("heading", { name: w.acceptOrder }).first()).toBeVisible();
  await page.getByRole("button", { name: w.accept, exact: true }).click();
  await expect(page.getByRole("dialog").getByText(w.acceptSheet)).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: w.acceptSubmit }).click();
  await expect(page.getByText(w.accepted).first()).toBeVisible();
  await expect(page.getByText(w.owed)).toBeVisible();

  await page.getByRole("button", { name: w.record }).click();
  const first = page.getByRole("dialog");

  await expect(first.getByText(w.recordSheet)).toBeVisible();
  await first.getByRole("textbox", { name: w.amount }).fill("20");
  await first.getByRole("textbox", { name: w.amount }).blur();
  await expect(first.getByText(w.duplicate)).toHaveCount(0);
  await first.getByRole("button", { name: w.recordFirst }).click();
  await expect(page.getByText(w.recordedFirst)).toBeVisible();
  await expect(page.getByText(w.afterFirst)).toBeVisible();

  await page.getByRole("button", { name: w.record }).click();
  const second = page.getByRole("dialog");

  await second.getByRole("textbox", { name: w.amount }).fill("20");
  await second.getByRole("textbox", { name: w.amount }).blur();
  await expect(second.getByText(w.duplicate)).toBeVisible();
  await second.getByRole("button", { name: w.recordSecond }).click();
  await expect(page.getByText(w.recordedSecond)).toBeVisible();
  await expect(page.getByText(w.afterSecond)).toBeVisible();
});
