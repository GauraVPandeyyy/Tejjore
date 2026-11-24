import type { Metadata } from "next";
import { FaqBrowser } from "@/components/faq/FaqBrowser";
import { StructuredData } from "@/components/seo/StructuredData";
import { PillLink } from "@/components/ui/Buttons";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { getPublishedFaqs } from "@/lib/content/faqs";
import { seoMetadata } from "@/lib/content/seo";
import { faqSchema, presentSchemas } from "@/lib/seo/schema";

const baseMetadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about staying at Tejjora Lake View in Gomti Nagar, Lucknow: booking, parking, Wi-Fi, dining and more.",
  alternates: { canonical: "/faq" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/faq", baseMetadata);
}

export const revalidate = 600;

/** All published FAQs (masterplan §3, §4). FAQPage data describes exactly the questions on this page. */
export default async function FaqPage() {
  const { data: faqs } = await getPublishedFaqs();
  return (
    <main className="tj-page">
      <StructuredData data={presentSchemas(faqSchema(faqs))} />
      <section className="tj-section tj-section--first" aria-labelledby="faq-page-title">
        <div className="tj-container tj-container--narrow">
          <SectionIntro id="faq-page-title" as="h1" title="Questions">
            <p>Quick answers from the hotel. For anything else, call or message us.</p>
          </SectionIntro>
          {faqs.length ? <FaqBrowser faqs={faqs} /> : <p className="tj-center">Questions and answers will appear here soon.</p>}
          <div className="tj-actions-row tj-faq__contact">
            <PillLink href="/contact" variant="lake">
              Contact the hotel
            </PillLink>
            <PillLink href="/policies">Policies</PillLink>
          </div>
        </div>
      </section>
    </main>
  );
}
