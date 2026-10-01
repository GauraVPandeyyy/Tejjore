import "server-only";
import type { ReservationRecord } from "@/types/booking";
import { hotel } from "@/data/hotel";
import { rooms } from "@/data/rooms";
import { formatMoney } from "@/data/commerce";

export type EmailDelivery = { status:"sent"|"unavailable"|"failed"; id?:string; error?:string };

function escapeHtml(value:string){return value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]??char));}

export async function sendBookingConfirmationEmail(reservation:ReservationRecord):Promise<EmailDelivery>{
  const apiKey=process.env.RESEND_API_KEY?.trim();
  const from=process.env.BOOKING_EMAIL_FROM?.trim();
  if(!apiKey||!from)return{status:"unavailable"};
  const room=rooms.find((item)=>item.id===reservation.roomId);
  const guest=escapeHtml(`${reservation.guest.firstName} ${reservation.guest.lastName}`.trim());
  const subject=`Booking confirmed · ${reservation.reference} · ${hotel.shortName}`;
  const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172022;line-height:1.55"><div style="max-width:640px;margin:0 auto;padding:32px"><p style="letter-spacing:.12em;font-size:12px">TEJJORA LAKE VIEW</p><h1 style="font-weight:500">Your stay is confirmed.</h1><p>Hello ${guest},</p><p>Your reservation at ${escapeHtml(hotel.name)} has been confirmed.</p><table style="width:100%;border-collapse:collapse;margin:24px 0"><tr><td>Booking reference</td><td><strong>${escapeHtml(reservation.reference)}</strong></td></tr><tr><td>Room</td><td>${escapeHtml(room?.name??reservation.roomId)}</td></tr><tr><td>Check-in</td><td>${escapeHtml(reservation.stay.checkIn)}</td></tr><tr><td>Check-out</td><td>${escapeHtml(reservation.stay.checkOut)}</td></tr><tr><td>Total</td><td>${escapeHtml(formatMoney(reservation.pricing.grandTotal))}</td></tr><tr><td>Paid</td><td>${escapeHtml(formatMoney(reservation.pricing.amountPaid))}</td></tr></table><p><strong>Hotel contact:</strong> ${escapeHtml(hotel.phoneDisplay)}</p><p>${escapeHtml(hotel.address.line1)}, ${escapeHtml(hotel.address.locality)}, ${escapeHtml(hotel.address.city)}, ${escapeHtml(hotel.address.state)} ${escapeHtml(hotel.address.postalCode)}</p><p style="font-size:13px;color:#667">Keep this email and your booking reference for future assistance.</p></div></body></html>`;
  try{
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[reservation.guest.email],subject,html}),cache:"no-store"});
    if(!response.ok){const text=await response.text().catch(()=>"");return{status:"failed",error:`Resend ${response.status}: ${text.slice(0,180)}`};}
    const data=await response.json() as {id?:string}; return{status:"sent",id:data.id};
  }catch(error){return{status:"failed",error:error instanceof Error?error.message:"Email delivery failed"};}
}
