import OpenAI from "openai";
import { UUID } from "../../../lib/assistant-contract";
import { allow } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BYTES = 8 * 1024 * 1024;
const bad = (error: string, status = 400) =>
  Response.json({ error }, { status, headers: NO_STORE });

/** Voice message → text via OpenAI transcription. Audio is not stored. */
export async function POST(request: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) return bad("Распознавание голоса не подключено.", 503);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Некорректный запрос");
  }
  const sessionId = form.get("sessionId");
  const audio = form.get("audio");
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) return bad("Нет сессии");
  if (!(audio instanceof File) || !audio.size) return bad("Нет записи");
  if (audio.size > MAX_BYTES) return bad("Запись слишком длинная. Максимум около минуты.");
  if (!/^audio\//.test(audio.type)) return bad("Неподдерживаемый формат записи");
  if (!allow(`transcribe:${sessionId}`, 10, 60_000))
    return bad("Слишком много записей. Подождите минуту.", 429);

  try {
    const api = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 1 });
    const result = await api.audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe",
      language: "ru",
      prompt: "Лизинг автомобиля, ИП, ТОО, аванс, срок в месяцах, стоимость в тенге, миллионов.",
    });
    const text = result.text.trim().slice(0, 1_000);
    if (!text) return bad("Не удалось распознать речь. Попробуйте еще раз.", 422);
    return Response.json({ text }, { headers: NO_STORE });
  } catch (error) {
    // Status and API message only; no audio or transcript in logs.
    console.error(
      "transcribe error",
      error instanceof OpenAI.APIError
        ? `${error.status} ${String(error.message).slice(0, 120)}`
        : "unknown",
    );
    return bad("Не удалось распознать запись. Попробуйте еще раз или напишите текстом.", 503);
  }
}
