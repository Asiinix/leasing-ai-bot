import { test, expect, type Page } from "@playwright/test";

// После отправки заявки открывается симуляция скоринга; анкета ведет к одобрению.
// ИИН подставлен из контактов заявки.
async function passScoring(page: Page, iin: string) {
  const scoring = page.getByRole("dialog");
  await expect(scoring.getByLabel("ИИН", { exact: true })).toHaveValue(iin);
  await scoring.getByRole("button", { name: "Более 3 лет" }).click();
  await scoring.getByLabel("Средняя выручка в месяц").fill("3000000");
  await scoring.getByRole("button", { name: "Нет", exact: true }).click();
  await scoring.getByText("Согласен на запрос данных").click();
  await scoring.getByRole("button", { name: "Запустить скоринг" }).click();
  await expect(scoring.getByText("Предварительно одобрено")).toBeVisible({ timeout: 15_000 });
}

test("validates contacts, keeps them when reopened and saves the application once", async ({
  page,
}) => {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({
      json: {
        models: [
          { id: 2875, name: "Tucson", brand: "Hyundai", partnerId: 1, partnerName: "Продавец" },
        ],
        years: [],
        source: "snapshot",
        checkedAt: "2026-09-23",
      },
    }),
  );
  await page.route("**/api/terms?**", (route) =>
    route.fulfill({
      json: {
        rates: [{ modelId: 2875, rateId: 1, months: 48, advancePercent: 20, annualRate: 24.5 }],
        limits: [{ advancePercent: 20, minPrice: 5000000, maxPrice: 50000000 }],
        source: "snapshot",
        checkedAt: "2026-09-23",
      },
    }),
  );
  await page.goto("/");
  await page.evaluate(() => {
    window.open = (...args) => {
      document.body.dataset.openedUrl = String(args[0]);
      return null;
    };
  });
  await page.getByRole("button", { name: "Продолжить оформление" }).click();
  const fullName = page.getByLabel("ФИО", { exact: true });
  const email = page.getByLabel("Электронная почта", { exact: true });
  const phone = page.getByLabel("Телефон", { exact: true });
  const iin = page.getByLabel("ИИН", { exact: true });
  const consent = page.getByRole("checkbox", { name: /Я согласен на обработку/ });
  await expect(consent).not.toBeChecked();
  await expect(fullName).toHaveAttribute("aria-invalid", "false");
  await email.fill("invalid");
  await email.blur();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Проверьте адрес почты, например name@example.kz.")).toBeVisible();
  const submit = page.getByRole("button", { name: "Отправить заявку" });
  await submit.click();
  await expect(fullName).toBeFocused();
  await expect(page.getByText("Укажите ФИО.", { exact: true })).toBeVisible();
  await expect(page.getByText("Укажите ИИН.", { exact: true })).toBeVisible();
  await expect(consent).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("body")).not.toHaveAttribute("data-opened-url");
  await fullName.fill("   ");
  await email.fill("invalid");
  await phone.fill("+7 (12)");
  await submit.click();
  await expect(fullName).toBeFocused();
  await fullName.fill("Иванов Иван Иванович");
  await submit.click();
  await expect(email).toBeFocused();
  await email.fill("ivan@example.kz");
  await expect(email).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByText("Проверьте адрес почты, например name@example.kz.")).toHaveCount(0);
  await submit.click();
  await expect(phone).toBeFocused();
  await page.getByRole("button", { name: "Вернуться к расчету" }).click();
  await page.getByRole("button", { name: "Продолжить оформление" }).click();
  await expect(fullName).toHaveValue("Иванов Иван Иванович");
  await expect(email).toHaveValue("ivan@example.kz");
  await expect(phone).toHaveValue("+7 (12)");
  await submit.click();
  await expect(phone).toBeFocused();
  await expect(page.locator("body")).not.toHaveAttribute("data-opened-url");
  await phone.fill("+7 (700) 123-45-67");
  await submit.click();
  await expect(iin).toBeFocused();
  await iin.fill("12345678901a");
  await submit.click();
  await expect(iin).toBeFocused();
  await expect(page.getByText("ИИН должен содержать 12 цифр.")).toBeVisible();
  await iin.fill("01234567890");
  await expect(iin).toHaveAttribute("aria-invalid", "true");
  await iin.fill("012345678901");
  await expect(iin).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByText("ИИН должен содержать 12 цифр.")).toHaveCount(0);
  await submit.click();
  await expect(consent).toBeFocused();
  await expect(page.locator("body")).not.toHaveAttribute("data-opened-url");
  await page
    .getByText(
      "Я согласен на обработку моих персональных данных для рассмотрения заявки на лизинг",
      { exact: true },
    )
    .click();
  await expect(consent).toHaveAttribute("aria-invalid", "false");
  await consent.press("Space");
  await expect(consent).toHaveAttribute("aria-invalid", "true");
  await submit.click();
  await expect(page.locator("body")).not.toHaveAttribute("data-opened-url");
  await page
    .getByText(
      "Я согласен на обработку моих персональных данных для рассмотрения заявки на лизинг",
      { exact: true },
    )
    .click();
  // Valid contacts, but the example calculator values are not confirmed yet: nothing is sent.
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/applications") && request.method() === "POST")
      posts.push(request.postData() ?? "");
  });
  await phone.press("Enter");
  await expect(page.getByText("Сначала подтвердите параметры лизинга выше.")).toBeVisible();
  expect(posts).toHaveLength(0);
  await page.getByRole("button", { name: "Параметры верны" }).click();
  await page.getByRole("button", { name: "Вернуться к расчету" }).click();
  await page.getByRole("button", { name: "Продолжить оформление" }).click();
  await expect(iin).toHaveValue("012345678901");
  await expect(consent).toBeChecked();
  // Double submit creates one application; contacts go to this service, not to BCC.
  await submit.dblclick();
  // The saved application hands over to a separate scoring modal.
  const scoring = page.getByRole("dialog");
  await expect(scoring.getByRole("heading", { name: "Предварительный скоринг" })).toBeVisible();
  await expect(scoring.getByText(/Заявка BL-\d{6} сохранена/)).toBeVisible();
  const number = (await scoring.getByText(/Заявка BL-\d{6}/).innerText()).match(/BL-\d{6}/)![0];
  await passScoring(page, "012345678901");
  // Nothing opens by itself; BCC opens only on the explicit button.
  await expect(page.locator("body")).not.toHaveAttribute("data-opened-url");
  await scoring.getByRole("button", { name: "Продолжить в сервисе BCC Leasing" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-opened-url",
    "https://business.bcc.kz/online-leasing/",
  );
  expect(posts.length).toBeGreaterThanOrEqual(1);
  const body = JSON.parse(posts[0]);
  expect(body.consent).toBe(true);
  expect(body.contact).toEqual({ email: "ivan@example.kz", iin: "012345678901" });
  expect(body.draft.values.contactName).toBe("Иванов Иван Иванович");
  // Reopening shows the same saved application instead of a new submission.
  await scoring.getByRole("button", { name: "Готово" }).click();
  await page.getByRole("button", { name: "Продолжить оформление" }).click();
  const saved = page.getByRole("dialog");
  await expect(saved.getByText(`Номер обращения ${number}`)).toBeVisible();
  await expect(saved.getByText(/в систему BCC пока не подключена/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Продолжить оформление" }).click();
  await expect(fullName).toBeEmpty();
  await expect(email).toBeEmpty();
  await expect(phone).toBeEmpty();
  await expect(iin).toBeEmpty();
  await expect(consent).not.toBeChecked();
});
