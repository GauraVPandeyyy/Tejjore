import { authorizeAdmin } from "@/lib/admin/authz";
import { createCmsRow, listCmsRows } from "@/lib/admin/cms/engine";
import { cmsErrorResponse, cmsJson } from "@/lib/admin/cms/http";
import { CMS_RESOURCES, isCmsResourceId } from "@/lib/admin/cms/schema";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";

type Context = { params: Promise<{ resource: string }> };

/** GET /api/admin/cms/:resource → every row of one content table (bounded), for its view permission. */
export async function GET(request: Request, context: Context) {
  const { resource } = await context.params;
  if (!isCmsResourceId(resource)) return apiError("NOT_FOUND", "Unknown module.", 404);
  const auth = await authorizeAdmin(request, CMS_RESOURCES[resource].view);
  if (!auth.ok) return auth.response;
  try {
    return cmsJson({ items: await listCmsRows(resource) });
  } catch (error) {
    return cmsErrorResponse(`${resource}/list`, error, "Content could not be loaded.");
  }
}

/** POST /api/admin/cms/:resource → create (manage permission). */
export async function POST(request: Request, context: Context) {
  const { resource } = await context.params;
  if (!isCmsResourceId(resource)) return apiError("NOT_FOUND", "Unknown module.", 404);
  const auth = await authorizeAdmin(request, CMS_RESOURCES[resource].manage);
  if (!auth.ok) return auth.response;
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiError("INVALID_REQUEST", "Invalid request.", 400);
  try {
    return cmsJson(await createCmsRow(resource, body, { admin: auth.admin, request }), 201);
  } catch (error) {
    return cmsErrorResponse(`${resource}/create`, error, "The change could not be saved.");
  }
}
