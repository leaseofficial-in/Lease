import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/Tools', destination: '/tools', permanent: true },
      { source: '/Compare', destination: '/compare', permanent: true },
      { source: '/Features', destination: '/features', permanent: true },
      { source: '/Blog', destination: '/blog', permanent: true },
      { source: '/For/landlords', destination: '/for/landlords', permanent: true },
      { source: '/For/tenants', destination: '/for/tenants', permanent: true },
      { source: '/Company', destination: '/company', permanent: true },
      { source: '/About', destination: '/company', permanent: true },
      { source: '/about', destination: '/company', permanent: true },
      { source: '/Privacy', destination: '/privacy', permanent: true },
      { source: '/Terms', destination: '/terms', permanent: true },
    ]
  },
};

export default nextConfig;
