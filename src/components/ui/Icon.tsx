/** Tejjora UI icon set: hairline strokes, drawn for this site. Decorative unless labelled by the parent. */
export type IconName = "arrow-left" | "arrow-right" | "arrow-up-right" | "menu" | "close" | "calendar" | "spark" | "phone" | "whatsapp" | "plus" | "minus" | "search" | "expand" | "chat" | "wifi" | "parking" | "clock" | "tray" | "dish" | "sun" | "moon" | "snow" | "screen" | "desk" | "bath" | "pin" | "compass" | "camera" | "orbit" | "bed" | "key" | "shield" | "drag";

const paths: Record<IconName, React.ReactNode> = {
  "arrow-left": <path d="M19 12H5m6-6-6 6 6 6" />,
  "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M9 7h8v8" />,
  menu: <path d="M4 9h16M4 15h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="1.5" />
      <path d="M8 3v5m8-5v5M3.5 10.5h17" />
    </>
  ),
  spark: <path d="M12 3c.8 4.6 3.4 7.2 9 9-5.6 1.8-8.2 4.4-9 9-.8-4.6-3.4-7.2-9-9 5.6-1.8 8.2-4.4 9-9Z" />,
  phone: <path d="M6.6 3.8 9 3.5l1.6 4.2-2 1.4a12 12 0 0 0 6.3 6.3l1.4-2 4.2 1.6-.3 2.4A2.4 2.4 0 0 1 17.8 20 15.8 15.8 0 0 1 4 6.2 2.4 2.4 0 0 1 6.6 3.8Z" />,
  whatsapp: (
    <>
      <path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.6 19l-4.1.5Z" />
      <path d="M9.2 8.6c.3 2.7 2.4 5 5.2 5.6l1.1-1.2-1.6-.9-.7.7a4 4 0 0 1-2.2-2.2l.7-.7-.9-1.6-1.6.3Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  chat: <path d="M4 5.5h16v10H9.5L5 19.5v-4H4z" />,
  wifi: <path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.6a7.5 7.5 0 0 1 11 0M9.5 15.6a3.2 3.2 0 0 1 5 0M12 19h.01" />,
  parking: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M10 16.5v-9h3a2.6 2.6 0 0 1 0 5.2h-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  tray: <path d="M3.5 17.5h17M5 17.5a7 7 0 0 1 14 0M12 8.5V7m-1.5 0h3" />,
  dish: <path d="M7 3.5v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-7M9 12.5v8M16.5 20.5v-17c-2 1.3-3 3.6-3 7v2.5h3" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2m0 15v2M2.5 12h2m15 0h2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />,
  screen: (
    <>
      <rect x="3" y="5" width="18" height="11.5" rx="1" />
      <path d="M9 20h6M12 16.5V20" />
    </>
  ),
  desk: <path d="M3 9h18M5 9v10.5M19 9v10.5M14 9v5h5M7.5 9V6.5h3V9" />,
  bath: <path d="M3.5 12h17v2.5a4.5 4.5 0 0 1-4.5 4.5H8a4.5 4.5 0 0 1-4.5-4.5V12ZM6 12V6a2 2 0 0 1 3.7-1M7 19l-1 2m11-2 1 2" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" />
    </>
  ),
  camera: (
    <>
      <path d="M3.5 8h4l1.5-2.5h6L16.5 8h4v11h-17Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  orbit: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="4" />
      <path d="M12 3a4 9 0 0 1 0 18M12 3a4 9 0 0 0 0 18" />
    </>
  ),
  bed: <path d="M3 18.5V6m0 7h18v5.5M21 13v-1.5a3 3 0 0 0-3-3h-7V13M6.5 11.5h.01" />,
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2" />
    </>
  ),
  shield: <path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6l-7-2.5ZM9 12l2.2 2.2L15.5 10" />,
  drag: <path d="M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />,
};

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {paths[name]}
    </svg>
  );
}
