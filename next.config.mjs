import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const baseConfig = {
  // Static export for Capacitor (set to 'server' for Vercel deployment)
  output: process.env.CAPACITOR_BUILD ? 'export' : undefined,
  distDir: process.env.CAPACITOR_BUILD ? 'dist' : '.next',

  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
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

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

export default withAnalyzer(baseConfig);
