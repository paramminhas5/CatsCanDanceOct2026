/**
 * The Host front page, v3 (canvas board Host; plan ccd/v3-redesign.md). It sells the night, not the form:
 * your look cycling through colours, filling it (tiers or the list), booking the lineup on Artists, the
 * door that works with no signal, the morning report, and what it costs. Example numbers are labelled.
 */
import type { Metadata } from "next";
import { productLink } from "@ccd/brand";
import { supabaseAnon } from "@ccd/db";

export const metadata: Metadata = {
  title: "Host: the best app to throw a party",
  description: "A page in your colours, tickets or a guest list, a door that keeps working with no signal, and the whole night on one screen the next morning. Free parties stay free.",
};
export const revalidate = 3600;

async function faces() {
  try {
    const { data, count } = await supabaseAnon().from("artists").select("slug,name,photo_url", { count: "exact" }).eq("status", "approved").eq("featured", true).not("photo_url", "is", null).limit(5);
    return { list: (data ?? []) as { slug: string; name: string; photo_url: string }[], count: count ?? 0 };
  } catch {
    return { list: [], count: 0 };
  }
}

export default async function HostFront() {
  const { list } = await faces();
  return (
    <main className="hf">
      <section className="hf-wrap hf-two hf-hero">
        <div className="hf-copy">
          <span className="hf-eye">Host · gate.catscandance.com</span>
          <h1>The best night of your life deserves a better door.</h1>
          <p>Host is the app we run our own Episodes on. A page in your colours, tickets or a list, a door that never drops a guest, and the whole night on one screen the next morning.</p>
          <div className="hf-btns"><a className="hf-key" href="/make">Make a party, free</a><a className="hf-ghost" href="#door">See the door</a></div>
        </div>
        <div className="hf-look-wrap" aria-hidden="true">
          <div className="hf-look">
            <div className="hf-look-top"><span>Sat 22 Nov · Indiranagar</span><span className="hf-ex">Example party</span></div>
            <div><b>Rooftop<br />Disco Club</b><span>Doors 9 pm · tickets or the list</span></div>
            <img src="/cats/dj.webp" alt="" />
          </div>
          <div className="hf-sw"><span>Your colours</span><i style={{ background: "#ffe600" }} /><i style={{ background: "#ff4d8d", animationDelay: "-9s" }} /><i style={{ background: "#2563eb", animationDelay: "-6s" }} /><i style={{ background: "#b6ef36", animationDelay: "-3s" }} /></div>
        </div>
      </section>

      <section className="hf-wrap hf-two hf-pair">
        <div className="hf-panel">
          <span className="hf-eye">Fill it</span>
          <h2>Sell out, or keep it to friends.</h2>
          <p>Ticket tiers that open and close on their own, or a guest list you approve with one tap. Regulars are marked, so saying yes takes a second.</p>
          <div className="hf-tiers" aria-hidden="true">
            <div><span>Early bird</span><em>Sold out</em></div>
            <div style={{ animationDelay: ".6s" }}><span>General</span><em>Live · ₹799</em></div>
            <div style={{ animationDelay: "1.2s" }}><span>The list · 48 asked</span><em>Yes to regulars</em></div>
          </div>
          <span className="hf-ex">Example numbers</span>
        </div>
        <div className="hf-panel">
          <span className="hf-eye">Book it</span>
          <h2>The lineup is one tab away.</h2>
          <p>See who is free on your date, hear their records, send an offer. It ends in a contract both of you sign, with the deposit held until after the show.</p>
          {list.length > 0 && <div className="hf-faces">{list.map((a) => <a key={a.slug} href={productLink("artists", `/${a.slug}`)} title={a.name}><img src={a.photo_url} alt={a.name} loading="lazy" /></a>)}</div>}
          <a className="hf-key hf-lime" href="/book">Find an artist for your date</a>
        </div>
      </section>

      <section id="door" className="hf-door">
        <div className="hf-wrap hf-two">
          <div className="hf-copy">
            <span className="hf-eye">The door</span>
            <h2>No signal. No queue. No “can you check again?”</h2>
            <p>Any phone on your team scans. The list lives on the phone, so the basement can lose signal and the line keeps moving. District, BookMyShow, Skillbox and Insider tickets sit on the same list as yours.</p>
            <div className="hf-tags"><span>Pass-outs</span><span>Walk-ins and UPI</span><span>A live count for the venue</span><span>Undo</span></div>
            <div className="hf-btns"><a className="hf-key hf-ink" href="/door">Try the door</a></div>
          </div>
          <div className="hf-phone" aria-hidden="true">
            <div className="hf-sig"><i /><span className="hf-sigt" /></div>
            <div className="hf-flash"><svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#f2efe7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></div>
            <div className="hf-count"><div><span>In the room</span><b>2<span className="hf-dg"><span>0<br />1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9</span></span><span className="hf-dg"><span style={{ animationDuration: "1s" }}>0<br />1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9</span></span></b></div><span>of 300</span></div>
            <span className="hf-ex">Example night</span>
          </div>
        </div>
      </section>

      <section className="hf-wrap hf-two hf-report">
        <div className="hf-panel">
          <div className="hf-rhead"><b>Rooftop Disco Club · the report</b><span className="hf-ex">Example</span></div>
          <div className="hf-stats"><div><span>Came</span><b>268</b></div><div><span>Peak</span><b>12:15</b></div><div><span>New faces</span><b>41%</b></div></div>
          <div className="hf-bars" aria-hidden="true">{[12, 22, 40, 66, 92, 100, 78, 48, 26, 10].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i / 10}s` }} />)}</div>
          <span className="hf-cap">Arrivals every 15 minutes, 9 pm to 3 am</span>
        </div>
        <div className="hf-copy">
          <span className="hf-eye">The morning after</span>
          <h2>Wake up knowing exactly how it went.</h2>
          <p>Who came, when the room filled, which ticket sold, who is new. In your inbox by 9 am, ready for the next one.</p>
        </div>
      </section>

      <section className="hf-wrap">
        <div className="hf-free">
          <div>
            <h2>Free parties stay free.</h2>
            <p>The door, guest lists, outside tickets, the live count and the report cost nothing. On paid tickets on your own link, we take 5%.</p>
          </div>
          <a className="hf-key hf-ink" href="/make">Make your party</a>
        </div>
      </section>
    </main>
  );
}
