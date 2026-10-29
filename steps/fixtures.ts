import type { Page, Response } from "@playwright/test";
import { createBdd, test as base } from "playwright-bdd";
import { ApiStub } from "../support/api-stub";
import { API_URL, WEB_ORIGIN } from "../support/env";
import type { GoogleAccount } from "../support/google";

/** What one scenario remembers between its steps. */
export class World {
  pageResponse?: Response | null;
  api?: { status: number; headers: Headers; body: unknown };
  /** Refresh tokens issued in this scenario, oldest first. */
  refreshTokens: string[] = [];
  accessToken?: string;
  /** A second owner's token, for tenant-isolation scenarios. */
  otherAccessToken?: string;
  batchId?: string;
  studentId?: string;
  feePlanId?: string;
  enrolmentId?: string;
  invoiceId?: string;
  /** A bill's pay link, as the owner copied it to send to the parent. */
  payLink?: string;
  /** The parent's own browser (no sign-in), opened from the pay link. */
  parentPage?: Page;
  /** Where Razorpay should send this centre's webhooks. */
  webhookUrl?: string;
  /** The account chosen on the (fake) Google account chooser. */
  google?: GoogleAccount;
  /** A new Google account's pending sign-in cookie, spent by POST /auth/register. */
  pending?: string;
  /** The refresh token of a second sign-in by the same owner: "another device". */
  otherDevice?: string;
  /** From GET /auth/google/start: where it sent the browser, and its OAuth cookie. */
  googleStart?: { location: URL; cookie: string };
}

export const test = base.extend<{ world: World; stub: ApiStub }>({
  // eslint-disable-next-line no-empty-pattern
  world: async ({}, use) => use(new World()),
  // eslint-disable-next-line no-empty-pattern
  stub: async ({}, use) => use(new ApiStub(API_URL, WEB_ORIGIN)),
});

export const { Given, When, Then, BeforeScenario, AfterScenario } = createBdd(test);

// @mocked scenarios run against a stubbed API and a controllable clock,
// installed before the first page load.
BeforeScenario({ tags: "@mocked" }, async ({ page, stub }) => {
  await page.clock.install();
  await stub.install(page);
});
