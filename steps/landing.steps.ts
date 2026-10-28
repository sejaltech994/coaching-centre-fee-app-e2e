import { expect } from "@playwright/test";
import { Given, Then, When } from "./fixtures";

const mainNav = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Main" });

Given("I open the landing page", async ({ page, world }) => {
  world.pageResponse = await page.goto("/");
});

Then("I see the main heading {string}", async ({ page }, text: string) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(text);
});

Then("I see a link {string} that goes to {string}", async ({ page }, name: string, href: string) => {
  await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
});

When("I follow {string} in the main navigation", async ({ page }, name: string) => {
  await mainNav(page).getByRole("link", { name, exact: true }).click();
});

Then("the {string} section is on screen", async ({ page }, id: string) => {
  await expect(page.locator(`#${id}`)).toBeInViewport();
});

Then("the before-and-after ledger has {int} entries", async ({ page }, count: number) => {
  const rows = page.getByRole("table", { name: "Before and after Chukta" }).getByRole("row");
  await expect(rows).toHaveCount(count + 1); // plus the header row
});

Then("{string} is struck through", async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toHaveCSS("text-decoration-line", "line-through");
});

Then(
  "the steps read {string}, {string} and {string}",
  async ({ page }, first: string, second: string, third: string) => {
    await expect(page.locator("#how").getByRole("heading", { level: 3 })).toHaveText([first, second, third]);
  },
);

Then("the pricing section shows {string} and {string}", async ({ page }, a: string, b: string) => {
  const pricing = page.locator("#pricing");
  await expect(pricing.getByText(a, { exact: true })).toBeVisible();
  await expect(pricing.getByText(b, { exact: true })).toBeVisible();
});

When("I follow {string} in the sign-up band", async ({ page }, name: string) => {
  await page.locator("#start").getByRole("link", { name, exact: true }).click();
});

Then("the footer links to {string}, {string} and {string}", async ({ page }, a: string, b: string, c: string) => {
  const links = page.getByRole("navigation", { name: "Footer" }).getByRole("link");
  await expect(links).toHaveCount(3);
  expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")))).toEqual([a, b, c]);
});

// --- Mobile menu ---

When("I open the menu", async ({ page }) => {
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
});

Then(
  "the menu shows {string}, {string}, {string}, {string} and {string}",
  async ({ page }, a: string, b: string, c: string, d: string, e: string) => {
    for (const name of [a, b, c, d, e]) {
      await expect(mainNav(page).getByRole("link", { name, exact: true })).toBeVisible();
    }
  },
);

// Regression test for the bug where the hero's animated layers painted over the open menu.
Then("no page content covers the menu", async ({ page }) => {
  const links = mainNav(page).getByRole("link");
  for (const link of await links.all()) {
    const onTop = await link.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return !!hit && el.contains(hit);
    });
    expect(onTop, `"${await link.textContent()}" is covered by other content`).toBe(true);
  }
});

When("I press Escape", async ({ page }) => {
  await page.keyboard.press("Escape");
});

When("I tap the page outside the menu", async ({ page }) => {
  const viewport = page.viewportSize()!;
  await page.mouse.click(viewport.width / 2, viewport.height - 24);
});

When("I choose {string} in the menu", async ({ page }, name: string) => {
  await mainNav(page).getByRole("link", { name, exact: true }).click();
});

Then("the menu is closed", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(mainNav(page).getByRole("link", { name: "Pricing", exact: true })).toBeHidden();
});

// --- Live site only ---

Then(
  "the page response has the header {string} set to {string}",
  async ({ world }, name: string, value: string) => {
    expect(world.pageResponse?.headers()[name]).toBe(value);
  },
);

Then("the page response has the header {string}", async ({ world }, name: string) => {
  expect(world.pageResponse?.headers()[name]).toBeTruthy();
});
