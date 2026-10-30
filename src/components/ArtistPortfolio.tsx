import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Media = { id: string; kind: "photo" | "video" | "mix" | "press"; url: string; caption: string | null };
type Fact = { label: string; detail: string | null; url: string | null; date: string | null; source: string };

export type PortfolioArtist = {
  slug: string; name: string; bio?: string | null; why?: string | null; from_city?: string | null; based_city?: string | null; genres?: string[] | null;
  festivals?: string[] | null; labels?: string | null; members?: string | null; photo_url?: string | null;
  fee_min_inr?: number | null; fee_max_inr?: number | null; open_to_bookings?: boolean | null;
  mix_url?: string | null; soundcloud?: string | null; spotify?: string | null; instagram?: string | null; website?: string | null;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-4 border-ink bg-cream p-4">
      <p className="font-display text-xs uppercase tracking-widest text-ink/50 mb-2">{title}</p>
      {children}
    </div>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-ink/50">{children}</p>;

/**
 * The full portfolio for one artist. Every section always shows, so a visitor can see what is known and what is not yet.
 * Facts come from approved profile facts only. Gallery items come from the artist or from CCD staff.
 */
export default function ArtistPortfolio({ artist }: { artist: PortfolioArtist }) {
  const [media, setMedia] = useState<Media[]>([]);
  const [facts, setFacts] = useState<Record<string, Fact[]>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([
      supabase.rpc("artist_media_public", { p_slug: artist.slug }),
      supabase.rpc("artist_profile_public", { p_slug: artist.slug }),
    ]).then(([m, f]) => {
      if (!live) return;
      setMedia((m.data as Media[]) ?? []);
      setFacts((f.data as Record<string, Fact[]>) ?? {});
      setLoaded(true);
    });
    return () => { live = false; };
  }, [artist.slug]);

  const photos = media.filter((i) => i.kind === "photo");
  const links = media.filter((i) => i.kind !== "photo");
  const hero = artist.photo_url || photos[0]?.url || null;
  const f = (k: string) => facts[k] ?? [];
  const from = artist.from_city && artist.from_city !== "India" ? artist.from_city : null;
  const rate =
    artist.fee_min_inr && artist.fee_max_inr ? `${inr(artist.fee_min_inr)} to ${inr(artist.fee_max_inr)}`
    : artist.fee_min_inr ? `From ${inr(artist.fee_min_inr)}`
    : null;
  const listen = [artist.mix_url && { label: "Mix", url: artist.mix_url }, artist.soundcloud && { label: "SoundCloud", url: artist.soundcloud }, artist.spotify && { label: "Spotify", url: artist.spotify }].filter(Boolean) as { label: string; url: string }[];

  return (
    <section className="mt-6 space-y-4" aria-label={`${artist.name} portfolio`}>
      <div className="border-4 border-ink bg-cream chunk-shadow p-4 md:p-6">
        <p className="font-display text-xl text-ink mb-3">PORTFOLIO</p>
        {photos.length > 0 || hero ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...(hero && !photos.some((p) => p.url === hero) ? [{ id: "hero", url: hero, caption: null }] : []), ...photos].map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                <img src={p.url} alt={p.caption ?? artist.name} loading="lazy" className="w-full h-40 object-cover border-2 border-ink" />
                {p.caption && <span className="block text-xs text-ink/60 mt-1">{p.caption}</span>}
              </a>
            ))}
          </div>
        ) : (
          <Empty>
            {loaded ? <>No photos yet. Are you {artist.name}? <Link href="/club" className="underline">Add yours in your club page.</Link></> : "Loading…"}
          </Empty>
        )}
        {links.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {links.map((l) => <li key={l.id}><a href={l.url} target="_blank" rel="noopener noreferrer" className="underline">{l.kind}: {l.caption || l.url}</a></li>)}
          </ul>
        )}
      </div>

      {(artist.bio || artist.why) && (
        <Block title="About"><p className="text-ink">{artist.bio || artist.why}</p></Block>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Block title="From and based in">
          <p className="text-ink">{[from, artist.based_city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ") || <Empty>Not added yet.</Empty>}</p>
          {artist.members && <p className="text-sm text-ink/60 mt-1">{artist.members}</p>}
        </Block>

        <Block title="What they play">
          {(artist.genres ?? []).length > 0 && <p className="text-ink mb-1">{(artist.genres ?? []).join(" · ")}</p>}
          {f("plays").length > 0 ? (
            <ul className="text-sm text-ink/80 space-y-0.5">{f("plays").slice(0, 6).map((i, n) => <li key={n}>{i.url ? <a className="underline" href={i.url} target="_blank" rel="noopener noreferrer">{i.label}</a> : i.label}{i.detail ? <span className="text-ink/50">, {i.detail}</span> : null}</li>)}</ul>
          ) : (artist.genres ?? []).length === 0 ? <Empty>Not added yet.</Empty> : null}
          {listen.length > 0 && <p className="text-sm mt-2 flex flex-wrap gap-3">{listen.map((l) => <a key={l.label} className="underline" href={l.url} target="_blank" rel="noopener noreferrer">Listen: {l.label}</a>)}</p>}
        </Block>

        <Block title="Where they play">
          {f("upcoming").length > 0 && (
            <ul className="text-sm text-ink space-y-0.5 mb-2">{f("upcoming").map((i, n) => <li key={n}><span className="font-display text-xs mr-2">{i.date ? new Date(i.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "SOON"}</span>{i.label}{i.detail ? <span className="text-ink/50">, {i.detail}</span> : null}</li>)}</ul>
          )}
          {f("tours").length > 0 && <ul className="text-sm text-ink/80 space-y-0.5">{f("tours").map((i, n) => <li key={n}>{i.label}{i.detail ? <span className="text-ink/50">, {i.detail}</span> : null}</li>)}</ul>}
          {(artist.festivals ?? []).length > 0 && <p className="text-sm text-ink/80 mt-1">Festivals and series: {(artist.festivals ?? []).join(", ")}</p>}
          {f("upcoming").length === 0 && f("tours").length === 0 && (artist.festivals ?? []).length === 0 && <Empty>No dates confirmed yet.</Empty>}
        </Block>

        <Block title="Played with">
          {f("played_with").length > 0
            ? <p className="text-sm text-ink/80">{f("played_with").map((i) => i.label).join(", ")}</p>
            : <Empty>Not confirmed yet.</Empty>}
          {artist.labels && <p className="text-sm text-ink/60 mt-1">Labels: {artist.labels}</p>}
        </Block>

        {f("listens").length > 0 && (
          <Block title="Fans also listen to"><p className="text-sm text-ink/80">{f("listens").map((i) => i.label).join(", ")}</p></Block>
        )}
        {f("fans").length > 0 && (
          <Block title="The fans"><ul className="text-sm text-ink/80">{f("fans").map((i, n) => <li key={n}>{i.label}</li>)}</ul></Block>
        )}
        {f("expect").length > 0 && (
          <Block title="What to expect"><ul className="text-sm text-ink/80">{f("expect").map((i, n) => <li key={n}>{i.label}</li>)}</ul></Block>
        )}

        <Block title="Rate and booking">
          {rate ? <><p className="font-display text-lg text-ink">{rate}</p><p className="text-xs text-ink/50">Estimate from CCD research. Confirm with the artist.</p></> : <p className="text-ink">Rate on request.</p>}
          <p className="text-sm text-ink/60 mt-1">{artist.open_to_bookings === false ? "Not taking bookings right now." : "Open to bookings."}</p>
        </Block>
      </div>

      <p className="text-xs text-ink/50">Pre-filled by CCD. Dates, tracks and bills show once {artist.name} or the CCD team has approved them.</p>
    </section>
  );
}
