import type { PropsWithChildren } from "react";
import { ConciergeLauncher } from "@/components/concierge/ConciergeLauncher";
import { BookingSearch } from "@/components/booking/BookingSearch";
import { AnalyticsBridge } from "@/components/analytics/AnalyticsBridge";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SkipLink } from "./SkipLink";
import { SiteChromeProvider } from "./SiteChromeProvider";

export function SiteShell({ children }: PropsWithChildren) {
  return (
    <SiteChromeProvider>
      <AnalyticsBridge />
      <SkipLink />
      <SiteHeader />
      <div id="main-content">{children}</div>
      <SiteFooter />
      <ConciergeLauncher />
    </SiteChromeProvider>
  );
}
