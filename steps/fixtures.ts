import type { Response } from "@playwright/test";
import { createBdd, test as base } from "playwright-bdd";
import { ApiStub } from "../support/api-stub";
import { API_URL, OTP_LOG_FILE, WEB_ORIGIN } from "../support/env";
import type { GoogleAccount } from "../support/google";
import { OtpInbox } from "../support/otp-inbox";

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
  /** The account chosen on the (fake) Google account chooser. */
  google?: GoogleAccount;
  /** A new Google account's pending sign-in cookie, spent by POST /auth/register. */
  pending?: string;
  /** The refresh token of a second sign-in by the same owner: "another device". */
  otherDevice?: string;
  /** The number being confirmed (E.164), and where the API's log was before its code was sent. */
  phone?: string;
  otpMark = 0;
  /** From GET /auth/google/start: where it sent the browser, and its OAuth cookie. */
  googleStart?: { location: URL; cookie: string };
}

export const test = base.extend<{ world: World; otp: OtpInbox; stub: ApiStub }>({
  // eslint-disable-next-line no-empty-pattern
  world: async ({}, use) => use(new World()),
  // eslint-disable-next-line no-empty-pattern
  otp: async ({}, use) => use(new OtpInbox(OTP_LOG_FILE)),
  // eslint-disable-next-line no-empty-pattern
  stub: async ({}, use) => use(new ApiStub(API_URL, WEB_ORIGIN)),
});

export const { Given, When, Then, BeforeScenario } = createBdd(test);

// @mocked scenarios run against a stubbed API and a controllable clock,
// installed before the first page load.
BeforeScenario({ tags: "@mocked" }, async ({ page, stub }) => {
  await page.clock.install();
  await stub.install(page);
});
