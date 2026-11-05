/**
 * Public route bases. The roster is called Artists and lives at /artists.
 * Until the redirect swap lands, /artists/:slug redirects to /litter/:slug, so links built
 * from here work before and after the rename.
 */
export const ARTISTS_BASE = "/artists";
export const BOOK_BASE = "/book";
export const BOOKINGS_BASE = "/bookings";
export const ARTIST_DESK = "/club/artist";

export const artistPath = (slug: string) => `${ARTISTS_BASE}/${encodeURIComponent(slug)}`;
export const threadPath = (id: string, key?: string | null) => `${BOOKINGS_BASE}/${id}${key ? `?k=${key}` : ""}`;
export const receiptPath = (id: string, key?: string | null) => `${BOOKINGS_BASE}/${id}/confirmed${key ? `?k=${key}` : ""}`;
