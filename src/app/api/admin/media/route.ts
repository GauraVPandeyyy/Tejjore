import { authorizeAdmin } from "@/lib/admin/authz";
import { listCmsRows } from "@/lib/admin/cms/engine";
import { cmsErrorResponse, cmsJson } from "@/lib/admin/cms/http";
import { MEDIA_MAX_BYTES } from "@/lib/admin/media/process";
import { mediaStorageStatus } from "@/lib/admin/media/storage";

/** GET → the media library. Uploading is not offered; photos live in public/images. */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "media.view");
  if (!auth.ok) return auth.response;
  try {
    return cmsJson({ items: await listCmsRows("media"), storage: mediaStorageStatus(), maxBytes: MEDIA_MAX_BYTES });
  } catch (error) {
    return cmsErrorResponse("media/list", error, "Media could not be loaded.");
  }
}
