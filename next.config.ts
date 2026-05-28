import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {},
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
