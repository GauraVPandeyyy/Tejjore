/**
 * Canonical public origin of the site, used for metadataBase, canonical URLs, sitemap, robots
 * and structured data. Production must configure NEXT_PUBLIC_SITE_URL; there is deliberately no
 * placeholder fallback, so a misconfigured deployment fails instead of publishing wrong URLs.
 * Local development (`next dev`) falls back to http://localhost:3000.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("NEXT_PUBLIC_SITE_URL must be an http(s) URL.");
    }
    return parsed.origin;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Set it to the public site origin (e.g. https://your-domain) before building; use http://localhost:3000 for local production builds.",
    );
  }
  return "http://localhost:3000";
}
