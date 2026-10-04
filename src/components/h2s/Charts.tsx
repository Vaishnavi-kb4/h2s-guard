import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/context/AppContext";

export function ExposureChart({ data }: { data?: { time: string; exposure: number }[] }) {
  const appCtx = useApp();
  const measurements = appCtx?.measurements || [];

  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    if (measurements.length > 0) {
      return measurements
        .slice()
        .reverse()
        .map((m, idx) => ({
          time: m.time || m.timestamp?.split(",")[1]?.trim() || `Record ${idx + 1}`,
          exposure: m.exposure ?? 0,
        }));
    }
    return [];
  }, [data, measurements]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 16, right: 16, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="exposureFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#334155" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis unit=" ppm·h" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              border: "1px solid #334155",
              borderRadius: 12,
              background: "#0f172a",
              color: "#ffffff",
              fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="exposure" stroke="#3b82f6" strokeWidth={3} fill="url(#exposureFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ShiftDistributionChart() {
  const appCtx = useApp();
  const measurements = appCtx?.measurements || [];

  const shiftData = useMemo(() => {
    let morningSum = 0;
    let eveningSum = 0;
    let nightSum = 0;

    if (measurements.length > 0) {
      measurements.forEach((m) => {
        const s = m.shift || "Morning Shift";
        const val = m.exposure || 0;
        if (s.includes("Morning")) morningSum += val;
        else if (s.includes("Evening")) eveningSum += val;
        else nightSum += val;
      });
    }

    return [
      { shift: "Morning Shift", totalDose: Math.round(morningSum * 10) / 10 },
      { shift: "Evening Shift", totalDose: Math.round(eveningSum * 10) / 10 },
      { shift: "Night/General Shift", totalDose: Math.round(nightSum * 10) / 10 },
    ];
  }, [measurements]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={shiftData} margin={{ top: 16, right: 16, left: -15, bottom: 0 }}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="shift" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis unit=" ppm·h" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              border: "1px solid #334155",
              borderRadius: 12,
              background: "#0f172a",
              color: "#ffffff",
              fontSize: 12,
            }}
          />
          <Bar dataKey="totalDose" fill="#f59e0b" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CalibrationChart() {
  const calibrationPoints = [
    { known: 0, response: 98 },
    { known: 1, response: 86 },
    { known: 2, response: 72 },
    { known: 3, response: 61 },
    { known: 4, response: 49 },
    { known: 5, response: 40 },
  ];

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={calibrationPoints} margin={{ top: 20, right: 25, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 5" />
          <XAxis dataKey="known" label={{ value: "Known Exposure (ppm·h)", position: "insideBottom", offset: -5, fontSize: 11, fill: "#94a3b8" }} />
          <YAxis label={{ value: "Color Response", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94a3b8" }} />
          <Tooltip contentStyle={{ border: "1px solid #334155", borderRadius: 8, background: "#0f172a", color: "#fff" }} />
          <Line type="monotone" dataKey="response" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
