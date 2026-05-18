import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  turbopack: {
    resolveAlias: {
      canvas: "./empty.ts",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
