import { Globe, Users } from "lucide-react";
import type { AnalysisResult } from "@/lib/schemas/analysis";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/shared/SectionHeader";
import IconBadge from "@/components/shared/IconBadge";

interface MarketSectionProps {
  analysis: Pick<AnalysisResult, "market_size" | "customers">;
}

export default function MarketSection({ analysis }: MarketSectionProps) {
  return (
    <section id="section-market" className="scroll-mt-6 space-y-6">
      <SectionHeader
        eyebrow="Market"
        heading="Market Opportunity & Customers"
        description="Who this reaches, and how big the opportunity realistically is."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <IconBadge icon={Globe} size="sm" />
            <h3 className="text-lg font-bold text-card-foreground">Market Size</h3>
          </div>
          <p className="leading-7 text-muted-foreground">{analysis.market_size}</p>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <IconBadge icon={Users} size="sm" />
            <h3 className="text-lg font-bold text-card-foreground">Target Customers</h3>
          </div>
          <p className="leading-7 text-muted-foreground">{analysis.customers}</p>
        </Card>
      </div>
    </section>
  );
}
