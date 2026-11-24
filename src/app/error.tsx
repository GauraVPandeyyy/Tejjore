"use client";

import { useEffect } from "react";
import { hotel } from "@/data/hotel";
import { PillAnchor, PillButton, PillLink } from "@/components/ui/Buttons";
import { StatusPage } from "@/components/layout/StatusPage";

/** Route error boundary (Next 16 passes `retry`). Never shows error details to guests. */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      eyebrow="Something went wrong"
      title="This page didn’t load"
      actions={
        <>
          <PillButton variant="lake" onClick={() => retry()}>
            Try again
          </PillButton>
          <PillLink href="/">Back to the hotel</PillLink>
          <PillAnchor href={`tel:${hotel.phoneE164}`} arrow={false}>
            Call {hotel.phoneDisplay}
          </PillAnchor>
        </>
      }
    >
      <p>Please try again in a moment. If it keeps happening, the hotel can help by phone.</p>
    </StatusPage>
  );
}
