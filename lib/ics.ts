"use client";

// "Add to my calendar": builds a standard .ics file the phone opens in its own
// calendar app (iPhone Calendar, Google Calendar, Outlook).

export type IcsEvent = {
  uid: string;
  title: string;
  /** ISO date-time, or YYYY-MM-DD for an all-day event. */
  start: string;
  end?: string;
  location?: string;
  description?: string;
  url?: string;
};

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const day = (s: string) => s.slice(0, 10).replace(/-/g, "");

// Long lines must be folded at 75 bytes; fold by characters with some slack for Hebrew.
function fold(line: string) {
  const chars = Array.from(line); // never split an emoji in half
  const out: string[] = [];
  for (let i = 0; i < chars.length; i += 30) out.push((i ? " " : "") + chars.slice(i, i + 30).join(""));
  return out.join("\r\n");
}

export function buildIcs(events: IcsEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CastIt//HE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    const allDay = e.start.length <= 10;
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@castit`, `DTSTAMP:${utc(new Date())}`);
    if (allDay) {
      const next = new Date(`${e.start.slice(0, 10)}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${day(e.start)}`, `DTEND;VALUE=DATE:${day(next.toISOString())}`);
    } else {
      const s = new Date(e.start);
      const end = e.end ? new Date(e.end) : new Date(s.getTime() + 60 * 60 * 1000);
      lines.push(`DTSTART:${utc(s)}`, `DTEND:${utc(end)}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    const desc = [e.description, e.url].filter(Boolean).join("\n");
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (!allDay) lines.push("BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Hands the file to the phone: it opens in the calendar app. */
export function addToCalendar(events: IcsEvent[], filename = "castit") {
  if (!events.length) return;
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename.replace(/[^\w\u0590-\u05FF -]/g, "").trim() || "castit"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const absUrl = (href?: string) => (href && typeof window !== "undefined" ? `${window.location.origin}${href}` : undefined);
