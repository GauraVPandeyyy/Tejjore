import Image from "next/image";
import Link from "next/link";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function ExperiencePageHero() {
  return (
    <section className="experience-page-hero" aria-labelledby="experience-page-title">
      <div className="site-container experience-page-hero__inner">
        <div className="experience-page-hero__copy">
          <SectionLabel index="01">EXPERIENCE</SectionLabel>
          <h1 id="experience-page-title">The stay changes<br /><em>with the light.</em></h1>
          <p>Move through Tejjora from the room to the table, the terrace and the city beyond — with the lake view becoming a different part of the stay as the day changes.</p>
          <div className="experience-page-hero__links">
            <Link href="#restaurant">Dining ↓</Link>
            <Link href="#gallery">Gallery ↓</Link>
            <Link href="/virtual-tour">Virtual tour ↗</Link>
          </div>
        </div>
        <figure className="experience-page-hero__media">
          <Image src="/d3.png" alt="Tejjora terrace and lake view at sunset" fill sizes="(max-width: 820px) 100vw, 52vw" priority />
          <span className="micro">TEJJORA / INSIDE THE STAY</span>
        </figure>
      </div>
    </section>
  );
}
