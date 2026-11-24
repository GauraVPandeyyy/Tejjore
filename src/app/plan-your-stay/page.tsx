import type { Metadata } from "next";
import { PlanMyStay } from "@/components/planner/PlanMyStay";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Plan My Stay",
  description: "Build a Tejjora stay plan around your trip purpose, arrival, dates, guests and preferences, then continue to direct booking.",
  alternates: { canonical: "/plan-your-stay" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/plan-your-stay", baseMetadata);
}

export default function PlanYourStayPage() {
  return (
    <main className="tj-page">
      <PlanMyStay />
    </main>
  );
}
