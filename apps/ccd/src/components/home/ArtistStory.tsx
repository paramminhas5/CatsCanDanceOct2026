/**
 * For artists: one real artist page updating itself (gig found by the gig radar, newest release,
 * press with its source), then two things the artist does (tour dates, a booking), marked as examples.
 * Then link-in-bio vs a CCD page, and the three things an artist does here. Plays on its own, every
 * step can be clicked. Data from src/lib/home.ts (getStory).
 */
import { useEffect, useRef, useState } from "react";
import catDj from "@/assets/cat-headphones.png";
import { imgUrl } from "@/lib/img";
import type { ArtistStory as Story } from "@/lib/home";
import { LINKS, productLink } from "@ccd/brand";

const DUR = [1400, 3200, 3200, 3200, 3200, 6600];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const parts = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`); return { day: DAY[d.getUTCDay()], num: d.getUTCDate(), mon: MON[d.getUTCMonth()] }; };
const STAGES = ["Sent", "Seen", "Counter ₹80k", "Accepted", "Confirmed"];

const ROWS: [string, string, string][] = [
  ["Gigs", "You post each one, then delete it.", "Found and added for you, with tickets. Past gigs stay as your history."],
  ["Releases", "A row of links to other apps.", "Every release with label and year. Press play on the page."],
  ["History", "Lost in old posts.", "Your eras, releases, gigs and press in one place, every fact sourced."],
  ["Booking", "DMs, missed emails, “what's your fee?”", "One brief: date, room, set, budget. Reply, counter, confirm."],
  ["Touring", "A story that's gone in a day.", "Tour dates on your page and on On tour, where promoters in each city book the open nights."],
];

export default function ArtistStory({ story }: { story: Story | null }) {
  const [step, setStep] = useState(0);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mini, setMini] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!onScreen) return;
    // Reduced motion: show the finished state, no timers.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(5); setT(6000); setMini(6000); return; }
    const id = setInterval(() => {
      setMini((m) => (m + 100) % 9000);
      if (paused) return;
      setT((x) => {
        const nx = x + 100;
        if (nx >= DUR[stepRef.current]) { setStep((s) => (s + 1) % DUR.length); return 0; }
        return nx;
      });
    }, 100);
    return () => clearInterval(id);
  }, [onScreen, paused]);
  if (!story) return null;
  const g = parts(story.gig.date);
  const pick = (i: number) => { setStep(i); setT(0); };
  const sub = step === 5 ? Math.min(4, Math.floor(t / 1200)) : -1;
  const playing = step === 5 && sub >= 4;
  const landed = step > 0 && t < 900;
  const feed = [
    { src: "Gig radar", title: `${story.gig.title}, ${g.day} ${g.num} ${g.mon}`, note: "Added to Playing next, with tickets." },
    { src: "Release check", title: story.release ? story.release.title : "Newest release", note: story.release ? `${story.release.meta}. Added when it came out, with the source.` : "Added when it came out, with the source." },
    { src: story.press ? `Press · ${story.press.outlet}` : "Press", title: story.press?.title ?? "A new feature", note: "Added to Press, with the link." },
    { src: "You · 30 seconds", title: "Two tour dates, Goa and Mumbai", note: "On your page and on On tour. Example." },
    { src: "Booking request", title: "Sat 12 Dec, Bengaluru, 400 people, 2h", note: "A brief, not a DM. Example." },
  ];
  const cal = Array.from({ length: 14 }, (_, i) => ({ d: 7 + i, w: "MTWTFSS"[i % 7] }));

  return (
    <section ref={ref} id="for-artists" className="relative bg-ink text-cream border-b-4 border-ink overflow-hidden">
      {/* header */}
      <div className="container pt-16 md:pt-24 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="min-w-0">
          <p className="font-display text-acid-yellow text-xs md:text-sm uppercase tracking-[0.2em] mb-3">For artists</p>
          <h2 className="font-display text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92]">The page that<br />keeps up with you.</h2>
          <p className="text-cream/80 text-base md:text-lg mt-5 max-w-[46ch]">Your gigs, releases and press get added to your page, each with its source. Booking requests come in as briefs with the date, room and budget.</p>
        </div>
        <img src={imgUrl(catDj)} alt="" aria-hidden className={`w-24 md:w-36 self-end drop-shadow-[6px_6px_0_hsl(var(--acid-yellow))] ${landed ? "ccd-cat-3" : "wiggle"}`} />
      </div>

      {/* the stage */}
      <div className="container pb-16 md:pb-24 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-8 lg:gap-10 items-start">
        <div className="bg-cream text-ink border-4 border-cream shadow-[10px_10px_0_0_hsl(var(--acid-yellow))] md:shadow-[14px_14px_0_0_hsl(var(--acid-yellow))] min-w-0">
          <div className="flex gap-4 p-4 md:p-5 items-center">
            <img src={story.photo} alt={story.name} className="shrink-0 w-20 h-20 md:w-28 md:h-28 object-cover object-[center_30%] border-[3px] border-ink" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-[0.1em] border-2 border-ink px-2 py-0.5 ${step > 0 ? "bg-acid-yellow" : "bg-cream"}`}>{step > 0 ? "Updated just now" : "Updated today"}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] border-2 border-ink/40 text-ink/70 px-2 py-0.5">Real page</span>
              </div>
              <p className="font-display text-2xl sm:text-3xl md:text-5xl leading-[0.95] break-words">{story.name.toUpperCase()}</p>
              <p className="text-xs md:text-sm text-ink/70 mt-1 truncate">{[story.city, story.genres.join(", "), story.label].filter(Boolean).join(" · ")}</p>
            </div>
            <a href={productLink("artists", LINKS.artists.book(story.slug))} className="hidden sm:inline-block shrink-0 font-display text-xs px-3 py-2 border-[3px] border-ink bg-magenta text-cream">Book</a>
          </div>
          <div className="grid grid-cols-4 gap-2 px-4 md:px-5 pb-4">
            {[[story.counts.releases + (step >= 2 ? 0 : -1), "releases"], [story.counts.press - (step >= 3 ? 0 : 1), "press"], [story.counts.eras, "eras"], [story.counts.since ?? "", "since"]].map(([n, l]) => (
              <div key={l as string}><b className="block font-display font-normal text-2xl leading-none">{n}</b><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/60">{l}</span></div>
            ))}
          </div>
          <Block title="Playing next">
            {step >= 1 ? (
              <div className="ccd-land flex items-stretch border-[3px] border-ink bg-electric-blue text-cream">
                <div className="shrink-0 w-16 border-r-[3px] border-ink bg-ink flex flex-col items-center justify-center py-2"><small className="text-[9px] font-bold uppercase tracking-[0.14em]">{g.day}</small><b className="font-display font-normal text-2xl leading-none">{g.num}</b><small className="text-[9px] font-bold uppercase tracking-[0.14em]">{g.mon}</small></div>
                <div className="px-3 py-2 min-w-0 flex-1"><p className="font-display text-sm md:text-base leading-tight truncate">{story.gig.title}</p><p className="text-xs opacity-85 truncate">{[story.gig.venue, story.gig.city].filter(Boolean).join(", ")}</p></div>
                <span className="self-center mr-3 text-[10px] font-bold uppercase border-2 border-ink bg-acid-yellow text-ink px-2 py-0.5">Tickets</span>
              </div>
            ) : <Empty>No dates yet.</Empty>}
          </Block>
          <Block title="Latest">
            {step >= 2 && story.release && <Rel t={story.release.title} m={story.release.meta} fresh />}
            {story.olderReleases.map((r) => <Rel key={r.title} t={r.title} m={r.meta} />)}
          </Block>
          <Block title="Press">
            {step >= 3 && story.press ? (
              <div className="ccd-land flex items-center gap-2 border-[3px] border-ink bg-white px-2.5 py-2 min-w-0">
                <span className="shrink-0 text-[10px] font-bold uppercase border-2 border-ink bg-acid-yellow px-2 py-0.5">{story.press.outlet}</span>
                <span className="font-display text-xs md:text-sm truncate">{story.press.title}</span>
              </div>
            ) : <Empty>{story.counts.press - 1} pieces, each linked.</Empty>}
          </Block>
          <Block title="On tour" tag={step >= 4 ? "Example" : undefined}>
            {step >= 4 ? (
              <div className="ccd-land grid grid-cols-2 gap-2">
                {[["Goa", "Sat 26 Dec"], ["Mumbai", "Thu 31 Dec"]].map(([c, d]) => (
                  <div key={c} className="border-[3px] border-ink bg-white px-2.5 py-2"><p className="font-display text-sm">{c}</p><p className="text-xs text-ink/65">{d} · open to book</p></div>
                ))}
              </div>
            ) : <Empty>No tour posted.</Empty>}
          </Block>
          <Block title="December" last tag={playing ? "Sat 12: playing" : "Green: open to book"}>
            <div className="grid grid-cols-7 sm:grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
              {cal.map((c) => (
                <div key={c.d} className={`border-2 text-center py-1 text-[10px] font-bold transition-colors ${c.d === 12 && playing ? "bg-magenta text-cream border-ink ccd-pulse" : c.d === 18 || c.d === 19 ? "bg-acid-yellow border-ink" : "border-ink/25"}`}>
                  <b className="block font-display font-normal text-xs">{c.d}</b>{c.w}
                </div>
              ))}
            </div>
          </Block>
        </div>

        <div className="grid gap-3 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-cream/70"><i className="inline-block h-2 w-2 rounded-full bg-magenta ccd-blink" aria-hidden /> How {story.name}'s page stays current</span>
            <button type="button" onClick={() => setPaused((p) => !p)} className="text-[10px] font-bold uppercase tracking-[0.1em] border-2 border-cream/45 px-2.5 py-1 min-h-[28px]">{paused ? "Play" : "Pause"}</button>
          </div>
          {feed.map((f, i) => {
            const on = step === i + 1, done = step > i + 1;
            return (
              <button key={i} type="button" onClick={() => pick(i + 1)}
                className={`relative overflow-hidden flex gap-3 items-start w-full text-left px-4 py-3.5 border-[3px] transition-all duration-300 ${on ? "border-acid-yellow bg-[#16203a] md:-translate-x-2" : "border-cream/20 bg-[#0f1322] hover:border-cream"} ${done ? "opacity-55" : ""}`}>
                <span className={`shrink-0 w-8 h-8 grid place-items-center border-2 font-display text-xs ${on ? "bg-acid-yellow text-ink border-acid-yellow" : "border-cream/60"}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-acid-yellow">{f.src}</span>
                  <span className="block font-display text-sm md:text-base leading-tight my-1 break-words">{f.title}</span>
                  <span className="text-xs text-cream/65">{f.note}</span>
                  {i === 4 && step === 5 && (
                    <span className="flex flex-wrap gap-1.5 mt-2.5">
                      {STAGES.map((s, k) => <span key={s} className={`text-[10px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 border-2 transition-colors ${k <= sub ? "bg-acid-yellow text-ink border-acid-yellow" : "border-cream/30 text-cream/55"}`}>{s}</span>)}
                    </span>
                  )}
                </span>
                {on && <span className="absolute left-0 bottom-0 h-1 bg-acid-yellow" style={{ width: `${Math.min(100, (t / DUR[step]) * 100)}%` }} />}
              </button>
            );
          })}
          <p className="text-xs leading-relaxed text-cream/60 mt-1">Gigs come from the gig radar. Releases are checked against Deezer every week. Press is added with the link.</p>
        </div>
      </div>

      {/* link in bio vs CCD */}
      <div className="bg-cream text-ink border-t-4 border-ink py-14 md:py-20">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <h3 className="font-display text-4xl md:text-6xl leading-[0.92]">Instead of<br />a link in bio.</h3>
            <p className="text-base md:text-lg text-ink/75 max-w-[40ch]">A link page is a list you keep fixing. Your CCD page fills in your gigs, releases and press, and promoters can book you from it.</p>
          </div>
          <div className="border-4 border-ink shadow-[8px_8px_0_0_hsl(var(--ink))] bg-cream">
            <div className="hidden md:grid grid-cols-[140px_minmax(0,1fr)_minmax(0,1.3fr)] bg-ink text-cream font-display text-xs uppercase tracking-[0.12em]">
              <span className="p-3" /><span className="p-3 text-cream/70">Link in bio</span><span className="p-3 text-acid-yellow">Cats Can Dance</span>
            </div>
            {ROWS.map(([k, them, us], i) => (
              <div key={k} className={`grid grid-cols-[minmax(0,1fr)] md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1.3fr)] ${i < ROWS.length - 1 ? "border-b-[3px] border-ink" : ""}`}>
                <span className="px-4 pt-3 md:p-4 font-display">{k}</span>
                <span className="px-4 py-1 md:p-4 text-sm md:text-base text-ink/60 line-through decoration-ink/30 md:no-underline">{them}</span>
                <span className="px-4 pb-3 md:p-4 text-sm md:text-base font-semibold md:bg-acid-yellow md:border-l-[3px] border-ink">{us}</span>
              </div>
            ))}
          </div>

          {/* what you do */}
          <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-3 gap-5 md:gap-7 mt-12 md:mt-16">
            <Do title="Claim your page." body="It is already built. Claim it, check it and fix anything we got wrong. Then it is yours to edit." cta="Claim your page" href={productLink("artists", LINKS.artists.home)} tone="bg-acid-yellow">
              <div className="flex gap-3 items-center">
                <img src={story.photo} alt="" className="w-14 h-14 object-cover border-[3px] border-ink" />
                <div>
                  <p className="font-display text-lg leading-none">{story.name.toUpperCase()}</p>
                  {mini > 2200 && <span className="ccd-pop inline-block mt-1.5 text-[10px] font-bold uppercase border-2 border-ink bg-ink text-acid-yellow px-2 py-0.5">Verified artist</span>}
                </div>
              </div>
            </Do>
            <Do title="Post tour dates." body="City and date, that's it. They show on your page and on On tour, and promoters there can book the nights you left open." cta="Post tour dates" href={productLink("artists", LINKS.artists.tour)} tone="bg-electric-blue text-cream">
              <div className="grid grid-cols-2 gap-2 text-ink">
                {[["City", "Goa", 800], ["Date", "Sat 26 Dec", 800], ["City", "Mumbai", 2600], ["Date", "Thu 31 Dec", 2600]].map(([l, v, at], i) => (
                  <div key={i}><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-cream mb-1">{l}</p><div className="border-[3px] border-ink bg-white px-2 py-1.5 text-xs font-semibold min-h-[30px]">{mini > (at as number) ? v : ""}</div></div>
                ))}
              </div>
              {mini > 4800 && <span className="ccd-pop absolute right-4 bottom-4 font-display text-lg border-4 border-ink bg-acid-yellow text-ink px-3 py-0.5 -rotate-6">Posted</span>}
            </Do>
            <Do title="Answer bookings." body="Every request arrives as a brief. Reply, counter with your fee, confirm. Numbers and emails stay hidden until it's confirmed." cta="See the booking desk" href={productLink("artists", LINKS.artists.bookings)} tone="bg-cream">
              <div className="grid gap-2 text-xs">
                <div className="border-[3px] border-ink bg-white px-2.5 py-1.5 max-w-[85%]"><b>Brief:</b> Sat 12 Dec · Bengaluru · 400 people · 2h</div>
                {mini > 1500 && <div className="ccd-rise border-[3px] border-ink bg-electric-blue text-cream px-2.5 py-1.5 max-w-[85%] justify-self-end">Interested. Counter: ₹80k, 90 min.</div>}
                {mini > 3500 && <div className="ccd-rise border-[3px] border-ink bg-white px-2.5 py-1.5 max-w-[60%]">Accepted.</div>}
              </div>
              {mini > 5200 && <span className="ccd-pop absolute right-4 bottom-4 font-display text-lg border-4 border-magenta text-magenta bg-cream px-3 py-0.5 -rotate-6">Confirmed</span>}
            </Do>
          </div>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/55">Tour dates, the brief and the fee shown here are examples. The page above is real.</p>
        </div>
      </div>
    </section>
  );
}

function Block({ title, children, last, tag }: { title: string; children: React.ReactNode; last?: boolean; tag?: string }) {
  return (
    <div className={`border-t-[3px] border-ink px-4 md:px-5 py-3.5 grid grid-cols-[minmax(0,1fr)] gap-2 ${last ? "pb-5" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[11px] uppercase tracking-[0.16em] text-ink/60">{title}</p>
        {tag && <span className="text-[10px] font-bold text-ink/60">{tag}</span>}
      </div>
      {children}
    </div>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <div className="text-xs text-ink/50 border-2 border-dashed border-ink/30 px-3 py-2">{children}</div>;
function Rel({ t, m, fresh }: { t: string; m: string; fresh?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${fresh ? "ccd-land" : ""}`}>
      <span className={`shrink-0 w-8 h-8 grid place-items-center border-[3px] border-ink ${fresh ? "bg-acid-yellow" : ""}`} aria-hidden><svg width="10" height="10" viewBox="0 0 14 14"><path d="M3 2l9 5-9 5z" fill="currentColor" /></svg></span>
      <span className="min-w-0 flex-1"><span className="block font-display text-sm leading-tight truncate">{t}</span><span className="text-xs text-ink/65">{m}</span></span>
      {fresh && <span className="shrink-0 text-[10px] font-bold uppercase border-2 border-ink bg-acid-yellow px-2 py-0.5">New</span>}
    </div>
  );
}
function Do({ title, body, cta, href, tone, children }: { title: string; body: string; cta: string; href: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col border-4 border-ink bg-cream shadow-[8px_8px_0_0_hsl(var(--ink))] min-w-0">
      <div className={`relative h-[190px] border-b-4 border-ink overflow-hidden p-4 ${tone}`}>{children}</div>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h4 className="font-display text-2xl leading-none">{title}</h4>
        <p className="text-sm md:text-base text-ink/75">{body}</p>
        <a href={href} className="mt-auto self-start font-display text-sm px-4 py-2.5 border-4 border-ink bg-ink text-cream hover:bg-acid-yellow hover:text-ink transition-colors">{cta}</a>
      </div>
    </div>
  );
}
