import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderStatus } from "@/components/dining/OrderStatus";
import { ORDER_REFERENCE, normalizeOrderReference } from "@/lib/restaurant/rules";

export const metadata: Metadata = {
  title: "Order status",
  description: "Check the status of a restaurant order at Tejjora Lake View.",
  robots: { index: false, follow: false },
};

/** Private status page: the reference is in the URL, the mobile number is asked for on the page. */
export default async function OrderStatusPage({ params }: { params: Promise<{ ref: string }> }) {
  const reference = normalizeOrderReference((await params).ref);
  if (!ORDER_REFERENCE.test(reference)) notFound();
  return (
    <main className="tj-page">
      <OrderStatus reference={reference} />
    </main>
  );
}
