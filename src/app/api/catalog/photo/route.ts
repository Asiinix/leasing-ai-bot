import { getCatalog } from "../../../../lib/colvir";
import { findVehicleMarket } from "../../../../lib/vehicle-market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catalog card photo: redirects to a kolesa.kz listing photo of the same brand and model,
 * or answers 404 so the card shows its placeholder. Only models from the bank catalog are
 * looked up, so the route cannot be used to fetch arbitrary pages.
 */
export async function GET(request: Request): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 400 });
  try {
    const model = (await getCatalog()).models.find((item) => item.id === id);
    if (!model) return new Response(null, { status: 404 });
    const market = await findVehicleMarket(model);
    if (!market?.imageUrl)
      // No browser caching of «no photo»: the server cache already limits kolesa.kz requests,
      // and a photo found later (for example after a network error) must show up right away.
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(null, {
      status: 302,
      headers: { Location: market.imageUrl, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
