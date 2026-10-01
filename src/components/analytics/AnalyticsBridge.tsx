"use client";

import Script from "next/script";
import { useEffect } from "react";

const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function AnalyticsBridge() {
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ event?: string; payload?: Record<string, unknown> }>).detail;
      if (!detail?.event || typeof window.gtag !== "function") return;
      window.gtag("event", detail.event, detail.payload ?? {});
    };
    window.addEventListener("tejjora:analytics", listener);
    return () => window.removeEventListener("tejjora:analytics", listener);
  }, []);

  if (!gaId) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
    <Script id="tejjora-ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId.replace(/'/g, "")}');`}</Script>
  </>;
}
