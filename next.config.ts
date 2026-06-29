import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts", "lodash"],
  },
  images: {
    minimumCacheTTL: 60,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aranhos.moph.go.th",
      },
      {
        protocol: "http",
        hostname: "192.168.4.30",
      },
    ],
  },
};

export default nextConfig;
