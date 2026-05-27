import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'aino.sbbstest.in' },
      { protocol: 'http', hostname: '**' },
    ],
  },
}

export default nextConfig
