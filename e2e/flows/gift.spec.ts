import { expect, goto, test, type Language } from "../fixtures/demo";

const words: Record<Language, Record<string, string>> = {
  en: {
    title: "Victorinox Swan on the lake",
    add: "Add to cart",
    dialog: "Your keepsake",
    small: "Small · 58 mm Classic SD",
    shop: "Shop Altstadt",
    addSheet: "Add to cart · CHF 49.00",
    cart: "Cart",
    cont: "Continue",
    review: "Review and send",
    send: "Send request · no payment yet",
    sent: "Request sent",
    intro: "Your request went to the seller as 1 order. Nothing has been charged.",
    status: "Awaiting seller confirmation",
    nothingToPay: "Nothing to pay yet",
  },
  de: {
    title: "Victorinox Schwan auf dem See",
    add: "In den Warenkorb",
    dialog: "Ihr Andenken",
    small: "Klein · 58 mm Classic SD",
    shop: "Laden Altstadt",
    addSheet: "In den Warenkorb · CHF 49.00",
    cart: "Warenkorb",
    cont: "Weiter",
    review: "Prüfen und senden",
    send: "Anfrage senden · noch keine Zahlung",
    sent: "Anfrage gesendet",
    intro: "Ihre Anfrage ging als 1 Bestellung an den Verkäufer. Es wurde nichts belastet.",
    status: "Wartet auf Bestätigung",
    nothingToPay: "Noch nichts zu bezahlen",
  },
};

test("[E0.8] gift: from the detail page to the sent request", async ({ seedDemo, language }) => {
  const w = words[language];
  const page = await seedDemo();

  await goto(page, "/gifts/victorinox-swan");
  await expect(page.getByRole("heading", { name: w.title })).toBeVisible();
  await page.getByRole("button", { name: w.add }).first().click();

  const dialog = page.getByRole("dialog");

  await expect(dialog.getByText(w.dialog)).toBeVisible();
  await dialog.getByText(w.small).first().click();
  await dialog.getByRole("button", { name: /16/ }).filter({ hasNotText: /Previous|Next|Vorher|Nächst|Zurück|Weiter/ }).first().click();
  await expect(dialog.getByRole("radio")).toHaveCount(2);
  await dialog.getByRole("radio", { name: new RegExp(w.shop) }).check({ force: true });
  await dialog.getByRole("button", { name: w.addSheet }).click();

  await goto(page, "/cart");
  await expect(page.getByRole("heading", { name: w.cart, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: w.title })).toBeVisible();
  await page.getByRole("checkbox", { name: new RegExp(w.title) }).check({ force: true });
  await page.getByRole("button", { name: w.cont }).first().click();

  await expect(page.getByRole("heading", { name: w.review })).toBeVisible();
  await expect(page.getByText(w.shop).first()).toBeVisible();
  await expect(page.getByText("CHF 49.00").first()).toBeVisible();
  await page.getByRole("button", { name: w.send }).click();

  await expect(page.getByRole("heading", { name: w.sent })).toBeVisible();
  await expect(page.getByText(w.intro)).toBeVisible();
  await expect(page.getByText(/SK-\d+/).first()).toBeVisible();
  await expect(page.getByText(w.status).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: w.title })).toBeVisible();
});
