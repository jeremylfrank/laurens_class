import type { Locator, Page } from "@playwright/test";

/** Reads the problem off the board and returns the right answer. */
export async function answerOf(eq: Locator): Promise<number> {
  const a = Number(await eq.getAttribute("data-a"));
  const b = Number(await eq.getAttribute("data-b"));
  return (await eq.getAttribute("data-op")) === "+" ? a + b : a - b;
}

export async function tapChoice(page: Page, scope: Locator, right: boolean): Promise<void> {
  const answer = String(await answerOf(scope.locator(".eq")));
  const buttons = scope.locator("button.opt");
  const n = await buttons.count();
  for (let i = 0; i < n; i++) {
    const text = (await buttons.nth(i).textContent())?.trim();
    if ((text === answer) === right) {
      await buttons.nth(i).tap();
      return;
    }
  }
  throw new Error("no matching choice");
}

export async function openSummitMath(page: Page, mode = "Add to 100") {
  await page.goto("/");
  await page.getByRole("button", { name: /Summit Math/ }).tap();
  await page.getByRole("button", { name: mode }).tap();
}
