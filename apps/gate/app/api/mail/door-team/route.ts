/**
 * POST { slug, email }: tell someone they were added to a night's door team (plan section 9).
 * Only a lead on that night can trigger it, and only for an email that is on the team.
 */
import { NextResponse } from "next/server";
import { productUrl } from "@ccd/brand";
import { getMember, supabaseServer } from "@/lib/supabase/server";
import { doorTeam, send } from "@/lib/mailer";
import { dayLong } from "@/components/app/ui";

type Setup = { ok?: boolean; team?: { email: string; joined: boolean }[] };

export async function POST(req: Request) {
  const { slug, email } = (await req.json().catch(() => ({}))) as { slug?: string; email?: string };
  const to = (email ?? "").trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return NextResponse.json({ ok: false }, { status: 400 });
  const { user, member } = await getMember();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = await supabaseServer();
  const { data } = await sb.rpc("door_setup", { p_slug: slug });
  const setup = (data ?? {}) as Setup;
  const onTeam = (setup.team ?? []).some((t) => t.email.toLowerCase() === to && !t.joined);
  if (!onTeam) return NextResponse.json({ ok: false }, { status: 403 });
  const { data: ev } = await sb.from("events").select("title,event_date").eq("slug", slug).maybeSingle();
  const e = ev as { title: string; event_date: string | null } | null;
  const r = await send(to, doorTeam({ night: e?.title ?? "the night", when: dayLong(e?.event_date) || "on the night", by: member?.display_name?.split(" ")[0] ?? undefined, link: `${productUrl("gate")}/door/${slug}` }));
  return NextResponse.json({ ok: r.ok });
}
