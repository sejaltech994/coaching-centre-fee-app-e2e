import { expect, type Page } from "@playwright/test";
import { freshPhone, type OtpInbox } from "../support/otp-inbox";
import { Given, Then, When, type World } from "./fixtures";

// Screens follow the "Chukta App — Sign up, Login & Profile" design canvas:
// Welcome → Your mobile number → Enter the code → (new numbers) Set up your centre.

const formatted = (e164: string) => `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;
const codeBoxes = (page: Page) => page.getByRole("group", { name: "6-digit code" });
const digit = (page: Page, n: number) => page.getByLabel(`Digit ${n}`, { exact: true });

/** Types a code the way a person does: into the first box, letting focus move along. */
async function typeCode(page: Page, code: string) {
  await digit(page, 1).click();
  await page.keyboard.type(code);
}

Given("I open the login page", async ({ page }) => {
  await page.goto("/login/");
});

When("I open the login page with the number {string}", async ({ page }, number: string) => {
  await page.goto(`/login/?phone=${encodeURIComponent(number)}`);
});

Given("a mobile number that has never logged in", async ({ world }) => {
  world.phone = freshPhone();
});

When("I choose to continue with my mobile number", async ({ page }) => {
  await page.getByRole("button", { name: "Continue with mobile number", exact: true }).click();
});

When("I enter my mobile number and press {string}", async ({ page, world, otp }, button: string) => {
  world.otpMark = otp.mark();
  await page.getByLabel("Mobile number").fill(world.phone!.slice(3));
  await page.getByRole("button", { name: button, exact: true }).click();
});

When("I enter {string} as my mobile number and press {string}", async ({ page }, number: string, button: string) => {
  await page.getByLabel("Mobile number").fill(number);
  await page.getByRole("button", { name: button, exact: true }).click();
});

When("I press {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name, exact: true }).click();
});

When("I follow {string}", async ({ page }, name: string) => {
  await page.getByRole("main").getByRole("button", { name, exact: true }).click();
});

Then("I am asked for the 6-digit code sent to my number", async ({ page, world }) => {
  await expect(page.getByRole("heading", { name: "Enter the code" })).toBeVisible();
  await expect(codeBoxes(page)).toBeVisible();
  await expect(page.getByText(`Sent by SMS to ${formatted(world.phone!)}.`)).toBeVisible();
});

When("I enter the code from the SMS", async ({ page, world, otp }) => {
  world.lastCode = await otp.codeFor(world.phone!, world.otpMark);
  await typeCode(page, world.lastCode);
});

When("I enter a wrong code", async ({ page, world, otp }) => {
  const right = await otp.codeFor(world.phone!, world.otpMark);
  await typeCode(page, right === "000000" ? "111111" : "000000");
});

When("I paste {string} into the code boxes", async ({ page }, code: string) => {
  await digit(page, 1).focus();
  await digit(page, 1).evaluate((input, text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, code);
});

Then("the code boxes show {string}", async ({ page }, code: string) => {
  for (const [i, ch] of [...code].entries()) await expect(digit(page, i + 1)).toHaveValue(ch);
});

Then("I see the error {string}", async ({ page }, message: string) => {
  // Scoped to <main>: Next.js adds its own role="alert" route announcer outside it.
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(message);
});

Then("I am still asked for my mobile number", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Your mobile number" })).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toBeVisible();
  await expect(codeBoxes(page)).toBeHidden();
});

Then("I am on the login page", async ({ page }) => {
  await expect(page).toHaveURL(/\/login\/?(\?.*)?$/);
  await expect(page.getByRole("heading", { name: /^(Welcome to Chukta|Your mobile number)$/ })).toBeVisible();
});

Then("the mobile number field shows {string}", async ({ page }, value: string) => {
  await expect(page.getByLabel("Mobile number")).toHaveValue(value);
});

// --- Profile setup (new numbers only) ---

const CENTRE_TYPES = ["Tuition", "Coaching", "Dance", "Music", "Sports", "Other"];

async function fillProfile(
  page: Page,
  p: { name: string; centre: string; type: string; city: string; acceptTerms: boolean; email?: string },
) {
  await page.getByLabel("Your name").fill(p.name);
  await page.getByLabel("Centre name").fill(p.centre);
  await page.getByLabel("City").fill(p.city);
  expect(CENTRE_TYPES).toContain(p.type);
  await page.getByLabel("Type of centre").selectOption({ label: p.type });
  if (p.email) await page.getByLabel("Email (optional)").fill(p.email);
  if (p.acceptTerms) await page.getByRole("checkbox", { name: /I agree to Chukta’s Terms and Privacy notice/ }).check();
  await page.getByRole("button", { name: "Create my centre", exact: true }).click();
}

Then("I am asked to set up my centre", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Set up your centre" })).toBeVisible();
});

Then("I am still asked to set up my centre", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Set up your centre" })).toBeVisible();
  await expect(page.getByLabel("Centre name")).toBeVisible();
});

When(
  "I set up my centre as {string} running {string}, a {string} centre in {string}",
  async ({ page }, name: string, centre: string, type: string, city: string) => {
    await fillProfile(page, { name, centre, type, city, acceptTerms: true });
  },
);

When("I set up my centre without accepting the terms", async ({ page }) => {
  await fillProfile(page, { name: "Asha Sharma", centre: "Sunrise Classes", type: "Coaching", city: "Pune", acceptTerms: false });
});

/** Goes through Welcome → mobile number → code with the real API, up to profile setup or the dashboard. */
async function verifyThroughTheUi(page: Page, world: World, otp: OtpInbox) {
  await page.goto("/login/");
  await page.getByRole("button", { name: "Continue with mobile number", exact: true }).click();
  world.otpMark = otp.mark();
  await page.getByLabel("Mobile number").fill(world.phone!.slice(3));
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await typeCode(page, await otp.codeFor(world.phone!, world.otpMark));
  await page.getByRole("button", { name: "Verify", exact: true }).click();
}

Given("I have verified a mobile number that has never logged in", async ({ page, world, otp }) => {
  world.phone = freshPhone();
  await verifyThroughTheUi(page, world, otp);
  await expect(page.getByRole("heading", { name: "Set up your centre" })).toBeVisible();
});

/** Signs a new owner up through the real screens; they land on Batches. */
export async function signUpThroughTheUi(page: Page, world: World, otp: OtpInbox) {
  world.phone ??= freshPhone();
  await verifyThroughTheUi(page, world, otp);
  await fillProfile(page, {
    name: "Asha Sharma",
    centre: "Sunrise Classes",
    type: "Coaching",
    city: "Pune",
    acceptTerms: true,
    email: world.email,
  });
  await expect(page).toHaveURL(/\/batches\/?$/);
}

Given("I have signed up as a new owner", async ({ page, world, otp }) => {
  await signUpThroughTheUi(page, world, otp);
});

export { fillProfile, typeCode };

When("I log in again with the same number", async ({ page, world, otp }) => {
  await verifyThroughTheUi(page, world, otp);
});

// --- Stubbed API (@mocked) ---

Given("the API is replaced by a stub", async ({ page, stub }) => {
  await stub.install(page);
});

Given("the API is replaced by a stub with no session", async ({ page, stub }) => {
  await stub.install(page); // the stub answers /auth/refresh with 401 by default
});

Given(
  "the API will refuse OTP requests with {string} {string}",
  async ({ stub }, code: string, message: string) => {
    stub.failNext("/auth/otp/request", 429, code, message);
  },
);

Given("the API cannot be reached", async ({ stub }) => {
  stub.goOffline();
});

Then("no OTP was requested", async ({ stub }) => {
  expect(stub.requestsTo("/auth/otp/request")).toHaveLength(0);
});

Then("{int} OTPs were requested", async ({ stub }, count: number) => {
  expect(stub.requestsTo("/auth/otp/request")).toHaveLength(count);
});

Then("the {string} button is disabled", async ({ page }, name: string) => {
  await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
});

Then("the {string} button is enabled", async ({ page }, name: string) => {
  await expect(page.getByRole("button", { name, exact: true })).toBeEnabled();
});

When("{int} seconds pass", async ({ page }, seconds: number) => {
  await page.clock.fastForward(seconds * 1000);
});
