/** Small server pieces the Artists pages share. */
import Link from "next/link";
import type { ReactNode } from "react";
import { Cat } from "@ccd/ui";

/** A two-way switch made of links, so it works without JavaScript and the choice lives in the URL. */
export function Segmented({ items, label }: { items: { href: string; label: string; on: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex gap-1 rounded-full p-1.5" style={{ background: "rgba(255,255,255,.07)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.on ? "page" : undefined} className="inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold no-underline"
          style={i.on ? { background: "#f2f0eb", color: "#0a0a0b" } : { color: "var(--k-t2)" }}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function ArtistTile({ slug, name, photo, line, foot }: { slug: string; name: string; photo: string | null; line?: string | null; foot?: ReactNode }) {
  return (
    <div className="k-rvs">
      <Link href={`/${slug}`} className="block no-underline">
        <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[#16161a]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="absolute inset-0 grid place-items-center opacity-60"><Cat name="lime" height={90} move="still" /></div>
          )}
        </div>
        <b className="mt-3 block truncate text-[17px] font-semibold">{name}</b>
        {line && <span className="k-b block truncate text-[14px]">{line}</span>}
      </Link>
      {foot}
    </div>
  );
}

/** An empty state: one cat, one line, one way forward. */
export function Empty({ title, line, action }: { title: string; line: string; action?: ReactNode }) {
  return (
    <div className="k-surface grid justify-items-start gap-3 rounded-[22px] p-6">
      <Cat name="lime" height={64} />
      <b className="text-[18px] font-semibold">{title}</b>
      <p className="k-b m-0 max-w-[52ch]">{line}</p>
      {action}
    </div>
  );
}

export function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 border-t border-[var(--k-hair)] py-3 text-[15px]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--k-pc)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      {children}
    </li>
  );
}
