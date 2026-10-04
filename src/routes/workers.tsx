import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Activity, Clock3, UserRound, HardHat, ShieldAlert, CheckCircle2, ExternalLink, Thermometer, CloudRain, ArrowUpRight } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExposureChart } from "@/components/h2s/Charts";
import { MetricCard, PageHeader, Panel, PanelHeader, StatusBadge } from "@/components/h2s/common";
import { useApp } from "@/context/AppContext";
import type { Worker, Measurement } from "@/types/h2s";
import { evaluateBadgeShelfLife } from "@/lib/badgeUtils";
import { RegisterWorkerWizard } from "@/components/h2s/RegisterWorkerWizard";

export const Route = createFileRoute("/workers")({
  head: () => ({
    meta: [
      { title: "Workers — H₂S GUARD" },
      { name: "description", content: "Occupational health worker roster and exposure monitoring." },
    ],
  }),
  component: WorkersPage,
});

function WorkersPage() {
  const navigate = useNavigate();
  const { workers, registeredUsers, measurements, badges } = useApp();
  const [selected, setSelected] = useState<Worker | null>(null);
  const [regWizardOpen, setRegWizardOpen] = useState(false);

  // Combine registered worker accounts with workers array
  const allWorkers: Worker[] = Array.from(
    new Map(
      [
        ...registeredUsers
          .filter((u) => u.role === "worker")
          .map((u) => {
            const userMeas = measurements.filter((m) => m.workerId === u.id);
            const latest = userMeas.length > 0 ? userMeas[0] : null;
            return {
              id: u.id,
              name: u.name,
              shift: u.shift,
              badgeId: u.badgeId,
              latestExposure: latest?.exposure ?? 0,
              lastMeasurement: latest?.time || "Registered worker",
              status: "Active" as const,
            };
          }),
        ...workers,
      ].map((w) => [w.id, w])
    ).values()
  );

  // Dynamic counts
  const highRiskCount = allWorkers.filter((w) => (w.latestExposure ?? 0) > 20.0).length;
  const measuredCount = allWorkers.filter((w) => (w.latestExposure ?? 0) > 0).length;

  // Selected Worker Timeline Measurements
  const workerTimelineMeasurements: Measurement[] = useMemo(() => {
    if (!selected) return [];
    return measurements.filter((m) => m.workerId === selected.id);
  }, [selected, measurements]);

  // Chart data for selected worker
  const selectedChartData = useMemo(() => {
    return workerTimelineMeasurements
      .slice()
      .reverse()
      .map((m) => ({
        time: m.time || m.timestamp,
        exposure: m.exposure ?? 0,
      }));
  }, [workerTimelineMeasurements]);

  const handleOpenMeasurementTrace = (m: Measurement) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("h2s_selected_trace_id", m.id);
    }
    navigate({ to: "/capture", search: { stage: "trace", id: m.id } });
  };

  return (
    <>
      <PageHeader
        title="Worker Exposure Roster"
        subtitle="Assigned wristband badges, live cumulative exposure levels, and workplace threshold status."
        action={
          <Button
            size="sm"
            onClick={() => setRegWizardOpen(true)}
            className="gap-1.5 font-bold text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl shadow-xs"
          >
            <HardHat className="size-4" />
            <span>+ Register New Worker</span>
          </Button>
        }
      />
      <RegisterWorkerWizard open={regWizardOpen} onOpenChange={setRegWizardOpen} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Active Roster Monitored" value={allWorkers.length} detail="Assigned field workers" icon={UserRound} />
        <MetricCard label="Measured Exposure Records" value={measuredCount} detail={`${allWorkers.length ? Math.round((measuredCount / allWorkers.length) * 100) : 0}% roster coverage`} icon={Activity} tone="success" />
        <MetricCard label="High / Moderate Risk Alerts" value={highRiskCount} detail={highRiskCount > 0 ? "Action required by safety officer" : "Zero high risk workers"} icon={ShieldAlert} tone={highRiskCount > 0 ? "danger" : "primary"} />
      </div>

      <Panel>
        <PanelHeader
          title="Worker Roster & Dosimetry Exposure Status"
          subtitle={`${allWorkers.length} registered workers monitored`}
          action={
            <Button
              size="sm"
              onClick={() => setRegWizardOpen(true)}
              className="gap-1 font-bold text-xs bg-emerald-700 hover:bg-emerald-600 text-white"
            >
              + Register New Worker
            </Button>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground">
              <tr>
                {["Worker ID", "Name", "Shift", "Assigned Badge", "Latest Exposure", "Last Measurement", "Exposure Status", "Validity of Shelf Life", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allWorkers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground text-xs">
                    <HardHat className="mx-auto size-8 text-slate-400 mb-2" />
                    No workers currently registered.
                  </td>
                </tr>
              ) : (
                allWorkers.map((w) => {
                  const expVal = w.latestExposure ?? 0;
                  const statusToDisplay =
                    expVal > 20.0
                      ? "HIGH"
                      : expVal >= 8.0
                      ? "MODERATE"
                      : expVal > 0
                      ? "VALID"
                      : "ACTIVE";

                  const b = badges.find((x) => x.id === w.badgeId);
                  const shelfLife = evaluateBadgeShelfLife(b?.expiry || "12 Jan 2027");

                  return (
                    <tr className="hover:bg-muted/50 transition-colors" key={w.id}>
                      <td className="px-4 py-3 font-mono font-bold text-xs">{w.id}</td>
                      <td className="px-4 py-3 font-semibold">{w.name}</td>
                      <td className="px-4 py-3 text-xs">{w.shift}</td>
                      <td className="px-4 py-3 font-mono text-xs">{w.badgeId}</td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-900 dark:text-blue-300">
                        {w.latestExposure !== undefined && w.latestExposure !== null
                          ? `${w.latestExposure.toFixed(1)} ppm·h`
                          : "0.0 ppm·h"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{w.lastMeasurement || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusToDisplay} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={shelfLife} />
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(w)} className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/10">
                          View details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle>Worker {selected.id} — {selected.name}</SheetTitle>
                  <StatusBadge
                    status={
                      (selected.latestExposure ?? 0) > 20.0
                        ? "HIGH"
                        : (selected.latestExposure ?? 0) >= 8.0
                        ? "MODERATE"
                        : (selected.latestExposure ?? 0) > 0
                        ? "VALID"
                        : "ACTIVE"
                    }
                  />
                </div>
                <SheetDescription>Occupational health worker profile, exposure timeline & trace logs.</SheetDescription>
              </SheetHeader>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Info k="Current Shift" v={selected.shift} />
                <Info k="Assigned Badge" v={selected.badgeId} />
                <Info k="Latest Exposure" v={`${(selected.latestExposure ?? 0).toFixed(1)} ppm·h`} />
                <Info
                  k="Workplace Hazard Level"
                  v={
                    (selected.latestExposure ?? 0) > 20.0
                      ? "🚨 HIGH EXPOSURE ALERT"
                      : (selected.latestExposure ?? 0) >= 8.0
                      ? "⚠ MODERATE EXPOSURE"
                      : "✓ Safe Exposure Level"
                  }
                />
              </div>

              {/* Exposure Trend Chart */}
              <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="size-4 text-primary" /> Exposure Trend Chart
                    </h3>
                    <p className="text-xs text-foreground font-semibold">Chronological Exposure Profile for Worker {selected.id}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                    {workerTimelineMeasurements.length} Readings
                  </span>
                </div>
                <ExposureChart data={selectedChartData} />
              </div>

              {/* Exposure Timeline */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Clock3 className="size-4 text-primary" /> Exposure Timeline
                    </h3>
                    <p className="text-xs text-foreground font-semibold">Chronological measurement log (Click any entry to open Measurement Trace)</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {workerTimelineMeasurements.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleOpenMeasurementTrace(m)}
                      className="group relative cursor-pointer rounded-xl border border-border bg-card hover:bg-muted/60 p-4 transition-all hover:border-primary/50 shadow-xs hover:shadow-md"
                    >
                      {/* Top Bar: Timestamp, Badge ID & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            🕒
                          </span>
                          <span className="font-mono text-xs font-black text-foreground">
                            {m.timestamp || m.time}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                            Badge: {m.badgeId || selected.badgeId}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge status={m.status || "VALID"} />
                          <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            View Trace <ArrowUpRight className="size-3" />
                          </span>
                        </div>
                      </div>

                      {/* 7 Required Metrics Grid: Timestamp, Dose, Uncertainty, Temp, Humidity, Badge ID, Status */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        {/* Dose */}
                        <div className="rounded-lg bg-muted/50 p-2 border border-border/40">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Dose</span>
                          <b className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                            {(m.exposure ?? 0).toFixed(2)} ppm·h
                          </b>
                        </div>

                        {/* Uncertainty */}
                        <div className="rounded-lg bg-muted/50 p-2 border border-border/40">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Uncertainty</span>
                          <b className="text-foreground font-bold">{m.uncertainty || "±0.15 ppm·h"}</b>
                        </div>

                        {/* Temperature */}
                        <div className="rounded-lg bg-muted/50 p-2 border border-border/40">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                            <Thermometer className="size-3 text-amber-500" /> Temperature
                          </span>
                          <b className="text-foreground font-bold">{m.temperature || "25.0 °C"}</b>
                        </div>

                        {/* Humidity */}
                        <div className="rounded-lg bg-muted/50 p-2 border border-border/40">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                            <CloudRain className="size-3 text-blue-500" /> Humidity
                          </span>
                          <b className="text-foreground font-bold">{m.humidity || "50% RH"}</b>
                        </div>
                      </div>

                      {/* Prompt to open Measurement Trace */}
                      <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-mono">ID: {m.id}</span>
                        <span className="font-bold text-primary flex items-center gap-1">
                          Click to view full traceable calibration audit <ExternalLink className="size-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{k}</div>
      <div className="mt-1 text-sm font-semibold">{v}</div>
    </div>
  );
}
