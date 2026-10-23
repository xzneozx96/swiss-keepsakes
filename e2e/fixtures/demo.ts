import { expect, test as base, type Page } from "@playwright/test";

export type Language = "en" | "de";
export type Role = "guest" | "owner";

export const DEMO_NOW = new Date("2026-10-14T09:30:00+02:00");

type Fixtures = {
  language: Language;
  pageErrors: string[];
  seedDemo: (role?: Role) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  language: async ({}, use, testInfo) => {
    await use(testInfo.project.name === "phone-de" ? "de" : "en");
  },

  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => errors.push(error.message));
    await use(errors);
    expect(errors, "the page logged errors").toEqual([]);
  },

  seedDemo: async ({ page, context, language, pageErrors }, use) => {
    void pageErrors;
    await context.clock.setFixedTime(DEMO_NOW);
    await context.addInitScript((lang) => {
      if (!localStorage.getItem("sk.language")) localStorage.setItem("sk.language", JSON.stringify(lang));
    }, language);

    await use(async (role = "guest") => {
      await page.goto("/#/");
      await expect(page.getByRole("navigation").first()).toBeVisible();
      await page.evaluate((nextRole) => {
        const state = JSON.parse(localStorage.getItem("sk.demo")!);
        const data = state.data;
        const guest = data.guests.find((g: { id: string }) => data.orders.some((o: { guestId: string }) => o.guestId === g.id)) ?? data.guests[0];

        state.role = nextRole;
        data.signedInGuestId = guest.id;
        localStorage.setItem("sk.demo", JSON.stringify(state));
      }, role);
      await page.reload();
      await expect(page.getByRole("navigation").first()).toBeVisible();

      return page;
    });
  },
});

export { expect };

export const goto = async (page: Page, hash: string) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
};
