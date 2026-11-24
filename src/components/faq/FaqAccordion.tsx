import type { Faq } from "@/lib/content/types";

/** Hairline accordion with a plus/minus circle (native details/summary, keyboard and no-JS safe). */
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="tj-accordion">
      {faqs.map((faq) => (
        <details key={faq.id} className="tj-accordion__item">
          <summary>
            <span>{faq.question}</span>
            <span className="tj-accordion__icon" aria-hidden="true" />
          </summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
