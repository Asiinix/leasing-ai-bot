import { test, expect } from "@playwright/test";

test("hero switches between leasing and IronCard with accessible controls", async ({
  page,
}, info) => {
  await page.goto("/");
  const hero = page.getByRole("region", { name: "Предложения" });
  // Pointer over the hero pauses autoplay while the controls are checked.
  await hero.hover();
  await expect(hero.getByRole("heading", { name: "Калькулятор лизинга" })).toBeVisible();
  await hero.getByRole("button", { name: "IronCard", exact: true }).click();
  await expect(hero.getByRole("heading", { name: "Премиальная #IronCard" })).toBeVisible();
  await expect(hero.getByRole("button", { name: "IronCard", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(hero.getByRole("button", { name: "Подобрать с ИИ" })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("ironcard.png"), animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await hero.getByRole("button", { name: "Следующий баннер" }).click();
  await expect(hero.getByRole("heading", { name: "Застрахуй братуху" })).toBeVisible();
  await hero.getByRole("button", { name: "Следующий баннер" }).click();
  await expect(hero.getByRole("button", { name: "BCC Invest", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await hero.getByRole("button", { name: "Следующий баннер" }).click();
  await expect(hero.getByRole("heading", { name: "Калькулятор лизинга" })).toBeVisible();
  await hero.getByRole("button", { name: "Предыдущий баннер" }).click();
  await expect(hero.getByRole("button", { name: "BCC Invest", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test("hero autoplays every 5 seconds and pauses on hover", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("region", { name: "Предложения" });
  const current = hero.locator('[aria-current="true"]');
  await expect(current).toHaveText("Лизинг");
  await page.mouse.move(0, page.viewportSize()!.height - 1);
  await expect(current).toHaveText("IronCard", { timeout: 7000 });
  await expect(current).toHaveText("BCC Life", { timeout: 7000 });
  await hero.hover();
  await page.waitForTimeout(6000);
  await expect(current).toHaveText("BCC Life");
});
