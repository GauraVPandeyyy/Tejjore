export type ReviewAuthor = {
  name: string;
  uri?: string;
  photoUri?: string;
};

export type HotelReview = {
  id: string;
  rating: number;
  text: string;
  relativeTime?: string;
  publishTime?: string;
  googleMapsUri?: string;
  /** Where the review was originally published (testimonials), e.g. "Google". */
  sourceLabel?: string;
  author: ReviewAuthor;
};

export type ReviewFeed = {
  /** "testimonials" = genuine, consented, published reviews curated in the database. */
  source: "google-live" | "testimonials" | "snapshot" | "demo";
  rating: number;
  reviewCount: number;
  googleMapsUri?: string;
  capturedOn?: string;
  reviews: HotelReview[];
};
