import { expect, goto, test, type Language } from "../fixtures/demo";

const words: Record<Language, Record<string, string>> = {
  en: {
    welcome: "Grüezi and welcome!",
    tour: "Luzerne: The Things That Remain",
    previewGroup: "Preview language",
    previewIntro: "Includes your unsaved changes. Nothing is saved or published from here, and booking is switched off.",
    preview: "Preview",
  },
  de: {
    welcome: "Grüezi und herzlich willkommen!",
    tour: "Luzern: Was bleibt",
    previewGroup: "Sprache der Vorschau",
    previewIntro: "Enthält Ihre ungespeicherten Änderungen. Von hier wird nichts gespeichert oder veröffentlicht, und das Buchen ist ausgeschaltet.",
    preview: "Vorschau",
  },
};

const htmlLang = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.lang);
const stored = (page: import("@playwright/test").Page) => page.evaluate(() => localStorage.getItem("sk.language"));

test("[E0.8] language: switch while running, keep it across a reload, preview the other language", async ({ seedDemo, language }) => {
  const other: Language = language === "en" ? "de" : "en";
  const mine = words[language];
  const theirs = words[other];
  const page = await seedDemo();

  await expect(page.getByText(mine.welcome)).toBeVisible();
  expect(await htmlLang(page)).toBe(language);

  await page.getByRole("button", { name: other.toUpperCase(), exact: true }).first().click();
  await expect(page.getByText(theirs.welcome)).toBeVisible();
  await expect(page.getByText(mine.welcome)).toHaveCount(0);
  expect(await htmlLang(page)).toBe(other);
  expect(await stored(page)).toBe(JSON.stringify(other));

  await page.reload();
  await expect(page.getByText(theirs.welcome)).toBeVisible();
  expect(await htmlLang(page)).toBe(other);

  await page.getByRole("button", { name: language.toUpperCase(), exact: true }).first().click();
  await expect(page.getByText(mine.welcome)).toBeVisible();
  expect(await htmlLang(page)).toBe(language);
  expect(await stored(page)).toBe(JSON.stringify(language));

  await seedDemo("owner");
  await goto(page, "/store/products/tours/things-that-remain?step=review");
  await expect(page.getByRole("heading", { name: mine.tour }).first()).toBeVisible();
  await page.getByRole("button", { name: mine.preview, exact: true }).first().click();

  const group = page.getByRole("group", { name: mine.previewGroup });

  await expect(page.getByText(mine.previewIntro)).toBeVisible();
  await group.getByRole("button", { name: other.toUpperCase(), exact: true }).click();
  await expect(page.getByText(theirs.previewIntro)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: theirs.tour })).toBeVisible();
  await expect(page.getByText(mine.previewIntro)).toBeVisible();
  await group.getByRole("button", { name: language.toUpperCase(), exact: true }).click();
  await expect(page.getByRole("heading", { name: mine.tour }).first()).toBeVisible();
});
