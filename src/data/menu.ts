/**
 * Hotel-issued "Room Menu" (SRC-MENU), transcribed in docs/TEJJORA_CONTENT_SOURCE_LEDGER.md §3.
 * VERIFIED source. Seeds the restaurant tables and is the read fallback when the database is
 * unavailable.
 *
 * - `sourceName` keeps the printed spelling wherever the display name was normalised
 *   (the hotel still has to approve the normalised spellings).
 * - `containsEgg` is derived only from the item name; no other dietary label is derived and the
 *   menu must not be described as vegetarian-only (it contains egg dishes).
 * - Half-portion prices are not printed, so none are set.
 * - `reviewNote` flags a printed value that needs owner confirmation; the value is kept as printed.
 */
export type MenuSourceItem = {
  id: string;
  name: string;
  sourceName?: string;
  description?: string;
  portion?: string;
  variants?: string[];
  priceFull: number;
  containsEgg?: boolean;
  reviewNote?: string;
};

export type MenuSourceCategory = {
  id: string;
  name: string;
  note?: string;
  items: MenuSourceItem[];
};

export const restaurantMenu: MenuSourceCategory[] = [
  {
    id: "beverages",
    name: "Beverages",
    items: [
      { id: "mineral-water", name: "Mineral Water", priceFull: 30 },
      { id: "cold-drink", name: "Cold Drink", priceFull: 60 },
      { id: "soda", name: "Soda", priceFull: 30 },
      { id: "fresh-lime", name: "Fresh Lime", variants: ["Water", "Soda"], description: "Sweet / Salted / Masala", priceFull: 70 },
      { id: "preserved-juice", name: "Preserved Juice", variants: ["Orange", "Mango", "Pineapple"], priceFull: 100, reviewNote: "Variant printed as \"Pinapple\"; normalised spelling needs hotel approval." },
      { id: "tea", name: "Tea", variants: ["Masala", "Ginger", "Black Tea", "Lemon Tea"], priceFull: 50 },
      { id: "ice-tea", name: "Ice Tea", priceFull: 60 },
      { id: "milk", name: "Milk", variants: ["Chocolate", "Plain"], priceFull: 80 },
      { id: "coffee", name: "Coffee", variants: ["Black", "Regular"], priceFull: 90 },
      { id: "cold-coffee", name: "Cold Coffee", variants: ["Plain", "With Ice cream"], priceFull: 100 },
      { id: "lassi", name: "Lassi", variants: ["Sweet", "Salted"], priceFull: 110 },
      { id: "vanilla-ice-cream-shake", name: "Vanilla Ice-Cream Shake", priceFull: 110 },
    ],
  },
  {
    id: "breakfast",
    name: "Breakfast",
    items: [
      { id: "boiled-egg", name: "Boiled Egg", portion: "2 pc", priceFull: 50, containsEgg: true },
      { id: "cheese-omelette", name: "Cheese Omelette", portion: "Two eggs", priceFull: 120, containsEgg: true },
      { id: "choice-of-paratha", name: "Choice of Paratha", portion: "2 pc", variants: ["Aloo", "Gobhi", "Mix", "Paneer"], description: "Served with yogurt & pickle", priceFull: 150 },
      { id: "poori-bhaji", name: "Poori Bhaji", portion: "4 pc", description: "Deep-fried whole-wheat bread served with spiced potato preparation, pickle and masala onion", priceFull: 150 },
      { id: "chola-bhatura", name: "Chola Bhatura", portion: "2 pc", description: "Punjabi-style spicy chickpea curry served with puffy Indian bread", priceFull: 120 },
      { id: "toasted-bread", name: "Toasted Bread", portion: "4 pc", variants: ["Butter", "Jam"], priceFull: 80 },
      { id: "egg-bhurji", name: "Egg Bhurji", priceFull: 120, containsEgg: true },
    ],
  },
  {
    id: "sandwich",
    name: "Sandwich",
    items: [
      { id: "cheese-sandwich", name: "Cheese Sandwich", priceFull: 150 },
      { id: "vegetables-sandwich", name: "Vegetables Sandwich", priceFull: 150 },
      { id: "vegetables-grilled-sandwich", name: "Vegetables Grilled Sandwich", priceFull: 150 },
      { id: "the-club-sandwich", name: "The Club Sandwich", priceFull: 170 },
    ],
  },
  {
    id: "soups",
    name: "Soups",
    note: "Printed under a \"Veg\" column; the menu prints no other soup column.",
    items: [
      { id: "cream-of-tomato", name: "Cream of Tomato", priceFull: 110 },
      { id: "cream-of-mushroom", name: "Cream of Mushroom", priceFull: 110 },
      { id: "sweet-corn", name: "Sweet Corn", priceFull: 110 },
      { id: "hot-n-sour", name: "Hot N Sour", priceFull: 110 },
      { id: "manchow", name: "Manchow", priceFull: 110 },
    ],
  },
  {
    id: "appetizers",
    name: "Appetizers",
    note: "The menu prints Half/Full columns but only one price per row, under Full. Half prices are not set.",
    items: [
      { id: "paneer-tikka", name: "Paneer Tikka", priceFull: 300 },
      { id: "hara-bhara-kabab", name: "Hara Bhara Kabab", sourceName: "Harab Bhara Kabab", priceFull: 280 },
      { id: "paneer-hariyali-tikka", name: "Paneer Hariyali Tikka", priceFull: 300 },
      { id: "mushroom-tikka", name: "Mushroom Tikka", sourceName: "Mashroom Tikka", priceFull: 350 },
      { id: "paneer-malai-tikka", name: "Paneer Malai Tikka", priceFull: 350 },
      { id: "french-fries", name: "French Fries", priceFull: 175 },
      { id: "potato-wedges", name: "Potato Wedges", priceFull: 100 },
      { id: "peanut-masala", name: "Peanut Masala", priceFull: 100 },
      { id: "fried-papad", name: "Fried Papad", priceFull: 80 },
      { id: "roasted-papad", name: "Roasted Papad", priceFull: 25 },
      { id: "papad-masala", name: "Papad Masala", priceFull: 40 },
      { id: "crispy-american-corn", name: "Crispy American Corn", priceFull: 175 },
      { id: "veg-spring-roll", name: "Veg Spring Roll", portion: "8 pc", priceFull: 180 },
      { id: "assorted-pakoda", name: "Assorted Pakoda", sourceName: "Asorted Pakoda", priceFull: 175 },
    ],
  },
  {
    id: "chinese-starters",
    name: "Chinese (Starters)",
    items: [
      { id: "veg-manchurian-dry", name: "Veg Manchurian (Dry)", priceFull: 160 },
      { id: "mushroom-chilli", name: "Mushroom Chilli", sourceName: "Mushroom Chilly", priceFull: 220 },
      { id: "crispy-vegetables-honey-chilli-potato", name: "Crispy Vegetables Honey Chilli Potato", sourceName: "Crispy Vegetables Honey Chilly Potato", priceFull: 180 },
      { id: "ginger-garlic-paneer-pepper", name: "Ginger Garlic Paneer Pepper", sourceName: "GingerGarlic Paneer Papper", priceFull: 230 },
      { id: "paneer-chilli-dry", name: "Paneer Chilli (Dry)", priceFull: 250 },
      { id: "paneer-65", name: "Paneer 65", priceFull: 250 },
      { id: "paneer-salted-pakoda", name: "Paneer", portion: "8 pc", variants: ["Salted", "Pakoda"], priceFull: 200 },
    ],
  },
  {
    id: "chinese-main-course",
    name: "Chinese Main Course",
    items: [
      { id: "mushroom-chilli-gravy", name: "Mushroom Chilli (Gravy)", priceFull: 300 },
      { id: "paneer-chilli-gravy", name: "Paneer Chilli (Gravy)", priceFull: 300 },
      { id: "vegetable-manchurian-gravy", name: "Vegetable Manchurian (Gravy)", priceFull: 300 },
      { id: "vegetable-noodles", name: "Vegetable Noodles", priceFull: 250 },
      {
        id: "paneer-noodles",
        name: "Paneer Noodles",
        priceFull: 200,
        reviewNote: "Printed at ₹200, lower than Vegetable Noodles (₹250). Kept as printed; owner to confirm.",
      },
      { id: "veg-fried-rice", name: "Veg Fried Rice", priceFull: 250 },
      { id: "paneer-fried-rice", name: "Paneer Fried Rice", priceFull: 280 },
      { id: "egg-fried-rice", name: "Egg Fried Rice", priceFull: 250, containsEgg: true },
    ],
  },
  {
    id: "indian-main-course",
    name: "Indian Main Course (Veg)",
    items: [
      { id: "paneer-butter-masala", name: "Paneer Butter Masala", priceFull: 280 },
      { id: "paneer-do-pyaza", name: "Paneer Do-Pyaza", priceFull: 280 },
      { id: "handi-paneer", name: "Handi Paneer", priceFull: 280 },
      { id: "kadhai-paneer", name: "Kadhai Paneer", priceFull: 300 },
      { id: "shahi-paneer", name: "Shahi Paneer", priceFull: 300 },
      { id: "paneer-bhurji", name: "Paneer Bhurji", priceFull: 300 },
      { id: "zeera-aloo", name: "Zeera Aloo", priceFull: 175 },
      { id: "aloo-gobhi", name: "Aloo Gobhi", priceFull: 180 },
      { id: "mix-vegetables", name: "Mix Vegetables", priceFull: 250 },
      { id: "vegetables-kofta", name: "Vegetables Kofta", priceFull: 250 },
      { id: "malai-kofta", name: "Malai Kofta", priceFull: 250 },
      { id: "dal-arhar-tadka", name: "Dal Arhar Tadka", priceFull: 160 },
      { id: "dal-makhani", name: "Dal Makhani", priceFull: 250 },
      { id: "dal-punjabi-tadka", name: "Dal Punjabi Tadka", priceFull: 300 },
      { id: "dal-fry", name: "Dal Fry", priceFull: 250 },
    ],
  },
  {
    id: "salad-and-raita",
    name: "Salad and Raita",
    items: [
      { id: "fresh-green-salad", name: "Fresh Green Salad", priceFull: 60 },
      { id: "plain-curd", name: "Plain Curd", priceFull: 70 },
      { id: "aloo-raita", name: "Aloo Raita", priceFull: 110 },
      { id: "mix-veg-raita", name: "Mix Veg Raita", priceFull: 110 },
      { id: "boondi-raita", name: "Boondi Raita", priceFull: 110 },
      { id: "pineapple-raita", name: "Pineapple Raita", priceFull: 110 },
    ],
  },
  {
    id: "indian-breads",
    name: "Indian Breads",
    items: [
      { id: "tawa-roti", name: "Tawa Roti", priceFull: 25 },
      { id: "butter-tawa-roti", name: "Butter Tawa Roti", priceFull: 30 },
      { id: "tawa-laccha-paratha", name: "Tawa Laccha Paratha", priceFull: 35 },
      { id: "naan", name: "Naan", priceFull: 40 },
      { id: "missi-roti", name: "Missi Roti", priceFull: 40 },
    ],
  },
  {
    id: "rice-and-biryani",
    name: "Rice and Biryani",
    items: [
      { id: "steamed-rice", name: "Steamed Rice", priceFull: 150 },
      { id: "zeera-rice", name: "Zeera Rice", priceFull: 175 },
      { id: "veg-pulao", name: "Veg Pulao", priceFull: 175 },
      { id: "veg-dum-biryani", name: "Veg Dum Biryani", priceFull: 280 },
      { id: "egg-biryani", name: "Egg Biryani", priceFull: 250, containsEgg: true },
    ],
  },
  {
    id: "desserts",
    name: "Desserts",
    items: [
      { id: "scoop-of-ice-cream", name: "Scoop of Ice-Cream", portion: "2 scoops", priceFull: 120 },
      { id: "hot-gulab-jamun", name: "Hot Gulab Jamun", portion: "2 pc", priceFull: 100 },
    ],
  },
];

/** Printed operating notes (VERIFIED). Unknown values stay null until the hotel confirms them. */
export const restaurantMenuSettings = {
  publicName: null,
  openingTime: null,
  prepMinutesMin: 30,
  prepMinutesMax: 40,
  serviceChargePct: 5,
  taxesNote: "Taxes as applicable",
  allergyNote: "Please inform us if you are Allergic to any of the ingredients.",
  noCancelNote: "Once the Order is Placed it can not be cancelled",
  priceChangeNote: "Prices and availability are subject to change without prior notice",
  serviceChargeNote: "Service charge of 5% is excluded of the rates",
  orderingEnabled: false,
  roomDeliveryEnabled: null,
} as const;
