import type { Metadata } from "next";
import { StatusPage } from "@/components/layout/StatusPage";
import { PillLink } from "@/components/ui/Buttons";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="404"
      title="This page has drifted off"
      actions={
        <>
          <PillLink href="/" variant="lake">
            Back to the hotel
          </PillLink>
          <PillLink href="/rooms">The rooms</PillLink>
          <PillLink href="/contact">Contact us</PillLink>
        </>
      }
    >
      <p>The link may be old or mistyped. Everything else is where you left it.</p>
    </StatusPage>
  );
}
