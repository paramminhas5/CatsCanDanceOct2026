/**
 * The pages for people who work with us (plan ccd/v2-plan.md section 10): artists, venues, promoters,
 * brands and gear owners. Each says what we offer today, which product does it (shown working on a phone),
 * what is free, what it costs, and one button to start. Copy is plain; anything not built yet says so.
 * The prices come from ccd/how-ccd-makes-money.md and are published on purpose.
 */
import Shell from "@/suite/Shell";
import PartnerContactDialog, { type PartnerKind } from "@/components/PartnerContactDialog";
import { CSS as HOME_CSS } from "@/suite/home2/home2.css";
import { CSS } from "./for.css";

export type Get = { app: "Nights" | "Artists" | "Host" | "Gear"; title: string; body: string; bullets: string[]; shot: string; soon?: boolean };
export type ForConfig = {
  key: string;
  seo: { title: string; description: string };
  eyebrow: string;
  title: string;
  lead: string;
  colour: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  gets: Get[];
  free: string[];
  costs: [string, string][];
  loop?: { title: string; body: string };
  faqs: [string, string][];
  contact?: { kind: PartnerKind; label: string; line: string; message?: string };
  cat?: string;
};

const APP_COLOUR: Record<Get["app"], string> = { Nights: "#2563EB", Artists: "#B6EF36", Host: "#FFE600", Gear: "#FF8A3D" };

export default function ForPage({ c }: { c: ForConfig }) {
  return (
    <Shell title={c.seo.title} description={c.seo.description}>
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS + CSS }} />
      <div className="h2x fp" style={{ ["--fc" as string]: c.colour }}>
        <section className="fp-hero">
          <div>
            <span className="h2-eye">{c.eyebrow}</span>
            <h1>{c.title}</h1>
            <p>{c.lead}</p>
            <div className="h2-btns">
              <a className="fp-key" href={c.primary.href}>{c.primary.label}</a>
              {c.secondary && <a className="h2-ghost" href={c.secondary.href}>{c.secondary.label}</a>}
            </div>
          </div>
          <div className="fp-phones" aria-hidden="true">
            {c.gets.slice(0, 3).map((g, i) => (
              <span key={g.shot} className="fp-ph" style={{ ["--i" as string]: i }}><img src={`/shots/${g.shot}.webp`} alt="" loading={i ? "lazy" : "eager"} /></span>
            ))}
          </div>
        </section>

        <section>
          <div className="h2-head"><h2>What you get</h2><p>Each part is one of our apps, and they work together. One sign-in covers all of them. The screens show example data.</p></div>
          <div className="fp-gets">
            {c.gets.map((g, i) => (
              <article key={g.title} className={`fp-get${i % 2 ? " fp-flip" : ""}`}>
                <div className="fp-get-copy">
                  <span className="fp-app" style={{ ["--ac" as string]: APP_COLOUR[g.app] }}><i />{g.app}{g.soon && <em>Coming next</em>}</span>
                  <h3>{g.title}</h3>
                  <p>{g.body}</p>
                  <ul>{g.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                </div>
                <span className="fp-shot"><img src={`/shots/${g.shot}.webp`} alt={`${g.app}: ${g.title}`} loading="lazy" /></span>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="fp-money">
            <div>
              <h2>Free</h2>
              <ul>{c.free.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
            <div>
              <h2>What it costs</h2>
              <dl>{c.costs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              <p className="fp-small">We publish every price. Nothing that is free now gets moved behind a paywall later.</p>
            </div>
          </div>
        </section>

        {c.loop && (
          <section>
            <div className="fp-loop">
              {c.cat && <img src={`/cats/${c.cat}.webp`} alt="" />}
              <div><h2>{c.loop.title}</h2><p>{c.loop.body}</p></div>
            </div>
          </section>
        )}

        <section>
          <div className="h2-head"><h2>Questions</h2></div>
          <div className="fp-faq">{c.faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>

        <section className="fp-end">
          <h2>{c.primary.label}.</h2>
          <div className="h2-btns" style={{ justifyContent: "center" }}>
            <a className="fp-key" href={c.primary.href}>{c.primary.label}</a>
            {c.contact && (
              <PartnerContactDialog kind={c.contact.kind} defaultMessage={c.contact.message} trigger={<button type="button" className="h2-ghost">{c.contact.label}</button>} />
            )}
          </div>
          {c.contact && <p className="fp-small" style={{ textAlign: "center" }}>{c.contact.line}</p>}
        </section>
        <div style={{ height: 96 }} />
      </div>
    </Shell>
  );
}
