import type { Metadata } from "next";
import { RoomsIndex } from "@/components/rooms/RoomsIndex";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Rooms – Gomti Nagar, Lucknow",
  description: "Explore Deluxe, Super Deluxe and Premium rooms at Tejjora Lake View in Gomti Nagar, Lucknow.",
  alternates: { canonical: "/rooms" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/rooms", baseMetadata);
}

export const revalidate = 600;

export default function RoomsPage() {
  return <RoomsIndex />;
}
