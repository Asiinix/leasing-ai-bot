import type { ClientType } from "./types";

// Симуляция предварительного скоринга: решение считается на клиенте по простым
// правилам и никуда не отправляется. Реальный скоринг банка здесь не вызывается.

export type BusinessAge = "lt1" | "1to3" | "gt3";
export type Decision = "approved" | "review" | "declined";

export interface ScoringForm {
  taxId: string;
  businessAge: BusinessAge | null;
  monthlyRevenue: number;
  monthlyDebt: number;
  hasDebt: boolean | null;
  consent: boolean;
}

export interface ScoringContext {
  clientType: ClientType;
  monthlyPayment: number;
  advancePercent: number;
}

export interface ScoringFactor {
  label: string;
  positive: boolean;
}

export interface ScoringResult {
  decision: Decision;
  score: number;
  debtLoad: number;
  factors: ScoringFactor[];
}

export const emptyScoringForm: ScoringForm = {
  taxId: "",
  businessAge: null,
  monthlyRevenue: 0,
  monthlyDebt: 0,
  hasDebt: null,
  consent: false,
};

export const businessAgeOptions: { value: BusinessAge; label: string }[] = [
  { value: "lt1", label: "Менее 1 года" },
  { value: "1to3", label: "1–3 года" },
  { value: "gt3", label: "Более 3 лет" },
];

export const scoringStages = [
  "Проверяем ИИН/БИН в госреестре",
  "Запрашиваем кредитную историю",
  "Проверяем налоговую задолженность",
  "Оцениваем долговую нагрузку",
  "Формируем решение",
];

export const isTaxIdValid = (value: string) => /^\d{12}$/.test(value);

// Доля заполненной анкеты, 0–100. Каждый пункт весит одинаково; блок «кредиты»
// считается заполненным, когда клиент ответил «нет» или указал сумму платежей.
export function formCompletion(form: ScoringForm) {
  const filled = [
    isTaxIdValid(form.taxId),
    form.businessAge !== null,
    form.monthlyRevenue > 0,
    form.hasDebt === false || (form.hasDebt === true && form.monthlyDebt > 0),
    form.consent,
  ];
  return Math.round((filled.filter(Boolean).length / filled.length) * 100);
}

export function scoreApplication(form: ScoringForm, context: ScoringContext): ScoringResult {
  const debt = form.hasDebt ? form.monthlyDebt : 0;
  const debtLoad =
    form.monthlyRevenue > 0 ? (context.monthlyPayment + debt) / form.monthlyRevenue : Infinity;
  const factors: ScoringFactor[] = [];
  let score = 50;

  if (form.businessAge === "gt3") {
    score += 15;
    factors.push({ label: "Бизнес работает более 3 лет", positive: true });
  } else if (form.businessAge === "1to3") {
    score += 5;
    factors.push({ label: "Бизнес работает 1–3 года", positive: true });
  } else {
    score -= 15;
    factors.push({ label: "Срок деятельности менее 1 года", positive: false });
  }

  if (debtLoad <= 0.3) {
    score += 25;
    factors.push({ label: "Низкая долговая нагрузка", positive: true });
  } else if (debtLoad <= 0.5) {
    score += 10;
    factors.push({ label: "Умеренная долговая нагрузка", positive: true });
  } else if (debtLoad <= 0.7) {
    score -= 10;
    factors.push({ label: "Высокая долговая нагрузка", positive: false });
  } else {
    score -= 40;
    factors.push({ label: "Платежи превышают 70% выручки", positive: false });
  }

  if (context.advancePercent >= 30) {
    score += 10;
    factors.push({ label: "Аванс от 30%", positive: true });
  } else if (context.advancePercent >= 20) {
    score += 5;
    factors.push({ label: "Аванс от 20%", positive: true });
  }

  score = Math.max(0, Math.min(100, score));

  let decision: Decision = score >= 70 ? "approved" : score >= 50 ? "review" : "declined";
  // Обычный лизинг для ТОО — только со сроком деятельности более 1 года.
  if (context.clientType === "TOO" && form.businessAge === "lt1") {
    decision = "declined";
    factors.unshift({ label: "ТОО младше 1 года: обычный лизинг недоступен", positive: false });
  }
  if (debtLoad > 0.7) decision = "declined";

  return { decision, score, debtLoad, factors };
}
