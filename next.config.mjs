import { readFileSync } from "node:fs";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com https://bandcamp.com https://open.spotify.com https://w.soundcloud.com https://widget.deezer.com https://www.mixcloud.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "report-uri /api/csp-report",
].join("; ");
const IMAGE_HOSTS = JSON.parse(readFileSync(new URL("./src/lib/image-hosts.json", import.meta.url), "utf8")).hosts;
// CCD.SCHOOL lives in its own app (repo: paramminhas5/Ableton-Final-Next), served at school.catscandance.com.
// (The old default pointed at the retired July build on ableton-final-next-ccd-school.vercel.app.)
const SCHOOL_URL = process.env.NEXT_PUBLIC_SCHOOL_URL || "https://school.catscandance.com";

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
    // Real hosts only (src/lib/image-hosts.json). A wildcard for every host made the optimizer an open proxy.
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({ protocol: "https", hostname: hostname.startsWith("*.") ? `**${hostname.slice(1)}` : hostname })),
  },
  // Produce smaller output by enabling SWC minification (default in Next 14+)
  swcMinify: true,
  webpack(config) {
    return config;
  },
  // Suite names serve the existing page files (no duplicate code).
  // Plain names (3 Nov 2026): /nights, /whats-on, /artists, /tour, /shop, /listen, /adopt.
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
      { source: "/events", destination: "/nights", permanent: true },
      { source: "/events/:slug", destination: "/nights/:slug", permanent: true },
      { source: "/episodes", destination: "/nights", permanent: true },
      { source: "/episodes/:slug", destination: "/nights/:slug", permanent: true },
      { source: "/prowl", destination: "/whats-on", permanent: true },
      { source: "/discover", destination: "/whats-on", permanent: true },
      { source: "/litter", destination: "/artists", permanent: true },
      { source: "/litter/:slug", destination: "/artists/:slug", permanent: true },
      { source: "/litter/:slug/epk", destination: "/artists/:slug/epk", permanent: true },
      { source: "/scratch", destination: "/shop", permanent: true },
      { source: "/catwalk", destination: "/listen", permanent: true },
      { source: "/playlists", destination: "/listen", permanent: true },
      { source: "/nine-lives", destination: "/adopt", permanent: true },
      { source: "/care", destination: "/adopt", permanent: true },
      { source: "/blog", destination: "/journal", permanent: true },
      { source: "/blog/:slug", destination: "/journal/:slug", permanent: true },
      { source: "/ccdxsocial", destination: "/playbook", permanent: true },
      { source: "/ccdxsocial/:path*", destination: "/playbook", permanent: true },
      { source: "/school", destination: SCHOOL_URL, permanent: false },
      { source: "/school/:path*", destination: `${SCHOOL_URL}/:path*`, permanent: false },
    ];
  },
  poweredByHeader: false,
  async headers() {
    // Baseline security headers on every page (9 Nov 2026 audit). Camera stays allowed for the door scanner.
    const security = {
      source: "/(.*)",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\"), interest-cohort=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        // Report-only for now: nothing is blocked, violations are logged by /api/csp-report (Vercel logs).
        // Once the logs are clean for a couple of weeks, rename the key to Content-Security-Policy to enforce.
        { key: "Content-Security-Policy-Report-Only", value: CSP },
      ],
    };
    if (process.env.NODE_ENV === "production") {
      return [
        security,
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
