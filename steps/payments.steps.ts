import { expect, type Page } from "@playwright/test";
import { API_URL } from "../support/env";
import { AfterScenario, Given, Then, When, type World } from "./fixtures";

// Screens: Settings › Payments, the Fees page's payment actions, and the
// parent's pay page (/pay?t=…), which needs no sign-in.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const thisMonth = () => `${MONTHS[Number(today().slice(5, 7)) - 1]} ${today().slice(0, 4)}`;
/** The student's bill for this month (next month's may be there too, near a month's end). */
const billFor = (page: Page, student: string) =>
  page.getByRole("table").getByRole("row").filter({ hasText: student }).filter({ hasText: thisMonth() });

const payments = (page: Page) => page.getByRole("region", { name: "Payments", exact: true });

async function addUpi(page: Page, upiId: string, name: string) {
  await payments(page).getByRole("button", { name: /UPI ID$/ }).click();
  await payments(page).getByLabel("UPI ID").fill(upiId);
  await payments(page).getByLabel("Name parents see").fill(name);
  await payments(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(payments(page)).toContainText(upiId);
}

When("I add the UPI ID {string} paid to {string}", async ({ page }, upiId: string, name: string) => {
  await addUpi(page, upiId, name);
});

Given("my centre takes UPI at {string} as {string}", async ({ page }, upiId: string, name: string) => {
  await page.goto("/settings/");
  await addUpi(page, upiId, name);
});

Then("Payments shows {string}, {string}", async ({ page }, first: string, second: string) => {
  await expect(payments(page)).toContainText(first);
  await expect(payments(page)).toContainText(second);
});

When("I copy the pay link for {string}", async ({ page, context, world }, student: string) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await billFor(page, student).getByRole("button", { name: /^Copy pay link/ }).click();
  world.payLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(world.payLink).toMatch(/\/pay\/\?t=[0-9a-f]{32}$/);
});

When("I record a {string} payment for {string}", async ({ page }, method: string, student: string) => {
  await billFor(page, student).getByRole("button", { name: /^Record payment/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: method, exact: true }).click();
  await dialog.getByRole("button", { name: "Record payment", exact: true }).click();
});

Then("the bill for {string} offers {string}", async ({ page }, student: string, button: string) => {
  await expect(billFor(page, student).getByRole("button", { name: button, exact: true })).toBeVisible();
});

// --- The parent, on another phone: a fresh browser with no sign-in ---

AfterScenario(async ({ world }) => {
  await world.parentPage?.context().close();
});

When("the parent opens the pay link", async ({ browser, world }) => {
  const parent = await browser.newContext();
  world.parentPage = await parent.newPage();
  await world.parentPage.goto(world.payLink!);
});

Then("the parent sees {string} for {string}", async ({ world }, amount: string, student: string) => {
  await expect(world.parentPage!.getByText(amount, { exact: true })).toBeVisible();
  await expect(world.parentPage!.getByText(new RegExp(student))).toBeVisible();
});

Then("the parent sees {string}", async ({ world }, text: string) => {
  await expect(world.parentPage!.getByText(text)).toBeVisible();
});

Then("the parent can pay {string} by UPI to {string}", async ({ world }, amount: string, upiId: string) => {
  const pay = world.parentPage!.getByRole("link", { name: `Pay ${amount} with UPI` });
  await expect(pay).toHaveAttribute("href", new RegExp(`^upi://pay\\?pa=${encodeURIComponent(upiId)}&`));
  await expect(world.parentPage!.getByRole("img", { name: `UPI QR code for ${amount}` })).toBeVisible();
});

Then("the parent can download the receipt as a PDF", async ({ world }) => {
  const href = await world.parentPage!.getByRole("link", { name: "Download receipt" }).getAttribute("href");
  const res = await world.parentPage!.request.get(href!);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

// --- API ---

type Bill = { id: string; periodStart: string; status: string; payLink: string; payment: { receipt: { id: string; number: number } } | null };

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

When("I record a {string} payment for the student's bill through the API", async ({ world }, method: string) => {
  if (!world.invoiceId) {
    const { body } = await api(world, "GET", "/invoices");
    const month = `${today().slice(0, 7)}-01`;
    world.invoiceId = (body as { invoices: Bill[] }).invoices.find((bill) => bill.periodStart === month)!.id;
  }
  await api(world, "POST", `/invoices/${world.invoiceId}/payments`, { method });
});

Then("the bill is paid with receipt {int}", async ({ world }, number: number) => {
  const { invoice } = world.api?.body as { invoice: Bill };
  expect(invoice.status).toBe("paid");
  expect(invoice.payment!.receipt.number).toBe(number);
  world.payLink = invoice.payLink;
});

const publicToken = (world: World) => new URL(world.payLink!).searchParams.get("t")!;

Then("the bill's pay link shows it paid, without signing in", async ({ world }) => {
  const res = await fetch(`${API_URL}/public/invoices/${publicToken(world)}`);
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ invoice: { status: "paid" }, upi: null });
});

Then("the bill's receipt is a PDF, for the owner and from the pay link", async ({ world }) => {
  const { body } = await api(world, "GET", `/invoices/${world.invoiceId}`);
  const receipt = (body as { invoice: Bill }).invoice.payment!.receipt;
  const owners = await fetch(`${API_URL}/receipts/${receipt.id}/pdf`, { headers: { authorization: `Bearer ${world.accessToken}` } });
  const parents = await fetch(`${API_URL}/public/receipts/${publicToken(world)}`);
  for (const res of [owners, parents]) {
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  }
});
