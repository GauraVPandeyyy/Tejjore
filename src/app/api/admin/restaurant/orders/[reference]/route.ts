import { authorizeAdmin } from "@/lib/admin/authz";
import { cmsErrorResponse, cmsJson } from "@/lib/admin/cms/http";
import { updateOrderStatus } from "@/lib/admin/restaurant/orders";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";

/** PATCH { status, reason? } → advance, decline or cancel an order (audited). */
export async function PATCH(request: Request, context: { params: Promise<{ reference: string }> }) {
  const auth = await authorizeAdmin(request, "restaurant.orders.manage");
  if (!auth.ok) return auth.response;
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const { reference } = await context.params;
  if (!/^TLO-[0-9A-Z]{8,12}$/.test(reference)) return apiError("NOT_FOUND", "Order not found.", 404);
  const body = await readJsonBody<{ status?: unknown; reason?: unknown }>(request);
  if (!body) return apiError("INVALID_REQUEST", "Invalid request.", 400);
  try {
    return cmsJson(await updateOrderStatus(reference, body, { admin: auth.admin, request }));
  } catch (error) {
    return cmsErrorResponse("orders/update", error, "The order could not be updated.");
  }
}
