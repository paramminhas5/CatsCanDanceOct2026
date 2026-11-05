/**
 * Add to calendar. GET /api/ics/<night key> returns an .ics file for a published scene night
 * (key "scene:<id>") or one of our own nights (key = slug). Public data only.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { select } from "@/lib/ccd-db";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Local IST date and "HH:MM" (or "9pm" style) to a UTC Date. Default 8 PM. */
function start(date: string, time: string | null): Date {
  let h = 20, m = 0;
  const t = (time ?? "").trim().toLowerCase();
  const a = t.match(/^(\d{1,2}):(\d{2})/);
  const b = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (b) { h = (Number(b[1]) % 12) + (b[3] === "pm" ? 12 : 0); m = Number(b[2] ?? 0); }
  else if (a) { h = Number(a[1]); m = Number(a[2]); }
  return new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = String(req.query.key ?? "");
  let title = "", venue = "", city = "", date = "", time: string | null = null, url = "https://catscandance.com/whats-on";
  if (key.startsWith("scene:")) {
    const id = key.slice(6);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).end();
    const [e] = await select<any>(`scraped_events?select=title,venue,city,event_date,event_time,ticket_url,url&status=eq.published&id=eq.${id}&limit=1`, 0).catch(() => []);
    if (!e?.event_date) return res.status(404).end();
    ({ title, venue, city } = { title: e.title, venue: e.venue ?? "", city: e.city ?? "" });
    date = e.event_date; time = e.event_time; url = e.ticket_url || e.url || url;
  } else {
    if (!/^[a-z0-9-]{1,80}$/.test(key)) return res.status(400).end();
    const [e] = await select<any>(`events?select=title,episode_no,venue,city,event_date,start_time&slug=eq.${key}&limit=1`, 0).catch(() => []);
    if (!e?.event_date) return res.status(404).end();
    title = e.episode_no ? `Cats Can Dance: Episode ${e.episode_no}` : e.title;
    venue = e.venue ?? ""; city = e.city ?? ""; date = e.event_date; time = e.start_time; url = `https://catscandance.com/nights/${key}`;
  }
  const s = start(date, time);
  const end = new Date(s.getTime() + 5 * 3600 * 1000);
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cats Can Dance//Nights//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${key.replace(/[^a-z0-9-]/gi, "")}@catscandance.com`,
    `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(s)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc([venue, city].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(`Your crew and ticket are on Your account: https://catscandance.com/me\nTickets and details: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM", "TRIGGER:-PT3H", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)} tonight`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="ccd-${key.replace(/[^a-z0-9-]/gi, "").slice(0, 40)}.ics"`);
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.send(body);
}
