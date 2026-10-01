import "server-only";
import { getReservation, updateReservation } from "@/lib/booking/reservations";
import { sendBookingConfirmationEmail } from "./provider";

export async function deliverReservationConfirmation(reference:string){
  const current=await getReservation(reference);
  if(!current||current.status!=="confirmed"||current.paymentStatus!=="paid")return{status:"not_applicable" as const};
  if(current.confirmationEmailStatus==="sent")return{status:"sent" as const, sentAt:current.confirmationEmailSentAt};
  const delivery=await sendBookingConfirmationEmail(current);
  const updated=await updateReservation(reference,(reservation)=>{
    reservation.confirmationEmailStatus=delivery.status;
    reservation.confirmationEmailError=delivery.status==="failed"?delivery.error:undefined;
    if(delivery.status==="sent")reservation.confirmationEmailSentAt=new Date().toISOString();
  });
  return{status:updated.confirmationEmailStatus??delivery.status,sentAt:updated.confirmationEmailSentAt};
}
