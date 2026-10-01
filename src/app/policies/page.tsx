import type { Metadata } from "next";
import { hotelPolicies } from "@/data/policies";
import { SectionLabel } from "@/components/shared/SectionLabel";

export const metadata: Metadata = {
  title: "Hotel Policies | Tejjora Lake View",
  description: "Current booking and stay policy information for Tejjora Lake View.",
  alternates: { canonical: "/policies" },
};

export default function PoliciesPage(){return <main className="policies-page"><section className="v2-page-hero v2-page-hero--simple"><div className="site-container"><SectionLabel index="01">POLICIES</SectionLabel><h1>Clear rules make<br/><em>a better stay.</em></h1><p>Practical information for planning your arrival, booking changes and special requests. Your confirmed rate plan remains the final source for reservation-specific terms.</p></div></section><section className="v2-policies"><div className="site-container">{hotelPolicies.map((item,index)=><article key={item.title}><span>{String(index+1).padStart(2,"0")}</span><h2>{item.title}</h2><p>{item.body}</p></article>)}</div></section></main>}
