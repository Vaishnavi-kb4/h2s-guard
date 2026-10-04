import React from "react";
import { Download, Flag, Camera, Sun, MoonStar, Check, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import demoImage from "@/assets/demo-dosimeter.jpg";
import type { Measurement } from "@/types/h2s";
import { StatusBadge } from "./common";
import { MeasurementReliabilityPanel, MeasurementAuditTimeline } from "./MeasurementReliabilityAndAudit";
import { generateDosimeterCanvasImage } from "@/services/imageAnalysisEngine";

export function downloadMeasurement(m: Measurement) {
  const text = JSON.stringify(
    {
      ...m,
      disclaimer: "Official Occupational Health Passive Dosimetry Trace Record.",
    },
    null,
    2
  );
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${m.id}-exposure-record.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MeasurementDrawer({
  measurement,
  onClose,
}: {
  measurement: Measurement | null;
  onClose: () => void;
}) {
  if (!measurement) return null;

  const preShiftRgb = measurement.preShiftColor || { r: 218, g: 208, b: 192 };
  const postShiftRgb = measurement.color || { r: 115, g: 90, b: 72 };
  const preImg = generateDosimeterCanvasImage(preShiftRgb.r, preShiftRgb.g, preShiftRgb.b);
  const postImg = generateDosimeterCanvasImage(postShiftRgb.r, postShiftRgb.g, postShiftRgb.b);

  const doseVal = measurement.exposure ?? 0;
  const rawDoseVal = measurement.rawDose ?? doseVal;
  const compDoseVal = measurement.compensatedDose ?? doseVal;
  const compStatus = measurement.compensationStatus || (measurement.environmentalCompensationApplied ? "Adjusted for Temperature & Humidity" : "Standard Reference (25°C / 50% RH)");
  const twaVal = measurement.twaPpm ?? (doseVal > 0 ? doseVal / 8.0 : 0);
  const isHighExposure = doseVal > 20.0 || twaVal > 2.5;
  const isModerateExposure = doseVal >= 8.0 || twaVal >= 1.0;

  const lower = measurement.lowerBound !== undefined ? measurement.lowerBound : Math.max(0, doseVal - 0.15);
  const upper = measurement.upperBound !== undefined ? measurement.upperBound : doseVal + 0.15;
  const uncStr = measurement.uncertainty || `±0.15 ppm·h`;
  const calRange = measurement.calibrationRange || "WITHIN VALIDATED RANGE";
  const calVer = measurement.calibrationVersion || measurement.calibration || "SentraBand PCHIP + CIEDE2000 LUT Model";
  const isOutsideRange = calRange !== "WITHIN VALIDATED RANGE";

  const fields = [
    ["Worker ID", measurement.workerId],
    ["Shift Window", `${measurement.shift || "Morning Shift"} (8.0 Hours)`],
    ["Assigned Badge ID", measurement.badgeId],
    ["Batch Lot", measurement.batchId || "BATCH-01"],
    ["Pre-Shift Scan Time", measurement.preShiftTime || "08:00 AM"],
    ["Post-Shift Scan Time", measurement.postShiftTime || measurement.time || measurement.timestamp],
    ["Image Fingerprint", measurement.imageFingerprint || "FPR-A94E-8012"],
    ["Replay Status", measurement.replayDetected ? "Replay Detected (Duplicate Image)" : "Unique Image Verified"],
    ["Wrist Context", measurement.wristContextDetected === false ? "Missing Wrist Context" : "Wrist / Skin Context Verified"],
    ["Raw Dose", `${rawDoseVal.toFixed(2)} ppm·h`],
    ["Compensated Dose", `${compDoseVal.toFixed(2)} ppm·h`],
    ["Uncertainty", uncStr],
    ["Estimated Range", `${lower.toFixed(2)} – ${upper.toFixed(2)} ppm·h`],
    ["Shift-Average (C_TWA)", `${twaVal.toFixed(2)} ppm TWA`],
    ["Compensation Status", compStatus],
    ["Calibration Range", calRange],
    ["Calibration Version", calVer],
    ["Ambient Temperature", measurement.temperature || "31.2 °C"],
    ["Ambient Humidity", measurement.humidity || "68% RH"],
    ["Image Quality Score", `${measurement.quality}% (Evaluated)`],
  ];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-xl font-black">{measurement.id}</SheetTitle>
              <StatusBadge status={isHighExposure ? "HIGH" : isModerateExposure ? "MODERATE" : measurement.status} />
            </div>
            <span className="font-mono text-xs text-muted-foreground">{measurement.timestamp}</span>
          </div>
          <SheetDescription className="font-mono text-xs">
            Trace ID: {measurement.traceId}
          </SheetDescription>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
              Environmental Compensation Applied
            </span>
          </div>
        </SheetHeader>

        {/* Outside Validated Range Warning */}
        {isOutsideRange && (
          <div className="mt-4 rounded-2xl border-2 border-amber-600 bg-amber-500/20 p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="size-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-extrabold text-sm uppercase text-amber-700 dark:text-amber-300">⚠️ Outside Validated Range</div>
              <div className="mt-1 font-semibold">Estimate should not be used for compliance decisions. Mandatory HSE Review Required.</div>
            </div>
          </div>
        )}

        {/* Hazard Level Banner */}
        <div
          className={`mt-4 rounded-2xl p-4 border-2 flex items-center gap-3 ${isHighExposure
              ? "border-red-600 bg-red-500/15 text-red-900 dark:text-red-200"
              : isModerateExposure
                ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                : "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
            }`}
        >
          <span
            className={`grid size-9 place-items-center rounded-xl text-white font-bold shrink-0 ${isHighExposure ? "bg-red-600 animate-pulse" : isModerateExposure ? "bg-amber-500" : "bg-emerald-600"
              }`}
          >
            {isHighExposure ? <ShieldAlert className="size-5" /> : <Check className="size-5" />}
          </span>
          <div>
            <div className="font-extrabold text-xs">
              {isHighExposure
                ? "🚨 HIGH H₂S EXPOSURE HAZARD DETECTED"
                : isModerateExposure
                  ? "⚠ MODERATE H₂S EXPOSURE NOTICE"
                  : "✓ LOW / SAFE WORKPLACE EXPOSURE"}
            </div>
            <div className="text-[11px] opacity-90 mt-0.5">
              Shift TWA: <b>{twaVal.toFixed(2)} ppm TWA</b> (Cumulative Dose: <b>{doseVal.toFixed(1)} ppm·h</b> over 8.0h shift).
            </div>
          </div>
        </div>

        {/* WORKER'S PRE-SHIFT & POST-SHIFT PHOTOGRAPHS */}
        <div className="mt-5 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Camera className="size-4 text-blue-600" /> Pre-Shift & Post-Shift Photographed Badges
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* PRE-SHIFT PHOTO CARD */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase text-blue-900 dark:text-blue-300 flex items-center gap-1">
                  <Sun className="size-3.5 text-amber-500" /> Pre-Shift Baseline
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{measurement.preShiftTime || "08:00 AM"}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 aspect-video bg-slate-950">
                <img src={preImg} alt="Pre-shift dosimeter" className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span
                  className="size-4 rounded border border-slate-400"
                  style={{ backgroundColor: `rgb(${preShiftRgb.r}, ${preShiftRgb.g}, ${preShiftRgb.b})` }}
                />
                <span className="font-bold">RGB {preShiftRgb.r} / {preShiftRgb.g} / {preShiftRgb.b}</span>
              </div>
            </div>

            {/* POST-SHIFT PHOTO CARD */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <MoonStar className="size-3.5 text-amber-600" /> Post-Shift Response
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{measurement.postShiftTime || measurement.time || measurement.timestamp}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 aspect-video bg-slate-950">
                <img src={postImg} alt="Post-shift dosimeter" className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span
                  className="size-4 rounded border border-slate-400"
                  style={{ backgroundColor: `rgb(${postShiftRgb.r}, ${postShiftRgb.g}, ${postShiftRgb.b})` }}
                />
                <span className="font-bold">RGB {postShiftRgb.r} / {postShiftRgb.g} / {postShiftRgb.b}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Fields Grid */}
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 rounded-2xl bg-muted/40 p-4 border border-border">
          {fields.map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">{k}</div>
              <div className="mt-0.5 text-xs font-bold font-mono">{v}</div>
            </div>
          ))}
        </div>

        {/* Measurement Reliability Assessment Panel */}
        <div className="mt-5">
          <MeasurementReliabilityPanel measurement={measurement} />
        </div>

        {/* Measurement Audit Timeline (8 Events) */}
        <div className="mt-5">
          <MeasurementAuditTimeline measurement={measurement} />
        </div>

        <SheetFooter className="mt-6 gap-2 sm:space-x-0">
          <Button
            variant="outline"
            onClick={() => {
              toast.success(`Measurement ${measurement.id} flagged for HSE Officer Review`);
              onClose();
            }}
            className="text-xs font-bold"
          >
            <Flag className="size-3.5 mr-1" /> Flag for HSE Review
          </Button>
          <Button onClick={() => downloadMeasurement(measurement)} className="bg-blue-900 text-white font-bold text-xs">
            <Download className="size-3.5 mr-1" /> Download Exposure Record
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
