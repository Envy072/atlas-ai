"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

interface ScoreGaugeProps {
  score: number;
  label?: string;
}

// A semi-circular gauge for the overall 0-100 score — real data only
// (the `score` prop is the actual AnalysisResult.score, nothing invented).
export default function ScoreGauge({ score, label = "AI Score" }: ScoreGaugeProps) {
  const data = [{ value: score, fill: "var(--primary)" }];

  return (
    <div className="flex flex-col items-center">
      <RadialBarChart
        width={200}
        height={120}
        cx="50%"
        cy="100%"
        innerRadius="75%"
        outerRadius="100%"
        barSize={16}
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          background={{ fill: "var(--muted)" }}
          dataKey="value"
          cornerRadius={8}
          isAnimationActive={false}
        />
      </RadialBarChart>

      <div className="-mt-16 text-center">
        <p className="text-5xl font-bold tracking-tight text-foreground">{score}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
