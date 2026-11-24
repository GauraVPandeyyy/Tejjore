import { authorizeAdmin } from "@/lib/admin/authz";
import { deleteCmsRow, updateCmsRow } from "@/lib/admin/cms/engine";
import { cmsErrorResponse, cmsJson } from "@/lib/admin/cms/http";
import { CMS_RESOURCES, isCmsResourceId } from "@/lib/admin/cms/schema";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";

type Context = { params: Promise<{ resource: string; key: string }> };

/**
 * PATCH → update the submitted fields. The route requires the resource's view permission; the
 * engine then requires the manage permission (or the field's own permission, e.g. the kitchen's
 * `restaurant.menu.availability`) for every submitted field.
 */
export async function PATCH(request: Request, context: Context) {
  const { resource, key } = await context.params;
  if (!isCmsResourceId(resource)) return apiError("NOT_FOUND", "Unknown module.", 404);
  const auth = await authorizeAdmin(request, CMS_RESOURCES[resource].view);
  if (!auth.ok) return auth.response;
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body || typeof body !== "object" || Array.isArray(body) || !Object.keys(body).length) return apiError("INVALID_REQUEST", "Nothing to save.", 400);
  try {
    return cmsJson(await updateCmsRow(resource, decodeURIComponent(key), body, { admin: auth.admin, request }));
  } catch (error) {
    return cmsErrorResponse(`${resource}/update`, error, "The change could not be saved.");
  }
}

/** DELETE → remove (manage permission; resources such as rooms cannot be deleted). */
export async function DELETE(request: Request, context: Context) {
  const { resource, key } = await context.params;
  if (!isCmsResourceId(resource)) return apiError("NOT_FOUND", "Unknown module.", 404);
  const auth = await authorizeAdmin(request, CMS_RESOURCES[resource].manage);
  if (!auth.ok) return auth.response;
  try {
    return cmsJson(await deleteCmsRow(resource, decodeURIComponent(key), { admin: auth.admin, request }));
  } catch (error) {
    return cmsErrorResponse(`${resource}/delete`, error, "The item could not be deleted.");
  }
}
