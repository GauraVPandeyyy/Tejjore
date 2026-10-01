import Image from "next/image";
import Link from "next/link";
import { offers } from "@/data/offers";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function OffersPage() {
  return <>
    <section className="v2-page-hero v2-page-hero--simple"><div className="site-container"><SectionLabel index="01">OFFERS</SectionLabel><h1>Stay plans built around<br /><em>the way you travel.</em></h1><p>Flexible stay ideas for weekends, working trips and celebrations — designed as an easy starting point for a more considered stay.</p></div></section>
    <section className="v2-offers-page"><div className="site-container">{offers.map((offer,index)=><article key={offer.id} className="v2-offers-page__item"><figure><Image src={offer.image} alt="" fill sizes="(max-width:820px) 100vw, 52vw" /></figure><div><span className="micro">{String(index+1).padStart(2,"0")} / {offer.label}</span><h2>{offer.title}</h2><p>{offer.copy}</p><ul>{offer.inclusions.map(item=><li key={item}>{item}</li>)}</ul><small>Final inclusions, dates and pricing are confirmed directly by the hotel.</small><div className="v2-page-actions"><Link href="/book">Check dates ↗</Link><Link href="/contact">Ask the hotel ↗</Link></div></div></article>)}</div></section>
  </>;
}
