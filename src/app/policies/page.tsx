import type { Metadata } from "next";
import { hotelPolicies } from "@/data/policies";
import { PillLink } from "@/components/ui/Buttons";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { getPublishedPolicies } from "@/lib/content/policies";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Hotel Policies",
  description: "Current booking and stay policy information for Tejjora Lake View.",
  alternates: { canonical: "/policies" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/policies", baseMetadata);
}

export const revalidate = 600;

const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value));

// Hotel-approved policies come from the content layer. Until the hotel approves its wording, the
// generic guidance in src/data/policies.ts is shown and introduced as general guidance, not as
// hotel policy (content ledger: placeholder policies). "Last updated" is the latest approval date.
export default async function PoliciesPage() {
  const { data: approved } = await getPublishedPolicies();
  const items = approved.length ? approved.map(({ title, body }) => ({ title, body })) : hotelPolicies;
  const dates = approved.flatMap((policy) => (policy.approvedAt && !Number.isNaN(Date.parse(policy.approvedAt)) ? [policy.approvedAt] : []));
  const updated = dates.length ? dates.reduce((latest, value) => (Date.parse(value) > Date.parse(latest) ? value : latest)) : null;
  const intro = approved.length
    ? "Practical information for planning your arrival, booking changes and special requests. Your confirmed rate plan remains the final source for reservation-specific terms."
    : "General guidance for planning your arrival, booking changes and special requests. Hotel-approved policy wording will be published here; until then, the terms shown with your confirmed rate plan apply.";

  return (
    <main className="tj-page">
      <section className="tj-section tj-section--first" aria-labelledby="policies-title">
        <div className="tj-container">
          <SectionIntro id="policies-title" as="h1" title="Policies">
            <p>{intro}</p>
          </SectionIntro>
          <article className="tj-prose">
            {updated ? (
              <p className="tj-prose__meta">
                Last updated <time dateTime={updated}>{formatDate(updated)}</time>
              </p>
            ) : (
              <p className="tj-prose__meta">General guidance · awaiting the hotel&rsquo;s approved wording</p>
            )}
            <ol className="tj-prose__list">
              {items.map((item) => (
                <li key={item.title}>
                  <h2>{item.title}</h2>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
          </article>
          <div className="tj-actions-row">
            <PillLink href="/faq">Questions</PillLink>
            <PillLink href="/contact" variant="lake">
              Ask the hotel
            </PillLink>
          </div>
        </div>
      </section>
    </main>
  );
}
