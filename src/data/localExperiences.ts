import { assets } from "./assets";

/** DEMO EXPERIENCE CONTENT: editorial suggestions, not hotel-operated inclusions. */
export const localExperiences = [
  { id:"business", label:"Business", title:"Keep Gomti Nagar within easy reach.", copy:"Use Tejjora as a quieter base around meetings, exhibitions and work across the Gomti Nagar business district.", image:assets.hero.alternateImages[0], cta:"Explore location", href:"/location" },
  { id:"culture", label:"Culture", title:"Make room for Lucknow beyond the itinerary.", copy:"Build a day around the city's architecture, food, craft and heritage, then return to a calmer evening at the hotel.", image:assets.lobby[2], cta:"Plan your stay", href:"/plan-your-stay" },
  { id:"shopping", label:"Shopping", title:"An easy afternoon when you want one.", copy:"Singapore Mall and other Gomti Nagar retail destinations can be opened directly in live Maps from the Location page.", image:assets.rooms.superDeluxe[0], cta:"See nearby places", href:"/location" },
  { id:"dining", label:"Food", title:"Start downstairs. Wander further if you feel like it.", copy:"Tejjora's own restaurant keeps breakfast and an easy meal close, while Lucknow's wider food culture stays part of the trip.", image:assets.restaurant[4], cta:"Explore dining", href:"/dining" },
  { id:"weekend", label:"Weekend", title:"Leave one part of the day unplanned.", copy:"A short stay works better when every hour is not scheduled. Use the terrace, the room and the city as a flexible rhythm rather than a checklist.", image:assets.rooms.premium[2], cta:"Explore experiences", href:"/experience" },
  { id:"family", label:"Family", title:"Plan fewer transfers, not more activities.", copy:"Parking, on-site dining and direct hotel support can simplify a family visit while live routes handle the places you want to see.", image:assets.rooms.deluxe[2], cta:"Plan a family stay", href:"/plan-your-stay" },
] as const;
