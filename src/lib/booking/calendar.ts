import { hotel } from "@/data/hotel";

/** `YYYY-MM-DD` → `YYYYMMDD` (an iCalendar all-day date). */
const icsDate = (value: string) => value.replaceAll("-", "");

/** Escapes text for an iCalendar property value (RFC 5545 §3.3.11). */
const icsText = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line to 75 octets (RFC 5545 §3.1); the hotel's text is ASCII-safe apart from "·". */
function fold(line: string) {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

/**
 * A one-event iCalendar file for a stay: an all-day span from check-in to check-out (the end date
 * is exclusive, which is exactly how a stay's check-out day works). No guest contact details are
 * included — only the reference, the room and the hotel's own address and phone.
 */
export function buildStayIcs({ reference, roomName, checkIn, checkOut, now = new Date() }: { reference: string; roomName: string; checkIn: string; checkOut: string; now?: Date }) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const address = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tejjora Lake View//Stay//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${reference}@tejjoralakeview`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(checkIn)}`,
    `DTEND;VALUE=DATE:${icsDate(checkOut)}`,
    `SUMMARY:${icsText(`Stay at ${hotel.name}`)}`,
    `LOCATION:${icsText(address)}`,
    `DESCRIPTION:${icsText(`${roomName}. Booking reference ${reference}. Hotel: ${hotel.phoneDisplay}.`)}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Saves the stay as a .ics file the guest can open in any calendar app (browser only). */
export function downloadStayCalendar(details: { reference: string; roomName: string; checkIn: string; checkOut: string }) {
  const blob = new Blob([buildStayIcs(details)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tejjora-stay-${details.reference}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
