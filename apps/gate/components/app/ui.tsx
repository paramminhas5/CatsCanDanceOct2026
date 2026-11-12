/**
 * The Host app frame, drawn from the H39 phone boards: one phone-width column (full width on a phone,
 * centred on a computer) with the board's top bar, title, rows and the floating dock. Every class here is
 * a board class from @ccd/ui/board.css, so the screens match the final preview. Server-safe.
 */
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { boardVars } from "@ccd/ui";

export const YELLOW = "#FFE600";
export type Tab = "parties" | "guests" | "book" | "door";

const P = (d: string) => <path d={d} />;
export const ICON = {
  back: P("M15 6l-6 6 6 6"),
  next: P("M9 6l6 6-6 6"),
  check: P("M5 12.5l4.5 4.5L19 7.5"),
  plus: P("M12 5v14M5 12h14"),
  minus: P("M5 12h14"),
  share: P("M12 4v11M7 9l5-5 5 5M5 20h14"),
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  cal: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  pin: <><path d="M12 20.6s-6.4-5.5-6.4-10.6a6.4 6.4 0 0 1 12.8 0c0 5.1-6.4 10.6-6.4 10.6z" /><circle cx="12" cy="10" r="2.2" /></>,
  note: <><path d="M6 8h12l-1 12H7z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  home: <><path d="M4 11l8-6.5 8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></>,
  guests: <><circle cx="9" cy="9" r="3.2" /><path d="M3.5 19c.9-2.8 3-4.3 5.5-4.3s4.6 1.5 5.5 4.3" /><circle cx="16.5" cy="8" r="2.6" /><path d="M16 13.3c2.2.1 3.9 1.4 4.6 3.9" /></>,
  door: P("M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"),
  music: <><path d="M9 18V6l10-2v12" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="16" r="2" /></>,
};
export function Icon({ i, size = 18, stroke = 2, color = "currentColor" }: { i: keyof typeof ICON; size?: number; stroke?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[i]}</svg>;
}

/** The phone column. `pc` is the screen colour (Host yellow, or a party's look on the invite). */
export function HostApp({ children, tab, pc = YELLOW, ink = "#0A0A0A", amb, dock = true, style }: { children: ReactNode; tab?: Tab | null; pc?: string; ink?: string; amb?: string; dock?: boolean; style?: CSSProperties }) {
  return (
    <div className="dk host-stage">
      <div className="v4 app host-app" style={{ ...boardVars(pc, ink), ["--amb" as string]: amb ?? pc, "--base": "#050505", ...style } as CSSProperties}>
        <div className="host-amb" aria-hidden="true" />
        <div className={`host-body${dock ? " has-dock" : ""}`}>{children}</div>
        {dock && <Dock tab={tab ?? null} />}
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string; href: string; icon: keyof typeof ICON }[] = [
  { key: "parties", label: "Parties", href: "/parties", icon: "home" },
  { key: "guests", label: "Guests", href: "/guests", icon: "guests" },
  { key: "book", label: "Book", href: "/book", icon: "cal" },
  { key: "door", label: "Door", href: "/door", icon: "door" },
];
export function Dock({ tab }: { tab: Tab | null }) {
  return (
    <nav className="dock" aria-label="Host">
      {TABS.map((t) => <Link key={t.key} href={t.href} className={tab === t.key ? "on" : ""} aria-current={tab === t.key ? "page" : undefined}><Icon i={t.icon} size={20} stroke={1.8} />{t.label}</Link>)}
    </nav>
  );
}

/** The board's top bar: back on the left, a mono label (or anything) on the right. */
export function Top({ back, right, children }: { back?: string; right?: ReactNode; children?: ReactNode }) {
  return (
    <div className="top4">
      {back && <Link className="ic40" href={back} aria-label="Back" style={{ background: "none" }}><Icon i="back" /></Link>}
      {children}
      <span style={{ flex: 1 }} />
      {typeof right === "string" ? <span className="m">{right}</span> : right}
    </div>
  );
}

export function Title({ children, sub, size = 36 }: { children: ReactNode; sub?: ReactNode; size?: number }) {
  return (
    <div style={{ padding: "4px 20px 0", flex: "none" }}>
      <h1 className="d" style={{ fontSize: size, margin: 0 }}>{children}</h1>
      {sub && <div className="b" style={{ marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

/** One step of a party: a filled check when done, an empty ring when not. */
export function Step({ done, title, sub, href, action, external }: { done: boolean; title: string; sub: string; href: string; action?: string; external?: boolean }) {
  const inner = (
    <>
      <span className={`host-tick${done ? " on" : ""}`}>{done && <Icon i="check" size={12} stroke={3} />}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: done ? undefined : "var(--t3)" }}>{title}</span>
        <span className="b" style={{ display: "block", fontSize: 13 }}>{sub}</span>
      </span>
      {action ? <span className="pill" style={{ height: 28 }}>{action}</span> : <Icon i="next" size={14} color="rgba(242,240,235,.5)" />}
    </>
  );
  return external ? <a href={href} className="rw" style={{ padding: "11px 0" }}>{inner}</a> : <Link href={href} className="rw" style={{ padding: "11px 0" }}>{inner}</Link>;
}

/** Initials avatar in one of the board's gradients, picked from the name so it stays the same. */
const GRADS = ["#7C4DFF, #FF2E93", "#00E5FF, #2962FF", "#FF6A00, #FF2E93", "#00F5A0, #00B8FF", "#FF2E93, #FFB800"];
export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const n = (name || "?").trim();
  const g = GRADS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];
  return <span className="cav" style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: `linear-gradient(135deg, ${g})` }} aria-hidden="true">{n[0]?.toUpperCase()}</span>;
}

/** The board's three-up glass readout. */
export function Gls({ cells }: { cells: { label: string; value: ReactNode }[] }) {
  return <div className="gls">{cells.map((c) => <div key={c.label}><div className="m">{c.label}</div><div className="v">{c.value ?? "–"}</div></div>)}</div>;
}

export const dayShort = (d: string | null | undefined) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "Date to set");
export const dayLong = (d: string | null | undefined) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "");

/** The party looks a host can pick (migration 063). */
/** Party looks. The keys are what the database stores (063 accepts these five), so new looks reuse them.
 *  bg can be a gradient; solid is the one colour for buttons, glows and anything that needs a flat colour. */
export const LOOKS: Record<string, { bg: string; solid: string; ink: string; label: string }> = {
  pink: { bg: "linear-gradient(140deg,#FF4D8D 0%,#FF8A5B 100%)", solid: "#FF4D8D", ink: "#0A0A0B", label: "Bubblegum" },
  yellow: { bg: "linear-gradient(165deg,#FFE600 0%,#FF9F1C 58%,#FF4D8D 100%)", solid: "#FFE600", ink: "#0A0A0A", label: "Sunset" },
  lime: { bg: "linear-gradient(140deg,#C8F542 0%,#2EE6A6 100%)", solid: "#B6EF36", ink: "#0A0A0C", label: "Acid" },
  blue: { bg: "radial-gradient(110% 80% at 85% 0%,#8B5CF6 0%,transparent 60%),linear-gradient(165deg,#2563EB 0%,#0B1A4F 100%)", solid: "#2563EB", ink: "#FFFFFF", label: "Laser" },
  ink: { bg: "radial-gradient(55% 45% at 25% 18%,rgba(255,77,141,.55),transparent 70%),radial-gradient(55% 45% at 82% 85%,rgba(37,99,235,.6),transparent 70%),radial-gradient(40% 35% at 70% 30%,rgba(182,239,54,.25),transparent 70%),#0E0E12", solid: "#16161A", ink: "#F2F0EB", label: "Disco" },
};
export const lookOf = (l: string | null | undefined) => LOOKS[l && l in LOOKS ? l : "pink"];

/** In place of a screen that needs a session: the cat, one line, sign in. */
export function SignInCard({ next, title, line }: { next: string; title: string; line: string }) {
  return (
    <div style={{ padding: "24px 20px 0" }}>
      <div className="rise" style={{ borderRadius: 22, background: "var(--pc)", color: "var(--pi)", padding: "22px 18px", position: "relative", overflow: "hidden" }}>
        <img src="/cats/yellow.webp" alt="" style={{ position: "absolute", right: -6, bottom: -10, height: 120, animation: "bob 3.2s ease-in-out infinite" }} />
        <h1 className="d" style={{ fontSize: 34, color: "var(--pi)", maxWidth: 230, margin: 0 }}>{title}</h1>
        <div style={{ fontSize: 14, opacity: 0.75, marginTop: 6, maxWidth: 230 }}>{line}</div>
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="pill lg" style={{ marginTop: 16, background: "#0A0A0A", color: "#FFE600", boxShadow: "none", display: "inline-flex" }}>Sign in</Link>
      </div>
    </div>
  );
}

/** The Host top bar on a tab screen: the product switch on the left, Make a party on the right. */
export function HostTop() {
  return (
    <div className="top4">
      <Link href="/" className="sw"><i style={{ background: YELLOW, width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><img src="/cats/yellow.webp" alt="" style={{ height: 26, marginTop: 6 }} /></i>Host</Link>
      <span style={{ flex: 1 }} />
      <Link href="/make" className="pill lg" style={{ background: "var(--pc)", color: "var(--pi)", boxShadow: "none" }}><Icon i="plus" size={14} stroke={2.6} />Make a party</Link>
    </div>
  );
}
