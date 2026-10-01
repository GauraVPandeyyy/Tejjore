import Image from "next/image";
import { dayAtTejjora } from "@/data/experience";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function DayAtTejjora({ index = "06" }: { index?: string }) {
  return (
    <section id="explore" className="day-story" aria-labelledby="day-story-title">
      <div className="site-container">
        <div className="day-story__topline">
          <SectionLabel index={index}>A DAY AT TEJJORA</SectionLabel>
          <span className="micro">AN EDITORIAL STAY FLOW · NOT SERVICE HOURS</span>
        </div>

        <div className="day-story__intro">
          <h2 id="day-story-title">A stay that moves<br /><em>at your pace.</em></h2>
          <p>
            Tejjora works best when the room, the city, the terrace and the restaurant feel like one continuous day rather than separate amenities.
          </p>
        </div>

        <div className="day-story__timeline">
          {dayAtTejjora.map((moment, index) => (
            <article key={moment.id} className="day-story__moment">
              <div className="day-story__time">
                <span>{moment.time}</span>
                <small>{moment.label}</small>
              </div>
              <div className="day-story__content">
                <h3>{moment.headline}</h3>
                <p>{moment.copy}</p>
              </div>
              <figure className="day-story__media" data-placeholder={moment.imageIsPlaceholder ? "true" : "false"}>
                <Image
                  src={moment.image}
                  alt={moment.imageIsPlaceholder ? "" : `${moment.label} at Tejjora Lake View`}
                  fill
                  sizes="(max-width: 820px) 100vw, 34vw"
                />
                <span className="micro">{String(index + 1).padStart(2, "0")}</span>
              </figure>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
