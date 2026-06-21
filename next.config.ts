import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

// Set FORCE_HTTPS=true when serving the app over HTTPS (e.g. via Coolify with TLS).
// When unset/false on a plain HTTP deployment (local homelab, no TLS cert),
// the CSP omits `upgrade-insecure-requests` and HSTS — otherwise the browser
// upgrades every HTTP asset request to HTTPS, which has no listener locally,
// and the page renders as a blank white screen.
const forceHttps = process.env.FORCE_HTTPS === 'true'

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
  const supabaseWsUrl = `wss://${new URL(supabaseUrl).host}`

  const directives = [
    "default-src 'self'",
    // 'unsafe-inline' required for Next.js RSC hydration scripts
    // (self.__next_f.push(...) bootstrap emitted inline by the SSR stream).
    // Switch to per-request nonces if you add middleware that injects them.
    "script-src 'self' 'unsafe-inline'",
    // 'unsafe-inline' required for Next.js-emitted inline styles (styled-jsx,
    // dynamic Tailwind, and RSC payload style tags). Without it the browser
    // refuses every injected <style> and the dashboard falls over with
    // "coś poszło nie tak".
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    // wss:// must be listed explicitly — CSP treats https:// and wss:// as
    // distinct sources, so a connect-src containing only the https:// Supabase
    // URL blocks Supabase Realtime websockets ("The operation is insecure").
    `connect-src 'self' ${supabaseUrl} ${supabaseWsUrl} https://api.ipify.org`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]
  if (forceHttps) {
    directives.push('upgrade-insecure-requests')
  }

  return {
    key: 'Content-Security-Policy',
    value: directives.join('; '),
  }
}

const productionOnlyHeaders = forceHttps
  ? [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      },
    ]
  : []

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
