/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  async redirects() {
    return [
      { source: "/events", destination: "/prowl", permanent: true },
      { source: "/artists", destination: "/litter", permanent: true },
      { source: "/artists/:slug", destination: "/litter/:slug", permanent: true },
      { source: "/school", destination: process.env.NEXT_PUBLIC_SCHOOL_URL || "https://ableton-final-next-ccd-school.vercel.app", permanent: false },
    ];
  },
};
export default nextConfig;
