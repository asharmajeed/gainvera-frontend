"use client";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Analysis, Workflow } from "@/lib/models";
import { categories } from "@/lib/models";
import { calculateROI } from "@/lib/roi";
import { categoryClass } from "./ui";
export function WorkloadChart({
  rows,
}: {
  rows: { w: Workflow; a: Analysis }[];
}) {
  const data = rows.map(({ w, a }) => {
    const roi = calculateROI(w, w.assumptions ?? a.defaultAssumptions);
    return {
      name: w.name
        .replace("Weekly client ", "Client ")
        .replace("Social media content ", "Content ")
        .replace("Repetitive ", "")
        .replace("Internal ", "")
        .replace("Sensitive client ", "")
        .replace("Routine task ", "Task "),
      current: roi.baseline,
      projected: roi.projected,
    };
  });
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label="Current and projected workload in monthly hours"
    >
      <ResponsiveContainer width="100%" height={235}>
        <BarChart
          data={data}
          margin={{ top: 15, right: 5, left: -25, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="#e7ebee"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#7a8594" }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#7a8594" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v) => `${Number(v).toFixed(1)} hours`}
            contentStyle={{ borderRadius: 12, border: "1px solid #e4e9ed" }}
          />
          <Bar
            name="Current workload"
            dataKey="current"
            fill="#d3e2e4"
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
          />
          <Bar
            name="Projected workload"
            dataKey="projected"
            fill="#15978d"
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function CategoryChart({ rows }: { rows: { a: Analysis }[] }) {
  return (
    <div className="category-chart">
      <div className="category-stack">
        {categories.map((c) => {
          const count = rows.filter((r) => r.a.category === c).length;
          return count ? (
            <span
              key={c}
              className={categoryClass(c)}
              style={{ flex: count }}
              title={`${c}: ${count}`}
            />
          ) : null;
        })}
      </div>
      {categories.map((c) => (
        <div className="category-line" key={c}>
          <span className={`dot ${categoryClass(c)}`} />
          <span>
            {c === "AUTOMATE NOW"
              ? "Automate now"
              : c === "AI-ASSISTED"
                ? "AI-assisted"
                : c === "SIMPLIFY WITHOUT AI"
                  ? "Simplify without AI"
                  : "Leave alone"}
          </span>
          <b>{rows.filter((r) => r.a.category === c).length}</b>
        </div>
      ))}
    </div>
  );
}
