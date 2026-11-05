import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageHero from "@/components/PageHero";
import Breadcrumbs from "@/components/Breadcrumbs";
import PartnerContactDialog from "@/components/PartnerContactDialog";
import ccdLogo from "@/assets/ccd-logo.png";
import { imgUrl } from "@/lib/img";

const SHORT_BIO_50 =
  "Cats Can Dance: electronic nights from Bengaluru.";

const SHORT_BIO_150 =
  "Cats Can Dance runs Episodes, electronic music nights in Bengaluru, keeps sourced pages for South Asian electronic artists and teaches DJing for free.";

const LONG_BIO_500 =
  "Cats Can Dance (CCD) is Param Minhas (Merman) and Satwik Harisenany (Sartdawg) in Bengaluru. They run Episodes, small electronic music nights with residents DJazz, Hedz, Merman and Sartdawg. Episode 1 was at Bar Wild in April 2025; Episode 5 is at The Humming Tree on 25 November 2026. The site also lists nights across India with a credible artist or promoter behind them, keeps sourced pages for South Asian electronic artists, and runs School, free lessons in producing and DJing.";

const Press = () => {
  const pressLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Cats Can Dance: Press Kit",
    url: "https://catscandance.com/press",
    description:
      "Press kit for Cats Can Dance, a Bengaluru crew running electronic music nights. Bios, logos and contact.",
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text);

  return (
    <>
      <SEO
        title="Press kit · Cats Can Dance"
        description="Cats Can Dance press kit: short and long bios, logos, key facts and a press contact."
        path="/press"
        jsonLd={pressLd}
      />
      <main className="bg-cream text-ink min-h-screen">
        <Nav />
        <PageHero eyebrow="PRESS" title="PRESS KIT." bg="bg-ink" eyebrowColor="text-acid-yellow">
          <p className="font-display text-cream text-2xl mt-4">
            Bios, logos and a contact if you are writing about us.
          </p>
        </PageHero>

        <section className="container py-16 max-w-4xl">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Press" }]} />

          <h2 className="font-display text-3xl mb-4 mt-10">/ BRAND BIOS</h2>
          <p className="text-ink/70 mb-6">Three lengths. Copy whichever you need.</p>

          <div className="space-y-4">
            {[
              { label: "50-character version", text: SHORT_BIO_50 },
              { label: "150-character version", text: SHORT_BIO_150 },
              { label: "500-character version", text: LONG_BIO_500 },
            ].map((b) => (
              <div key={b.label} className="bg-cream border-4 border-ink chunk-shadow p-5">
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <p className="font-display text-magenta text-sm">/ {b.label}</p>
                  <button
                    onClick={() => copy(b.text)}
                    className="bg-ink text-cream font-display text-xs px-3 py-1.5 min-h-[28px] hover:bg-magenta transition-colors"
                  >
                    COPY
                  </button>
                </div>
                <p className="text-ink/85 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-3xl mb-4 mt-12">/ LOGOS</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-cream border-4 border-ink chunk-shadow p-8 text-center">
              <img src={imgUrl(ccdLogo)} alt="Cats Can Dance logo on cream background" className="w-32 mx-auto mb-4" />
              <a
                href={imgUrl(ccdLogo)}
                download="cats-can-dance-logo.png"
                className="inline-block bg-ink text-cream font-display px-4 py-2 hover:bg-magenta transition-colors"
              >
                DOWNLOAD PNG
              </a>
            </div>
            <div className="bg-ink border-4 border-ink chunk-shadow p-8 text-center">
              <img
                src={imgUrl(ccdLogo)}
                alt="Cats Can Dance logo on dark background"
                style={{ filter: "invert(1) brightness(1.2)" }}
                className="w-32 mx-auto mb-4"
              />
              <a
                href={imgUrl(ccdLogo)}
                download="cats-can-dance-logo-dark.png"
                className="inline-block bg-acid-yellow text-ink font-display px-4 py-2 hover:bg-magenta hover:text-cream transition-colors"
              >
                DOWNLOAD PNG
              </a>
            </div>
          </div>

          <h2 className="font-display text-3xl mb-4 mt-12">/ KEY FACTS</h2>
          <div className="bg-cream border-4 border-ink chunk-shadow p-6 grid sm:grid-cols-2 gap-4 text-ink/85">
            <div><span className="font-display text-magenta">Name:</span> Cats Can Dance (CCD)</div>
            <div><span className="font-display text-magenta">Founded:</span> 2025</div>
            <div><span className="font-display text-magenta">Based in:</span> Bengaluru, India</div>
            <div><span className="font-display text-magenta">Founders:</span> Param Minhas, Satwik Harisenany</div>
            <div><span className="font-display text-magenta">Nights:</span> Episodes, Bengaluru, since April 2025</div>
            <div><span className="font-display text-magenta">Web:</span> catscandance.com</div>
          </div>

          <h2 className="font-display text-3xl mb-4 mt-12">/ PRESS CONTACT</h2>
          <PartnerContactDialog
            kind="press"
            trigger={
              <button
                type="button"
                className="inline-block bg-magenta text-cream font-display text-xl px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
              >
                START A PRESS ENQUIRY →
              </button>
            }
          />
          <p className="text-ink/60 text-sm mt-3">
            Or email us directly:{" "}
            <a href="mailto:hello@catscandance.com?subject=Press%20enquiry" className="text-magenta underline decoration-2 underline-offset-2 hover:text-ink">
              hello@catscandance.com
            </a>
          </p>
        </section>
        <Footer />
      </main>
    </>
  );
};

export default Press;
