import { expect, test } from "@playwright/test";
import { openSummitMath, tapChoice } from "./helpers";

test("a right answer moves the hiker up the trail", async ({ page }) => {
  await openSummitMath(page);
  const stage = page.locator(".stage");
  await tapChoice(page, stage, true);
  await expect(page.locator(".trail .dots i.done")).toHaveCount(1);
  await expect(page.locator(".opt.right")).toBeVisible();
});

test("a wrong answer shows why, then moves on", async ({ page }) => {
  await openSummitMath(page);
  const stage = page.locator(".stage");
  const firstKey = await stage.locator(".eq").getAttribute("aria-label");
  await tapChoice(page, stage, false);
  const miss = page.getByRole("status");
  await expect(miss).toBeVisible();
  await expect(miss.locator(".miss-answer")).toContainText("=");
  await expect(miss.locator(".bt, .nl")).toBeVisible();
  await expect(miss.locator(".miss-caption")).not.toHaveText("Try again!");
  // Next question arrives on its own.
  await expect(stage.locator(".opts")).toBeVisible({ timeout: 8000 });
  await expect(stage.locator(".eq")).not.toHaveAttribute("aria-label", firstKey ?? "");
});

test("facts mode explains a miss on a number line", async ({ page }) => {
  await openSummitMath(page, "Facts to 20");
  await tapChoice(page, page.locator(".stage"), false);
  await expect(page.locator(".miss .nl")).toBeVisible();
});

test("results are logged on the board without names", async ({ page }) => {
  await openSummitMath(page);
  await tapChoice(page, page.locator(".stage"), true);
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("classcade:attempts") ?? "[]"));
  expect(log).toHaveLength(1);
  expect(Object.keys(log[0]).sort()).toEqual(
    ["at", "correct", "game", "id", "itemKey", "mode", "play", "session", "skill"].sort(),
  );
  expect(log[0].skill).toBe("2.NBT.B.5");
});

test("team mode: a miss lets the other team steal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Teacher settings" }).tap();
  await page.getByLabel(/Team mode/).check();
  await page.getByRole("button", { name: "Done" }).tap();
  await page.getByRole("button", { name: /Summit Math/ }).tap();
  const stage = page.locator(".stage");
  await expect(stage.locator(".turn")).toHaveText("Turn: Bears");
  await tapChoice(page, stage, false);
  await expect(stage.locator(".turn")).toHaveText("Steal: Eagles");
  await expect(stage.locator(".opt.wrong")).toBeDisabled();
  await tapChoice(page, stage, true);
  await expect(page.getByTestId("team-score-1")).toHaveText("1");
  await expect(page.getByTestId("team-score-0")).toHaveText("0");
  // The class still sees why the first answer was wrong.
  await expect(page.getByRole("status")).toBeVisible();
});
