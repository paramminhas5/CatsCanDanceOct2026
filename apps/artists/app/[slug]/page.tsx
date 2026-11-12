/**
 * The artist page is the one from the live catscandance.com (Param, 13 Nov 2026: "the artist page was better,
 * check out catscandance.com"). It lives in the Cats Can Dance app at /artists/<slug>; this address hands over
 * to it so every link lands on the same page. Booking (/<slug>/book), music and shows stay in this app.
 * The previous library-and-eras page is in git history (commit before this one) if it is wanted back.
 */
import { notFound, redirect } from "next/navigation";
import { productLink } from "@ccd/brand";
import { isSlug } from "@/lib/db";
import { RESERVED } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  if (!isSlug(slug) || RESERVED.has(slug)) notFound();
  redirect(productLink("ccd", `/artists/${slug}`));
}
