/**
 * One artist on the booking desk. Photo, or a type-led poster when there is no photo.
 * Shows only what we know: rate only when the artist set one, reply time only when measured.
 */
import Link from "next/link";
import { artistPath } from "@/lib/routes";
import { actLine, formatLine, inrShort, replyLine, soundLine, type DeskArtist, type Reason } from "@/lib/desk";

const TONES = [
  "bg-electric-blue text-cream",
  "bg-magenta text-cream",
  "bg-ink text-acid-yellow",
  "bg-acid-yellow text-ink",
];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function TypePoster({ name, sound, city, className = "" }: { name: string; sound?: string; city?: string | null; className?: string }) {
  const tone = TONES[hash(name) % TONES.length];
  const long = name.length > 14;
  return (
    <div className={`relative w-full h-full ${tone} flex flex-col justify-between p-4 overflow-hidden ${className}`} aria-hidden>
      <p className="text-xs font-bold uppercase tracking-widest opacity-80 truncate">{city ?? "Cats Can Dance"}</p>
      <p className={`font-display leading-[0.85] break-words ${long ? "text-3xl md:text-4xl" : "text-5xl md:text-6xl"}`}>{name}</p>
      <p className="text-sm font-bold opacity-90 line-clamp-1">{sound || "Artist"}</p>
    </div>
  );
}

const reasonCls: Record<Reason["tone"], string> = {
  good: "bg-acid-yellow text-ink",
  warn: "bg-cream text-ink",
  bad: "bg-magenta text-cream",
  info: "bg-cream text-ink",
};

export default function ArtistListing({ a, reasons, rate, selected, disabled, onToggle }: {
  a: DeskArtist; reasons: Reason[]; rate: number | null; selected: boolean; disabled: boolean; onToggle: () => void;
}) {
  const sound = soundLine(a.genres);
  const formats = (a.settings?.formats ?? []).slice(0, 3).map(formatLine).filter(Boolean);
  const reply = replyLine(a.reply_hours);
  const [top, ...rest] = reasons;
  return (
    <li className={`border-4 border-ink bg-cream flex flex-col transition-transform ${selected ? "chunk-shadow -translate-x-[2px] -translate-y-[2px] outline outline-4 outline-acid-yellow" : ""}`}>
      <div className="relative aspect-[4/3] border-b-4 border-ink overflow-hidden bg-ink">
        <Link href={artistPath(a.slug)} className="block w-full h-full" tabIndex={-1} aria-hidden>
          {a.photo_url ? (
            <img src={a.photo_url} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <TypePoster name={a.name} sound={sound} city={a.city} />
          )}
        </Link>
        {top && (
          <span className={`absolute left-3 top-3 max-w-[70%] text-xs font-bold px-2 py-1 border-2 border-ink ${reasonCls[top.tone]}`}>{top.label}</span>
        )}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled && !selected}
          aria-pressed={selected}
          aria-label={selected ? `Remove ${a.name} from your request` : `Add ${a.name} to your request`}
          className={`absolute right-3 top-3 w-11 h-11 border-4 border-ink font-display text-2xl leading-none grid place-items-center transition-colors disabled:opacity-40 ${selected ? "bg-acid-yellow text-ink" : "bg-cream text-ink hover:bg-acid-yellow"}`}
        >
          {selected ? "✓" : "+"}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-sm font-bold text-ink/70">
          {actLine(a.acts)}{a.city ? ` · ${a.city}` : ""}
        </p>
        <h3 className="font-display text-2xl leading-[0.95] break-words">
          <Link href={artistPath(a.slug)} className="hover:text-electric-blue">{a.name}</Link>
        </h3>
        {sound && <p className="text-ink/80 leading-snug">{sound}</p>}

        {(a.played_ccd || a.verified) && (
          <p className="flex flex-wrap gap-1.5">
            {a.played_ccd && <span className="text-xs font-bold px-2 py-0.5 border-2 border-ink bg-magenta text-cream">Played CCD</span>}
            {a.verified && <span className="text-xs font-bold px-2 py-0.5 border-2 border-ink bg-electric-blue text-cream">Verified</span>}
          </p>
        )}

        {rest.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Why this artist">
            {rest.slice(0, 3).map((r) => (
              <li key={r.label} className={`text-xs font-bold px-2 py-0.5 border-2 ${r.tone === "good" ? "border-ink bg-acid-yellow" : r.tone === "bad" ? "border-magenta text-magenta" : "border-ink/30 text-ink/75"}`}>{r.label}</li>
            ))}
          </ul>
        )}

        <dl className="mt-auto pt-3 border-t-2 border-ink/15 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="font-bold">Rate</dt>
          <dd className="tabular">{rate != null ? `From ${inrShort(rate)}` : "Ask"}</dd>
          {formats.length > 0 && (<><dt className="font-bold">Sets</dt><dd className="line-clamp-2">{formats.join(" · ")}</dd></>)}
          {a.settings?.included && (<><dt className="font-bold">Includes</dt><dd className="line-clamp-1">{a.settings.included}</dd></>)}
          {reply && (<><dt className="font-bold">Replies</dt><dd>{reply.replace("Usually replies ", "")}</dd></>)}
        </dl>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled && !selected}
            aria-pressed={selected}
            className={`flex-1 font-display px-3 py-2.5 border-4 border-ink transition-colors disabled:opacity-40 ${selected ? "bg-ink text-cream" : "bg-acid-yellow hover:bg-ink hover:text-acid-yellow"}`}
          >
            {selected ? "Added" : disabled ? "3 picked" : "Add to request"}
          </button>
          <Link href={artistPath(a.slug)} className="font-display px-3 py-2.5 border-4 border-ink bg-cream hover:bg-ink hover:text-cream transition-colors">Profile</Link>
        </div>
      </div>
    </li>
  );
}
