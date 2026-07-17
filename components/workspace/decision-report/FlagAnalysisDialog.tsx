"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSubmitAnalysisFlag } from "@/hooks/useSubmitAnalysisFlag";
import type { AnalysisFlagCategory } from "@/lib/schemas/analysisFlag";

interface FlagAnalysisDialogProps {
  projectId: string;
}

// Category labels shown to a founder — kept distinct from the schema's
// own snake_case values (MILESTONE_39_DESIGN.md Section 9). Ordered
// findings → critical risks → thesis → recommendation → verdict (the
// same order Milestones 34-38 built them in), then the two catch-alls.
const CATEGORY_LABEL: Record<AnalysisFlagCategory, string> = {
  finding: "A finding",
  critical_risk: "A critical risk",
  investment_thesis: "An investment thesis argument",
  recommendation: "A recommendation",
  verdict: "The final verdict",
  intelligence_data: "Market, competitor, business, or financial data",
  other: "Something else",
};

const CATEGORY_VALUES = Object.keys(CATEGORY_LABEL) as AnalysisFlagCategory[];

const MIN_DESCRIPTION_LENGTH = 10;

// The one, canonical "Report an issue" affordance (MILESTONE_39_DESIGN.md
// Section 7/10) — self-contained: owns its own open/closed state, form
// state, and the submission request lifecycle via useSubmitAnalysisFlag.
// Renders nothing into the Decision Report tree itself and calls no
// Decision Intelligence function — this dialog's only cross-cutting
// dependency is the one API route it posts to.
export default function FlagAnalysisDialog({ projectId }: FlagAnalysisDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AnalysisFlagCategory | null>(null);
  const [description, setDescription] = useState("");
  const { status, error, submit, reset } = useSubmitAnalysisFlag();

  const canSubmit = category !== null && description.trim().length >= MIN_DESCRIPTION_LENGTH && status !== "submitting";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Reset every time the dialog closes — whether by cancel, by the
      // built-in close button, or after a successful submission — so
      // reopening it always starts from a clean, honest state rather
      // than showing a stale success/error message from a prior report.
      setCategory(null);
      setDescription("");
      reset();
    }
  }

  async function handleSubmit() {
    if (!category) return;
    await submit({ projectId, category, description });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="secondary" size="sm" className="gap-1.5" render={<DialogTrigger />} nativeButton>
        <Flag className="h-3.5 w-3.5" />
        Report an issue
      </Button>
      <DialogContent>
        {status === "success" ? (
          <>
            <DialogHeader>
              <DialogTitle>Report received</DialogTitle>
              <DialogDescription>
                Thank you — the team will review this directly. No further action is needed from you.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" size="sm" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report an issue</DialogTitle>
              <DialogDescription>
                Tell us what looks wrong in this analysis. Every report is reviewed directly by the team.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="flag-category">
                  What&apos;s this about?
                </label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as AnalysisFlagCategory)}
                >
                  <SelectTrigger id="flag-category" aria-label="What's this about?">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CATEGORY_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="flag-description">
                  What&apos;s wrong?
                </label>
                <Textarea
                  id="flag-description"
                  placeholder="Describe what looks incorrect, fabricated, or unhelpful — the more specific, the better."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  maxLength={2000}
                />
              </div>

              {status === "error" && (
                <Alert variant="destructive">
                  <AlertDescription>{error ?? "Something went wrong. Please try again."}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
                {status === "submitting" ? "Submitting…" : "Submit report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
