import Head from "next/head";

type Props = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  type?: "website" | "article" | "product" | "event";
  keywords?: string;
  noindex?: boolean;
};

const SITE = "https://catscandance.com";
const DEFAULT_OG = `${SITE}/ccd-logo.png`;

const absolute = (img: string) =>
  img.startsWith("http") ? img : `${SITE}${img.startsWith("/") ? "" : "/"}${img}`;

/**
 * Decide the best OG image to use.
 * Falls back to the default 1200×630 landscape OG image if no valid URL is provided.
 */
const resolveOgImage = (image?: string): string => {
  if (!image) return DEFAULT_OG;
  const abs = absolute(image);
  return abs;
};

const SEO = ({
  title,
  description,
  path = "/",
  image,
  imageAlt,
  jsonLd,
  type = "website",
  keywords,
  noindex,
}: Props) => {
  const url = `${SITE}${path}`;
  const og = resolveOgImage(image);
  const isJpg = /\.jpe?g(\?|$)/i.test(og);
  const ogType = isJpg ? "image/jpeg" : "image/png";
  const alt = imageAlt ?? title;
  const ldArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      {keywords && <meta key="keywords" name="keywords" content={keywords} />}
      <meta key="author" name="author" content="Cats Can Dance" />
      <meta
        key="robots"
        name="robots"
        content={
          noindex
            ? "noindex, nofollow"
            : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        }
      />
      <meta key="theme-color-light" name="theme-color" content="#ff2bd6" media="(prefers-color-scheme: light)" />
      <meta key="theme-color-dark" name="theme-color" content="#0E0E10" media="(prefers-color-scheme: dark)" />
      <link key="canonical" rel="canonical" href={url} />
      <link key="alternate-default" rel="alternate" hrefLang="x-default" href={url} />

      {/* Open Graph */}
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:type" property="og:type" content={type === "article" ? "article" : "website"} />
      <meta key="og:site_name" property="og:site_name" content="Cats Can Dance" />
      <meta key="og:locale" property="og:locale" content="en_IN" />
      <meta key="og:image" property="og:image" content={og} />
      <meta key="og:image:secure_url" property="og:image:secure_url" content={og} />
      <meta key="og:image:type" property="og:image:type" content={ogType} />
      <meta key="og:image:alt" property="og:image:alt" content={alt} />

      {/* Twitter */}
      <meta key="twitter:card" name="twitter:card" content="summary" />
      <meta key="twitter:site" name="twitter:site" content="@catscan.dance" />
      <meta key="twitter:creator" name="twitter:creator" content="@catscan.dance" />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={og} />
      <meta key="twitter:image:alt" name="twitter:image:alt" content={alt} />

      {ldArray.map((obj, i) => (
        <script key={`ld-${i}`} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Head>
  );
};

export default SEO;
