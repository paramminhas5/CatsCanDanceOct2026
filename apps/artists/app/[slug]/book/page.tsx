import { redirect } from "next/navigation";

/** /<slug>/book is the same ask as /book, with this artist picked. */
export default async function ArtistBook({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ date?: string }> }) {
  const { slug } = await params;
  const { date } = await searchParams;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) redirect("/artists?mode=book");
  redirect(`/book?a=${slug}${date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `&date=${date}` : ""}`);
}
