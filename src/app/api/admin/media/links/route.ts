import { authorizeAdmin, type AdminContext } from "@/lib/admin/authz";
import { cmsErrorResponse, cmsJson } from "@/lib/admin/cms/http";
import { linkMedia, listEntityMedia, unlinkMedia } from "@/lib/admin/media/library";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";

/** GET ?entity_type=&entity_id= → media assigned to one entity (e.g. a room's photos). */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "media.view");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const entityType = url.searchParams.get("entity_type") ?? "";
  const entityId = url.searchParams.get("entity_id") ?? "";
  if (!/^[a-z]{2,20}$/.test(entityType) || !/^[a-z0-9][a-z0-9_-]{0,119}$/.test(entityId)) return apiError("INVALID_REQUEST", "Invalid entity.", 400);
  try {
    return cmsJson({ items: await listEntityMedia(entityType, entityId) });
  } catch (error) {
    return cmsErrorResponse("media/links", error, "Media could not be loaded.");
  }
}

async function mutate(request: Request, admin: AdminContext, action: typeof linkMedia) {
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return apiError("INVALID_REQUEST", "Invalid request.", 400);
  try {
    return cmsJson(await action(body, { admin, request }));
  } catch (error) {
    return cmsErrorResponse("media/links", error, "The assignment could not be saved.");
  }
}

/** POST { media_id, entity_type, entity_id, role?, sort_order?, layout_hint? } → assign. */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, "media.manage");
  if (!auth.ok) return auth.response;
  return mutate(request, auth.admin, linkMedia);
}

/** DELETE { media_id, entity_type, entity_id, role? } → unassign. */
export async function DELETE(request: Request) {
  const auth = await authorizeAdmin(request, "media.manage");
  if (!auth.ok) return auth.response;
  return mutate(request, auth.admin, unlinkMedia);
}
