import type { PropsWithChildren } from "react";
import { ConciergeLauncher } from "@/components/concierge/ConciergeLauncher";
import { AnalyticsBridge } from "@/components/analytics/AnalyticsBridge";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SiteDock } from "./SiteDock";
import { SkipLink } from "./SkipLink";
import { SiteChromeProvider } from "./SiteChromeProvider";
import { RouteTransition } from "./RouteTransition";
import { StayPlannerProvider } from "./StayPlanner";

export function SiteShell({ children }: PropsWithChildren) {
  return (
    <SiteChromeProvider>
      <StayPlannerProvider>
        <AnalyticsBridge />
        <SkipLink />
        <RouteTransition />
        <SiteHeader />
        <div id="main-content">{children}</div>
        <SiteFooter />
        <SiteDock />
        <ConciergeLauncher />
      </StayPlannerProvider>
    </SiteChromeProvider>
  );
}
