import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Download, FileText, RefreshCw, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExposureChart, ShiftDistributionChart } from "@/components/h2s/Charts";
import { MetricCard, PageHeader, Panel, PanelHeader } from "@/components/h2s/common";
import { useApp } from "@/context/AppContext";
import { exportOccupationalHealthCSV, exportOccupationalHealthPDF } from "@/lib/structuredExport";
import { translations } from "@/lib/translations";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Occupational Health Exposure Reports — H₂S GUARD" },
      { name: "description", content: "Structured occupational health exposure record export (CSV & PDF)." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { currentUser, measurements, badges, workers, language } = useApp();
  const t = translations[language] || translations.English;
  const [generated, setGenerated] = useState(false);

  // Role-based scoping: Workers only export/view their own measurements; Officers export/view all
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

  const handleExportCSV = () => {
    exportOccupationalHealthCSV(userRoleMeasurements, badges, workers);
  };

  const handleExportPDF = () => {
    exportOccupationalHealthPDF(userRoleMeasurements, badges, workers);
  };

  return (
    <>
      <PageHeader
        title={`${t.reports} — Occupational Health`}
        subtitle="Generate structured exposure logs containing Worker ID, Timestamps, Shift, Dose estimates, and Badge Expiry Status for compliance record-keeping."
      />

      <Panel className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {["Date: Today", "Plant: MRPL SRU 09", "Shift: All Shifts", "Worker: All Workers", "Badge: All Badges", "Status: All"].map(
            (x) => (
              <select aria-label={x} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold" key={x}>
                <option>{x}</option>
              </select>
            )
          )}
          <Button
            className="ml-auto gap-2 bg-blue-900 text-white hover:bg-blue-800"
            onClick={() => {
              setGenerated(true);
              toast.success("Occupational health exposure dataset generated successfully");
            }}
          >
            <RefreshCw className="size-4" /> Generate Structured Report
          </Button>
        </div>
      </Panel>

      {generated && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft p-3 text-sm font-bold text-success">
          <CheckCircle2 className="size-5" /> Occupational Health Exposure Record ready for export ({measurements.length} records).
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Monitored Captures" value={measurements.length} detail="Active dosimetry records" icon={CheckCircle2} tone="success" />
        <MetricCard label="Valid Records" value={measurements.filter((m) => m.status === "VALID").length} detail="High quality measurements" icon={ShieldCheck} tone="success" />
        <MetricCard label="Registered Workers" value={workers.length} detail="Roster count" icon={FileText} tone="warning" />
        <MetricCard label="Tracked Badges" value={badges.length} detail="Assigned passive dosimeters" icon={Download} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Exposure History Trend" subtitle="Cumulative dose estimates over time" />
          <div className="p-4">
            <ExposureChart />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Exposure Trend & Distribution" subtitle="Cumulative dose estimates (ppm·h) across shifts" />
          <div className="p-4">
            <ShiftDistributionChart />
          </div>
        </Panel>
      </div>

      {/* Structured Export Controls */}
      <Panel className="mt-5 p-6 border-2 border-primary/20 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" /> Structured Occupational Health Export
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Export standardized health records including <b>Worker ID</b>, <b>Timestamp</b>, <b>Shift</b>, <b>Dose Estimate (ppm·h & 8h TWA)</b>, and <b>Badge Expiry Status</b> for HSE compliance archive.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleExportCSV} className="gap-2 font-bold bg-emerald-800 text-white hover:bg-emerald-700">
              <Download className="size-4" /> Export CSV File
            </Button>
            <Button onClick={handleExportPDF} variant="outline" className="gap-2 font-bold border-primary text-primary hover:bg-primary/10">
              <FileText className="size-4" /> Generate PDF Report
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
}
