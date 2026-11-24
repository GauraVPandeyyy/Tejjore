export type ConciergeMessage = {
  role: "user" | "assistant";
  content: string;
  /** The intent of an earlier assistant answer, echoed by the client to steer follow-ups between safe answers. */
  intent?: string;
};

export type ConciergeAction = {
  label: string;
  href: string;
  external?: boolean;
};

/**
 * Structured, grounded results the chat renders as rich cards. Every value is read from the
 * booking engine or published content at answer time; nothing here is free text from a model.
 */
export type ConciergeRoomItem = {
  id: string;
  name: string;
  href: string;
  bookHref: string;
  image: string | null;
  summary: string;
  /** Rate-card "from" price (lib/booking/rateCard.ts); null when rates cannot be read. */
  fromRate: number | null;
  rateNote: string | null;
};

export type ConciergeCard =
  | { kind: "rooms"; title: string; rooms: ConciergeRoomItem[] }
  | {
      kind: "rates";
      title: string;
      rooms: Array<{ id: string; name: string; href: string; fromRate: number; standardRate: number; tonightRate: number; note: string | null }>;
    }
  | {
      kind: "availability";
      checkIn: string;
      checkOut: string;
      nights: number;
      preview: boolean;
      rooms: Array<{ id: string; name: string; available: number; stayTotal: number; averageRate: number; bookHref: string }>;
    }
  | {
      kind: "menu";
      orderingEnabled: boolean;
      notes: string[];
      sections: Array<{ name: string; count: number; fromPrice: number | null; href: string }>;
    }
  | {
      kind: "dishes";
      query: string;
      dishes: Array<{ name: string; section: string; price: number; halfPrice: number | null; containsEgg: boolean; available: boolean; href: string }>;
    }
  | { kind: "places"; places: Array<{ name: string; category: string; href: string }> }
  | { kind: "offers"; offers: Array<{ title: string; summary: string | null; validTo: string | null; href: string }> }
  | { kind: "contact"; phoneDisplay: string; phoneHref: string; whatsappHref: string; address: string; mapsHref: string }
  | {
      kind: "quote";
      roomName: string;
      checkIn: string;
      checkOut: string;
      nights: number;
      nightly: Array<{ date: string; rate: number }>;
      lines: Array<{ label: string; amount: number }>;
      total: number;
      /** Inventory is test data: the price is live, availability is not confirmed. */
      preview: boolean;
      bookHref: string;
      note: string;
    }
  | { kind: "feature"; eyebrow: string; title: string; body: string; href: string; image: string; cta: string };

export type ConciergeReply = ConciergeMessage & {
  intent: string;
  actions?: ConciergeAction[];
  cards?: ConciergeCard[];
  dataSource?: "live-operations" | "hotel-knowledge";
  asOf?: string;
  /** "ai" when Gemini composed the wording from tool results; "rules" for the deterministic grounded answer. */
  engine?: "ai" | "rules";
};

export interface ConciergeProvider {
  reply(messages: ConciergeMessage[]): Promise<ConciergeReply>;
}

export interface ConciergeLanguageLayer {
  rewrite(reply: ConciergeReply, messages: ConciergeMessage[]): Promise<ConciergeReply>;
}
