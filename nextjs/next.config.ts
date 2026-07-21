import type { NextConfig } from "next";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://tuojgwrzfecyeiccdrlj.supabase.co";
const SUPABASE_WS = SUPABASE_URL.replace(/^https:/, "wss:");

/**
 * Content-Security-Policy.
 *
 * Shipped as Report-Only first: Next.js injects inline bootstrap scripts and inline
 * styles, and this app renders a lot of inline `style={{}}`, so an enforcing policy
 * needs 'unsafe-inline' anyway until those are migrated to nonces/classes. Running
 * Report-Only lets us find real violations against production traffic before we
 * switch the header name to `Content-Security-Policy`.
 *
 * Sources in use: Supabase (REST + realtime websocket + storage), Vercel Analytics
 * and Speed Insights, Google Sign-In (web OAuth popup/redirect).
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_URL} ${SUPABASE_WS} https://va.vercel-scripts.com https://vitals.vercel-insights.com https://accounts.google.com`,
  "frame-src 'self' https://accounts.google.com",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

/** Applied to every route. */
const securityHeaders = [
  // Force HTTPS for two years, including subdomains. rentybase.com is HTTPS-only.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Stop browsers from MIME-sniffing a response away from its declared Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking protection for /dashboard and /signin. Duplicated by CSP
  // frame-ancestors, kept for older browsers that don't honour CSP3.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs (which can contain invite tokens) to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny hardware/sensor APIs the web app never uses. Camera is used only in the
  // Capacitor WebView via the native plugin, not via getUserMedia on the web.
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "interest-cohort=()",
    ].join(", "),
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  // Note: Next 16 dropped the `eslint` config key and `next lint`. Linting runs
  // as its own step — `npm run lint` locally and in CI.

  // Modern formats + a conservative device ladder, so <Image> emits AVIF/WebP.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  // Drop console.* from client bundles in production, but keep error/warn so
  // Vercel logs and any future Sentry breadcrumbs still capture real failures.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          // Allow Android's verification crawler to fetch this without caching issues
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        // Hashed build output is immutable — cache it hard at the edge.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
