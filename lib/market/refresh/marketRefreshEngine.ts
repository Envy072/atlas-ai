import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import {
  buildManualMarketRefreshMetadata,
  buildMarketRefreshMetadata,
  isMarketStale,
} from "@/lib/market/refresh/marketRefreshPolicy";

const PRIORITY_ORDER: Record<MarketProfile["refresh"]["refreshPriority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// Pure functions only — mirrors lib/competitors' refreshEngine.ts exactly.
// This engine decides *when* a market profile should be re-researched and
// *what its refresh metadata becomes*, but never writes to a store itself.

export function requestManualRefresh(profile: MarketProfile, now: Date): MarketProfile {
  return { ...profile, refresh: buildManualMarketRefreshMetadata(now) };
}

export function requestScheduledRefresh(profile: MarketProfile, now: Date): MarketProfile {
  return { ...profile, refresh: buildMarketRefreshMetadata("scheduled", profile.confidence, now) };
}

export function requestStaleRefresh(profile: MarketProfile, now: Date): MarketProfile {
  return { ...profile, refresh: buildMarketRefreshMetadata("stale", profile.confidence, now) };
}

// Every profile whose nextRefresh has passed, ordered most-urgent first —
// the queue a future scheduled job would drain.
export function collectStaleMarkets(profiles: MarketProfile[], now: Date): MarketProfile[] {
  return profiles
    .filter((profile) => isMarketStale(profile, now))
    .sort(
      (a, b) => PRIORITY_ORDER[a.refresh.refreshPriority] - PRIORITY_ORDER[b.refresh.refreshPriority]
    );
}
