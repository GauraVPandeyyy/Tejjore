import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrivalDashboard } from "@/components/arrival/ArrivalDashboard";

export const metadata: Metadata = {
  title: "Smart Arrival",
  description: "Guest arrival tools for Tejjora Lake View in Gomti Nagar, Lucknow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ArrivalPage() {
  return (
    <Suspense fallback={null}>
      <ArrivalDashboard />
    </Suspense>
  );
}
