import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "@sparticuz/chromium",
  ],
  outputFileTracingIncludes: {
    "/api/linkedin/extract-session": [
      "./node_modules/playwright-core/browsers.json",
      "./node_modules/playwright-core/package.json",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/extractor/linkedin": [
      "./node_modules/playwright-core/browsers.json",
      "./node_modules/playwright-core/package.json",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
};

export default nextConfig;
