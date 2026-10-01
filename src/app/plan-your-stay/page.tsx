import type { Metadata } from "next";
import { PlanMyStay } from "@/components/planner/PlanMyStay";

export const metadata: Metadata = {
  title: "Plan My Stay | Tejjora Lake View",
  description: "Build a Tejjora stay plan around your trip purpose, arrival, dates, guests and preferences, then continue to direct booking.",
  alternates: { canonical: "/plan-your-stay" },
};

export default function PlanYourStayPage() {
  return (
    <main className="plan-stay-page">
      <PlanMyStay index="01" />
    </main>
  );
}
