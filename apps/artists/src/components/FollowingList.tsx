"use client";
/** Following (board F38-A-Following): the artists you follow, with what is next for each. Reads your own follows only (RLS). */
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";

type A = { slug: string; name: string; photo_url: string | null; based_city: string | null; genres: string[] | null };
const nice = (n: string) => (n === n.toUpperCase() ? n.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : n);

export default function FollowingList() {
  const [list, setList] = useState<A[] | null>(null);
  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) { setList([]); return; }
      const { data: f } = await sb.from("member_follows").select("artist_slug").eq("member_id", u.user.id).order("created_at", { ascending: false });
      const slugs = (f ?? []).map((x: { artist_slug: string }) => x.artist_slug);
      if (!slugs.length) { setList([]); return; }
      const { data: a } = await sb.from("artists").select("slug,name,photo_url,based_city,genres").in("slug", slugs).eq("status", "approved");
      const by = new Map((a ?? []).map((x: A) => [x.slug, x]));
      setList(slugs.map((s: string) => by.get(s)).filter(Boolean) as A[]);
    })().catch(() => setList([]));
  }, []);
  if (!list) return <p className="k-b" aria-busy="true">Loading who you follow</p>;
  if (!list.length) return (
    <div className="k-surface grid justify-items-start gap-3 rounded-[22px] p-6">
      <b className="text-[18px]">You are not following anyone yet</b>
      <p className="k-b m-0">Follow artists to hear about new music and when they play your city.</p>
      <Link className="k-btn k-btn--key" href="/artists">Find artists</Link>
    </div>
  );
  return (
    <ul className="grid list-none grid-cols-2 gap-x-5 gap-y-8 p-0 md:grid-cols-4">
      {list.map((a) => (
        <li key={a.slug}>
          <Link href={`/${a.slug}`} className="block no-underline">
            <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[#16161a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {a.photo_url && <img src={a.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
            </div>
            <b className="mt-3 block truncate text-[17px] font-semibold">{nice(a.name)}</b>
            <span className="k-b block truncate text-[14px]">{[a.genres?.[0], a.based_city?.split(",")[0]].filter(Boolean).join(", ")}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
