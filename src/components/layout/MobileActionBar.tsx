"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hotel } from "@/data/hotel";

const whatsappMessage = encodeURIComponent(
  "Hello Tejjora Lake View, I would like to enquire about a stay."
);

export function MobileActionBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className="mobile-action-bar" aria-label="Quick hotel actions">
      <a href={`tel:${hotel.phoneE164}`}>Call</a>
      <a href={`https://wa.me/${hotel.whatsappE164}?text=${whatsappMessage}`} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <Link href="/book">Check dates</Link>
    </nav>
  );
}
