/**
 * The invite your guests open (board H39-Invite): the party in its look, when and where, who is playing,
 * how many are going, and one button. Data from party_public (migration 063). Tickets link out when the
 * party sells them; otherwise "I am going" calls rsvp. Add to calendar is a real .ics file.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { productLink } from "@ccd/brand";
import Going, { ShareButton } from "@/components/app/Going";
import { HostApp, Icon, YELLOW, dayLong, lookOf } from "@/components/app/ui";
import { rpc } from "@/lib/rpc";

export const revalidate = 30;
type Party = { ok: boolean; slug: string; title: string; event_date: string | null; start_time: string | null; city: string | null; venue: string | null; blurb: string | null; lineup: string[] | null; look: string | null; ticket_url: string | null; rsvp_open: boolean | null; capacity: number | null; poster_url: string | null; is_party: boolean; host: string | null; going: number };

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const p = await rpc<Party | null>("party_public", { p_slug: slug }, 30).catch(() => null);
  return p?.ok ? p : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.title, description: [dayLong(p.event_date), p.venue, p.city].filter(Boolean).join(", ") || "You are invited.", robots: p.is_party ? { index: false } : undefined } : { title: "Not found" };
}

export default async function Invite({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const look = p.is_party ? lookOf(p.look) : { bg: YELLOW, ink: "#0A0A0A" };
  const dark = look.ink !== "#FFFFFF" && look.ink !== "#F2F0EB";
  const lineup = (p.lineup ?? []).filter(Boolean);
  const full = p.capacity != null && p.going >= p.capacity;
  const row = (icon: "cal" | "pin" | "note" | "music", title: string, sub?: React.ReactNode, href?: string) => {
    const inner = <><span style={{ opacity: 0.8 }}><Icon i={icon} /></span><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600, whiteSpace: "pre-line" }}>{title}</span>{sub && <span className="b" style={{ display: "block", fontSize: 13 }}>{sub}</span>}</span></>;
    return href ? <a href={href} className="rw rise" style={{ padding: "13px 0" }}>{inner}</a> : <div className="rw rise" style={{ padding: "13px 0" }}>{inner}</div>;
  };
  return (
    <HostApp dock={false} pc={look.bg} ink={look.ink}>
      <div style={{ position: "relative", minHeight: 300, background: look.bg, color: look.ink, padding: "72px 22px 24px", boxSizing: "border-box", overflow: "hidden" }}>
        {p.poster_url && <img src={p.poster_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35, mixBlendMode: "multiply" }} />}
        <div className="row" style={{ position: "absolute", left: 16, right: 16, top: 14 }}>
          <span className="pill" style={{ background: dark ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.18)", color: look.ink, boxShadow: "none" }}>You&rsquo;re invited</span>
          <span style={{ flex: 1 }} />
          <ShareButton title={p.title} dark={dark} />
        </div>
        <h1 className="d host-title" style={{ fontSize: p.title.length > 22 ? 48 : 62, color: look.ink, margin: 0, position: "relative" }}>{p.title}</h1>
        {p.host && <div className="row" style={{ gap: 10, marginTop: 18, position: "relative" }}><span className="cav" style={{ width: 32, height: 32, fontSize: 13, background: "linear-gradient(135deg, #7C4DFF, #FF2E93)" }}>{p.host[0].toUpperCase()}</span><span style={{ fontSize: 15, fontWeight: 600 }}>{p.host} is hosting</span></div>}
      </div>
      <div style={{ padding: "6px 20px 0" }}>
        {row("cal", `${dayLong(p.event_date) || "Date to come"}${p.start_time ? `, ${p.start_time.slice(0, 5)} till late` : ""}`, p.event_date ? "Add to calendar" : undefined, p.event_date ? `/i/${p.slug}/calendar` : undefined)}
        {(p.venue || p.city) && row("pin", [p.venue, p.city].filter(Boolean).join(", "))}
        {lineup.length > 0 && row("music", lineup.join(", "), "Playing")}
        {p.blurb && row("note", p.blurb)}
        <div className="hl" />
        <div className="row rise" style={{ gap: 12, marginTop: 14 }}>
          <span className="b" style={{ fontSize: 14 }}><b style={{ color: "var(--tx)" }}>{p.going} going</b>{p.capacity ? `, ${Math.max(0, p.capacity - p.going)} spots left` : ""}</span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 28 }} />
      <div style={{ padding: "0 16px 14px", position: "sticky", bottom: 0 }}>
        {p.ticket_url ? (
          <a className="key" href={p.ticket_url} target="_blank" rel="noopener" style={{ width: "100%", boxSizing: "border-box" }}>Get tickets</a>
        ) : p.rsvp_open ? (
          <Going slug={p.slug} look={look.bg} ink={look.ink} />
        ) : (
          <div className="b" style={{ textAlign: "center" }}>{full ? "It is full." : "The guest list is closed."}</div>
        )}
        <div className="b" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>
          {p.is_party ? <Link href="/" style={{ textDecoration: "none" }}>Made with Host by Cats Can Dance</Link> : <a href={productLink("ccd", `/nights/${p.slug}`)} style={{ textDecoration: "none" }}>See it on Nights</a>}
        </div>
      </div>
    </HostApp>
  );
}
