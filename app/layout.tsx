import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://catscandance.com"),
  title: { default: "Cats Can Dance | Underground dance music, Bengaluru", template: "%s | Cats Can Dance" },
  description:
    "Cats Can Dance runs RSVP-only club nights and pet-friendly parties in Bengaluru, and keeps a curated list of the best underground dance music events in India.",
  openGraph: { images: ["/og-image.png"], siteName: "Cats Can Dance", type: "website" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Cats Can Dance",
  alternateName: "CCD",
  url: "https://catscandance.com",
  logo: "https://catscandance.com/ccd-logo.png",
  email: "hello@catscandance.com",
  sameAs: ["https://instagram.com/catscan.dance"],
  address: { "@type": "PostalAddress", addressLocality: "Bengaluru", addressCountry: "IN" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      </head>
      <body>
        <nav className="nav">
          <div className="wrap">
            <Link href="/" className="logo">
              <img src="/ccd-logo.png" alt="Cats Can Dance" />
              <span>Cats Can Dance</span>
            </Link>
            <ul>
              <li><Link href="/events">Events</Link></li>
              <li><Link href="/artists">Artists</Link></li>
              <li><a href="https://instagram.com/catscan.dance" target="_blank" rel="noreferrer">IG</a></li>
            </ul>
          </div>
        </nav>
        {children}
        <footer>
          <div className="wrap">
            <div>
              <div className="display" style={{ fontSize: 28 }}>Cats Can Dance</div>
              <p className="muted" style={{ maxWidth: "40ch" }}>
                Great music can make the world a better place for humans and animals alike. Bengaluru.
              </p>
            </div>
            <div>
              <p><a href="mailto:hello@catscandance.com">hello@catscandance.com</a></p>
              <p><a href="mailto:partnerships@catscandance.com">partnerships@catscandance.com</a></p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
