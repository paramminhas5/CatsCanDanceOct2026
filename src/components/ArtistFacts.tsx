import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Item = { label: string; detail: string | null; url: string | null; date: string | null; source: string };
const TITLES: [string, string][] = [
  ["upcoming", "UPCOMING DATES"],
  ["plays", "WHAT THEY PLAY"],
  ["played_with", "PLAYED WITH"],
  ["tours", "WHERE THEY HAVE PLAYED"],
  ["listens", "FANS ALSO LISTEN TO"],
  ["fans", "THE FANS"],
  ["expect", "WHAT TO EXPECT"],
];

/** Approved profile facts only. Each was checked by the artist or by CCD. Renders nothing if none are approved. */
export default function ArtistFacts({ slug, name }: { slug: string; name: string }) {
  const [data, setData] = useState<Record<string, Item[]>>({});
  useEffect(() => { supabase.rpc("artist_profile_public", { p_slug: slug }).then(({ data }) => setData((data as any) ?? {})); }, [slug]);
  const shown = TITLES.filter(([k]) => (data[k]?.length ?? 0) > 0);
  if (shown.length === 0) return null;
  return (
    <div className="border-4 border-ink bg-cream chunk-shadow p-6 mt-6 space-y-5">
      {shown.map(([k, title]) => (
        <div key={k}>
          <p className="font-display text-xl text-ink mb-2">{title}</p>
          <ul className="space-y-1 text-sm text-ink/80">
            {data[k].map((i, n) => (
              <li key={n}>
                {i.date ? <span className="font-display text-xs mr-2">{new Date(i.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span> : null}
                {i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer" className="underline">{i.label}</a> : <span>{i.label}</span>}
                {i.detail ? <span className="text-ink/60">, {i.detail}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-xs text-ink/50">Pre-filled by CCD and approved by {name} or the CCD team.</p>
    </div>
  );
}
