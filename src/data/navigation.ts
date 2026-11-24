/** Desktop header links (≥1024 px). Book is a separate pill. */
export const primaryNavigation = [
  { label: "Stay", href: "/rooms" },
  { label: "Dine", href: "/dining" },
  { label: "Experience", href: "/experience" },
  { label: "Gallery", href: "/gallery" },
  { label: "360° Tour", href: "/virtual-tour" },
  { label: "Location", href: "/location" },
] as const;

export const utilityNavigation = [
  { label: "Plan your stay", href: "/plan-your-stay" },
  { label: "Manage booking", href: "/manage-booking" },
  { label: "Contact", href: "/contact" },
  { label: "Policies", href: "/policies" },
  { label: "Smart arrival", href: "/arrival" },
] as const;

/** Full menu (dock Menu on mobile, Menu circle on desktop), grouped by intent. Real pages only. */
export const menuGroups = [
  {
    title: "Stay",
    links: [
      { label: "Rooms", href: "/rooms" },
      { label: "Book a stay", href: "/book" },
      { label: "Plan your stay", href: "/plan-your-stay" },
      { label: "Manage booking", href: "/manage-booking" },
    ],
  },
  {
    title: "Dine",
    links: [
      { label: "Restaurant", href: "/dining" },
      { label: "The menu", href: "/dining/menu" },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "Experience", href: "/experience" },
      { label: "Gallery", href: "/gallery" },
      { label: "360° Tour", href: "/virtual-tour" },
      { label: "Location", href: "/location" },
    ],
  },
  {
    title: "Hotel",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Questions", href: "/faq" },
      { label: "Policies", href: "/policies" },
      { label: "Smart arrival", href: "/arrival" },
    ],
  },
] as const;
