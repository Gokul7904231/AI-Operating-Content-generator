import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface CloudinaryChartProps {
  data: any[];
}

export default function CloudinaryChart({ data }: CloudinaryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="grad-bw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#52525b" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#52525b" }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }}
          formatter={(v: number) => [`${v} MB`, "Bandwidth"]}
        />
        <Area type="monotone" dataKey="bandwidthMb" stroke="#3b82f6" strokeWidth={2} fill="url(#grad-bw)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
