import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_INTERNAL_API_URL ?? "http://backend:4000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;