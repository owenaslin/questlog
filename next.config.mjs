import bundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Capacitor (set to 'server' for Vercel deployment)
  output: process.env.CAPACITOR_BUILD ? 'export' : undefined,
  distDir: process.env.CAPACITOR_BUILD ? 'dist' : '.next',

  images: {
    unoptimized: Boolean(process.env.CAPACITOR_BUILD),
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js inlines some bootstrap/runtime scripts; 'unsafe-inline' is
      // required until we move to nonces. Vercel analytics/speed-insights
      // load from the same origin via Next's script tag.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Old paths → new tavern-themed canonical paths (permanent)
      { source: "/quests",           destination: "/board",    permanent: true },
      { source: "/quests/:path*",    destination: "/board/:path*", permanent: true },
      { source: "/questlines",       destination: "/sagas",    permanent: true },
      { source: "/questlines/:path*",destination: "/sagas/:path*", permanent: true },
      { source: "/badges",           destination: "/trophies", permanent: true },
      { source: "/categories",       destination: "/guilds",   permanent: true },
      { source: "/generate",         destination: "/board",    permanent: true },
      { source: "/profile",          destination: "/journal",  permanent: true },
    ];
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
