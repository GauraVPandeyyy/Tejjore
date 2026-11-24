import { formatMoney } from "@/data/commerce";
import { rateCardNote, type RoomRateCard } from "@/lib/booking/rateCard";

/**
 * The public "from" price of a room, exactly as the booking engine would charge its cheapest
 * upcoming night (lib/booking/rateCard.ts). Used by every room surface so the number and its
 * wording never drift. Without a rate card the price is withheld rather than guessed.
 */
export function FromPrice({ rate, className = "tj-price", showNote = true }: { rate: RoomRateCard | null; className?: string; showNote?: boolean }) {
  if (!rate) {
    return (
      <p className={`${className} tj-price--pending`}>
        <span>Live rate shown for your dates</span>
      </p>
    );
  }
  const note = showNote ? rateCardNote(rate, formatMoney) : null;
  return (
    <p className={className} data-rate-room={rate.roomId} data-from-rate={rate.fromRate}>
      <span className="tj-price__label">From</span> <strong>{formatMoney(rate.fromRate)}</strong> <span>/ night · room only</span>
      {note ? <small className="tj-price__note">{note}</small> : null}
    </p>
  );
}
