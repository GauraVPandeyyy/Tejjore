import type { RoomId } from "@/types/hotel";

export type ChargeMode = "per-stay" | "per-night" | "per-room-night";
export type PromoRule = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  enabled: boolean;
  startDate?: string;
  endDate?: string;
  minNights?: number;
};

type RatePlanOverride = { id: string; adjustmentValue?: number; onlineBookable?: boolean; description?: string };
type AddonOverride = { id: string; amount?: number; onlineBookable?: boolean };

function parseNumber(raw: string | undefined, fallback: number | null) {
  if (raw == null || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonArray<T>(raw: string | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

const extraAdultCharge = parseNumber(process.env.NEXT_PUBLIC_EXTRA_ADULT_CHARGE, null);
const includedAdultsPerRoom = parseNumber(process.env.NEXT_PUBLIC_INCLUDED_ADULTS_PER_ROOM, null);
const childCharge = parseNumber(process.env.NEXT_PUBLIC_CHILD_CHARGE, null);
const taxRateBps = parseNumber(process.env.NEXT_PUBLIC_TAX_RATE_BPS, 0) ?? 0;
const serviceChargeBps = parseNumber(process.env.NEXT_PUBLIC_SERVICE_CHARGE_BPS, 0) ?? 0;
const taxConfigured = process.env.NEXT_PUBLIC_TAX_CONFIGURED === "true";
const serviceChargeConfigured = process.env.NEXT_PUBLIC_SERVICE_CHARGE_CONFIGURED === "true";
const ratePlanOverrides = parseJsonArray<RatePlanOverride>(process.env.NEXT_PUBLIC_RATE_PLAN_CONFIG_JSON);
const addonOverrides = parseJsonArray<AddonOverride>(process.env.NEXT_PUBLIC_ADDON_CONFIG_JSON);
const promoRulesRaw = parseJsonArray<PromoRule>(process.env.NEXT_PUBLIC_PROMO_CODES_JSON);

const baseRatePlans = [
  {
    id: "room-only",
    label: "Room Only",
    description: "Base room rate without a configured meal inclusion.",
    adjustmentType: "fixed" as const,
    adjustmentValue: 0,
    onlineBookable: true,
  },
  {
    id: "breakfast",
    label: "Breakfast Included",
    description: "Available after the hotel configures the official breakfast supplement.",
    adjustmentType: "fixed" as const,
    adjustmentValue: null as number | null,
    onlineBookable: false,
  },
  {
    id: "flexible",
    label: "Flexible",
    description: "Available after the hotel configures its official flexible-rate terms.",
    adjustmentType: "fixed" as const,
    adjustmentValue: null as number | null,
    onlineBookable: false,
  },
  {
    id: "non-refundable",
    label: "Non-refundable",
    description: "Available after the hotel configures its official non-refundable terms.",
    adjustmentType: "fixed" as const,
    adjustmentValue: null as number | null,
    onlineBookable: false,
  },
];

const baseAddons = [
  { id: "breakfast", label: "Breakfast", chargeMode: "per-room-night" as ChargeMode, amount: null as number | null, onlineBookable: false },
  { id: "airport-pickup", label: "Airport Pickup", chargeMode: "per-stay" as ChargeMode, amount: null as number | null, onlineBookable: false },
  { id: "extra-bed", label: "Extra Bed", chargeMode: "per-night" as ChargeMode, amount: null as number | null, onlineBookable: false },
  { id: "early-checkin", label: "Early Check-in", chargeMode: "per-stay" as ChargeMode, amount: null as number | null, onlineBookable: false },
  { id: "late-checkout", label: "Late Checkout", chargeMode: "per-stay" as ChargeMode, amount: null as number | null, onlineBookable: false },
  { id: "decoration", label: "Special Decoration", chargeMode: "per-stay" as ChargeMode, amount: null as number | null, onlineBookable: false },
  { id: "meal-package", label: "Meal Package", chargeMode: "per-room-night" as ChargeMode, amount: null as number | null, onlineBookable: false },
];

const ratePlans = baseRatePlans.map((plan) => {
  const override = ratePlanOverrides.find((item) => item && item.id === plan.id);
  const adjustmentValue = override && Number.isFinite(override.adjustmentValue) && Number(override.adjustmentValue) >= 0
    ? Math.round(Number(override.adjustmentValue))
    : plan.adjustmentValue;
  const onlineBookable = plan.id === "room-only"
    ? true
    : Boolean(override?.onlineBookable && adjustmentValue != null);
  return {
    ...plan,
    adjustmentValue,
    onlineBookable,
    description: typeof override?.description === "string" && override.description.trim()
      ? override.description.trim().slice(0, 240)
      : plan.description,
  };
});

const addons = baseAddons.map((addon) => {
  const override = addonOverrides.find((item) => item && item.id === addon.id);
  const amount = override && Number.isFinite(override.amount) && Number(override.amount) >= 0
    ? Math.round(Number(override.amount))
    : addon.amount;
  return { ...addon, amount, onlineBookable: Boolean(override?.onlineBookable && amount != null) };
});

const promoRules: PromoRule[] = promoRulesRaw.flatMap((rule) => {
  if (!rule || typeof rule.code !== "string" || !rule.code.trim()) return [];
  if (rule.type !== "percent" && rule.type !== "fixed") return [];
  const value = Number(rule.value);
  if (!Number.isFinite(value) || value <= 0 || (rule.type === "percent" && value > 100)) return [];
  const minNights = rule.minNights == null ? undefined : Math.max(1, Math.round(Number(rule.minNights)));
  return [{
    code: rule.code.trim().toUpperCase().slice(0, 64),
    type: rule.type,
    value,
    enabled: rule.enabled === true,
    ...(typeof rule.startDate === "string" ? { startDate: rule.startDate } : {}),
    ...(typeof rule.endDate === "string" ? { endDate: rule.endDate } : {}),
    ...(Number.isFinite(minNights) ? { minNights } : {}),
  }];
});

export const commerceConfig = {
  currency: "INR",
  currencySymbol: "₹",
  /**
   * Stage 12 room base rates supplied by the hotel team. Inventory split, taxes,
   * optional-charge prices, rate-plan adjustments and promo rules remain disabled
   * until explicitly configured with approved business values.
   */
  roomRates: {
    deluxe: 2000,
    "super-deluxe": 2500,
    premium: 3500,
  } satisfies Record<RoomId, number>,
  ratePlans,
  addons,
  promoRules,
  pricing: {
    extraAdultCharge: extraAdultCharge != null && extraAdultCharge >= 0 ? Math.round(extraAdultCharge) : null,
    includedAdultsPerRoom: includedAdultsPerRoom != null && includedAdultsPerRoom >= 1 ? Math.round(includedAdultsPerRoom) : null,
    childCharge: childCharge != null && childCharge >= 0 ? Math.round(childCharge) : null,
    taxRateBps: Math.max(0, Math.round(taxRateBps)),
    serviceChargeBps: Math.max(0, Math.round(serviceChargeBps)),
    taxConfigured,
    serviceChargeConfigured,
  },
  /** Development-only category split; replace with actual category counts before production sales. */
  developmentInventory: {
    deluxe: 10,
    "super-deluxe": 10,
    premium: 9,
  } satisfies Record<RoomId, number>,
  holdMinutes: 15,
} as const;

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: commerceConfig.currency,
    maximumFractionDigits: 0,
  }).format(value);
}
