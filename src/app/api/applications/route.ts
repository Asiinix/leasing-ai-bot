import { UUID } from "../../../lib/assistant-contract";
import { ToolSession } from "../../../lib/assistant-tools";
import { applicationStore } from "../../../lib/applications";
import { getCatalog, getTerms } from "../../../lib/colvir";
import {
  FIELD_LABELS,
  isValidEmail,
  isValidIin,
  missingFields,
  parseDraftState,
} from "../../../lib/draft";
import { BCC_APPLICATION_URL } from "../../../lib/knowledge";
import { allow } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const bad = (error: string, status = 400, extra: object = {}) =>
  Response.json({ error, ...extra }, { status, headers: NO_STORE });

/** Submit only after the client's explicit confirmation in the UI. Idempotent per key. */
export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Некорректный запрос");
  }
  const { sessionId, idempotencyKey, consent } = body;
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) return bad("Нет сессии");
  if (typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey))
    return bad("Нет ключа отправки");
  if (consent !== true) return bad("Нужно согласие на обработку контактных данных.");
  const contact = body.contact as { email?: unknown; iin?: unknown } | undefined;
  const email = typeof contact?.email === "string" ? contact.email.trim() : "";
  const iin = typeof contact?.iin === "string" ? contact.iin : "";
  if (!isValidEmail(email)) return bad("Проверьте адрес почты, например name@example.kz.");
  if (!isValidIin(iin)) return bad("ИИН должен содержать 12 цифр.");
  const draft = parseDraftState(body.draft);
  if (!draft) return bad("Некорректные данные заявки");
  if (!allow(`applications:${sessionId}`, 5, 60_000))
    return bad("Слишком много попыток. Подождите минуту.", 429);

  const missing = missingFields(draft);
  if (missing.length)
    return bad("Заполнены не все данные", 422, { missing: missing.map((f) => FIELD_LABELS[f]) });

  // Recalculate on the server: the browser's numbers are never trusted.
  const session = new ToolSession(draft, { getCatalog, getTerms });
  const result = await session.calculate();
  if ("error" in result) return bad(result.error ?? "Расчет недоступен", 422);
  const quoteCard = session.cards.find((card) => card.type === "quote");
  if (!quoteCard || quoteCard.type !== "quote") return bad("Расчет недоступен", 503);

  try {
    const { application, duplicate } = await applicationStore().submit({
      sessionId,
      idempotencyKey,
      values: draft.values,
      contact: { email, iin },
      quote: quoteCard.quote,
    });
    return Response.json(
      {
        id: application.id,
        createdAt: application.createdAt,
        duplicate,
        quote: application.quote,
        transmittedToBcc: false,
        continueUrl: BCC_APPLICATION_URL,
      },
      { status: duplicate ? 200 : 201, headers: NO_STORE },
    );
  } catch (error) {
    console.error("application store error", error instanceof Error ? error.name : "unknown");
    return bad(
      "Не удалось сохранить заявку. Попробуйте еще раз — повторная отправка не создаст дубликат.",
      503,
    );
  }
}
