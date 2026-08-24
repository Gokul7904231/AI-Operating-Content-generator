import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface BenchmarksChartProps {
  data: any[];
}

export default function BenchmarksChart({ data }: BenchmarksChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="provider" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} width={50} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }}
          formatter={(v: number) => [`${v}ms`]}
        />
        <Bar dataKey="latency" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Avg Latency" />
        <Bar dataKey="p95" fill="#818cf8" radius={[4, 4, 0, 0]} name="P95 Latency" />
      </BarChart>
    </ResponsiveContainer>
  );
}
