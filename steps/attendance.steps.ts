import { expect } from "@playwright/test";
import { Then, When } from "./fixtures";

// Screen: Attendance (a batch, a day, and Present/Absent per student).

When("I open Attendance from the menu", async ({ page }) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Attendance", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Attendance", level: 1 })).toBeVisible();
});

When("I mark {string} {string}", async ({ page }, student: string, mark: string) => {
  await page.getByRole("group", { name: student, exact: true }).getByRole("button", { name: mark, exact: true }).click();
});

When("I save the attendance", async ({ page }) => {
  await page.getByRole("button", { name: "Save attendance", exact: true }).click();
});

Then("{string} is marked {string}", async ({ page }, student: string, mark: string) => {
  await expect(page.getByRole("group", { name: student, exact: true }).getByRole("button", { name: mark, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

When("I turn absence alerts on", async ({ page }) => {
  const toggle = page.getByRole("switch", { name: "Message parents on WhatsApp when their child is absent" });
  await toggle.check();
  await expect(toggle).toBeChecked();
});
