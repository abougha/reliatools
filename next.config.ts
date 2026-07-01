import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx"],
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
