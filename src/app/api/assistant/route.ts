import {
  LIMITS,
  UUID,
  type AssistantRequest,
  type ChatTurn,
} from "../../../lib/assistant-contract";
import { respond } from "../../../lib/assistant-engine";
import { getCatalog, getTerms } from "../../../lib/colvir";
import { parseDraftState } from "../../../lib/draft";
import { allow } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const bad = (error: string, status = 400) =>
  Response.json({ error }, { status, headers: NO_STORE });

function parseHistory(input: unknown): ChatTurn[] | null {
  if (!Array.isArray(input)) return null;
  const turns = input.slice(-LIMITS.historyTurns);
  const result: ChatTurn[] = [];
  for (const turn of turns) {
    if (
      !turn ||
      (turn.role !== "user" && turn.role !== "assistant") ||
      typeof turn.content !== "string"
    )
      return null;
    result.push({ role: turn.role, content: turn.content.slice(0, LIMITS.historyChars) });
  }
  return result;
}

export async function POST(request: Request): Promise<Response> {
  let body: Partial<AssistantRequest>;
  try {
    body = (await request.json()) as Partial<AssistantRequest>;
  } catch {
    return bad("Некорректный запрос");
  }
  if (typeof body.sessionId !== "string" || !UUID.test(body.sessionId)) return bad("Нет сессии");
  if (typeof body.messageId !== "string" || !UUID.test(body.messageId)) return bad("Нет сообщения");
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > LIMITS.message)
    return bad("Сообщение пустое или слишком длинное");
  const history = parseHistory(body.history ?? []);
  if (!history) return bad("Некорректная история диалога");
  const draft = parseDraftState(body.draft);
  if (!draft) return bad("Некорректный черновик заявки");
  if (!allow(`assistant:${body.sessionId}`, 20, 60_000))
    return bad("Слишком много сообщений. Подождите минуту.", 429);

  try {
    const result = await respond({ history, message, draft, deps: { getCatalog, getTerms } });
    return Response.json(result, { headers: NO_STORE });
  } catch (error) {
    // No message text or personal data in logs.
    console.error("assistant error", error instanceof Error ? error.name : "unknown");
    return bad("Помощник временно недоступен. Попробуйте еще раз.", 503);
  }
}
