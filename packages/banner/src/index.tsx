import * as React from "react";
import { PRODUCTS, PRODUCT_ORDER, productUrl, type ProductId } from "@ccd/brand";

/**
 * The Cats Can Dance banner.
 *
 * A 36px strip that sits above every product's own navigation and says: this is one of
 * the Cats Can Dance products, here are the others, here is your account. It has no
 * client-side state so it renders in Server Components and in plain React alike.
 *
 * Usage:
 *   import { CcdBanner } from "@ccd/banner";
 *   import "@ccd/banner/banner.css";
 *   <CcdBanner current="artists" account={{ signedIn: false, href: "/sign-in" }} />
 */
export type BannerProps = {
  /** Which product is rendering the banner. */
  current: ProductId;
  /** Account link. When signed in, show the person's first name. */
  account?: { signedIn: boolean; href: string; name?: string | null };
  /** Override product URLs (tests, previews). Defaults to env or production URLs. */
  urls?: Partial<Record<ProductId, string>>;
  className?: string;
};

export function CcdBanner({ current, account, urls, className }: BannerProps) {
  const currentProduct = PRODUCTS[current];
  return (
    <nav className={["ccd-banner", className].filter(Boolean).join(" ")} aria-label="Cats Can Dance products">
      <a className="ccd-banner__home" href={urls?.ccd ?? productUrl("ccd")} title="Cats Can Dance">
        <CatMark />
        <span>Cats Can Dance</span>
      </a>
      <ul className="ccd-banner__products">
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          const href = id === current ? "/" : urls?.[id] ?? productUrl(id);
          return (
            <li key={id}>
              <a
                className="ccd-banner__product"
                href={href}
                aria-current={id === current ? "true" : undefined}
                style={{ ["--dot" as string]: p.colour }}
              >
                <span className="ccd-banner__dot" aria-hidden="true" />
                <span className="ccd-banner__verb">{p.verb}</span>
                <span>{id === "ccd" ? "Nights" : p.name}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <span className="ccd-banner__promise">{currentProduct.promise}</span>
      {account ? (
        <a className="ccd-banner__account" href={account.href}>
          {account.signedIn ? account.name || "Your account" : "Sign in"}
        </a>
      ) : null}
    </nav>
  );
}

/** The CCD cat, reduced to a 16px mark: ears, head, a wink. Inherits currentColor. */
export function CatMark({ size = 16 }: { size?: number }) {
  return (
    <svg className="ccd-banner__cat" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 2.2 5 5h6l3-2.8V9.5A5.5 5.5 0 0 1 8.5 15h-1A5.5 5.5 0 0 1 2 9.5Z"
      />
      <circle cx="5.6" cy="9" r="1" fill="var(--banner-bg, #0a0a0c)" />
      <path d="M9.4 9h2" stroke="var(--banner-bg, #0a0a0c)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default CcdBanner;
