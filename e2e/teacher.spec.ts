import { expect, test } from "@playwright/test";

test("teacher page explains when accounts aren't set up", async ({ page }) => {
  test.skip(!!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase is configured in this build");
  await page.goto("/teacher");
  await expect(page.getByRole("heading", { name: /Accounts aren.t set up yet/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the board" })).toHaveAttribute("href", "/");
});

test("board settings say where results are kept", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Teacher settings" }).tap();
  await expect(page.getByTestId("sync-status")).toContainText("Results save on this board");
});
