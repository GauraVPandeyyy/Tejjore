/**
 * Business-policy placeholders. Replace with hotel-approved text before production.
 * These values intentionally avoid inventing cancellation/check-in rules.
 */
export const hotelPolicies = [
  { title: "Check-in & check-out", body: "Your confirmed reservation will carry the applicable arrival and departure information. If you are planning an early arrival or late departure, contact the hotel in advance." },
  { title: "Cancellation & refunds", body: "Cancellation and refund terms can vary by rate plan. Review the terms shown with your booking and contact the hotel if you need to change or cancel a reservation." },
  { title: "Identification", body: "Guests should carry valid identification for check-in. Contact the hotel before arrival if you need guidance on accepted documents." },
  { title: "Children & extra guests", body: "Any child, extra-adult or extra-bed charges are applied only when explicitly configured in the booking system." },
  { title: "Special requests", body: "Early check-in, late checkout, airport pickup, decoration and other requests remain subject to hotel confirmation unless a priced online option is configured." },
] as const;
