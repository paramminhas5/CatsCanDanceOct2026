// CCD.SCHOOL lives in its own app (repo: paramminhas5/Ableton-Final-Next).
// Switch this to https://learn.catscandance.com once that DNS record is live.
const SCHOOL_URL = process.env.NEXT_PUBLIC_SCHOOL_URL || "https://ableton-final-next-ccd-school.vercel.app";

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
      // Behold.so CDN — Instagram feed images
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
  async rewrites() {
    return [
      { source: "/episodes", destination: "/events" },
      { source: "/litter", destination: "/artists" },
      { source: "/prowl", destination: "/discover" },
      { source: "/scratch", destination: "/shop" },
      { source: "/catwalk", destination: "/playlists" },
      { source: "/nine-lives", destination: "/care" },
      { source: "/journal", destination: "/blog" },
    ];
  },
  async redirects() {
    return [
      { source: "/events", destination: "/episodes", permanent: true },
      { source: "/events/:slug", destination: "/episodes/:slug", permanent: true },
      { source: "/artists", destination: "/litter", permanent: true },
      { source: "/artists/:slug", destination: "/litter/:slug", permanent: true },
      { source: "/artists/:slug/epk", destination: "/litter/:slug/epk", permanent: true },
      { source: "/discover", destination: "/prowl", permanent: true },
      { source: "/shop", destination: "/scratch", permanent: true },
      { source: "/playlists", destination: "/catwalk", permanent: true },
      { source: "/care", destination: "/nine-lives", permanent: true },
      { source: "/blog", destination: "/journal", permanent: true },
      { source: "/blog/:slug", destination: "/journal/:slug", permanent: true },
      { source: "/ccdxsocial", destination: "/playbook", permanent: true },
      { source: "/ccdxsocial/:path*", destination: "/playbook", permanent: true },
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
