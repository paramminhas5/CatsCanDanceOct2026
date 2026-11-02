import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Music, MapPin, Search, X, AlertTriangle } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Marquee from "@/components/Marquee";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { listableSorted, richness } from "@/lib/artist-richness";

interface DBArtist {
  id: string;
  slug: string;
  name: string;
  members?: string;
  from_city?: string;
  based_city?: string;
  genres: string[];
  festivals: string[];
  bio?: string;
  why?: string;
  instagram?: string;
  soundcloud?: string;
  website?: string;
  booking_email?: string;
  photo_url?: string;
  labels?: string;
  fee_min_inr?: number;
  fee_max_inr?: number;
  open_to_bookings?: boolean;
  videos?: any[];
  gallery?: any[];
  kind?: string;          // "musician" | "photographer" | etc.
  lane?: "core" | "parallel";
  lane_reason?: string;
}

function cityOf(a: DBArtist): string {
  return a.based_city || a.from_city || "";
}

function cover(a: DBArtist): string | null {
  if (a.photo_url) return a.photo_url;
  if (a.gallery && a.gallery.length > 0) {
    const first = a.gallery[0];
    if (typeof first === "string") return first;
    if (first?.url) return first.url;
    if (first?.src) return first.src;
  }
  return null;
}

type SortMode = "best" | "az" | "city" | "genre";
type GroupMode = "none" | "origin" | "city" | "style" | "rate";
type Extra = { cities: string[]; with: string[]; media: number };

function originOf(a: DBArtist): string {
  return (a.from_city || a.based_city || "").split(",")[0].trim();
}
const RATE_BANDS = ["Under ₹25k", "₹25k to ₹75k", "Over ₹75k", "On request"];
function rateBand(a: DBArtist): string {
  const n = a.fee_min_inr ?? a.fee_max_inr;
  if (!n) return "On request";
  return n < 25000 ? RATE_BANDS[0] : n <= 75000 ? RATE_BANDS[1] : RATE_BANDS[2];
}
function playsIn(a: DBArtist, x?: Extra): string[] {
  const s = new Set<string>();
  const b = (a.based_city ?? "").split(",")[0].trim();
  if (b && b !== "India") s.add(b);
  for (const c of x?.cities ?? []) if (c) s.add(c);
  return Array.from(s);
}

// Rotating accent colours for cards with no photo
const CARD_ACCENTS = [
  "bg-acid-yellow text-ink",
  "bg-electric-blue text-cream",
  "bg-magenta text-cream",
  "bg-orange text-ink",
  "bg-lime text-ink",
];

export default function ArtistsPage({ initialArtists }: { initialArtists?: DBArtist[] }) {
  // Use server-fetched artists immediately — no loading state, no spinner
  const [artists, setArtists] = useState<DBArtist[]>(listableSorted((initialArtists ?? []) as any[]) as DBArtist[]);
  const [loading, setLoading] = useState(!initialArtists);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All");
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortMode>("best");
  const [bookingsOnly, setBookingsOnly] = useState(false);
  const [origin, setOrigin] = useState("All");
  const [plays, setPlays] = useState("All");
  const [rate, setRate] = useState("Any");
  const [group, setGroup] = useState<GroupMode>("none");
  const [extras, setExtras] = useState<Record<string, Extra>>({});

  useEffect(() => {
    supabase.rpc("artist_directory_extras").then(({ data }) => setExtras((data as Record<string, Extra>) ?? {}));
  }, []);

  useEffect(() => {
    // Skip fetch entirely when server already provided the artist list
    if (initialArtists && initialArtists.length >= 0) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/artists");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setArtists(listableSorted((data ?? []) as any[]) as DBArtist[]);
      } catch (e: any) {
        setError(e.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allCities = useMemo(() => {
    const s = new Set<string>();
    for (const a of artists) {
      const c = cityOf(a);
      if (c) s.add(c.split(",")[0].trim());
    }
    return Array.from(s).sort();
  }, [artists]);

  const allOrigins = useMemo(() => {
    const s = new Set<string>();
    for (const a of artists) { const o = originOf(a); if (o) s.add(o); }
    return Array.from(s).sort();
  }, [artists]);

  const allPlays = useMemo(() => {
    const s = new Set<string>();
    for (const a of artists) for (const c of playsIn(a, extras[a.slug])) s.add(c);
    return Array.from(s).sort();
  }, [artists, extras]);

  const allGenres = useMemo(() => {
    const s = new Set<string>();
    for (const a of artists) for (const g of a.genres ?? []) s.add(g);
    return Array.from(s).sort();
  }, [artists]);

  const toggleGenre = (g: string) => {
    const next = new Set(activeGenres);
    next.has(g) ? next.delete(g) : next.add(g);
    setActiveGenres(next);
  };

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    let rows = artists.filter((a) => {
      if (city !== "All" && !cityOf(a).toLowerCase().includes(city.toLowerCase())) return false;
      if (activeGenres.size > 0 && !(a.genres ?? []).some((g) => activeGenres.has(g))) return false;
      if (bookingsOnly && !(a as any).open_to_bookings) return false;
      if (origin !== "All" && originOf(a) !== origin) return false;
      if (plays !== "All" && !playsIn(a, extras[a.slug]).includes(plays)) return false;
      if (rate !== "Any" && rateBand(a) !== rate) return false;
      if (!ql) return true;
      return (
        (extras[a.slug]?.with ?? []).join(" ").toLowerCase().includes(ql) ||
        a.name.toLowerCase().includes(ql) ||
        (a.genres ?? []).join(" ").toLowerCase().includes(ql) ||
        cityOf(a).toLowerCase().includes(ql) ||
        (a.bio ?? "").toLowerCase().includes(ql) ||
        (a.labels ?? "").toLowerCase().includes(ql)
      );
    });
    if (sort === "city") rows = [...rows].sort((a, b) => cityOf(a).localeCompare(cityOf(b)) || a.name.localeCompare(b.name));
    else if (sort === "genre") rows = [...rows].sort((a, b) => ((a.genres ?? [])[0] ?? "").localeCompare((b.genres ?? [])[0] ?? "") || a.name.localeCompare(b.name));
    else if (sort === "az") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    else rows = [...rows].sort((a, b) => richness(b as any) - richness(a as any) || a.name.localeCompare(b.name));
    return rows;
  }, [artists, q, city, activeGenres, sort, bookingsOnly, origin, plays, rate, extras]);

  const groups = useMemo(() => {
    if (group === "none") {
      const core = filtered.filter((a) => a.lane !== "parallel");
      const parallel = filtered.filter((a) => a.lane === "parallel");
      return parallel.length
        ? [{ title: "", rows: core }, { title: "Parallels", rows: parallel }]
        : [{ title: "", rows: filtered }];
    }
    const key = (a: DBArtist): string =>
      group === "origin" ? originOf(a) || "Unknown"
      : group === "city" ? (a.based_city ?? "").split(",")[0].trim() || "Unknown"
      : group === "style" ? (a.genres ?? [])[0] || "Unlisted"
      : rateBand(a);
    const m = new Map<string, DBArtist[]>();
    for (const a of filtered) { const k = key(a); m.set(k, [...(m.get(k) ?? []), a]); }
    const order = group === "rate" ? RATE_BANDS : Array.from(m.keys()).sort();
    return order.filter((k) => m.has(k)).map((k) => ({ title: k, rows: m.get(k)! }));
  }, [filtered, group]);

  const anyFilter = q || city !== "All" || activeGenres.size > 0 || bookingsOnly || origin !== "All" || plays !== "All" || rate !== "Any";

  return (
    <main className="bg-background text-foreground">
      <SEO
        title="Artists — Cats Can Dance | India's Electronic Music Directory"
        description="Discover India's top electronic music artists. Browse DJs, producers, and live acts from Bangalore, Mumbai, Delhi and beyond."
        path="/litter"
      />
      <Nav />

      <PageHero
        eyebrow="BOOK · LITTER"
        title={<>THE<br/>ROSTER.</>}
        bg="bg-electric-blue"
        textColor="text-cream"
        eyebrowColor="text-acid-yellow"
      />

      <Marquee bg="bg-ink" />

      {/* Filter bar */}
      <div className="sticky top-0 z-30 bg-cream border-b-4 border-ink">
        <div className="container py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search artists…"
                className="w-full pl-9 pr-8 py-2 border-4 border-ink bg-cream font-sans text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid-yellow/20 transition-colors"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* City filter */}
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-3 py-2 border-4 border-ink bg-cream font-display text-sm text-ink focus:outline-none focus:bg-acid-yellow/20 transition-colors"
            >
              <option value="All">ALL CITIES</option>
              {allCities.map((c) => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="px-3 py-2 border-4 border-ink bg-cream font-display text-sm text-ink focus:outline-none focus:bg-acid-yellow/20 transition-colors"
            >
              <option value="best">BEST PROFILES</option>
              <option value="az">A → Z</option>
              <option value="city">CITY</option>
              <option value="genre">GENRE</option>
            </select>

            {/* Bookings Open toggle */}
            <button
              onClick={() => setBookingsOnly(b => !b)}
              className={`px-3 py-2 border-4 border-ink font-display text-xs uppercase whitespace-nowrap transition-colors ${
                bookingsOnly ? "bg-magenta text-cream" : "bg-transparent text-ink hover:bg-acid-yellow"
              }`}
            >
              {bookingsOnly ? "◉ BOOKINGS OPEN ×" : "◉ BOOKINGS OPEN"}
            </button>
          </div>

          {/* From, plays in, rate, group */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {([
              ["FROM", origin, setOrigin, "All", allOrigins],
              ["PLAYS IN", plays, setPlays, "All", allPlays],
              ["RATE", rate, setRate, "Any", RATE_BANDS],
            ] as [string, string, (v: string) => void, string, string[]][]).map(([label, val, set, all, opts]) => (
              <select key={label} value={val} onChange={(e) => set(e.target.value)} aria-label={label}
                className="px-2 py-1 border-2 border-ink bg-cream font-display text-xs text-ink focus:outline-none focus:bg-acid-yellow/20">
                <option value={all}>{label}: {all.toUpperCase()}</option>
                {opts.map((o) => <option key={o} value={o}>{label}: {o.toUpperCase()}</option>)}
              </select>
            ))}
            <select value={group} onChange={(e) => setGroup(e.target.value as GroupMode)} aria-label="GROUP BY"
              className="px-2 py-1 border-2 border-ink bg-cream font-display text-xs text-ink focus:outline-none focus:bg-acid-yellow/20">
              <option value="none">GROUP BY: NONE</option>
              <option value="origin">GROUP BY: WHERE FROM</option>
              <option value="city">GROUP BY: WHERE BASED</option>
              <option value="style">GROUP BY: WHAT THEY PLAY</option>
              <option value="rate">GROUP BY: RATE</option>
            </select>
          </div>

          {/* Genre pills */}
          {allGenres.length > 0 && (
            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
              {allGenres.map((g) => {
                const active = activeGenres.has(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1 border-2 border-ink font-display text-xs whitespace-nowrap transition-colors ${
                      active
                        ? "bg-ink text-cream"
                        : "bg-transparent text-ink hover:bg-acid-yellow"
                    }`}
                  >
                    {g.toUpperCase()}
                  </button>
                );
              })}
              {activeGenres.size > 0 && (
                <button
                  onClick={() => setActiveGenres(new Set())}
                  className="px-3 py-1 border-2 border-ink/40 font-display text-xs text-ink/50 hover:border-ink hover:text-ink transition-colors whitespace-nowrap"
                >
                  CLEAR ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <section className="bg-cream border-b-4 border-ink py-10 md:py-16 bg-grain min-h-[60vh]">
        <div className="container">

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array(16).fill(null).map((_, i) => (
                <div key={i} className="aspect-square border-4 border-ink bg-ink/5 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="border-4 border-ink bg-magenta chunk-shadow p-8 max-w-lg">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-8 h-8 text-cream shrink-0" />
                <p className="font-display text-xl text-cream">COULDN'T LOAD ARTISTS</p>
              </div>
              <p className="text-cream/80 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-cream text-ink font-display px-5 py-2 border-4 border-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
              >
                RETRY
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-4 border-ink bg-acid-yellow chunk-shadow p-8 inline-block">
              <Music className="w-10 h-10 text-ink mb-3" />
              <p className="font-display text-2xl text-ink mb-2">NO ARTISTS MATCH</p>
              <p className="text-ink/70 text-sm mb-4">
                {artists.length === 0
                  ? "The roster is being updated. Check back soon."
                  : "Try adjusting your filters."}
              </p>
              {anyFilter && (
                <button
                  onClick={() => { setQ(""); setCity("All"); setActiveGenres(new Set()); setBookingsOnly(false); setOrigin("All"); setPlays("All"); setRate("Any"); }}
                  className="bg-ink text-cream font-display px-5 py-2 border-4 border-ink hover:bg-ink/80 transition-colors"
                >
                  CLEAR FILTERS
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Count line */}
              <p className="font-display text-sm text-ink/50 mb-4">
                {filtered.length} ARTISTS
                {activeGenres.size > 0 && " · FILTERED BY GENRE"}
                {bookingsOnly && " · BOOKINGS OPEN"}
              </p>

              {groups.map((g) => (
              <div key={g.title || "all"} className="mb-10">
              {g.title && <p className="font-display text-2xl text-ink mb-3">{g.title.toUpperCase()} <span className="text-ink/40 text-base">{g.rows.length}</span></p>}
              {g.title === "Parallels" && group === "none" && <p className="text-ink/70 text-sm mb-3 max-w-xl">Outside the dance lane, but part of the same South Asian scene: hip-hop, rock, indie and composers.</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {g.rows.map((a, i) => {
                  const img = cover(a);
                  const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
                  const isLarge = !!img && i % 9 === 0;

                  return (
                    <Link
                      key={a.id}
                      href={`/litter/${a.slug}`}
                      className={`group relative border-4 border-ink overflow-hidden chunk-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-transform ${
                        isLarge ? "col-span-2 row-span-2" : "aspect-square"
                      }`}
                    >
                      {img ? (
                        <>
                          <img
                            src={img}
                            alt={a.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                        </>
                      ) : (
                        <div className={`absolute inset-0 ${accent} flex items-end p-0`}>
                          <div className="w-full h-full flex items-center justify-center opacity-10">
                            <Music className="w-16 h-16" />
                          </div>
                          {a.bio && (
                            <p className="absolute top-3 left-3 right-3 text-xs leading-snug line-clamp-4 opacity-80">{a.bio}</p>
                          )}
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className={`font-display text-sm leading-tight truncate ${img ? "text-cream" : accent.includes("text-ink") ? "text-ink" : "text-cream"}`}>
                          {a.name.toUpperCase()}
                        </p>
                        {cityOf(a) && (
                          <p className={`text-xs flex items-center gap-0.5 mt-0.5 ${img ? "text-cream/60" : accent.includes("text-ink") ? "text-ink/60" : "text-cream/60"}`}>
                            <MapPin className="w-3 h-3 shrink-0" />
                            {cityOf(a)}
                          </p>
                        )}
                        {rateBand(a) !== "On request" && (
                          <p className={`text-[10px] font-display mt-0.5 ${img ? "text-cream/70" : "text-ink/70"}`}>{rateBand(a).toUpperCase()}</p>
                        )}
                        {(a.genres ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(a.genres ?? []).slice(0, 2).map((g) => (
                              <button
                                key={g}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGenre(g); }}
                                className={`text-[10px] px-1.5 py-0.5 font-display border border-ink transition-colors ${
                                  activeGenres.has(g) ? "bg-ink text-cream" : "bg-acid-yellow text-ink hover:bg-orange"
                                }`}
                              >
                                {g.toUpperCase()}
                              </button>
                            ))}
                            {/* Kind badge for non-musicians */}
                            {a.kind && a.kind !== "musician" && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-electric-blue text-cream font-display border border-ink">
                                {a.kind === "photographer" ? "📸" : a.kind === "videographer" ? "🎥" : a.kind === "lighting" ? "💡" : a.kind === "mix_engineer" ? "🎚️" : a.kind === "production" ? "🏗️" : a.kind === "mc" ? "🎤" : a.kind}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
              </div>
              ))}

              {/* CTA */}
              <div className="mt-12 border-4 border-ink bg-orange chunk-shadow p-6 inline-block">
                <p className="font-display text-2xl text-ink mb-2">ARE YOU AN ARTIST?</p>
                <p className="text-ink/70 text-sm mb-4">Get listed in the CCD artist directory.</p>
                <Link
                  href="/for-artists"
                  className="inline-block bg-ink text-cream font-display px-5 py-2 border-4 border-ink hover:bg-ink/80 transition-colors"
                >
                  JOIN THE ROSTER →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
