import type { HotelReview } from "@/types/reviews";

export const reviewSnapshot = {
  provider: "Google",
  rating: 5.0,
  reviewCount: 10,
  capturedOn: "2026-09-27",
  dynamic: false,
  note: "Dated snapshot only; use Google Places live data in production.",
} as const;

/** DEMO_REVIEWS: layout/content placeholders only. Replace with live Google Places reviews before launch. */
export const DEMO_REVIEWS: HotelReview[] = [
  { id:"demo-business", rating:5, text:"A smooth short stay with a comfortable room, helpful staff and an easy location for getting around Gomti Nagar.", relativeTime:"Demo review", author:{name:"Business traveller · demo"} },
  { id:"demo-couple", rating:5, text:"The room felt calm after a long day in the city, and having dining in the hotel made the evening much easier.", relativeTime:"Demo review", author:{name:"Weekend guest · demo"} },
  { id:"demo-family", rating:5, text:"Parking, direct hotel support and a simple room choice made the stay straightforward for our family visit.", relativeTime:"Demo review", author:{name:"Family guest · demo"} },
];
