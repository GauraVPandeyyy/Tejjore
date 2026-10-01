export type AnalyticsEvent =
  | "hero_check_dates"
  | "room_view"
  | "room_compare"
  | "room_selected"
  | "virtual_tour_open"
  | "virtual_tour_cta"
  | "restaurant_enquiry"
  | "plan_my_stay_start"
  | "plan_my_stay_complete"
  | "ai_open"
  | "ai_message"
  | "whatsapp_click"
  | "call_click"
  | "directions_click"
  | "booking_search"
  | "rate_selected"
  | "booking_request_started"
  | "booking_request_submitted"
  | "arrival_tab_change"
  | "arrival_special_request"
  | "arrival_concierge_open";

export function track(event: AnalyticsEvent, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tejjora:analytics", { detail: { event, payload } }));
}
