import type { BookingStep } from "@/types/booking";

const steps: Array<{ id: BookingStep; label: string }> = [
  { id: "stay", label: "Dates" },
  { id: "room", label: "Room" },
  { id: "checkout", label: "Details & payment" },
];

/** Minimal step header: numbers come from the list; ember marks only the active step. */
export function BookingProgress({ current }: { current: BookingStep }) {
  const activeIndex = steps.findIndex((step) => step.id === current);
  return (
    <ol className="tj-steps" aria-label="Booking progress">
      {steps.map((step, index) => (
        <li key={step.id} className="tj-steps__item" data-state={index === activeIndex ? "active" : index < activeIndex ? "done" : "todo"} aria-current={index === activeIndex ? "step" : undefined}>
          {step.label}
        </li>
      ))}
    </ol>
  );
}
