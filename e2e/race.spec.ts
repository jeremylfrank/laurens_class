import { expect, test } from "@playwright/test";
import { answerOf } from "./helpers";

test("split screen: two kids tap at the same moment and both count", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Summit Race/ }).tap();
  const halves = page.locator(".half");
  const answers = [
    await answerOf(halves.nth(0).locator(".eq")),
    await answerOf(halves.nth(1).locator(".eq")),
  ];

  // Fire both touches in the same task, like two fingers landing together.
  await page.evaluate((ans) => {
    const halfEls = document.querySelectorAll(".half");
    ans.forEach((a, side) => {
      const btn = [...halfEls[side]!.querySelectorAll<HTMLButtonElement>("button[data-i]")].find(
        (b) => b.textContent?.trim() === String(a),
      )!;
      btn.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: side + 10,
          pointerType: "touch",
          isPrimary: side === 0,
        }),
      );
    });
  }, answers);

  await expect(page.getByTestId("score-0")).toHaveText("1");
  await expect(page.getByTestId("score-1")).toHaveText("1");
});

test("split screen: a wrong tap explains on that half only", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Summit Race/ }).tap();
  const left = page.locator(".half").nth(0);
  const answer = String(await answerOf(left.locator(".eq")));
  const wrong = left
    .locator("button[data-i]")
    .filter({ hasNotText: new RegExp(`^${answer}$`) })
    .first();
  await wrong.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 3 });
  await expect(left.getByRole("status")).toBeVisible();
  await expect(page.locator(".half").nth(1).locator("button[data-i]")).toHaveCount(4);
});

test("touch test counts fingers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Touch Test/ }).tap();
  const area = page.locator(".touchtest");
  await area.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", clientX: 300, clientY: 400 });
  await area.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch", clientX: 900, clientY: 400 });
  await expect(page.getByTestId("touch-count")).toHaveText("2");
  await expect(page.getByTestId("touch-best")).toContainText("Two team races will work");
});
