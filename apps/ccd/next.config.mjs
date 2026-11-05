// Cats Can Dance, apps/ccd in the platform monorepo (docs/platform-split.md).
// The other products live at their own URLs. Each one reads an env override so Vercel
// previews can point at previews, and falls back to the production URL. The same values
// live in packages/brand (productUrl); this file cannot import TypeScript, so they are repeated here.
const SCHOOL_URL = (process.env.NEXT_PUBLIC_SCHOOL_URL || "https://school.catscandance.com").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  reactStrictMode: true,
  // Enable gzip/brotli compression and reduce JS payload
  compress: true,
  // Workspace packages ship TypeScript source; Next compiles them with the app.
  transpilePackages: ["@ccd/brand", "@ccd/banner", "@ccd/db", "@ccd/auth"],
  // Tree-shake barrel imports from large packages (experimental in Next 14)
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "react-icons",
      "lucide-react",
      "recharts",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "date-fns",
    ],
  },
  images: {
    // Serve modern formats (avif/webp) for faster image loading
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "**.myshopify.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "catscandance.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Behold.so CDN: Instagram feed images
      { protocol: "https", hostname: "pictures.behold.so" },
      { protocol: "https", hostname: "**.behold.so" },
      // Catch-all for any other HTTPS image sources
      { protocol: "https", hostname: "**" },
    ],
  },
  // Produce smaller output by enabling SWC minification (default in Next 14+)
  swcMinify: true,
  webpack(config) {
    return config;
  },
  // Suite names serve the existing page files (no duplicate code).
  // Plain names (3 Nov 2026): /nights, /whats-on, /shop, /listen, /adopt.
  // Nicknames (Gig guide, Strays, Crew, Episodes, Nine Lives) live in page copy, not URLs.
  async rewrites() {
    return [
      { source: "/nights", destination: "/events" },
      { source: "/listen", destination: "/playlists" },
      { source: "/adopt", destination: "/care" },
      { source: "/journal", destination: "/blog" },
    ];
  },
  async redirects() {
    return [
      // Old names for pages that still live here.
      { source: "/events", destination: "/nights", permanent: true },
      { source: "/events/:slug", destination: "/nights/:slug", permanent: true },
      { source: "/episodes", destination: "/nights", permanent: true },
      { source: "/episodes/:slug", destination: "/nights/:slug", permanent: true },
      { source: "/prowl", destination: "/whats-on", permanent: true },
      { source: "/discover", destination: "/whats-on", permanent: true },
      { source: "/scratch", destination: "/shop", permanent: true },
      { source: "/catwalk", destination: "/listen", permanent: true },
      { source: "/playlists", destination: "/listen", permanent: true },
      { source: "/nine-lives", destination: "/adopt", permanent: true },
      { source: "/care", destination: "/adopt", permanent: true },
      { source: "/blog", destination: "/journal", permanent: true },
      { source: "/blog/:slug", destination: "/journal/:slug", permanent: true },
      { source: "/ccdxsocial", destination: "/playbook", permanent: true },
      { source: "/ccdxsocial/:path*", destination: "/playbook", permanent: true },

      { source: "/litter", destination: "/artists", permanent: true },
      { source: "/litter/:slug", destination: "/artists/:slug", permanent: true },
      { source: "/litter/:slug/epk", destination: "/artists/:slug/epk", permanent: true },

      // School (working name Ustad) has its own app and repo.
      { source: "/school", destination: SCHOOL_URL, permanent: false },
      { source: "/school/:path*", destination: `${SCHOOL_URL}/:path*`, permanent: false },
    ];
  },
  async headers() {
    if (process.env.NODE_ENV === "production") {
      return [
        {
          // Cache static assets aggressively
          source: "/_next/static/(.*)",
          headers: [
            { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          ],
        },
        {
          // Cache images
          source: "/(.*)\\.(png|jpg|jpeg|gif|webp|avif|svg|ico)",
          headers: [
            { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
          ],
        },
      ];
    }
    return [{ source: "/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
};
export default nextConfig;
