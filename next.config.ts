import type { NextConfig } from "next";

// Skip env validation during `next build` so CI doesn't need real secrets.
process.env.SKIP_ENV_VALIDATION = "true";

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker build (copies only what's needed into
  // the runner image via .next/standalone)
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.gravatar.com" },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
