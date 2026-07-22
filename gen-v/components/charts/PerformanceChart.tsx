import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface PerformanceChartProps {
  data: { date: string; avgDuration: number; cacheHits: number }[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="grad-render" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#52525b" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#52525b" }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }}
          formatter={(v: number) => [`${v}s`, "Avg Duration"]}
        />
        <Area type="monotone" dataKey="avgDuration" stroke="#10b981" strokeWidth={2} fill="url(#grad-render)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
