/**
 * Asset source of truth.
 * Room-set mapping is PROVISIONAL until hotel management confirms categories.
 * Missing media deliberately uses neutral placeholders and is never represented as real property media.
 */
export const assets = {
  hero: {
    image: "/images/exterior/tejjora-exterior-blue-sky-01.webp",
    alternateImages: [
      "/images/exterior/tejjora-exterior-front-01.webp",
      "/images/exterior/tejjora-exterior-blue-sky-02.webp",
    ],
    video: null,
    videoPoster: "/images/exterior/tejjora-exterior-blue-sky-01.webp",
  },
  lobby: [
    "/images/lobby/tejjora-lobby-wide-01.webp",
    "/images/lobby/tejjora-lobby-wide-02.webp",
    "/images/lobby/tejjora-reception-01.webp",
    "/images/lobby/tejjora-lobby-arrival-01.webp",
  ],
  rooms: {
    deluxe: [
      "/images/rooms/deluxe/deluxe-wide-01.webp",
      "/images/rooms/deluxe/deluxe-bed-01.webp",
      "/images/rooms/deluxe/deluxe-bed-02.webp",
      "/images/rooms/deluxe/deluxe-room-reverse-01.webp",
      "/images/rooms/deluxe/deluxe-amenity-01.webp",
    ],
    superDeluxe: [
      "/images/rooms/super-deluxe/super-deluxe-front-01.webp",
      "/images/rooms/super-deluxe/super-deluxe-angle-01.webp",
      "/images/rooms/super-deluxe/super-deluxe-wide-01.webp",
      "/images/rooms/super-deluxe/super-deluxe-bed-01.webp",
      "/images/rooms/super-deluxe/super-deluxe-tv-01.webp",
    ],
    premium: [
      "/images/rooms/premium/premium-wide-01.webp",
      "/images/rooms/premium/premium-wide-02.webp",
      "/images/rooms/premium/premium-bed-front-01.webp",
      "/images/rooms/premium/premium-angle-01.webp",
      "/images/rooms/premium/premium-tv-01.webp",
      "/images/rooms/premium/premium-curtain-01.webp",
    ],
  },
  restaurant: [
    "/images/restaurant/restaurant-wide-01.webp",
    "/images/restaurant/restaurant-depth-01.webp",
    "/images/restaurant/restaurant-seating-01.webp",
    "/images/restaurant/restaurant-editorial-01.webp",
    "/images/restaurant/restaurant-perspective-01.webp",
    "/images/restaurant/restaurant-daylight-01.webp",
    "/images/restaurant/restaurant-wide-02.webp",
  ],
  terraceView: {
    morning: "/images/placeholders/terrace-morning.svg",
    day: "/images/placeholders/terrace-day.svg",
    evening: "/images/placeholders/terrace-evening.svg",
    night: "/images/placeholders/terrace-night.svg",
  },
  food: {
    breakfastHero: "/images/placeholders/breakfast.svg",
    dinnerHero: "/images/placeholders/dining.svg",
  },
  videos: {
    hero: null,
    restaurant: null,
    lake: null,
    deluxe: null,
    superDeluxe: null,
    premium: null,
  },
  panoramas: {
    entrance: "/panoramas/entrance.jpg",
    reception: "/panoramas/reception.jpg",
    lobby: "/panoramas/lobby.jpg",
    corridor: "/panoramas/corridor.jpg",
    deluxe: "/panoramas/deluxe.jpg",
    superDeluxe: "/panoramas/super-deluxe.jpg",
    premium: "/panoramas/premium.jpg",
    restaurant: "/panoramas/restaurant.jpg",
    lakeView: "/panoramas/lake-view.jpg",
  },
} as const;
