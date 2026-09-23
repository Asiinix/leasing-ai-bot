import { ColvirInputError, getTerms } from "../../../lib/colvir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const rawModelId = params.get("modelId");
  const clientType = params.get("clientType");
  if (
    params.getAll("modelId").length !== 1 ||
    params.getAll("clientType").length !== 1 ||
    !rawModelId ||
    !/^\d+$/.test(rawModelId) ||
    (clientType !== "IP" && clientType !== "TOO")
  ) {
    return Response.json(
      { error: "Укажите корректные modelId и clientType (IP или TOO)" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    return Response.json(await getTerms(Number(rawModelId), clientType), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ColvirInputError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      { error: "Не удалось получить условия" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
