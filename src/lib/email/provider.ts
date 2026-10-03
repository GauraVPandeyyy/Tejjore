import "server-only";
import type { ReservationRecord } from "@/types/booking";
import { hotel } from "@/data/hotel";
import { rooms } from "@/data/rooms";
import { formatMoney } from "@/data/commerce";

export type EmailDelivery = {
  status: "sent" | "unavailable" | "failed";
  id?: string;
  error?: string;
};

type BrevoMessage = {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char] ?? char);
}

function formatGuests(reservation: ReservationRecord) {
  const adultText = `${reservation.stay.adults} adult${reservation.stay.adults === 1 ? "" : "s"}`;
  const childText = reservation.stay.children
    ? ` · ${reservation.stay.children} child${reservation.stay.children === 1 ? "" : "ren"}`
    : "";
  return `${adultText}${childText} · ${reservation.stay.rooms} room${reservation.stay.rooms === 1 ? "" : "s"}`;
}

function emailShell(content: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f0e8;color:#173238;font-family:Arial,Helvetica,sans-serif;line-height:1.55">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0e8;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fffdf8;border-radius:24px;overflow:hidden;border:1px solid #e5dfd2">
            <tr>
              <td style="background:#073f44;padding:26px 32px;color:#f4ead1">
                <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase">TEJJORA LAKE VIEW</div>
                <div style="font-size:11px;letter-spacing:.12em;opacity:.72;margin-top:5px">A BOUTIQUE HOTEL · GOMTI NAGAR, LUCKNOW</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px">${content}</td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f7f4ec;color:#667477;font-size:12px">
                ${escapeHtml(hotel.name)} · ${escapeHtml(hotel.phoneDisplay)}<br/>
                ${escapeHtml(hotel.address.line1)}, ${escapeHtml(hotel.address.locality)}, ${escapeHtml(hotel.address.city)}, ${escapeHtml(hotel.address.state)} ${escapeHtml(hotel.address.postalCode)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailRows(reservation: ReservationRecord) {
  const room = rooms.find((item) => item.id === reservation.roomId);
  const rows = [
    ["Booking reference", reservation.reference],
    ["Room", room?.name ?? reservation.roomId],
    ["Check-in", reservation.stay.checkIn],
    ["Check-out", reservation.stay.checkOut],
    ["Guests", formatGuests(reservation)],
    ["Total", formatMoney(reservation.pricing.grandTotal)],
    ["Amount due", formatMoney(reservation.pricing.amountDue)],
  ];

  return rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #ece6db;color:#6c797a;font-size:13px">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #ece6db;text-align:right;color:#173238;font-size:13px;font-weight:700">${escapeHtml(value)}</td>
    </tr>`).join("");
}

async function sendBrevoEmail(message: BrevoMessage): Promise<EmailDelivery> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.BOOKING_EMAIL_FROM?.trim();
  const fromName = process.env.BOOKING_EMAIL_FROM_NAME?.trim() || "Tejjora Lake View";
  const replyTo = process.env.BOOKING_EMAIL_REPLY_TO?.trim();

  if (!apiKey || !fromEmail) return { status: "unavailable" };

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: message.toEmail, name: message.toName }],
    subject: message.subject,
    htmlContent: message.htmlContent,
    ...(replyTo ? { replyTo: { email: replyTo, name: fromName } } : {}),
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        status: "failed",
        error: `Brevo ${response.status}: ${text.slice(0, 240)}`,
      };
    }

    const data = await response.json().catch(() => ({})) as { messageId?: string };
    return { status: "sent", id: data.messageId };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Email delivery failed",
    };
  }
}

export async function sendBookingReceivedEmail(reservation: ReservationRecord): Promise<EmailDelivery> {
  const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();
  const safeGuestName = escapeHtml(guestName || reservation.guest.firstName);
  const subject = `Booking received · ${reservation.reference} · ${hotel.shortName}`;

  const htmlContent = emailShell(`
    <p style="margin:0 0 8px;color:#8b7655;font-size:12px;letter-spacing:.14em;text-transform:uppercase">BOOKING RECEIVED</p>
    <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.12;font-weight:500;color:#173238">We have received your stay request.</h1>
    <p style="margin:0 0 16px">Hello ${safeGuestName},</p>
    <p style="margin:0 0 22px">Your booking request has reached ${escapeHtml(hotel.name)}. We have created the reference below and temporarily held the requested inventory according to the booking flow.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0">
      ${detailRows(reservation)}
    </table>

    <div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:#fff5df;border:1px solid #ecd8a8;color:#604d25;font-size:13px">
      <strong>Important:</strong> This email confirms that your booking request was received. It is not the final booking confirmation. Your stay becomes confirmed after successful payment verification and the reservation status changes to confirmed.
    </div>

    <p style="margin:20px 0 0;font-size:13px;color:#647275">Keep your booking reference <strong>${escapeHtml(reservation.reference)}</strong> for payment, support and booking retrieval.</p>
  `);

  return sendBrevoEmail({
    toEmail: reservation.guest.email,
    toName: guestName,
    subject,
    htmlContent,
  });
}

export async function sendBookingConfirmationEmail(reservation: ReservationRecord): Promise<EmailDelivery> {
  const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();
  const safeGuestName = escapeHtml(guestName || reservation.guest.firstName);
  const subject = `Booking confirmed · ${reservation.reference} · ${hotel.shortName}`;

  const htmlContent = emailShell(`
    <p style="margin:0 0 8px;color:#8b7655;font-size:12px;letter-spacing:.14em;text-transform:uppercase">BOOKING CONFIRMED</p>
    <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.12;font-weight:500;color:#173238">Your stay is confirmed.</h1>
    <p style="margin:0 0 16px">Hello ${safeGuestName},</p>
    <p style="margin:0 0 22px">Your payment has been verified and your reservation at ${escapeHtml(hotel.name)} is confirmed.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0">
      ${detailRows(reservation)}
      <tr>
        <td style="padding:10px 0;color:#6c797a;font-size:13px">Paid</td>
        <td style="padding:10px 0;text-align:right;color:#173238;font-size:13px;font-weight:700">${escapeHtml(formatMoney(reservation.pricing.amountPaid))}</td>
      </tr>
    </table>

    <div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:#eaf4ef;border:1px solid #bfd8cc;color:#244d3d;font-size:13px">
      Your booking is confirmed. Keep this email and your booking reference for check-in assistance or future support.
    </div>
  `);

  return sendBrevoEmail({
    toEmail: reservation.guest.email,
    toName: guestName,
    subject,
    htmlContent,
  });
}
