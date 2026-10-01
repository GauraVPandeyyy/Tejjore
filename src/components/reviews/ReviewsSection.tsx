import { hotel } from "@/data/hotel";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { getReviewFeed } from "@/lib/reviews/provider";

const mapsQuery=encodeURIComponent(`${hotel.name} ${hotel.address.locality} ${hotel.address.city}`);
const fallbackMapsUrl=`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("");}

export async function ReviewsSection({index="10"}:{index?:string}){
  const feed=await getReviewFeed(); const live=feed.source==="google-live"; const sourceUrl=feed.googleMapsUri||fallbackMapsUrl;
  return <section className="reviews-section reviews-section--v2" aria-labelledby="reviews-title"><div className="site-container">
    <div className="reviews-section__topline"><SectionLabel index={index}>GUEST REVIEWS</SectionLabel><span className="micro">{live?"GOOGLE · LIVE":"GUEST STORY PREVIEW"}</span></div>
    <div className="reviews-v2__heading"><div><strong>{feed.rating.toFixed(1)}</strong><span>/ 5</span><small>{live?`${feed.reviewCount} Google reviews`:`Latest Google snapshot: ${feed.reviewCount} reviews`}</small></div><h2 id="reviews-title">What the stay feels like<br/><em>in someone else’s words.</em></h2><p>{live?"Selected reviews are loaded from the official Google Places provider.":"A preview of the review experience. The latest public rating snapshot is shown above; live Google review content can be connected at launch."}</p></div>
    <div className="reviews-section__feed">{feed.reviews.map((review)=><article key={review.id} className="google-review-card"><div className="google-review-card__meta"><span className="google-review-card__avatar" aria-hidden="true" style={review.author.photoUri?{backgroundImage:`url(${review.author.photoUri})`}:undefined}>{!review.author.photoUri?initials(review.author.name):null}</span><div><strong>{review.author.name}</strong><span>{"★".repeat(Math.round(review.rating))}{review.relativeTime?` · ${review.relativeTime}`:""}</span></div><span className="google-review-card__source">{live?"Google":"Demo"}</span></div><p>{review.text}</p>{live&&review.googleMapsUri?<a className="google-review-card__link" href={review.googleMapsUri} target="_blank" rel="noreferrer">View on Google Maps ↗</a>:null}</article>)}</div>
    <div className="reviews-v2__footer"><a href={sourceUrl} target="_blank" rel="noreferrer">Read latest reviews on Google ↗</a>{!live?<small>Live Google review feed is not connected yet.</small>:null}</div>
  </div></section>;
}
