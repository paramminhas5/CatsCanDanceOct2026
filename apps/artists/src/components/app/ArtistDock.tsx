"use client";
/** The artist app's dock (boards F38-A): Today, Shows, Bookings, Fans, Page. */
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = (d: string) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const TABS = [
  { href: "/me", label: "Today", d: "M4 11l8-6.5 8 6.5V20H4zM10 20v-5h4v5" },
  { href: "/me/tour", label: "Shows", d: "M3.5 6.5h17v13h-17zM3.5 10.5h17M8 3v4M16 3v4" },
  { href: "/bookings", label: "Bookings", d: "M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 13h5l1 2h4l1-2h5" },
  { href: "/me/fans", label: "Fans", d: "M9 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.5 19c.9-2.8 3-4.3 5.5-4.3s4.6 1.5 5.5 4.3M16.5 10.6a2.6 2.6 0 1 0 0-5.2M16 13.3c2.2.1 3.9 1.4 4.6 3.9" },
  { href: "/me/page", label: "Page", d: "M6 3.5h9l3 3V20.5H6zM9 10h6M9 13.5h6M9 17h4" },
];

export default function ArtistDock() {
  const path = usePathname();
  const cur = TABS.slice().sort((a, b) => b.href.length - a.href.length).find((t) => path === t.href || path.startsWith(`${t.href}/`))?.href ?? (path.startsWith("/me/contract") ? "/bookings" : "/me");
  return (
    <nav className="dock5" aria-label="Your artist app">
      {TABS.map((t) => <Link key={t.href} href={t.href} className={cur === t.href ? "on" : ""} aria-current={cur === t.href ? "page" : undefined}>{I(t.d)}{t.label}</Link>)}
    </nav>
  );
}
