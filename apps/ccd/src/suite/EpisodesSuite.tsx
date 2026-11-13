/**
 * Our Episodes (/nights). Param, 13 Nov 2026: "Our episodes still explain how it works, it should be separate and
 * there should be an easy way to find a crew and then points." So: the next Episode with Get in and Who's going,
 * a crew in one tap, what points are for, then every Episode so far. How it works lives at /nights/how-it-works.
 */
import { posterSvg } from "@ccd/ui";
import Shell from "@/suite/Shell";

export type Ep = { slug: string; title: string; event_date: string | null; start_time: string | null; venue: string | null; city: string | null; poster_url: string | null; lineup: string[] | null };

const day = (d: string | null, long = false) => !d ? "" : new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", long ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const time = (t: string | null) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`; };

function Poster({ e, big }: { e: Ep; big?: boolean }) {
  if (e.poster_url) return <img src={e.poster_url} alt={`${e.title} poster`} loading={big ? "eager" : "lazy"} />;
  return <span className="ep-made" dangerouslySetInnerHTML={{ __html: posterSvg({ title: e.title, lineup: (e.lineup ?? []).filter(Boolean), venue: e.venue, city: e.city, date: e.event_date, time: e.start_time }) }} />;
}

export default function EpisodesSuite({ next, past }: { next: Ep | null; past: Ep[] }) {
  const n = next;
  const at = n ? `/nights/${n.slug}` : "/whats-on";
  return (
    <Shell title="Our Episodes | Cats Can Dance" description="Cats Can Dance Episodes: small rooms, proper sound, come solo or with friends. Get in to the next one, find a crew, earn points.">
      <style dangerouslySetInnerHTML={{ __html: EP_CSS }} />

      {/* 1. The next one */}
      {n ? (
        <section className="k-wrap ep-next">
          <a href={at} className="ep-next-poster"><Poster e={n} big /></a>
          <div className="ep-next-txt">
            <span className="ep-eye">Next Episode</span>
            <h1>{n.title}</h1>
            <p className="ep-when"><b>{day(n.event_date, true)}{n.start_time ? `, ${time(n.start_time)}` : ""}</b><span>{[n.venue, n.city].filter(Boolean).join(", ")}</span></p>
            {(n.lineup ?? []).filter(Boolean).length > 0 && <p className="ep-line">{(n.lineup ?? []).filter(Boolean).join(" · ")}</p>}
            <div className="ep-acts">
              <a className="ep-btn ep-btn-main" href={`${at}#tickets`}>Get in</a>
              <a className="ep-btn" href={`${at}#going`}>Who's going</a>
            </div>
          </div>
        </section>
      ) : (
        <section className="k-wrap ep-next ep-none">
          <div className="ep-next-txt"><span className="ep-eye">Next Episode</span><h1>Coming soon.</h1><p className="ep-when"><span>We post the date on Instagram first. Until then, there are good nights on What's on.</span></p>
            <div className="ep-acts"><a className="ep-btn ep-btn-main" href="/whats-on">See what's on</a><a className="ep-btn" href="https://instagram.com/catscan.dance" target="_blank" rel="noreferrer">Instagram</a></div></div>
        </section>
      )}

      {/* 2. A crew */}
      <section className="k-wrap ep-sec">
        <div className="ep-card ep-crew">
          <div className="ep-card-h"><span className="ep-eye">Going alone?</span><h2>Get a crew for the night.</h2></div>
          <ol className="ep-steps">
            <li><i>1</i><b>Say you're going</b><span>Tap I'm going and pick Solo.</span></li>
            <li><i>2</i><b>Get matched</b><span>3 to 6 people, same night, by 6 pm.</span></li>
            <li><i>3</i><b>Meet first</b><span>A time and a place near the venue.</span></li>
          </ol>
          <div className="ep-faces" aria-hidden="true"><i style={{ background: "#2563eb", color: "#fff" }}>You</i><i style={{ background: "#b6ef36" }}>AK</i><i style={{ background: "#ffe600" }}>RS</i><i style={{ background: "#ff4d8d" }}>PM</i></div>
          <div className="ep-acts">
            <a className="ep-btn ep-btn-main" href={n ? `${at}#going` : "/whats-on"}>Find my crew</a>
            <a className="ep-btn" href="/whats-on">Another night</a>
          </div>
          <p className="ep-small">Women-only crews if you want one. Your number stays private.</p>
        </div>
      </section>

      {/* 3. Points */}
      <section className="k-wrap ep-sec">
        <div className="ep-card ep-pts">
          <div className="ep-card-h"><span className="ep-eye">Points</span><h2>Show up, bring people, get merch.</h2></div>
          <ul className="ep-earn">
            <li><span className="ep-ic">🎟️</span><b>Come to an Episode</b></li>
            <li><span className="ep-ic">👯</span><b>Bring a friend with your link</b></li>
            <li><span className="ep-ic">🤝</span><b>Go with a crew</b></li>
            <li><span className="ep-ic">📣</span><b>Share a night or an artist</b></li>
          </ul>
          <p className="ep-small">Spend them on tees, totes and slipmats in the shop.</p>
          <div className="ep-acts">
            <a className="ep-btn ep-btn-main" href={n ? `${at}#tickets` : "/whats-on"}>Start earning</a>
            <a className="ep-btn" href="/shop">The merch</a>
          </div>
        </div>
      </section>

      {/* 4. Every Episode so far */}
      {past.length > 0 && (
        <section className="k-wrap ep-sec">
          <div className="ep-head"><h2>Every Episode so far</h2><span>{past.length}</span></div>
          <ul className="ep-grid">
            {past.map((e) => (
              <li key={e.slug}>
                <a href={`/nights/${e.slug}`} className="ep-past">
                  <span className="ep-past-poster"><Poster e={e} /></span>
                  <b>{e.title}</b>
                  <span>{[e.venue, day(e.event_date)].filter(Boolean).join(" · ")}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="k-wrap ep-sec ep-how">
        <a href="/nights/how-it-works">New here? How Nights works →</a>
      </section>
    </Shell>
  );
}

const EP_CSS = `
.ep-eye{font:600 12px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;color:#4f8bff}
.ep-next{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:40px;align-items:end;padding-top:40px;padding-bottom:20px}
.ep-next-poster{display:block;position:relative;aspect-ratio:4/5;border-radius:22px;overflow:hidden;background:#16161a;box-shadow:0 30px 60px -20px rgba(0,0,0,.7)}
.ep-next-poster img,.ep-made svg,.ep-past-poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ep-next-txt{display:flex;flex-direction:column;gap:12px}
.ep-next h1{margin:0;font-family:var(--k-display);font-weight:800;font-size:clamp(48px,7vw,96px);letter-spacing:-.03em;line-height:.9}
.ep-when{margin:0;display:flex;flex-direction:column;gap:2px;font-size:18px}.ep-when span{color:var(--k-t2)}
.ep-line{margin:0;color:var(--k-t2);font-size:15px}
.ep-acts{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:440px;margin-top:6px}
.ep-btn{display:flex;align-items:center;justify-content:center;min-height:54px;border-radius:16px;border:1.5px solid rgba(255,255,255,.22);color:var(--k-tx);font:700 16px var(--k-ui);text-decoration:none;transition:transform .2s}
.ep-btn:active{transform:scale(.98)}
.ep-btn-main{background:#2563eb;border-color:#2563eb;color:#fff}
.ep-sec{padding-top:18px;padding-bottom:18px}
.ep-card{display:flex;flex-direction:column;gap:16px;padding:24px;border-radius:24px;background:var(--k-raised);border:1px solid var(--k-hair)}
.ep-card-h{display:flex;flex-direction:column;gap:6px}
.ep-card h2,.ep-head h2{margin:0;font-family:var(--k-display);font-weight:800;font-size:clamp(26px,3vw,40px);letter-spacing:-.02em;line-height:1}
.ep-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ep-steps li{display:flex;flex-direction:column;gap:4px;padding:14px;border-radius:16px;background:rgba(255,255,255,.04)}
.ep-steps i{font-style:normal;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#2563eb;color:#fff;font:700 13px var(--k-ui);margin-bottom:4px}
.ep-steps b{font-size:15px}.ep-steps span{font-size:13px;color:var(--k-t2);line-height:1.35}
.ep-faces{display:flex}.ep-faces i{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font:700 13px var(--k-ui);font-style:normal;color:#0a0a0c;box-shadow:0 0 0 3px var(--k-raised)}
.ep-faces i+i{margin-left:-10px}
.ep-small{margin:0;font-size:13px;color:var(--k-t3)}
.ep-earn{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ep-earn li{display:flex;align-items:center;gap:12px;padding:14px;border-radius:16px;background:rgba(255,255,255,.04)}
.ep-ic{font-size:22px;line-height:1}.ep-earn b{font-size:15px;line-height:1.25}
.ep-head{display:flex;align-items:baseline;gap:12px;margin-bottom:16px}.ep-head span{font:600 13px var(--k-mono);color:var(--k-t3)}
.ep-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px 14px}
.ep-past{display:flex;flex-direction:column;gap:6px;color:inherit;text-decoration:none}
.ep-past-poster{position:relative;display:block;aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:#16161a}
.ep-past b{font-size:16px}.ep-past>span:last-child{font-size:13px;color:var(--k-t3)}
.ep-how{padding-bottom:48px}.ep-how a{display:inline-flex;align-items:center;min-height:48px;color:var(--k-t2);font:600 15px var(--k-ui)}
@media (max-width:900px){.ep-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:700px){
  .ep-next{grid-template-columns:118px minmax(0,1fr);gap:16px;align-items:start;padding-top:18px}
  .ep-next-poster{border-radius:14px}
  .ep-next h1{font-size:40px}
  .ep-when{font-size:15px}
  .ep-next .ep-acts{grid-column:1 / -1;max-width:none}
  .ep-next-txt{display:contents}
  .ep-next-txt>.ep-eye,.ep-next-txt>h1,.ep-next-txt>.ep-when,.ep-next-txt>.ep-line{grid-column:2}
  .ep-next-txt>.ep-eye{grid-row:1;align-self:end}
  .ep-next-poster{grid-row:1 / span 4}
  .ep-card{padding:18px;border-radius:20px;gap:14px}
  .ep-steps{grid-template-columns:1fr;gap:6px}
  .ep-steps li{flex-direction:row;align-items:center;gap:12px;padding:10px 12px}
  .ep-steps i{margin:0;flex:none}
  .ep-steps span{display:none}
  .ep-acts{max-width:none}
  .ep-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
}
`;
