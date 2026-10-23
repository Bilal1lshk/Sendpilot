import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": [
      "./worker/**/*",
      "./scripts/linkedin-worker.ts",
    ],
  },
};

export default nextConfig;
