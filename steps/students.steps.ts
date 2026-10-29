import { expect, type Page } from "@playwright/test";
import { API_URL } from "../support/env";
import { Given, Then, When, type World } from "./fixtures";

// Screens: Students (list), Add a student, and one student's page (no design yet;
// built from the Chukta design system on MUI).

const onStudentsPage = async (page: Page) => {
  await expect(page).toHaveURL(/\/students\/?(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Students", level: 1 })).toBeVisible();
};

const openStudents = async (page: Page) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Students", exact: true }).click();
  await onStudentsPage(page);
};

const studentRows = (page: Page) => page.getByRole("table").getByRole("row").filter({ has: page.getByRole("link") });

async function addStudent(page: Page, s: { name: string; parent: string; phone: string; batch?: string; whatsapp?: boolean }) {
  await page.getByRole("link", { name: "Add student", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add a student", level: 1 })).toBeVisible();
  await page.getByLabel("Student’s name").fill(s.name);
  await page.getByLabel("Parent’s name").fill(s.parent);
  await page.getByLabel("Parent’s mobile number").fill(s.phone);
  if (s.whatsapp) await page.getByRole("checkbox", { name: "The parent agreed to receive fee reminders on WhatsApp." }).check();
  if (s.batch) await page.getByRole("checkbox", { name: s.batch, exact: true }).check();
  await page.getByRole("button", { name: "Add student", exact: true }).click();
}

When("I open Students from the menu", async ({ page }) => {
  await openStudents(page);
});

Then("I am told I have no students yet", async ({ page }) => {
  await expect(page.getByText("No students yet. Add your first student to start sending fee reminders.")).toBeVisible();
});

When(
  "I add the student {string}, child of {string} on {string}, to {string}",
  async ({ page }, name: string, parent: string, phone: string, batch: string) => {
    await addStudent(page, { name, parent, phone, batch });
    await onStudentsPage(page);
  },
);

When("I add a student with no details", async ({ page }) => {
  await page.getByRole("link", { name: "Add student", exact: true }).click();
  await page.getByRole("button", { name: "Add student", exact: true }).click();
});

Then("the field {string} says {string}", async ({ page }, label: string, message: string) => {
  await expect(page.getByLabel(label, { exact: true })).toHaveAccessibleDescription(message);
});

Then(
  "I see the student {string} with {string} on {string} in {string}",
  async ({ page }, name: string, parent: string, phone: string, batch: string) => {
    const row = studentRows(page).filter({ hasText: name });
    await expect(row).toHaveCount(1);
    for (const text of [parent, phone, batch]) await expect(row).toContainText(text);
  },
);

Given("I have the student {string} in {string}", async ({ page }, name: string, batch: string) => {
  await openStudents(page);
  await addStudent(page, { name, parent: "Neha Sharma", phone: "98765 43210", batch });
  await onStudentsPage(page);
});

Given("I have the student {string}, whose parent agreed to WhatsApp, in {string}", async ({ page }, name: string, batch: string) => {
  await openStudents(page);
  await addStudent(page, { name, parent: "Neha Sharma", phone: "98765 43210", batch, whatsapp: true });
  await onStudentsPage(page);
});

Given("I have the student {string} in no batch", async ({ page }, name: string) => {
  await openStudents(page);
  await addStudent(page, { name, parent: "Suresh Rao", phone: "91234 56789" });
  await onStudentsPage(page);
});

When("I filter students by the batch {string}", async ({ page }, batch: string) => {
  await page.getByRole("combobox", { name: "Batch" }).click();
  await page.getByRole("option", { name: batch, exact: true }).click();
});

When("I search students for {string}", async ({ page }, text: string) => {
  await page.getByRole("searchbox", { name: "Search students or parents" }).fill(text);
});

When("I show students who have left", async ({ page }) => {
  await page.getByRole("group", { name: "Status" }).getByRole("button", { name: "Left", exact: true }).click();
});

Then("the students listed are {string}", async ({ page }, names: string) => {
  await expect(studentRows(page).getByRole("link")).toHaveText(names.split(", "));
});

When("I open the student {string}", async ({ page }, name: string) => {
  if (!/\/students\/?$/.test(page.url())) await openStudents(page);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
});

const batchesSection = (page: Page) => page.getByRole("region", { name: "Batches", exact: true });

When("I add them to the batch {string}", async ({ page }, batch: string) => {
  await batchesSection(page).getByRole("combobox", { name: "Add to batch" }).click();
  await page.getByRole("option", { name: batch, exact: true }).click();
  await batchesSection(page).getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(`Added to ${batch}.`)).toBeVisible();
});

When("I remove them from the batch {string}", async ({ page }, batch: string) => {
  await batchesSection(page).getByRole("button", { name: `Remove from ${batch}`, exact: true }).click();
  await expect(page.getByText(`Removed from ${batch}.`)).toBeVisible();
});

Then("their batches are {string}", async ({ page }, batches: string) => {
  await expect(batchesSection(page).getByRole("listitem")).toHaveCount(batches.split(", ").length);
  for (const batch of batches.split(", ")) await expect(batchesSection(page)).toContainText(batch);
});

When("I mark them as left", async ({ page }) => {
  await page.getByRole("button", { name: "Mark as left", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Mark as left", exact: true }).click();
});

Then("they are marked {string}", async ({ page }, label: string) => {
  await expect(page.getByText(label, { exact: true })).toBeVisible();
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

const AARAV = { parentName: "Neha Sharma", parentPhone: "98765 43210", whatsappOptIn: true };

Given("I have created the batch {string} through the API", async ({ world }, name: string) => {
  const res = await api(world, "POST", "/batches", { name, subject: "Maths", days: ["mon"], startTime: "16:00", endTime: "17:00" });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  world.batchId = (res.body as { batch: { id: string } }).batch.id;
});

const addThroughApi = (world: World, name: string) =>
  api(world, "POST", "/students", { name, ...AARAV, batchIds: [world.batchId] });

When("I add the student {string} in that batch through the API", async ({ world }, name: string) => {
  await addThroughApi(world, name);
  world.studentId = (world.api?.body as { student?: { id: string } })?.student?.id;
});

Given("I have added the student {string} in that batch through the API", async ({ world }, name: string) => {
  const res = await addThroughApi(world, name);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  world.studentId = (res.body as { student: { id: string } }).student.id;
});

Then("the student is active, in {string}", async ({ world }, batch: string) => {
  expect((world.api?.body as { student: unknown }).student).toMatchObject({
    status: "active",
    parentPhone: "+919876543210",
    batches: [{ name: batch }],
  });
});

When("I enrol the student in that batch again through the API", async ({ world }) => {
  await api(world, "POST", "/enrolments", { studentId: world.studentId, batchId: world.batchId });
});

When("they GET the first owner's student", async ({ world }) => {
  await api(world, "GET", `/students/${world.studentId}`, undefined, world.otherAccessToken);
});
