import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Charset and viewport are set by Next.js automatically */}
        <meta name="author" content="Cats Can Dance" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="theme-color" content="#ff2bd6" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0E0E10" media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Hreflang */}
        <link rel="alternate" hrefLang="x-default" href="https://catscandance.com/" />
        <link rel="alternate" hrefLang="en-IN" href="https://catscandance.com/" />
        <link rel="alternate" type="application/rss+xml" title="Cats Can Dance — Blog" href="https://catscandance.com/rss.xml" />

        {/* Icons */}
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="CCD" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="application-name" content="Cats Can Dance" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* IndieWeb identity */}
        <link rel="me" href="https://instagram.com/catscan.dance" />
        <link rel="me" href="https://www.youtube.com/@thesecatscandance" />

        {/* Geo */}
        <meta name="geo.region" content="IN-KA" />
        <meta name="geo.placename" content="Bangalore" />
        <meta name="geo.position" content="12.9716;77.5946" />
        <meta name="ICBM" content="12.9716, 77.5946" />

        {/* Default Open Graph and Twitter tags are set per-page via the SEO component.
            Only site-level defaults that every page shares live here. */}
        <meta property="og:site_name" content="Cats Can Dance" />
        <meta property="og:locale" content="en_IN" />

        {/* Fonts — loaded non-blocking via preload + swap pattern.
            The rel="preload" fetches the CSS early without blocking render.
            The onLoad handler swaps it to a stylesheet once downloaded.
            The noscript fallback ensures fonts load without JS. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Space+Grotesk:wght@400;500;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Space+Grotesk:wght@400;500;700&display=swap"
          media="print"
          // @ts-ignore — onLoad swaps media to "all" after download, making it non-blocking
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Space+Grotesk:wght@400;500;700&display=swap"
          />
        </noscript>
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//cdn.shopify.com" />
        <link rel="dns-prefetch" href="//supabase.co" />
        <link rel="dns-prefetch" href="//pictures.behold.so" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["Organization", "LocalBusiness"],
              "name": "Cats Can Dance",
              "alternateName": "CCD",
              "url": "https://catscandance.com",
              "logo": "https://catscandance.com/ccd-logo.png",
              "image": "https://catscandance.com/ccd-logo.png",
              "description": "Cats Can Dance is a Bangalore, India brand running underground dance music Episodes and a streetwear label.",
              "foundingDate": "2024",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Bangalore",
                "addressRegion": "Karnataka",
                "addressCountry": "IN"
              },
              "geo": { "@type": "GeoCoordinates", "latitude": 12.9716, "longitude": 77.5946 },
              "areaServed": [
                { "@type": "City", "name": "Bangalore" },
                { "@type": "City", "name": "Mumbai" },
                { "@type": "City", "name": "Hyderabad" },
                { "@type": "City", "name": "Delhi" },
                { "@type": "Country", "name": "India" }
              ],
              "sameAs": [
                "https://instagram.com/catscan.dance",
                "https://www.youtube.com/@thesecatscandance"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "hello@catscandance.com",
                "contactType": "customer support",
                "areaServed": "IN"
              }
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Cats Can Dance",
              "url": "https://catscandance.com",
              "inLanguage": "en-IN",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://catscandance.com/events?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
