import { test, expect, type Page } from "@playwright/test";

const rate = { modelId: 2875, rateId: 1, months: 48, advancePercent: 20, annualRate: 24.5 };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({
      json: {
        models: [{ id: 2875, name: "Тестовый автомобиль", brand: "BCC", partnerId: 1 }],
        years: [],
        source: "snapshot",
        checkedAt: "2026-09-23",
      },
    }),
  );
  await page.route("**/api/terms?**", (route) =>
    route.fulfill({
      json: {
        rates: [rate],
        limits: [{ advancePercent: 20, minPrice: 5000000, maxPrice: 50000000 }],
        source: "snapshot",
        checkedAt: "2026-09-23",
      },
    }),
  );
});

async function open(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("monthly-payment")).toBeVisible();
}

for (const width of [320, 390]) {
  test(`fits a ${width}px screen without horizontal scroll`, async ({ page }) => {
    await open(page, width);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(width);

    // Длинные подписи кнопок переносятся, а не обрезаются: текст целиком внутри кнопки.
    // scrollWidth обертки DS не годится — он всегда на несколько px больше clientWidth.
    for (const name of ["Сформировать коммерческое предложение", "Продолжить оформление"]) {
      const clipped = await page.getByRole("button", { name }).evaluate((button) => {
        const range = document.createRange();
        range.selectNodeContents(button.querySelector(".bcc-button__childrenWrapper")!);
        const text = range.getBoundingClientRect();
        const box = button.getBoundingClientRect();
        return text.left < box.left || text.right > box.right;
      });
      expect(clipped).toBe(false);
    }
  });
}

test("keeps the dialog close button on screen", async ({ page }) => {
  await open(page, 390);
  await page.getByRole("button", { name: "Показать график платежей" }).click();
  const close = page.locator(".bcc-modal__external-close");
  await expect(close).toBeVisible();
  const box = await close.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await close.click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
