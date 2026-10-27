import { expect, type Page } from "@playwright/test";
import { API_URL } from "../support/env";
import { freshPhone } from "../support/otp-inbox";
import { Given, Then, When, type World } from "./fixtures";
import { fillProfile, signUpThroughTheUi, typeCode } from "./login.steps";

// Outside production the API serves a fake Google account chooser (the API's
// GOOGLE_PROVIDER=fake): an Email and a Name field, "Continue" and "Cancel".

const newGoogleAccount = () => ({ email: `owner-${crypto.randomUUID()}@example.com`, name: "Asha Sharma" });

async function chooseGoogleAccount(page: Page, account: { email: string; name: string }) {
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose an account" })).toBeVisible();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Name").fill(account.name);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

Given("a Google account that has never used Chukta", async ({ world }) => {
  world.google = newGoogleAccount();
});

When("I continue with Google", async ({ page, world }) => {
  world.google ??= newGoogleAccount();
  await chooseGoogleAccount(page, world.google);
});

When("I continue with Google using the same email", async ({ page, world }) => {
  world.google = { email: world.email!, name: "Asha Sharma" };
  await chooseGoogleAccount(page, world.google);
});

When("I continue with Google but cancel", async ({ page }) => {
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
});

Then("I am asked to verify my mobile number for my Google account", async ({ page, world }) => {
  await expect(page.getByRole("heading", { name: "Verify your mobile number" })).toBeVisible();
  await expect(page.getByText(`Signed in with Google as ${world.google!.email}.`, { exact: false })).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toBeVisible();
});

Then("I am told the email already has an account and asked to verify its mobile number", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Verify your mobile number" })).toBeVisible();
  await expect(
    page.getByText("This email already has a Chukta account. Verify its mobile number to connect Google."),
  ).toBeVisible();
});

Then("my name and email from Google are filled in", async ({ page, world }) => {
  await expect(page.getByLabel("Your name")).toHaveValue(world.google!.name);
  await expect(page.getByLabel("Email (optional)")).toHaveValue(world.google!.email);
});

Then("I can continue with my mobile number", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Continue with mobile number", exact: true })).toBeVisible();
});

/** Google sign-up through the real screens; lands on Batches. */
async function signUpWithGoogle(page: Page, world: World, otp: import("../support/otp-inbox").OtpInbox) {
  world.google = newGoogleAccount();
  world.phone = freshPhone();
  await page.goto("/login/");
  await chooseGoogleAccount(page, world.google);
  await expect(page.getByRole("heading", { name: "Verify your mobile number" })).toBeVisible();
  world.otpMark = otp.mark();
  await page.getByLabel("Mobile number").fill(world.phone.slice(3));
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await typeCode(page, await otp.codeFor(world.phone, world.otpMark));
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await fillProfile(page, { name: world.google.name, centre: "Sunrise Classes", type: "Coaching", city: "Pune", acceptTerms: true });
  await expect(page).toHaveURL(/\/batches\/?$/);
}

Given("I have signed up with Google", async ({ page, world, otp }) => {
  await signUpWithGoogle(page, world, otp);
});

Given("I have signed up as a new owner with an email", async ({ page, world, otp }) => {
  world.email = `owner-${crypto.randomUUID()}@example.com`;
  await signUpThroughTheUi(page, world, otp);
});

// --- API ---

When("I start Google sign-in through the API", async ({ world }) => {
  const res = await fetch(`${API_URL}/auth/google/start`, { redirect: "manual" });
  expect(res.status).toBe(302);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("chukta_oauth="));
  world.googleStart = { location: new URL(res.headers.get("location")!, API_URL), cookie: cookie ?? "" };
});

Then(
  "I am sent to the Google account chooser with a state, a nonce and an S256 code challenge",
  async ({ world }) => {
    const params = world.googleStart!.location.searchParams;
    expect(params.get("state")).toMatch(/^.{32,}$/);
    expect(params.get("nonce")).toMatch(/^.{32,}$/);
    expect(params.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("redirect_uri")).toMatch(/\/api\/v1\/auth\/google\/callback$/);
  },
);

Then(
  "the OAuth cookie is HttpOnly, SameSite=Lax, scoped to {string} and lasts {int} seconds",
  async ({ world }, path: string, seconds: number) => {
    const cookie = world.googleStart!.cookie;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Path=${path}`);
    expect(cookie).toContain(`Max-Age=${seconds}`);
  },
);

When("Google sends me back with a different state", async ({ world }) => {
  const res = await fetch(`${API_URL}/auth/google/callback?state=not-the-state&code=anything`, {
    redirect: "manual",
    headers: { cookie: world.googleStart!.cookie.split(";")[0]! },
  });
  world.api = { status: res.status, headers: res.headers, body: null };
});

Then("I am sent back to the login page with the Google error {string}", async ({ world }, error: string) => {
  expect(world.api?.status).toBe(302);
  const location = new URL(world.api!.headers.get("location")!, API_URL);
  expect(location.pathname).toMatch(/\/login\/?$/);
  expect(location.searchParams.get("google_error")).toBe(error);
});

Then("no session cookie is set", async ({ world }) => {
  expect(world.api?.headers.getSetCookie().some((c) => c.startsWith("chukta_rt="))).toBe(false);
});
