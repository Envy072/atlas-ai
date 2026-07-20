import { describe, it, expect } from "vitest";
import { buildGeographicMarket } from "@/lib/market/geography/geographicMarket";

// Milestone 71 — verifies this file's actual, current construction
// behavior: buildGeographicMarket is the one place a real
// GeographicMarket gets constructed and schema-validated. `region` is
// required; the rest, including the numeric marketSizeUsd field, are
// independently optional.
describe("buildGeographicMarket", () => {
  it("threads through every provided field", () => {
    const market = buildGeographicMarket({
      region: "North America",
      country: "US",
      marketSizeUsd: 5_000_000,
      notes: "Concentrated in major metro areas.",
    });

    expect(market).toEqual({
      region: "North America",
      country: "US",
      marketSizeUsd: 5_000_000,
      notes: "Concentrated in major metro areas.",
    });
  });

  it("requires only `region`, leaving the rest undefined otherwise", () => {
    const market = buildGeographicMarket({ region: "North America" });

    expect(market.region).toBe("North America");
    expect(market.country).toBeUndefined();
    expect(market.marketSizeUsd).toBeUndefined();
    expect(market.notes).toBeUndefined();
  });

  it("threads through the numeric marketSizeUsd field independently of the other optional fields", () => {
    const market = buildGeographicMarket({ region: "North America", marketSizeUsd: 1_000_000 });

    expect(market.marketSizeUsd).toBe(1_000_000);
    expect(market.country).toBeUndefined();
    expect(market.notes).toBeUndefined();
  });
});
