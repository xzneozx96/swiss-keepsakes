import process from "node:process";
import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";

export type Language = "en" | "de";
export type Role = "guest" | "owner";

export const DEMO_NOW = new Date("2026-10-14T09:30:00+02:00");

const port = Number(process.env.E2E_PORT ?? 4317);
const origin = `http://localhost:${port}`;
const inbox = `http://127.0.0.1:${port + 1}`;
const octet = () => Math.floor(Math.random() * 250) + 1;

// A real session: the emailed code of the real API, read from its test inbox, then the real code sign-in. The
// browser context keeps the session cookie. Each call comes from an address of its own, as separate guests would,
// because the API limits the code routes per address.
async function signInWithEmailedCode(context: BrowserContext) {
  const email = `guest-${Math.random().toString(36).slice(2, 10)}@example.ch`;
  const headers = { Origin: origin, "fly-client-ip": `198.51.${octet()}.${octet()}` };
  const sent = await context.request.post("/api/auth/email-otp/send-verification-otp", { headers, data: { email, type: "sign-in" } });

  expect(sent.ok(), "the code request").toBe(true);
  const queued = await fetch(`${inbox}/code?email=${encodeURIComponent(email)}`);

  expect(queued.ok, "the queued sign-in code").toBe(true);
  const { code } = (await queued.json()) as { code: string };
  const signedIn = await context.request.post("/api/auth/sign-in/email-otp", { headers, data: { email, otp: code } });

  expect(signedIn.ok(), "the code sign-in").toBe(true);
}

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

    let signedIn = false;

    await use(async (role = "guest") => {
      if (!signedIn) {
        await signInWithEmailedCode(context);
        signedIn = true;
      }
      await page.goto("/#/");
      await expect(page.getByRole("navigation").first()).toBeVisible();
      await page.evaluate((nextRole) => {
        const state = JSON.parse(localStorage.getItem("sk.demo")!);

        state.role = nextRole;
        localStorage.setItem("sk.demo", JSON.stringify(state));
      }, role);
      const session = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/get-session");

      await page.reload();
      await session;
      await expect(page.getByRole("navigation").first()).toBeVisible();

      return page;
    });
  },
});

export { expect };

export const goto = async (page: Page, hash: string) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
};
