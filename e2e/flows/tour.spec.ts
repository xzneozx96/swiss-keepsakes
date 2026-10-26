import { expect, goto, test, type Language } from "../fixtures/demo";

const words: Record<Language, Record<string, string>> = {
  en: {
    title: "Luzerne: The Things That Remain",
    choose: "Choose a departure",
    departure: "Fri 16 Oct",
    seats: "9 seats available · 30% deposit when booking",
    group: "Your group uses 3 seats",
    reviewBooking: "Review booking · CHF 223.00",
    reviewTitle: "Review your booking",
    contactName: "Contact name",
    mobile: "Mobile number",
    toPayment: "Continue to payment · CHF 66.90",
    payTitle: "Places reserved for 15:00",
    provider: "SIMULATED PAYMENT PROVIDER · PROTOTYPE · NO REAL MONEY MOVES",
    pay: "Pay CHF 66.90",
    confirmed: "Your places are confirmed",
    status: "Deposit paid · balance due",
    balance: "Pay remaining balance · CHF 156.10",
    balanceDue: "Balance due by Thu, 15 Oct, 18:00",
  },
  de: {
    title: "Luzern: Was bleibt",
    choose: "Termin wählen",
    departure: "Fr., 16. Okt.",
    seats: "9 Plätze verfügbar · 30% Anzahlung bei Buchung",
    group: "Ihre Gruppe braucht 3 Plätze",
    reviewBooking: "Buchung prüfen · CHF 223.00",
    reviewTitle: "Buchung prüfen",
    contactName: "Kontaktname",
    mobile: "Mobilnummer",
    toPayment: "Zur Zahlung · CHF 66.90",
    payTitle: "Plätze noch 15:00 reserviert",
    provider: "SIMULIERTER ZAHLUNGSANBIETER · PROTOTYP · ES FLIESST KEIN ECHTES GELD",
    pay: "CHF 66.90 bezahlen",
    confirmed: "Ihre Plätze sind bestätigt",
    status: "Anzahlung bezahlt · Restbetrag offen",
    balance: "Restbetrag bezahlen · CHF 156.10",
    balanceDue: "Restbetrag fällig am Do., 15. Okt., 18:00",
  },
};

// E3.1 hides tour booking, see ADR-012. Restore these flows when booking returns.
test.skip("[E0.8] tour: from the departure sheet to the confirmed booking", async ({ seedDemo, language }) => {
  const w = words[language];
  const page = await seedDemo();

  await goto(page, "/tours/lucerne-the-things-that-remain");
  await expect(page.getByRole("heading", { name: w.title }).first()).toBeVisible();
  await page.getByText(w.choose).first().click();

  const sheet = page.getByRole("dialog");

  await expect(sheet.getByText(w.departure)).toBeVisible();
  await expect(sheet.getByText(w.seats)).toBeVisible();
  await expect(sheet.getByText(w.group)).toBeVisible();
  await sheet.getByRole("button", { name: w.reviewBooking }).click();

  await expect(page.getByRole("heading", { name: w.reviewTitle })).toBeVisible();
  await page.getByRole("textbox", { name: w.contactName }).fill("Test Guest");
  await page.getByRole("textbox", { name: w.mobile }).fill("+41 79 123 45 67");
  await page.getByRole("button", { name: w.toPayment }).click();

  await expect(page.getByText(w.payTitle)).toBeVisible();
  await expect(page.getByText(w.provider)).toBeVisible();
  await expect(page.getByText(/SK-T[0-9A-Z]{6,8}/).first()).toBeVisible();
  await page.getByRole("button", { name: w.pay }).click();

  await expect(page.getByRole("heading", { name: w.confirmed })).toBeVisible();
  await expect(page.getByText(w.status)).toBeVisible();
  await expect(page.getByText(w.balanceDue)).toBeVisible();
  await expect(page.getByRole("button", { name: w.balance })).toBeVisible();
});
