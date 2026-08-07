import { describe, it, expect } from "vitest";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

describe("ANALYTICS_EVENTS", () => {
  it("defines exactly the taxonomy this milestone's own design specifies", () => {
    expect(Object.values(ANALYTICS_EVENTS).sort()).toEqual(
      [
        "signup_completed",
        "login_completed",
        "password_reset_requested",
        "password_reset_completed",
        "analysis_started",
        "analysis_completed",
        "analysis_failed",
        "analysis_cancelled",
        "project_opened",
        "project_deleted",
        "executive_summary_viewed",
        "investment_memo_viewed",
        "due_diligence_viewed",
        "checkout_started",
        "checkout_completed",
        "subscription_started",
        "subscription_updated",
        "subscription_cancelled",
        "subscription_payment_failed",
        "unexpected_client_error",
        "unexpected_server_error",
      ].sort()
    );
  });

  it("has no duplicate event name values", () => {
    const values = Object.values(ANALYTICS_EVENTS);
    expect(new Set(values).size).toBe(values.length);
  });
});
