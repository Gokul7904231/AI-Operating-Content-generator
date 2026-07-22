import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SimulationChartProps {
  data: any[];
}

export default function SimulationChart({ data }: SimulationChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
        <YAxis stroke="#71717a" fontSize={10} />
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: 11 }}
        />
        <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} name="Latency (ms)" />
        <Line type="monotone" dataKey="cost" stroke="#a78bfa" strokeWidth={2} dot={false} name="Cost ($)" />
      </LineChart>
    </ResponsiveContainer>
  );
}
