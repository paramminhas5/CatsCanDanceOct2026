import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@ccd/brand", "@ccd/banner", "@ccd/db", "@ccd/auth", "@ccd/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "e-cdns-images.dzcdn.net" },
      { protocol: "https", hostname: "cdn-images.dzcdn.net" },
      { protocol: "https", hostname: "api.deezer.com" },
      { protocol: "https", hostname: "f4.bcbits.com" },
      { protocol: "https", hostname: "catscandance.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  async redirects() {
    return [
      // Old site paths. /artists/<slug> becomes /<slug>; the index stays at /artists.
      { source: "/artists/:slug([a-z0-9-]+)", destination: "/:slug", permanent: true },
      { source: "/artists/:slug([a-z0-9-]+)/epk", destination: "/:slug/epk", permanent: true },
      { source: "/club/artist", destination: "/bookings", permanent: true },
      { source: "/for-artists", destination: "/claim", permanent: false },
    ];
  },
};

export default nextConfig;
