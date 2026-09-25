import { getCatalog } from "../../../../lib/colvir";
import { findVehicleMarket } from "../../../../lib/vehicle-market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Market price of a catalog model: median of the newest kolesa.kz listings. The calculator
 * uses it as a starting price that the client checks with the seller.
 */
export async function GET(request: Request): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0)
    return Response.json({ error: "Некорректная модель" }, { status: 400 });
  try {
    const model = (await getCatalog()).models.find((item) => item.id === id);
    if (!model) return Response.json({ error: "Модель не найдена" }, { status: 404 });
    const market = await findVehicleMarket(model);
    return Response.json(
      {
        price: market?.price ?? null,
        year: market?.year ?? null,
        listings: market?.listings ?? 0,
        sourceUrl: market?.sourceUrl ?? null,
        brandPhoto: market?.brandPhoto ?? false,
      },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch {
    return Response.json(
      { error: "Не удалось получить цену" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
