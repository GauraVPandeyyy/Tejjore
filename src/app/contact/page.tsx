import type { Metadata } from "next";
import { ContactPage } from "@/components/contact/ContactPage";

export const metadata: Metadata = {
  title: "Contact | Tejjora Lake View, Gomti Nagar Lucknow",
  description: "Call, WhatsApp, find directions or contact Tejjora Lake View in Gomti Nagar, Lucknow.",
  alternates: { canonical: "/contact" },
};

export default function ContactRoute() { return <main className="contact-page"><ContactPage /></main>; }
