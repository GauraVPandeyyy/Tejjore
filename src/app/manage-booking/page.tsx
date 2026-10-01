import type { Metadata } from "next";
import { ManageBooking } from "@/components/booking/ManageBooking";

export const metadata: Metadata = {
  title: "Manage Booking",
  description: "Securely retrieve and manage a Tejjora Lake View reservation.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ reference?: string | string[] }>;

export default async function ManageBookingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const reference = Array.isArray(params.reference) ? params.reference[0] : params.reference;
  return <main className="manage-booking-page"><ManageBooking initialReference={reference ?? ""} /></main>;
}
