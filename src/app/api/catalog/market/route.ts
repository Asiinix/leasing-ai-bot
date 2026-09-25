import { getCatalog } from "../../../../lib/colvir";
import { marketPrice } from "../../../../lib/market-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Market price of a catalog model: median of the newest kolesa.kz listings, or a price
 * preset when there are none. The calculator uses it as a starting price that the client
 * checks with the seller.
 */
export async function GET(request: Request): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0)
    return Response.json({ error: "Некорректная модель" }, { status: 400 });
  try {
    const model = (await getCatalog()).models.find((item) => item.id === id);
    if (!model) return Response.json({ error: "Модель не найдена" }, { status: 404 });
    const { price, source, presetLevel, year, market } = await marketPrice(model);
    return Response.json(
      {
        price,
        source,
        presetLevel,
        year,
        listings: market?.listings ?? 0,
        sourceUrl: market?.sourceUrl ?? null,
        brandPhoto: market?.brandPhoto ?? false,
      },
      // Заготовку не кэшируем надолго: как только kolesa.kz ответит, покажем рыночную цену.
      {
        headers: {
          "Cache-Control": source === "preset" ? "no-store" : "private, max-age=3600",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Не удалось получить цену" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
