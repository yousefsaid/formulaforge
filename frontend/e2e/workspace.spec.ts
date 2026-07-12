import { test, expect } from "@playwright/test";
test("renders upload workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Drop an .xlsx workbook")).toBeVisible();
});
