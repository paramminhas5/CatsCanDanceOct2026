import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { payOrder } from "@/lib/razorpay-client";

type P = { id: string; slug: string; name: string; description: string | null; price_inr: number; images: string[]; sizes: string[]; in_stock: boolean };
type Line = { product: string; size: string; qty: number };
const inp = "w-full border-4 border-ink bg-cream p-3 text-ink";
const btn = "font-display uppercase px-4 py-2 border-4 border-ink bg-acid-yellow text-ink";

export default function Shop() {
  const [products, setProducts] = useState<P[]>([]);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [bag, setBag] = useState<Line[]>([]);
  const [f, setF] = useState({ name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", pin: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.rpc("public_products").then(({ data }) => setProducts((data as P[]) ?? []));
    try { setBag(JSON.parse(localStorage.getItem("ccd_bag") ?? "[]")); } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("ccd_bag", JSON.stringify(bag)); } catch { /* ignore */ } }, [bag]);

  const byId = (id: string) => products.find((p) => p.id === id);
  const total = bag.reduce((s, l) => s + (byId(l.product)?.price_inr ?? 0) * l.qty, 0);

  function add(p: P) {
    const size = sizes[p.id] ?? p.sizes[0] ?? "";
    if (p.sizes.length && !size) return setMsg("Pick a size.");
    setMsg("");
    setBag((b) => {
      const i = b.findIndex((l) => l.product === p.id && l.size === size);
      if (i >= 0) return b.map((l, k) => (k === i ? { ...l, qty: Math.min(5, l.qty + 1) } : l));
      return [...b, { product: p.id, size, qty: 1 }];
    });
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_shop_order", {
        p_name: f.name, p_email: f.email, p_phone: f.phone,
        p_address: { line1: f.line1, line2: f.line2, city: f.city, state: f.state, pin: f.pin }, p_items: bag,
      });
      if (error || !data?.ok) throw new Error(data?.error ?? "Could not place the order.");
      await payOrder("shop", data.order_id, f, "Cats Can Dance shop");
      setBag([]); setDone(true);
    } catch (err: any) { setMsg(err.message ?? "Something went wrong."); }
    setBusy(false);
  }

  return (
    <>
      <SEO title="Shop" description="Cats Can Dance merch and drops. Ships across India." path="/scratch" />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="WEAR · SCRATCH" title="THE SHOP." bg="bg-acid-yellow" textColor="text-ink" eyebrowColor="text-hot-red"><p>Small drops. Ships across India.</p></PageHero>
        <section className="container py-12 grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            {done && <p className="border-4 border-ink bg-acid-yellow p-4 mb-6 font-display">Order placed. Check your email. We will ship in 3 to 5 days.</p>}
            {products.length === 0 ? <p className="border-4 border-ink p-6">The next drop is coming. Follow us on Instagram.</p> : (
              <ul className="grid gap-6 sm:grid-cols-2">
                {products.map((p) => (
                  <li key={p.id} className="border-4 border-ink bg-cream chunk-shadow">
                    {p.images[0] && <img src={p.images[0]} alt={p.name} className="w-full aspect-square object-cover border-b-4 border-ink" loading="lazy" />}
                    <div className="p-4 grid gap-2">
                      <p className="font-display text-xl">{p.name}</p>
                      <p>₹{p.price_inr}</p>
                      {p.description && <p className="text-sm">{p.description}</p>}
                      {p.sizes.length > 0 && <select className="border-4 border-ink bg-cream p-2" value={sizes[p.id] ?? p.sizes[0]} onChange={(e) => setSizes({ ...sizes, [p.id]: e.target.value })}>{p.sizes.map((s) => <option key={s}>{s}</option>)}</select>}
                      <button disabled={!p.in_stock} onClick={() => add(p)} className={`${btn} disabled:opacity-50`}>{p.in_stock ? "Add to bag" : "Sold out"}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside>
            <form onSubmit={checkout} className="border-4 border-ink bg-cream p-5 grid gap-3 chunk-shadow lg:sticky lg:top-24">
              <h2 className="font-display text-2xl">Your bag</h2>
              {bag.length === 0 ? <p className="text-sm">Empty.</p> : bag.map((l, i) => (
                <div key={i} className="flex justify-between text-sm gap-2">
                  <span>{byId(l.product)?.name} {l.size && `(${l.size})`} × {l.qty}</span>
                  <button type="button" className="underline" onClick={() => setBag(bag.filter((_, k) => k !== i))}>remove</button>
                </div>
              ))}
              {bag.length > 0 && (<>
                <p className="font-display">Total ₹{total}</p>
                <input className={inp} placeholder="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <input className={inp} type="email" placeholder="Email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                <input className={inp} placeholder="Phone" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                <input className={inp} placeholder="Address line 1" required value={f.line1} onChange={(e) => setF({ ...f, line1: e.target.value })} />
                <input className={inp} placeholder="Address line 2" value={f.line2} onChange={(e) => setF({ ...f, line2: e.target.value })} />
                <div className="grid grid-cols-2 gap-2"><input className={inp} placeholder="City" required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /><input className={inp} placeholder="State" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></div>
                <input className={inp} placeholder="Pin code" required inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value })} />
                <button disabled={busy} className={btn}>{busy ? "Working..." : `Pay ₹${total}`}</button>
              </>)}
              {msg && <p className="text-sm text-red-600">{msg}</p>}
            </form>
          </aside>
        </section>
        <Footer />
      </main>
    </>
  );
}
