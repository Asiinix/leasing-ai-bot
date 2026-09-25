import { test, expect } from "@playwright/test";

test("validates contacts, keeps them when reopened and opens BCC without personal data", async ({
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
  const submit = page.getByRole("button", { name: "Открыть заявку BCC" });
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
  await phone.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-opened-url",
    "https://business.bcc.kz/online-leasing/",
  );
  await page.getByRole("button", { name: "Вернуться к расчету" }).click();
  await page.getByRole("button", { name: "Продолжить оформление" }).click();
  await expect(iin).toHaveValue("012345678901");
  await expect(consent).toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Продолжить оформление" }).click();
  await expect(fullName).toBeEmpty();
  await expect(email).toBeEmpty();
  await expect(phone).toBeEmpty();
  await expect(iin).toBeEmpty();
  await expect(consent).not.toBeChecked();
});
