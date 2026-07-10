"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";

const data = [
  { year: "2025", value: 120 },
  { year: "2026", value: 180 },
  { year: "2027", value: 260 },
  { year: "2028", value: 360 },
  { year: "2029", value: 500 },
];

export default function MarketChart() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

      <h2 className="mb-6 text-2xl font-bold">
        Market Growth
      </h2>

      <div className="h-72">

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>

            <XAxis dataKey="year" />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              fill="#93c5fd"
            />

          </AreaChart>
        </ResponsiveContainer>

      </div>

    </div>
  );
}