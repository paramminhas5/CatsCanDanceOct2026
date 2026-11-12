/**
 * Renders a page straight from the final preview boards (packages/ui/src/boards/*.ts), so the built
 * pages are the boards: same markup, same CSS (board.css), same scroll motion. Data sections are
 * {{TOKENS}} the page fills with HTML built from real data by the helpers below.
 */
import type { CSSProperties, ReactNode } from "react";

/** Escape text for the HTML templates. Every value from the database goes through this. */
export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** Only http(s) or same-site links go into an href. */
export const safeUrl = (u: string | null | undefined) => (u && (/^https?:\/\//i.test(u) || u.startsWith("/")) ? esc(u) : "#");

export function fill(t: string, tokens: Record<string, string>) {
  return t.replace(/\{\{([A-Z]+)\}\}/g, (m, k: string) => (k in tokens ? tokens[k] : m));
}

/** The board's section heading. */
export const h2 = (t: string, sub?: string, right = "") =>
  `<div class="row rv" style="align-items: flex-end; gap: 32px"><div style="flex: 1"><div class="d" style="font-size: 64px">${t}</div>${sub ? `<div class="b" style="font-size: 18px; margin-top: 14px; max-width: 680px">${sub}</div>` : ""}</div>${right}</div>`;

export const keyLink = (href: string, label: string, size: "s" | "l" = "s") =>
  `<a class="key ${size === "s" ? "sm" : "hero-key"}" href="${href}">${esc(label)}</a>`;

/**
 * The page frame. `parts` are the board's sections (HTML or tokens); `slots` fill the tokens that stand
 * alone, either as HTML strings or as React nodes (for forms and anything interactive).
 */
export function Board({ parts, tokens = {}, slots = {}, vars, before }: { parts: string[]; tokens?: Record<string, string>; slots?: Record<string, ReactNode | string>; vars: CSSProperties; before?: ReactNode }) {
  return (
    <>
      {before}
      <div className="v4 web" style={vars}>
        <div className="prog" aria-hidden="true" />
        {chunks(parts, slots).map((c, i) =>
          typeof c === "string"
            ? <div key={i} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: fill(c, tokens) }} />
            : <div key={i} style={{ display: "contents" }}>{c}</div>,
        )}
      </div>
    </>
  );
}

/**
 * Joins the board's parts and string slots into as few HTML chunks as possible. Board wrappers (the
 * fans/artists mode divs) open in one section and close in another, so splitting them across separate
 * containers would break the markup. Only React slots split a chunk.
 */
function chunks(parts: string[], slots: Record<string, ReactNode | string>): (string | ReactNode)[] {
  const out: (string | ReactNode)[] = [];
  let buf = "";
  for (const p of parts) {
    const slot = /^\{\{([A-Z]+)\}\}$/.exec(p)?.[1];
    const v = slot && slot in slots ? slots[slot] : p;
    if (typeof v === "string") buf += v;
    else { if (buf) out.push(buf); buf = ""; out.push(v); }
  }
  if (buf) out.push(buf);
  return out;
}

/** Product colour variables the boards expect on their root. */
export const boardVars = (pc: string, ink = "#0A0A0C"): CSSProperties =>
  ({ "--pc": pc, "--pi": ink, "--kc": pc, "--pd": `color-mix(in srgb, ${pc} 80%, #000)`, "--pdd": `color-mix(in srgb, ${pc} 62%, #000)`, "--pg": `color-mix(in srgb, ${pc} 45%, transparent)`, "--base": "#0A0A0B" } as CSSProperties);
