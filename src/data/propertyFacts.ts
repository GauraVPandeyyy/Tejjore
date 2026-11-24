import { amenities } from "./amenities";
import { nearbyPlaces } from "./nearby";

/**
 * Property facts with their content-ledger status (docs/TEJJORA_CONTENT_SOURCE_LEDGER.md §2).
 * Seeds `property_facts` and is the read fallback. A fact reaches the public site, structured
 * data or the AI only when status is "verified" AND `public` is true. `public` on a
 * non-verified row records intent only; it never publishes the row.
 *
 * Facts the ledger lists as MISSING (email, coordinates, owner names) have no row: do not invent them.
 */
export type FactStatus = "verified" | "provisional" | "placeholder" | "conflict";
export type FactValue = string | number | boolean | null | FactValue[] | { [key: string]: FactValue };

export type PropertyFactSource = {
  key: string;
  value: FactValue;
  status: FactStatus;
  source: string;
  public: boolean;
  notes?: string;
};

export const propertyFactSources: PropertyFactSource[] = [
  { key: "name", value: "Tejjora Lake View", status: "verified", source: "SRC-LOGO, SRC-CODE, SRC-TA", public: true },
  { key: "descriptor", value: "A Boutique Hotel", status: "verified", source: "SRC-LOGO, SRC-MENU", public: true },
  { key: "established", value: 2026, status: "verified", source: "SRC-LOGO, SRC-MENU", public: true },
  { key: "tagline.menu", value: "Luxury Rooms & Restaurant", status: "verified", source: "SRC-MENU", public: true },
  {
    key: "address",
    value: {
      streetAddress: "C-1/242, Vikalp Khand",
      locality: "Gomti Nagar",
      city: "Lucknow",
      region: "Uttar Pradesh",
      postalCode: "226010",
      country: "IN",
    },
    status: "verified",
    source: "SRC-CODE hotel.ts, SRC-TA",
    public: true,
  },
  {
    key: "phone",
    value: { display: "+91 96211 34909", e164: "+919621134909", whatsapp: true },
    status: "verified",
    source: "SRC-CODE hotel.ts, SRC-TA",
    public: true,
  },
  { key: "rooms.total", value: 29, status: "verified", source: "SRC-CODE hotel.ts, SRC-TA", public: true, notes: "SRC-TRIP lists 28 (conflicting listing, ignored)." },
  { key: "rooms.category_count", value: 3, status: "verified", source: "SRC-CODE", public: true },
  { key: "amenities", value: amenities.map((item) => item.label), status: "verified", source: "SRC-CODE amenities.ts", public: true, notes: "Breakfast is supported by the menu's breakfast section; SRC-TRIP disagrees." },
  { key: "nearby.places", value: nearbyPlaces.map((place) => place.name), status: "verified", source: "SRC-CODE nearby.ts", public: true, notes: "Names only. No distances are published." },

  {
    key: "rooms.category_names",
    value: ["Deluxe Room", "Super Deluxe Room", "Premium Room"],
    status: "conflict",
    source: "SRC-CODE vs SRC-TA vs SRC-TRIP",
    public: false,
    notes: "Tripadvisor lists Superior Suites; Trip.com lists Superior. Hotel to confirm public names.",
  },
  {
    key: "rooms.inventory",
    value: { deluxe: 10, "super-deluxe": 10, premium: 9 },
    status: "placeholder",
    source: "SRC-CODE commerce.ts (development-only)",
    public: false,
    notes: "Not hotel-confirmed. SRC-TRIP shows 7/5/9. Operational inventory stays in the booking system.",
  },
  {
    key: "stay.check_in_out",
    value: { checkIn: "after 14:00", checkOut: "until 10:00" },
    status: "conflict",
    source: "SRC-TRIP",
    public: false,
    notes: "Only the conflicting Trip.com listing states times. Not published until the hotel confirms.",
  },
  {
    key: "positioning.lake_view",
    value: "Lake views from the property",
    status: "provisional",
    source: "Brand name; SRC-TA describes city-view balconies",
    public: false,
    notes: "NEEDS CONFIRMATION: which lake is visible and from which rooms or areas.",
  },
  { key: "languages", value: ["English", "Hindi"], status: "provisional", source: "SRC-TA", public: true },
  {
    key: "amenities.extra",
    value: ["Coffee shop", "Ironing service", "Self-serve laundry", "Housekeeping", "Balconies"],
    status: "provisional",
    source: "SRC-TA",
    public: true,
  },
  { key: "amenities.lift", value: true, status: "provisional", source: "SRC-TRIP", public: false },
  { key: "rooms.bathtub", value: true, status: "conflict", source: "SRC-TRIP only", public: false },
  { key: "policy.children_min_age", value: "Main guest 18+, children welcome", status: "conflict", source: "SRC-TRIP only", public: false },
  { key: "policy.smoking", value: "Non-smoking rooms", status: "provisional", source: "SRC-TA, SRC-TRIP", public: true },
  {
    key: "rating.google_snapshot",
    value: { rating: 5, reviewCount: 10, capturedOn: "2026-09-27" },
    status: "provisional",
    source: "SRC-REVIEWS snapshot",
    public: false,
    notes: "Dated snapshot. No aggregateRating structured data without a live, verifiable source.",
  },
  {
    key: "nearby.parks",
    value: ["Janeshwar Mishra Park", "Dr. Ram Manohar Lohia Park", "Ambedkar Memorial Park"],
    status: "provisional",
    source: "SRC-TA search summary",
    public: false,
  },
  { key: "restaurant.public_name", value: "Tejjora Restaurant", status: "placeholder", source: "SRC-CODE restaurant.ts", public: false, notes: "publicBrandNameConfirmed: false." },
];
