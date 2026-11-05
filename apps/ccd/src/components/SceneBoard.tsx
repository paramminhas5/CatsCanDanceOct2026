import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";

type Ev = {
  id: string; title: string; url: string; ticket_url: string | null; source: string;
  city: string | null; venue: string | null; event_date: string | null; event_time: string | null;
  genres: string[] | null; lineup: string[] | null; kind: "club" | "concert" | "festival"; featured: boolean;
};

const SOURCE_LABEL: Record<string, string> = { gigscalendar: "Gigs Calendar", district: "District", insider: "Insider", highape: "HighApe", skillbox: "Skillbox" };

function fmtDate(d: string | null) {
  if (!d) return "Date TBA";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function Card({ e }: { e: Ev }) {
  const href = e.ticket_url || e.url;
  return (
    <article className="border-4 border-ink bg-cream chunk-shadow p-5 flex flex-col gap-3">
      <p className="font-display text-xs uppercase tracking-widest text-ink/60">
        {fmtDate(e.event_date)}{e.event_time ? ` · ${e.event_time}` : ""}
      </p>
      <h3 className="font-display text-2xl uppercase leading-tight text-ink">{e.title}</h3>
      <p className="flex items-center gap-1 text-sm text-ink/70">
        <MapPin className="w-4 h-4 shrink-0" />
        {[e.venue, e.city].filter(Boolean).join(", ") || "Venue TBA"}
      </p>
      {e.lineup && e.lineup.length > 0 && (
        <p className="text-sm text-ink/80">
          {e.lineup.slice(0, 6).join(", ")}{e.lineup.length > 6 ? ` +${e.lineup.length - 6} more` : ""}
        </p>
      )}
      {e.genres && e.genres.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {e.genres.slice(0, 3).map((g) => (
            <span key={g} className="text-[10px] font-display uppercase px-2 py-0.5 border-2 border-ink">{g}</span>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <a href={href} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 font-display text-sm uppercase px-3 py-2 border-4 border-ink bg-acid-yellow text-ink hover:translate-x-[2px] hover:translate-y-[2px] transition-transform">
          {e.ticket_url ? "Tickets" : "Details"} <ExternalLink className="w-4 h-4" />
        </a>
        <span className="text-[11px] text-ink/50">via {SOURCE_LABEL[e.source] ?? e.source}</span>
      </div>
    </article>
  );
}

function Group({ id, eyebrow, title, subtitle, events }: { id: string; eyebrow: string; title: string; subtitle: string; events: Ev[] }) {
  if (!events.length) return null;
  return (
    <section id={id} className="container py-12 md:py-16">
      <div className="border-b-4 border-ink pb-6 mb-8">
        <span className="inline-block font-display text-xs uppercase px-3 py-1 border-2 border-ink mb-3 bg-acid-yellow text-ink">{eyebrow}</span>
        <h2 className="font-display text-4xl md:text-5xl text-ink uppercase leading-tight">{title}</h2>
        <p className="text-ink/60 mt-2 max-w-2xl">{subtitle}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => <Card key={e.id} e={e} />)}
      </div>
    </section>
  );
}

export default function SceneBoard() {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [city, setCity] = useState("");

  useEffect(() => {
    fetch("/api/curated-events").then((r) => r.json()).then((d) => setEvents(Array.isArray(d) ? d : [])).catch(() => setEvents([]));
  }, []);

  const cities = useMemo(() => [...new Set((events ?? []).map((e) => e.city).filter(Boolean) as string[])].sort(), [events]);
  const shown = (events ?? []).filter((e) => !city || e.city === city);
  const clubs = shown.filter((e) => e.kind === "club");
  const big = shown.filter((e) => e.kind !== "club");

  if (events === null) return null;
  if (events.length === 0) {
    return (
      <section id="events" className="container py-12">
        <p className="border-4 border-ink p-6 font-display uppercase text-ink">
          No picks published yet. We hand check every listing before it goes up. Check back soon.
        </p>
      </section>
    );
  }
  return (
    <div id="events">
      {cities.length > 1 && (
        <div className="container pt-8 flex flex-wrap gap-2">
          {["", ...cities].map((c) => (
            <button key={c || "all"} onClick={() => setCity(c)}
              className={`font-display text-xs uppercase px-3 py-2 border-2 border-ink ${city === c ? "bg-ink text-cream" : "bg-cream text-ink"}`}>
              {c || "All cities"}
            </button>
          ))}
        </div>
      )}
      <Group id="club-nights" eyebrow="Find · Club nights" title="Club nights" subtitle="Hand picked underground and electronic nights. Listings come from public sources; the ticket link goes to the seller." events={clubs} />
      <Group id="main-concerts" eyebrow="Find · Main concerts" title="Main concerts" subtitle="Festivals and big shows worth travelling for. Tickets are sold by the listed seller, not by us." events={big} />
    </div>
  );
}
