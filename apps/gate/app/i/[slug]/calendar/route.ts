/** Add to calendar: an .ics file for the party, built from party_public. */
import { rpc } from "@/lib/rpc";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return new Response("Not found", { status: 404 });
  const p = await rpc<{ ok: boolean; title: string; event_date: string | null; start_time: string | null; venue: string | null; city: string | null; blurb: string | null } | null>("party_public", { p_slug: slug }).catch(() => null);
  if (!p?.ok || !p.event_date) return new Response("Not found", { status: 404 });
  const d = p.event_date.replace(/-/g, "");
  const t = /^\d{2}:\d{2}/.test(p.start_time ?? "") ? `${p.start_time!.slice(0, 2)}${p.start_time!.slice(3, 5)}00` : null;
  // Times are local to India; the end is four hours after the start (or the whole day when no time is set).
  const start = t ? `DTSTART;TZID=Asia/Kolkata:${d}T${t}` : `DTSTART;VALUE=DATE:${d}`;
  const endAt = t ? new Date(Date.parse(`${p.event_date}T${p.start_time!.slice(0, 5)}:00Z`) + 4 * 36e5).toISOString().replace(/[-:]/g, "").slice(0, 15) : null;
  const end = endAt ? `DTEND;TZID=Asia/Kolkata:${endAt}` : `DTEND;VALUE=DATE:${new Date(Date.parse(`${p.event_date}T00:00:00Z`) + 864e5).toISOString().slice(0, 10).replace(/-/g, "")}`;
  const url = `${new URL(req.url).origin}/i/${slug}`;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cats Can Dance//Host//EN", "BEGIN:VEVENT", `UID:${slug}@host.catscandance.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, start, end, `SUMMARY:${esc(p.title)}`, `LOCATION:${esc([p.venue, p.city].filter(Boolean).join(", "))}`, `DESCRIPTION:${esc(`${p.blurb ? `${p.blurb}\n\n` : ""}${url}`)}`, `URL:${url}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}.ics"` } });
}
