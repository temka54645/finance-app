import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo: standalone bundle-д хуваалцсан workspace package-уудыг trace-д оруулна.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Workspace package-ууд raw .ts экспортолдог тул transpile хийнэ.
  transpilePackages: ["@finmate/db", "@finmate/shared"],
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
