import { DEMO_REVIEWS, reviewSnapshot } from "@/data/reviews";
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

function snapshotFeed(): ReviewFeed {
  return {
    source: "demo",
    rating: reviewSnapshot.rating,
    reviewCount: reviewSnapshot.reviewCount,
    capturedOn: reviewSnapshot.capturedOn,
    reviews: DEMO_REVIEWS,
  };
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

  if (!apiKey || !placeId) return snapshotFeed();
  if (cachedLiveFeed && cachedLiveFeed.expiresAt > Date.now()) return cachedLiveFeed.value;

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
      },
    });

    if (!response.ok) return snapshotFeed();

    const data = (await response.json()) as GooglePlaceResponse;
    if (typeof data.rating !== "number" || typeof data.userRatingCount !== "number") {
      return snapshotFeed();
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
    return snapshotFeed();
  }
}
