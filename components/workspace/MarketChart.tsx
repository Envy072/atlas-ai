"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";
import { Card } from "@/components/ui/card";

const data = [
  { year: "2025", value: 120 },
  { year: "2026", value: 180 },
  { year: "2027", value: 260 },
  { year: "2028", value: 360 },
  { year: "2029", value: 500 },
];

export default function MarketChart() {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold text-card-foreground">Market Growth</h2>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis
              dataKey="year"
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: "0.75rem",
                color: "var(--popover-foreground)",
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
