import type { Metadata } from "next";
import { RoomsCollection } from "@/components/rooms/RoomsCollection";

export const metadata: Metadata = {
  title: "Rooms | Tejjora Lake View, Gomti Nagar Lucknow",
  description: "Explore Deluxe, Super Deluxe and Premium rooms at Tejjora Lake View in Gomti Nagar, Lucknow.",
  alternates: { canonical: "/rooms" },
};

export default function RoomsPage() {
  return (
    <main className="rooms-page">
      <RoomsCollection />
    </main>
  );
}
