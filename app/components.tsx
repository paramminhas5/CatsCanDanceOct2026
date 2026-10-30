import Link from "next/link";
import { type CcdEvent, type SceneEvent, type Artist, fmtDate } from "@/lib/db";

export function CcdEventCard({ e }: { e: CcdEvent }) {
  const body = (
    <>
      <span className="when">{fmtDate(e.event_date, e.date)}</span>
      <h3>{e.title}</h3>
      <span className="where">{[e.venue, e.city].filter(Boolean).join(", ") || "Venue TBA"}</span>
      {e.blurb && <p style={{ margin: 0 }}>{e.blurb}</p>}
      <div className="chips">
        {e.series_label && <span className="chip">{e.series_label}</span>}
        {e.pet_friendly && <span className="chip">Pet friendly</span>}
        {(e.lineup ?? []).map((a) => (
          <span key={a} className="chip">{a}</span>
        ))}
      </div>
    </>
  );
  return e.ticket_url ? (
    <a className="card ccd" href={e.ticket_url} target="_blank" rel="noreferrer">{body}</a>
  ) : (
    <div className="card ccd">{body}</div>
  );
}

export function SceneRows({ events }: { events: SceneEvent[] }) {
  if (!events.length)
    return <p className="muted">Picks for the coming weeks land here soon.</p>;
  return (
    <div className="rows">
      {events.map((e) => (
        <a key={e.id} className="row" href={e.url} target="_blank" rel="noreferrer">
          <span className="d">{fmtDate(e.event_date)}</span>
          <span>
            <span className="t">{e.title}</span>
            <br />
            <span className="v">{[e.venue, e.city].filter(Boolean).join(", ")}</span>
          </span>
          <span className="chips">
            {e.genres.slice(0, 3).map((g) => (
              <span key={g} className="chip">{g}</span>
            ))}
          </span>
        </a>
      ))}
    </div>
  );
}

export function ArtistCard({ a }: { a: Artist }) {
  return (
    <Link href={`/artists/${a.slug}`} className="card">
      {a.is_resident && <span className="tag" style={{ alignSelf: "start" }}>CCD Resident</span>}
      <h3>{a.name}</h3>
      <span className="where">{a.based_city ?? a.from_city ?? ""}</span>
      <div className="chips">
        {a.genres.slice(0, 3).map((g) => (
          <span key={g} className="chip">{g}</span>
        ))}
      </div>
    </Link>
  );
}

export function eventsSchema(ccd: CcdEvent[], scene: SceneEvent[]) {
  const items = [
    ...ccd.filter((e) => e.event_date).map((e) => ({
      "@type": "MusicEvent",
      name: `Cats Can Dance: ${e.title}`,
      startDate: e.event_date,
      eventStatus: "https://schema.org/EventScheduled",
      location: { "@type": "Place", name: e.venue ?? "TBA", address: e.city ?? "Bengaluru" },
      organizer: { "@type": "Organization", name: "Cats Can Dance", url: "https://catscandance.com" },
      ...(e.ticket_url ? { url: e.ticket_url } : {}),
    })),
    ...scene.filter((e) => e.event_date).map((e) => ({
      "@type": "MusicEvent",
      name: e.title,
      startDate: e.event_date,
      url: e.url,
      location: { "@type": "Place", name: e.venue ?? "TBA", address: e.city ?? "India" },
    })),
  ];
  return { "@context": "https://schema.org", "@graph": items };
}
