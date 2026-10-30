import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Item = { id: string; kind: "photo" | "video" | "mix" | "press"; url: string; caption: string | null };

/** Photos, mixes, videos and press the artist added themselves. Renders nothing when there are none. */
export default function ArtistMedia({ slug, name }: { slug: string; name: string }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    supabase.rpc("artist_media_public", { p_slug: slug }).then(({ data }) => setItems((data as Item[]) ?? []));
  }, [slug]);
  if (items.length === 0) return null;
  const photos = items.filter((i) => i.kind === "photo");
  const links = items.filter((i) => i.kind !== "photo");
  return (
    <div className="border-4 border-ink bg-cream chunk-shadow p-6 mt-6">
      <p className="font-display text-xl text-ink mb-3">MORE FROM {name.toUpperCase()}</p>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {photos.map((p) => <img key={p.id} src={p.url} alt={p.caption ?? name} loading="lazy" className="w-full h-32 object-cover border-2 border-ink" />)}
        </div>
      )}
      {links.length > 0 && (
        <ul className="space-y-1 text-sm">
          {links.map((l) => <li key={l.id}><a href={l.url} target="_blank" rel="noopener noreferrer" className="underline">{l.kind}: {l.caption || l.url}</a></li>)}
        </ul>
      )}
    </div>
  );
}
