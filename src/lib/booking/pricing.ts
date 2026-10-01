import { commerceConfig } from "@/data/commerce";
import type { BookingRequestPayload, PriceBreakdown } from "@/types/booking";

export function calculateNights(checkIn: string, checkOut: string) {
  const a = Date.parse(`${checkIn}T12:00:00Z`);
  const b = Date.parse(`${checkOut}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function calculateBookingPrice(
  input: BookingRequestPayload,
  amountPaid = 0,
  context?: { baseRate?: number; nightlyRates?: Array<{ date: string; rate: number }> },
): PriceBreakdown {
  const nights = calculateNights(input.stay.checkIn, input.stay.checkOut);
  if (nights < 1) throw new Error("Invalid stay dates.");

  const fallbackBaseRate = context?.baseRate ?? commerceConfig.roomRates[input.roomId];
  const nightlyRates = context?.nightlyRates?.length === nights
    ? context.nightlyRates
    : Array.from({ length: nights }, (_, index) => {
        const date = new Date(`${input.stay.checkIn}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + index);
        return { date: date.toISOString().slice(0, 10), rate: fallbackBaseRate };
      });
  const baseRate = nightlyRates[0]?.rate ?? fallbackBaseRate;
  const plan = commerceConfig.ratePlans.find((item) => item.id === input.ratePlanId);
  if (!plan) throw new Error("Unknown rate plan.");
  if (!plan.onlineBookable) throw new Error("Selected rate plan is not configured for online booking.");

  const roomSubtotal = nightlyRates.reduce((sum, item) => sum + item.rate * input.stay.rooms, 0);
  const rateAdjustment = plan.adjustmentType === "fixed"
    ? Number(plan.adjustmentValue ?? 0) * nights * input.stay.rooms
    : 0;

  let extrasTotal = 0;
  let hasUnconfiguredCharges = false;
  for (const addonId of input.addonIds) {
    const addon = commerceConfig.addons.find((item) => item.id === addonId);
    if (!addon) throw new Error(`Unknown add-on: ${addonId}`);
    if (addon.amount == null || !addon.onlineBookable) {
      hasUnconfiguredCharges = true;
      continue;
    }
    if (addon.chargeMode === "per-stay") extrasTotal += addon.amount;
    if (addon.chargeMode === "per-night") extrasTotal += addon.amount * nights;
    if (addon.chargeMode === "per-room-night") extrasTotal += addon.amount * nights * input.stay.rooms;
  }

  const includedAdults = commerceConfig.pricing.includedAdultsPerRoom;
  const configuredExtraAdultCharge = commerceConfig.pricing.extraAdultCharge;
  const extraAdults = includedAdults != null && configuredExtraAdultCharge != null
    ? Math.max(0, input.stay.adults - includedAdults * input.stay.rooms)
    : 0;
  const extraGuestCharge = configuredExtraAdultCharge != null ? extraAdults * configuredExtraAdultCharge * nights : 0;
  const configuredChildCharge = commerceConfig.pricing.childCharge;
  const childrenCharge = configuredChildCharge != null ? input.stay.children * configuredChildCharge * nights : 0;
  const subtotalBeforeDiscount = roomSubtotal + rateAdjustment + extraGuestCharge + childrenCharge + extrasTotal;

  let discount = 0;
  if (input.promoCode) {
    const code = input.promoCode.trim().toUpperCase();
    const promo = commerceConfig.promoRules.find((item) => item.code === code && item.enabled);
    const activeForStay = promo
      && (!promo.startDate || input.stay.checkIn >= promo.startDate)
      && (!promo.endDate || input.stay.checkIn <= promo.endDate)
      && (!promo.minNights || nights >= promo.minNights);
    if (!promo || !activeForStay) throw new Error("Promotional code is invalid or not active for this stay.");
    discount = promo.type === "percent"
      ? Math.round(subtotalBeforeDiscount * promo.value / 100)
      : Math.round(promo.value);
    discount = Math.min(Math.max(0, discount), subtotalBeforeDiscount);
  }

  const taxable = Math.max(0, subtotalBeforeDiscount - discount);
  const tax = commerceConfig.pricing.taxConfigured ? Math.round(taxable * commerceConfig.pricing.taxRateBps / 10_000) : 0;
  const serviceCharge = commerceConfig.pricing.serviceChargeConfigured ? Math.round(taxable * commerceConfig.pricing.serviceChargeBps / 10_000) : 0;
  const grandTotal = taxable + tax + serviceCharge;

  return {
    currency: "INR",
    nights,
    baseRatePerRoomNight: baseRate,
    nightlyRates,
    roomSubtotal,
    rateAdjustment,
    extraGuestCharge,
    childrenCharge,
    extrasTotal,
    discount,
    tax,
    serviceCharge,
    grandTotal,
    amountPaid,
    amountDue: Math.max(0, grandTotal - amountPaid),
    hasUnconfiguredCharges,
  };
}
