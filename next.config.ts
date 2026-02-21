import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx"],
  allowedDevOrigins: ["192.168.40.2"],
};

export default nextConfig;
