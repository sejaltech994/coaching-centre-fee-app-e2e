import { expect, type Page } from "@playwright/test";
import { Given, Then, When } from "./fixtures";

// Screens follow the "Chukta App — Batches" design canvas: a table of batches
// (cards on phones), each batch's own page, and a separate New batch / Edit batch form.

const DAY_NAMES: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const batchRow = (page: Page, name: string) =>
  page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) });

export async function fillBatchForm(page: Page, f: { name?: string; subject?: string; days?: string; start?: string; end?: string }) {
  if (f.name !== undefined) await page.getByLabel("Batch name").fill(f.name);
  if (f.subject) await page.getByLabel("Subject (optional)").fill(f.subject);
  for (const day of (f.days ?? "").split(",").map((d) => d.trim()).filter(Boolean)) {
    await page.getByRole("button", { name: DAY_NAMES[day] ?? day, exact: true }).click();
  }
  if (f.start) await page.getByLabel("Starts").fill(f.start);
  if (f.end) await page.getByLabel("Ends").fill(f.end);
}

async function addBatch(page: Page, name: string, subject: string, days: string, start: string, end: string) {
  await page.getByRole("link", { name: "New batch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New batch" })).toBeVisible();
  await fillBatchForm(page, { name, subject, days, start, end });
  await page.getByRole("button", { name: "Create batch", exact: true }).click();
}

/** Opens the batch's own page from the list, then its Edit batch form. */
async function openBatch(page: Page, name: string) {
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Edit batch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit batch" })).toBeVisible();
}

const onBatchesPage = async (page: Page) => {
  await expect(page).toHaveURL(/\/batches\/?$/);
  await expect(page.getByRole("heading", { name: "Batches", level: 1 })).toBeVisible();
};

When("I open Batches from the dashboard", async ({ page }) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Batches", exact: true }).click();
  await onBatchesPage(page);
});

When("I open the Batches page", async ({ page }) => {
  await page.goto("/batches/");
  await onBatchesPage(page);
});

Then("I am on the Batches page", async ({ page }) => {
  await onBatchesPage(page);
});

Given("I am signed in", async ({ stub }) => {
  stub.signIn();
});

Then("I am told I have no batches yet", async ({ page }) => {
  await expect(page.getByText("No batches yet. Add your first batch to start enrolling students.")).toBeVisible();
});

When(
  "I add a batch {string} for {string} on {string} from {string} to {string}",
  async ({ page }, name: string, subject: string, days: string, start: string, end: string) => {
    await addBatch(page, name, subject, days, start, end);
  },
);

Given("I have a batch {string}", async ({ page }, name: string) => {
  if (!/\/batches\/?$/.test(page.url())) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Batches", exact: true }).click();
  }
  await addBatch(page, name, "", "Tue, Thu", "16:00", "17:00");
  await onBatchesPage(page);
  await expect(batchRow(page, name)).toBeVisible();
});

Then(
  "I see the batch {string} for {string} on {string} at {string}",
  async ({ page }, name: string, subject: string, days: string, time: string) => {
    const row = batchRow(page, name);
    await expect(row).toContainText(subject);
    await expect(row).toContainText(days);
    await expect(row).toContainText(time);
  },
);

Then("I see the batch {string} on {string} at {string}", async ({ page }, name: string, days: string, time: string) => {
  const row = batchRow(page, name);
  await expect(row).toContainText(days);
  await expect(row).toContainText(time);
});

Then("the batch counts read {string} and {string}", async ({ page }, active: string, archived: string) => {
  await expect(page.getByRole("button", { name: active, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: archived, exact: true })).toBeVisible();
});

When(
  "I change the batch {string} to run from {string} to {string}",
  async ({ page }, name: string, start: string, end: string) => {
    await openBatch(page, name);
    await fillBatchForm(page, { start, end });
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await onBatchesPage(page);
  },
);

When("I archive the batch {string}", async ({ page }, name: string) => {
  await openBatch(page, name);
  await page.getByRole("button", { name: "Archive batch", exact: true }).click();
  await onBatchesPage(page);
});

When("I restore the batch {string}", async ({ page }, name: string) => {
  await openBatch(page, name);
  await page.getByRole("button", { name: "Restore batch", exact: true }).click();
  await onBatchesPage(page);
});

Then("I don't see the batch {string}", async ({ page }, name: string) => {
  await expect(batchRow(page, name)).toHaveCount(0);
});

When("I switch to archived batches", async ({ page }) => {
  await page.getByRole("button", { name: /^Archived · \d+$/ }).click();
});

When("I search batches for {string}", async ({ page }, text: string) => {
  await page.getByLabel("Search batches").fill(text);
});

Then("I see the batch {string} marked {string}", async ({ page }, name: string, label: string) => {
  await expect(batchRow(page, name)).toContainText(label);
});

Then("no batch was saved", async ({ stub }) => {
  expect(stub.requestsTo("/batches", "POST")).toHaveLength(0);
});

When("I open the batch {string} from Batches", async ({ page }, name: string) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Batches", exact: true }).click();
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
});

Then("the batch's students are {string}", async ({ page }, names: string) => {
  const students = page.getByRole("region", { name: "Students", exact: true });
  await expect(students.getByRole("row").filter({ has: page.getByRole("cell") }).getByRole("link")).toHaveText(names.split(", "));
});

Then("the batch's fees list a bill for {string}", async ({ page }, student: string) => {
  const fees = page.getByRole("region", { name: "Fees", exact: true });
  await expect(fees.getByRole("row").filter({ hasText: student }).first()).toBeVisible();
});
