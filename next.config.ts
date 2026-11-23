import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs the standalone server; local builds keep `next start` working for the thumbnail script.
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
