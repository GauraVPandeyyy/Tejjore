import type { Metadata } from "next";
import { ContactPage } from "@/components/contact/ContactPage";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Contact – Gomti Nagar, Lucknow",
  description: "Call, WhatsApp, find directions or contact Tejjora Lake View in Gomti Nagar, Lucknow.",
  alternates: { canonical: "/contact" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/contact", baseMetadata);
}

export const revalidate = 600;

export default function ContactRoute() { return <main className="tj-page"><ContactPage /></main>; }
