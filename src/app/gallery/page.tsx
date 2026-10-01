import type { Metadata } from "next";
import { GalleryExperience } from "@/components/gallery/GalleryExperience";
import { SectionLabel } from "@/components/shared/SectionLabel";

export const metadata: Metadata = {
  title: "Gallery | Tejjora Lake View",
  description: "Browse rooms, dining, interiors and exterior photography from Tejjora Lake View in Lucknow.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return <main className="gallery-page-v2">
    <section className="v2-page-hero v2-page-hero--simple"><div className="site-container"><SectionLabel index="01">GALLERY</SectionLabel><h1>Rooms, corners,<br/><em>light and atmosphere.</em></h1><p>A visual index of Tejjora as it is now. Final photography can replace these assets without changing the gallery structure.</p></div></section>
    <GalleryExperience index="02" />
  </main>;
}
