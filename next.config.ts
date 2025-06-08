import withMDX from "@next/mdx";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { NextConfig } from "next";

// Enable MDX with KaTeX support
const mdx = withMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Prevent ESLint build crashes on Vercel/Cloudflare
    ignoreDuringBuilds: true,
  },
  pageExtensions: ["ts", "tsx", "mdx"],
};

export default mdx(nextConfig);

