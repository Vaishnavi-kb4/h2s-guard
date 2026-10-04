import React from "react";
import { useApp } from "@/context/AppContext";
import { MetricCard, PageHeader, Panel, PanelHeader, StatusBadge } from "@/components/h2s/common";
import { ExposureChart } from "@/components/h2s/Charts";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  HardHat,
  Plus,
  Users,
  Download,
  ShieldAlert,
  Clock,
  Check,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { exportOccupationalHealthCSV, exportOccupationalHealthPDF } from "@/lib/structuredExport";
import { translations } from "@/lib/translations";

import { evaluateBadgeShelfLife } from "@/lib/badgeUtils";
import { RegisterWorkerWizard } from "@/components/h2s/RegisterWorkerWizard";

export function SafetyMonitorDashboard() {
  const { workers, measurements, badges, alerts, registeredUsers, loadSampleData, clearAllData, language } = useApp();
  const [regWizardOpen, setRegWizardOpen] = React.useState(false);
  const t = translations[language] || translations.English;

  // Combine registered worker accounts with workers array from PostgreSQL
  const allWorkers = React.useMemo(() => {
    const workerUsers = registeredUsers.filter((u) => u.role === "worker");
    const map = new Map<string, any>();

    // 1. Add PostgreSQL workers
    workers.forEach((w) => {
      const badgeObj = badges.find((b) => b.id === w.badgeId);
      const shelfLife = evaluateBadgeShelfLife(badgeObj?.expiry);
      map.set(w.id, {
        ...w,
        shelfLife,
      });
    });

    // 2. Add or update with registered worker accounts
    workerUsers.forEach((u) => {
      const userMeas = measurements.filter((m) => m.workerId === u.id);
      const latest = userMeas.length > 0 ? userMeas[0] : null;
      const badgeObj = badges.find((b) => b.id === u.badgeId);
      const shelfLife = evaluateBadgeShelfLife(badgeObj?.expiry);

      const existing = map.get(u.id);
      map.set(u.id, {
        id: u.id,
        name: u.name || existing?.name || u.id,
        shift: u.shift || existing?.shift || "Morning Shift",
        badgeId: u.badgeId || existing?.badgeId || "B-00101",
        batchId: u.batchId || existing?.batchId || "BATCH-01",
        latestExposure: latest?.exposure ?? existing?.latestExposure ?? 0,
        lastMeasurement: latest?.time || existing?.lastMeasurement || "Registered worker",
        status: "Active",
        shelfLife,
      });
    });

    return Array.from(map.values());
  }, [workers, registeredUsers, measurements, badges]);

  // Dynamic metrics calculations (0 if empty)
  const totalRecords = measurements.length;
  const validMeasurements = measurements.filter((m) => m.status === "VALID").length;
  const reviewRequired = measurements.filter((m) => m.status === "REVIEW REQUIRED" || m.status === "INVALID").length;
  const activeWorkersCount = allWorkers.length;

  // Badge Shelf Life Validity calculations
  const allBadgeList = badges;

  const validBadgeCount = allBadgeList.filter((b) => evaluateBadgeShelfLife(b.expiry) === "VALID").length;
  const expiringSoonCount = allBadgeList.filter((b) => evaluateBadgeShelfLife(b.expiry) === "EXPIRING SOON").length;
  const expiredBadgeCount = allBadgeList.filter((b) => evaluateBadgeShelfLife(b.expiry) === "INVALID").length;

  return (
    <div className="space-y-6">
      {/* Top Controls & Reset Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Activity className="size-6 text-primary" />
            {t.hseDashboard}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.appSubtitle} · {t.officerPortal}
          </p>
        </div>

        {/* Data Reset / Seed controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setRegWizardOpen(true)}
            className="gap-1.5 font-bold text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl shadow-xs"
          >
            <HardHat className="size-4" />
            <span>+ Register New Worker</span>
          </Button>

          {totalRecords === 0 && activeWorkersCount === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Clean State (0 Records)</span>
              <Button size="sm" variant="secondary" onClick={loadSampleData} className="ml-2 gap-1 text-[10px] font-bold">
                <Plus className="size-3" /> {t.loadDemo}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={clearAllData} className="text-[10px] font-bold text-destructive hover:bg-destructive/10">
              {t.resetData}
            </Button>
          )}
        </div>
      </div>
      <RegisterWorkerWizard open={regWizardOpen} onOpenChange={setRegWizardOpen} />

      {/* Structured Record Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            <h3 className="font-extrabold text-base text-foreground">Structured Occupational Health Record Export</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Generates a CSV or PDF export with defined fields (Worker ID, Timestamp, Shift, Dose Estimate, Expiry Status).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => exportOccupationalHealthCSV(measurements, badges, workers)}
            className="gap-2 text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-700"
          >
            <Download className="size-3.5" /> {t.exportCsv}
          </Button>
          <Button
            onClick={() => exportOccupationalHealthPDF(measurements, badges, workers)}
            variant="outline"
            className="gap-2 text-xs font-bold border-primary text-primary hover:bg-primary/10"
          >
            <FileText className="size-3.5" /> {t.exportPdf}
          </Button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t.totalRecords}
          value={totalRecords}
          detail={totalRecords === 0 ? "No exposure records recorded" : "Across all registered workers"}
          icon={Activity}
        />
        <MetricCard
          label={t.validMeasurements}
          value={validMeasurements}
          detail={totalRecords > 0 ? `${((validMeasurements / totalRecords) * 100).toFixed(0)}% yield` : "0% yield"}
          icon={CheckCircle2}
          tone="success"
        />
        <MetricCard
          label={t.reviewRequired}
          value={reviewRequired}
          detail={reviewRequired === 0 ? "No open exceptions" : "Action required by safety officer"}
          icon={AlertTriangle}
          tone={reviewRequired > 0 ? "warning" : "primary"}
        />
        <MetricCard
          label={t.activeWorkers}
          value={activeWorkersCount}
          detail={activeWorkersCount === 0 ? "0 workers registered" : "Registered on plant roster"}
          icon={Users}
        />
      </div>

      {/* BADGE SHELF LIFE VALIDITY MONITORING PANEL */}
      <Panel className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl shadow-lg border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <Boxes className="size-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-white">{t.badgeShelfLife}</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Automated expiration and shelf-life compliance validation for passive chemical dosimeter badges
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-300">Total Badges: {allBadgeList.length}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
              <Check className="size-4" /> {t.shelfLifeValid}
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1">{validBadgeCount}</div>
            <div className="text-[10px] text-slate-300 mt-0.5">&gt; 30 Days Remaining</div>
          </div>

          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
              <Clock className="size-4" /> {t.expiringSoon}
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1">{expiringSoonCount}</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Expiry within 30 days</div>
          </div>

          <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-400">
              <X className="size-4" /> {t.expiredBadge}
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1">{expiredBadgeCount}</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Shelf life expired</div>
          </div>
        </div>
      </Panel>

      {/* Exposure Trend + Review Queue */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <Panel>
          <PanelHeader title={t.exposureTrend} subtitle="Cumulative dose estimates over time" />
          <div className="p-4">
            <ExposureChart />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title={t.alertsAndReviews}
            subtitle={`${alerts.filter((a) => a.status === "Open").length} open items`}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/alerts">{t.viewDetails}</Link>
              </Button>
            }
          />
          <div className="divide-y divide-border">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto size-8 text-emerald-500 mb-2 opacity-60" />
                No open alerts or exceptions requiring review.
              </div>
            ) : (
              alerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    <ShieldAlert className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{a.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.subject} · {a.reason}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/alerts">Review</Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* Registered Workers & Exposure + Badge Validity Table */}
      <Panel className="overflow-hidden">
        <PanelHeader
          title={t.workerDetails}
          subtitle="All user details, live passive dosimeter exposure readings, and badge shelf-life validity status"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/workers">{t.workerRoster}</Link>
            </Button>
          }
        />

        {allWorkers.length === 0 ? (
          <div className="p-12 text-center">
            <HardHat className="mx-auto size-12 text-slate-400 mb-3" />
            <h4 className="font-bold text-base">No Workers Found</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
              Click the "+ Register New Worker" button above to add workers to your HSE Account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-[10px] uppercase text-muted-foreground font-bold">
                <tr>
                  {["Worker ID", "Name", "Shift", t.assignedBadge, t.batchId, t.latestExposure, "Exposure Status", t.shelfLifeStatus].map((h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allWorkers.map((w: any) => {
                  const expVal = w.latestExposure ?? 0;
                  const statusToDisplay =
                    expVal > 20.0
                      ? "HIGH"
                      : expVal >= 8.0
                        ? "MODERATE"
                        : expVal > 0
                          ? "VALID"
                          : "ACTIVE";

                  return (
                    <tr key={w.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono font-bold text-xs">{w.id}</td>
                      <td className="px-4 py-3 font-semibold">{w.name}</td>
                      <td className="px-4 py-3 text-xs">{w.shift}</td>
                      <td className="px-4 py-3 font-mono text-xs">{w.badgeId}</td>
                      <td className="px-4 py-3 font-mono text-xs">{w.batchId || "BATCH-01"}</td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {w.latestExposure !== undefined && w.latestExposure !== null
                          ? `${w.latestExposure.toFixed(1)} ppm·h`
                          : "0.0 ppm·h"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusToDisplay} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={w.shelfLife} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
