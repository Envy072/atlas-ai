"use client";

import CountUp from "react-countup";
import {
  Brain,
  TrendingUp,
  ShieldAlert,
  Rocket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import IconBadge from "@/components/shared/IconBadge";

const metrics = [
  {
    title: "AI Score",
    value: 91,
    suffix: "",
    icon: Brain,
    bgClassName: "bg-primary/10",
    textClassName: "text-primary",
  },
  {
    title: "Market Confidence",
    value: 88,
    suffix: "%",
    icon: TrendingUp,
    bgClassName: "bg-success/10",
    textClassName: "text-success",
  },
  {
    title: "Risk Level",
    value: 24,
    suffix: "%",
    icon: ShieldAlert,
    bgClassName: "bg-warning/15",
    textClassName: "text-warning",
  },
  {
    title: "Scalability",
    value: 95,
    suffix: "%",
    icon: Rocket,
    bgClassName: "bg-info/10",
    textClassName: "text-info",
  },
];

export default function AIMetrics() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card
          key={metric.title}
          className="p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <IconBadge
              icon={metric.icon}
              bgClassName={metric.bgClassName}
              textClassName={metric.textClassName}
            />

            <Badge variant="success">LIVE</Badge>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">{metric.title}</p>

          <h2 className="mt-2 text-5xl font-bold tracking-tight text-card-foreground">
            <CountUp end={metric.value} duration={1.5} />
            {metric.suffix}
          </h2>
        </Card>
      ))}
    </div>
  );
}
