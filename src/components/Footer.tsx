import { Link } from "@/lib/compat-router";
import { supabase } from "@/lib/supabase";
import ccdLogo from "@/assets/ccd-logo.png";
import { imgUrl } from "@/lib/img";
import { useState } from "react";

const groups = [
  {
    title: "NIGHTS",
    links: [
      { to: "/nights", label: "Our Episodes" },
      { to: "/whats-on", label: "What's on" },
      { to: "/me", label: "Your account" },
      { to: "/tickets", label: "Your tickets" },
    ],
  },
  {
    title: "ARTISTS",
    links: [
      { to: "/artists", label: "The roster" },
      { to: "/tour", label: "On tour" },
      { to: "/for-artists", label: "Claim your page" },
      { to: "/for-venues", label: "For venues" },
    ],
  },
  {
    title: "SCHOOL",
    links: [
      { to: "/school", label: "CCD.SCHOOL" },
    ],
  },
  {
    title: "MORE",
    links: [
      { to: "/listen", label: "Listen" },
      { to: "/shop", label: "Shop" },
      { to: "/adopt", label: "Adopt · Nine Lives" },
      { to: "/journal", label: "Journal" },
      { to: "/for-investors", label: "For investors" },
    ],
  },
];


const Footer = () => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || state === "busy" || state === "done") return;
    setState("busy");
    try {
      const { error } = await supabase.from("early_access_signups").insert({
        email: email.toLowerCase().trim(),
        source: "footer",
      });
      // Duplicate is fine — user is already signed up
      if (error && error.code !== "23505") throw error;
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <footer className="bg-ink text-cream border-t-4 border-ink">
      <div className="container py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 text-cream">
              <img src={imgUrl(ccdLogo)} alt="" loading="lazy" className="w-10 rounded-full bg-cream p-0.5" />
              <span className="font-display text-xl">CATS CAN DANCE</span>
            </Link>
            <p className="mt-3 text-sm text-cream/70 max-w-[34ch]">Nights, artists and a school for electronic music in India. Bengaluru.</p>
            <div className="mt-6 max-w-sm">
              <p className="font-display text-xs uppercase tracking-[0.14em] text-acid-yellow mb-2">The week's picks, every Thursday</p>
              {state === "done" ? (
                <p className="font-display text-acid-yellow text-sm">You're on the list.</p>
              ) : (
                <form onSubmit={onSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    maxLength={255}
                    aria-label="Email for the newsletter"
                    className="flex-1 min-w-0 bg-cream/10 text-cream border-[3px] border-cream/30 px-3 py-2 text-sm focus:outline-none focus:border-acid-yellow placeholder:text-cream/40"
                  />
                  <button type="submit" disabled={state === "busy"} className="bg-acid-yellow text-ink font-display text-xs uppercase px-4 py-2 border-[3px] border-acid-yellow hover:bg-cream transition-colors disabled:opacity-60">
                    {state === "busy" ? "…" : "Join"}
                  </button>
                </form>
              )}
              {state === "error" && <p className="text-magenta text-xs mt-1">Something went wrong. Try again.</p>}
            </div>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <p className="font-display text-acid-yellow text-sm tracking-[0.14em] mb-3">{g.title}</p>
              <ul className="space-y-2">
                {g.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="inline-block py-1.5 text-sm text-cream/80 hover:text-acid-yellow transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t-2 border-cream/15 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-cream/60">
          <span>© {new Date().getFullYear()} Cats Can Dance, Bengaluru. So can you.</span>
          <span className="flex flex-wrap gap-x-5 gap-y-0 [&>a]:py-2 [&>a]:inline-block">
            <a href="mailto:hello@catscandance.com" className="hover:text-acid-yellow">hello@catscandance.com</a>
            <a href="https://instagram.com/catscan.dance" target="_blank" rel="noopener noreferrer" className="hover:text-acid-yellow">Instagram</a>
            <a href="https://www.youtube.com/@thesecatscandance" target="_blank" rel="noopener noreferrer" className="hover:text-acid-yellow">YouTube</a>
            <Link to="/privacy" className="hover:text-acid-yellow">Privacy</Link>
            <Link to="/terms" className="hover:text-acid-yellow">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
