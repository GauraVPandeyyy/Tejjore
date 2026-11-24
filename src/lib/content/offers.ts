import "server-only";
import { offerRows } from "./catalog";
import { isActiveOffer } from "./rules";
import type { OfferRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, Offer } from "./types";
import { bool, mapRows, oneOf, optionalIsoDate, optionalNumber, optionalText, stringArray, text } from "./validate";

function mapOffer(row: OfferRow): Offer {
  return {
    id: text(row, "id", 200),
    slug: text(row, "slug", 120),
    title: text(row, "title", 160),
    summary: optionalText(row, "summary", 800),
    terms: optionalText(row, "terms", 4000),
    validFrom: optionalIsoDate(row, "valid_from"),
    validTo: optionalIsoDate(row, "valid_to"),
    roomIds: stringArray(row, "room_ids", 10),
    adjustmentType: row.adjustment_type === null ? null : oneOf(row, "adjustment_type", ["percent", "fixed"] as const),
    adjustmentValue: optionalNumber(row, "adjustment_value", 0),
    promoCode: optionalText(row, "promo_code", 32),
    isDemo: bool(row, "is_demo"),
    published: bool(row, "published"),
  };
}

const OFFER_SELECT = `SELECT id, slug, title, summary, terms,
    to_char(valid_from, 'YYYY-MM-DD') AS valid_from, to_char(valid_to, 'YYYY-MM-DD') AS valid_to,
    room_ids, adjustment_type, adjustment_value, promo_code, is_demo, sort_order, published
  FROM offers`;

/**
 * Offers a guest may see today: published, not demo, inside the validity window (India date).
 * The cache holds published rows; the date window is applied per request so an offer appears
 * and expires on time. Display only: the booking pricing engine stays the price authority.
 */
export async function getActiveOffers(options: ReadOptions = {}): Promise<ContentResult<Offer[]>> {
  const now = options.now ?? new Date();
  const result = await readContent(
    {
      domain: "offers",
      key: "offers:published",
      load: async (db) =>
        mapRows("offers", (await db.query<OfferRow>(`${OFFER_SELECT} WHERE published AND NOT is_demo ORDER BY sort_order, slug`)).rows, mapOffer),
      fallback: () => mapRows("offers", offerRows(), mapOffer),
    },
    options,
  );
  return { data: result.data.filter((offer) => isActiveOffer(offer, now)), source: result.source };
}
