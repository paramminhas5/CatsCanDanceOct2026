/**
 * The suite top nav and footer, shared by every app (boards W39-*, W40-Artist).
 * The product row is the banner: wordmark, the four products with their dots, sign in, one call to action.
 * Plain anchors so the package does not depend on a framework router.
 */
import { PRODUCTS, PRODUCT_ORDER, productUrl, type ProductId } from "@ccd/brand";
import { SuiteSub, type SubLink } from "./SuiteSub";
export type { SubLink };

/**
 * The switch on top of every app (v3, canvas "The switch, in every app"; Param, 10 Nov 2026:
 * "go out, learn and everything should be on top, everything below changes").
 * Desktop and tablet: four big tiles under the top bar, the current one filled with its colour (Param, 10 Nov:
 * "the nav should be bolder"). Phone: one pill that opens a sheet
 * (plain <details>, so it works with no JavaScript and in Server Components). `sub` is the app's own row.
 */
export function SuiteNav({ current, account, cta, sub }: { current: ProductId; account: { href: string; label: string }; cta?: { href: string; label: string }; sub?: SubLink[] }) {
  const here = PRODUCTS[current];
  const on = (id: ProductId) => (id === "ccd" ? "#fff" : "#0a0a0c");
  return (
    <header className="k-nav">
      <div className="k-wrap k-nav__row">
        <a href={productUrl("ccd")} className="k-nav__brand"><CcdMark />Cats Can Dance</a>
        <details className="k-switch-m">
          <summary style={{ ["--c" as string]: here.colour, ["--on" as string]: on(current) }} aria-label={`You're in ${here.navLabel}. Switch app`}>
            {/* The app you're in, not an action (Param, 13 Nov 2026: "why does Book artists have two submenus?").
                The pages of this app are the row underneath; this pill only switches app. */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></svg>
            {here.navLabel}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </summary>
          <div className="k-switch-m__sheet">
            <b className="k-switch-m__h">Switch app</b>
            {PRODUCT_ORDER.map((id) => {
              const p = PRODUCTS[id];
              const is = id === current;
              return (
                <a key={id} href={is ? "/" : productUrl(id)} aria-current={is ? "page" : undefined} style={{ ["--c" as string]: p.colour, ["--on" as string]: on(id) }}>
                  <i aria-hidden="true" />{p.navLabel}<span>{p.verb}</span>
                </a>
              );
            })}
          </div>
        </details>
        <span className="k-nav__gap" />
        <a href={account.href} className="k-btn k-btn--ghost k-btn--s">{account.label}</a>
        {cta && <a href={cta.href} className="k-btn k-btn--key k-btn--s k-nav__cta">{cta.label}</a>}
      </div>
      <nav aria-label="Cats Can Dance apps" className="k-wrap k-tiles">
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          const is = id === current;
          return (
            <a key={id} href={is ? "/" : productUrl(id)} aria-current={is ? "page" : undefined} className="k-tile" style={{ ["--c" as string]: p.colour, ["--on" as string]: on(id) }}>
              <i aria-hidden="true" /><span><b>{p.verb}</b><small>{TILE_LINE[id]}</small></span>
            </a>
          );
        })}
      </nav>
      {sub && sub.length > 0 && <SuiteSub links={sub} label={here.navLabel} colour={here.colour} />}
    </header>
  );
}

/** The line under each app on the switch tiles. */
export const TILE_LINE: Record<ProductId, string> = {
  ccd: "Nights · what's on, crews, tickets",
  artists: "Artists · every record, every era",
  gate: "Host · page, tickets, door, report",
  school: "School · make music on a real instrument",
};

/** The Cats Can Dance logo: the black and white circle (Param, 11 Nov 2026: "the CCD logo is the circle, not the cat").
 *  Served from the CCD site so every app shows the same file; inverted to read white on the dark bar. */
function CcdMark() {
  return <img src={`${productUrl("ccd")}/ccd-logo.png`} alt="" width={26} height={26} className="k-nav__cat" style={{ objectFit: "contain", filter: "invert(1)", verticalAlign: "middle", marginRight: 8 }} />;
}

/** The white cat, reduced to a mark: ears, head, a wink. Kept for places that want the cat. */
export function CatGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden="true" className="k-nav__cat">
      <path fill="currentColor" d="M2 2.2 5 5h6l3-2.8V9.5A5.5 5.5 0 0 1 8.5 15h-1A5.5 5.5 0 0 1 2 9.5Z" />
      <circle cx="5.6" cy="9" r="1" fill="#0a0a0c" />
      <path d="M9.4 9h2" stroke="#0a0a0c" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SuiteFooter({ current, links, email = "hello@catscandance.com" }: { current: ProductId; links: Record<ProductId, [string, string][]>; email?: string }) {
  return (
    <footer className="k-footer">
      <div className="k-wrap k-footer__grid">
        <div>
          <span className="k-d k-footer__brand">Cats Can Dance</span>
          <p className="k-b">One sign-in for all four.</p>
          <a href={`mailto:${email}`} className="k-b">{email}</a>
          <div className="k-footer__head" style={{ marginTop: 22 }}>Work with us</div>
          <ul>
            {WORK_WITH_US.map(([label, path]) => <li key={label}><a href={`${current === "ccd" ? "" : productUrl("ccd")}${path}`}>{label}</a></li>)}
          </ul>
        </div>
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          const base = id === current ? "" : productUrl(id);
          return (
            <nav key={id} aria-label={p.navLabel}>
              <div className="k-footer__head"><i aria-hidden="true" style={{ background: p.colour }} />{p.navLabel}</div>
              <div className="k-m">{new URL(p.url).host}</div>
              <ul>
                {(links[id] ?? []).map(([label, path]) => <li key={label}><a href={`${base}${path}`}>{label}</a></li>)}
              </ul>
            </nav>
          );
        })}
      </div>
    </footer>
  );
}

/** The pages for people who work with us, on catscandance.com. */
export const WORK_WITH_US: [string, string][] = [["For artists", "/for-artists"], ["For venues", "/for-venues"], ["For promoters", "/for-promoters"], ["For brands", "/for-brands"], ["For gear owners", "/for-gear"]];

/** Footer links per product. Only routes that exist. */
export const SUITE_LINKS: Record<ProductId, [string, string][]> = {
  ccd: [["This week", "/nights"], ["What's on", "/whats-on"], ["Your tickets", "/me"]],
  artists: [["All artists", "/artists"], ["On tour", "/tour"], ["Book for a date", "/artists?mode=book"], ["Claim your page", "/claim"]],
  gate: [["Make a party", "/make"], ["Your parties", "/parties"], ["Run the door", "/door"], ["Gear", "/gear"]],
  school: [["Lesson 1", "/learn"], ["Production", "/learn"], ["DJing", "/learn"]],
};
