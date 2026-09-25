import { getCatalog } from "@/lib/colvir";
import { getVehiclePhoto } from "@/lib/kolesa";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("modelId"));
  if (!Number.isSafeInteger(id) || id <= 0) {
    return Response.json({ error: "Некорректная модель" }, { status: 400 });
  }
  try {
    const model = (await getCatalog()).models.find((item) => item.id === id);
    if (!model) return Response.json({ error: "Модель не найдена" }, { status: 404 });
    const photo = await getVehiclePhoto(model);
    return Response.json(photo, {
      headers: { "Cache-Control": photo.imageUrl ? "public, max-age=300" : "no-store" },
    });
  } catch {
    return Response.json({ error: "Фото временно недоступно" }, { status: 503 });
  }
}
