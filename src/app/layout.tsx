import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { SiteShell } from "@/components/layout/SiteShell";
import "./globals.css";
import "./redesign.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tejjora Lake View | Gomti Nagar, Lucknow",
    template: "%s | Tejjora Lake View",
  },
  description:
    "Tejjora Lake View — a contemporary boutique stay in Gomti Nagar, Lucknow with rooms, dining, direct booking and a lake-led terrace experience.",
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
  themeColor: "#002E36",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${manrope.variable}`}
    >
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
