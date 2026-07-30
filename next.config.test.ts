import { describe, it, expect } from "vitest";
import nextConfig from "@/next.config";

// Milestone 122 — Production Hardening. Locks in the baseline security
// headers applied to every response — a regression here (a dropped
// header, a typo'd value) would otherwise only ever be caught by
// manually inspecting response headers in production.
describe("next.config headers()", () => {
  it("applies the baseline security headers to every route", async () => {
    const config = await nextConfig.headers?.();
    expect(config).toBeDefined();
    expect(config).toHaveLength(1);

    const [{ source, headers }] = config!;
    expect(source).toBe("/:path*");

    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(byKey["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
  });
});
