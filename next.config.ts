import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ENV: process.env.ENV ?? '',
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;