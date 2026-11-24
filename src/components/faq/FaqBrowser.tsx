"use client";

import { useState } from "react";
import type { Faq } from "@/lib/content/types";
import { FaqAccordion } from "./FaqAccordion";

const label = (category: string) => category.charAt(0).toUpperCase() + category.slice(1).replace(/[-_]/g, " ");

/** Category chips (outline pills, aria-pressed) over the accordion; chips appear only with 2+ categories. */
export function FaqBrowser({ faqs }: { faqs: Faq[] }) {
  const categories = [...new Set(faqs.map((faq) => faq.category))];
  const [category, setCategory] = useState<string | null>(null);
  const shown = category ? faqs.filter((faq) => faq.category === category) : faqs;
  return (
    <>
      {categories.length > 1 ? (
        <div className="tj-chip-row tj-faq__chips" role="group" aria-label="Show questions about">
          <button type="button" className="tj-chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
            All
          </button>
          {categories.map((item) => (
            <button key={item} type="button" className="tj-chip" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {label(item)}
            </button>
          ))}
        </div>
      ) : null}
      <FaqAccordion faqs={shown} />
    </>
  );
}
