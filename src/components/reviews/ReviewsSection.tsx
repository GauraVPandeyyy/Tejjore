import { hotel } from "@/data/hotel";
import { CardCarousel } from "@/components/ui/CardCarousel";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { getReviewFeed } from "@/lib/reviews/provider";

const mapsQuery = encodeURIComponent(`${hotel.name} ${hotel.address.locality} ${hotel.address.city}`);
const fallbackMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

/**
 * Guest reviews, rendered ONLY when genuine reviews exist: the live Google Places feed, or
 * consented, published testimonials from the content layer. Otherwise the block is not rendered
 * at all — no demo texts, no dated rating snapshot, no empty link-out section.
 */
export async function ReviewsSection() {
  const feed = await getReviewFeed();
  const live = feed.source === "google-live" && feed.reviews.length > 0;
  const curated = feed.source === "testimonials" && feed.reviews.length > 0;
  if (!live && !curated) return null;
  const sourceUrl = feed.googleMapsUri || fallbackMapsUrl;

  return (
    <section className="tj-section tj-reviews" aria-labelledby="reviews-title">
      <div className="tj-container">
        <SectionIntro id="reviews-title" title="In guests' words" action={{ href: sourceUrl, label: live ? "Read more on Google" : "Read guest reviews on Google" }}>
          {live ? (
            <p>
              <strong>{feed.rating.toFixed(1)} / 5</strong> from {feed.reviewCount} Google reviews, loaded live from Google.
            </p>
          ) : (
            <p>Reviews shared by guests, linked to where they were first published.</p>
          )}
        </SectionIntro>
        <CardCarousel label="Guest reviews">
          {feed.reviews.map((review) => (
            <figure key={review.id} className="tj-review">
              <blockquote>
                <p>{review.text}</p>
              </blockquote>
              <figcaption>
                <strong>{review.author.name}</strong>
                <span>
                  {"★".repeat(Math.round(review.rating))} · {live ? "Google" : review.sourceLabel}
                  {live && review.relativeTime ? ` · ${review.relativeTime}` : ""}
                </span>
                {review.googleMapsUri ? (
                  <a href={review.googleMapsUri} target="_blank" rel="noreferrer" aria-label={live ? `View this review on Google Maps (by ${review.author.name})` : `View this review on ${review.sourceLabel} (by ${review.author.name})`}>
                    View original ↗
                  </a>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </CardCarousel>
      </div>
    </section>
  );
}
