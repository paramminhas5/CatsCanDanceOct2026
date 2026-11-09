import { PRODUCTS, PRODUCT_ORDER, productUrl, type ProductId } from "@ccd/brand";
import { CONTACT_EMAIL } from "@/lib/site";

/** Each product's footer links. Only routes that exist today; Gear joins Host when it is built. */
const LINKS: Record<ProductId, [string, string][]> = {
  ccd: [["This week", "/nights"], ["What's on", "/whats-on"], ["Your tickets", "/me"]],
  artists: [["All artists", "/artists"], ["On tour", "/tour"], ["Book for a date", "/artists"], ["Claim your page", "/claim"]],
  gate: [["Host a night", "/promote"], ["Run the door", "/door"]],
  school: [["Lesson 1", "/learn"], ["Production", "/learn"], ["DJing", "/learn"]],
};

export default function Footer() {
  return (
    <footer className="mt-32 border-t border-[var(--k-hair)]">
      <div className="k-wrap grid gap-8 py-12 sm:grid-cols-2 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <span className="k-d text-[20px] uppercase">Cats Can Dance</span>
          <p className="k-b mt-2.5 text-sm">One sign-in for all four.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="k-b mt-4 block text-sm">{CONTACT_EMAIL}</a>
        </div>
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          const base = id === "artists" ? "" : productUrl(id);
          return (
            <nav key={id} aria-label={p.navLabel}>
              <div className="flex items-center gap-2"><i aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: p.colour }} /><span className="font-semibold">{p.navLabel}</span></div>
              <div className="k-m mt-1.5 normal-case tracking-normal">{new URL(p.url).host}</div>
              <ul className="mt-3.5 grid list-none gap-2 p-0">
                {LINKS[id].map(([label, path]) => (
                  <li key={label}><a href={`${base}${path}`} className="text-sm no-underline" style={{ color: "var(--k-t2)" }}>{label}</a></li>
                ))}
              </ul>
            </nav>
          );
        })}
      </div>
    </footer>
  );
}
