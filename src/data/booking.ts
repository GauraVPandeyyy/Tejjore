import { commerceConfig } from "./commerce";

export const bookingConfig = {
  mode: "commerce" as const,
  availabilityCopy: "Choose dates to see the current website inventory and configured room rate.",
  ratePlans: commerceConfig.ratePlans.map((plan) => ({
    ...plan,
    priceDelta: plan.adjustmentValue,
  })),
  addons: commerceConfig.addons.map((addon) => ({
    ...addon,
    description: addon.onlineBookable
      ? "Add this option to your stay."
      : "This option requires hotel confirmation because its official price is not configured yet.",
    price: addon.amount,
  })),
} as const;
