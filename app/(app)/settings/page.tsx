import { Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { H1 } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";
import SettingsNav from "@/components/settings/SettingsNav";

// An honest stub for the Account tab specifically (MILESTONE_29_DESIGN.md
// Deliverable 8) — not a built feature. Profile/account management
// remains a separate, already-tracked item (MILESTONE_27_DESIGN.md,
// MILESTONE_28_DESIGN.md's "Future Identity" section) — sign-in/out
// already works from the profile menu in the meantime. Billing and
// Usage (Milestone 45) are real, built tabs alongside this stub.
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <H1 className="mb-2">Settings</H1>
      <SettingsNav active="account" />
      <Card>
        <EmptyState
          icon={Settings}
          title="Account settings are coming soon"
          description="Profile and account management aren't available yet — sign in and out from the profile menu in the meantime."
        />
      </Card>
    </div>
  );
}
