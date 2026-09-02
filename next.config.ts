import type { NextConfig } from 'next';

/**
 * Cloudflare Pages configuration.
 *
 * The hosting target expects the build output to land in the `out/`
 * directory, which is produced by Next.js when `output: 'export'` is
 * enabled. This bundles the app as fully static HTML + JS — no
 * server-side runtime is required at request time.
 *
 * Consequences:
 *  - All `/api/*` route handlers are removed (they cannot run in a
 *    static export). The geo data fallback uses the bundled JSON
 *    directly inside `client-data.ts` instead.
 *  - `images.unoptimized` must be `true` (no Next.js image optimizer
 *    in static mode).
 *  - `trailingSlash: true` makes the generated files friendly to
 *    Cloudflare Pages' default asset resolution.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
