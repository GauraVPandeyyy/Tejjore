import { assets } from "./assets";

export const restaurant = {
  name: "Tejjora Restaurant",
  publicBrandNameConfirmed: false,
  positioning: "From first coffee to last table.",
  servesBreakfast: true,
  vegetarianBreakfastAvailable: true,
  timings: null,
  menuUrl: null,
  phone: null,
  images: [...assets.restaurant],
  foodImages: [assets.food.breakfastHero, assets.food.dinnerHero],
} as const;
