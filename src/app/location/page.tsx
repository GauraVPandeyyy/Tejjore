import type { Metadata } from "next";
import { LocationExperience } from "@/components/location/LocationExperience";
import { DirectStayBanner } from "@/components/hotel/DirectStayBanner";

export const metadata: Metadata = {
  title: "Location | Tejjora Lake View, Gomti Nagar Lucknow",
  description: "Find Tejjora Lake View in Vikalp Khand, Gomti Nagar, Lucknow, with directions and useful nearby places.",
  alternates: { canonical: "/location" },
};

export default function LocationPage() {
  return (
    <main className="location-page">
      <LocationExperience index="01" />
      <DirectStayBanner index="02" />
    </main>
  );
}
