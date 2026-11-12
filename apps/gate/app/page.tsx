/**
 * The Host front page, v3.1 (canvas board Host v2; Param, 10 Nov 2026: "explain the host app better, there are
 * more features, I should be excited, these are the best products in the game"). Run the whole night from one
 * phone: a before and after, every feature as a grid of small moving cards, the offline door, and the price.
 * Example numbers are labelled.
 */
import type { Metadata } from "next";
import { productLink } from "@ccd/brand";
import { supabaseAnon } from "@ccd/db";

export const metadata: Metadata = {
  title: "Host: run the whole night from one phone",
  description: "Page, tickets, guest list, lineup, gear, door, money and the morning report, in one app that works with no signal. Free parties stay free.",
};
export const revalidate = 3600;

async function faces() {
  try {
    const { data } = await supabaseAnon().from("artists").select("slug,name,photo_url").eq("status", "approved").eq("featured", true).not("photo_url", "is", null).limit(4);
    return (data ?? []) as { slug: string; name: string; photo_url: string }[];
  } catch {
    return [];
  }
}

const BEFORE = ["A Google Form for the list", "Forty Instagram DMs asking “am I on it?”", "A printed list that gets wet by midnight", "District tickets nobody can check", "Cash in a shoebox", "No idea who actually came"];
const AFTER = ["One page with tickets and the list", "Guests get their QR the second you say yes", "The list lives on every door phone, offline", "District, BMS, Skillbox and Insider on the same list", "Walk-ins pay by UPI at the door", "The full report in your inbox by 9 am"];

export default async function HostFront() {
  const list = await faces();
  return (
    <main className="hf">
      <section className="hf-wrap hf-two hf-hero">
        <div className="hf-copy">
          <span className="hf-eye">Host · the app we run our own Episodes on</span>
          <h1>Run the whole night from one phone.</h1>
          <p>Page, tickets, guest list, lineup, gear, door, money and the morning report. Built by people who throw a party every month, so nothing breaks at 1 am.</p>
          <div className="hf-btns"><a className="hf-key" href="/make">Make a party, free</a><a className="hf-ghost" href="#all">See all 14 features</a></div>
          <div className="hf-stats3">
            <span><b>60s</b><em>to a live page</em></span>
            <span><b>0</b><em>bars of signal needed</em></span>
            <span><b>₹0</b><em>for free parties</em></span>
          </div>
        </div>
        <div className="hf-stage" aria-hidden="true">
          <div className="hf-look">
            <div className="hf-look-top"><span>Sat 22 Nov · Indiranagar</span><span className="hf-ex">Example</span></div>
            <img src="/cats/dj.webp" alt="" />
            <div><b>Rooftop<br />Disco Club</b><span>Early bird sold out · General ₹799</span></div>
          </div>
          <div className="hf-phone-s"><img src="/shots/H39-Door.webp" alt="" /></div>
        </div>
      </section>

      <section className="hf-wrap hf-two hf-ba">
        <div className="hf-before">
          <span className="hf-eye" style={{ color: "#ff6b8a" }}>Your party right now</span>
          <h2>Seven apps and a prayer.</h2>
          {BEFORE.map((t, i) => <span key={t} className="hf-old" style={{ animationDelay: `${i * 0.4}s` }}>{t}</span>)}
        </div>
        <div className="hf-after">
          <span className="hf-eye">Your party on Host</span>
          <h2>One link. One app. Done.</h2>
          {AFTER.map((t, i) => <span key={t} className="hf-new" style={{ animationDelay: `${i * 0.4}s` }}>{t}</span>)}
        </div>
      </section>

      <section id="all" className="hf-wrap hf-all">
        <div className="hf-all-head"><h2>Everything a party needs. In one place.</h2><span className="hf-cap">14 features · all free on free nights</span></div>
        <div className="hf-bento">
          <div className="hf-b hf-w2 hf-h2 hf-yellow">
            <div className="hf-art hf-art-row"><div className="hf-phone-xs"><img src="/shots/H39-Make.webp" alt="" /></div><div className="hf-sws"><span className="hf-cap" style={{ color: "#3d3a20" }}>Your colours</span><span><i style={{ background: "#ff4d8d", boxShadow: "0 0 0 3px #0a0a0c" }} /><i style={{ background: "#2563eb" }} /><i style={{ background: "#b6ef36" }} /><i style={{ background: "#0a0a0c" }} /></span></div></div>
            <h3 style={{ fontSize: 32 }}>A page that looks like your party</h3><p>Name it, pick your colours, drop your poster or let us make one. Live and shareable in a minute. No designer, no website.</p>
          </div>
          <div className="hf-b"><div className="hf-art hf-chips"><span>Early bird · sold out</span><span style={{ animationDelay: ".4s" }}>General · ₹799</span><span style={{ animationDelay: ".8s" }}>Door · ₹999</span></div><h3>Tickets that sell themselves</h3><p>Tiers open and close on their own.</p></div>
          <div className="hf-b"><div className="hf-art hf-yns"><span>Aditi · regular <b>Yes</b></span><span style={{ animationDelay: ".5s" }}>Rohan +1 <b>Yes</b></span></div><h3>The list, in one tap</h3><p>Regulars marked. Say yes to all of them at once.</p></div>
          <div className="hf-b"><div className="hf-art hf-faces">{list.map((a) => <a key={a.slug} href={productLink("artists", `/${a.slug}`)} title={a.name}><img src={a.photo_url} alt={a.name} loading="lazy" /></a>)}</div><h3>Book the lineup</h3><p>See who is free on your date. Offer, agree, sign.</p></div>
          <div className="hf-b"><div className="hf-art hf-chips"><span>2x CDJ-3000</span><span style={{ animationDelay: ".3s" }}>DJM-900</span><span style={{ animationDelay: ".6s" }}>PA for 200</span><span style={{ animationDelay: ".9s" }}>Lights</span></div><h3>Gear on request</h3><p>Decks, sound and lights from owners near you.</p></div>
          <div className="hf-b hf-w2 hf-cream"><div className="hf-art hf-art-row" style={{ justifyContent: "space-between" }}><span className="hf-sig"><i /><span className="hf-sigt" /></span><span className="hf-scan"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#f2efe7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span></div><h3 style={{ fontSize: 30 }}>A door that never goes down</h3><p>Any phone on your team scans. The list lives on the phone, so the basement can lose signal and the line keeps moving.</p></div>
          <div className="hf-b"><div className="hf-art hf-chips"><span>District</span><span style={{ animationDelay: ".3s" }}>BookMyShow</span><span style={{ animationDelay: ".6s" }}>Skillbox</span><span style={{ animationDelay: ".9s" }}>Insider</span></div><h3>Outside tickets, same list</h3><p>Import the CSV. Their QR scans at your door.</p></div>
          <div className="hf-b"><div className="hf-art hf-yns"><span>meera@… <b style={{ background: "#ffe600" }}>Lead</b></span><span style={{ animationDelay: ".5s" }}>door2@… <b>Scanner</b></span></div><h3>Your door team</h3><p>Add people by email. Their phone becomes a scanner.</p></div>
          <div className="hf-b"><div className="hf-art"><span className="hf-cnt">2<span className="hf-dg"><span>0<br />1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9</span></span><span className="hf-dg"><span style={{ animationDuration: "1s" }}>0<br />1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9</span></span></span><span className="hf-cap"> / 300 · example</span></div><h3>A live count for the venue</h3><p>One link, no login. The floor sees the room fill.</p></div>
          <div className="hf-b"><div className="hf-art hf-chips"><span>Walk-in · ₹999 UPI</span><span style={{ animationDelay: ".4s" }}>Pass-out · back 1:10</span><span style={{ animationDelay: ".8s" }}>Undo</span></div><h3>Walk-ins, pass-outs, undo</h3><p>Everything a real door actually does.</p></div>
          <div className="hf-b hf-w2"><div className="hf-art hf-bars" aria-hidden="true">{[14, 24, 42, 68, 92, 100, 80, 50, 26, 10].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i / 10}s` }} />)}</div><h3 style={{ fontSize: 28 }}>The whole night by 9 am</h3><p>Who came, when the room filled, which ticket sold, how many were new. In your inbox, ready for the next one.</p></div>
          <div className="hf-b hf-blue"><div className="hf-art"><span className="hf-cap" style={{ color: "#dbe6ff" }}>Listed on Nights</span></div><h3>New faces, every time</h3><p>List it on Nights and people going solo join in crews.</p></div>
          <div className="hf-b"><div className="hf-art"><span className="hf-cap" style={{ color: "#ffe600" }}>Your series</span></div><h3>A page for your series</h3><p>Every night under your name, in your colours.</p></div>
        </div>
      </section>

      <section id="door" className="hf-door">
        <div className="hf-wrap hf-two">
          <div className="hf-copy">
            <span className="hf-eye">The door</span>
            <h2>No signal. No queue. No “can you check again?”</h2>
            <p>We built this door for our own basement nights. Scan, green, next. The list lives on the phone, so nothing waits on the network. Your bouncers will love you.</p>
            <div className="hf-btns"><a className="hf-key hf-ink" href="/door">Try the door</a></div>
          </div>
          <div className="hf-two-phones" aria-hidden="true">
            <div className="hf-phone-s"><img src="/shots/H39-Door.webp" alt="" /></div>
            <div className="hf-phone-s" style={{ marginTop: 60 }}><img src="/shots/H39-Report.webp" alt="" /></div>
          </div>
        </div>
      </section>

      <section className="hf-wrap">
        <div className="hf-free hf-price">
          <div>
            <h2>Free parties stay free. Forever.</h2>
            <p>The page, the list, the door, outside tickets, the live count and the report cost nothing. We only earn when you sell tickets.</p>
            <div className="hf-btns" style={{ marginTop: 20 }}><a className="hf-key hf-ink" href="/make">Make your party now</a></div>
          </div>
          <div className="hf-rows">
            <div><b>Free nights and guest lists</b><b>₹0</b></div>
            <div><b>Paid tickets on your own link</b><b>5%</b></div>
            <div><b>Tickets sold through Nights</b><b>8%, in the price</b></div>
            <div className="dark"><b>Founding ten promoters, six months</b><b>5%</b></div>
          </div>
        </div>
      </section>
    </main>
  );
}
