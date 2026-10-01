import { assets } from "./assets";

/** Public dining story uses only property-supported information. */
export const diningStory = {
  kicker: "The table at Tejjora",
  title: "A restaurant with a life beyond room service.",
  intro: "Tejjora's dining room is designed to work for both resident guests and people coming in simply to meet, eat and spend time around the table.",
  ambience: "Warm, contemporary and easy-going — suited to breakfast, an informal meeting or an unhurried dinner.",
  image: assets.restaurant[0],
  gallery: assets.restaurant,
} as const;
