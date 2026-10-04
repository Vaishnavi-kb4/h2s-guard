import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Camera, Check, CheckCircle2, ChevronDown, ChevronUp, CircleDot, CloudRain, Cpu, Download, Eye, FileJson, Focus, LoaderCircle, MoonStar, RefreshCw, ScanLine, ShieldAlert, Sparkles, Sun, Thermometer, Upload, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, StatusBadge, WorkflowStepper } from "@/components/h2s/common";
import { mockMeasurementService } from "@/services/mockServices";
import { useApp } from "@/context/AppContext";
import type { Measurement } from "@/types/h2s";
import demoImage from "@/assets/demo-dosimeter.jpg";
import { MeasurementReliabilityPanel, MeasurementAuditTimeline } from "@/components/h2s/MeasurementReliabilityAndAudit";
import { rgbToDose } from "@/services/calibrationEngine";
import { extractActualImagePixels } from "@/services/imageAnalysisEngine";
import { translations } from "@/lib/translations";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Capture Exposure Reading — H₂S GUARD" },
      { name: "description", content: "Demo passive dosimeter capture and analysis workflow." },
      { property: "og:title", content: "Capture Exposure Reading — H₂S GUARD" },
      { property: "og:description", content: "Traceable demo image validation and uncertainty-aware exposure estimation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CapturePage,
});

type Stage = "identify" | "capture" | "validate" | "badge" | "normalize" | "estimate" | "trace";
const stageIndex: Record<Stage, number> = { identify: 0, capture: 0, validate: 1, badge: 1, normalize: 2, estimate: 3, trace: 4 };

export function calculateEnvironmentalCompensation(rawDose: number, tempC: number, humidityRH: number) {
  const kTemp = 1 + 0.005 * (tempC - 25.0);
  const kHumidity = 1 + 0.002 * (humidityRH - 50.0);
  const kEnv = kTemp * kHumidity;
  const compensatedDose = Math.round(rawDose * kEnv * 100) / 100;
  const isApplied = tempC !== 25.0 || humidityRH !== 50.0;
  const status = isApplied
    ? `Active (Temp ${tempC >= 25 ? "+" : ""}${(tempC - 25).toFixed(1)}°C, Humidity ${humidityRH >= 50 ? "+" : ""}${humidityRH - 50}% RH)`
    : "Standard Reference (25°C / 50% RH — No Adjustment)";
  return {
    rawDose,
    compensatedDose,
    kEnv,
    isApplied,
    status,
  };
}

export function generateImageFingerprint(src: string | null): string {
  if (!src) return "FPR-DEMO-90412";
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = (hash << 5) - hash + src.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
  return `FPR-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export function PrePostComparisonCard({
  preShiftTime = "08:00 AM",
  postShiftTime = "04:15 PM",
  preRgb = { r: 218, g: 208, b: 192 },
  postRgb = { r: 164, g: 134, b: 110 },
  shiftDurationHours = 8.0,
  preShiftImg,
  postShiftImg,
}: {
  preShiftTime?: string;
  postShiftTime?: string;
  preRgb?: { r: number; g: number; b: number };
  postRgb?: { r: number; g: number; b: number };
  shiftDurationHours?: number;
  preShiftImg?: string | null;
  postShiftImg?: string | null;
}) {
  const deltaR = postRgb.r - preRgb.r;
  const deltaG = postRgb.g - preRgb.g;
  const deltaB = postRgb.b - preRgb.b;
  const deltaE = Math.round(Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB) * 10) / 10;
  const reflectanceRatio = (postRgb.r / (preRgb.r || 1)).toFixed(3);
  const preImgSrc = preShiftImg || demoImage;
  const postImgSrc = postShiftImg || demoImage;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
            📊
          </span>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Pre-Shift vs. Post-Shift 2-Picture Comparison</h4>
            <p className="text-xs font-bold text-foreground">Optical Color Shift & Baseline Subtraction</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
          2 Photos Validated & Compared
        </span>
      </div>

      {/* Side-by-Side 2-Picture Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* PRE-SHIFT PHOTO CARD */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-blue-900 dark:text-blue-300 uppercase flex items-center gap-1">
              <Sun className="size-3.5 text-amber-500" /> PRE-SHIFT PHOTO (START)
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{preShiftTime}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative size-12 rounded-lg overflow-hidden border border-blue-300 shrink-0 shadow-sm">
              <img src={preImgSrc} alt="Pre-shift dosimeter photo" className="h-full w-full object-cover" />
              <div
                className="absolute bottom-0 right-0 size-4 rounded-tl border-t border-l border-white shadow-sm"
                style={{ backgroundColor: `rgb(${preRgb.r}, ${preRgb.g}, ${preRgb.b})` }}
              />
            </div>
            <div>
              <div className="font-mono text-xs font-bold text-foreground">
                RGB {preRgb.r} / {preRgb.g} / {preRgb.b}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Starting Baseline Photo (Unexposed)</span>
            </div>
          </div>
        </div>

        {/* POST-SHIFT PHOTO CARD */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-900/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 uppercase flex items-center gap-1">
              <MoonStar className="size-3.5 text-amber-600" /> POST-SHIFT PHOTO (END)
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{postShiftTime}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative size-12 rounded-lg overflow-hidden border border-amber-300 shrink-0 shadow-sm">
              <img src={postImgSrc} alt="Post-shift dosimeter photo" className="h-full w-full object-cover" />
              <div
                className="absolute bottom-0 right-0 size-4 rounded-tl border-t border-l border-white shadow-sm"
                style={{ backgroundColor: `rgb(${postRgb.r}, ${postRgb.g}, ${postRgb.b})` }}
              />
            </div>
            <div>
              <div className="font-mono text-xs font-bold text-foreground">
                RGB {postRgb.r} / {postRgb.g} / {postRgb.b}
              </div>
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">End-of-Shift Response Photo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delta Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-border/60 bg-muted/50 p-2 text-xs font-mono">
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">RGB Delta (ΔR/ΔG/ΔB)</span>
          <b className="text-foreground">{deltaR} / {deltaG} / {deltaB}</b>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Color Distance (ΔE)</span>
          <b className="text-indigo-600 dark:text-indigo-400">{deltaE}</b>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Reflectance (R/R₀)</span>
          <b className="text-foreground">{reflectanceRatio}</b>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Shift Duration</span>
          <b className="text-blue-600 dark:text-blue-400">{shiftDurationHours}.0 hrs</b>
        </div>
      </div>
    </div>
  );
}

export function CaptureIntegrityCard({ measurement }: { measurement: Measurement }) {
  const isDeviceMatched = measurement.deviceBindingStatus !== "DEVICE MISMATCH" && measurement.deviceVerified !== false;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            🛡️
          </span>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Capture Integrity & Device Binding</h4>
            <p className="text-xs font-bold text-foreground">Multi-Factor Hardware & Identity Verification</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
            isDeviceMatched
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              : "bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/40"
          }`}
        >
          {isDeviceMatched ? <CheckCircle2 className="size-3 text-emerald-600 shrink-0" /> : <AlertTriangle className="size-3 text-red-600 shrink-0" />}
          {isDeviceMatched ? "DEVICE MATCHED" : "DEVICE MISMATCH"}
        </span>
      </div>

      {/* Confirmation Checks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 text-xs">
          <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">✓</span>
          <div>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 block">Worker Verified</span>
            <span className="font-mono text-[10px] text-muted-foreground">ID: {measurement.workerId}</span>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs ${
            isDeviceMatched ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-red-500/50 bg-red-50/70 dark:bg-red-950/30"
          }`}
        >
          <span className={`grid size-5 place-items-center rounded-full text-white font-bold text-[10px] ${isDeviceMatched ? "bg-emerald-600" : "bg-red-600"}`}>
            {isDeviceMatched ? "✓" : "❌"}
          </span>
          <div>
            <span className={`font-extrabold block ${isDeviceMatched ? "text-slate-900 dark:text-slate-100" : "text-red-700 dark:text-red-300"}`}>
              {isDeviceMatched ? "Device Verified" : "Device Mismatch"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">ID: {measurement.deviceId || "DEV-MOB-8841"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 text-xs">
          <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">✓</span>
          <div>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 block">Timestamp Verified</span>
            <span className="font-mono text-[10px] text-muted-foreground">{measurement.time || "14:40"}</span>
          </div>
        </div>
      </div>

      {/* 5 Required Record Fields */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-lg border border-border/60 bg-muted/50 p-2 text-xs font-mono">
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Worker ID</span>
          <b className="text-foreground">{measurement.workerId}</b>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Badge ID</span>
          <b className="text-foreground">{measurement.badgeId}</b>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Device ID</span>
          <b className={isDeviceMatched ? "text-foreground" : "text-red-600 dark:text-red-400 font-black"}>{measurement.deviceId || "DEV-MOB-8841"}</b>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Timestamp</span>
          <b className="text-foreground">{measurement.time || "14:40"}</b>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Measurement ID</span>
          <b className="text-primary">{measurement.id}</b>
        </div>
      </div>
    </div>
  );
}

function CapturePage() {
  const navigate = useNavigate();
  const { saveMeasurement, workers, measurements, language } = useApp();
  const t = translations[language] || translations.English;
  const [sessionMeasurementId] = useState(() => `MEAS-${Math.floor(1000 + Math.random() * 9000)}`);
  const [sessionTraceId] = useState(() => `TRACE-MEAS-${Date.now()}`);
  const [stage, setStage] = useState<Stage>(() => {
    if (typeof window !== "undefined") {
      const s = new URLSearchParams(window.location.search).get("stage") as Stage;
      if (s && ["identify", "capture", "validate", "badge", "normalize", "estimate", "trace"].includes(s)) return s;
    }
    return "identify";
  });
  const [worker, setWorker] = useState(workers[0]?.id || "W-101");
  const [image, setImage] = useState<string | null>(null);
  const [source, setSource] = useState<"demo" | "upload" | "camera">("demo");
  const [invalid, setInvalid] = useState(false);
  const [missingWristContext, setMissingWristContext] = useState(false);
  const [replayDetected, setReplayDetected] = useState(false);
  const [expired, setExpired] = useState(false);
  const [outsideRange, setOutsideRange] = useState(false);
  const [deviceMismatch, setDeviceMismatch] = useState(false);
  const [patchDrift, setPatchDrift] = useState(false);
  const [temp, setTemp] = useState<number>(31.2);
  const [humidity, setHumidity] = useState<number>(68);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Shift Capture Mode (Pre-Shift Baseline vs Post-Shift Response)
  const [shiftMode, setShiftMode] = useState<"pre" | "post">(() => {
    if (typeof window !== "undefined") {
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (mode === "pre" || mode === "post") return mode;
    }
    return "post";
  });

  const [preShiftImg, setPreShiftImg] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("h2s_preshift_photo");
    }
    return null;
  });

  const [preShiftTime, setPreShiftTime] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("h2s_preshift_time") || "08:00 AM";
    }
    return "08:00 AM";
  });

  const [preShiftRgb, setPreShiftRgb] = useState<{ r: number; g: number; b: number }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("h2s_preshift_rgb");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { r: 218, g: 208, b: 192 };
  });

  const [postShiftRgb, setPostShiftRgb] = useState<{ r: number; g: number; b: number }>({ r: 105, g: 85, b: 70 });

  const processImagePixels = async (imgUrl: string, srcType: "demo" | "upload" | "camera") => {
    setImage(imgUrl);
    setSource(srcType);
    try {
      const evalData = await extractActualImagePixels(imgUrl, false);
      if (shiftMode === "pre") {
        setPreShiftRgb(evalData.correctedRgb);
      } else {
        setPostShiftRgb(evalData.correctedRgb);
        setStage("validate");
      }
    } catch {
      if (shiftMode === "post") setStage("validate");
    }
  };

  const handleSavePreShift = async (imgUrl: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let baselineRgb = preShiftRgb;
    try {
      const evalData = await extractActualImagePixels(imgUrl, false);
      baselineRgb = evalData.correctedRgb;
      setPreShiftRgb(baselineRgb);
    } catch {}

    setPreShiftImg(imgUrl);
    setPreShiftTime(timeStr);
    if (typeof window !== "undefined") {
      localStorage.setItem("h2s_preshift_photo", imgUrl);
      localStorage.setItem("h2s_preshift_time", timeStr);
      localStorage.setItem("h2s_preshift_rgb", JSON.stringify(baselineRgb));
    }
    toast.success(`Pre-Shift Baseline Photo Recorded (RGB ${baselineRgb.r}/${baselineRgb.g}/${baselineRgb.b})! Moving to Post-Shift.`);
    setShiftMode("post");
    setImage(null);
    setStage("capture");
  };

  useEffect(() => () => {
    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const goCapture = () => setStage("capture");
  const loadDemo = () => {
    processImagePixels(demoImage, "demo");
    toast("Demo capture loaded");
  };
  const upload = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    processImagePixels(url, "upload");
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
    } catch {
      toast.error("Camera unavailable. Upload an image instead.");
      fileRef.current?.click();
    }
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg");
    (v.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
    processImagePixels(dataUrl, "camera");
  };

  const runValidation = async () => {
    setProcessing(true);
    setDone([]);
    const checks = [
      "Dosimeter detected",
      "Wrist/skin context detected",
      "Reference scale detected",
      "Sensor region detected",
      "Lighting & sharpness acceptable",
      "Glare within acceptable range",
    ];
    for (const c of checks) {
      await new Promise((r) => setTimeout(r, 20));
      setDone((x) => [...x, c]);
    }
    await mockMeasurementService.validateImage(invalid || missingWristContext);
    setProcessing(false);
  };

  const runColor = async () => {
    setProcessing(true);
    setDone([]);
    for (const c of ["Lighting compensation", "White balance correction", "Reference normalization"]) {
      await new Promise((r) => setTimeout(r, 25));
      setDone((x) => [...x, c]);
    }
    await mockMeasurementService.runColorAnalysis();
    setProcessing(false);
  };

  const POST_SHIFT_PIPELINE_STAGES = [
    "1. Image Quality Validation",
    "2. ArUco Detection/Correction",
    "3. Sensing Region Detection",
    "4. RGB Extraction",
    "5. Color Normalization",
    "6. 12-Patch CCM Correction",
    "7. CIEDE2000 / Color Difference Calculation",
    "8. Pre-shift vs Post-shift comparison",
    "9. Calibration / LUT mapping",
    "10. H₂S exposure estimation",
    "11. Temperature/Humidity compensation if available",
    "12. Uncertainty calculation",
    "13. Reliability/validity checks",
    "14. Final exposure result",
    "15. Save completed measurement to PostgreSQL",
  ];

  const runEstimate = async () => {
    setProcessing(true);
    setDone([]);
    for (const stageName of POST_SHIFT_PIPELINE_STAGES) {
      await new Promise((r) => setTimeout(r, 30));
      setDone((x) => [...x, stageName]);
      if (stageName.startsWith("15.")) {
        // Final measurement created & saved ONLY after post-shift processing completion
        try {
          await saveMeasurement(measurement);
          toast.success("Post-Shift Measurement saved to PostgreSQL database!");
        } catch {
          toast.error("Saved measurement locally");
        }
      }
    }
    setProcessing(false);
  };

  // Dynamic scientific calculation derived from evaluated post-shift image RGB using SentraBand CIEDE2000 LUT model
  const evalRgb = outsideRange ? { r: 65, g: 45, b: 30 } : postShiftRgb;
  const lutResult = rgbToDose(evalRgb);
  const rawDoseVal = outsideRange ? 54.2 : Math.round(lutResult.dosePpmH * 100) / 100;
  const envComp = calculateEnvironmentalCompensation(rawDoseVal, temp, humidity);
  const compensatedDoseVal = envComp.compensatedDose;
  const isOutside = outsideRange || compensatedDoseVal > 50.0;
  const uncertaintyVal = outsideRange ? 4.85 : Math.max(0.10, Math.round((0.05 + lutResult.minDeltaE00 * 0.02) * 100) / 100);
  const lowerBoundVal = Math.max(0, Math.round((compensatedDoseVal - uncertaintyVal) * 100) / 100);
  const upperBoundVal = Math.round((compensatedDoseVal + uncertaintyVal) * 100) / 100;
  const twaPpmVal = Math.round((compensatedDoseVal / 8.0) * 100) / 100;

  const imageFingerprint = generateImageFingerprint(image);
  const registeredDeviceId = "DEV-MOB-8841";
  const currentDeviceId = deviceMismatch ? "DEV-UNAUTH-999" : registeredDeviceId;
  const isDeviceMatched = !deviceMismatch;
  const isRequiresReview = isOutside || deviceMismatch || patchDrift;

  const measurement: Measurement = {
    id: sessionMeasurementId,
    traceId: sessionTraceId,
    workerId: worker,
    badgeId: workers.find((w) => w.id === worker)?.badgeId || "B-00101",
    deviceId: currentDeviceId,
    deviceBindingStatus: isDeviceMatched ? "DEVICE MATCHED" : "DEVICE MISMATCH",
    workerVerified: true,
    deviceVerified: isDeviceMatched,
    timestampVerified: true,
    batchId: "BATCH-01",
    shift: workers.find((w) => w.id === worker)?.shift || "Morning",
    timestamp: new Date().toLocaleString(),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    exposure: compensatedDoseVal,
    rawDose: rawDoseVal,
    compensatedDose: compensatedDoseVal,
    compensationStatus: envComp.status,
    environmentalCompensationApplied: envComp.isApplied,
    imageFingerprint,
    replayDetected: false,
    wristContextDetected: !missingWristContext,
    twaPpm: twaPpmVal,
    uncertainty: outsideRange ? "±4.85 ppm·h" : `±${uncertaintyVal.toFixed(2)} ppm·h`,
    uncertaintyValue: uncertaintyVal,
    lowerBound: lowerBoundVal,
    upperBound: upperBoundVal,
    calibrationRange: isOutside ? "OUTSIDE VALIDATED RANGE" : "WITHIN VALIDATED RANGE",
    calibrationVersion: "SentraBand PCHIP + CIEDE2000 LUT Model (1001 Points)",
    calibration: "CAL-03 Model",
    status: isRequiresReview ? "REVIEW REQUIRED" : "VALID",
    confidenceScore: isRequiresReview ? (deviceMismatch ? 58.0 : patchDrift ? 62.0 : 42.0) : 95.4,
    quality: isRequiresReview || missingWristContext ? 38 : 94,
    warningMessage: patchDrift
      ? "Reference Patch Drift Detected — Flagged for Review"
      : deviceMismatch
      ? "Device Mismatch — Review Required."
      : isOutside
      ? "OUTSIDE VALIDATED RANGE — HSE REVIEW REQUIRED"
      : "",
    requiresHseReview: isRequiresReview,
    temperature: `${temp.toFixed(1)} °C`,
    humidity: `${humidity.toFixed(0)}% RH`,
    color: evalRgb,
    preShiftColor: preShiftRgb,
    source,
  };

  const exportTraceJson = (mToExport?: Measurement) => {
    const target = mToExport || measurement;
    if (!target) {
      toast.error("No measurement trace available to export.");
      return;
    }
    try {
      const jsonStr = JSON.stringify(target, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TRACE-${target.id || target.traceId || "MEAS-1043"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported complete trace JSON for ${target.id || "measurement"}`);
    } catch (err: any) {
      console.error("Export JSON error:", err);
      toast.error("Failed to export trace JSON");
    }
  };

  const save = async (mToSave?: Measurement) => {
    const target = mToSave || measurement;
    try {
      await saveMeasurement(target);
      toast.success(`Measurement ${target.id} saved to database!`);
      const isOutsideTarget = target.requiresHseReview || target.calibrationRange !== "WITHIN VALIDATED RANGE" || (target.exposure ?? 0) > 50.0;
      navigate({ to: isOutsideTarget ? "/alerts" : "/measurements" });
    } catch (err: any) {
      console.error("Save measurement error:", err);
      toast.error(err?.message || "Failed to save measurement");
    }
  };

  const backStage = (i: number) => {
    if (i === 0) setStage(image ? "capture" : "identify");
    if (i === 1 && image) setStage("validate");
    if (i === 2 && image) setStage("normalize");
    if (i === 3 && image) setStage("estimate");
  };

  return (
    <>
      <PageHeader
        title={
          stage === "trace"
            ? t.exposureTraceHistory
            : stage === "estimate"
            ? t.exposureEstimate
            : stage === "normalize"
            ? t.qualityCheck
            : stage === "badge"
            ? t.badgeShelfLife
            : stage === "validate"
            ? t.qualityCheck
            : t.prePostCapture
        }
        subtitle="Guided passive dosimeter measurement · Uncertainty-aware estimation engine"
      />
      <WorkflowStepper current={stageIndex[stage]} onStep={backStage} />

      {/* SHIFT MODE SWITCHER BANNER */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{t.prePostCapture}:</span>
          <div className="inline-flex rounded-xl bg-muted p-1 border border-border">
            <button
              type="button"
              onClick={() => { setShiftMode("pre"); setStage("capture"); setImage(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${shiftMode === "pre" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sun className="size-3.5 text-amber-300" /> 1. {t.preShiftScanTitle}
            </button>
            <button
              type="button"
              onClick={() => { setShiftMode("post"); setStage("capture"); setImage(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${shiftMode === "post" ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <MoonStar className="size-3.5" /> 2. {t.postShiftScanTitle}
            </button>
          </div>
        </div>
        {shiftMode === "pre" ? (
          <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
            📷 {t.preShiftInstruction}
          </span>
        ) : (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
            🔍 {t.postShiftInstruction}
          </span>
        )}
      </div>

      {stage === "identify" && <Identify worker={worker} setWorker={setWorker} onContinue={goCapture} />}
      {stage === "capture" && (
        <Capture
          image={image}
          cameraOpen={cameraOpen}
          fileRef={fileRef}
          videoRef={videoRef}
          openCamera={openCamera}
          snap={snap}
          upload={upload}
          loadDemo={loadDemo}
          retake={() => {
            setImage(null);
            setCameraOpen(false);
          }}
          validate={() => setStage("validate")}
          shiftMode={shiftMode}
          savePreShift={handleSavePreShift}
          preShiftImg={preShiftImg}
          preShiftTime={preShiftTime}
          preShiftRgb={preShiftRgb}
        />
      )}
      {stage === "validate" && (
        <Validation
          image={image || demoImage}
          invalid={invalid}
          setInvalid={setInvalid}
          missingWristContext={missingWristContext}
          setMissingWristContext={setMissingWristContext}
          processing={processing}
          done={done}
          run={runValidation}
          retake={() => {
            setStage("capture");
            setImage(null);
            setDone([]);
          }}
          next={() => setStage("badge")}
        />
      )}
      {stage === "badge" && (
        <BadgeValidation
          expired={expired}
          setExpired={setExpired}
          next={() => setStage("normalize")}
          replace={() => {
            setExpired(false);
            setStage("capture");
          }}
        />
      )}
      {stage === "normalize" && (
        <Normalize
          image={image || demoImage}
          processing={processing}
          done={done}
          run={runColor}
          next={() => setStage("estimate")}
          patchDrift={patchDrift}
          setPatchDrift={setPatchDrift}
        />
      )}
      {stage === "estimate" && (
        <Estimate
          processing={processing}
          done={done}
          run={runEstimate}
          explain={() => setStage("trace")}
          save={save}
          exportTraceJson={exportTraceJson}
          outsideRange={outsideRange}
          setOutsideRange={setOutsideRange}
          deviceMismatch={deviceMismatch}
          setDeviceMismatch={setDeviceMismatch}
          patchDrift={patchDrift}
          setPatchDrift={setPatchDrift}
          replayDetected={replayDetected}
          setReplayDetected={setReplayDetected}
          measurement={measurement}
          temp={temp}
          setTemp={setTemp}
          humidity={humidity}
          setHumidity={setHumidity}
          retakeImage={() => {
            setStage("capture");
            setImage(null);
            setDone([]);
          }}
        />
      )}
      {stage === "trace" && (
        <Trace
          image={image || demoImage}
          measurement={measurement}
          save={save}
          exportTraceJson={exportTraceJson}
          restart={() => {
            setStage("identify");
            setImage(null);
            setDone([]);
          }}
        />
      )}
    </>
  );
}

function Identify({ worker, setWorker, onContinue }: { worker: string; setWorker: (s: string) => void; onContinue: () => void }) {
  const { workers } = useApp();
  const w = workers.find((x) => x.id === worker);
  return (
    <div className="mx-auto max-w-3xl">
      <Panel className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary">
            <UserRound />
          </span>
          <div>
            <h2 className="text-lg font-bold">Worker identification</h2>
            <p className="text-sm text-muted-foreground">Confirm the worker before capturing the assigned dosimeter.</p>
          </div>
        </div>
        <div className="mt-6">
          <Label>Worker</Label>
          {workers.length > 0 ? (
            <Select value={worker} onValueChange={setWorker}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.id} · {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <input
              value={worker}
              onChange={(e) => setWorker(e.target.value)}
              placeholder="Type Worker ID (e.g. W-101)"
              className="mt-2 w-full rounded-md border border-border bg-card p-2 text-sm"
            />
          )}
        </div>
        {w && (
          <div className="mt-5 grid gap-3 rounded-lg border border-border bg-muted p-4 sm:grid-cols-3">
            <Data label="Shift" value={w.shift} />
            <Data label="Assigned badge" value={w.badgeId} />
            <Data label="Worker status" value="Active" />
          </div>
        )}
        <Button onClick={onContinue} className="mt-6 w-full sm:w-auto">
          Confirm & Continue <ArrowRight />
        </Button>
      </Panel>
    </div>
  );
}

function Capture(p: any) {
  const isPre = p.shiftMode === "pre";
  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_.6fr]">
      <Panel className="overflow-hidden">
        <div className="border-b border-border p-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              {isPre ? <Sun className="size-5 text-amber-500" /> : <MoonStar className="size-5 text-amber-600" />}
              {isPre ? "Step 1: Capture Pre-Shift Baseline Photo" : "Step 2: Position Dosimeter for Post-Shift Scan"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isPre
                ? "Capture a normal photo of your unexposed dosimeter before starting your work shift."
                : "Ensure the sensing region and reference palette are visible for post-shift comparison."}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${isPre ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200" : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200"}`}>
            {isPre ? "Pre-Shift Mode" : "Post-Shift Mode"}
          </span>
        </div>

        {!isPre && p.preShiftImg && (
          <div className="m-4 mb-0 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/40 p-3 flex items-center justify-between text-xs shadow-sm">
            <div className="flex items-center gap-3">
              <img src={p.preShiftImg} alt="Pre-shift thumbnail" className="size-10 rounded-lg object-cover border border-blue-300 shadow-sm shrink-0" />
              <div>
                <span className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 text-xs">
                  <Sun className="size-3.5 text-amber-500 shrink-0" /> Active Pre-Shift Baseline Photo
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Recorded at <b className="text-foreground">{p.preShiftTime}</b> · Ready for 2-picture comparison
                </p>
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold bg-blue-100 dark:bg-blue-900/60 px-2 py-1 rounded text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              RGB {p.preShiftRgb?.r}/{p.preShiftRgb?.g}/{p.preShiftRgb?.b}
            </span>
          </div>
        )}

        <div className="relative m-4 grid aspect-[16/9] place-items-center overflow-hidden rounded-lg bg-industrial-dark">
          {p.cameraOpen ? (
            <video ref={p.videoRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : p.image ? (
            <img src={p.image} alt="Selected dosimeter capture" className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-10 rounded-xl border-2 border-dashed border-primary/70">
                <span className="absolute -top-3 left-4 bg-industrial-dark px-2 text-[10px] font-bold text-primary">
                  {isPre ? "PRE-SHIFT BASELINE FRAME" : "DOSIMETER CAPTURE ZONE"}
                </span>
                <span className="absolute left-1/2 top-1/2 h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-warning">
                  <span className="absolute -top-5 text-[9px] text-warning">SENSING REGION + PALETTE</span>
                </span>
                {["left-2 top-2", "right-2 top-2", "bottom-2 left-2", "bottom-2 right-2"].map((c) => (
                  <span key={c} className={`absolute size-4 border-2 border-info ${c}`} />
                ))}
              </div>
              <motion.div animate={{ y: [-120, 120, -120] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="h-px w-3/4 bg-primary shadow-scan" />
              <ScanLine className="size-12 text-primary/60" />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 p-4 pt-0">
          <Button onClick={p.cameraOpen ? p.snap : p.openCamera}>
            <Camera />
            {p.cameraOpen ? "Take Photo" : "Capture Image"}
          </Button>
          <Button variant="outline" onClick={() => p.fileRef.current?.click()}>
            <Upload /> Upload Image
          </Button>
          <Button variant="secondary" onClick={p.loadDemo}>
            <Sparkles /> Use Demo Capture
          </Button>
          {p.image && (
            <>
              <Button variant="ghost" onClick={p.retake}>
                <RefreshCw /> Retake
              </Button>
              {isPre ? (
                <Button onClick={() => p.savePreShift(p.image)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                  <Check className="size-4" /> Save Pre-Shift Baseline Photo
                </Button>
              ) : (
                <Button onClick={p.validate}>
                  Validate & Compare <ArrowRight />
                </Button>
              )}
            </>
          )}
          <input ref={p.fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => p.upload(e.target.files?.[0])} />
        </div>
      </Panel>
      <Panel className="p-5">
        <StatusBadge status={isPre ? "BASELINE" : "PROCESSING"} className="mb-4" />
        <h3 className="font-bold">{isPre ? "Pre-Shift Baseline Guidance" : "Post-Shift Capture Guidance"}</h3>
        {(isPre
          ? [
              "Take a clean photo before starting your shift",
              "Ensure dosimeter badge is unexposed",
              "Include sensing patch and reference scale",
              "Baseline photo will be stored for end-of-shift comparison",
            ]
          : [
              "Use even, neutral lighting",
              "Keep the full badge in frame",
              "Avoid glare on sensing patch",
              "Compares directly against Pre-Shift Baseline photo",
            ]
        ).map((x, i) => (
          <div key={x} className="mt-4 flex gap-3 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted font-mono text-[10px]">{i + 1}</span>
            {x}
          </div>
        ))}
        <div className="mt-6 rounded-lg border border-primary/20 bg-primary-soft p-3 text-xs text-primary">
          <b>Demo notice:</b> Image processing shown here is simulated and does not produce a real H₂S measurement.
        </div>
      </Panel>
    </div>
  );
}

function Validation({ image, invalid, setInvalid, missingWristContext, setMissingWristContext, processing, done, run, retake, next }: any) {
  const checks = [
    "H₂S strip & reference scale detected",
    "Blur & focus check (Sharpness acceptable)",
    "Specular glare check (No highlights on strip)",
    "Lighting check (Uniform neutral illumination)",
    "Occlusion check (Unobstructed sensing area)",
    "Wrist / skin context detected",
  ];

  const isFailed = invalid || missingWristContext;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Panel className="p-5">
        <div className="relative overflow-hidden rounded-lg">
          <img src={image} alt="Dosimeter under validation" className="aspect-video w-full object-cover" />
          <div className="absolute left-3 top-3 rounded bg-background/90 px-2 py-1 text-[10px] font-black text-primary">FIRST-GATE QUALITY CHECK</div>
          
          {/* Overlay Box for Wrist/Skin Context & Strip Detection */}
          {!missingWristContext && (
            <Box className="left-[25%] top-[15%] h-[70%] w-[52%] border-emerald-500" label="STRIP + REFERENCE SCALE + WRIST DETECTED" />
          )}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {checks.map((c, i) => {
            const isWristCheck = c === "Wrist / skin context detected";
            const isGlareCheck = c === "Specular glare check (No highlights on strip)";
            const isFailedCheck = (invalid && isGlareCheck) || (missingWristContext && isWristCheck);
            return (
              <motion.div key={c} initial={{ opacity: 0.4 }} animate={{ opacity: done.includes(c) ? 1 : 0.45 }} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <span className={`grid size-6 place-items-center rounded-full ${isFailedCheck ? "bg-destructive-soft text-destructive" : done.includes(c) ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>
                  {isFailedCheck ? <X className="size-4" /> : done.includes(c) ? <Check className="size-4" /> : <CircleDot className="size-4" />}
                </span>
                <span className="font-semibold text-xs">{c}</span>
              </motion.div>
            );
          })}
        </div>
      </Panel>
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">First-Gate Quality Check Summary</h3>
            <p className="text-xs text-muted-foreground">Runs before any downstream color extraction touch</p>
          </div>
          {done.length > 0 && !processing && <StatusBadge status={isFailed ? "REJECTED" : "VALID"} />}
        </div>
        <div className="my-6 grid place-items-center">
          <div className="relative grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-${isFailed ? "destructive" : "success"}) ${done.length ? (isFailed ? "38%" : "94%") : "0%"}, var(--color-muted) 0)` }}>
            <div className="grid size-28 place-items-center rounded-full bg-card text-center">
              <div>
                <div className="font-mono text-3xl font-bold">{done.length ? (isFailed ? 38 : 94) : 0}%</div>
                <div className="text-[10px] uppercase text-muted-foreground">Quality score</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <Label htmlFor="invalid" className="text-xs font-semibold cursor-pointer">Simulate Excessive Glare / Blur / Occlusion</Label>
            <Switch id="invalid" checked={invalid} onCheckedChange={setInvalid} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <Label htmlFor="missing-wrist" className="text-xs font-semibold cursor-pointer">Simulate Missing Wrist Context</Label>
            <Switch id="missing-wrist" checked={missingWristContext} onCheckedChange={setMissingWristContext} />
          </div>
        </div>

        {done.length > 0 && !processing && (isFailed ? (
          <div className="mt-4 rounded-lg border-2 border-destructive bg-destructive-soft p-4">
            <div className="font-black text-sm uppercase text-destructive flex items-center gap-1.5">
              <AlertTriangle className="size-4 shrink-0" /> IMAGE REJECTED — QUALITY CHECK FAILED
            </div>
            <p className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              {missingWristContext
                ? "Please capture the dosimeter while it is worn on the wrist."
                : "Shot rejected due to image quality issues (blurred, glared, poorly lit, or strip occluded). Downstream processing blocked. Please retake photo."}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-success/30 bg-success-soft p-4 text-sm font-semibold">
            <b>✓ First-Gate Quality Check Passed!</b> Strip, reference scale, lighting & wrist context verified. Downstream processing allowed.
          </div>
        ))}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" onClick={retake}>
            <RefreshCw /> Retake Image
          </Button>
          {done.length === 0 ? (
            <Button onClick={run} disabled={processing}>
              {processing ? <LoaderCircle className="animate-spin" /> : <Eye />} Run Image-Quality Check
            </Button>
          ) : (
            !isFailed && (
              <Button onClick={next}>
                Continue to Badge Validation <ArrowRight />
              </Button>
            )
          )}
        </div>
      </Panel>
    </div>
  );
}

function BadgeValidation({ expired, setExpired, next, replace }: any) {
  return (
    <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
      <Panel className="overflow-hidden">
        <div className="bg-industrial-dark p-5 text-industrial-light">
          <div className="flex justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-info">Passive exposure dosimeter</div>
              <div className="mt-1 font-mono text-2xl font-bold">B-00125</div>
            </div>
            <BadgeCheck className="size-9 text-success" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5">
          <Data label="Batch" value="BATCH-07" />
          <Data label="Manufactured" value="12 Jan 2026" />
          <Data label="Expiry" value={expired ? "03 Mar 2026" : "12 Jan 2027"} />
          <Data label="Calibration" value="CAL-03" />
        </div>
      </Panel>
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Badge identity & shelf life</h3>
          <StatusBadge status={expired ? "INVALID" : "VALID"} />
        </div>
        <div className="my-5 space-y-3">
          {["Badge recognized", "Batch identified", "Within shelf life", "Calibration available"].map((x, i) => (
            <div className="flex items-center gap-3 text-sm" key={x}>
              <span className={`grid size-6 place-items-center rounded-full ${expired && i === 2 ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success"}`}>
                {expired && i === 2 ? <X /> : <Check />}
              </span>
              {x}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <Label htmlFor="expired">Simulate Expired Badge</Label>
          <Switch id="expired" checked={expired} onCheckedChange={setExpired} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          <b>Important:</b> Badge validity is different from measurement validity.
        </p>
        {expired && <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm">This badge is outside its defined shelf-life validity.</div>}
        <Button className="mt-5" onClick={expired ? replace : next}>
          {expired ? "Replace Badge" : "Continue"}
          <ArrowRight />
        </Button>
      </Panel>
    </div>
  );
}

export interface ReferencePatch {
  id: number;
  name: string;
  expectedRgb: { r: number; g: number; b: number };
  detectedRgb: { r: number; g: number; b: number };
  status: "HEALTHY" | "DRIFT";
  deltaE: number;
}

export function get12ReferencePatches(drift: boolean): ReferencePatch[] {
  const basePatches = [
    { id: 1, name: "#1 White", expectedRgb: { r: 240, g: 240, b: 240 } },
    { id: 2, name: "#2 Light Gray", expectedRgb: { r: 200, g: 200, b: 200 } },
    { id: 3, name: "#3 Med Gray", expectedRgb: { r: 160, g: 160, b: 160 } },
    { id: 4, name: "#4 Dark Gray", expectedRgb: { r: 110, g: 110, b: 110 } },
    { id: 5, name: "#5 Black", expectedRgb: { r: 50, g: 50, b: 50 } },
    { id: 6, name: "#6 Red", expectedRgb: { r: 220, g: 50, b: 50 } },
    { id: 7, name: "#7 Green", expectedRgb: { r: 50, g: 180, b: 50 } },
    { id: 8, name: "#8 Blue", expectedRgb: { r: 50, g: 80, b: 220 } },
    { id: 9, name: "#9 Yellow", expectedRgb: { r: 230, g: 220, b: 50 } },
    { id: 10, name: "#10 Cyan", expectedRgb: { r: 50, g: 200, b: 220 } },
    { id: 11, name: "#11 Magenta", expectedRgb: { r: 210, g: 50, b: 180 } },
    { id: 12, name: "#12 Brown", expectedRgb: { r: 140, g: 90, b: 60 } },
  ];

  return basePatches.map((p) => {
    const isDriftedPatch = drift && (p.id === 3 || p.id === 7 || p.id === 11);
    let detectedRgb = { ...p.expectedRgb };
    if (isDriftedPatch) {
      if (p.id === 3) detectedRgb = { r: p.expectedRgb.r + 42, g: p.expectedRgb.g - 35, b: p.expectedRgb.b + 28 };
      else if (p.id === 7) detectedRgb = { r: p.expectedRgb.r + 55, g: p.expectedRgb.g - 48, b: p.expectedRgb.b + 12 };
      else if (p.id === 11) detectedRgb = { r: p.expectedRgb.r - 40, g: p.expectedRgb.g + 50, b: p.expectedRgb.b - 30 };
    } else {
      detectedRgb = {
        r: Math.max(0, Math.min(255, p.expectedRgb.r + (p.id % 3 === 0 ? 1 : -1))),
        g: Math.max(0, Math.min(255, p.expectedRgb.g + (p.id % 2 === 0 ? -1 : 1))),
        b: Math.max(0, Math.min(255, p.expectedRgb.b + (p.id % 4 === 0 ? 2 : -1))),
      };
    }

    const dR = detectedRgb.r - p.expectedRgb.r;
    const dG = detectedRgb.g - p.expectedRgb.g;
    const dB = detectedRgb.b - p.expectedRgb.b;
    const deltaE = Math.round(Math.sqrt(dR * dR + dG * dG + dB * dB) * 10) / 10;
    const status: "HEALTHY" | "DRIFT" = isDriftedPatch || deltaE > 15 ? "DRIFT" : "HEALTHY";

    return {
      id: p.id,
      name: p.name,
      expectedRgb: p.expectedRgb,
      detectedRgb,
      status,
      deltaE,
    };
  });
}

export function ReferencePatchHealthGrid({
  patchDrift,
  setPatchDrift,
}: {
  patchDrift: boolean;
  setPatchDrift: (b: boolean) => void;
}) {
  const patches = get12ReferencePatches(patchDrift);
  const healthyCount = patches.filter((p) => p.status === "HEALTHY").length;
  const isAllHealthy = healthyCount === 12;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      {/* Header & Status Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            🎨
          </span>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Reference Patch Health Checking (12 Patches)
            </h4>
            <p className="text-xs font-bold text-foreground">
              Optical Reference Scale Quality & Matrix Calibration Assessment
            </p>
          </div>
        </div>

        {/* Drift Simulation Switch */}
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 border border-border">
          <Label htmlFor="patch-drift-switch" className="text-[11px] font-extrabold cursor-pointer">
            Simulate Reference Patch Drift
          </Label>
          <Switch id="patch-drift-switch" checked={patchDrift} onCheckedChange={setPatchDrift} />
        </div>
      </div>

      {/* Summary Banner */}
      <div
        className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
          isAllHealthy
            ? "border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
            : "border-red-500/60 bg-red-50/80 dark:bg-red-950/40 text-red-900 dark:text-red-200 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isAllHealthy ? (
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="size-5 text-red-600 animate-pulse shrink-0" />
          )}
          <div>
            <span className="font-extrabold text-xs uppercase tracking-wide block">
              {isAllHealthy ? "12/12 Reference Patches Healthy" : "Reference Patch Drift Detected"}
            </span>
            <p className="text-[11px] font-medium opacity-90">
              {isAllHealthy
                ? "All 12 reference palette colors match expected values within tolerance (ΔE < 3.0)."
                : `${12 - healthyCount} of 12 reference patches exceed acceptable color tolerance (ΔE > 15.0). Measurement flagged for review.`}
            </p>
          </div>
        </div>
        <span
          className={`font-mono text-xs font-black px-2.5 py-1 rounded-full border shrink-0 ${
            isAllHealthy
              ? "bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200"
              : "bg-red-100 dark:bg-red-900/60 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200"
          }`}
        >
          {isAllHealthy ? "12/12 HEALTHY" : "DRIFT DETECTED"}
        </span>
      </div>

      {/* 12-Cell Reference Patch Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {patches.map((p) => {
          const isHealthy = p.status === "HEALTHY";
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-2.5 space-y-2 text-xs transition-all ${
                isHealthy
                  ? "border-border/80 bg-muted/40 hover:bg-muted/70"
                  : "border-red-400 bg-red-50/60 dark:bg-red-950/30 dark:border-red-800"
              }`}
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <span className="font-extrabold text-[11px] text-foreground truncate">{p.name}</span>
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    isHealthy
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/40"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {/* Color Swatch Comparison */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {/* Expected */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Expected</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-4 rounded border border-black/20 shrink-0 shadow-xs"
                      style={{
                        backgroundColor: `rgb(${p.expectedRgb.r}, ${p.expectedRgb.g}, ${p.expectedRgb.b})`,
                      }}
                    />
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {p.expectedRgb.r},{p.expectedRgb.g},{p.expectedRgb.b}
                    </span>
                  </div>
                </div>

                {/* Detected */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Detected</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-4 rounded border border-black/20 shrink-0 shadow-xs"
                      style={{
                        backgroundColor: `rgb(${p.detectedRgb.r}, ${p.detectedRgb.g}, ${p.detectedRgb.b})`,
                      }}
                    />
                    <span
                      className={`font-mono text-[9px] font-bold ${
                        isHealthy ? "text-foreground" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {p.detectedRgb.r},{p.detectedRgb.g},{p.detectedRgb.b}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground pt-1 border-t border-border/30">
                <span>ΔE Color Dist:</span>
                <b className={isHealthy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400 font-black"}>
                  {p.deltaE}
                </b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Normalize({ image, processing, done, run, next, patchDrift, setPatchDrift }: any) {
  const tasks = ["Lighting compensation", "White balance correction", "Reference normalization"];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Panel className="p-4">
          <div className="relative overflow-hidden rounded-lg">
            <img src={image} alt="Dosimeter color analysis" className="aspect-video w-full object-cover" />
            <Box className="left-[43%] top-[33%] h-[38%] w-[22%] border-warning" label="SENSING ROI" />
            <Box className="left-[45%] top-[69%] h-[8%] w-[20%] border-info" label="REFERENCE ROI" />
            <Box className="left-[42%] top-[29%] h-[8%] w-[7%] border-success" label="FIDUCIAL MARKER" />
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="font-bold">Color Analysis</h3>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ["R", "105"],
              ["G", "85"],
              ["B", "70"],
            ].map(([k, v]) => (
              <div className="rounded-lg bg-muted p-3 text-center" key={k}>
                <div className="text-[10px] font-bold text-muted-foreground">{k}</div>
                <div className="font-mono text-xl font-bold">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">Normalized color</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="size-12 rounded-lg border border-border bg-sensor" />
              <span className="font-mono text-xs">Reference-adjusted sample</span>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {["bg-palette-1", "bg-palette-2", "bg-palette-3", "bg-palette-4", "bg-palette-5", "bg-palette-6"].map((c) => (
              <span key={c} className={`h-7 flex-1 rounded ${c}`} />
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {tasks.map((t) => (
              <div className="flex items-center justify-between rounded-lg border border-border p-3 text-xs" key={t}>
                {t}
                {done.includes(t) ? (
                  <span className="flex items-center gap-1 font-bold text-success">
                    <Check />
                    Complete
                  </span>
                ) : (
                  <span className="text-muted-foreground">{processing ? "Processing..." : "Pending"}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {done.length < 3 ? (
              <Button onClick={run} disabled={processing}>
                {processing ? <LoaderCircle className="animate-spin" /> : <Focus />}
                Run Color Analysis
              </Button>
            ) : (
              <Button onClick={next}>
                Continue to Exposure Estimate <ArrowRight />
              </Button>
            )}
          </div>
        </Panel>
      </div>

      {/* 12-CELL REFERENCE PATCH HEALTH GRID */}
      <ReferencePatchHealthGrid patchDrift={patchDrift} setPatchDrift={setPatchDrift} />
    </div>
  );
}

function Estimate({
  processing,
  done,
  run,
  explain,
  save,
  exportTraceJson,
  outsideRange,
  setOutsideRange,
  deviceMismatch,
  setDeviceMismatch,
  patchDrift,
  setPatchDrift,
  replayDetected,
  setReplayDetected,
  measurement,
  temp,
  setTemp,
  humidity,
  setHumidity,
  retakeImage,
}: any) {
  const pipeline = [
    "1. Image Quality Validation",
    "2. ArUco Detection/Correction",
    "3. Sensing Region Detection",
    "4. RGB Extraction",
    "5. Color Normalization",
    "6. 12-Patch CCM Correction",
    "7. CIEDE2000 / Color Difference Calculation",
    "8. Pre-shift vs Post-shift comparison",
    "9. Calibration / LUT mapping",
    "10. H₂S exposure estimation",
    "11. Temperature/Humidity compensation if available",
    "12. Uncertainty calculation",
    "13. Reliability/validity checks",
    "14. Final exposure result",
    "15. Save completed measurement to PostgreSQL",
  ];
  const complete = done.length === pipeline.length;
  const isOutside = outsideRange || (measurement?.exposure ?? 0) > 50.0;
  const isReplay = measurement?.replayDetected;

  const getStageCalcSummary = (p: string, m: any) => {
    if (p.startsWith("1.")) return `Quality Score: ${m.quality || 94}% · Glare: 0.8% · Brenner Sharpness: 14.2 · Status: PASS`;
    if (p.startsWith("2.")) return `ArUco Marker #4 & 12-Patch Matrix Verified · Homography Rot: 0.4° · Status: PASS`;
    if (p.startsWith("3.")) return `Sensing ROI Box: [550, 240, 280, 270] · 75,600 Valid Pixels · Status: PASS`;
    if (p.startsWith("4.")) return `Post-Shift Mean Raw RGB: R:${m.color?.r || 105} G:${m.color?.g || 85} B:${m.color?.b || 70}`;
    if (p.startsWith("5.")) return `Normalized sRGB: r:0.404 g:0.327 b:0.269 · D65 White Balance k_wb = 1.028x`;
    if (p.startsWith("6.")) return m.warningMessage?.includes("Patch") ? `Reference Patch Drift Detected · Error RMSE = 0.184 (FLAGGED FOR REVIEW)` : `12-Patch Matrix Corrected · Error RMSE = 0.012 (HEALTHY)`;
    if (p.startsWith("7.")) return `CIELAB L*:37.2 a*:9.4 b*:7.6 · CIEDE2000 ΔE00 = ${(m.deltaE || 14.50).toFixed(2)}`;
    if (p.startsWith("8.")) return `Pre-Shift Baseline (${m.preShiftTime || "08:00 AM"}): R:${m.preShiftColor?.r || 218} G:${m.preShiftColor?.g || 208} B:${m.preShiftColor?.b || 192} · ΔR: ${(m.color?.r || 105) - (m.preShiftColor?.r || 218)} · Reflectance R/R₀ = 0.482`;
    if (p.startsWith("9.")) return `SentraBand 1001-Pt PCHIP LUT Model · Inverted Raw Dose = ${(m.rawDose || 2.10).toFixed(2)} ppm·h · R² = 0.9982`;
    if (p.startsWith("10.")) return `Raw Uncompensated Dose = ${(m.rawDose || 2.10).toFixed(2)} ppm·h (Shift Duration: 8.0 hrs)`;
    if (p.startsWith("11.")) return `Temp: ${m.temperature || "31.2 °C"}, Humidity: ${m.humidity || "68% RH"} · k_env = ${((m.compensatedDose || 2.24)/(m.rawDose || 2.10)).toFixed(3)}x · Compensated Dose = ${(m.compensatedDose || 2.24).toFixed(2)} ppm·h`;
    if (p.startsWith("12.")) return `Noise Variance σ² = 0.008 · 95% Expanded Interval ${m.uncertainty || "±0.15 ppm·h"} (${(m.lowerBound || 2.09).toFixed(2)} – ${(m.upperBound || 2.39).toFixed(2)} ppm·h)`;
    if (p.startsWith("13.")) return `Worker ID: ${m.workerId} · Badge ID: ${m.badgeId} · Device ID: ${m.deviceId} · Software Status: ${m.status || "VALID"}`;
    if (p.startsWith("14.")) return `Final Cumulative Dose = ${(m.compensatedDose || 2.24).toFixed(2)} ppm·h · 8h TWA Concentration = ${(m.twaPpm || 0.28).toFixed(2)} ppm TWA`;
    if (p.startsWith("15.")) return `Measurement Record Persisted to PostgreSQL Database (ID: ${m.id}, Trace ID: ${m.traceId}) ✓`;
    return "";
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <Panel className="p-5">
        <h3 className="font-extrabold text-base border-b border-border pb-3">Post-Shift Complete Processing Pipeline (15 Stages)</h3>
        <div className="mt-4 space-y-2 max-h-[620px] overflow-y-auto pr-1">
          {pipeline.map((p, i) => (
            <div key={p}>
              <motion.div animate={{ borderColor: done.includes(p) ? "var(--color-success)" : "var(--color-border)" }} className={`rounded-xl border p-3 text-xs transition-all ${done.includes(p) ? "bg-emerald-500/10 border-emerald-500/40" : "bg-card border-border/80"}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold shrink-0 ${done.includes(p) ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    {done.includes(p) ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className="font-extrabold text-foreground">{p}</span>
                </div>
                {done.includes(p) && (
                  <div className="mt-1.5 pl-7 font-mono text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                    {getStageCalcSummary(p, measurement)}
                  </div>
                )}
              </motion.div>
              {i < pipeline.length - 1 && <div className="mx-5 h-2 w-px bg-border" />}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-primary">Calibration engine</div>
            <h3 className="mt-1 text-lg font-bold">Uncertainty-Aware Exposure Estimation</h3>
          </div>
          {processing && <StatusBadge status="PROCESSING" />}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <Label htmlFor="outside-range" className="text-xs font-semibold cursor-pointer">
              Simulate Outside Validated Range
            </Label>
            <Switch id="outside-range" checked={outsideRange} onCheckedChange={setOutsideRange} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <Label htmlFor="device-mismatch" className="text-xs font-semibold cursor-pointer">
              Simulate Device Mismatch (Unregistered Device)
            </Label>
            <Switch id="device-mismatch" checked={deviceMismatch} onCheckedChange={setDeviceMismatch} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <Label htmlFor="patch-drift-toggle" className="text-xs font-semibold cursor-pointer">
              Simulate Reference Patch Drift
            </Label>
            <Switch id="patch-drift-toggle" checked={patchDrift} onCheckedChange={setPatchDrift} />
          </div>
        </div>

        {/* INPUT FIELDS FOR TEMPERATURE AND HUMIDITY BEFORE FINAL ESTIMATION */}
        <div className="mt-5 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Thermometer className="size-4" />
              </span>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Environmental Parameters</h4>
                <p className="text-xs text-foreground font-semibold">Temperature & Humidity Compensation Inputs</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">Std Ref: 25°C / 50% RH</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="temp-input" className="text-xs font-semibold flex items-center justify-between mb-1.5">
                <span>Ambient Temperature (°C)</span>
                <span className="font-mono text-primary font-bold">{temp.toFixed(1)} °C</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="temp-input"
                  type="number"
                  step="0.1"
                  min="-10"
                  max="60"
                  value={temp}
                  onChange={(e) => setTemp(parseFloat(e.target.value) || 25)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="humidity-input" className="text-xs font-semibold flex items-center justify-between mb-1.5">
                <span>Relative Humidity (% RH)</span>
                <span className="font-mono text-primary font-bold">{humidity.toFixed(0)} %</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="humidity-input"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={humidity}
                  onChange={(e) => setHumidity(parseFloat(e.target.value) || 50)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Presets:</span>
            <button
              type="button"
              onClick={() => { setTemp(25.0); setHumidity(50); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${temp === 25 && humidity === 50 ? "bg-primary text-primary-foreground font-bold" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
            >
              25°C / 50% Standard
            </button>
            <button
              type="button"
              onClick={() => { setTemp(31.2); setHumidity(68); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${temp === 31.2 && humidity === 68 ? "bg-primary text-primary-foreground font-bold" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
            >
              31.2°C / 68% Field (Demo)
            </button>
            <button
              type="button"
              onClick={() => { setTemp(38.0); setHumidity(85); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${temp === 38 && humidity === 85 ? "bg-primary text-primary-foreground font-bold" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
            >
              38°C / 85% Extreme
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Data label="Calibration Version" value="SentraBand PCHIP + CIEDE2000 LUT Model" />
          <Data label="Model" value="1001-Point LUT Continuous Inversion" />
          <Data label="Features" value="Normalized RGB · HSV · ΔE00" />
          <Data label="Validated Sensor Limits" value="0.00 – 50.00 ppm·h" />
        </div>

        {complete ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 rounded-xl border border-primary/25 bg-primary-soft p-6">
            {/* ENVIRONMENTAL COMPENSATION APPLIED INDICATOR */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 shadow-sm">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Environmental Compensation Applied
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-muted-foreground">
                k_env = {((measurement.compensatedDose || measurement.exposure) / (measurement.rawDose || 1)).toFixed(3)}x
              </span>
            </div>

            {isOutside ? (
              <div className="mb-4 rounded-xl border-2 border-red-500/80 bg-red-500/15 p-4 text-red-700 dark:text-red-300">
                <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
                  <AlertTriangle className="size-5 text-red-600 animate-pulse shrink-0" />
                  OUTSIDE VALIDATED RANGE — HSE REVIEW REQUIRED
                </div>
                <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  The predicted exposure estimate ({(measurement.compensatedDose || measurement.exposure).toFixed(2)} ppm·h) is outside the sensor's validated calibration range (0.00 – 50.00 ppm·h). This reading cannot be saved as a normal valid measurement and requires mandatory HSE review.
                </p>
              </div>
            ) : (
              <div className="text-xs font-bold uppercase text-primary mb-1">Final Compensated Exposure</div>
            )}

            <div className="flex items-baseline gap-3">
              <div className={`font-mono text-4xl font-black ${isOutside ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                {(measurement.compensatedDose || measurement.exposure).toFixed(2)} <span className="text-xl font-semibold">ppm·h</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                (Raw: {(measurement.rawDose ?? 2.1).toFixed(2)} ppm·h)
              </span>
            </div>

            {/* MANDATORY 5 REQUIRED OUTPUT FIELDS */}
            <div className="mt-5 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between border-b border-border/40 pb-2">
                <span>Environmental Compensation Results</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">Simulated Engine v1.0</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                <Data label="Raw Dose" value={`${(measurement.rawDose ?? 2.1).toFixed(2)} ppm·h`} />
                <Data label="Temperature" value={measurement.temperature || `${temp.toFixed(1)} °C`} />
                <Data label="Humidity" value={measurement.humidity || `${humidity.toFixed(0)}% RH`} />
                <Data label="Compensated Dose" value={`${(measurement.compensatedDose ?? measurement.exposure).toFixed(2)} ppm·h`} />
                <div className="col-span-2 sm:col-span-2">
                  <Data label="Compensation Status" value={measurement.compensationStatus || "Adjusted for Temp & Humidity"} />
                </div>
              </div>
            </div>

            {/* PRE-SHIFT VS POST-SHIFT BASELINE COMPARISON */}
            <PrePostComparisonCard />

            {/* CAPTURE INTEGRITY & DEVICE BINDING SECTION */}
            <CaptureIntegrityCard measurement={measurement} />

            {/* MEASUREMENT RELIABILITY PANEL (SEPARATE FROM EXPOSURE VALUE) */}
            <div className="mt-4">
              <MeasurementReliabilityPanel measurement={measurement} />
            </div>

            {/* MANDATORY UNCERTAINTY-AWARE EXPOSURE ESTIMATION METRICS */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/50 pt-3">
              <Data label="Estimated Dose" value={`${measurement.exposure.toFixed(2)} ppm·h`} />
              <Data label="± Uncertainty" value={measurement.uncertainty} />
              <Data label="Validated Range" value={isOutside ? "OUTSIDE RANGE (0 – 50)" : "0.00 – 50.00 ppm·h"} />
              <Data label="Confidence" value={`${measurement.confidenceScore}% (${isOutside ? "LOW" : "HIGH"})`} />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <StatusBadge status={isOutside ? "REVIEW REQUIRED" : "VALID"} />
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${isOutside ? "bg-red-500/20 text-red-800 dark:text-red-300" : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"}`}>
                {isOutside ? "OUTSIDE VALIDATED RANGE — HSE REVIEW REQUIRED" : "WITHIN VALIDATED RANGE (Confidence: 95.4%)"}
              </span>
            </div>
          </motion.div>
        ) : (
          <div className="mt-6 grid min-h-56 place-items-center rounded-xl border border-dashed border-border bg-muted">
            <div className="text-center">
              <Cpu className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Ready to process validated color features.</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {!complete ? (
            <Button onClick={run} disabled={processing}>
              {processing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
              Run Estimation
            </Button>
          ) : (
            <>
              <Button onClick={explain}>
                <Eye /> Explain Result
              </Button>
              {isOutside ? (
                <Button variant="destructive" onClick={() => save && save(measurement)} className="font-bold">
                  <ShieldAlert className="size-4 mr-1" /> Flag & Submit for HSE Review
                </Button>
              ) : (
                <Button variant="outline" onClick={() => save && save(measurement)} className="font-bold">
                  <Download className="size-4 mr-1" /> Save Measurement
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => exportTraceJson && exportTraceJson(measurement)}
                className="font-bold"
              >
                <FileJson className="size-4 mr-1" /> Export Complete Trace JSON
              </Button>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Trace({ image, measurement: defaultMeasurement, save, exportTraceJson, restart }: any) {
  const { measurements } = useApp();
  const activeTraceId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("id") || localStorage.getItem("h2s_selected_trace_id")
      : null;
  const measurement = (activeTraceId && measurements.find((m) => m.id === activeTraceId || m.traceId === activeTraceId)) || defaultMeasurement;

  const doseVal = measurement?.exposure ?? 2.1;
  const rawVal = measurement?.rawDose ?? 2.1;
  const compVal = measurement?.compensatedDose ?? doseVal;
  const tempVal = measurement?.temperature || "31.2 °C";
  const humidityVal = measurement?.humidity || "68% RH";
  const uncVal = measurement?.uncertaintyValue ?? 0.15;
  const lower = measurement?.lowerBound ?? doseVal - uncVal;
  const upper = measurement?.upperBound ?? doseVal + uncVal;
  const calRange = measurement?.calibrationRange || "WITHIN VALIDATED RANGE";
  const isOutside = calRange !== "WITHIN VALIDATED RANGE" || measurement?.requiresHseReview;

  // 12-Stage Complete Calculation Path
  const calculationPathStages = [
    {
      id: 1,
      title: "Captured Image",
      status: "PASS",
      statusTone: "success" as const,
      input: {
        "Source": measurement?.source || "camera / frame",
        "Frame Format": "1280 x 720 JPEG",
        "Timestamp": measurement?.timestamp || "2026-10-04 16:30",
      },
      output: {
        "Image Fingerprint": measurement?.imageFingerprint || "FPR-DEMO-90412",
        "Replay Check": measurement?.replayDetected ? "FAIL (Duplicate Image)" : "PASS (Unique Frame)",
        "Pixel Array": "921,600 Color Pixels Evaluated",
      },
    },
    {
      id: 2,
      title: "Image Quality",
      status: (measurement?.quality ?? 94) < 60 ? "REJECTED" : "PASS",
      statusTone: (measurement?.quality ?? 94) < 60 ? "danger" as const : "success" as const,
      input: {
        "Focus & Sharpness": "Acceptable (Brenner gradient > 12.5)",
        "Specular Glare Limit": "Acceptable (< 5% highlight threshold)",
        "Occlusion Check": "Unobstructed sensing region",
      },
      output: {
        "Quality Score": `${measurement?.quality || 94}%`,
        "Wrist Context": measurement?.wristContextDetected === false ? "MISSING WRIST CONTEXT" : "VERIFIED ✓",
        "Gate Status": (measurement?.quality ?? 94) < 60 ? "REJECTED" : "APPROVED",
      },
    },
    {
      id: 3,
      title: "Badge Validation",
      status: "PASS",
      statusTone: "success" as const,
      input: {
        "Scanned Badge ID": measurement?.badgeId || "B-00101",
        "Batch Lot ID": measurement?.batchId || "BATCH-01",
        "Assigned Worker": measurement?.workerId || "W-101",
      },
      output: {
        "Manufactured Date": "12 Jan 2026",
        "Expiration Date": "12 Jan 2027",
        "Shelf Life Status": "VALID (Within 365 Days)",
      },
    },
    {
      id: 4,
      title: "Reference Patch Check",
      status: measurement?.warningMessage?.includes("Patch") ? "DRIFT DETECTED" : "HEALTHY",
      statusTone: measurement?.warningMessage?.includes("Patch") ? "danger" as const : "success" as const,
      input: {
        "Reference Scale": "12-Patch Palette Matrix",
        "Expected Color Space": "sRGB Standard Palette",
      },
      output: {
        "Patch Health Summary": measurement?.warningMessage?.includes("Patch") ? "9/12 Healthy — 3 Drifted Patches" : "12/12 Reference Patches Healthy",
        "Mean Color Distance ΔE": measurement?.warningMessage?.includes("Patch") ? "ΔE = 18.4 (Exceeds 15.0 limit)" : "ΔE = 1.4 (Normal)",
        "Matrix Status": measurement?.warningMessage?.includes("Patch") ? "DRIFT DETECTED — FLAGGED FOR REVIEW" : "HEALTHY",
      },
    },
    {
      id: 5,
      title: "Color Correction",
      status: "PASS",
      statusTone: "success" as const,
      input: {
        "Raw Uncorrected RGB": `R: ${measurement?.color?.r || 105}, G: ${measurement?.color?.g || 85}, B: ${measurement?.color?.b || 70}`,
        "Illumination Vector": "D65 Standard Daylight Balance",
      },
      output: {
        "Normalized RGB": `R: ${measurement?.normalizedRgb?.r || 108}, G: ${measurement?.normalizedRgb?.g || 87}, B: ${measurement?.normalizedRgb?.b || 71}`,
        "White Balance Factor": "k_wb = 1.028x",
      },
    },
    {
      id: 6,
      title: "CIE Lab / ΔE00",
      status: "PASS",
      statusTone: "success" as const,
      input: {
        "Pre-Shift Baseline RGB": `R: ${measurement?.preShiftColor?.r || 218}, G: ${measurement?.preShiftColor?.g || 208}, B: ${measurement?.preShiftColor?.b || 192}`,
        "Post-Shift Exposure RGB": `R: ${measurement?.color?.r || 105}, G: ${measurement?.color?.g || 85}, B: ${measurement?.color?.b || 70}`,
      },
      output: {
        "CIELAB L*a*b*": "L*: 42.1, a*: 14.8, b*: 12.3",
        "CIEDE2000 ΔE00": `ΔE = ${(measurement?.deltaE || 14.5).toFixed(2)}`,
        "Reflectance Ratio": "R / R0 = 0.482",
      },
    },
    {
      id: 7,
      title: "Calibration",
      status: "PASS",
      statusTone: "success" as const,
      input: {
        "Calibration Model": measurement?.calibrationVersion || "SentraBand PCHIP + CIEDE2000 LUT Model",
        "Points": "1001-Point Continuous Inversion LUT",
      },
      output: {
        "Raw Uncompensated Dose": `${(measurement?.rawDose || measurement?.exposure || 2.1).toFixed(2)} ppm·h`,
        "LUT Fit Variance": "R² = 0.9982, RMSE = 0.04",
      },
    },
    {
      id: 8,
      title: "Temperature/Humidity Compensation",
      status: "ACTIVE",
      statusTone: "primary" as const,
      input: {
        "Ambient Temperature": measurement?.temperature || "31.2 °C",
        "Relative Humidity": measurement?.humidity || "68% RH",
        "Standard Reference": "25.0 °C / 50% RH Standard",
      },
      output: {
        "Environmental Factor (k_env)": `${((measurement?.compensatedDose || measurement?.exposure || 2.1) / (measurement?.rawDose || 1)).toFixed(3)}x`,
        "Adjustment Status": measurement?.compensationStatus || "Adjusted for Temp (+6.2°C) & Humidity (+18% RH)",
        "Compensated Exposure": `${(measurement?.compensatedDose || measurement?.exposure || 2.1).toFixed(2)} ppm·h`,
      },
    },
    {
      id: 9,
      title: "Exposure Estimate",
      status: isOutside ? "REVIEW REQUIRED" : "VALID",
      statusTone: isOutside ? "danger" as const : "success" as const,
      input: {
        "Compensated Exposure Dose": `${(measurement?.exposure || 2.1).toFixed(2)} ppm·h`,
        "Shift Exposure Duration": `${measurement?.shiftDurationHours || 8.0} hours`,
      },
      output: {
        "Final Cumulative Exposure": `${(measurement?.exposure || 2.1).toFixed(2)} ppm·h`,
        "Estimated 8h TWA Concentration": `${(measurement?.twaPpm || ((measurement?.exposure || 2.1) / 8)).toFixed(2)} ppm TWA`,
        "OSHA PEL Limit": "2.50 ppm TWA (Action Level: 1.00 ppm)",
      },
    },
    {
      id: 10,
      title: "Uncertainty",
      status: isOutside ? "OUTSIDE RANGE" : "WITHIN RANGE",
      statusTone: isOutside ? "danger" as const : "success" as const,
      input: {
        "Covariance Matrix": "Noise Variance σ² = 0.008",
        "Confidence Interval": "95% Expanded Uncertainty (k = 2.0)",
      },
      output: {
        "Uncertainty Bound": measurement?.uncertainty || "±0.15 ppm·h",
        "Estimated Range": `${(measurement?.lowerBound || (measurement?.exposure || 2.1) - 0.15).toFixed(2)} – ${(measurement?.upperBound || (measurement?.exposure || 2.1) + 0.15).toFixed(2)} ppm·h`,
        "Validated Sensor Limits": "0.00 – 50.00 ppm·h",
      },
    },
    {
      id: 11,
      title: "Capture Integrity",
      status: measurement?.deviceBindingStatus === "DEVICE MISMATCH" ? "DEVICE MISMATCH" : "DEVICE MATCHED",
      statusTone: measurement?.deviceBindingStatus === "DEVICE MISMATCH" ? "danger" as const : "success" as const,
      input: {
        "Worker Verification": `Worker ID ${measurement?.workerId || "W-101"} Verified ✓`,
        "Hardware Binding": `Capture Device ${measurement?.deviceId || "DEV-MOB-8841"}`,
        "Timestamp Protocol": `Time ${measurement?.time || "14:40"} Verified ✓`,
      },
      output: {
        "Worker ID": measurement?.workerId || "W-101",
        "Badge ID": measurement?.badgeId || "B-00101",
        "Device ID": measurement?.deviceId || "DEV-MOB-8841",
        "Integrity Status": measurement?.deviceBindingStatus || "DEVICE MATCHED",
      },
    },
    {
      id: 12,
      title: "HSE Review",
      status: isOutside || measurement?.status === "REVIEW REQUIRED" ? "REVIEW REQUIRED" : "PASS",
      statusTone: isOutside || measurement?.status === "REVIEW REQUIRED" ? "danger" as const : "success" as const,
      input: {
        "Hazard Threshold Engine": "Automatic 7-Trigger Quality & Hazard Verification",
        "Confidence Score": `${measurement?.confidenceScore || 95.4}%`,
      },
      output: {
        "HSE Disposition Status": isOutside || measurement?.status === "REVIEW REQUIRED" ? "FLAGGED FOR HSE REVIEW" : "AUTOMATICALLY APPROVED",
        "Flag Reason": measurement?.warningMessage || (isOutside ? "OUTSIDE VALIDATED RANGE — HSE REVIEW REQUIRED" : "None — All safety checks passed"),
      },
    },
  ];

  // Expanded accordion state for stages
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({
    1: true,
    4: true,
    8: true,
    9: true,
    11: true,
    12: true,
  });

  const toggleStage = (id: number) => {
    setExpandedStages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Panel className="p-5">
          <div className="relative overflow-hidden rounded-lg">
            <img src={image} alt="Measurement trace source dosimeter" className="aspect-video w-full object-cover" />
            <Box className="left-[43%] top-[33%] h-[38%] w-[22%] border-warning" label="SENSING REGION" />
            <Box className="left-[45%] top-[69%] h-[8%] w-[20%] border-info" label="REFERENCE PALETTE" />
          </div>
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2">
            {["Sensing Region", "Reference Palette", "Normalized Color", "Calibration Model", "Estimated Exposure"].map((x, i) => (
              <div className="flex items-center gap-2" key={x}>
                <motion.button whileHover={{ y: -2 }} className="min-w-28 rounded-lg border border-border bg-muted p-3 text-[10px] font-bold">
                  {x}
                </motion.button>
                {i < 4 && (
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.15 }} className="text-primary">
                    →
                  </motion.span>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          {isOutside && (
            <div className="mb-3 rounded-xl border border-red-500/80 bg-red-500/15 p-3 text-red-700 dark:text-red-300 font-bold text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-red-600 animate-pulse" />
              OUTSIDE VALIDATED RANGE — HSE REVIEW REQUIRED
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
              Environmental Compensation Applied
            </span>
          </div>
          <div className="text-[10px] font-bold uppercase text-primary">Final Compensated Exposure</div>
          <div className={`mt-1 font-mono text-4xl font-black ${isOutside ? "text-red-600 dark:text-red-400" : ""}`}>
            {compVal.toFixed(2)} <span className="text-xl font-semibold">ppm·h</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
            <Data label="Raw Dose" value={`${rawVal.toFixed(2)} ppm·h`} />
            <Data label="Compensated Dose" value={`${compVal.toFixed(2)} ppm·h`} />
            <Data label="Temperature" value={tempVal} />
            <Data label="Humidity" value={humidityVal} />
            <Data label="Uncertainty" value={`±${uncVal.toFixed(2)} ppm·h`} />
            <Data label="Estimated Range" value={`${lower.toFixed(2)} – ${upper.toFixed(2)} ppm·h`} />
          </div>

          {/* PRE-SHIFT VS POST-SHIFT BASELINE COMPARISON */}
          <PrePostComparisonCard />

          {/* CAPTURE INTEGRITY & DEVICE BINDING SECTION */}
          <CaptureIntegrityCard measurement={measurement} />

          {/* MEASUREMENT RELIABILITY PANEL */}
          <div className="mt-4">
            <MeasurementReliabilityPanel measurement={measurement} />
          </div>

          {/* MEASUREMENT AUDIT TIMELINE (8 RECORDED EVENTS) */}
          <div className="mt-4">
            <MeasurementAuditTimeline measurement={measurement} />
          </div>
          <div className="mt-3 flex gap-2">
            <StatusBadge status={isOutside ? "REVIEW REQUIRED" : "VALID"} />
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${isOutside ? "bg-red-500/20 text-red-800 dark:text-red-300" : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"}`}>
              {calRange}
            </span>
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">Trace ID</div>
            <div className="mt-1 font-mono text-sm font-bold">{measurement?.traceId || "TRACE-MEAS-1043"}</div>
          </div>
        </Panel>
      </div>

      {/* 12-STAGE COMPLETE CALCULATION PATH SECTION */}
      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-5">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-primary tracking-wider">
              Full Calculation Pipeline (12 Sequential Stages)
            </div>
            <h3 className="text-lg font-black text-foreground mt-0.5">
              Complete Traceable Calculation Path & Verification Audit
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const all: Record<number, boolean> = {};
                calculationPathStages.forEach((s) => (all[s.id] = true));
                setExpandedStages(all);
              }}
              className="text-xs font-bold"
            >
              Expand All (12 Stages)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpandedStages({})}
              className="text-xs font-bold"
            >
              Collapse All
            </Button>
          </div>
        </div>

        {/* 12 Expandable Accordion Stage Cards */}
        <div className="space-y-3">
          {calculationPathStages.map((stage) => {
            const isExpanded = expandedStages[stage.id];
            return (
              <div
                key={stage.id}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? "border-primary/40 bg-card shadow-sm"
                    : "border-border/80 bg-muted/30 hover:bg-muted/60"
                }`}
              >
                {/* Accordion Stage Header */}
                <button
                  type="button"
                  onClick={() => toggleStage(stage.id)}
                  className="flex w-full items-center justify-between p-4 text-left font-bold text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-extrabold">
                      {stage.id}
                    </span>
                    <span className="text-sm font-black text-foreground">
                      {stage.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={stage.status} />
                    <span className="text-muted-foreground">
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </span>
                  </div>
                </button>

                {/* Expandable Input, Output, and Status Content */}
                {isExpanded && (
                  <div className="border-t border-border/50 p-4 space-y-3 bg-muted/20 rounded-b-xl text-xs font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* INPUT DATA */}
                      <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
                        <div className="text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/40 pb-1 flex items-center justify-between">
                          <span>📥 Stage Input Data</span>
                          <span className="text-primary font-bold">Parameters</span>
                        </div>
                        {Object.entries(stage.input).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">{k}:</span>
                            <b className="text-foreground">{v}</b>
                          </div>
                        ))}
                      </div>

                      {/* OUTPUT RESULT */}
                      <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
                        <div className="text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/40 pb-1 flex items-center justify-between">
                          <span>📤 Stage Output Result</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Computed Output</span>
                        </div>
                        {Object.entries(stage.output).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">{k}:</span>
                            <b className="text-foreground">{v}</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-border">
          {isOutside ? (
            <Button variant="destructive" onClick={() => save && save(measurement)} className="font-bold">
              <ShieldAlert className="size-4 mr-1" /> Submit to HSE Review Queue
            </Button>
          ) : (
            <Button onClick={() => save && save(measurement)} className="font-bold">
              <Download className="size-4 mr-1" /> Save Measurement
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (exportTraceJson) {
                exportTraceJson(measurement);
              } else {
                try {
                  const text = JSON.stringify(measurement, null, 2);
                  const blob = new Blob([text], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `TRACE-${measurement?.id || measurement?.traceId || "MEAS-1043"}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success(`Exported complete trace JSON for ${measurement?.id || "measurement"}`);
                } catch (err) {
                  toast.error("Failed to export trace JSON");
                }
              }
            }}
            className="font-bold"
          >
            <FileJson className="size-4 mr-1" /> Export Complete Trace JSON
          </Button>
          <Button variant="ghost" onClick={restart}>
            <ArrowLeft />
            Back to Capture
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Box({ className, label }: { className: string; label: string }) {
  return (
    <span className={`absolute border-2 ${className}`}>
      <span className="absolute -top-5 left-0 whitespace-nowrap bg-industrial-dark px-1 text-[8px] font-bold text-industrial-light">{label}</span>
    </span>
  );
}
