/**
 * The suite top nav and footer, shared by every app (boards W39-*, W40-Artist).
 * The product row is the banner: wordmark, the four products with their dots, sign in, one call to action.
 * Plain anchors so the package does not depend on a framework router.
 */
import { PRODUCTS, PRODUCT_ORDER, productUrl, type ProductId } from "@ccd/brand";

export function SuiteNav({ current, account, cta }: { current: ProductId; account: { href: string; label: string }; cta?: { href: string; label: string } }) {
  return (
    <header className="k-nav">
      <div className="k-wrap k-nav__row">
        <a href={productUrl("ccd")} className="k-nav__brand">Cats Can Dance</a>
        <nav aria-label="Cats Can Dance products" className="k-nav__products">
          {PRODUCT_ORDER.map((id) => {
            const p = PRODUCTS[id];
            const here = id === current;
            return (
              <a key={id} href={here ? "/" : productUrl(id)} aria-current={here ? "true" : undefined}>
                <i aria-hidden="true" style={{ background: p.colour }} />
                {p.navLabel}
              </a>
            );
          })}
        </nav>
        <a href={account.href} className="k-btn k-btn--ghost k-btn--s">{account.label}</a>
        {cta && <a href={cta.href} className="k-btn k-btn--key k-btn--s k-nav__cta">{cta.label}</a>}
      </div>
    </header>
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
