import { createClient } from "@/lib/supabase/server";
import { ExternalServiceError } from "@/lib/errors";
import type { RateLimitStore } from "@/lib/services/rateLimit/types";

// A genuinely working store — Supabase Postgres, reusing infrastructure
// already in this project rather than introducing a new external
// dependency (Milestone 47's own architecture decision). Calls the
// increment_rate_limit_bucket() function
// (supabase/migrations/20260718173457_rate_limit_buckets.sql), which is
// the actual security boundary — this class needs no service-role
// client, since the function itself bypasses the table's own RLS
// narrowly and safely (see the migration's own comments).
export class SupabaseRateLimitStore implements RateLimitStore {
  async increment(bucketKey: string, windowStart: Date): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("increment_rate_limit_bucket", {
      p_bucket_key: bucketKey,
      p_window_start: windowStart.toISOString(),
    });

    if (error) {
      throw new ExternalServiceError("Supabase", `Rate limit increment failed: ${error.message}`);
    }

    // Opportunistic cleanup for this exact bucket_key, one window's
    // worth of buffer behind the window just incremented — best-effort,
    // never allowed to fail the actual rate-limit check it rides along
    // with.
    void supabase
      .rpc("cleanup_rate_limit_bucket", {
        p_bucket_key: bucketKey,
        p_older_than: new Date(windowStart.getTime() - 3_600_000).toISOString(),
      })
      .then(({ error: cleanupError }) => {
        if (cleanupError) {
          console.error("Rate limit bucket cleanup failed:", cleanupError);
        }
      });

    return data as number;
  }
}
