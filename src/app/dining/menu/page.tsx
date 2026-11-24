import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { MenuExperience } from "@/components/dining/MenuExperience";
import { operatingNotes } from "@/components/dining/diningFormat";
import { MaskedHeading } from "@/components/motion/MaskedHeading";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";
import { PillAnchor } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import { Waterline } from "@/components/ui/Waterline";
import { getRestaurantMenu, getRestaurantSettings } from "@/lib/content/restaurant";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Menu – Restaurant",
  description: "The full menu of the restaurant at Tejjora Lake View, Gomti Nagar, Lucknow, with current prices.",
  alternates: { canonical: "/dining/menu" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/dining/menu", baseMetadata);
}

export const revalidate = 600;

/**
 * Public menu and request-to-order (masterplan §8), the direct link to the same MenuExperience
 * the restaurant page shows — one menu, one cart, two entry points. Every category, dish and price
 * comes from the content layer (admin-managed); the server re-checks every price and the ordering
 * window. The hero is cinematic (masked-photograph title over the restaurant); the menu below is
 * unchanged in behaviour.
 */
export default async function MenuPage() {
  const [{ data: menu }, { data: settings }] = await Promise.all([getRestaurantMenu(), getRestaurantSettings()]);
  const count = menu.reduce((sum, category) => sum + category.items.length, 0);
  const notes = operatingNotes(settings);

  return (
    <main className="tj-page tj-menu-page tj-menu-page--cine">
      <section className="tj-menu-hero" data-hero-overlay="" aria-labelledby="menu-title">
        <ParallaxFrame className="tj-menu-hero__media" speed={9} reveal={false}>
          <Image src={assets.restaurant[4]} alt="" fill priority sizes="100vw" />
        </ParallaxFrame>
        <span className="tj-menu-hero__shade" aria-hidden="true" />
        <div className="tj-container tj-menu-hero__copy">
          <Link className="tj-menu-hero__back" href="/dining">
            <Icon name="arrow-left" size={16} /> The restaurant
          </Link>
          <h1 id="menu-title" className="sr-only">
            The menu
          </h1>
          <MaskedHeading
            aria-hidden
            tag="p"
            text="The menu"
            src={assets.restaurant[3]}
            className="tj-masked-hero tj-menu-hero__title"
            style={{ maxWidth: "min(100%, 36rem)" }}
            align="left"
            weight={800}
            tracking={-0.035}
            lineHeight={1}
            textScale={0.19}
            fillScale={1.4}
            parallax={30}
            drift={12}
            hoverZoom={0.08}
            saturation={1.2}
            reveal="scale"
            trigger="mount"
            duration={1.2}
            outline
            outlineColor="rgba(251, 243, 207, 0.85)"
            outlineWidth={1.25}
          />
          <p className="tj-menu-hero__lead">
            {menu.length} sections and {count} dishes from {settings.publicName ?? "the hotel’s restaurant"}, with current prices.
          </p>
          <div className="tj-actions-row tj-actions-row--start">
            <PillAnchor href="#menu-start" variant="cream" arrow>
              Start with the menu
            </PillAnchor>
          </div>
          {notes.length ? (
            <dl className="tj-menu-hero__facts">
              {notes.map((note) => (
                <div key={note.label}>
                  <dt>{note.label}</dt>
                  <dd>{note.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <Waterline variant="hero" className="tj-menu-hero__line" />
      </section>

      <div id="menu-start" className="tj-container tj-menu-page__body">
        <MenuExperience menu={menu} settings={settings} />
      </div>
    </main>
  );
}
