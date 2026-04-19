/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
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

export default nextConfig;
