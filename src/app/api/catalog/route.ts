import { getCatalog } from "../../../lib/colvir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return Response.json(await getCatalog(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Не удалось получить каталог" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
