import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Link, NavLink as RouterNavLink, useLocation, useNavigate } from "@/lib/compat-router";
import { ChevronDown } from "lucide-react";
import DiscoButton from "@/components/DiscoButton";
import DiscoMute from "@/components/DiscoMute";
import DiscoHint from "@/components/DiscoHint";
import ccdLogo from "@/assets/ccd-logo.png";
import { imgUrl } from "@/lib/img";
import { useMe } from "@/lib/plans";
import { LINKS, productLink, productUrl } from "@ccd/brand";

// Plain names lead; nicknames (hints) show in the mobile menu and on the pages themselves.
// Artists, On tour and School are other products in the suite (@ccd/brand), so they are plain links.
const primaryLinks: { to: string; label: string; hint: string; external?: boolean }[] = [
  { to: "/nights",   label: "Nights",    hint: "Our Episodes" },
  { to: "/whats-on", label: "What's on", hint: "Gig guide" },
  { to: productLink("artists", LINKS.artists.index), label: "Artists", hint: "Book an artist", external: true },
  { to: productLink("artists", LINKS.artists.tour),  label: "On tour", hint: "Strays", external: true },
  { to: productUrl("school"), label: "School", hint: "Learn by making", external: true },
];

const partnersLinks = [
  { to: "/for-venues",    label: "For Venues"    },
  { to: "/for-artists",   label: "For Artists"   },
  { to: "/for-investors", label: "For Investors" },
  { to: "/playbook",      label: "Partner Playbook" },
];

const moreLinks: { to: string; label: string; external?: boolean }[] = [
  { to: "/me",         label: "Your account" },
  { to: "/tickets",    label: "Your tickets" },
  { to: "/listen",     label: "Listen" },
  { to: "/shop",       label: "Shop" },
  { to: "/adopt",      label: "Adopt · Nine Lives" },
  { to: "/club",       label: "Club" },
  { to: "/journal",    label: "Journal" },
  { to: "/guides",     label: "Guides" },
  { to: "https://instagram.com/catscan.dance", label: "Instagram", external: true },
  { to: "https://www.youtube.com/@thesecatscandance", label: "YouTube", external: true },
];

const scrollToEarlyAccess = () => {
  setTimeout(() => {
    const el = document.getElementById("early-access");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
};

const Dropdown = ({
  label,
  links,
  scrolled,
}: {
  label: string;
  links: { to: string; label: string; external?: boolean }[];
  scrolled: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const location = useLocation();
  const router = useRouter();
  const isActive = links.some((l) => location.pathname.startsWith(l.to));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const activeColor = scrolled ? "text-magenta" : "text-acid-yellow";
  const baseColor = scrolled ? "text-ink" : "text-cream";

  return (
    <li ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`font-display text-base hover:${activeColor} transition-colors inline-flex items-baseline gap-1 ${
          isActive ? activeColor : baseColor
        }`}
      >
        {label} <ChevronDown className="w-4 h-4 self-center" />
      </button>
      {open && (
        <div className="absolute top-full right-0 pt-2 min-w-[180px] z-50">
          <ul className="py-1 bg-cream border-4 border-ink chunk-shadow">
            {links.map((l) => {
              const isHash = l.to.includes("#");
              return (
                <li key={l.to}>
                  {l.external ? (
                    <a
                      href={l.to}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 font-display text-base text-ink hover:bg-acid-yellow"
                    >
                      {l.label} ↗
                    </a>
                  ) : (
                    <RouterNavLink
                      to={l.to}
                      onClick={(e) => {
                        setOpen(false);
                        if (isHash) {
                          e.preventDefault();
                          const [path, hash] = l.to.split("#");
                          const scroll = () => {
                            const el = document.getElementById(hash);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          };
                          if (location.pathname === (path || "/")) {
                            scroll();
                          } else {
                            // Use Next.js router for navigation instead of pushState
                            router.push(l.to).then(() => {
                              setTimeout(scroll, 200);
                            });
                          }
                        }
                      }}
                      className={({ isActive }) =>
                        `block px-4 py-2 font-display text-base text-ink hover:bg-acid-yellow ${
                          isActive && !isHash ? "bg-acid-yellow" : ""
                        }`
                      }
                    >
                      {l.label}
                    </RouterNavLink>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
};

const Nav = ({ forceDark = false }: { forceDark?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const me = useMe();
  const accountLabel = me.signedIn ? "Your account" : "Sign in";

  const lightBgRoutes = ["/listen", "/videos", "/shop"];
  const forceScrolledStyle = lightBgRoutes.some((r) => location.pathname === r || location.pathname.startsWith(r + "/"));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const goToEarlyAccess = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (location.pathname === "/") {
      scrollToEarlyAccess();
    } else {
      navigate("/#early-access");
      scrollToEarlyAccess();
    }
  };

  const effectiveScrolled = scrolled || forceScrolledStyle || forceDark;
  const activeColor = effectiveScrolled ? "text-magenta" : "text-acid-yellow";
  const baseColor = effectiveScrolled ? "text-ink" : "text-cream";

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all ${
        effectiveScrolled ? "bg-cream/95 backdrop-blur border-b-4 border-ink" : "bg-transparent"
      }`}
    >
      <nav className="container flex items-center justify-between py-3 md:py-4 gap-3 md:gap-4">
        <Link to="/" className={`group flex items-center gap-2 font-display text-xl md:text-2xl leading-none shrink-0 ${baseColor}`}>
          <img
            src={imgUrl(ccdLogo)}
            alt="Cats Can Dance logo"
            style={{ filter: effectiveScrolled ? "none" : "invert(1) brightness(1.2)" }}
            className="h-9 md:h-11 w-auto transition-transform duration-700 group-hover:rotate-[360deg]"
          />
          <span className="hidden sm:inline">CATS<span className="text-magenta">.</span>CAN<span className="text-magenta">.</span>DANCE</span>
          <span className="sm:hidden">CCD</span>
        </Link>

        <ul className="hidden lg:flex items-baseline gap-4">
          {primaryLinks.map((l) => (
            <li key={l.to}>
              {l.external ? (
                <a href={l.to} title={l.hint} className={`font-display text-base hover:${activeColor} transition-colors ${baseColor}`}>
                  {l.label}
                </a>
              ) : (
                <RouterNavLink
                  to={l.to}
                  title={l.hint}
                  className={({ isActive }) =>
                    `font-display text-base hover:${activeColor} transition-colors ${
                      isActive ? activeColor : baseColor
                    }`
                  }
                >
                  {l.label}
                </RouterNavLink>
              )}
            </li>
          ))}
        </ul>
        <div className="hidden lg:flex items-center gap-3">
          <span className="hidden xl:block"><DiscoMute /></span>
          <span className="hidden xl:block"><DiscoButton /></span>
          <span className="xl:hidden"><DiscoButton compact /></span>
          <RouterNavLink
            to="/me"
            className="inline-block bg-cream text-ink font-display px-3 py-2 xl:px-4 border-4 border-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform text-xs xl:text-sm"
          >
            {accountLabel}
          </RouterNavLink>
        </div>

        <div className="lg:hidden flex items-center gap-1.5 sm:gap-2 relative">
          <DiscoMute />
          <div className="relative"><DiscoButton compact /><DiscoHint /></div>
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="w-10 h-10 sm:w-11 sm:h-11 grid place-items-center border-4 border-ink bg-cream chunk-shadow"
          >
            <span className="font-display text-xl">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden bg-cream border-t-4 border-ink max-h-[85vh] overflow-y-auto">
          <div className="container py-4 space-y-1">
            {/* ── Primary navigation ── */}
            {primaryLinks.map((l) => l.external ? (
              <a key={l.to} href={l.to} className="block font-display text-xl text-ink py-2 border-b border-ink/10">
                {l.label} <span className="font-medium text-base text-ink/50">{l.hint}</span>
              </a>
            ) : (
              <RouterNavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `block font-display text-xl text-ink py-2 border-b border-ink/10 ${isActive ? "text-magenta" : ""}`
                }
              >
                {l.label} <span className="font-medium text-base text-ink/50">{l.hint}</span>
              </RouterNavLink>
            ))}

            {/* ── Work With Us group ── */}
            <div className="pt-2">
              <p className="font-display text-[10px] uppercase tracking-[0.25em] text-ink/40 mb-1">Work With Us</p>
              {partnersLinks.map((l) => (
                <RouterNavLink key={l.to} to={l.to} className="block font-display text-lg text-ink py-1.5 border-b border-ink/5">
                  {l.label}
                </RouterNavLink>
              ))}
            </div>

            {/* ── More group ── */}
            <div className="pt-2">
              <p className="font-display text-[10px] uppercase tracking-[0.25em] text-ink/40 mb-1">More</p>
              {moreLinks.map((l) =>
                l.external ? (
                  <a key={l.to} href={l.to} target="_blank" rel="noreferrer"
                    className="block font-display text-lg text-ink py-1.5 border-b border-ink/5">
                    {l.label} ↗
                  </a>
                ) : (
                  <RouterNavLink key={l.to} to={l.to} className="block font-display text-lg text-ink py-1.5 border-b border-ink/5">
                    {l.label}
                  </RouterNavLink>
                )
              )}
            </div>

            {/* ── Utilities ── */}
            <div className="pt-3 border-t-2 border-ink/20 space-y-1">
              <RouterNavLink to="/me" className="block font-display text-xl text-magenta py-2">
                {accountLabel} →
              </RouterNavLink>
              {/* Disco mode toggle */}
              <div className="flex items-center gap-3 pt-2 border-t border-ink/10">
                <span className="font-display text-sm uppercase text-ink/40 tracking-widest">Disco Mode</span>
                <DiscoButton compact />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Nav;
