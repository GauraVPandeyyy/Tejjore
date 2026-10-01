"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hotel } from "@/data/hotel";
import { primaryNavigation, utilityNavigation } from "@/data/navigation";
import { Container } from "@/components/shared/Container";

export function SiteFooter() {
  const pathname=usePathname(); const publicEmail=process.env.NEXT_PUBLIC_HOTEL_EMAIL?.trim(); if(pathname.startsWith("/admin")) return null;
  return <footer className="site-footer site-footer--v2"><Container><div className="site-footer__waterline" aria-hidden="true"/><div className="site-footer-v2__lead"><div><Image src="/brand/tejjora-logo.png" alt="Tejjora Lake View — A Boutique Hotel" width={1686} height={2048} sizes="(max-width:760px) 120px, 150px"/></div><div><span className="micro">DIRECT RESERVATIONS</span><h2>Stay in Lucknow.<br/><em>Come back to calm.</em></h2><Link href="/book">Check availability ↗</Link></div></div><div className="site-footer-v2__grid"><div><span className="micro">FIND US</span><address>{hotel.address.line1}<br/>{hotel.address.locality}, {hotel.address.city}<br/>{hotel.address.state} {hotel.address.postalCode}</address><Link href="/location">Map & directions ↗</Link></div><nav aria-label="Footer stay navigation"><span className="micro">STAY</span>{primaryNavigation.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav><nav aria-label="Footer utility navigation"><span className="micro">EXPLORE</span>{utilityNavigation.slice(0,5).map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav><div><span className="micro">CONTACT</span><a href={`tel:${hotel.phoneE164}`}>{hotel.phoneDisplay}</a><a href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer">WhatsApp ↗</a>{publicEmail ? <a href={`mailto:${publicEmail}`}>{publicEmail}</a> : null}<Link href="/contact">Contact & FAQ ↗</Link><Link href="/manage-booking">Manage booking ↗</Link></div></div><div className="site-footer__bottom"><span>© {new Date().getFullYear()} Tejjora Lake View</span><div><Link href="/policies">Hotel policies</Link><Link href="/contact">Contact</Link><span>Gomti Nagar · Lucknow</span></div></div></Container></footer>;
}
