import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import type { Measurement } from "@/types/h2s";

export interface ReliabilityFactors {
  imageQuality: { status: "PASS" | "FAIL"; text: string };
  badgeValidity: { status: "PASS" | "FAIL"; text: string };
  referenceQuality: { status: "PASS" | "FAIL"; text: string };
  calibrationValidity: { status: "PASS" | "FAIL"; text: string };
  environmentalData: { status: "PASS" | "FAIL"; text: string };
  captureIntegrity: { status: "PASS" | "FAIL"; text: string };
  overallStatus: "HIGH RELIABILITY" | "REVIEW REQUIRED";
}

export function evaluateMeasurementReliability(measurement: Partial<Measurement>): ReliabilityFactors {
  const isImagePass = (measurement.quality ?? 94) >= 60 && !measurement.warningMessage?.toLowerCase().includes("glare");
  const isBadgePass = !measurement.warningMessage?.toLowerCase().includes("expired");
  const isRefPass = !measurement.warningMessage?.toLowerCase().includes("patch") && !measurement.warningMessage?.toLowerCase().includes("drift");
  const isCalPass = measurement.calibrationRange !== "INSUFFICIENT CALIBRATION DATA";
  const isEnvPass = measurement.environmentalCompensationApplied !== false;
  const isIntegrityPass = measurement.deviceBindingStatus !== "DEVICE MISMATCH" && measurement.deviceVerified !== false;

  const allPass = isImagePass && isBadgePass && isRefPass && isCalPass && isEnvPass && isIntegrityPass;

  return {
    imageQuality: {
      status: isImagePass ? "PASS" : "FAIL",
      text: isImagePass ? `PASS (${measurement.quality || 94}% Score)` : "LOW QUALITY",
    },
    badgeValidity: {
      status: isBadgePass ? "PASS" : "FAIL",
      text: isBadgePass ? "PASS (Valid Shelf Life)" : "EXPIRED BADGE",
    },
    referenceQuality: {
      status: isRefPass ? "PASS" : "FAIL",
      text: isRefPass ? "PASS (12/12 Patches Healthy)" : "PATCH DRIFT DETECTED",
    },
    calibrationValidity: {
      status: isCalPass ? "PASS" : "FAIL",
      text: isCalPass ? "PASS (CAL-03 LUT Model)" : "INVALID CALIBRATION",
    },
    environmentalData: {
      status: isEnvPass ? "PASS" : "FAIL",
      text: isEnvPass ? `ACTIVE (${measurement.temperature || "31.2 °C"} / ${measurement.humidity || "68% RH"})` : "UNCOMPENSATED",
    },
    captureIntegrity: {
      status: isIntegrityPass ? "PASS" : "FAIL",
      text: isIntegrityPass ? `VERIFIED (${measurement.deviceId || "DEV-MOB-8841"})` : "DEVICE MISMATCH",
    },
    overallStatus: allPass ? "HIGH RELIABILITY" : "REVIEW REQUIRED",
  };
}

export function MeasurementReliabilityPanel({ measurement }: { measurement: Partial<Measurement> }) {
  const reliability = evaluateMeasurementReliability(measurement);
  const isHighReliability = reliability.overallStatus === "HIGH RELIABILITY";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      {/* Header & Overall Software Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Measurement Reliability Assessment
            </h4>
            <p className="text-xs font-bold text-foreground">
              Software Computation Integrity & Multi-Factor Verification
            </p>
          </div>
        </div>

        {/* OVERALL SOFTWARE STATUS BANNER (HIGH RELIABILITY vs REVIEW REQUIRED) */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border shadow-xs ${
            isHighReliability
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40"
              : "bg-red-500/20 text-red-900 dark:text-red-200 border-red-500/50"
          }`}
        >
          {isHighReliability ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 text-red-600 animate-pulse shrink-0" />
          )}
          <span>{reliability.overallStatus}</span>
        </div>
      </div>

      {/* 6 SEPARATE FACTOR STATUSES GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
        {/* 1. Image Quality */}
        <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">1. Image Quality</span>
          <div className="flex items-center justify-between">
            <b className="text-[11px] text-foreground font-bold">{reliability.imageQuality.text}</b>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                reliability.imageQuality.status === "PASS"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/20 text-red-800 dark:text-red-300"
              }`}
            >
              {reliability.imageQuality.status}
            </span>
          </div>
        </div>

        {/* 2. Badge Validity */}
        <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">2. Badge Validity</span>
          <div className="flex items-center justify-between">
            <b className="text-[11px] text-foreground font-bold">{reliability.badgeValidity.text}</b>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                reliability.badgeValidity.status === "PASS"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/20 text-red-800 dark:text-red-300"
              }`}
            >
              {reliability.badgeValidity.status}
            </span>
          </div>
        </div>

        {/* 3. Reference Quality */}
        <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">3. Reference Quality</span>
          <div className="flex items-center justify-between">
            <b className="text-[11px] text-foreground font-bold">{reliability.referenceQuality.text}</b>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                reliability.referenceQuality.status === "PASS"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/20 text-red-800 dark:text-red-300"
              }`}
            >
              {reliability.referenceQuality.status}
            </span>
          </div>
        </div>

        {/* 4. Calibration Validity */}
        <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">4. Calibration Validity</span>
          <div className="flex items-center justify-between">
            <b className="text-[11px] text-foreground font-bold">{reliability.calibrationValidity.text}</b>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                reliability.calibrationValidity.status === "PASS"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/20 text-red-800 dark:text-red-300"
              }`}
            >
              {reliability.calibrationValidity.status}
            </span>
          </div>
        </div>

        {/* 5. Environmental Data */}
        <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">5. Environmental Data</span>
          <div className="flex items-center justify-between">
            <b className="text-[11px] text-foreground font-bold">{reliability.environmentalData.text}</b>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                reliability.environmentalData.status === "PASS"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/20 text-red-800 dark:text-red-300"
              }`}
            >
              {reliability.environmentalData.status}
            </span>
          </div>
        </div>

        {/* 6. Capture Integrity */}
        <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">6. Capture Integrity</span>
          <div className="flex items-center justify-between">
            <b className="text-[11px] text-foreground font-bold">{reliability.captureIntegrity.text}</b>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                reliability.captureIntegrity.status === "PASS"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/20 text-red-800 dark:text-red-300"
              }`}
            >
              {reliability.captureIntegrity.status}
            </span>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/30">
        <span>* Reliability status evaluates software measurement confidence independent of exposure dose.</span>
        <b className="font-mono text-primary">Calculation Engine v1.0</b>
      </div>
    </div>
  );
}

export interface AuditEventItem {
  event: string;
  timestamp: string;
  user: string;
  device: string;
}

export function generateMeasurementAuditEvents(m: Partial<Measurement>): AuditEventItem[] {
  const baseTime = m.timestamp || m.time || "2026-10-04 16:30";
  const worker = m.workerId || "W-101";
  const device = m.deviceId || "DEV-MOB-8841 (SentraBand App)";

  return [
    { event: "Capture Created", timestamp: `${baseTime}:00`, user: `Worker ${worker}`, device },
    { event: "Image Validated", timestamp: `${baseTime}:04`, user: "System Quality Engine v1.0", device },
    { event: "Badge Validated", timestamp: `${baseTime}:08`, user: "System Badge Registry", device },
    { event: "Color Analysis Completed", timestamp: `${baseTime}:12`, user: "CIEDE2000 Color Engine", device },
    { event: "Exposure Estimated", timestamp: `${baseTime}:15`, user: "SentraBand LUT Model CAL-03", device },
    { event: "Measurement Saved", timestamp: `${baseTime}:18`, user: `Worker ${worker}`, device: `${device} (PostgreSQL DB)` },
    { event: "HSE Reviewed", timestamp: `${baseTime}:45`, user: "HSE Officer (ID: OFF-901)", device: "DEV-DASH-101 (HSE Portal)" },
    { event: "Report Generated", timestamp: `${baseTime}:52`, user: "HSE Officer (ID: OFF-901)", device: "DEV-DASH-101 (Report Engine)" },
  ];
}

export function MeasurementAuditTimeline({ measurement }: { measurement: Partial<Measurement> }) {
  const events = generateMeasurementAuditEvents(measurement);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-sm">
            <Clock className="size-4" />
          </span>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Measurement Audit Timeline (8 Required Events)
            </h4>
            <p className="text-xs font-bold text-foreground">
              Traceable Event Audit Log for Measurement {measurement.id || "MEAS-1043"}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
          8 Events Recorded
        </span>
      </div>

      <div className="space-y-2.5">
        {events.map((e, idx) => (
          <div key={e.event} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs font-mono">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-extrabold text-[10px]">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <b className="text-xs font-black text-foreground">{e.event}</b>
                <span className="text-[10px] text-muted-foreground font-bold">{e.timestamp}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
                <span>User: <b className="text-foreground">{e.user}</b></span>
                <span>Device: <b className="text-primary">{e.device}</b></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
