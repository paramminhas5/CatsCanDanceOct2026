import Link from "next/link";
import { PRODUCTS, PRODUCT_ORDER, productUrl, type ProductId } from "@ccd/brand";
import { ButtonLink } from "@ccd/ui";
import type { Member } from "@/lib/auth";

/**
 * The suite top nav (boards W39-*, W40-Artist): the wordmark, the four products with their dots, sign in,
 * and one call to action. It replaces the separate banner: the product row is the banner now.
 */
export default function Nav({ member }: { member: Member | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--k-hair)] bg-[rgba(10,10,11,.86)] backdrop-blur-xl">
      <div className="k-wrap flex h-[68px] items-center gap-6 md:h-[76px]">
        <a href={productUrl("ccd")} className="flex flex-1 items-center gap-2.5 no-underline">
          <span className="k-d text-[17px] uppercase tracking-tight" style={{ letterSpacing: "-0.01em" }}>Cats Can Dance</span>
        </a>
        <nav aria-label="Cats Can Dance products" className="hidden items-center gap-7 md:flex">
          {PRODUCT_ORDER.map((id: ProductId) => {
            const p = PRODUCTS[id];
            const here = id === "artists";
            return (
              <a key={id} href={here ? "/" : productUrl(id)} aria-current={here ? "true" : undefined} className="flex items-center gap-2 text-[15px] font-medium no-underline" style={{ color: here ? "var(--k-tx)" : "var(--k-t2)" }}>
                <i aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: p.colour }} />
                {p.navLabel}
              </a>
            );
          })}
        </nav>
        <Link href={member ? "/me" : "/sign-in"} className="k-btn k-btn--ghost k-btn--s">
          {member ? member.display_name?.split(" ")[0] || "Your desk" : "Sign in"}
        </Link>
        <ButtonLink variant="key" size="s" href="/artists" className="hidden sm:inline-flex">Book for a date</ButtonLink>
      </div>
    </header>
  );
}
