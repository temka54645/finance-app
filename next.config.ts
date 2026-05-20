import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse"],
  images: {
    remotePatterns: [
      // Banks logos via Google favicons + Clearbit
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons" },
      { protocol: "https", hostname: "logo.clearbit.com" },
    ],
  },
};

export default nextConfig;
