import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NOTRUDE_PREVIEW_BUILD && { distDir: ".next-preview" }),
  // Allow computer-use / remote browser previews hitting the local dev server.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
