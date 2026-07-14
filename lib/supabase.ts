import { createClient } from "@supabase/supabase-js";

// DEPRECATED (Milestone 27c): this anon-key, non-cookie-aware client is
// no longer imported anywhere — lib/services/projects.ts (its one
// caller) switched to lib/supabase/server.ts's cookie-aware client,
// required for RLS's auth.uid() to resolve correctly per request. Kept
// in place deliberately rather than deleted now; remove in a dedicated
// cleanup commit once it's confirmed to have stayed unused.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);