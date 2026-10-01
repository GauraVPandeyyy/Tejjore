import type { Metadata } from "next";
import { DiningPage } from "@/components/dining/DiningPage";
import { StructuredData } from "@/components/seo/StructuredData";
import { restaurantSchema } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: "Dining | Tejjora Lake View, Lucknow",
  description: "Discover the restaurant and dining experience at Tejjora Lake View in Gomti Nagar, Lucknow.",
  alternates: { canonical: "/dining" },
};

export default function DiningRoute() { return <main className="dining-page"><StructuredData data={restaurantSchema} /><DiningPage /></main>; }
