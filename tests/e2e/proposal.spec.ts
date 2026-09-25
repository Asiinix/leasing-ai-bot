import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { calculateQuote } from "../../src/lib/finance";
import { createProposal, proposalNote } from "../../src/lib/proposal";

const rate = { modelId: 2875, rateId: 1, months: 48, advancePercent: 20, annualRate: 24.5 };
const model = "Тестовый автомобиль";
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

test.beforeEach(async ({ page }) => {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({
      json: {
        models: [{ id: 2875, name: model, brand: "BCC", partnerId: 1, partnerName: "Продавец" }],
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
  await page.goto("/");
  await expect(page.getByTestId("monthly-payment")).toBeVisible();
});

test("downloads A4 searchable Cyrillic PDF matching the preview and complete schedule", async ({
  page,
}, testInfo) => {
  await page.getByRole("button", { name: "Сформировать коммерческое предложение" }).click();
  const client = "ТОО «Ёлка и партнёры» " + "Длинноеназвание".repeat(30);
  await page.getByLabel("Имя клиента или название компании (необязательно)").fill(client);
  const preview = page.getByRole("article");
  await expect(preview).toContainText(client);
  const expected = createProposal(
    calculateQuote(15000000, rate),
    "Bcc " + model.toLowerCase(),
    "IP",
    client,
    new Date(),
  );
  for (const [, value] of expected.fields) await expect(preview).toContainText(value);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать PDF" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(expected.filename);
  const path = testInfo.outputPath("proposal.pdf");
  await download.saveAs(path);
  const text = normalize(execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" }));
  expect(text).toContain("Коммерческое предложение");
  expect(text.replaceAll(" ", "")).toContain(client.replaceAll(" ", ""));
  for (const [, value] of expected.fields.slice(1)) expect(text).toContain(normalize(value));
  for (const row of expected.schedule) expect(text).toContain(normalize(row.join(" ")));
  expect(text).toContain(proposalNote);
  const info = execFileSync("pdfinfo", [path], { encoding: "utf8" });
  expect(info).toContain("A4");
  expect(Number(info.match(/Pages:\s+(\d+)/)?.[1])).toBeGreaterThan(2);
  await page.screenshot({ path: testInfo.outputPath("preview.png"), fullPage: true });
});

test("reports asset errors and permits retry without duplicate generation", async ({ page }) => {
  await page.route("**/fonts/NotoSans-Regular.ttf", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.getByRole("button", { name: "Сформировать коммерческое предложение" }).click();
  await page.getByRole("button", { name: "Скачать PDF" }).click();
  await expect(
    page.getByText("Не удалось сформировать PDF. Попробуйте скачать ещё раз."),
  ).toBeVisible();
  await page.unroute("**/fonts/NotoSans-Regular.ttf");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать PDF" }).click();
  await event;
});

test("invalidates a pending download when calculator changes", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/fonts/NotoSans-Regular.ttf", async (route) => {
    await gate;
    await route.continue();
  });
  let downloads = 0;
  page.on("download", () => {
    downloads++;
  });
  await page.getByRole("button", { name: "Сформировать коммерческое предложение" }).click();
  await page.getByRole("button", { name: "Скачать PDF" }).click();
  await expect(page.getByRole("button", { name: "Формируем PDF…" })).toBeDisabled();
  // Programmatic input also exercises updates arriving while the modal is open.
  await page
    .getByRole("textbox", { name: "Стоимость автомобиля", exact: true })
    .evaluate((element: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        element,
        "20000000",
      );
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  await expect(page.getByRole("article")).toHaveCount(0);
  release();
  await page.getByRole("button", { name: "Сформировать коммерческое предложение" }).click();
  await expect(page.getByRole("article")).toContainText("20 000 000 ₸");
  await page.waitForTimeout(500);
  expect(downloads).toBe(0);
  await page
    .getByRole("textbox", { name: "Стоимость автомобиля", exact: true })
    .evaluate((element: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, "0");
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Сформировать коммерческое предложение" }),
  ).toHaveCount(0);
});
