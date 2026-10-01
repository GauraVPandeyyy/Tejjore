import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");
  const routes = ["", "/rooms", "/dining", "/experience", "/gallery", "/location", "/plan-your-stay", "/book", "/contact", "/virtual-tour", "/policies"];
  return routes.map((path) => ({ url: `${base}${path}`, changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : path === "/book" ? 0.9 : 0.7 }));
}
