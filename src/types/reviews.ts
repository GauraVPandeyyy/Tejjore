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
  author: ReviewAuthor;
};

export type ReviewFeed = {
  source: "google-live" | "snapshot" | "demo";
  rating: number;
  reviewCount: number;
  googleMapsUri?: string;
  capturedOn?: string;
  reviews: HotelReview[];
};
