import { expect, test } from "@playwright/test";
import { tapChoice } from "./helpers";

test("the board keeps working with the internet unplugged", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Trail Games", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /Summit Math/ }).tap();
  await tapChoice(page, page.locator(".stage"), true);
  await expect(page.locator(".trail .dots i.done")).toHaveCount(1);
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("classcade:attempts") ?? "[]"));
  expect(log).toHaveLength(1);
});
