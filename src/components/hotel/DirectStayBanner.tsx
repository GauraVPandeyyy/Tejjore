import Link from "next/link";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function DirectStayBanner({ index = "12" }: { index?: string }) {
  return (
    <section className="direct-stay" aria-labelledby="direct-stay-title">
      <div className="site-container">
        <div className="direct-stay__line" />
        <div className="direct-stay__grid">
          <SectionLabel index={index}>STAY DIRECT</SectionLabel>
          <h2 id="direct-stay-title">One conversation closer to the hotel.</h2>
          <div className="direct-stay__benefits">
            <span>Direct hotel support</span>
            <span>Special requests handled directly</span>
            <span>Easy assistance before arrival</span>
          </div>
          <Link href="/book">Check dates <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}
