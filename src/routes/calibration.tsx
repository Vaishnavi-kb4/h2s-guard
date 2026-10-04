import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, CheckCircle2, Database, GitCompare, LoaderCircle, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalibrationChart } from "@/components/h2s/Charts";
import { PageHeader, Panel, PanelHeader, StatusBadge } from "@/components/h2s/common";

export const Route = createFileRoute("/calibration")({
  head: () => ({
    meta: [
      { title: "Calibration — H₂S GUARD" },
      { name: "description", content: "Prototype calibration health and model management interface." },
      { property: "og:title", content: "Calibration — H₂S GUARD" },
      { property: "og:description", content: "Calibration health monitoring, drift status verification, and model assets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

export type DriftStatusOption = "Stable" | "Drift Detected" | "Calibration Required";

function Page() {
  const [modal, setModal] = useState<string | null>(null);

  // Calibration Health State
  const [lastCheckTime, setLastCheckTime] = useState<string>("04 Oct 2026, 09:30 AM");
  const [refStability, setRefStability] = useState<string>("99.4%");
  const [driftStatus, setDriftStatus] = useState<DriftStatusOption>("Stable");
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const runCalibrationCheck = async () => {
    setIsChecking(true);
    toast("Initiating optical reference calibration check...");

    await new Promise((r) => setTimeout(r, 1200));

    const nowStr = new Date().toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    setLastCheckTime(nowStr);
    setRefStability("99.8%");
    setDriftStatus("Stable");
    setIsChecking(false);
    toast.success("Calibration Check Completed — Reference Stability: 99.8% (Stable)");
  };

  return (
    <>
      <PageHeader
        title="Calibration & Model Management"
        subtitle="Versioned prototype calibration assets, health status monitoring, and optical reference stability"
        actions={<StatusBadge status="ACTIVE" />}
      />

      <div className="grid gap-5 xl:grid-cols-[.65fr_1.35fr]">
        <Panel className="p-5">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">Current Calibration</div>
          <div className="mt-2 font-mono text-4xl font-black">CAL-03</div>
          <div className="mt-3">
            <StatusBadge status="ACTIVE" />
          </div>
          <div className="mt-6 space-y-4">
            {[
              ["Last Updated", "15 Sep 2026 (Demo)"],
              ["Feature Set", "Normalized RGB · HSV · ΔE"],
              ["Validated Range", "Prototype range 0–50 ppm·h"],
              ["Model", "1001-Point PCHIP + CIEDE2000 LUT Inversion"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">{k}</div>
                <div className="mt-1 text-sm font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Color response calibration" subtitle="Prototype / Demo Calibration Data" />
          <div className="p-4">
            <CalibrationChart />
          </div>
        </Panel>
      </div>

      {/* CALIBRATION HEALTH SECTION */}
      <Panel className="mt-5 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
              <Activity className="size-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Calibration Health & Reference Stability</h3>
              <p className="text-xs text-muted-foreground">Live sensor drift monitoring, optical reference target check & age tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">Current Health:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-sm ${
                driftStatus === "Stable"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                  : driftStatus === "Drift Detected"
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                  : "bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/40"
              }`}
            >
              {driftStatus === "Stable" ? (
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              ) : driftStatus === "Drift Detected" ? (
                <Activity className="size-3.5 text-amber-600 shrink-0" />
              ) : (
                <AlertTriangle className="size-3.5 text-red-600 shrink-0" />
              )}
              {driftStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* CALIBRATION HEALTH DATA GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Calibration Version</span>
            <div className="font-mono text-sm font-bold text-foreground">CAL-03 v2.4</div>
            <span className="text-[10px] text-muted-foreground font-medium">SentraBand LUT</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Calibration Status</span>
            <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="size-4" /> ACTIVE
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Verified Valid</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Last Calibration Check</span>
            <div className="font-mono text-xs font-bold text-foreground leading-tight">{lastCheckTime}</div>
            <span className="text-[10px] text-muted-foreground font-medium">Auto Verification</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Calibration Age</span>
            <div className="font-mono text-sm font-bold text-foreground">14 Days</div>
            <span className="text-[10px] text-muted-foreground font-medium">Shelf limit: 90 days</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Reference Stability</span>
            <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{refStability}</div>
            <span className="text-[10px] text-muted-foreground font-medium">Target: &gt; 98.0%</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Drift Status</span>
            <div
              className={`font-mono text-xs font-black ${
                driftStatus === "Stable"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : driftStatus === "Drift Detected"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {driftStatus.toUpperCase()}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Threshold: 0.25 ppm·h</span>
          </div>
        </div>

        {/* DRIFT STATUS PRESET CONTROL & RUN CALIBRATION CHECK BUTTON */}
        <div className="rounded-xl border border-border bg-muted/50 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Test Drift Status Simulation:</span>
              <div className="inline-flex rounded-lg bg-card p-1 border border-border">
                {(["Stable", "Drift Detected", "Calibration Required"] as DriftStatusOption[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setDriftStatus(status);
                      if (status === "Drift Detected") setRefStability("96.2%");
                      if (status === "Calibration Required") setRefStability("92.1%");
                      if (status === "Stable") setRefStability("99.4%");
                      toast(`Drift status set to: ${status}`);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      driftStatus === status
                        ? status === "Stable"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : status === "Drift Detected"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-red-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {driftStatus === "Stable" && "✓ Optical reference scale target nominal. Zero baseline drift within 0.05 ppm·h limits."}
              {driftStatus === "Drift Detected" && "⚠️ Minor baseline drift (+0.08 ppm·h offset). Calibration check recommended."}
              {driftStatus === "Calibration Required" && "❌ Baseline drift exceeds 0.25 ppm·h tolerance limit. Recalibration mandatory."}
            </p>
          </div>

          <Button onClick={runCalibrationCheck} disabled={isChecking} className="font-bold text-xs gap-2">
            {isChecking ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {isChecking ? "Checking Calibration..." : "Run Calibration Check"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={() => setModal("dataset")}>
            <Database /> View Calibration Dataset
          </Button>
          <Button variant="outline" onClick={() => setModal("compare")}>
            <GitCompare /> Compare Calibration Versions
          </Button>
          <Button onClick={() => setModal("upload")}>
            <Upload /> Upload Calibration Dataset
          </Button>
        </div>
      </Panel>

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal === "dataset"
                ? "Calibration dataset"
                : modal === "compare"
                ? "Compare versions"
                : "Upload calibration dataset"}
            </DialogTitle>
            <DialogDescription>Prototype controls only. No production calibration data is connected.</DialogDescription>
          </DialogHeader>

          {modal === "dataset" && (
            <div className="rounded-lg bg-muted p-4 font-mono text-xs">
              CAL-03 · 6 demo points · RGB + HSV + ΔE
              <br />
              Range: 0–50 demo ppm·h
            </div>
          )}

          {modal === "compare" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-4">
                <b>CAL-02</b>
                <p className="text-xs text-muted-foreground">Legacy demo curve</p>
              </div>
              <div className="rounded-lg border border-primary bg-primary-soft p-4">
                <b>CAL-03</b>
                <p className="text-xs text-muted-foreground">Current demo curve</p>
              </div>
            </div>
          )}

          {modal === "upload" && (
            <>
              <input type="file" accept=".csv" className="rounded-lg border border-dashed border-border p-8 text-sm" />
              <Button
                onClick={() => {
                  setModal(null);
                  toast.success("Demo dataset staged for review");
                }}
              >
                Validate Dataset
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
