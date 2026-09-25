import { ColvirInputError, getVehicleTermsBatch } from "../../../lib/colvir";
import { MAX_CATALOG_TERM_MODELS } from "../../../features/chat-vehicle-cards/terms-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_768;
class BodyTooLarge extends Error {}

async function readBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_BODY_BYTES) throw new BodyTooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new BodyTooLarge();
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

export async function POST(request: Request): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  if (
    process.env.NEXT_PUBLIC_FEATURE_FIXED_PRICE_CATALOG !== "true" ||
    process.env.NEXT_PUBLIC_FEATURE_CHAT_VEHICLE_CARDS !== "true"
  )
    return Response.json({ error: "Функция не включена" }, { status: 404, headers });
  try {
    if (request.signal.aborted) return new Response(null, { status: 499, headers });
    const body = (await readBody(request)) as { modelIds?: unknown; clientType?: unknown } | null;
    if (
      !body ||
      !Array.isArray(body.modelIds) ||
      body.modelIds.length > MAX_CATALOG_TERM_MODELS ||
      body.modelIds.some(
        (id: unknown) => typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0,
      ) ||
      (body.clientType !== "IP" && body.clientType !== "TOO")
    )
      throw new ColvirInputError("Укажите modelIds и тип клиента IP или TOO");
    const result = await getVehicleTermsBatch(body.modelIds, body.clientType);
    if (request.signal.aborted) return new Response(null, { status: 499, headers });
    return Response.json(result, { headers });
  } catch (error) {
    const status =
      error instanceof BodyTooLarge
        ? 413
        : error instanceof ColvirInputError
          ? error.status
          : error instanceof SyntaxError
            ? 400
            : 503;
    return Response.json(
      { error: status === 413 ? "Слишком большой запрос" : "Не удалось получить условия каталога" },
      { status, headers },
    );
  }
}
