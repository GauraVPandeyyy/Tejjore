import "server-only";
import type { ReservationRecord } from "@/types/booking";
import { updateReservation } from "@/lib/booking/reservations";
import { withBookingStore } from "@/lib/booking/store";
import { sendBookingConfirmationEmail } from "./provider";

// A "sending" claim older than this is treated as abandoned (e.g. the process died mid-send).
const STALE_CLAIM_MS=5*60_000;

type Claim=
  |{kind:"not_applicable"}
  |{kind:"sent";sentAt?:string}
  |{kind:"in_progress"}
  |{kind:"claimed";reservation:ReservationRecord};

export async function deliverReservationConfirmation(reference:string){
  // The verify route and the payment webhook usually run concurrently; claiming the send
  // inside the store lock ensures only one of them emails the guest.
  const claim=await withBookingStore<Claim>((store)=>{
    const current=store.reservations.find((item)=>item.reference===reference);
    if(!current||current.status!=="confirmed"||current.paymentStatus!=="paid")return{kind:"not_applicable"};
    if(current.confirmationEmailStatus==="sent")return{kind:"sent",sentAt:current.confirmationEmailSentAt};
    if(current.confirmationEmailStatus==="sending"&&Date.now()-Date.parse(current.updatedAt)<STALE_CLAIM_MS)return{kind:"in_progress"};
    current.confirmationEmailStatus="sending";
    current.updatedAt=new Date().toISOString();
    return{kind:"claimed",reservation:structuredClone(current)};
  });
  if(claim.kind==="not_applicable")return{status:"not_applicable" as const};
  if(claim.kind==="sent")return{status:"sent" as const,sentAt:claim.sentAt};
  if(claim.kind==="in_progress")return{status:"sending" as const};

  const delivery=await sendBookingConfirmationEmail(claim.reservation).catch((error:unknown)=>({
    status:"failed" as const,
    error:error instanceof Error?error.message:"Confirmation email could not be sent.",
  }));
  const updated=await updateReservation(reference,(reservation)=>{
    reservation.confirmationEmailStatus=delivery.status;
    reservation.confirmationEmailError=delivery.status==="failed"?delivery.error:undefined;
    if(delivery.status==="sent")reservation.confirmationEmailSentAt=new Date().toISOString();
  });
  return{status:updated.confirmationEmailStatus??delivery.status,sentAt:updated.confirmationEmailSentAt};
}
