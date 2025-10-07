/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'njxydstcfczirnpskvad.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
};

module.exports = nextConfig;
