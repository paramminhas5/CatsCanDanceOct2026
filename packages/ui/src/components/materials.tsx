import type { CSSProperties, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Glass readout for numbers. Cells with no value are dropped, so it never shows a blank. */
export function Readout({ cells, label }: { cells: { value: ReactNode; label: string }[]; label?: string }) {
  const shown = cells.filter((c) => c.value !== null && c.value !== undefined && c.value !== "" && c.value !== 0);
  if (!shown.length) return null;
  return (
    <div className="k-readout" aria-label={label}>
      <dl>
        {shown.map((c) => (
          <div key={c.label}>
            <dt>{c.label}</dt>
            <dd>{c.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A lacquer record. The label carries two short lines in the product colour. */
export function Record({ size, line1, line2, spin = true, className, style }: { size: number | string; line1?: ReactNode; line2?: ReactNode; spin?: boolean; className?: string; style?: CSSProperties }) {
  const px = typeof size === "number" ? size : 200;
  return (
    <div className={cx("k-rec", spin && "k-rec--spin", className)} style={{ width: size, ...style }} aria-hidden="true">
      {(line1 || line2) && (
        <div className="k-rec__label" style={{ fontSize: Math.max(7, px * 0.05) }}>
          {line1}
          {line2 && <span style={{ fontSize: "0.8em", fontWeight: 600, marginTop: 3 }}>{line2}</span>}
        </div>
      )}
    </div>
  );
}

/** Colours for drawn sleeves, picked from the title so a release keeps its colour everywhere. */
const SLEEVES: [string, string][] = [
  ["#1b3a2a", "#b6ef36"], ["#20203a", "#7c6bff"], ["#3a1e12", "#ff8a3d"], ["#102a33", "#38d6e0"],
  ["#2e1230", "#ff4d8d"], ["#16263f", "#5b8cff"], ["#33300f", "#ffe600"], ["#0f2e24", "#3ddc97"],
];
export function sleeveColours(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SLEEVES[h % SLEEVES.length];
}

/**
 * A record in its sleeve. With `cover` it shows the real artwork; without, a drawn sleeve
 * with the title and label. `out` slides the record out and back.
 */
export function Sleeve({ title, label, cover, size = "100%", out, fontSize, small }: { title: string; label?: string | null; cover?: string | null; size?: number | string; out?: boolean; fontSize?: number; small?: boolean }) {
  const [bg, ac] = sleeveColours(title);
  const style: Vars = { width: size, "--k-bg": bg, "--k-ac": ac };
  return (
    <div className={cx("k-sleeve", out && "k-sleeve--out")} style={style}>
      <Record size="92%" line1={small ? undefined : title.split(" ")[0]} line2={small ? undefined : label?.split(" ")[0]} spin={!!out} />
      <div className="k-sleeve__cover" style={fontSize ? ({ "--k-fs": `${fontSize}px` } as Vars) : undefined}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" decoding="async" />
        ) : (
          !small && (
            <>
              {label && <span className="k-sleeve__lb">{label}</span>}
              <span className="k-sleeve__tt">{title}</span>
            </>
          )
        )}
      </div>
    </div>
  );
}

export const Plinth = ({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) => (
  <div className={cx("k-plinth", className)} style={style}>{children}</div>
);
export const Arm = ({ style }: { style?: CSSProperties }) => <div className="k-arm" style={style} aria-hidden="true" />;

export type StampData = { city: string; count: number; colour: string; rotate?: number; shape?: "round" | "double" | "plain" };

/** "Played in": city stamps on paper. Count is real gigs per city. */
export function Passport({ stamps, title = "Played in", summary }: { stamps: StampData[]; title?: string; summary?: ReactNode }) {
  if (!stamps.length) return null;
  return (
    <figure className="k-paper k-passport" style={{ margin: 0 }}>
      <figcaption className="k-passport__head">
        <span>{title}</span>
        {summary && <b>{summary}</b>}
      </figcaption>
      <div className="k-passport__stamps">
        {stamps.map((s, i) => (
          <span
            key={s.city}
            className={cx("k-stamp", s.shape === "round" && "k-stamp--round", s.shape === "double" && "k-stamp--double")}
            style={{ color: s.colour, "--r": `${s.rotate ?? (i % 2 ? 6 : -7)}deg`, animationDelay: `${i * 0.12}s` } as Vars}
          >
            <span>Played</span>
            <b style={{ fontSize: s.city.length > 10 ? 15 : 20 }}>{s.city}</b>
            <span>{s.count} {s.count === 1 ? "night" : "nights"}</span>
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Display-only knob. The real controls sit next to it (keycaps, a typed amount). */
export const Knob = ({ size = 200, turn = -12, label }: { size?: number; turn?: number; label?: string }) => (
  <span className="k-knob" style={{ width: size, transform: `rotate(${turn}deg)` }} role="img" aria-label={label}><i /></span>
);

export const Sticker = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <span className="k-sticker" style={style}>{children}</span>
);

export function Marquee({ items, label }: { items: string[]; label: string }) {
  if (!items.length) return null;
  return (
    <div className="k-marquee" role="list" aria-label={label}>
      <div>
        {items.map((l) => <span key={l} role="listitem">{l}</span>)}
        {items.map((l) => <span key={`b-${l}`} aria-hidden="true">{l}</span>)}
      </div>
    </div>
  );
}

const CAT_SRC = { lime: "/cats/lime.webp", dance: "/cats/dance.webp", yellow: "/cats/yellow.webp", pink: "/cats/pink.webp" } as const;
const CAT_RATIO = { lime: 540 / 560, dance: 203 / 266, yellow: 306 / 560, pink: 512 / 560 } as const;
export type CatName = keyof typeof CAT_SRC;

/** One cat per screen: Artists lime, Nights dance, Host yellow, School pink. Decorative. */
export function Cat({ name, height = 64, move = "bob", className }: { name: CatName; height?: number; move?: "bob" | "sway" | "still"; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CAT_SRC[name]}
      alt=""
      width={Math.round(height * CAT_RATIO[name])}
      height={height}
      className={cx("k-cat", move !== "still" && `k-cat--${move}`, className)}
      loading="lazy"
      decoding="async"
    />
  );
}
