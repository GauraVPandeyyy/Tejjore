import type { Metadata } from "next";
import { VirtualTourExperience } from "@/components/virtual-tour/VirtualTourExperience";
import { virtualTourSceneIds } from "@/data/virtualTour";

export const metadata: Metadata = {
  title: "Virtual Tour",
  description: "Explore Tejjora Lake View through its virtual hotel tour, from arrival and rooms to dining and the lake-facing experience.",
  alternates: { canonical: "/virtual-tour" },
};

type VirtualTourPageProps = {
  searchParams: Promise<{ scene?: string | string[]; demo360?: string | string[] }>;
};

export default async function VirtualTourPage({ searchParams }: VirtualTourPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params.scene) ? params.scene[0] : params.scene;
  const initialSceneId = requested && virtualTourSceneIds.includes(requested) ? requested : undefined;
  const demoValue = Array.isArray(params.demo360) ? params.demo360[0] : params.demo360;
  const demo360 = process.env.NODE_ENV !== "production" && demoValue === "1";

  return <VirtualTourExperience initialSceneId={initialSceneId} demo360={demo360} />;
}
