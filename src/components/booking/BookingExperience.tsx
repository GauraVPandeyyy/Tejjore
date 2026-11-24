"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { bookingConfig } from "@/data/booking";
import { formatMoney } from "@/data/commerce";
import { hotel } from "@/data/hotel";
import { rooms } from "@/data/rooms";
import { track } from "@/lib/analytics/track";
import { websiteBookingProvider, websiteInventoryProvider } from "@/lib/booking/providers";
import { calculateBookingPrice } from "@/lib/booking/pricing";
import { averageNightlyRate, stayRoomSubtotal } from "@/lib/booking/rateCard";
import { guestCountError, guestEmailValid, guestLimits, guestPhoneValid, occupancyError, todayInIndia } from "@/lib/booking/validation";
import type { PriceBreakdown, PublicAvailabilityRoom, BookingDraft, BookingRequestPayload, BookingRequestResponse, BookingStep, PublicReservationView } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import { BookingProgress } from "./BookingProgress";
import { BookingBar, BookingSummary } from "./BookingSummary";
import { BookingErrorNotice, NextSteps, RoomChoice, PriceBreakdownRows } from "./BookingParts";
import { downloadStayCalendar } from "@/lib/booking/calendar";
import { ApiError, apiErrorCode, apiErrorMessage, isServiceProblem } from "@/lib/http/clientError";
import { formatStayDates } from "@/lib/booking/request";
import { ArrivalJourney } from "@/components/hotel/ArrivalJourney";
import { CircleButton, PillAnchor, PillButton, PillLink } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";

const emptyGuest: BookingDraft["guest"] = { firstName:"", lastName:"", phone:"", email:"", preferredContact:"whatsapp", arrivalNotes:"", specialRequests:"" };
type Props = { initial: { checkIn?: string; checkOut?: string; adults?: number; children?: number; rooms?: number; roomId?: RoomId; ratePlanId?: string; addonIds?: string[] } };
type RazorpayResult = { razorpay_order_id:string; razorpay_payment_id:string; razorpay_signature:string };
type RazorpayConstructor = new (options: Record<string,unknown>) => { open:()=>void };
declare global { interface Window { Razorpay?: RazorpayConstructor } }

function addDays(value:string,amount:number){if(!value)return"";const date=new Date(`${value}T12:00:00`);date.setDate(date.getDate()+amount);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function isValidDateRange(checkIn:string,checkOut:string){return Boolean(checkIn&&checkOut&&checkOut>checkIn);}
async function loadRazorpay(){if(window.Razorpay)return true;return new Promise<boolean>((resolve)=>{const existing=document.querySelector<HTMLScriptElement>('script[data-tejjora-razorpay="true"]');if(existing){existing.addEventListener("load",()=>resolve(true),{once:true});existing.addEventListener("error",()=>resolve(false),{once:true});return;}const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.async=true;script.dataset.tejjoraRazorpay="true";script.onload=()=>resolve(true);script.onerror=()=>resolve(false);document.body.appendChild(script);});}

// The in-progress booking is kept per tab (sessionStorage) so a refresh or back/forward
// navigation resumes it. It is keyed by the entry URL's parameters: arriving from a
// different entry point starts a fresh flow instead of resurrecting an old one.
const FLOW_STORAGE_KEY="tejjora-booking-flow";
type StoredFlow={key:string;step:BookingStep;draft:BookingDraft;reservation?:{reference:string;accessToken:string;bookingReceivedEmailStatus?:BookingRequestResponse["bookingReceivedEmailStatus"]}};
function readStoredFlow(key:string):StoredFlow|null{try{const raw=sessionStorage.getItem(FLOW_STORAGE_KEY);if(!raw)return null;const value=JSON.parse(raw) as StoredFlow;return value?.key===key&&value.draft?.stay?value:null;}catch{return null;}}
function writeStoredFlow(value:StoredFlow|null){try{if(value)sessionStorage.setItem(FLOW_STORAGE_KEY,JSON.stringify(value));else sessionStorage.removeItem(FLOW_STORAGE_KEY);}catch{/* storage unavailable: the flow still works, it just won't survive a refresh */}}
/** Parses a JSON API response; a non-JSON error page becomes a readable message instead of a parser error. */
async function readJson<T extends object>(response:Response):Promise<Partial<T>&{error?:string}>{try{return await response.json();}catch{return{error:response.ok?"Unexpected response from the booking service.":`The booking service is unavailable (${response.status}). Please try again.`} as Partial<T>&{error?:string};}}
type VerifyResponse=Pick<BookingRequestResponse,"status"|"paymentStatus"|"pricing"|"confirmationEmailStatus">;
type OrderResponse={id:string;amount:number;currency:string;mode:"razorpay"|"test";keyId:string|null};
function resultFromView(view:PublicReservationView,bookingReceivedEmailStatus?:BookingRequestResponse["bookingReceivedEmailStatus"]):BookingRequestResponse{return{reference:view.reference,createdAt:view.createdAt,status:view.status,paymentStatus:view.paymentStatus,pricing:view.pricing,paymentAvailable:view.paymentAvailable,paymentMode:view.paymentMode,accessToken:view.accessToken,bookingReceivedEmailStatus,confirmationEmailStatus:view.confirmationEmailStatus};}
function initialDraft(initial:Props["initial"]):BookingDraft{return{ stay:{ checkIn:initial.checkIn??"",checkOut:initial.checkOut??"",adults:initial.adults&&initial.adults>0?initial.adults:2,children:initial.children&&initial.children>=0?initial.children:0,rooms:initial.rooms&&initial.rooms>0?initial.rooms:1 }, roomId:initial.roomId??null, ratePlanId:initial.ratePlanId??"room-only", addonIds:initial.addonIds??[], guest:emptyGuest, acknowledgement:false };}

export function BookingExperience({ initial }: Props) {
  // India date (the hotel's and the server validator's timezone) so SSR and the browser agree.
  const today=useMemo(()=>todayInIndia(),[]);
  const flowKey=useMemo(()=>JSON.stringify(initial),[initial]);
  const initialDatesValid=isValidDateRange(initial.checkIn??"",initial.checkOut??"")&&(initial.checkIn??"")>=today;
  const [step,setStep]=useState<BookingStep>(initialDatesValid?"room":"stay");
  const [draft,setDraft]=useState<BookingDraft>(()=>initialDraft(initial));
  const [availability,setAvailability]=useState<PublicAvailabilityRoom[]>([]);
  const [availabilityMode,setAvailabilityMode]=useState<"development"|"production"|null>(null);
  const [error,setError]=useState(""); const [serviceError,setServiceError]=useState(""); const [busy,setBusy]=useState(false); const [result,setResult]=useState<BookingRequestResponse|null>(null); const [paymentBusy,setPaymentBusy]=useState(false);
  const [restoring,setRestoring]=useState(false);
  const restoredRef=useRef(false);
  // A stored reservation that could not be reloaded (network/server error) is kept so a later refresh can retry.
  const unrestoredReservationRef=useRef<StoredFlow["reservation"]>(undefined);

  // On mount: resume a stored flow for this entry URL, otherwise load availability for the
  // dates in the link. A stored reservation is re-read from the server so the screen always
  // reflects the real booking state (held, paid, expired), never a stale client copy.
  useEffect(()=>{
    let cancelled=false;
    async function loadAvailability(checkIn:string,checkOut:string){const data=await websiteInventoryProvider.search(checkIn,checkOut);if(cancelled)return;setAvailability(data.rooms);setAvailabilityMode(data.mode);}
    async function start(){
      const stored=readStoredFlow(flowKey);
      if(stored?.reservation){
        setRestoring(true);
        try{
          const response=await fetch("/api/reservations/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:stored.reservation.reference,accessToken:stored.reservation.accessToken})});
          const data=await readJson<PublicReservationView>(response);
          if(cancelled)return;
          if(response.ok){const view=data as unknown as PublicReservationView;setDraft({...stored.draft,stay:view.stay,roomId:view.roomId,ratePlanId:view.ratePlanId,addonIds:view.addonIds,acknowledgement:false});setResult(resultFromView(view,stored.reservation.bookingReceivedEmailStatus));return;}
          if(response.status!==403&&response.status!==404){unrestoredReservationRef.current=stored.reservation;setDraft(stored.draft);setError(`We could not reload reservation ${stored.reservation.reference} right now. Refresh to try again, or use Manage booking with your reference, email and phone.`);return;}
          // Access no longer valid: fall through and resume the form without the reservation.
        }catch{if(cancelled)return;unrestoredReservationRef.current=stored.reservation;setDraft(stored.draft);setError(`We could not reload reservation ${stored.reservation.reference}. Check your connection and refresh, or use Manage booking with your reference.`);return;}
        finally{if(!cancelled)setRestoring(false);}
      }
      if(stored){
        setDraft({...stored.draft,acknowledgement:false});
        if(stored.step!=="stay"&&isValidDateRange(stored.draft.stay.checkIn,stored.draft.stay.checkOut)&&stored.draft.stay.checkIn>=today){
          try{await loadAvailability(stored.draft.stay.checkIn,stored.draft.stay.checkOut);if(!cancelled)setStep(stored.step);}
          catch(caught){if(!cancelled){setStep("stay");fail(caught,"Availability could not be checked. Please search again.");}}
        }else setStep("stay");
        return;
      }
      if(initialDatesValid){
        try{await loadAvailability(initial.checkIn!,initial.checkOut!);}
        catch(caught){if(!cancelled){setStep("stay");fail(caught,"Availability could not be checked. Please search again.");}}
      }else if(initial.checkIn||initial.checkOut){
        setError("The dates in this link have passed or are not valid. Choose new dates to see availability.");
      }
    }
    void start().finally(()=>{if(!cancelled)restoredRef.current=true;});
    return()=>{cancelled=true;};
    // Runs once per entry URL; later state changes are persisted by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[flowKey]);

  // Persist the flow after the initial restore so a refresh resumes where the guest was.
  useEffect(()=>{
    if(!restoredRef.current)return;
    const reservation=result?{reference:result.reference,accessToken:result.accessToken,bookingReceivedEmailStatus:result.bookingReceivedEmailStatus}:unrestoredReservationRef.current;
    writeStoredFlow({key:flowKey,step,draft:{...draft,acknowledgement:false},...(reservation?{reservation}:{})});
  },[flowKey,step,draft,result]);

  function startNewBooking(){unrestoredReservationRef.current=undefined;writeStoredFlow(null);setResult(null);setError("");setAvailability([]);setDraft(current=>({...initialDraft({}),guest:{...emptyGuest,firstName:current.guest.firstName,lastName:current.guest.lastName,phone:current.guest.phone,email:current.guest.email,preferredContact:current.guest.preferredContact}}));setStep("stay");window.scrollTo({top:0,behavior:"smooth"});}
  const selectedRoom=rooms.find(r=>r.id===draft.roomId);
  /** Records a failure; a service problem (5xx, outage, no network) also offers the hotel's phone and WhatsApp. */
  function fail(caught:unknown,fallback:string){const message=caught instanceof Error&&caught.message?caught.message:fallback;setError(message);setServiceError(isServiceProblem(caught)?message:"");}
  const errorHelp=Boolean(error)&&error===serviceError;

  async function searchStay(){
    if(!draft.stay.checkIn||!draft.stay.checkOut)return setError("Choose check-in and check-out dates.");
    if(!isValidDateRange(draft.stay.checkIn,draft.stay.checkOut))return setError("Check-out must be after check-in.");
    if(draft.stay.checkIn<today)return setError("Check-in cannot be in the past.");
    const guestError=guestCountError(draft.stay.adults,draft.stay.children,draft.stay.rooms);if(guestError)return setError(guestError);
    setBusy(true);setError("");
    try{const data=await websiteInventoryProvider.search(draft.stay.checkIn,draft.stay.checkOut);setAvailability(data.rooms);setAvailabilityMode(data.mode);if(draft.roomId){const room=data.rooms.find(i=>i.roomId===draft.roomId);if(!room||room.available<draft.stay.rooms)setDraft(c=>({...c,roomId:null}));}track("booking_search",draft.stay);setStep("room");window.scrollTo({top:0,behavior:"smooth"});}catch(caught){fail(caught,"Availability could not be checked.");}finally{setBusy(false);}
  }

  function continueRoom(){
    if(!draft.roomId)return setError("Choose a room to continue.");
    const inventory=availability.find(i=>i.roomId===draft.roomId); if(inventory&&inventory.available<draft.stay.rooms)return setError("This room category no longer has enough website inventory for the selected dates.");
    const occupancy=inventory?occupancyError({maxAdults:inventory.maxAdults??null,maxChildren:inventory.maxChildren??null},draft.stay.adults,draft.stay.children,draft.stay.rooms):null; if(occupancy)return setError(occupancy);
    const rate=bookingConfig.ratePlans.find(i=>i.id===draft.ratePlanId); if(!rate?.onlineBookable)return setError("Choose an online-bookable rate plan.");
    setError("");setStep("checkout");window.scrollTo({top:0,behavior:"smooth"});
  }

  function payload():BookingRequestPayload|null{if(!draft.roomId||!draft.ratePlanId)return null;return{stay:draft.stay,roomId:draft.roomId,ratePlanId:draft.ratePlanId,addonIds:draft.addonIds,...(draft.promoCode?.trim()?{promoCode:draft.promoCode.trim().toUpperCase()}:{}),guest:draft.guest,source:"website"};}

  async function submitReservation(event:FormEvent){event.preventDefault();const {firstName,phone,email}=draft.guest;if(!firstName.trim()||!phone.trim()||!email.trim())return setError("Name, phone and email are required.");if(!guestPhoneValid(phone))return setError("Enter a valid phone number (7–15 digits).");if(!guestEmailValid(email))return setError("Enter a valid email address.");if(!draft.acknowledgement)return setError("Please review and accept the booking details before continuing.");const body=payload();if(!body)return setError("The reservation is incomplete.");setBusy(true);setError("");try{track("booking_request_started",{roomId:draft.roomId});const data=await websiteBookingProvider.createReservation(body);setResult(data);track("booking_request_submitted",{reference:data.reference,roomId:draft.roomId});window.scrollTo({top:0,behavior:"smooth"});}catch(caught){fail(caught,"Reservation could not be created.");}finally{setBusy(false);}}

  async function verifyPayment(data:RazorpayResult|{testSuccess:true}){if(!result)return;const response=await fetch("/api/payments/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:result.reference,accessToken:result.accessToken,...data})});const verified=await readJson<VerifyResponse>(response);if(!response.ok||!verified.status||!verified.paymentStatus||!verified.pricing)throw new ApiError(apiErrorMessage(verified, "Payment verification failed."),apiErrorCode(verified),response.status);const {status,paymentStatus,pricing,confirmationEmailStatus}=verified;setResult(current=>current?{...current,status,paymentStatus,pricing,confirmationEmailStatus}:current);}

  async function startPayment(){if(!result)return;setPaymentBusy(true);setError("");try{const response=await fetch("/api/payments/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:result.reference,accessToken:result.accessToken})});const order=await readJson<OrderResponse>(response);if(!response.ok||!order.mode)throw new ApiError(apiErrorMessage(order, "Payment could not be started."),apiErrorCode(order),response.status);if(order.mode==="test"){await verifyPayment({testSuccess:true});setPaymentBusy(false);return;}const loaded=await loadRazorpay();if(!loaded||!window.Razorpay)throw new Error("Secure payment checkout could not be loaded.");const checkout=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,order_id:order.id,name:"Tejjora Lake View",description:`Reservation ${result.reference}`,prefill:{name:`${draft.guest.firstName} ${draft.guest.lastName}`.trim(),email:draft.guest.email,contact:draft.guest.phone},theme:{color:"#002E36"},handler:async(payment:RazorpayResult)=>{try{await verifyPayment(payment);}catch(caught){fail(caught,"Payment verification failed.");}finally{setPaymentBusy(false);}},modal:{ondismiss:()=>setPaymentBusy(false)}});checkout.open();}catch(caught){fail(caught,"Payment could not be started.");setPaymentBusy(false);}}


  if(result&&draft.roomId&&draft.ratePlanId){
    const confirmed=result.status==="confirmed"&&result.paymentStatus==="paid";
    const paymentReview=result.status==="payment_review"&&result.paymentStatus==="paid";
    const paymentReceived=result.paymentStatus==="paid";
    return (
      <section className="tj-book tj-confirm" aria-labelledby="booking-result-title">
        <BookingBrand/>
        <p className="tj-eyebrow tj-confirm__status" data-state={confirmed?"confirmed":paymentReview?"review":"pending"}>{confirmed?"Booking confirmed":paymentReview?"Payment received · review required":"Room held · payment pending"}</p>
        <h1 id="booking-result-title" className="tj-heading">{confirmed?"You’re booked":paymentReview?"Your payment is safe with us":"One last step"}</h1>
        <p className="tj-confirm__lead">{confirmed?"Payment has been verified and your reservation is confirmed.":paymentReview?"Payment was verified, but the hotel needs to review the room hold before confirming the stay.":result.paymentAvailable?"Your room is temporarily held. Complete secure payment before the hold expires.":"Online payment is not configured in this environment. Contact the hotel for assistance."}</p>
        <ReferenceCopy reference={result.reference}/>
        {!paymentReceived&&result.paymentAvailable?<PillButton variant="lake" dot className="tj-pill--block tj-confirm__pay" disabled={paymentBusy} onClick={startPayment}>{paymentBusy?"Starting secure payment…":result.paymentMode==="test"?"Complete test payment":`Pay ${formatMoney(result.pricing.amountDue)} securely`}</PillButton>:null}
        {error?<BookingErrorNotice message={error} help={errorHelp}/>:null}
        <dl className="tj-specs tj-confirm__specs">
          <ReviewRow label="Guest" value={`${draft.guest.firstName} ${draft.guest.lastName}`.trim()}/>
          <ReviewRow label="Room" value={selectedRoom?.name??"—"}/>
          <ReviewRow label="Stay" value={`${formatStayDates(draft.stay.checkIn,draft.stay.checkOut)} · ${result.pricing.nights} night${result.pricing.nights===1?"":"s"}`}/>
          <ReviewRow label="Total" value={formatMoney(result.pricing.grandTotal)}/>
          <ReviewRow label="Paid" value={formatMoney(result.pricing.amountPaid)}/>
          <ReviewRow label="Balance" value={formatMoney(result.pricing.amountDue)}/>
          <ReviewRow label="Payment" value={sentence(result.paymentStatus)}/>
          <ReviewRow label="Reservation" value={sentence(result.status)}/>
          <ReviewRow label="Booking received email" value={result.bookingReceivedEmailStatus==="sent"?`Sent to ${draft.guest.email}`:result.bookingReceivedEmailStatus==="unavailable"?"Email provider not configured":result.bookingReceivedEmailStatus==="failed"?"Delivery failed · booking still saved":"Processing"}/>
          {confirmed?<ReviewRow label="Confirmation email" value={result.confirmationEmailStatus==="sent"?"Sent":result.confirmationEmailStatus==="unavailable"?"Email provider not configured":result.confirmationEmailStatus==="failed"?"Delivery needs attention":"Processing"}/>:null}
        </dl>
        <div className="tj-actions-row">
          {paymentReceived?<PillButton onClick={()=>downloadStayCalendar({reference:result.reference,roomName:selectedRoom?.name??"Room",checkIn:draft.stay.checkIn,checkOut:draft.stay.checkOut})} arrow={false}><Icon name="calendar" size={18}/> Add to calendar</PillButton>:null}
          <PillLink href={`/manage-booking?reference=${encodeURIComponent(result.reference)}`}>Manage booking</PillLink>
          <PillAnchor href={`tel:${hotel.phoneE164}`} arrow={false}><Icon name="phone" size={18}/> Call hotel</PillAnchor>
          <PillAnchor href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer" arrow={false}><Icon name="whatsapp" size={18}/> WhatsApp</PillAnchor>
        </div>
        {paymentReceived?<div className="tj-confirm__journey"><h2 className="tj-subheading tj-subheading--center">Your arrival</h2><ArrivalJourney reference={result.reference}/></div>:null}
        <p className="tj-center"><button className="tj-text-link" type="button" onClick={startNewBooking}>Start a new booking</button></p>
      </section>
    );
  }

  if(restoring)return <section className="tj-book" aria-busy="true"><BookingBrand/><h1 className="tj-heading" role="status">Loading your reservation…</h1></section>;

  return (
    <section className="tj-book" aria-labelledby="booking-title">
      <header className="tj-book__head">
        <BookingBrand/>
        <h1 id="booking-title" className="tj-heading">Book direct</h1>
        <BookingProgress current={step}/>
      </header>
      <BookingBar draft={draft} availability={availability}/>
      <div className="tj-book__layout">
        <div className="tj-book__main">
          {step==="stay"?<StayStep draft={draft} setDraft={setDraft} today={today}/>:null}
          {step==="room"?<RoomStep draft={draft} setDraft={setDraft} availability={availability} requestedRooms={draft.stay.rooms} mode={availabilityMode}/>:null}
          {step==="checkout"?<CheckoutStep draft={draft} setDraft={setDraft} availability={availability} onSubmit={submitReservation} submitting={busy}/>:null}
          {error?<BookingErrorNotice message={error} help={errorHelp} onRetry={step==="stay"?searchStay:undefined}/>:null}
          <div className="tj-book__nav">
            {step!=="stay"?<PillButton onClick={()=>{setError("");setStep(step==="checkout"?"room":"stay");window.scrollTo({top:0,behavior:"smooth"});}}><Icon name="arrow-left" size={16}/> Back</PillButton>:<span/>}
            {step==="stay"?<PillButton variant="lake" arrow disabled={busy} onClick={searchStay}>{busy?"Checking…":"Show available rooms"}</PillButton>:step==="room"?<PillButton variant="lake" arrow onClick={continueRoom}>Guest details & payment</PillButton>:null}
          </div>
        </div>
        <BookingSummary draft={draft} availability={availability}/>
      </div>
    </section>
  );
}

/** Official mark (validator: booking identity) — small, above the step header. */
function BookingBrand(){return <div className="tj-booking-brand" aria-hidden="true"><Image src="/brand/tejjora-mark.png" alt="" width={980} height={900} sizes="44px"/></div>;}

function sentence(value:string){const text=value.replaceAll("_"," ");return text.charAt(0).toUpperCase()+text.slice(1);}

function ReferenceCopy({reference}:{reference:string}){
  const [copied,setCopied]=useState(false);
  async function copy(){try{await navigator.clipboard.writeText(reference);setCopied(true);window.setTimeout(()=>setCopied(false),2000);}catch{/* clipboard blocked: the reference stays visible to copy by hand */}}
  return <div className="tj-reference"><span className="tj-reference__label">Booking reference</span><strong className="tj-reference__value">{reference}</strong><button type="button" className="tj-pill tj-pill--small" onClick={copy}>{copied?"Copied":"Copy"}</button><span className="sr-only" aria-live="polite">{copied?"Reference copied":""}</span></div>;
}

function StayStep({draft,setDraft,today}:{draft:BookingDraft;setDraft:React.Dispatch<React.SetStateAction<BookingDraft>>;today:string}){
  const minimumCheckout=draft.stay.checkIn?addDays(draft.stay.checkIn,1):today;
  return (
    <div className="tj-book__step">
      <StepHeading title="When are you coming?" copy="We’ll show only the room categories with website availability for these dates."/>
      <div className="tj-dates">
        <label className="tj-field"><span>Check-in</span><input type="date" min={today} value={draft.stay.checkIn} onChange={e=>{const checkIn=e.target.value;setDraft(c=>({...c,stay:{...c.stay,checkIn,checkOut:c.stay.checkOut&&c.stay.checkOut<=checkIn?addDays(checkIn,1):c.stay.checkOut}}));}}/></label>
        <label className="tj-field"><span>Check-out</span><input type="date" min={minimumCheckout} value={draft.stay.checkOut} onChange={e=>setDraft(c=>({...c,stay:{...c.stay,checkOut:e.target.value}}))}/></label>
      </div>
      <div className="tj-planner__guests">
        <NumberField label="Adults" value={draft.stay.adults} min={guestLimits.adults.min} max={Math.min(guestLimits.adults.max,draft.stay.rooms*2)} onChange={v=>setDraft(c=>({...c,stay:{...c.stay,adults:v}}))}/>
        <NumberField label="Children" value={draft.stay.children} min={guestLimits.children.min} max={guestLimits.children.max} onChange={v=>setDraft(c=>({...c,stay:{...c.stay,children:v}}))}/>
        <NumberField label="Rooms" value={draft.stay.rooms} min={guestLimits.rooms.min} max={guestLimits.rooms.max} onChange={v=>setDraft(c=>({...c,stay:{...c.stay,rooms:v}}))}/>
      </div>
    </div>
  );
}

function RoomStep({draft,setDraft,availability,requestedRooms,mode}:{draft:BookingDraft;setDraft:React.Dispatch<React.SetStateAction<BookingDraft>>;availability:PublicAvailabilityRoom[];requestedRooms:number;mode:"development"|"production"|null}){
  const availablePlans=bookingConfig.ratePlans.filter(p=>p.onlineBookable);
  return (
    <div className="tj-book__step">
      <StepHeading title="Choose your room" copy={`${formatStayDates(draft.stay.checkIn,draft.stay.checkOut)} · ${draft.stay.rooms} room${draft.stay.rooms===1?"":"s"}`}/>
      {mode==="development"?<p className="tj-book__notice" role="note">Development inventory is active: availability here is test data, not the hotel’s live rooms.</p>:null}
      <ul className="bk-rooms">
        {rooms.map((room)=>(
          <li key={room.id}>
            <RoomChoice room={room} inventory={availability.find(i=>i.roomId===room.id)} rooms={requestedRooms} adults={draft.stay.adults} childGuests={draft.stay.children} selected={draft.roomId===room.id} onSelect={()=>{setDraft(c=>({...c,roomId:room.id}));track("room_selected",{roomId:room.id});}}/>
          </li>
        ))}
      </ul>
      <p className="tj-book__small">Cancellation terms depend on the hotel’s final policy and the rate plan.</p>
      {availablePlans.length>1?<fieldset className="tj-plan__group"><legend className="tj-plan__legend">Rate plan</legend><div className="tj-choices">{availablePlans.map(plan=><button type="button" key={plan.id} className="tj-choice" aria-pressed={draft.ratePlanId===plan.id} onClick={()=>setDraft(c=>({...c,ratePlanId:plan.id}))}><strong>{plan.label}</strong><small>{plan.description}</small></button>)}</div></fieldset>:null}
    </div>
  );
}

function CheckoutStep({draft,setDraft,availability,onSubmit,submitting}:{draft:BookingDraft;setDraft:React.Dispatch<React.SetStateAction<BookingDraft>>;availability:PublicAvailabilityRoom[];onSubmit:(e:FormEvent)=>void;submitting:boolean}){
  function update<K extends keyof BookingDraft["guest"]>(k:K,v:BookingDraft["guest"][K]){setDraft(c=>({...c,guest:{...c.guest,[k]:v}}));}
  const inventory=draft.roomId?availability.find(i=>i.roomId===draft.roomId):null;
  const body:BookingRequestPayload|null=draft.roomId&&draft.ratePlanId?{stay:draft.stay,roomId:draft.roomId,ratePlanId:draft.ratePlanId,addonIds:draft.addonIds,...(draft.promoCode?.trim()?{promoCode:draft.promoCode.trim().toUpperCase()}:{}),guest:draft.guest,source:"website"}:null;
  // The server is the only pricing authority: the summary shows its quote (live nightly rates,
  // promo rules, taxes). The local calculation is only a first paint until the quote arrives.
  const [quote,setQuote]=useState<{key:string;pricing:PriceBreakdown|null;error:string}|null>(null);
  const quoteKey=body?JSON.stringify([body.stay,body.roomId,body.ratePlanId,body.addonIds,body.promoCode??""]):"";
  useEffect(()=>{
    if(!body)return;
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      try{
        const response=await fetch("/api/reservations/quote",{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({stay:body.stay,roomId:body.roomId,ratePlanId:body.ratePlanId,addonIds:body.addonIds,...(body.promoCode?{promoCode:body.promoCode}:{})})});
        const data=await readJson<{pricing:PriceBreakdown}>(response);
        setQuote(response.ok&&data.pricing?{key:quoteKey,pricing:data.pricing,error:""}:{key:quoteKey,pricing:null,error:apiErrorMessage(data,"The price could not be checked.")});
      }catch(caught){if(!controller.signal.aborted)setQuote({key:quoteKey,pricing:null,error:caught instanceof Error?caught.message:"The price could not be checked."});}
    },draft.promoCode?500:0);
    return()=>{window.clearTimeout(timer);controller.abort();};
    // body is derived from quoteKey, which changes whenever any priced input changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[quoteKey]);
  const serverQuote=quote&&quote.key===quoteKey?quote:null;
  let pricing:PriceBreakdown|null=serverQuote?.pricing??null;let pricingError=serverQuote?.error??"";
  // First paint only with the live nightly rates for these dates; never a default rate.
  if(!pricing&&!serverQuote)try{if(body&&inventory?.nightlyRates?.length)pricing=calculateBookingPrice(body,0,{nightlyRates:inventory.nightlyRates,deferPromo:true});}catch(caught){pricingError=caught instanceof Error?caught.message:"Configured price could not be calculated.";}
  const quoting=Boolean(body)&&!serverQuote;
  return (
    <form className="tj-book__step" onSubmit={onSubmit} noValidate>
      <StepHeading title="Your details" copy="The booking contact, any requests, then the total and secure payment."/>
      <div className="tj-book__fields">
        <label className="tj-field"><span>First name *</span><input autoComplete="given-name" required value={draft.guest.firstName} onChange={e=>update("firstName",e.target.value)}/></label>
        <label className="tj-field"><span>Last name</span><input autoComplete="family-name" value={draft.guest.lastName} onChange={e=>update("lastName",e.target.value)}/></label>
        <label className="tj-field"><span>Phone *</span><input type="tel" autoComplete="tel" required value={draft.guest.phone} onChange={e=>update("phone",e.target.value)}/></label>
        <label className="tj-field"><span>Email *</span><input type="email" autoComplete="email" required value={draft.guest.email} onChange={e=>update("email",e.target.value)}/></label>
        <label className="tj-field tj-book__wide"><span>Special requests · optional</span><textarea rows={3} value={draft.guest.specialRequests} onChange={e=>update("specialRequests",e.target.value)} placeholder="Airport pickup, early arrival, celebration note…"/></label>
      </div>
      <details className="tj-accordion__item tj-book__optional">
        <summary><span>Extras & arrival details · optional</span><span className="tj-accordion__icon" aria-hidden="true"/></summary>
        <div className="tj-chip-row tj-chip-row--start">
          {bookingConfig.addons.map(addon=>{const active=draft.addonIds.includes(addon.id);return <button type="button" key={addon.id} className="tj-chip" aria-pressed={active} onClick={()=>setDraft(c=>({...c,addonIds:active?c.addonIds.filter(id=>id!==addon.id):[...c.addonIds,addon.id]}))}>{addon.label} · {addon.onlineBookable&&addon.price!=null?formatMoney(addon.price):"on request"}</button>;})}
        </div>
        <label className="tj-field tj-book__wide"><span>Arrival notes · optional</span><textarea rows={2} value={draft.guest.arrivalNotes??""} onChange={e=>update("arrivalNotes",e.target.value)} placeholder="Approximate arrival time or anything the front desk should know"/></label>
      </details>
      <label className="tj-field tj-book__promo"><span>Promo code · optional</span><input value={draft.promoCode??""} onChange={e=>setDraft(c=>({...c,promoCode:e.target.value.toUpperCase().slice(0,64)}))} placeholder="Enter code"/></label>
      {pricingError?<p className="tj-form-error">{pricingError}</p>:null}
      <PriceBreakdownRows pricing={pricing} rooms={draft.stay.rooms} quoting={quoting}/>
      <NextSteps/>
      <label className="tj-check"><input type="checkbox" checked={draft.acknowledgement} onChange={e=>setDraft(c=>({...c,acknowledgement:e.target.checked}))}/><span>I have reviewed the stay details and configured total. The reservation becomes confirmed after successful payment verification.</span></label>
      <PillButton type="submit" variant="lake" dot className="tj-pill--block" disabled={submitting||quoting||Boolean(pricingError)||!pricing}>{submitting?"Creating secure hold…":"Hold room & continue to payment"}</PillButton>
    </form>
  );
}

function StepHeading({title,copy}:{title:string;copy:string}){return <header className="tj-book__step-head"><h2 className="tj-subheading">{title}</h2><p>{copy}</p></header>;}
function NumberField({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(v:number)=>void}){return <div className="tj-stepper"><strong>{label}</strong><div className="tj-stepper__controls"><CircleButton icon="minus" label={`Fewer ${label.toLowerCase()}`} disabled={value<=min} onClick={()=>onChange(Math.max(min,value-1))}/><output aria-live="polite" aria-label={label}>{value}</output><CircleButton icon="plus" label={`More ${label.toLowerCase()}`} disabled={value>=max} onClick={()=>onChange(Math.min(max,value+1))}/></div></div>;}
function ReviewRow({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div data-strong={strong||undefined}><dt>{label}</dt><dd>{value}</dd></div>;}
