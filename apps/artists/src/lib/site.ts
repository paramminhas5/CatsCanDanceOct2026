/**
 * The product's name, URLs and route names in one place. The name comes from the brand registry
 * (it is a working name), never from a string in a component.
 */
import { LINKS, PRODUCTS, productLink, productUrl } from "@ccd/brand";

export const PRODUCT = PRODUCTS.artists;
export const NAME = PRODUCT.name;

/** This app's own origin: the Vercel URL on previews, NEXT_PUBLIC_SITE_URL or the production URL otherwise. */
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return productUrl("artists");
}

/** Absolute links into the other products. Never hard-coded. */
export const ccd = {
  home: () => productUrl("ccd"),
  night: (slug: string) => productLink("ccd", LINKS.ccd.night(slug)),
  tickets: (slug: string) => productLink("ccd", LINKS.ccd.tickets(slug)),
  whatsOn: () => productLink("ccd", LINKS.ccd.whatsOn),
  account: () => productLink("ccd", LINKS.ccd.account),
};
export const gate = { home: () => productUrl("gate"), promote: () => productLink("gate", LINKS.gate.promote) };

/** Top-level route names this app owns. A slug can never be one of these. */
export const RESERVED = new Set(["artists", "tour", "bookings", "claim", "sign-in", "desk", "api", "auth", "book", "club", "for-artists", "kit", "me", "following", "icon", "sitemap.xml", "robots.txt", "llms.txt", "favicon.ico", "_next"]);

export const paths = {
  artist: (slug: string) => `/${slug}`,
  epk: (slug: string) => `/${slug}/epk`,
  book: (slug: string) => `/${slug}/book`,
  thread: (id: string, key?: string | null) => `/bookings/${id}${key ? `?k=${key}` : ""}`,
  receipt: (id: string, key?: string | null) => `/bookings/${id}/confirmed${key ? `?k=${key}` : ""}`,
};

export const CONTACT_EMAIL = "hello@catscandance.com";
