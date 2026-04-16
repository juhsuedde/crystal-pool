import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceArea, Legend } from "recharts";
import type { LogEntry, Pool } from "@/lib/storage";
import { TARGETS } from "@/lib/chemistry";

interface Props {
  pool: Pool;
  logs: LogEntry[];
}

const ChemistryChart = ({ pool, logs }: Props) => {
  const data = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const points = logs
      .filter(l => l.poolId === pool.id && l.type === "reading" && l.values && new Date(l.createdAt).getTime() >= cutoff)
      .map(l => ({
        t: new Date(l.createdAt).getTime(),
        label: new Date(l.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        ph: l.values?.ph ?? null,
        chlorine: l.values?.chlorine ?? null,
      }))
      .sort((a, b) => a.t - b.t);
    return points;
  }, [logs, pool.id]);

  if (data.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
        No readings in the last 30 days. Save a reading to see trends.
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4 pr-2">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="ph"
              domain={[6.5, 8.2]}
              stroke="hsl(var(--secondary))"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <YAxis
              yAxisId="cl"
              orientation="right"
              domain={[0, 6]}
              stroke="hsl(var(--status-crystal))"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={20}
            />
            <ReferenceArea
              yAxisId="ph"
              y1={TARGETS.ph.min}
              y2={TARGETS.ph.max}
              fill="hsl(var(--secondary))"
              fillOpacity={0.08}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            <Line
              yAxisId="ph"
              type="monotone"
              dataKey="ph"
              name="pH"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--secondary))" }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              yAxisId="cl"
              type="monotone"
              dataKey="chlorine"
              name="Chlorine (ppm)"
              stroke="hsl(var(--status-crystal))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--status-crystal))" }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChemistryChart;
