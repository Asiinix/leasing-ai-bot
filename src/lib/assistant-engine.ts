/**
 * Assistant engine: OpenAI chat completions with server-side tools, and a deterministic
 * fallback over the same tools when the model is not configured or fails. The model text
 * never changes data directly — only validated tool calls produce the draft patch.
 */
import OpenAI from "openai";
import type { AssistantResponse, ChatTurn } from "./assistant-contract";
import { FIELD_LABELS, missingFields, type DraftField, type DraftState } from "./draft";
import { extractDraftFields } from "./draft-extract";
import { parseMessage } from "./assistant";
import { SYSTEM_PROMPT } from "./knowledge";
import { TOOL_DEFINITIONS, ToolSession, runTool, type ToolDeps } from "./assistant-tools";
import { money, percent } from "./format";

const MAX_TOOL_ROUNDS = 6;
const MODEL_TIMEOUT_MS = 30_000;

export const assistantModel = () => process.env.OPENAI_MODEL || "gpt-5.4-mini";

let client: OpenAI | null = null;
function openai(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: MODEL_TIMEOUT_MS,
    maxRetries: 1,
  });
  return client;
}

export class ModelUnavailableError extends Error {}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type CompletionParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
/** Model call; replaceable in tests. */
export type Complete = (
  params: CompletionParams,
) => Promise<OpenAI.Chat.Completions.ChatCompletion>;

const defaultComplete: Complete = async (params) => {
  const api = openai();
  if (!api) throw new ModelUnavailableError("OPENAI_API_KEY is not configured");
  return api.chat.completions.create(params);
};

async function runModel(
  session: ToolSession,
  history: ChatTurn[],
  message: string,
  complete: Complete,
): Promise<string> {
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((turn) => ({ role: turn.role, content: turn.content }) as Message),
    { role: "user", content: message },
  ];
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await complete({
      model: assistantModel(),
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_completion_tokens: 1_200,
    });
    const reply = completion.choices[0]?.message;
    if (!reply) throw new ModelUnavailableError("Empty model response");
    const calls = reply.tool_calls?.filter((call) => call.type === "function") ?? [];
    if (!calls.length) {
      const text = reply.content?.trim();
      if (!text) throw new ModelUnavailableError("Model returned no text");
      return text;
    }
    messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: calls });
    for (const call of calls) {
      const result = await runTool(session, call.function.name, call.function.arguments);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  throw new ModelUnavailableError("Too many tool rounds");
}

const QUICK = {
  calculate: /^рассчитать лизинг$|рассчита|посчита|расчет/u,
  conditions: /^узнать условия$|услови|какие\s+сроки|ставк/u,
  apply: /^заполнить заявку$|заявк|оформ/u,
};

/** Rule-based answers for the fallback: confirmed facts only, otherwise refer to a manager. */
function faqAnswer(text: string): string | null {
  if (/документ|справк|бумаг/u.test(text))
    return "Перечня документов в подключенных источниках нет. Уточните его у менеджера BCC Leasing.";
  if (/выкуп|остаточн/u.test(text))
    return "Условий выкупа и выкупного платежа в подключенных источниках нет. Уточните их у менеджера BCC Leasing.";
  if (/комисси|страхов|ндс|налог|залог/u.test(text))
    return "Комиссии, страхование, НДС, налоги и залог в этот расчет не входят, данных о них в сервисе нет. Уточните у менеджера BCC Leasing.";
  if (/одобр|скоринг|сколько\s+рассматр|срок\s+рассмотр/u.test(text))
    return "Решение об одобрении и сроки рассмотрения определяет BCC Leasing, в сервисе этих данных нет. Расчет здесь предварительный.";
  if (/требован|кто\s+может|для\s+кого/u.test(text))
    return "Этот сервис рассчитан на ИП и ТОО; для ТОО — со сроком деятельности более 1 года. Другие требования к клиенту уточните у менеджера BCC Leasing.";
  if (/этап|как\s+оформ|процесс/u.test(text))
    return "Этапы здесь: расчет, заполнение заявки, проверка и отправка после вашего подтверждения. Затем оформление продолжается в сервисе BCC Leasing.";
  if (/что\s+такое\s+лизинг/u.test(text))
    return "Лизинг — это финансирование покупки автомобиля: вы вносите аванс, а остаток стоимости выплачиваете ежемесячными платежами по ставке из тарифов BCC. Точные условия договора определяет BCC Leasing.";
  return null;
}

async function runFallback(session: ToolSession, message: string): Promise<string> {
  const text = message.toLowerCase().replace(/ё/g, "е");
  const parts: string[] = [];
  const extraction = extractDraftFields(message);
  const intent = parseMessage(message);

  if (extraction.unsupportedSubject)
    return `Этот сервис рассчитывает только лизинг легковых автомобилей. По запросу «${extraction.unsupportedSubject}» обратитесь к менеджеру BCC Leasing.`;

  const f = extraction.fields;
  const vehicles = await session.vehiclesInText(message);
  const vehicleId = vehicles.length === 1 ? vehicles[0].id : null;
  if (vehicles.length > 1)
    parts.push(
      vehicles.length > 8
        ? "Нашел много подходящих моделей. Уточните марку, модель и продавца."
        : "Нашел несколько записей в справочнике — выберите нужную в списке ниже.",
    );
  const hasFields = Object.keys(f).length > 0 || vehicleId !== null;
  if (hasFields && !extraction.questions.length) {
    const update = await session.updateDraft({
      subject: f.subject ?? null,
      client_type: f.clientType ?? null,
      price_kzt: f.price ?? null,
      currency: null,
      advance_percent: f.advancePercent ?? null,
      advance_amount_kzt: f.advanceAmount ?? null,
      months: f.months ?? null,
      vehicle_model_id: vehicleId,
      contact_name: null,
      contact_phone: f.contactPhone ?? null,
    });
    if (update.applied.length) parts.push(`Записал: ${update.applied.join(", ").toLowerCase()}.`);
    if (update.errors.length) parts.push(update.errors.join(" "));
  }
  if (extraction.questions.length) return extraction.questions.slice(0, 2).join(" ");

  // Budget request: "до 350 тысяч в месяц, аванс до 3 млн".
  if (intent.maxMonthly && intent.maxAdvance !== undefined) {
    const result = await session.findOffers({
      max_monthly_kzt: intent.maxMonthly,
      max_advance_kzt: intent.maxAdvance,
      locked_months: typeof intent.months === "number" ? intent.months : null,
    });
    if ("error" in result && result.error) parts.push(result.error);
    else if (result.offers?.length)
      parts.push("Подобрал варианты в пределах бюджета — выберите подходящий в карточке.");
    else if ("reason" in result && result.reason) parts.push(result.reason);
    return parts.join(" ");
  }

  const faq = faqAnswer(text);
  if (faq && !hasFields) return faq;

  if (QUICK.apply.test(text) && !hasFields) {
    const check = session.checkApplication();
    return check.ready
      ? "Все данные для заявки есть. Нажмите «Проверить заявку», чтобы увидеть итог и отправить."
      : `Для заявки не хватает: ${check.missing.slice(0, 2).join(", ").toLowerCase()}. Укажите, пожалуйста.`;
  }
  if (QUICK.conditions.test(text) && !hasFields) {
    const conditions = await session.getConditions();
    if ("error" in conditions) return conditions.error ?? "Условия недоступны.";
    const months = [...new Set(conditions.combinations.map((c) => c.months))].join(", ");
    const advances = [
      ...new Set(conditions.combinations.map((c) => percent(c.advancePercent))),
    ].join(", ");
    return `Для ${conditions.vehicle}: сроки ${months} мес., авансы ${advances}%. Доступны не все сочетания. Ставка — из тарифов BCC, комиссии и страхование не включены.`;
  }

  if (hasFields || QUICK.calculate.test(text)) {
    const missing = missingFields(session.state).filter((f: DraftField) =>
      ["price", "advancePercent", "months"].includes(f),
    );
    if (missing.length) {
      parts.push(
        `Для расчета укажите: ${missing.map((f) => FIELD_LABELS[f].toLowerCase()).join(", ")}.`,
      );
      return parts.join(" ");
    }
    const quote = await session.calculate();
    if ("error" in quote) {
      parts.push(quote.error ?? "Расчет недоступен.");
      if ("available" in quote && quote.available?.length)
        parts.push(
          `Доступные сочетания срока и аванса: ${quote.available.join("; ")}. Какое выберете?`,
        );
    } else
      parts.push(
        `Предварительный платеж — ${money(quote.monthlyPaymentKzt)} в месяц на ${quote.months} мес. Это не оферта: комиссии и страхование не включены.`,
      );
    return parts.join(" ");
  }

  return "Я помогу рассчитать лизинг, расскажу об условиях и заполню заявку. Напишите, например: «Автомобиль за 20 млн тенге, аванс 20%, на 3 года».";
}

export interface EngineInput {
  history: ChatTurn[];
  message: string;
  draft: DraftState;
  deps: ToolDeps;
  complete?: Complete;
}

export async function respond(input: EngineInput): Promise<AssistantResponse> {
  const session = new ToolSession(input.draft, input.deps);
  let reply: string;
  let mode: AssistantResponse["mode"] = "llm";
  let notice: string | undefined;
  try {
    reply = await runModel(
      session,
      input.history,
      input.message,
      input.complete ?? defaultComplete,
    );
  } catch (error) {
    // Diagnostic without message text or personal data: error class, HTTP status and API message.
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    console.error(
      "assistant model fallback",
      error instanceof Error ? error.name : "unknown",
      status ?? "",
      error instanceof OpenAI.APIError ? String(error.message).slice(0, 200) : "",
    );
    // A partially completed model run must not leak half-applied changes.
    const fallback = new ToolSession(input.draft, input.deps);
    reply = await runFallback(fallback, input.message);
    mode = "fallback";
    notice =
      error instanceof ModelUnavailableError && !process.env.OPENAI_API_KEY && !input.complete
        ? "ИИ-модель не подключена, работаю в упрощенном режиме."
        : "ИИ-модель сейчас недоступна, ответил в упрощенном режиме.";
    return {
      reply,
      patch: fallback.patch,
      baseRevs: input.draft.revs,
      cards: fallback.cards,
      mode,
      notice,
    };
  }
  return {
    reply,
    patch: session.patch,
    baseRevs: input.draft.revs,
    cards: session.cards,
    mode,
    notice,
  };
}
