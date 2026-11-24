import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";

/**
 * Content-Security-Policy without nonces. Nonces would force every page to render dynamically
 * (losing static generation), so Phase 1 uses an allow-list instead:
 * - 'unsafe-inline' scripts: required for Next's inline RSC/bootstrap scripts and GA4's inline
 *   config while pages are statically generated. Tighten with nonces or SRI hashes in Phase 9.
 * - checkout.razorpay.com + *.razorpay.com (script/frame/connect/img): Razorpay Checkout, which also
 *   loads helper bundles from cdn.razorpay.com.
 * - www.googletagmanager.com + *.google-analytics.com: GA4, only active when NEXT_PUBLIC_GA_ID is set.
 * - www.google.com (frame): Google Maps Embed on /location.
 * - tiles.openfreemap.org (connect + img): the vector tiles, style, sprites and glyphs for the /location map (MapLibre).
 * - *.googleusercontent.com (img): author photos on live Google reviews.
 * - SUPABASE_URL origin (img + connect), when set: admin-uploaded media in Supabase Storage, and
 *   the admin's signed upload of large originals straight to Storage.
 */
function supabaseOrigin() {
  try {
    const url = new URL(process.env.SUPABASE_URL?.trim() ?? "");
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(isDev: boolean, httpsSite: boolean) {
  const storage = supabaseOrigin();
  const storageSource = storage ? ` ${storage}` : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://*.razorpay.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://tiles.openfreemap.org https://*.razorpay.com https://www.googletagmanager.com https://*.google-analytics.com https://*.googleusercontent.com${storageSource}`,
    "font-src 'self' data:",
    "media-src 'self' blob:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""} https://tiles.openfreemap.org https://*.razorpay.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com${storageSource}`,
    "frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(httpsSite ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

function securityHeaders(isDev: boolean) {
  const httpsSite = !isDev && (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev, httpsSite) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: 'camera=(), microphone=(), usb=(), geolocation=(self), fullscreen=(self), gyroscope=(self), accelerometer=(self), payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")',
    },
    // HSTS only for a real https deployment; browsers ignore it on http://localhost anyway.
    ...(httpsSite ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  ];
}

/** Fails the production build/server clearly instead of emitting placeholder canonical URLs. */
function assertSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be set for production builds (e.g. https://your-domain). For a local production build use http://localhost:3000.",
    );
  }
  let protocol = "";
  try {
    protocol = new URL(value).protocol;
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL is not a valid URL: ${value}`);
  }
  if (protocol !== "https:" && protocol !== "http:") throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
}

export default function config(phase: string): NextConfig {
  // The public origin is a known constant of this deployment; an env var still overrides it.
  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim() && phase !== PHASE_DEVELOPMENT_SERVER) process.env.NEXT_PUBLIC_SITE_URL = "https://tejjoralakeview.in";
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER) assertSiteUrl();
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    env: process.env.NEXT_PUBLIC_SITE_URL ? { NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL } : {},
    // QA only: lets an isolated server (scripts/qa/isolated-env.mjs) run beside a developer's own
    // `next dev`, which holds the .next/dev lock. Unset everywhere else, so the default stays .next.
    ...(process.env.NEXT_QA_DIST_DIR === ".next-qa" ? { distDir: ".next-qa" } : {}),
    images: {
      formats: ["image/avif", "image/webp"],
      // Qualities the site actually requests (hero 72/70, Waterline Day 70); Next only allows listed values.
      qualities: [70, 72, 75],
      // Admin uploads are served from Supabase Storage's public bucket (src/lib/content/mediaUrl.ts).
      remotePatterns: supabaseOrigin() ? [{ protocol: "https", hostname: new URL(supabaseOrigin()!).hostname, pathname: "/storage/v1/object/public/**" }] : [],
    },
    poweredByHeader: false,
    reactStrictMode: true,
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders(isDev) }];
    },
  };
}
