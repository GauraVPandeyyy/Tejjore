import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Manrope } from "next/font/google";
import { SiteShell } from "@/components/layout/SiteShell";
import { siteUrl } from "@/lib/site";
import "./globals.css";
import "./tejjora.css";
import "./tejjora-experience.css";
import "./tejjora-concierge.css";
import "./tejjora-stay.css";
import "./tejjora-motion.css";
import "./tejjora-rooms-dining.css";
import "./tejjora-dining.css";
import "./tejjora-home.css";
import "./tejjora-gallery.css";
import "./tejjora-location.css";
import "./tejjora-plan.css";
import "./tejjora-book.css";

// Phase 4 type system: Cormorant Garamond 300/400 for display, Manrope for body and UI,
// Cinzel only for small eyebrows (masterplan §2.2).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-cinzel",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Tejjora Lake View | Gomti Nagar, Lucknow",
    template: "%s | Tejjora Lake View",
  },
  description:
    "Tejjora Lake View — a contemporary boutique hotel in Gomti Nagar, Lucknow, with rooms, a restaurant and direct booking.",
  openGraph: {
    type: "website",
    siteName: "Tejjora Lake View",
    title: "Tejjora Lake View | Gomti Nagar, Lucknow",
    description: "Rooms, dining and direct booking in Gomti Nagar, Lucknow.",
    images: [
      {
        url: "/images/exterior/tejjora-exterior-blue-sky-01.webp",
        width: 1200,
        height: 800,
        alt: "Tejjora Lake View in Gomti Nagar, Lucknow",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#022D36",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${manrope.variable} ${cinzel.variable}`}>
      <body>
        {/* Without JavaScript, reveal-on-scroll content must never stay hidden. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
