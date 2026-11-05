import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ccd/brand", "@ccd/banner", "@ccd/db", "@ccd/auth"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "jybloszaucgqlbkzquqw.supabase.co" }],
  },
  async headers() {
    return [
      {
        // The service worker must never be served stale, or an old shell sticks on the phone.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // The door, the dashboards and the admin are tools, not pages to index.
        source: "/(door|promote|admin|live|sign-in|auth)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    return [
      // Old paths from the CCD site.
      { source: "/gate", destination: "/", permanent: true },
      { source: "/door/live/:key", destination: "/live/:key", permanent: true },
      { source: "/submit-event", destination: "/submit", permanent: true },
      { source: "/submit-event/event", destination: "/submit", permanent: true },
      { source: "/ops/promoters", destination: "/admin", permanent: false },
    ];
  },
};

export default nextConfig;
