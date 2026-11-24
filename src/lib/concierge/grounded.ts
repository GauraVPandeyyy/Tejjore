import "server-only";
import { formatMoney } from "@/data/commerce";
import { hotel } from "@/data/hotel";
import { nearbyPlaces } from "@/data/nearby";
import { rateCardNote } from "@/lib/booking/rateCard";
import { getPublicRoomRates } from "@/lib/booking/publicRates";
import { getApprovedAiKnowledge } from "@/lib/content/aiKnowledge";
import { getPublishedFaqs } from "@/lib/content/faqs";
import { getPublishedPolicies } from "@/lib/content/policies";
import { getActiveOffers } from "@/lib/content/offers";
import { getRestaurantMenu, getRestaurantSettings } from "@/lib/content/restaurant";
import { getRooms } from "@/lib/content/rooms";
import type { MenuCategory } from "@/lib/content/types";
import { simplify, withinOneEdit } from "@/components/dining/menuSearch";
import type { ConciergeCard, ConciergeRoomItem } from "./provider";

/**
 * Grounded building blocks for concierge answers. Each reads the same source the website renders
 * from (booking rate card, published content, verified src/data), so the chat can never quote a
 * different price, dish or place from the page the guest is looking at.
 */

export const hotelAddress = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}, ${hotel.address.country}`;

export function mapsRoute(destination: string) {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin: hotelAddress, destination }).toString()}`;
}

export function whatsappLink(message: string) {
  return `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(message)}`;
}

/* ------------------------------------------------------------------ rooms and rates */

export async function roomItems(): Promise<ConciergeRoomItem[]> {
  const { data: rooms } = await getRooms();
  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    href: `/rooms/${room.slug}`,
    bookHref: `/book?room=${room.id}`,
    image: room.imageSet[0] ?? null,
    summary: room.shortDescription,
    fromRate: room.rate?.fromRate ?? null,
    rateNote: room.rate ? rateCardNote(room.rate, formatMoney) : null,
  }));
}

/** The rate card the rooms pages show, as a concierge card. Null when rates cannot be read. */
export async function ratesCard(): Promise<Extract<ConciergeCard, { kind: "rates" }> | null> {
  const [{ data: rooms }, rates] = await Promise.all([getRooms(), getPublicRoomRates()]);
  if (!rates) return null;
  const items = rooms.flatMap((room) => {
    const card = rates[room.id];
    return card
      ? [{ id: room.id, name: room.name, href: `/rooms/${room.slug}`, fromRate: card.fromRate, standardRate: card.standardRate, tonightRate: card.tonightRate, note: rateCardNote(card, formatMoney) }]
      : [];
  });
  return items.length ? { kind: "rates", title: "Direct rates, per night · room only", rooms: items } : null;
}

/* ------------------------------------------------------------------ restaurant */

function sectionFrom(category: MenuCategory) {
  const prices = category.items.filter((item) => item.available).map((item) => item.priceFull);
  return prices.length ? Math.min(...prices) : null;
}

export async function menuCard(): Promise<{ card: Extract<ConciergeCard, { kind: "menu" }>; menu: MenuCategory[]; dishCount: number }> {
  const [{ data: menu }, { data: settings }] = await Promise.all([getRestaurantMenu(), getRestaurantSettings()]);
  const notes = [settings.serviceChargeNote, settings.taxesNote].filter((note): note is string => Boolean(note));
  return {
    menu,
    dishCount: menu.reduce((sum, category) => sum + category.items.length, 0),
    card: {
      kind: "menu",
      orderingEnabled: settings.orderingEnabled,
      notes,
      sections: menu.map((category) => ({ name: category.name, count: category.items.length, fromPrice: sectionFrom(category), href: `/dining#menu-${category.slug}` })),
    },
  };
}

// Words that appear in dish names but say nothing about a dish on their own, plus intent words.
const DISH_STOPWORDS = new Set(
  [
    "the", "and", "with", "for", "you", "your", "have", "has", "any", "are", "is", "do", "does", "what", "which", "how", "much",
    "price", "cost", "menu", "dish", "dishes", "food", "eat", "order", "serve", "served", "available", "restaurant", "room", "rooms",
    "breakfast", "lunch", "dinner", "table", "special", "full", "half", "plate", "veg", "non", "can", "get", "there", "please", "tell",
    "about", "some", "item", "items", "hotel", "tejjora", "lake", "view", "stay", "night", "want", "like", "would", "best", "good",
    "today", "tonight", "lucknow", "gomti", "nagar", "of", "main", "course", "indian", "chinese", "starters", "dry", "gravy", "choice",
    "cream", "mix", "mixed", "plain", "green", "fresh", "hot", "cold", "sweet", "water", "drink", "vegetable", "vegetables", "crispy",
    "american", "boiled", "steamed", "toasted", "roasted", "fried", "scoop", "assorted", "butter", "n", "in", "a", "an", "to", "at",
  ].map(simplify),
);

const FOOD_CONTEXT = ["menu", "dish", "dishes", "food", "eat", "eating", "order", "serve", "serves", "served", "restaurant", "kitchen", "veg", "vegetarian", "spicy", "drink", "drinks", "beverage", "beverages", "snack", "snacks", "starter", "starters", "dessert", "desserts", "cuisine", "meal", "meals", "hungry", "breakfast", "lunch", "dinner"];
const ROOM_CONTEXT = ["room", "rooms", "bathroom", "bed", "suite"];

/**
 * Dishes from the published menu that the guest named ("do you have paneer tikka?"). Only fires on
 * a distinctive dish word, or a food question; a room question ("is there tea in the room?") is
 * left to the room answers so a menu price is never read as an in-room facility.
 */
export function findDishes(message: string, tokens: string[], menu: MenuCategory[]) {
  const foodContext = FOOD_CONTEXT.some((word) => tokens.includes(word));
  if (!foodContext && ROOM_CONTEXT.some((word) => tokens.includes(word))) return null;
  const vocabulary = [...new Set(menu.flatMap((category) => category.items.flatMap((item) => simplify(item.name).split(" "))))];
  // Whole words only ("tea" must not find "steamed"); one typo allowed on longer words in a food question.
  const sameWord = (known: string, word: string) => known === word || (foodContext && word.length >= 5 && known.length >= 5 && withinOneEdit(known, word));
  const words = [...new Set(simplify(message).split(" "))].filter((word) => word.length >= 3 && !DISH_STOPWORDS.has(word));
  const dishWords = words.filter((word) => vocabulary.some((known) => sameWord(known, word)));
  if (!dishWords.length) return null;

  const scored = menu.flatMap((category) =>
    category.items.flatMap((item) => {
      const itemWords = simplify(item.name).split(" ");
      const score = dishWords.filter((word) => itemWords.some((known) => sameWord(known, word))).length;
      return score ? [{ category, item, score }] : [];
    }),
  );
  if (!scored.length) return null;
  const best = Math.max(...scored.map((entry) => entry.score));
  const dishes = scored
    .filter((entry) => entry.score === best)
    .slice(0, 6)
    .map(({ category, item }) => ({
      name: item.name,
      section: category.name,
      price: item.priceFull,
      halfPrice: item.priceHalf,
      containsEgg: item.containsEgg,
      available: item.available,
      href: `/dining#menu-${category.slug}`,
    }));
  return { query: dishWords.join(" "), dishes };
}

/* ------------------------------------------------------------------ places, offers, contact */

export function placesCard(ids?: string[]): Extract<ConciergeCard, { kind: "places" }> {
  const places = nearbyPlaces.filter((place) => !ids || ids.includes(place.id));
  return { kind: "places", places: places.map((place) => ({ name: place.name, category: place.category, href: mapsRoute(place.mapsQuery) })) };
}

export function contactCard(): Extract<ConciergeCard, { kind: "contact" }> {
  return {
    kind: "contact",
    phoneDisplay: hotel.phoneDisplay,
    phoneHref: `tel:${hotel.phoneE164}`,
    whatsappHref: whatsappLink("Hello Tejjora Lake View, I have a question about my stay."),
    address: hotelAddress,
    mapsHref: mapsRoute(hotelAddress),
  };
}

export async function offersCard(): Promise<Extract<ConciergeCard, { kind: "offers" }> | null> {
  const { data: offers } = await getActiveOffers();
  if (!offers.length) return null;
  return {
    kind: "offers",
    offers: offers.slice(0, 4).map((offer) => ({ title: offer.title, summary: offer.summary, validTo: offer.validTo, href: "/offers" })),
  };
}

/* ------------------------------------------------------------------ approved knowledge */

const KNOWLEDGE_STOPWORDS = new Set(["what", "when", "where", "which", "does", "have", "with", "your", "there", "this", "that", "from", "about", "hotel", "tejjora", "please", "tell", "would", "could", "should", "is", "are", "the", "and", "for", "you", "can", "any", "how"]);

function significant(tokens: string[]) {
  return [...new Set(tokens.filter((token) => token.length >= 4 && !KNOWLEDGE_STOPWORDS.has(token)))];
}

export type ApprovedAnswer = { source: "ai-knowledge" | "faq" | "policy"; title: string; answer: string; score: number };

/**
 * Staff-approved answers the concierge may use as they are: AI knowledge (public AND approved),
 * published FAQs and published, approved policies. An entry matches when it shares most of its
 * meaningful question words with the guest's. Nothing unapproved or private is ever read here.
 */
export async function findApprovedAnswers(tokens: string[], tokenizeText: (text: string) => string[], limit = 3): Promise<ApprovedAnswer[]> {
  const asked = significant(tokens);
  if (!asked.length) return [];
  const [{ data: knowledge }, { data: faqs }, { data: policies }] = await Promise.all([getApprovedAiKnowledge(), getPublishedFaqs(), getPublishedPolicies()]);
  const candidates: Array<Omit<ApprovedAnswer, "score"> & { words: string[] }> = [
    ...knowledge.map((entry) => ({ source: "ai-knowledge" as const, title: entry.question, answer: entry.answer, words: significant(tokenizeText(entry.question)) })),
    ...faqs.map((faq) => ({ source: "faq" as const, title: faq.question, answer: faq.answer, words: significant(tokenizeText(faq.question)) })),
    ...policies.map((policy) => ({ source: "policy" as const, title: policy.title, answer: policy.body, words: significant(tokenizeText(policy.title)) })),
  ];
  return candidates
    .flatMap((candidate) => {
      if (!candidate.words.length) return [];
      const shared = candidate.words.filter((word) => asked.includes(word)).length;
      const score = shared / candidate.words.length;
      return shared >= Math.min(2, candidate.words.length) && score >= 0.5 ? [{ source: candidate.source, title: candidate.title, answer: candidate.answer, score }] : [];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
