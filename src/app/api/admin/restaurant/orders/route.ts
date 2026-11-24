import { authorizeAdmin, pageParams } from "@/lib/admin/authz";
import { cmsErrorResponse, cmsJson } from "@/lib/admin/cms/http";
import { listOrders } from "@/lib/admin/restaurant/orders";

/** GET ?scope=active|all&page= → the kitchen queue (polled by the dashboard every 15 s). */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "restaurant.orders.view");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "active";
  try {
    return cmsJson(await listOrders({ scope, ...pageParams(url, 30) }));
  } catch (error) {
    return cmsErrorResponse("orders/list", error, "Orders could not be loaded.");
  }
}
