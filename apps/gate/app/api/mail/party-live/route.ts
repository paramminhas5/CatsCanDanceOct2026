/**
 * POST { slug }: email the host their "your party is live" note with the share link (plan section 9).
 * Only the signed-in host of that party gets it, at their own sign-in address.
 */
import { NextResponse } from "next/server";
import { productUrl } from "@ccd/brand";
import { getMember, supabaseServer } from "@/lib/supabase/server";
import { partyLive, send } from "@/lib/mailer";
import { dayLong } from "@/components/app/ui";

export async function POST(req: Request) {
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.json({ ok: false }, { status: 400 });
  const { user, member } = await getMember();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = await supabaseServer();
  const { data: ev } = await sb.from("events").select("slug,title,event_date,start_time,host_id,listed").eq("slug", slug).maybeSingle();
  const e = ev as { slug: string; title: string; event_date: string | null; start_time: string | null; host_id: string | null; listed: boolean | null } | null;
  if (!e || e.host_id !== user.id) return NextResponse.json({ ok: false }, { status: 403 });
  const base = productUrl("gate");
  const r = await send(user.email, partyLive({
    name: member?.display_name ?? undefined, party: e.title, when: [dayLong(e.event_date), e.start_time?.slice(0, 5)].filter(Boolean).join(", "),
    link: `${base}/i/${e.slug}`, manage: `${base}/parties`, listed: !!e.listed,
  }));
  return NextResponse.json({ ok: r.ok });
}
