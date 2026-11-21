import { expect, test } from "@playwright/test";

test("home page loads on the board with touch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Trail Games", level: 2 })).toBeVisible();
  expect(await page.evaluate(() => navigator.maxTouchPoints > 0)).toBe(true);
});

test("no third party requests, even while playing", async ({ page, baseURL }) => {
  const origins = new Set<string>();
  page.on("request", (req) => origins.add(new URL(req.url()).origin));
  await page.goto("/");
  await page.getByRole("button", { name: /Summit Math/ }).click();
  await page.locator(".opts button").first().click();
  await page.waitForLoadState("networkidle");
  expect([...origins]).toEqual([new URL(baseURL!).origin]);
});
