import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageHero from "@/components/PageHero";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/lib/supabase";

const field = "w-full bg-cream text-ink border-4 border-ink px-3 py-2 font-medium focus:outline-none focus:ring-4 focus:ring-electric-blue";
const label = "block font-display text-sm text-ink mb-1";

/** Public form: send a night to the scene list. Lands in /ops as a pending pick. */
export default function SubmitSceneEvent() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("company")) { setState("done"); return; }
    setState("busy"); setErr("");
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { error } = await supabase.rpc("submit_event", {
      p_email: v("email"), p_title: v("title"), p_url: v("url"), p_venue: v("venue"),
      p_city: v("city"), p_date: v("date"), p_time: v("time"), p_description: v("description"),
    });
    if (error) { setErr(error.message); setState("idle"); return; }
    setState("done");
  }

  return (
    <main className="bg-background text-foreground">
      <SEO
        title="Send us an event | Cats Can Dance"
        description="Know a night we should list? Send the details. We check every event before it goes on the scene list."
        path="/submit-event/event"
      />
      <Nav />
      <PageHero eyebrow="SUBMIT" title="SEND US A NIGHT." bg="bg-acid-yellow" textColor="text-ink" eyebrowColor="text-magenta" shadowColor="hsl(var(--ink))">
        <p className="text-ink/80 font-display text-xl md:text-2xl mt-2">WE CHECK EVERY ONE BEFORE IT GOES ON THE LIST.</p>
      </PageHero>
      <div className="container max-w-2xl py-12 md:py-20">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "What's on", to: "/whats-on" }, { label: "Send an event" }]} />
        {state === "done" ? (
          <div className="mt-10 bg-lime border-4 border-ink chunk-shadow p-8 text-center">
            <p className="font-display text-5xl text-ink mb-4">RECEIVED.</p>
            <p className="text-ink/80 font-medium text-lg mb-6">We will look at it and add it to the scene list if it fits.</p>
            <a href="/whats-on" className="inline-block bg-ink text-cream font-display text-lg px-6 py-3 border-4 border-ink chunk-shadow">SEE WHAT'S ON →</a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-4 bg-cream border-4 border-ink chunk-shadow p-6">
            <div><label className={label} htmlFor="title">EVENT NAME *</label><input id="title" name="title" required className={field} /></div>
            <div><label className={label} htmlFor="url">LINK TO THE EVENT OR TICKETS *</label><input id="url" name="url" type="url" required placeholder="https://" className={field} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={label} htmlFor="date">DATE *</label><input id="date" name="date" type="date" required className={field} /></div>
              <div><label className={label} htmlFor="time">TIME</label><input id="time" name="time" placeholder="e.g. 9pm" className={field} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={label} htmlFor="venue">VENUE</label><input id="venue" name="venue" className={field} /></div>
              <div><label className={label} htmlFor="city">CITY</label><input id="city" name="city" placeholder="Bengaluru" className={field} /></div>
            </div>
            <div><label className={label} htmlFor="description">LINEUP AND DETAILS</label><textarea id="description" name="description" rows={4} maxLength={1000} className={field} /></div>
            <div><label className={label} htmlFor="email">YOUR EMAIL * <span className="text-ink/50 font-normal text-xs">(private)</span></label><input id="email" name="email" type="email" required className={field} /></div>
            <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />
            {err && <p className="text-magenta font-bold">{err}</p>}
            <button disabled={state === "busy"} className="w-full bg-magenta text-cream font-display text-xl py-4 border-4 border-ink chunk-shadow disabled:opacity-60">
              {state === "busy" ? "SENDING..." : "SEND IT →"}
            </button>
            <p className="text-ink/60 text-sm text-center">Run nights often? <a href="/submit-event" className="underline">Apply as a promoter</a>.</p>
          </form>
        )}
      </div>
      <Footer />
    </main>
  );
}
