"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hotel } from "@/data/hotel";
import { menuGroups } from "@/data/navigation";
import { Icon } from "@/components/ui/Icon";
import { Waterline } from "@/components/ui/Waterline";

/**
 * Lake footer with the waterline returning in the background (the motif opens and closes the
 * page). Three zones from 1024 px — the brand with Call / WhatsApp / Book, the address and
 * contact, and the site map — over one quiet legal line; a compact centred stack on phones.
 * Only verified details: the ledger-verified address and phone (also WhatsApp). No social
 * profiles, newsletter or badges, because none are verified; an email appears only when the
 * owner configures NEXT_PUBLIC_HOTEL_EMAIL.
 */
export function SiteFooter() {
  const pathname = usePathname();
  const publicEmail = process.env.NEXT_PUBLIC_HOTEL_EMAIL?.trim();
  if (pathname.startsWith("/admin")) return null;
  const year = new Date().getFullYear();

  return (
    <footer className="tj-footer" data-header-tone="dark">
      <Waterline variant="footer" className="tj-footer__waterline" />
      <div className="tj-container tj-footer__inner">
        <div className="tj-footer__brand">
          <Link href="/" className="tj-footer__logo" aria-label="Tejjora Lake View home">
            <Image src="/brand/tejjora-logo.png" alt="Tejjora Lake View — A Boutique Hotel" width={1686} height={2048} sizes="96px" />
          </Link>
          <p className="tj-footer__tagline">A boutique hotel in Gomti Nagar, Lucknow.</p>
          <div className="tj-footer__actions">
            <a className="tj-pill tj-pill--outline-light tj-pill--small" href={`tel:${hotel.phoneE164}`}>
              <Icon name="phone" size={16} />
              <span>Call</span>
            </a>
            <a className="tj-pill tj-pill--outline-light tj-pill--small" href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" size={16} />
              <span>WhatsApp</span>
            </a>
            <Link className="tj-pill tj-pill--cream tj-pill--small" href="/book">
              <span>Book</span>
              <span className="tj-pill__dot" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="tj-footer__nap">
          <section aria-labelledby="footer-address">
            <h2 id="footer-address" className="tj-footer__title">
              Address
            </h2>
            <address>
              {hotel.address.line1}
              <br />
              {hotel.address.locality}, {hotel.address.city}
              <br />
              {hotel.address.state} {hotel.address.postalCode}
            </address>
            <Link className="tj-footer__link" href="/location">
              Map & directions
            </Link>
          </section>
          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="tj-footer__title">
              Contact
            </h2>
            <p>
              <a className="tj-footer__link" href={`tel:${hotel.phoneE164}`}>
                {hotel.phoneDisplay}
              </a>
            </p>
            {publicEmail ? (
              <p>
                <a className="tj-footer__link" href={`mailto:${publicEmail}`}>
                  {publicEmail}
                </a>
              </p>
            ) : null}
            <p className="tj-footer__note">Front desk open 24 hours.</p>
          </section>
        </div>

        <nav className="tj-footer__nav" aria-label="Footer">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <h2 className="tj-eyebrow">{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="tj-footer__legal">
          <span>© {year} Tejjora Lake View · Gomti Nagar, Lucknow</span>
          <Link href="/policies">Policies</Link>
          <span>
            Managed and developed by{" "}
            <a href="https://praibadvisors.com/" target="_blank" rel="noreferrer">
              PRAIB Advisors
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
