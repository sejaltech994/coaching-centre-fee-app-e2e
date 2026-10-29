import { expect, type Page } from "@playwright/test";
import { API_URL, WEB_ORIGIN } from "../support/env";
import { Then, When } from "./fixtures";

/**
 * The next request that carries an access token goes with one the API rejects,
 * as it would a token past its 15 minutes. Later requests go as they are.
 */
async function runOutAccessToken(page: Page) {
  let used = false;
  await page.route(`${API_URL}/**`, async (route) => {
    const headers = route.request().headers();
    if (used || !headers.authorization) return route.continue();
    used = true;
    await route.continue({ headers: { ...headers, authorization: "Bearer run-out" } });
  });
}

When("I open {string} without being logged in", async ({ page }, path: string) => {
  await page.goto(path);
});

When("my access token runs out", async ({ page }) => {
  await runOutAccessToken(page);
});

When("my login ends", async ({ page }) => {
  // The API ends the login (as it does after 30 days, or a sign-out from another
  // device); the access token the page holds then runs out too.
  const res = await page.request.post(`${API_URL}/auth/logout`, { headers: { origin: WEB_ORIGIN } });
  expect(res.status()).toBe(204);
  await runOutAccessToken(page);
});

When("I go to {string} from the menu", async ({ page }, name: string) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true }).click();
});

Then("I am told {string}", async ({ page }, message: string) => {
  await expect(page.getByRole("main").getByRole("status")).toHaveText(message);
});
