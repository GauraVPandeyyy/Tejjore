import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { hotel } from "@/data/hotel";
import { Container } from "@/components/shared/Container";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function HotelStory() {
  return (
    <section className="hotel-story" aria-labelledby="hotel-story-title">
      <Container>
        <div className="hotel-story__topline">
          <SectionLabel index="01">THE PLACE</SectionLabel>
          <p className="hotel-story__eyebrow">Vikalp Khand · Gomti Nagar · Lucknow</p>
        </div>

        <div className="hotel-story__grid">
          <div className="hotel-story__copy">
            <h2 id="hotel-story-title" className="hotel-story__title">
              A quieter side<br />
              <em>of Gomti Nagar.</em>
            </h2>
            <p className="hotel-story__intro">
              Tejjora Lake View brings contemporary rooms, direct hotel assistance and an on-site dining experience together in one calm address—close to the movement of Lucknow, but designed around a slower rhythm inside.
            </p>
            <Link href="#lake-view" className="hotel-story__link">
              <span>Follow the view</span>
              <span aria-hidden="true">↓</span>
            </Link>
          </div>

          <div className="hotel-story__media" aria-label="Tejjora reception and lobby">
            <figure className="hotel-story__image hotel-story__image--primary">
              <Image
                src={assets.lobby[0]}
                alt="Tejjora Lake View lobby in Gomti Nagar, Lucknow"
                fill
                sizes="(max-width: 760px) 100vw, 55vw"
              />
            </figure>
            <figure className="hotel-story__image hotel-story__image--secondary">
              <Image
                src={assets.lobby[2]}
                alt="Reception at Tejjora Lake View"
                fill
                sizes="(max-width: 760px) 44vw, 20vw"
              />
            </figure>
            <span className="hotel-story__image-index micro">ARRIVAL / 01</span>
          </div>
        </div>

        <div className="hotel-story__facts" aria-label="Hotel facts">
          <div className="hotel-story__fact">
            <strong>{String(hotel.totalRooms).padStart(2, "0")}</strong>
            <span>rooms</span>
          </div>
          <div className="hotel-story__fact">
            <strong>{String(hotel.roomCategoryCount).padStart(2, "0")}</strong>
            <span>ways to stay</span>
          </div>
          <div className="hotel-story__fact hotel-story__fact--text">
            <strong>24</strong>
            <span>hour hotel assistance</span>
          </div>
          <div className="hotel-story__fact hotel-story__fact--location">
            <span className="micro">THE ADDRESS</span>
            <p>{hotel.address.line1}<br />{hotel.address.locality}, {hotel.address.city}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
