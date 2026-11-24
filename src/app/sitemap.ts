import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const routes = ["", "/rooms", "/dining", "/experience", "/gallery", "/location", "/plan-your-stay", "/book", "/contact", "/faq", "/virtual-tour", "/policies"];
  return routes.map((path) => ({ url: `${base}${path}`, changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : path === "/book" ? 0.9 : 0.7 }));
}
