import { expect, type Page } from "@playwright/test";
import { API_URL } from "../support/env";
import { Then, When, type World } from "./fixtures";

// Screen: Fees (no design yet; built from the Chukta design system on MUI).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Nov 2026": this month in India, as the bill's period reads. */
function thisMonth() {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()).split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

const billRows = (page: Page) => page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") });
/**
 * The student's bill for this month. Near a month's end a student who joins also
 * gets next month's bill (made a week ahead), so scenarios pick this month's.
 */
const billFor = (page: Page, student: string) => billRows(page).filter({ hasText: student }).filter({ hasText: thisMonth() });

When("I open Fees from the menu", async ({ page }) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Fees", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fees", level: 1 })).toBeVisible();
});

Then(/^the (?:unpaid )?bills (?:are|listed are) for "([^"]*)"$/, async ({ page }, names: string) => {
  await expect(billRows(page).first()).toBeVisible();
  const students = await billRows(page).getByRole("link").allTextContents();
  expect([...new Set(students)]).toEqual(names.split(", "));
});

Then(
  "the bill for {string} is {string} for this month, in {string}, {string}",
  async ({ page }, student: string, amount: string, batch: string, status: string) => {
    const row = billFor(page, student);
    for (const text of [amount, thisMonth(), batch, status]) await expect(row).toContainText(text);
  },
);

When("I waive the bill for {string} without a reason", async ({ page }, student: string) => {
  await billFor(page, student).getByRole("button", { name: /^Waive bill/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Waive fee", exact: true }).click();
});

When("I give the reason {string}", async ({ page }, reason: string) => {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Reason").fill(reason);
  await dialog.getByRole("button", { name: "Waive fee", exact: true }).click();
});

Then("the bill for {string} shows {string}", async ({ page }, student: string, text: string) => {
  await expect(billFor(page, student)).toContainText(text);
});

When("I show {string} bills", async ({ page }, filter: string) => {
  await page.getByRole("group", { name: "Show" }).getByRole("button", { name: filter, exact: true }).click();
});

Then("their fees list this month's bill of {string}", async ({ page }, amount: string) => {
  const fees = page.getByRole("region", { name: "Fees", exact: true });
  await expect(fees.getByRole("row").filter({ hasText: thisMonth() })).toContainText(amount);
});

Then("I am told there are no unpaid bills", async ({ page }) => {
  await expect(page.getByText(/^No unpaid bills\./)).toBeVisible();
});

// --- API ---

async function api(world: World, method: string, path: string, body?: unknown, token = world.accessToken) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body !== undefined && { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  world.api = { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  return world.api;
}

type Bill = { id: string; status: string; amountPaise: number; student: { name: string }; batch: { name: string } };

/** The first day of this month in India, as a bill's periodStart reads. */
const thisMonthStart = () => `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()).slice(0, 7)}-01`;

Then(
  "there is a {string} bill for this month of {int} paise for {string} in {string}",
  async ({ world }, status: string, amountPaise: number, student: string, batch: string) => {
    const { invoices } = world.api?.body as { invoices: (Bill & { periodStart: string })[] };
    const current = invoices.filter((invoice) => invoice.periodStart === thisMonthStart());
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({ status, amountPaise, student: { name: student }, batch: { name: batch } });
  },
);

When("I waive the student's bill through the API with the reason {string}", async ({ world }, reason: string) => {
  if (!world.invoiceId) {
    const { body } = await api(world, "GET", "/invoices");
    world.invoiceId = (body as { invoices: Bill[] }).invoices[0]!.id;
  }
  await api(world, "POST", `/invoices/${world.invoiceId}/waive`, { reason });
});

When("they GET the first owner's bill", async ({ world }) => {
  const { body } = await api(world, "GET", "/invoices");
  world.invoiceId = (body as { invoices: Bill[] }).invoices[0]!.id;
  await api(world, "GET", `/invoices/${world.invoiceId}`, undefined, world.otherAccessToken);
});
