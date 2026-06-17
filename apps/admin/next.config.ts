import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo: standalone bundle-д хуваалцсан workspace package-уудыг trace-д оруулна.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Workspace package-ууд raw .ts экспортолдог тул transpile хийнэ.
  transpilePackages: ["@finmate/db", "@finmate/shared"],
};

export default nextConfig;
