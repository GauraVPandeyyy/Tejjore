import { reviewSnapshot } from "@/data/reviews";
import { getPublishedTestimonials } from "@/lib/content/testimonials";
import type { Testimonial } from "@/lib/content/types";
import type { HotelReview, ReviewFeed } from "@/types/reviews";

type GoogleLocalizedText = { text?: string; languageCode?: string };
type GoogleAuthorAttribution = { displayName?: string; uri?: string; photoUri?: string };
type GoogleReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  text?: GoogleLocalizedText;
  originalText?: GoogleLocalizedText;
  rating?: number;
  authorAttribution?: GoogleAuthorAttribution;
  publishTime?: string;
  googleMapsUri?: string;
};

type GooglePlaceResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: GoogleReview[];
};

type RuntimeGlobal = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const runtimeEnv = (globalThis as RuntimeGlobal).process?.env ?? {};
const CACHE_MS = 60 * 60 * 1000;
let cachedLiveFeed: { expiresAt: number; value: ReviewFeed } | null = null;

// Without the live Google feed there are no displayable reviews: demo review texts must never be
// presented as guest reviews (content ledger), so the fallback carries none.
function snapshotFeed(): ReviewFeed {
  return {
    source: "snapshot",
    rating: reviewSnapshot.rating,
    reviewCount: reviewSnapshot.reviewCount,
    capturedOn: reviewSnapshot.capturedOn,
    reviews: [],
  };
}

const SOURCE_LABELS: Record<Testimonial["source"], string> = { google: "Google", tripadvisor: "Tripadvisor", direct: "Guest", demo: "Demo" };

function testimonialReview(item: Testimonial): HotelReview {
  return {
    id: item.id,
    rating: item.rating ?? 0,
    text: item.text,
    publishTime: item.reviewDate ?? undefined,
    googleMapsUri: item.sourceUrl ?? undefined,
    sourceLabel: SOURCE_LABELS[item.source],
    author: { name: item.authorDisplay },
  };
}

// Without the live feed: genuine, consented, published testimonials from the content layer
// (never demo texts); with none, the snapshot feed (link-out only).
async function fallbackFeed(): Promise<ReviewFeed> {
  const { data } = await getPublishedTestimonials();
  if (!data.length) return snapshotFeed();
  return { source: "testimonials", rating: 0, reviewCount: data.length, reviews: data.slice(0, 3).map(testimonialReview) };
}

function normalizeReview(review: GoogleReview, index: number): HotelReview | null {
  const text = review.text?.text?.trim() || review.originalText?.text?.trim();
  const authorName = review.authorAttribution?.displayName?.trim();
  const rating = typeof review.rating === "number" ? review.rating : null;

  if (!text || !authorName || rating === null) return null;

  return {
    id: review.name || `google-review-${index}`,
    rating,
    text,
    relativeTime: review.relativePublishTimeDescription,
    publishTime: review.publishTime,
    googleMapsUri: review.googleMapsUri,
    author: {
      name: authorName,
      uri: review.authorAttribution?.uri,
      photoUri: review.authorAttribution?.photoUri,
    },
  };
}

export async function getReviewFeed(): Promise<ReviewFeed> {
  const apiKey = runtimeEnv.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = runtimeEnv.GOOGLE_PLACE_ID?.trim();

  if (!apiKey || !placeId) return fallbackFeed();
  if (cachedLiveFeed && cachedLiveFeed.expiresAt > Date.now()) return cachedLiveFeed.value;

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
      },
    });

    if (!response.ok) return fallbackFeed();

    const data = (await response.json()) as GooglePlaceResponse;
    if (typeof data.rating !== "number" || typeof data.userRatingCount !== "number") {
      return fallbackFeed();
    }

    const value: ReviewFeed = {
      source: "google-live",
      rating: data.rating,
      reviewCount: data.userRatingCount,
      googleMapsUri: data.googleMapsUri,
      reviews: (data.reviews || [])
        .map(normalizeReview)
        .filter((review): review is HotelReview => Boolean(review))
        .slice(0, 3),
    };

    cachedLiveFeed = { expiresAt: Date.now() + CACHE_MS, value };
    return value;
  } catch {
    return fallbackFeed();
  }
}
