import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "key" | "ghost";
type Size = "l" | "m" | "s";
type Common = { variant?: Variant; size?: Size; icon?: boolean; className?: string; children?: ReactNode };

/** One primary (key) button per block. Ghost for everything else. Icon buttons need an aria-label. */
export function ButtonLink({ variant = "ghost", size = "m", icon, className, children, ...rest }: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cx("k-btn", `k-btn--${variant}`, size !== "m" && `k-btn--${size}`, icon && "k-btn--icon", className)} {...rest}>
      {children}
    </a>
  );
}

export function Button({ variant = "ghost", size = "m", icon, className, children, type = "button", ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx("k-btn", `k-btn--${variant}`, size !== "m" && `k-btn--${size}`, icon && "k-btn--icon", className)} {...rest}>
      {children}
    </button>
  );
}

export function Pill({ on, href, children, className }: { on?: boolean; href?: string; children: ReactNode; className?: string }) {
  if (href) return <a href={href} className={cx("k-pill", className)} aria-current={on ? "true" : undefined}>{children}</a>;
  return <span className={cx("k-pill", on && "k-pill--on", className)}>{children}</span>;
}

export const Tag = ({ children }: { children: ReactNode }) => <span className="k-tag">{children}</span>;

/** Shown next to anything that is not real data yet (Param: example data is always marked). */
export const ExampleTag = ({ children = "Example" }: { children?: ReactNode }) => <span className="k-ex">{children}</span>;

export function Tabs({ items, current, label }: { items: { href: string; label: string; count?: number | null }[]; current: string; label: string }) {
  return (
    <nav className="k-tabs" aria-label={label}>
      {items.map((t) => (
        <a key={t.href} href={t.href} aria-current={t.href === current ? "page" : undefined}>
          {t.label}
          {t.count != null && <span>{t.count}</span>}
        </a>
      ))}
    </nav>
  );
}

export function SectionHead({ title, sub, right, id }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; id?: string }) {
  return (
    <div className="k-h2">
      <div>
        <h2 className="k-d" id={id}>{title}</h2>
        {sub && <p className="k-b">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Keycap({ pressed, children, sub, href, className }: { pressed?: boolean; children: ReactNode; sub?: ReactNode; href?: string; className?: string }) {
  const inner = (
    <>
      {children}
      {sub && <small>{sub}</small>}
    </>
  );
  if (href) return <a href={href} className={cx("k-keycap", className)} aria-current={pressed ? "true" : undefined}>{inner}</a>;
  return <button type="button" className={cx("k-keycap", className)} aria-pressed={pressed ? "true" : "false"}>{inner}</button>;
}

/** Status light. `on` blinks on the beat; `off` is grey; `warn` is amber. */
export const Led = ({ state = "on", children }: { state?: "on" | "off" | "warn"; children: ReactNode }) => (
  <span className={cx("k-led", state !== "on" && `k-led--${state}`)}>{children}</span>
);

export const EqBars = ({ label = "Playing" }: { label?: string }) => (
  <span className="k-eq" role="img" aria-label={label}><i /><i /><i /><i /></span>
);
