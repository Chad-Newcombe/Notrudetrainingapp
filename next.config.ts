import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow computer-use / remote browser previews hitting the local dev server.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
