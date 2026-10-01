import type { BookingStep } from "@/types/booking";

const steps: Array<{ id: BookingStep; label: string }> = [
  { id: "stay", label: "Dates" },
  { id: "room", label: "Choose room" },
  { id: "checkout", label: "Guest & payment" },
];

export function BookingProgress({ current }: { current: BookingStep }) {
  const activeIndex = steps.findIndex((step) => step.id === current);
  const progress = activeIndex <= 0 ? 0 : (activeIndex / (steps.length - 1)) * 100;
  return <div className="booking-progress booking-progress--compact" aria-label="Booking progress">
    <div className="booking-progress__waterline" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    <ol>{steps.map((step,index)=><li key={step.id} data-active={index===activeIndex} data-complete={index<activeIndex}><span>{String(index+1).padStart(2,"0")}</span><strong>{step.label}</strong></li>)}</ol>
  </div>;
}
