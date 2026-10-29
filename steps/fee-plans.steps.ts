import { expect, type Page } from "@playwright/test";
import { API_URL } from "../support/env";
import { fillBatchForm } from "./batches.steps";
import { Given, Then, When, type World } from "./fixtures";

// Fee plans live under Batches (no design of their own); the batch form's
// "Fee plan" picker follows the Batches design canvas.

const planItem = (page: Page, name: string) => page.getByRole("listitem", { name, exact: true });

async function openFeePlans(page: Page) {
  if (!/\/batches\/?$/.test(page.url())) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Batches", exact: true }).click();
  }
  await page.getByRole("link", { name: "Fee plans", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fee plans", level: 1 })).toBeVisible();
}

async function addMonthlyPlan(page: Page, p: { name: string; amount: string; day: string; lateFee?: string; after?: string }) {
  await page.getByRole("button", { name: "New fee plan", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New fee plan" });
  await dialog.getByLabel("Name").fill(p.name);
  await dialog.getByLabel("Amount").fill(p.amount);
  await dialog.getByRole("button", { name: "Monthly", exact: true }).click();
  await dialog.getByLabel("Due on day").click();
  await page.getByRole("option", { name: p.day, exact: true }).click();
  if (p.lateFee) {
    await dialog.getByRole("checkbox", { name: "Charge a late fee" }).check();
    await dialog.getByLabel("Late fee", { exact: true }).fill(p.lateFee);
    await dialog.getByLabel("Days after the due date").fill(p.after!);
  }
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
}

When("I open Fee plans from Batches", async ({ page }) => {
  await openFeePlans(page);
});

When(
  "I add the monthly fee plan {string} of {string} due on day {string}, with a late fee of {string} after {string} days",
  async ({ page }, name: string, amount: string, day: string, lateFee: string, after: string) => {
    await addMonthlyPlan(page, { name, amount, day, lateFee, after });
  },
);

When(
  "I add the monthly fee plan {string} of {string} due on day {string}, with no late fee",
  async ({ page }, name: string, amount: string, day: string) => {
    await addMonthlyPlan(page, { name, amount, day });
  },
);

Given(
  "I have the monthly fee plan {string} of {string} due on day {string}",
  async ({ page }, name: string, amount: string, day: string) => {
    await openFeePlans(page);
    await addMonthlyPlan(page, { name, amount, day });
    await expect(planItem(page, name)).toBeVisible();
  },
);

Then(
  "I see the fee plan {string}: {string}, {string}",
  async ({ page }, name: string, description: string, lateFee: string) => {
    await expect(planItem(page, name)).toContainText(description);
    await expect(planItem(page, name)).toContainText(lateFee);
  },
);

Given("I have a batch {string} on the fee plan {string}", async ({ page }, name: string, plan: string) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Batches", exact: true }).click();
  await page.getByRole("link", { name: "New batch", exact: true }).click();
  await fillBatchForm(page, { name, days: "Tue, Thu", start: "16:00", end: "17:00" });
  const picker = page.getByLabel("Fee plan");
  // Options read "<plan name> — <description>".
  const value = await picker.locator("option", { hasText: `${plan} — ` }).getAttribute("value");
  await picker.selectOption(value!);
  await page.getByRole("button", { name: "Create batch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Batches", level: 1 })).toBeVisible();
});

Then("the batch {string} shows {string}", async ({ page }, name: string, text: string) => {
  await expect(page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) })).toContainText(text);
});

const batchesSection = (page: Page) => page.getByRole("region", { name: "Batches", exact: true });

Then("their batch {string} reads {string}", async ({ page }, batch: string, text: string) => {
  await expect(batchesSection(page).getByRole("listitem").filter({ hasText: batch })).toContainText(text);
});

When("I give them a discount of {string} on {string}", async ({ page }, amount: string, batch: string) => {
  await batchesSection(page).getByRole("button", { name: `Discount on ${batch}`, exact: true }).click();
  await batchesSection(page).getByLabel("Discount").fill(amount);
  await batchesSection(page).getByRole("button", { name: "Save discount", exact: true }).click();
});

When("I archive the fee plan {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name: `Archive ${name}`, exact: true }).click();
});

When("I restore the fee plan {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name: `Restore ${name}`, exact: true }).click();
});

const archived = (page: Page) => page.getByRole("region", { name: "Archived", exact: true });

Then("the fee plan {string} is under Archived", async ({ page }, name: string) => {
  await expect(archived(page).getByRole("listitem", { name, exact: true })).toBeVisible();
});

Then("the fee plan {string} is not under Archived", async ({ page }, name: string) => {
  await expect(planItem(page, name)).toBeVisible();
  await expect(archived(page)).toBeHidden();
});

// --- API ---

async function api(world: World, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${world.accessToken}`, ...(body !== undefined && { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  world.api = { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  return world.api;
}

Then(
  "the fee plan is {string}, {int} paise, due on day {int}, with no late fee",
  async ({ world }, name: string, amountPaise: number, dueDay: number) => {
    expect((world.api?.body as { feePlan: unknown }).feePlan).toMatchObject({
      name,
      amountPaise,
      dueDay,
      lateFeePaise: null,
      lateFeeAfterDays: null,
    });
  },
);

Given("I have created the fee plan {string} of {int} paise through the API", async ({ world }, name: string, amountPaise: number) => {
  const res = await api(world, "POST", "/fee-plans", { name, amountPaise, cycle: "monthly", dueDay: 5 });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  world.feePlanId = (res.body as { feePlan: { id: string } }).feePlan.id;
});

Given("I have created the batch {string} on that plan through the API", async ({ world }, name: string) => {
  const res = await api(world, "POST", "/batches", {
    name,
    subject: "Maths",
    days: ["mon"],
    startTime: "16:00",
    endTime: "17:00",
    feePlanId: world.feePlanId,
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  world.batchId = (res.body as { batch: { id: string } }).batch.id;
});

Then("the student's batch is billed on {string}", async ({ world }, plan: string) => {
  const { student } = world.api?.body as { student: { batches: { feePlan: { name: string }; enrolmentId: string }[] } };
  expect(student.batches[0]!.feePlan.name).toBe(plan);
  world.enrolmentId = student.batches[0]!.enrolmentId;
});

When("I give the student a discount of {int} paise through the API", async ({ world }, discountPaise: number) => {
  await api(world, "PATCH", `/enrolments/${world.enrolmentId}`, { discountPaise });
});
