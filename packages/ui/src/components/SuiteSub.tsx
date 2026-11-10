"use client";
/** The app's own row under the switch. Marks the page you are on from the URL, so layouts need not know it. */
import { useEffect, useState } from "react";

export type SubLink = { href: string; label: string; here?: boolean };

export function SuiteSub({ links, label, colour }: { links: SubLink[]; label: string; colour: string }) {
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => { setPath(window.location.pathname); }, []);
  const best = path
    ? links.map((l) => l.href.split("?")[0]).filter((h) => path === h || (h !== "/" && path.startsWith(`${h}/`))).sort((a, b) => b.length - a.length)[0]
    : null;
  return (
    <nav aria-label={label} className="k-wrap k-nav__sub" style={{ ["--c" as string]: colour }}>
      {links.map((l) => {
        const here = l.here ?? (best !== null && l.href.split("?")[0] === best);
        return <a key={l.href} href={l.href} aria-current={here ? "page" : undefined}>{l.label}</a>;
      })}
    </nav>
  );
}
