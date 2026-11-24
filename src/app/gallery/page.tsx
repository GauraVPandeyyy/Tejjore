import type { Metadata } from "next";
import Image from "next/image";
import { assets } from "@/data/assets";
import { GalleryExperience } from "@/components/gallery/GalleryExperience";
import { GalleryHeroFan } from "@/components/gallery/GalleryHero";
import { pickHeroSet } from "@/components/gallery/featured";
import { MaskedHeading } from "@/components/motion/MaskedHeading";
import { PillAnchor } from "@/components/ui/Buttons";
import { FeatureBands } from "@/components/ui/FeatureBand";
import { Waterline } from "@/components/ui/Waterline";
import { getGalleryImages } from "@/lib/content/media";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Gallery",
  description: "Browse rooms, dining, interiors and exterior photography from Tejjora Lake View in Lucknow.",
  alternates: { canonical: "/gallery" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/gallery", baseMetadata);
}

export const revalidate = 600;

/**
 * Gallery — a curated opening (the hotel, a room and the restaurant fanned in perspective), then an
 * editorial walk through each chapter with the strongest photograph of every subject, the complete
 * set and the full-screen viewer, then onward bands. Every image is Tejjora property photography
 * from the content layer.
 */
export default async function GalleryPage() {
  const { data: images } = await getGalleryImages();
  const lead = images.find((image) => image.category === "Hotel") ?? images[0];
  const chapters = new Set(images.map((image) => image.category)).size;

  return (
    <main className="tj-gallery-page">
      <section className="gx-hero" data-hero-overlay="" aria-labelledby="gallery-title">
        {lead ? <Image src={lead.src} alt="" fill priority sizes="100vw" className="gx-hero__bg" aria-hidden="true" /> : null}
        <span className="gx-hero__shade" aria-hidden="true" />
        <div className="tj-container gx-hero__grid">
          <div className="gx-hero__copy">
            <p className="tj-eyebrow">Photographed at the hotel</p>
            {/* The real, single-copy heading for assistive tech and crawlers; the masked title is its decorative visual. */}
            <h1 id="gallery-title" className="sr-only">
              Gallery
            </h1>
            <MaskedHeading
              aria-hidden
              tag="p"
              text="Gallery"
              src={assets.restaurant[3]}
              className="tj-masked-hero"
              style={{ maxWidth: "min(100%, 34rem)" }}
              align="left"
              weight={800}
              tracking={-0.035}
              lineHeight={1}
              textScale={0.2}
              fillScale={1.4}
              parallax={30}
              drift={12}
              hoverZoom={0.08}
              brightness={1.05}
              saturation={1.2}
              reveal="scale"
              trigger="mount"
              duration={1.2}
              outline
              outlineColor="rgba(251, 243, 207, 0.85)"
              outlineWidth={1.25}
            />
            <p className="gx-hero__lead">The hotel, its rooms and its restaurant — as they are. Open any photograph to see it full screen.</p>
            <div className="tj-actions-row tj-actions-row--start">
              <PillAnchor href="#gallery-chapters" variant="cream" arrow>
                Start looking
              </PillAnchor>
            </div>
            <dl className="gx-hero__stats">
              <div>
                <dt>Photographs</dt>
                <dd>{images.length}</dd>
              </div>
              <div>
                <dt>Chapters</dt>
                <dd>{chapters}</dd>
              </div>
            </dl>
          </div>
          <GalleryHeroFan images={pickHeroSet(images)} />
        </div>
        <Waterline variant="hero" className="gx-hero__line" />
      </section>

      <GalleryExperience items={images} />

      <FeatureBands
        label="Keep exploring"
        bands={[
          { href: "/virtual-tour", eyebrow: "360° tour", title: "Walk through it", image: assets.lobby[1], alt: "" },
          { href: "/rooms", eyebrow: "Rooms", title: "Choose a room", image: assets.rooms.premium[0], alt: "" },
          { href: "/dining", eyebrow: "Dining", title: "The menu", image: assets.restaurant[3], alt: "" },
        ]}
      />
    </main>
  );
}
