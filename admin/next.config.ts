import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // srcディレクトリは自動的に認識されます
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
