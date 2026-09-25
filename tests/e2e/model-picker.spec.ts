import { test, expect } from "@playwright/test";

const models = [
  { id: 2875, name: "Tucson", brand: "HYUNDAI", partnerId: 1, partnerName: "Первый продавец" },
  { id: 2876, name: "Camry", brand: "TOYOTA", partnerId: 2, partnerName: "Второй продавец" },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({
      json: {
        models,
        years: [],
        source: "snapshot",
        checkedAt: "2026-09-25",
      },
    }),
  );
  await page.route("**/api/catalog/vehicle?**", (route) =>
    route.fulfill({
      json: {
        imageUrl: "https://kolesa-photos.kcdn.online/test.jpg",
        sourceUrl: "https://kolesa.kz/a/show/123",
        price: 12345000,
      },
    }),
  );
  await page.route("https://kolesa-photos.kcdn.online/test.jpg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="silver"/></svg>',
    }),
  );
  await page.route("**/api/terms?**", (route) =>
    route.fulfill({
      json: {
        rates: [
          {
            modelId: Number(new URL(route.request().url()).searchParams.get("modelId")),
            rateId: 1,
            months: 48,
            advancePercent: 20,
            annualRate: 24.5,
          },
        ],
        limits: [{ advancePercent: 20, minPrice: 5000000, maxPrice: 50000000 }],
        source: "snapshot",
        checkedAt: "2026-09-25",
      },
    }),
  );
  await page.goto("/");
});

test("brand selection fills the model and listing price", async ({ page }) => {
  await page.getByRole("button", { name: /Автомобиль Hyundai Tucson/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "TOYOTA", exact: false }).click();
  await expect(dialog.getByRole("img", { name: "Toyota Camry" })).toBeVisible();
  const terms = page.waitForRequest("**/api/terms?modelId=2876&**");
  await dialog.getByRole("button", { name: "Выбрать Toyota Camry, Второй продавец" }).click();
  await terms;
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Автомобиль Toyota Camry/ })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Стоимость автомобиля" })).toHaveValue(
    /12\s345\s000/,
  );
});

test("search, empty results and back navigation work without overflowing", async ({ page }) => {
  await page.getByRole("button", { name: /Автомобиль Hyundai Tucson/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill("missing-model");
  await expect(dialog.getByText(/Ничего не нашли/)).toBeVisible();
  await dialog.getByRole("textbox").fill("Camry");
  await expect(dialog.getByRole("button", { name: /Выбрать Toyota Camry/ })).toBeVisible();
  await dialog.getByRole("textbox").fill("");
  await dialog.getByRole("button", { name: "TOYOTA", exact: false }).click();
  await dialog.getByRole("button", { name: /Все марки/ }).click();
  await expect(dialog.getByRole("button", { name: "HYUNDAI", exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Автомобиль Hyundai Tucson/ })).toBeVisible();
});

test("shows a loaded model photo with its Kolesa source", async ({ page }) => {
  await page.route("**/api/catalog/vehicle?**", (route) =>
    route.fulfill({
      json: {
        imageUrl: "https://kolesa-photos.kcdn.online/test.jpg",
        sourceUrl: "https://kolesa.kz/cars/toyota/camry/",
      },
    }),
  );
  await page.route("https://kolesa-photos.kcdn.online/test.jpg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="silver"/></svg>',
    }),
  );
  await page.getByRole("button", { name: /Автомобиль Hyundai Tucson/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "TOYOTA", exact: false }).click();
  const photo = dialog.getByRole("img", { name: "Toyota Camry" });
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBe(320);
  await page.evaluate(() => {
    window.open = ((url: string | URL | undefined) => {
      document.documentElement.dataset.openedListing = String(url);
      return null;
    }) as typeof window.open;
  });
  await dialog.getByRole("button", { name: /Объявление на Kolesa.kz/ }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-opened-listing",
    "https://kolesa.kz/cars/toyota/camry/",
  );
});

for (const failure of ["missing", "broken", "unavailable"]) {
  test(`hides cards when photos are ${failure}`, async ({ page }) => {
    if (failure === "missing") {
      await page.route("**/api/catalog/vehicle?**", (route) =>
        route.fulfill({ json: { imageUrl: null, sourceUrl: null } }),
      );
    } else if (failure === "broken") {
      await page.route("https://kolesa-photos.kcdn.online/test.jpg", (route) =>
        route.fulfill({ status: 404, body: "not found" }),
      );
    } else {
      await page.route("**/api/catalog/vehicle?**", (route) =>
        route.fulfill({ status: 503, json: { error: "Unavailable" } }),
      );
    }
    await page.getByRole("button", { name: /Автомобиль Hyundai Tucson/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "TOYOTA", exact: true }).click();
    await expect(dialog.getByText(/На этой странице нет автомобилей с фото/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Выбрать Toyota/ })).toHaveCount(0);
    await expect(dialog.getByText("Фото недоступно", { exact: true })).toHaveCount(0);
    await expect(dialog.locator('[data-pw="card"] img')).toHaveCount(0);
  });
}

test("uses bcc-design controls and refreshes the price for the same model", async ({ page }) => {
  await page.getByRole("button", { name: /Автомобиль Hyundai Tucson/ }).click();
  const dialog = page.getByRole("dialog");
  const brand = dialog.getByRole("button", { name: "HYUNDAI", exact: true });
  await expect(brand).toHaveClass(/bcc-button/);
  await brand.click();
  await expect(dialog.locator('[data-pw="card"]')).toHaveCount(1);
  await dialog.getByRole("button", { name: /Выбрать Hyundai Tucson/ }).click();
  await expect(page.getByRole("textbox", { name: "Стоимость автомобиля" })).toHaveValue(
    /12\s345\s000/,
  );
});
