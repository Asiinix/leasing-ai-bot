import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    const andreyOrigin = process.env.ANDREY_ORIGIN?.replace(/\/$/, "");
    return {
      beforeFiles:
        andreyOrigin && !process.env.NEXT_PUBLIC_BASE_PATH
          ? [{ source: "/andrey/:path*", destination: `${andreyOrigin}/andrey/:path*` }]
          : [],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};
export default nextConfig;
