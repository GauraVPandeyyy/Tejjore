import Image from "next/image";
import Link from "next/link";
import { localExperiences } from "@/data/localExperiences";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function LocalExperiences({ index="03" }: { index?:string }) {
  return <section className="v2-local-experiences" aria-labelledby="local-experiences-title"><div className="site-container"><div className="v2-section-head v2-section-head--split"><div><SectionLabel index={index}>WAYS TO SPEND THE STAY</SectionLabel><h2 id="local-experiences-title">Not an itinerary.<br/><em>A set of good directions.</em></h2></div><p>These are editorial trip ideas, not packaged hotel inclusions. Use them to shape a Lucknow stay around work, food, family time or a slower weekend.</p></div><div className="v2-local-experiences__grid">{localExperiences.map((item,index)=><article key={item.id} data-index={index}><figure><Image src={item.image} alt="" fill sizes="(max-width:760px) 100vw, 33vw"/></figure><div><small>{item.label}</small><h3>{item.title}</h3><p>{item.copy}</p><Link href={item.href}>{item.cta} ↗</Link></div></article>)}</div></div></section>;
}
