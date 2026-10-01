import type { PropsWithChildren } from "react";
import { MobileActionBar } from "./MobileActionBar";
import { ConciergeLauncher } from "@/components/concierge/ConciergeLauncher";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SkipLink } from "./SkipLink";
import { AnalyticsBridge } from "@/components/analytics/AnalyticsBridge";

export function SiteShell({ children }: PropsWithChildren) {
  return (
    <>
      <AnalyticsBridge />
      <SkipLink />
      <SiteHeader />
      <div id="main-content">{children}</div>
      <SiteFooter />
      <ConciergeLauncher />
      <MobileActionBar />
    </>
  );
}
