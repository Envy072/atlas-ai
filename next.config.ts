import type { NextConfig } from "next";

// Milestone 122 — Production Hardening. Baseline security headers with no
// dependency on this app's own specific external calls (Supabase Auth,
// Stripe, Sentry's ingest endpoint) — safe, standard, non-breaking
// defaults for every response. Deliberately does NOT include a
// Content-Security-Policy here: getting a CSP right requires enumerating
// every real external origin this app's client code talks to and testing
// each flow (auth redirects, Stripe navigation, Sentry's own tunnel) live
// against it — a wrong CSP silently breaks production traffic rather than
// failing a build, so it's tracked as a separate, deliberately-scoped
// follow-up (MILESTONE_122 Completion Report, Medium items) rather than
// risked here.
const SECURITY_HEADERS = [
  // Prevents a response from being interpreted as a different MIME type
  // than the one declared (e.g. a JSON error body sniffed as HTML).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Refuses to let any other origin frame this app — blocks a classic
  // clickjacking vector on every route, including the auth pages.
  { key: "X-Frame-Options", value: "DENY" },
  // Sends the full referrer only to this app's own origin; a
  // cross-origin navigation (e.g. clicking an evidence source link out
  // to a third-party research site) sends only the origin, never the
  // full path/query.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Explicitly denies browser features this app never uses, rather than
  // leaving them at the browser's own permissive default.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Forces HTTPS for a year, including subdomains, once a browser has
  // seen this header once. Harmless in local dev (the header is simply
  // ignored over plain HTTP) and standard practice for a production app
  // handling real authentication and payment flows.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
