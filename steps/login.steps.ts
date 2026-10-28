import { expect, type Page } from "@playwright/test";
import { newGoogleAccount, type GoogleAccount } from "../support/google";
import { Given, Then, When, type World } from "./fixtures";

// Screens follow the "Chukta App — Sign up, Login & Profile" design canvas:
// W1 Sign in (Google only) → for a new Google account, W3 Tell us about your centre.
// Outside production the API serves a fake Google account chooser (GOOGLE_PROVIDER=fake):
// an Email and a Name field, "Continue" and "Cancel".

async function chooseGoogleAccount(page: Page, account: GoogleAccount) {
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose an account" })).toBeVisible();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Name").fill(account.name);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

type SignUp = { phone: string; centre: string; type: string; city: string; acceptTerms: boolean };

async function fillSignUp(page: Page, s: SignUp) {
  await page.getByLabel("Mobile number").fill(s.phone);
  await page.getByLabel("Centre name").fill(s.centre);
  await page.getByLabel("City").fill(s.city);
  await page.getByRole("group", { name: "Centre type" }).getByRole("button", { name: s.type, exact: true }).click();
  if (s.acceptTerms) await page.getByRole("checkbox", { name: /I agree to the Terms and the Privacy notice/ }).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
}

const SUNRISE = { phone: "98765 43210", centre: "Sunrise Classes", type: "Coaching", city: "Pune" };

/** A new owner signs up with Google through the real screens and lands on Batches. */
export async function signUpWithGoogle(page: Page, world: World) {
  world.google = newGoogleAccount();
  await page.goto("/login/");
  await chooseGoogleAccount(page, world.google);
  await fillSignUp(page, { ...SUNRISE, acceptTerms: true });
  await expect(page).toHaveURL(/\/batches\/?$/);
}

Given("I open the login page", async ({ page }) => {
  await page.goto("/login/");
});

When("I open the sign-up page", async ({ page }) => {
  await page.goto("/signup/");
});

Given("a Google account that has never used Chukta", async ({ world }) => {
  world.google = newGoogleAccount();
});

When("I continue with Google", async ({ page, world }) => {
  world.google ??= newGoogleAccount();
  await chooseGoogleAccount(page, world.google);
});

When("I continue with Google but cancel", async ({ page }) => {
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
});

Given("I have continued with a Google account that has never used Chukta", async ({ page, world }) => {
  world.google = newGoogleAccount();
  await page.goto("/login/");
  await chooseGoogleAccount(page, world.google);
});

Given("I have signed up with Google", async ({ page, world }) => {
  await signUpWithGoogle(page, world);
});

Then("the page offers {string} and no other way to sign in", async ({ page }, button: string) => {
  const main = page.getByRole("main");
  await expect(main.getByRole("button")).toHaveText([button]);
  await expect(main.getByRole("textbox")).toHaveCount(0);
});

Then("I am asked about my centre, signed in with my Google account", async ({ page, world }) => {
  await expect(page).toHaveURL(/\/signup\/?$/);
  await expect(page.getByRole("heading", { name: "Tell us about your centre" })).toBeVisible();
  await expect(page.getByText(`Signed in with Google as ${world.google!.email}.`, { exact: false })).toBeVisible();
});

Then("I am still asked about my centre", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Tell us about your centre" })).toBeVisible();
  await expect(page.getByLabel("Centre name")).toBeVisible();
});

Then("my name from Google is filled in", async ({ page, world }) => {
  await expect(page.getByLabel("Your name")).toHaveValue(world.google!.name);
});

When(
  "I sign up with the mobile number {string} for {string}, a {string} centre in {string}",
  async ({ page }, phone: string, centre: string, type: string, city: string) => {
    await fillSignUp(page, { phone, centre, type, city, acceptTerms: true });
  },
);

When("I sign up without accepting the terms", async ({ page }) => {
  await fillSignUp(page, { ...SUNRISE, acceptTerms: false });
});

Then("the mobile number field says {string}", async ({ page }, message: string) => {
  await expect(page.getByLabel("Mobile number")).toHaveAccessibleDescription(message);
});

When("I press {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name, exact: true }).click();
});

Then("I see the error {string}", async ({ page }, message: string) => {
  // Scoped to <main>: Next.js adds its own role="alert" route announcer outside it.
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(message);
});

Then("I am on the login page", async ({ page }) => {
  await expect(page).toHaveURL(/\/login\/?(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

// --- Stubbed API (@mocked) ---

Given("the API is replaced by a stub", async ({ page, stub }) => {
  await stub.install(page);
});

Given("the API is replaced by a stub with no session", async ({ page, stub }) => {
  await stub.install(page); // the stub answers /auth/refresh with 401 by default
});

Given("the API has no Google sign-in waiting", async ({ stub }) => {
  stub.failNext("/auth/google/pending", 404, "google_pending_missing", "Your Google sign-in has expired.");
});

Given("the API cannot be reached", async ({ stub }) => {
  stub.goOffline();
});

Then("nothing was sent to sign up", async ({ stub }) => {
  expect(stub.requestsTo("/auth/register")).toHaveLength(0);
});
