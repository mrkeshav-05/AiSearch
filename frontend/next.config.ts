import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains
      },
      {
        protocol: 'http',
        hostname: '**', // Allow all HTTP domains  
      }
    ],
  },
};

export default nextConfig;
