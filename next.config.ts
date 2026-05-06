import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
]

function buildCspHeader(): { key: string; value: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://glgldtfuvahmrlkywdoy.supabase.co'

  return {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${supabaseUrl} https://api.ipify.org`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  }
}

const productionOnlyHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
]

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pcxcqbpygyidkusetghk.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'glgldtfuvahmrlkywdoy.supabase.co',
        pathname: '/storage/v1/object/public/avatars/**',
      },
    ],
  },
  allowedDevOrigins: [
    ...(process.env.DEV_ORIGIN_IP ? [process.env.DEV_ORIGIN_IP] : []),
    '0.0.0.0',
    'localhost',
    '127.0.0.1',
    ...(process.env.DEV_ORIGIN_IP ? [
      `http://${process.env.DEV_ORIGIN_IP}:3000`,
      `https://${process.env.DEV_ORIGIN_IP}:3000`,
    ] : []),
    'http://localhost:3000',
    'https://localhost:3000',
  ],
  headers: async () => [
    {
      source: '/(.*)',
      headers: isDev
        ? securityHeaders
        : [...securityHeaders, buildCspHeader(), ...productionOnlyHeaders],
    },
  ],
};

export default nextConfig;
