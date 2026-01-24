import type { NextConfig } from 'next';
import { resolve } from 'path';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Set the correct workspace root to silence the lockfile warning
  outputFileTracingRoot: resolve(__dirname),

  // Configure image domains if needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
