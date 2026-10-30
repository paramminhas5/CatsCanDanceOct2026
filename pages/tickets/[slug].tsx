import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { payOrder } from "@/lib/razorpay-client";

type Tier = { id: string; name: string; price_inr: number; max_per_order: number; remaining: number };
const inp = "w-full border-4 border-ink bg-cream p-3 text-ink";

export default function Tickets() {
  const router = useRouter();
  const slug = String(router.query.slug ?? "");
  const [ev, setEv] = useState<{ title: string; event_date: string | null; venue: string | null } | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [f, setF] = useState({ name: "", email: "", phone: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.rpc("public_tiers", { p_slug: slug }).then(({ data }) => setTiers((data as Tier[]) ?? []));
    supabase.from("events").select("title,event_date,venue").eq("slug", slug).maybeSingle().then(({ data }) => setEv(data as any));
  }, [slug]);

  const total = tiers.reduce((s, t) => s + (qty[t.id] ?? 0) * t.price_inr, 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setBusy(true);
    try {
      const items = tiers.filter((t) => qty[t.id] > 0).map((t) => ({ tier: t.id, qty: qty[t.id] }));
      const { data, error } = await supabase.rpc("create_ticket_order", { p_slug: slug, p_name: f.name, p_email: f.email, p_phone: f.phone, p_items: items, p_source: "platform" });
      if (error || !data?.ok) throw new Error(data?.error ?? "Could not place the order.");
      if (!data.free) await payOrder("ticket", data.order_id, f, `${ev?.title ?? slug} tickets`);
      router.push(`/tickets/order?o=${data.order_id}&e=${encodeURIComponent(f.email)}`);
    } catch (err: any) { setMsg(err.message ?? "Something went wrong."); setBusy(false); }
  }

  return (
    <>
      <SEO title={`Tickets${ev ? ` · ${ev.title}` : ""}`} description="Book tickets for a Cats Can Dance night." path={`/tickets/${slug}`} />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="TICKETS" title={(ev?.title ?? "TICKETS").toUpperCase()} bg="bg-hot-red" textColor="text-cream" eyebrowColor="text-acid-yellow">
          <p>{[ev?.event_date, ev?.venue].filter(Boolean).join(" · ")}</p>
        </PageHero>
        <section className="container py-12 max-w-xl">
          {tiers.length === 0 ? <p className="border-4 border-ink p-6">Tickets are not on sale yet. Follow us on Instagram for the drop.</p> : (
            <form onSubmit={go} className="grid gap-4 border-4 border-ink p-6 bg-cream chunk-shadow">
              {tiers.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 border-b-2 border-ink pb-3">
                  <div><p className="font-display text-lg">{t.name}</p><p className="text-sm">{t.price_inr === 0 ? "Free" : `₹${t.price_inr}`} · {t.remaining > 0 ? `${t.remaining} left` : "Sold out"}</p></div>
                  <select disabled={t.remaining < 1} className="border-4 border-ink bg-cream p-2" value={qty[t.id] ?? 0} onChange={(e) => setQty({ ...qty, [t.id]: Number(e.target.value) })}>
                    {Array.from({ length: Math.min(t.max_per_order, t.remaining) + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              ))}
              <input className={inp} placeholder="Your name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <input className={inp} type="email" placeholder="Email (your tickets go here)" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              <input className={inp} placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <button disabled={busy || count === 0} className="font-display uppercase px-5 py-3 border-4 border-ink bg-acid-yellow text-ink disabled:opacity-50">
                {busy ? "Working..." : total === 0 ? `Get ${count || ""} free ticket${count > 1 ? "s" : ""}` : `Pay ₹${total}`}
              </button>
              {msg && <p className="text-sm text-red-600">{msg}</p>}
              <p className="text-xs text-ink/60">Your tickets show on the next page with a QR code for the door. Keep the link.</p>
            </form>
          )}
        </section>
        <Footer />
      </main>
    </>
  );
}
