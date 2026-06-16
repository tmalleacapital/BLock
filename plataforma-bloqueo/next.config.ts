import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Autoriza la IP de tu red local
  allowedDevOrigins: ['192.168.1.49'],
};

export default nextConfig;
