import { createFileRoute } from "@tanstack/react-router";
import { Download, Eye, FileText, Search, SlidersHorizontal, FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, PanelHeader, StatusBadge, WorkflowStepper } from "@/components/h2s/common";
import { MeasurementDrawer, downloadMeasurement } from "@/components/h2s/MeasurementDrawer";
import { useApp } from "@/context/AppContext";
import type { Measurement } from "@/types/h2s";
import { exportOccupationalHealthCSV, exportOccupationalHealthPDF } from "@/lib/structuredExport";
import { evaluateBadgeShelfLife } from "@/lib/badgeUtils";
import { translations } from "@/lib/translations";

export const Route = createFileRoute("/measurements")({
  head: () => ({
    meta: [
      { title: "Measurements — H₂S GUARD" },
      { name: "description", content: "Traceable passive dosimeter measurement history and occupational health export." },
    ],
  }),
  component: MeasurementsPage,
});

function MeasurementsPage() {
  const { currentUser, measurements, badges, workers, language } = useApp();
  const t = translations[language] || translations.English;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState<Measurement | null>(null);

  // Role-based scoping: Workers only see their own measurements; Officers see all measurements
  const userRoleMeasurements = useMemo(() => {
    const isWorker = currentUser?.role === "worker";
    if (isWorker && currentUser?.id) {
      const cId = currentUser.id.trim().toLowerCase();
      const cBadge = (currentUser.badgeId || "").trim().toLowerCase();
      return measurements.filter((m) => {
        const mWorker = (m.workerId || (m as any).worker_id || "").toString().trim().toLowerCase();
        const mBadge = (m.badgeId || (m as any).badge_id || "").toString().trim().toLowerCase();
        return (mWorker && mWorker === cId) || (mBadge && cBadge && mBadge === cBadge);
      });
    }
    return measurements;
  }, [measurements, currentUser]);

  const shown = useMemo(
    () =>
      userRoleMeasurements.filter(
        (m) =>
          (m.id + (m.workerId || "") + (m.badgeId || "")).toLowerCase().includes(q.toLowerCase()) &&
          (status === "ALL" || m.status === status)
      ),
    [userRoleMeasurements, q, status]
  );

  const handleExportCSV = () => {
    exportOccupationalHealthCSV(shown, badges, workers);
  };

  const handleExportPDF = () => {
    exportOccupationalHealthPDF(shown, badges, workers);
  };

  return (
    <>
      <PageHeader
        title={currentUser?.role === "worker" ? t.personalHistory : `${t.measurements} & Dosimetry History`}
        subtitle={currentUser?.role === "worker" ? `Personal exposure trace history records for ${currentUser.name || currentUser.id} (Worker ID: ${currentUser.id}).` : "Search, inspect, and export structured occupational health exposure records (Worker ID, Timestamp, Shift, Dose Estimate, Expiry Status)."}
      />

      <WorkflowStepper current={5} />

      <Panel>
        <PanelHeader
          title={`${t.measurements} History`}
          subtitle={`${shown.length} ${t.totalRecords}`}
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-700">
                <FileSpreadsheet className="size-3.5" /> {t.exportCsv}
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1.5 text-xs font-bold border-primary text-primary hover:bg-primary/10">
                <FileText className="size-3.5" /> {t.exportPdf}
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Worker ID, Badge ID or Measurement..." className="pl-9" />
          </div>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border bg-card px-3 text-sm font-semibold">
            <option value="ALL">ALL STATUSES</option>
            <option value="VALID">VALID</option>
            <option value="INVALID">INVALID</option>
            <option value="REVIEW REQUIRED">REVIEW REQUIRED</option>
          </select>

          {["Shift: All", "Badge: All", "Calibration: All"].map((x) => (
            <select aria-label={x} className="rounded-md border border-border bg-card px-3 text-sm" key={x}>
              <option>{x}</option>
            </select>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground">
              <tr>
                {["Measurement ID", "Worker ID", "Badge ID", "Timestamp", "Shift", "Dose Estimate", "Badge Expiry", "Status", "Sync Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground text-xs">
                    No measurement records match the current filter.
                  </td>
                </tr>
              ) : (
                shown.map((m) => {
                  const b = badges.find((x) => x.id === m.badgeId);
                  const expStatus = evaluateBadgeShelfLife(b?.expiry);
                  const measDose = m.exposure ?? 0;
                  const measTwa = m.twaPpm ?? (measDose > 0 ? measDose / 8.0 : 0);
                  const statusToDisplay =
                    measDose > 20.0 || measTwa > 2.5
                      ? "HIGH"
                      : measDose >= 8.0 || measTwa >= 1.0
                      ? "MODERATE"
                      : m.status;

                  return (
                    <tr key={m.id} className="border-t border-border hover:bg-muted/50 font-mono">
                      <td className="px-4 py-3 text-xs font-bold text-primary">{m.id}</td>
                      <td className="px-4 py-3 font-bold">{m.workerId}</td>
                      <td className="px-4 py-3 text-xs">{m.badgeId}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">{m.timestamp}</td>
                      <td className="px-4 py-3 text-xs">{m.shift || "General Shift"}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-blue-900 dark:text-blue-300">
                        {m.exposure === null ? "—" : `${m.exposure.toFixed(1)} ppm·h (${measTwa.toFixed(2)} ppm)`}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={expStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusToDisplay} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.syncStatus || "SYNCED"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(m)}>
                            <Eye className="size-3.5 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => downloadMeasurement(m)} aria-label="Export record">
                            <Download className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <MeasurementDrawer measurement={selected} onClose={() => setSelected(null)} />
    </>
  );
}
