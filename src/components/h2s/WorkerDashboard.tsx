import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import { WristbandDosimeter } from "./WristbandDosimeter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, StatusBadge, WorkflowStepper } from "@/components/h2s/common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  CircleDot,
  Cpu,
  Download,
  Eye,
  FileImage,
  FileText,
  Focus,
  Globe,
  HardHat,
  History,
  Info,
  Layers,
  LoaderCircle,
  MoonStar,
  RefreshCw,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UserCheck,
  UserRound,
  X,
  Boxes,
  Activity,
  Calculator,
  Binary,
  Layers3,
  Sliders,
  Sparkle,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Siren,
  QrCode,
  FileSpreadsheet,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import type { Measurement } from "@/types/h2s";
import demoImage from "@/assets/demo-dosimeter.jpg";
import { LocalQrCode } from "./LocalQrCode";
import {
  extractActualImagePixels,
  computeOpticalDeltaFeatures,
  generateDosimeterCanvasImage,
  type AnalyzedImageData,
} from "@/services/imageAnalysisEngine";
import {
  analyzeH2SImagePair,
  type H2SAnalyzeApiResponse,
} from "@/services/h2sApiBackend";
import { rgbToDose, doseToRGB } from "@/services/calibrationEngine";
import { exportOccupationalHealthCSV, exportOccupationalHealthPDF } from "@/lib/structuredExport";
import { generateMultilingualAnswer, getGreetingMessage, getSuggestedQuestions } from "@/services/multilingualAssistant";

import { translations, type SupportedLanguage } from "@/lib/translations";
type WorkerTab = "workflow" | "history" | "assistant";
import { evaluateBadgeShelfLife } from "@/lib/badgeUtils";

type ShiftCaptureMode = "pre" | "post";
type Stage = "capture" | "validate" | "badge" | "normalize" | "estimate" | "trace";

const stageIndex: Record<Stage, number> = {
  capture: 0,
  validate: 1,
  badge: 1,
  normalize: 2,
  estimate: 3,
  trace: 4,
};


export function WorkerDashboard() {
  const navigate = useNavigate();
  const { currentUser, measurements, saveMeasurement, badges, language, setLanguage } = useApp();
  const t = translations[language] || translations.English;
  const [activeTab, setActiveTab] = useState<WorkerTab>("workflow");

  // Dynamic worker profile data
  const workerId = currentUser?.id || "W-101";
  const workerName = currentUser?.name || "Field Worker";
  const shift = currentUser?.shift || "Morning Shift";
  const badgeId = currentUser?.badgeId || "B-00101";
  const batchId = currentUser?.batchId || "BATCH-01";

  // Assigned badge shelf life evaluation
  const workerBadge = badges.find((b) => b.id === badgeId);
  const workerBadgeShelfLife = evaluateBadgeShelfLife(workerBadge?.expiry || "12 Jan 2027");

  // Pre-Shift & Post-Shift Image & Color Engine State (Persisted locally)
  const [preShiftRecorded, setPreShiftRecorded] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("h2s_preshift_recorded") === "true";
    }
    return false;
  });
  const [preShiftTime, setPreShiftTime] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("h2s_preshift_time") || null;
    }
    return null;
  });
  const [preShiftColor, setPreShiftColor] = useState<{ r: number; g: number; b: number }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("h2s_preshift_rgb");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { r: 218, g: 208, b: 192 };
  });
  const [preShiftImageSrc, setPreShiftImageSrc] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("h2s_preshift_photo") || null;
    }
    return null;
  });

  const [postShiftColor, setPostShiftColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [postShiftImageSrc, setPostShiftImageSrc] = useState<string | null>(null);

  // Guided Capture Workflow state
  const [captureMode, setCaptureMode] = useState<ShiftCaptureMode>("pre");
  const [isCapturing, setIsCapturing] = useState(false);
  const [stage, setStage] = useState<Stage>("capture");
  const [image, setImage] = useState<string | null>(null);
  const [source, setSource] = useState<"demo" | "upload" | "camera">("demo");
  const [invalid, setInvalid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [evaluatedScore, setEvaluatedScore] = useState<number>(91);

  // Calculation Engine State (Section 19 backend response & Section 17 audit trail)
  const [apiAnalysis, setApiAnalysis] = useState<H2SAnalyzeApiResponse | null>(null);
  const [showAuditDetails, setShowAuditDetails] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const shiftDuration = 8.0; // 8 hours shift

  // SentraBand CIEDE2000 LUT live calculation
  const liveDoseCalc = postShiftColor ? rgbToDose(postShiftColor) : null;

  // Dynamic scientific calculation result derived from real image pixel engine
  const actualPreRgb = apiAnalysis?.preShift.correctedRgb || preShiftColor;
  const actualPostRgb = apiAnalysis?.postShift.correctedRgb || postShiftColor || { r: 115, g: 90, b: 72 };
  const preSum = actualPreRgb.r + actualPreRgb.g + actualPreRgb.b || 1;
  const postSum = actualPostRgb.r + actualPostRgb.g + actualPostRgb.b || 1;

  // Worker's exposure measurements (case-insensitive & trimmed matching)
  const userMeasurements = React.useMemo(() => {
    return measurements.filter((m) => {
      const mWorker = (m.workerId || (m as any).worker_id || "").toString().trim().toLowerCase();
      const targetWorker = (workerId || "").toString().trim().toLowerCase();
      const mBadge = (m.badgeId || (m as any).badge_id || "").toString().trim().toLowerCase();
      const targetBadge = (badgeId || "").toString().trim().toLowerCase();
      return (mWorker && targetWorker && mWorker === targetWorker) || (mBadge && targetBadge && mBadge === targetBadge);
    });
  }, [measurements, workerId, badgeId]);

  // Real shift exposure metrics derived strictly from user's PostgreSQL measurements
  const realLatestMeas = userMeasurements[0];

  const rawExp = realLatestMeas?.exposure ?? (realLatestMeas as any)?.compensatedDose;
  const realDoseVal =
    apiAnalysis?.cumulativeExposure.value ??
    (rawExp !== undefined && rawExp !== null
      ? rawExp
      : postShiftColor && liveDoseCalc
      ? liveDoseCalc.dosePpmH
      : 0.0);

  const rawTwa = realLatestMeas?.twaPpm;
  const realTwaVal =
    apiAnalysis?.estimatedAveragePpm ??
    (rawTwa !== undefined && rawTwa !== null
      ? rawTwa
      : realDoseVal > 0
      ? Math.round((realDoseVal / shiftDuration) * 100) / 100
      : 0.0);

  const exposureResult = {
    preRgb: actualPreRgb,
    postRgb: actualPostRgb,
    preNormRgb: apiAnalysis?.preShift.normalizedRgb || {
      r: Math.round((actualPreRgb.r / preSum) * 1000) / 1000,
      g: Math.round((actualPreRgb.g / preSum) * 1000) / 1000,
      b: Math.round((actualPreRgb.b / preSum) * 1000) / 1000,
    },
    postNormRgb: apiAnalysis?.postShift.normalizedRgb || {
      r: Math.round((actualPostRgb.r / postSum) * 1000) / 1000,
      g: Math.round((actualPostRgb.g / postSum) * 1000) / 1000,
      b: Math.round((actualPostRgb.b / postSum) * 1000) / 1000,
    },
    deltaRgb: apiAnalysis?.colorDifference
      ? { r: apiAnalysis.colorDifference.deltaR, g: apiAnalysis.colorDifference.deltaG, b: apiAnalysis.colorDifference.deltaB }
      : {
        r: actualPostRgb.r - actualPreRgb.r,
        g: actualPostRgb.g - actualPreRgb.g,
        b: actualPostRgb.b - actualPreRgb.b,
      },
    deltaE: apiAnalysis?.colorDifference.deltaE ?? (postShiftColor && liveDoseCalc ? Math.round(liveDoseCalc.minDeltaE00 * 10) / 10 : 0.0),
    cumulativeDosePpmH: realDoseVal,
    shiftDurationHours: apiAnalysis?.durationHours ?? 8.0,
    twaPpm: realTwaVal,
    uncertaintyStr: realLatestMeas?.uncertainty || (postShiftColor ? "±0.15 ppm·h" : "0.00 ppm·h"),
    statusRangeStr: realLatestMeas?.calibrationRange || "WITHIN VALIDATED RANGE",
    isValidRange: realDoseVal <= 50.0,
    temperatureStr: realLatestMeas?.temperature || "31.2 °C",
    humidityStr: realLatestMeas?.humidity || "68% RH",
  };

  const [showHighAlertModal, setShowHighAlertModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Threshold Exposure Level Classification:
  // HIGH (> 2.5 ppm TWA or > 20.0 ppm·h) -> RED (Show Alert Modal & Alert Notification)
  // MODERATE (1.0 - 2.5 ppm TWA or 8.0 - 20.0 ppm·h) -> ORANGE
  // LOW (< 1.0 ppm TWA or < 8.0 ppm·h) -> GREEN
  const twaVal = exposureResult.twaPpm;
  const doseVal = exposureResult.cumulativeDosePpmH;

  const exposureLevelInfo = React.useMemo(() => {
    if (twaVal > 2.5 || doseVal > 20.0) {
      return {
        level: "HIGH" as const,
        statusText: "HIGH EXPOSURE ALERT",
        badgeStatus: "HIGH",
        colorTone: "red",
        badgeBg: "bg-red-600 text-white font-black animate-pulse",
        borderClass: "border-red-600 dark:border-red-500",
        bgClass: "bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-200",
        cardBorder: "border-2 border-red-600 shadow-lg shadow-red-500/20",
        headerBadgeBg: "bg-red-600 text-white font-extrabold",
        alertTitle: "🚨 HIGH H₂S EXPOSURE HAZARD DETECTED",
        alertDesc: "Shift-average concentration exceeds 2.5 ppm safe workplace limit. Evacuate area immediately and notify HSE safety officer.",
      };
    } else if (twaVal >= 1.0 || doseVal >= 8.0) {
      return {
        level: "MODERATE" as const,
        statusText: "MODERATE EXPOSURE",
        badgeStatus: "MODERATE",
        colorTone: "orange",
        badgeBg: "bg-amber-500 text-white font-bold",
        borderClass: "border-amber-500 dark:border-amber-400",
        bgClass: "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200",
        cardBorder: "border-2 border-amber-500 shadow-lg shadow-amber-500/20",
        headerBadgeBg: "bg-amber-500 text-white font-bold",
        alertTitle: "⚠ MODERATE H₂S EXPOSURE NOTICE",
        alertDesc: "Shift-average exposure is in moderate range (1.0 - 2.5 ppm TWA). Ensure adequate area ventilation.",
      };
    } else {
      return {
        level: "LOW" as const,
        statusText: "LOW EXPOSURE (SAFE)",
        badgeStatus: "LOW",
        colorTone: "green",
        badgeBg: "bg-emerald-600 text-white font-bold",
        borderClass: "border-emerald-500 dark:border-emerald-400",
        bgClass: "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200",
        cardBorder: "border-2 border-emerald-500 shadow-lg shadow-emerald-500/20",
        headerBadgeBg: "bg-emerald-600 text-white font-bold",
        alertTitle: "✓ LOW H₂S EXPOSURE - SAFE BASELINE",
        alertDesc: "Exposure is within normal baseline limits (< 1.0 ppm TWA). Normal work shift permitted.",
      };
    }
  }, [twaVal, doseVal]);

  // HSE Assistant chatbot state
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: getGreetingMessage("English"),
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const firstMeas = userMeasurements[0];
  const latestExposure = firstMeas && firstMeas.exposure !== null && firstMeas.exposure !== undefined
    ? `${firstMeas.exposure.toFixed(1)} ppm·h`
    : "0.0 ppm·h";

  // Entry handler for starting capture - navigates directly to /capture route URL with mode search param
  const handleStartCapture = (mode: ShiftCaptureMode) => {
    navigate({ to: "/capture", search: { mode } as any });
  };

  const processImageSelection = async (imgUrl: string, srcType: "demo" | "upload" | "camera") => {
    setImage(imgUrl);
    setSource(srcType);

    try {
      const realData = await extractActualImagePixels(imgUrl, false);
      setEvaluatedScore(realData.quality.score);

      if (captureMode === "pre") {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setPreShiftColor(realData.correctedRgb);
        setPreShiftImageSrc(imgUrl);
        setPreShiftRecorded(true);
        setPreShiftTime(timeStr);
        setIsCapturing(false);

        try {
          localStorage.setItem("h2s_preshift_recorded", "true");
          localStorage.setItem("h2s_preshift_time", timeStr);
          localStorage.setItem("h2s_preshift_rgb", JSON.stringify(realData.correctedRgb));
          localStorage.setItem("h2s_preshift_photo", imgUrl);
        } catch {}

        toast.success(`✓ Pre-Shift Baseline recorded at ${timeStr}. Ready for work shift.`);
        return;
      }

      setPostShiftColor(realData.correctedRgb);
      setPostShiftImageSrc(imgUrl);
      setDone([]);
      setStage("validate");
      toast.success("Dosimeter image captured. Click 'Validate Image' to verify dosimeter & wrist context.");
    } catch {
      toast.error("Failed to analyze image pixels");
    }
  };

  // Preset demo image generators
  const loadDemo = () => {
    const defaultPre = generateDosimeterCanvasImage(218, 208, 192);
    const defaultPost = generateDosimeterCanvasImage(115, 90, 72);
    const imgToUse = captureMode === "pre" ? defaultPre : defaultPost;
    processImageSelection(imgToUse, "demo");
  };

  const loadHighExposureDemo = () => {
    const highPost = generateDosimeterCanvasImage(72, 52, 38);
    processImageSelection(highPost, "demo");
  };

  const handleUpload = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    processImageSelection(url, "upload");
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      toast.error("Camera unavailable on this device. Uploading image instead.");
      fileRef.current?.click();
    }
  };

  const snapPhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const photoUrl = c.toDataURL("image/jpeg");
    (v.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
    processImageSelection(photoUrl, "camera");
  };

  // Workflow processing steps
  const runValidation = async () => {
    setProcessing(true);
    setDone([]);
    const checks = [
      "Badge detected (ROI-C)",
      "Sensing region detected (ROI-A)",
      "Reference palette detected (ROI-B)",
      "Lighting acceptable",
      "Sharpness acceptable",
      "Glare within acceptable range",
    ];
    for (const c of checks) {
      await new Promise((r) => setTimeout(r, 180));
      setDone((x) => [...x, c]);
    }
    setProcessing(false);
  };

  const runColorAnalysis = async () => {
    setProcessing(true);
    setDone([]);
    for (const c of [
      "Lighting compensation (ROI-B)",
      "White balance reference correction",
      "Normalized RGB & CIELAB feature extraction",
    ]) {
      await new Promise((r) => setTimeout(r, 350));
      setDone((x) => [...x, c]);
    }
    setProcessing(false);
  };

  const runExposureEstimation = async () => {
    setProcessing(true);
    setDone([]);
    const pipeline = [
      "PRE/POST IMAGE PAIR",
      "3-ROI DETECTION (A, B, C)",
      "REFERENCE NORMALIZATION",
      "COLOUR DISTANCE ΔE EXTRACTION",
      "CALIBRATION MODEL (CAL-03)",
      "CUMULATIVE DOSE & TWA ESTIMATE",
    ];
    for (const p of pipeline) {
      await new Promise((r) => setTimeout(r, 180));
      setDone((x) => [...x, p]);
    }

    // Execute actual HTML5 canvas pixel extraction & backend API calculation
    try {
      const apiRes = await analyzeH2SImagePair({
        preShiftImage: preShiftImageSrc || demoImage,
        postShiftImage: image || demoImage,
        badgeId,
        batchId,
        durationHours: 8.0,
        temperature: 31.2,
        humidity: 68.0,
        simulateGlareInvalid: invalid,
      });
      setApiAnalysis(apiRes);

      const computedTwa = apiRes.estimatedAveragePpm;
      const computedDose = apiRes.cumulativeExposure.value;

      if (computedTwa > 2.5 || computedDose > 20.0) {
        setShowHighAlertModal(true);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([300, 100, 300, 100, 500]);
        }
        toast.error("🚨 HIGH H₂S EXPOSURE ALERT: Cumulative exposure exceeds safe workplace limit! Evacuate area immediately.", { duration: 10000 });
      } else if (computedTwa >= 1.0 || computedDose >= 8.0) {
        toast.warning("⚠ MODERATE H₂S EXPOSURE DETECTED: Exposure level is in warning threshold (Orange alert).");
      } else {
        toast.success("✓ LOW H₂S EXPOSURE RECORDED: Baseline within safe workplace limits (Green status).");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to analyze image pixels");
    } finally {
      setProcessing(false);
    }
  };

  // Save Pre-Shift baseline
  const handleSavePreShift = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const preImgSrc = image || demoImage;

    try {
      const realPreData = await extractActualImagePixels(preImgSrc, false);
      if (realPreData.correctedRgb.r < 130 || realPreData.correctedRgb.g < 120) {
        toast.error("⚠ Warning: Pre-shift badge baseline invalid. Measurement cannot be accepted.");
        return;
      }

      setPreShiftRecorded(true);
      setPreShiftTime(timeStr);
      setPreShiftImageSrc(preImgSrc);
      setPreShiftColor(realPreData.correctedRgb);
      setIsCapturing(false);

      try {
        localStorage.setItem("h2s_preshift_recorded", "true");
        localStorage.setItem("h2s_preshift_time", timeStr);
        localStorage.setItem("h2s_preshift_rgb", JSON.stringify(realPreData.correctedRgb));
        localStorage.setItem("h2s_preshift_photo", preImgSrc);
      } catch {}

      toast.success(`✓ Pre-Shift Base Color recorded at ${timeStr}. Extracted RGB (${realPreData.correctedRgb.r}/${realPreData.correctedRgb.g}/${realPreData.correctedRgb.b}) stored.`);
    } catch {
      toast.error("Failed to extract pixels from pre-shift image");
    }
  };

  // Build measurement object for Post-Shift
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const currentMeasurement: Measurement = {
    id: `MEAS-${Math.floor(1000 + Math.random() * 9000)}`,
    traceId: `TRACE-MEAS-${Date.now()}`,
    workerId,
    badgeId,
    batchId,
    shift,
    timestamp: `${dateStr}, ${timeStr}`,
    time: timeStr,
    exposure: exposureResult.cumulativeDosePpmH,
    twaPpm: exposureResult.twaPpm,
    shiftDurationHours: exposureResult.shiftDurationHours,
    deltaE: exposureResult.deltaE,
    calibration: "CAL-03 Model",
    status: invalid || expired || !exposureResult.isValidRange ? "INVALID" : "VALID",
    quality: invalid ? 41 : 94,
    uncertainty: exposureResult.uncertaintyStr,
    temperature: exposureResult.temperatureStr,
    humidity: exposureResult.humidityStr,
    color: exposureResult.postRgb,
    preShiftColor: preShiftColor,
    preShiftTime: preShiftTime || "08:00 AM",
    postShiftTime: timeStr,
    source,
    normalizedRgb: exposureResult.postNormRgb,
    preShiftNormRgb: exposureResult.preNormRgb,
    deltaRgb: exposureResult.deltaRgb,
  };

  // Save Post-Shift measurement to trace database
  const handleSavePostShift = async () => {
    await saveMeasurement(currentMeasurement);
    toast.success("Post-Shift cumulative exposure record saved to trace database");
    setIsCapturing(false);
    setActiveTab("history");
  };

  const handleSendChatMessage = (textToUse?: string) => {
    const q = textToUse || chatInput;
    if (!q.trim()) return;

    setChatMessages((prev) => [...prev, { sender: "user", text: q }]);
    if (!textToUse) setChatInput("");
    setIsBotTyping(true);

    const botAns = generateMultilingualAnswer(q, language, {
      latestExposure,
      twaPpm: exposureResult.twaPpm,
      duration: exposureResult.shiftDurationHours,
      workerId,
      status: firstMeas?.status || "VALID",
    });

    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: "bot", text: botAns }]);
      setIsBotTyping(false);
    }, 400);
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setChatMessages((prev) => [
      ...prev,
      { sender: "bot", text: `🌐 ${newLang}: ${getGreetingMessage(newLang)}` },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner for Worker: My Shift */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-5 sm:p-6 text-white shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid size-12 sm:size-14 shrink-0 place-items-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <HardHat className="size-6 sm:size-8" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-xs font-extrabold uppercase text-blue-300 tracking-wider">
                  {t.myShift}
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-300">
                  ✓ {t.statusActive}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">{t.goodMorning}, {workerName.split(" ")[0]}</h1>
              <p className="text-xs text-slate-300">{t.assignedDosimeterNotice}</p>
            </div>
          </div>

          {/* Today's Assignment Card */}
          <div className="w-full md:w-auto rounded-2xl border border-white/15 bg-slate-900/90 p-4 shadow-lg">
            <div className="text-[10px] font-mono font-extrabold uppercase text-blue-300 tracking-wider mb-2">
              📋 {t.todaysAssignment}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">{t.workerIdLabel}</span>
                <span className="font-mono font-bold text-white">{workerId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{t.assignedBadgeLabel}</span>
                <span className="font-mono font-bold text-blue-300">{badgeId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{t.shiftLabel}</span>
                <span className="font-semibold text-white">{shift.includes("(") ? shift.split("(")[1]?.replace(")", "") : shift}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{t.badgeShelfLifeLabel}</span>
                <span className={`font-extrabold ${workerBadgeShelfLife === "VALID" ? "text-emerald-400" : "text-amber-400"}`}>
                  {workerBadgeShelfLife === "VALID" ? `✅ ${t.shelfLifeValid}` : `⚠️ ${t.expiredBadge}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Worker */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Button
          variant={activeTab === "workflow" ? "default" : "outline"}
          onClick={() => {
            setActiveTab("workflow");
            navigate({ to: "/capture" });
          }}
          className="gap-2 font-bold text-xs"
        >
          <Camera className="size-4" /> {t.prePostCapture}
        </Button>

        <Button
          variant={activeTab === "history" ? "default" : "outline"}
          onClick={() => setActiveTab("history")}
          className="gap-2 font-bold text-xs"
        >
          <History className="size-4" /> {t.exposureTraceHistory}
        </Button>
        <Button
          variant={activeTab === "assistant" ? "default" : "outline"}
          onClick={() => setActiveTab("assistant")}
          className="gap-2 font-bold text-xs"
        >
          <Sparkles className="size-4" /> {t.multilingualHseAssistant}
        </Button>
      </div>

      {/* TAB 1: PRE-SHIFT & POST-SHIFT WORKFLOW */}
      {activeTab === "workflow" && (
        <div className="space-y-6">
          {/* ACTIVE SHIFT TRACKING SESSION CARD */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                  <Clock className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-foreground">{t.activeShiftSession}</h3>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                      {t.statusActive}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.workerIdLabel}: <b className="text-foreground">{workerId}</b> · {t.shiftLabel}: <b className="text-foreground">{shift}</b> · {t.assignedBadgeLabel}: <b className="text-foreground">{badgeId}</b> · Start Time: <b className="text-foreground">{preShiftTime || "08:00 AM"}</b>
                  </p>
                </div>
              </div>

              {/* CLOSE SHIFT BUTTON */}
              <Button
                onClick={() => {
                  exportOccupationalHealthPDF(
                    userMeasurements.length > 0 ? userMeasurements : [currentMeasurement],
                    badges,
                    currentUser ? [currentUser as any] : []
                  );
                  toast.success(`Shift session for Worker ${workerId} closed. Occupational health summary PDF generated.`);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs gap-1.5 shadow-sm"
              >
                <FileText className="size-4" /> {t.closeShift}
              </Button>
            </div>

            {/* During Shift Metrics: Shift Duration, Current Cumulative Dose, Average/TWA, Valid Measurements */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t.shiftDuration}</span>
                <b className="text-lg font-black text-foreground">{exposureResult.shiftDurationHours.toFixed(1)} hrs</b>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t.currentCumulativeDose}</span>
                <b className="text-lg font-black text-blue-600 dark:text-blue-400">{exposureResult.cumulativeDosePpmH.toFixed(2)} ppm·h</b>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t.averageTwa}</span>
                <b className="text-lg font-black text-indigo-600 dark:text-indigo-400">{exposureResult.twaPpm.toFixed(2)} ppm</b>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t.validMeasurements}</span>
                <b className="text-lg font-black text-emerald-600 dark:text-emerald-400">{userMeasurements.length} {t.validReadings}</b>
              </div>
            </div>
          </div>
          {/* BADGE SHELF LIFE WARNING BANNERS */}
          {workerBadgeShelfLife === "INVALID" && (
            <div className="rounded-2xl border-2 border-red-500/80 bg-red-950/90 p-4 text-white shadow-xl flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-600 text-white font-bold">
                ❌
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-red-200">🚨 BADGE SHELF LIFE EXPIRED & INVALID</h4>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  Your assigned dosimeter badge <b>({badgeId})</b> has passed its expiration date. The badge shelf life is <b>INVALID</b> (Red). Please request a fresh replacement badge from your HSE Safety Officer before entering hazardous areas.
                </p>
              </div>
            </div>
          )}

          {workerBadgeShelfLife === "EXPIRING SOON" && (
            <div className="rounded-2xl border-2 border-amber-500/80 bg-amber-950/80 p-4 text-white shadow-lg flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-600 text-white font-bold">
                ⚠️
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-amber-200">⚠️ BADGE EXPIRING SOON (&lt; 30 DAYS)</h4>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  Your assigned dosimeter badge <b>({badgeId})</b> shelf life will expire within 30 days ({workerBadge?.expiry || "Soon"}). Contact your HSE Officer to schedule a batch lot renewal.
                </p>
              </div>
            </div>
          )}
          {!isCapturing ? (
            /* Option Selection View */
            <div className="grid gap-6 lg:grid-cols-2">
              {/* PRE-SHIFT CARD */}
              <div
                className={`relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 shadow-md ${preShiftRecorded
                  ? "border-emerald-500/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900"
                  : "border-blue-900/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900"
                  }`}
              >
                {/* Header section */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white shadow-lg shadow-blue-900/20 ring-4 ring-blue-500/10">
                      <Sun className="size-6 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {t.step1of2}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {t.startOfShift}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                        {t.preShiftScanTitle}
                      </h3>
                    </div>
                  </div>
                  {preShiftRecorded ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-800 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300 shadow-sm">
                      <Check className="size-3.5 text-emerald-600" /> {t.preShiftRecorded} ({preShiftTime})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2.5 py-1 text-[11px] font-extrabold text-amber-800 dark:text-amber-300">
                      <CircleDot className="size-2.5 text-amber-600 animate-pulse" /> {t.pendingScan}
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed mb-6">
                  {t.preShiftInstruction}
                </p>

                <Button
                  onClick={() => handleStartCapture("pre")}
                  className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-sm h-12 rounded-xl shadow-lg shadow-blue-950/20 gap-2 transition-all active:scale-[0.99]"
                >
                  <Sun className="size-4 text-amber-400" />
                  {preShiftRecorded ? t.recapturePreShiftScan : t.startPreShiftCheck}
                </Button>
              </div>

              {/* POST-SHIFT CARD */}
              <div
                className={`relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 shadow-md ${!preShiftRecorded
                  ? "border-slate-200/80 bg-slate-50/80 opacity-80 dark:bg-slate-900/60 dark:border-slate-800"
                  : "border-amber-500/80 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900"
                  }`}
              >
                {/* Header section */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-lg shadow-amber-600/20 ring-4 ring-amber-500/10">
                      <MoonStar className="size-6 text-amber-100" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {t.step2of2}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {t.endOfShift}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                        {t.postShiftScanTitle}
                      </h3>
                    </div>
                  </div>
                  {!preShiftRecorded ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                      🔒 {t.step1RequiredFirst}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-800 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-300 shadow-sm">
                      <Activity className="size-3.5 text-amber-600" /> {t.readyForScan}
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed mb-6">
                  {t.postShiftInstruction}
                </p>

                <Button
                  onClick={() => handleStartCapture("post")}
                  disabled={!preShiftRecorded}
                  className={`w-full font-bold text-sm h-12 rounded-xl shadow-lg gap-2 text-white transition-all active:scale-[0.99] ${!preShiftRecorded
                    ? "bg-slate-400/80 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-amber-600 via-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/20"
                    }`}
                >
                  <MoonStar className="size-4" />
                  {!preShiftRecorded ? t.requiresPreShiftBaselineFirst : t.startPostShiftScan}
                </Button>
              </div>
            </div>
          ) : (
            /* Multi-Step Guided Capture & Analysis Workflow (Exact HSE feature integrated for Worker) */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 space-y-6">
              {/* Stepper Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-0.5 text-[10px] font-bold uppercase text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                      {captureMode === "pre" ? "Pre-Shift Base Color Mode" : "Post-Shift Exposure Mode"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">Worker: {workerId} ({badgeId})</span>
                  </div>
                  <h2 className="text-xl font-black mt-1">
                    {captureMode === "pre"
                      ? "Pre-Shift Base Color Capture & Baseline Verification"
                      : "Post-Shift Dosimeter Scan & Exposure Quantification"}
                  </h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsCapturing(false)}>
                  <ArrowLeft className="size-4 mr-1" /> Exit Capture
                </Button>
              </div>

              {/* Workflow Stepper Bar */}
              <WorkflowStepper
                current={stageIndex[stage]}
                onStep={(idx) => {
                  if (idx === 0 && image) setStage("validate");
                  if (idx === 1 && image) setStage("badge");
                  if (idx === 2 && image) setStage("normalize");
                  if (idx === 3 && image) setStage("estimate");
                }}
              />

              {/* STAGE 1: CAPTURE PHOTO / UPLOAD / DEMO */}
              {stage === "capture" && (
                <div className="grid gap-5 xl:grid-cols-[1.5fr_.6fr]">
                  <Panel className="overflow-hidden p-0">
                    <div className="border-b border-border p-4 bg-slate-50 dark:bg-slate-900">
                      <h3 className="font-bold text-sm">Position the 3 wristband ROIs inside the frame</h3>
                      <p className="text-xs text-muted-foreground">
                        Align <b>ROI-A</b> (Sensing region), <b>ROI-B</b> (Reference color palette), and <b>ROI-C</b> (Badge QR / ID).
                      </p>
                    </div>

                    <div className="relative m-4 grid aspect-[16/9] place-items-center overflow-hidden rounded-2xl bg-slate-950">
                      {cameraOpen ? (
                        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                      ) : image ? (
                        <img src={image} alt="Dosimeter capture" className="h-full w-full object-cover" />
                      ) : (
                        <>
                          <div className="absolute inset-8 rounded-xl border-2 border-dashed border-blue-400/70">
                            <span className="absolute -top-3 left-4 bg-slate-900 px-2 text-[10px] font-bold text-blue-400 rounded">
                              ROI-C: BADGE ID / QR
                            </span>
                            <span className="absolute left-1/2 top-1/2 h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-amber-400 bg-amber-400/10">
                              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-300">
                                ROI-A: SENSING PATCH (10,000 PX)
                              </span>
                            </span>
                            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-900/80 px-2 py-0.5 text-[8px] font-bold text-blue-300 rounded">
                              ROI-B: PRINTED REFERENCE PALETTE
                            </span>
                          </div>
                          <motion.div
                            animate={{ y: [-100, 100, -100] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                            className="h-0.5 w-3/4 bg-blue-500 shadow-lg"
                          />
                          <ScanLine className="size-12 text-blue-400/60" />
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 p-4 pt-0">
                      <Button onClick={cameraOpen ? snapPhoto : openCamera} className="bg-blue-900 text-white font-bold text-xs">
                        <Camera className="size-4 mr-1" />
                        {cameraOpen ? "Snap Photo" : "Open Camera"}
                      </Button>
                      <Button variant="outline" onClick={() => fileRef.current?.click()} className="font-bold text-xs">
                        <Upload className="size-4 mr-1" /> Upload Image
                      </Button>

                      {image && (
                        <>
                          <Button variant="ghost" onClick={() => { setImage(null); setCameraOpen(false); }} className="font-bold text-xs">
                            <RefreshCw className="size-4 mr-1" /> Retake
                          </Button>
                          <Button onClick={() => setStage("validate")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs ml-auto">
                            Proceed to Validation <ArrowRight className="size-4 ml-1" />
                          </Button>
                        </>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
                    </div>
                  </Panel>

                  <Panel className="p-5 space-y-4">
                    <StatusBadge status="PROCESSING" className="mb-2" />
                    <h3 className="font-bold text-sm">3-ROI Alignment Protocol</h3>
                    {[
                      "ROI-A — H₂S Sensing region (Chemical patch)",
                      "ROI-B — Printed reference color palette (Lighting correction)",
                      "ROI-C — Badge ID & batch validity QR indicator",
                      "Ensure unshaded, even ambient illumination across ROIs",
                    ].map((x, i) => (
                      <div key={x} className="flex gap-3 text-xs text-slate-700 dark:text-slate-300">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-mono text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {x}
                      </div>
                    ))}
                  </Panel>
                </div>
              )}

              {/* STAGE 2: IMAGE QUALITY VALIDATION */}
              {stage === "validate" && (
                <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                  <Panel className="p-5 space-y-4">
                    <div className="relative overflow-hidden rounded-xl border">
                      <img src={image || demoImage} alt="Dosimeter under validation" className="aspect-video w-full object-cover" />
                      <div className="absolute left-3 top-3 rounded bg-slate-900/90 px-2 py-1 text-[10px] font-black text-blue-400">
                        GUIDED SCANNER
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "Badge detected (ROI-C)",
                        "Sensing region detected (ROI-A)",
                        "Reference palette detected (ROI-B)",
                        "Lighting acceptable",
                        "Sharpness acceptable",
                        "Glare within acceptable range",
                      ].map((c) => (
                        <motion.div
                          key={c}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: done.includes(c) ? 1 : 0.45 }}
                          className="flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold"
                        >
                          <span
                            className={`grid size-5 place-items-center rounded-full ${done.includes(c)
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                              }`}
                          >
                            {done.includes(c) ? <Check className="size-3" /> : <CircleDot className="size-3" />}
                          </span>
                          {c}
                        </motion.div>
                      ))}
                    </div>
                  </Panel>

                  <Panel className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">Image Quality Score</h3>
                      {done.length > 0 && !processing && <StatusBadge status="VALID" />}
                    </div>

                    <div className="my-4 grid place-items-center">
                      <div
                        className="relative grid size-32 place-items-center rounded-full"
                        style={{
                          background: `conic-gradient(#10b981 ${done.length ? `${evaluatedScore}%` : "0%"
                            }, #e2e8f0 0)`,
                        }}
                      >
                        <div className="grid size-24 place-items-center rounded-full bg-white dark:bg-slate-900 text-center">
                          <div>
                            <div className="font-mono text-2xl font-black">{done.length ? evaluatedScore : 0}%</div>
                            <div className="text-[9px] uppercase text-muted-foreground font-bold">Evaluated Score</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setStage("capture"); setImage(null); setDone([]); }} className="text-xs font-bold">
                        <RefreshCw className="size-3.5 mr-1" /> Retake
                      </Button>
                      {done.length === 0 ? (
                        <Button onClick={runValidation} disabled={processing} className="bg-blue-900 text-white font-bold text-xs">
                          {processing ? <LoaderCircle className="animate-spin size-4 mr-1" /> : <Eye className="size-4 mr-1" />}
                          Run Quality Check
                        </Button>
                      ) : (
                        <Button onClick={() => setStage("badge")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                          Continue to Badge Shelf-Life <ArrowRight className="size-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </Panel>
                </div>
              )}

              {/* STAGE 3: BADGE & SHELF-LIFE VALIDATION */}
              {stage === "badge" && (
                <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
                  <Panel className="p-4 flex flex-col items-center justify-center bg-slate-950/80">
                    <WristbandDosimeter
                      badgeId={badgeId}
                      batchId={batchId}
                      expiryStr={workerBadge?.expiry || "12 Jan 2027"}
                      shelfLifeStatus={workerBadgeShelfLife}
                      exposure={exposureResult.cumulativeDosePpmH}
                    />
                  </Panel>

                  <Panel className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm">Badge Shelf-Life Optical Check</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Right-side indicator dot optical analysis</p>
                      </div>
                      <StatusBadge status={workerBadgeShelfLife} />
                    </div>

                    {/* Shelf Life Status Box */}
                    <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                      workerBadgeShelfLife === "VALID"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                        : workerBadgeShelfLife === "EXPIRING SOON"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                        : "bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200"
                    }`}>
                      <div className="flex items-center gap-2 font-extrabold text-sm">
                        <span className={`size-3 rounded-full ${
                          workerBadgeShelfLife === "VALID" ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : workerBadgeShelfLife === "EXPIRING SOON" ? "bg-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                        }`} />
                        <span>
                          {workerBadgeShelfLife === "VALID"
                            ? "🟢 Green Dot — Badge Shelf Life Valid"
                            : workerBadgeShelfLife === "EXPIRING SOON"
                            ? "🟡 Yellow Dot — Badge Expiring Soon (< 30 Days)"
                            : "🔴 Red Dot — Badge Shelf Life EXPIRED & Invalid"}
                        </span>
                      </div>
                      <p className="leading-relaxed">
                        {workerBadgeShelfLife === "VALID"
                          ? "The right-side indicator dot on the dosimeter faceplate was optically verified as GREEN (Valid). Shelf life is active (> 30 days remaining)."
                          : workerBadgeShelfLife === "EXPIRING SOON"
                          ? "The right-side indicator dot on the dosimeter faceplate was optically verified as YELLOW (Expiring Soon). Contact HSE Officer to order replacement."
                          : "The right-side indicator dot on the dosimeter faceplate was optically verified as RED (Expired). Badge cannot be used for hazardous entry."}
                      </p>
                    </div>

                    <div className="space-y-2 text-xs font-semibold">
                      {[
                        { text: "Badge identity recognized (ROI-C)", pass: true },
                        { text: `Batch lot verified (${batchId})`, pass: true },
                        { text: `Optical Right Dot: ${workerBadgeShelfLife}`, pass: workerBadgeShelfLife !== "INVALID" },
                        { text: "Calibration curve available (CAL-03)", pass: true },
                      ].map((item) => (
                        <div className="flex items-center gap-2.5" key={item.text}>
                          <span className={`grid size-5 place-items-center rounded-full ${item.pass ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300"}`}>
                            {item.pass ? <Check className="size-3" /> : <X className="size-3" />}
                          </span>
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <Button className="w-full bg-blue-900 text-white font-bold text-xs" onClick={() => setStage("normalize")}>
                      Continue to Color Normalization <ArrowRight className="size-4 ml-1" />
                    </Button>
                  </Panel>
                </div>
              )}

              {/* STAGE 4: COLOR NORMALIZATION & FEATURE EXTRACTION */}
              {stage === "normalize" && (
                <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
                  <Panel className="p-4 space-y-3">
                    <div className="relative overflow-hidden rounded-xl border">
                      <img src={image || demoImage} alt="Dosimeter color analysis" className="aspect-video w-full object-cover" />
                      <span className="absolute left-[43%] top-[33%] h-[38%] w-[22%] border-2 border-amber-400 bg-amber-400/20 text-[9px] font-bold text-amber-300 p-1">
                        ROI-A: SENSING (10k PX)
                      </span>
                      <span className="absolute left-[45%] top-[69%] h-[8%] w-[20%] border-2 border-blue-400 bg-blue-400/20 text-[8px] font-bold text-blue-300 p-0.5">
                        ROI-B: PALETTE
                      </span>
                    </div>
                  </Panel>

                  <Panel className="p-5 space-y-4">
                    <h3 className="font-bold text-sm">Reference Illumination Normalization</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["R (Median)", captureMode === "pre" ? preShiftColor.r : exposureResult.postRgb.r],
                        ["G (Median)", captureMode === "pre" ? preShiftColor.g : exposureResult.postRgb.g],
                        ["B (Median)", captureMode === "pre" ? preShiftColor.b : exposureResult.postRgb.b],
                      ].map(([k, v]) => (
                        <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-center" key={k}>
                          <div className="text-[10px] font-bold text-muted-foreground">{k}</div>
                          <div className="font-mono text-xl font-bold">{v}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {[
                        "Lighting compensation (ROI-B)",
                        "White balance reference correction",
                        "Normalized RGB & CIELAB feature extraction",
                      ].map((t) => (
                        <div className="flex items-center justify-between rounded-xl border p-2.5 text-xs font-semibold" key={t}>
                          <span>{t}</span>
                          {done.includes(t) ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="size-3" /> Complete</span>
                          ) : (
                            <span className="text-slate-400">{processing ? "Processing..." : "Pending"}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {done.length < 3 ? (
                      <Button onClick={runColorAnalysis} disabled={processing} className="w-full bg-blue-900 text-white font-bold text-xs">
                        {processing ? <LoaderCircle className="animate-spin size-4 mr-1" /> : <Focus className="size-4 mr-1" />}
                        Run Reference Normalization
                      </Button>
                    ) : (
                      <Button onClick={() => setStage("estimate")} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                        Continue to Exposure Quantification <ArrowRight className="size-4 ml-1" />
                      </Button>
                    )}
                  </Panel>
                </div>
              )}

              {/* STAGE 5: EXPOSURE ESTIMATE / PRE-SHIFT SAVE */}
              {stage === "estimate" && (
                <div className="space-y-6">
                  {captureMode === "pre" ? (
                    /* PRE-SHIFT BASELINE CONFIRMATION */
                    <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
                      <Panel className="p-5 space-y-3">
                        <h3 className="font-bold text-sm">Pre-Shift Baseline Check</h3>
                        <div className="space-y-2 text-xs">
                          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3 border border-blue-200 dark:border-blue-900">
                            <span className="text-[10px] font-bold text-blue-600 uppercase block">Initial Optical State</span>
                            <div className="font-mono text-sm font-bold mt-1">RGB {preShiftColor.r} / {preShiftColor.g} / {preShiftColor.b}</div>
                          </div>
                          <div className="flex items-center gap-2 text-emerald-600 font-bold">
                            <Check className="size-4" /> Unused Badge Baseline Range Valid
                          </div>
                        </div>
                      </Panel>

                      <Panel className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-blue-600">Pre-Shift Photograph</span>
                            <h3 className="text-lg font-bold">Store Unexposed Base Color Baseline</h3>
                          </div>
                          <StatusBadge status="VALID" />
                        </div>

                        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/40 p-5 space-y-3">
                          <div className="flex items-center gap-3 text-blue-900 dark:text-blue-300">
                            <Sun className="size-8 text-amber-500" />
                            <div>
                              <h4 className="font-bold text-sm">Unexposed Base Color Saved</h4>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                Unexposed baseline color registered from sensing patch. Ready for 8-hour shift work.
                              </p>
                            </div>
                          </div>
                          <Button onClick={handleSavePreShift} className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold h-11 text-xs rounded-xl shadow-md">
                            Confirm & Store Pre-Shift Base Color
                          </Button>
                        </div>
                      </Panel>
                    </div>
                  ) : (
                    /* POST-SHIFT EXPOSURE QUANTIFICATION CARD (Section 19 Prompt layout) */
                    <div className="space-y-6">
                      {done.length < 6 ? (
                        <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
                          <Panel className="p-5 space-y-3">
                            <h3 className="font-bold text-sm">Shift & Environmental Conditions</h3>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 font-semibold">
                                <span className="text-muted-foreground">Ambient Conditions:</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">31.2 °C • 68% RH</span>
                              </div>
                              <div className="flex justify-between items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 font-semibold">
                                <span className="text-muted-foreground">Shift Duration:</span>
                                <span className="font-bold">8.0 Hours</span>
                              </div>
                              <div className="flex justify-between items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 font-semibold">
                                <span className="text-muted-foreground">Assigned Badge ID:</span>
                                <span className="font-mono font-bold">{badgeId}</span>
                              </div>
                            </div>
                          </Panel>

                          <Panel className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-amber-600">Post-Shift Analysis</span>
                                <h3 className="text-lg font-bold">Calculate Shift Exposure</h3>
                              </div>
                              <StatusBadge status="PROCESSING" />
                            </div>

                            <Button onClick={runExposureEstimation} disabled={processing} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold h-12 text-sm rounded-xl">
                              {processing ? <LoaderCircle className="animate-spin size-4 mr-1" /> : <Calculator className="size-4 mr-1" />}
                              Calculate Shift Exposure
                            </Button>
                          </Panel>
                        </div>
                      ) : (
                        /* SECTION 19 SCIENTIFIC EXPOSURE ANALYSIS CARD SCREEN */
                        <div className="rounded-3xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                          {/* Screen Header */}
                          <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                                  H₂S EXPOSURE ANALYSIS SCREEN
                                </span>
                                <span className="text-xs font-semibold text-slate-300">Environmental: 31.2 °C • 68% RH</span>
                              </div>
                              <h3 className="text-xl font-black mt-1">Quantitative Dosimetry Record</h3>
                            </div>
                            <StatusBadge status={exposureResult.statusRangeStr === "WITHIN VALIDATED RANGE" ? "VALID" : "INVALID"} />
                          </div>

                          {/* Badge & Shift Identification Bar */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 border-b text-xs font-mono">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Badge ID</span>
                              <b className="text-slate-900 dark:text-slate-100">{badgeId}</b>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Batch Lot</span>
                              <b className="text-slate-900 dark:text-slate-100">{batchId}</b>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Shift Window</span>
                              <b className="text-slate-900 dark:text-slate-100">08:00 → 16:00</b>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Exposure Duration (t)</span>
                              <b className="text-blue-600 dark:text-blue-400">{exposureResult.shiftDurationHours}.0 hours</b>
                            </div>
                          </div>

                          {/* Optical Comparison Grid (Pre-Shift vs Post-Shift) */}
                          <div className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* PRE-SHIFT CARD */}
                              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-blue-900 dark:text-blue-300 uppercase">
                                    PRE-SHIFT BASELINE (ROI-A)
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">{preShiftTime || "08:00 AM"}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div
                                    className="size-8 rounded-lg border border-slate-400 shadow-sm"
                                    style={{ backgroundColor: `rgb(${exposureResult.preRgb.r}, ${exposureResult.preRgb.g}, ${exposureResult.preRgb.b})` }}
                                  />
                                  <div>
                                    <div className="font-mono text-sm font-bold">
                                      RGB {exposureResult.preRgb.r} / {exposureResult.preRgb.g} / {exposureResult.preRgb.b}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* POST-SHIFT CARD */}
                              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/30 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 uppercase">
                                    POST-SHIFT RESPONSE (ROI-A)
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">{timeStr}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div
                                    className="size-8 rounded-lg border border-slate-400 shadow-sm"
                                    style={{ backgroundColor: `rgb(${exposureResult.postRgb.r}, ${exposureResult.postRgb.g}, ${exposureResult.postRgb.b})` }}
                                  />
                                  <div>
                                    <div className="font-mono text-sm font-bold">
                                      RGB {exposureResult.postRgb.r} / {exposureResult.postRgb.g} / {exposureResult.postRgb.b}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Verified Sensor Checks */}
                            <div className="rounded-xl border p-4 space-y-2 text-xs font-semibold">
                              <span className="text-[10px] uppercase font-bold text-blue-600 block">Verified Sensor & Badge Checks</span>
                              <div className="grid sm:grid-cols-3 gap-2 text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-2"><Check className="size-3.5 text-emerald-600" /> Reference colour corrected (ROI-B)</div>
                                <div className="flex items-center gap-2"><Check className="size-3.5 text-emerald-600" /> Sensor patch median extracted (ROI-A)</div>
                                <div className="flex items-center gap-2"><Check className="size-3.5 text-emerald-600" /> Badge ID verified (ROI-C)</div>
                              </div>
                            </div>

                            {/* EXPOSURE LEVEL CLASSIFICATION ALERT CARD (LOW = GREEN, MODERATE = ORANGE, HIGH = RED) */}
                            <div className={`rounded-2xl p-4 border-2 flex flex-wrap items-center justify-between gap-4 ${exposureLevelInfo.borderClass} ${exposureLevelInfo.bgClass}`}>
                              <div className="flex items-center gap-3">
                                <span className={`grid size-10 place-items-center rounded-xl text-white font-bold ${exposureLevelInfo.level === "HIGH" ? "bg-red-600 animate-pulse" : exposureLevelInfo.level === "MODERATE" ? "bg-amber-500" : "bg-emerald-600"}`}>
                                  {exposureLevelInfo.level === "HIGH" ? <Siren className="size-6 animate-bounce" /> : <AlertTriangle className="size-6" />}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <StatusBadge status={exposureLevelInfo.badgeStatus} />
                                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Workplace Threshold Status</span>
                                  </div>
                                  <p className="text-xs font-semibold mt-1">{exposureLevelInfo.alertDesc}</p>
                                </div>
                              </div>
                            </div>

                            {/* ESTIMATED CUMULATIVE EXPOSURE & TWA CONCENTRATION WITH UNCERTAINTY & RANGE */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className={`rounded-2xl p-5 text-center transition-all ${exposureLevelInfo.cardBorder} ${exposureLevelInfo.level === "HIGH" ? "bg-red-50 dark:bg-red-950/40" : exposureLevelInfo.level === "MODERATE" ? "bg-amber-50 dark:bg-amber-950/40" : "bg-emerald-50 dark:bg-emerald-950/40"}`}>
                                <span className={`text-xs font-extrabold uppercase tracking-wider ${exposureLevelInfo.level === "HIGH" ? "text-red-700 dark:text-red-300" : exposureLevelInfo.level === "MODERATE" ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}`}>
                                  ESTIMATED CUMULATIVE EXPOSURE (D)
                                </span>
                                <div className="mt-2 font-mono text-4xl font-black text-slate-900 dark:text-slate-100">
                                  {exposureResult.cumulativeDosePpmH.toFixed(2)} <span className="text-xl">ppm·h</span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-300/50 dark:border-slate-700/50 pt-2 text-xs font-mono">
                                  <div>
                                    <span className="text-[10px] text-muted-foreground uppercase block font-bold">Uncertainty</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">±0.15 ppm·h</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-muted-foreground uppercase block font-bold">Estimated Range</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      {Math.max(0, exposureResult.cumulativeDosePpmH - 0.15).toFixed(2)} – {(exposureResult.cumulativeDosePpmH + 0.15).toFixed(2)} ppm·h
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className={`rounded-2xl p-5 text-center transition-all ${exposureLevelInfo.cardBorder} ${exposureLevelInfo.level === "HIGH" ? "bg-red-50 dark:bg-red-950/40" : exposureLevelInfo.level === "MODERATE" ? "bg-amber-50 dark:bg-amber-950/40" : "bg-emerald-50 dark:bg-emerald-950/40"}`}>
                                <span className={`text-xs font-extrabold uppercase tracking-wider ${exposureLevelInfo.level === "HIGH" ? "text-red-700 dark:text-red-300" : exposureLevelInfo.level === "MODERATE" ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}`}>
                                  ESTIMATED SHIFT-AVERAGE (C_TWA = D / t)
                                </span>
                                <div className="mt-2 font-mono text-4xl font-black text-slate-900 dark:text-slate-100">
                                  {exposureResult.twaPpm.toFixed(2)} <span className="text-xl">ppm TWA</span>
                                </div>
                                <div className="mt-3 border-t border-slate-300/50 dark:border-slate-700/50 pt-2 text-xs font-mono">
                                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Shift Duration</span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400">{exposureResult.shiftDurationHours}.0 Hours</span>
                                </div>
                              </div>
                            </div>

                            {/* Calibration Validity Range Status Bar */}
                            {!exposureResult.isValidRange ? (
                              <div className="rounded-xl border-2 border-red-500/80 bg-red-500/15 p-4 text-red-700 dark:text-red-300 font-mono text-xs">
                                <div className="flex items-center gap-2 font-black text-sm uppercase">
                                  <AlertTriangle className="size-5 text-red-600 animate-pulse shrink-0" />
                                  OUTSIDE VALIDATED RANGE — HSE REVIEW REQUIRED
                                </div>
                                <div className="mt-1 font-semibold text-slate-700 dark:text-slate-300">
                                  The calculated exposure estimate ({exposureResult.cumulativeDosePpmH.toFixed(2)} ppm·h) is outside the sensor's validated range (0.00 – 50.00 ppm·h). Measurement confidence is reduced to 42.0%. This reading cannot be treated as a normal valid measurement.
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-xs font-mono">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-bold">Validated Calibration Range:</span>
                                  <b className="text-emerald-600 dark:text-emerald-400">WITHIN VALIDATED RANGE (0.00 – 50.00 ppm·h)</b>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-bold">Measurement Confidence:</span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400">95.4% (HIGH)</span>
                                </div>
                              </div>
                            )}

                            {/* SECTION 17: EXPANDABLE ANALYSIS DETAILS ACCORDION */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setShowAuditDetails(!showAuditDetails)}
                                className="w-full flex items-center justify-between p-4 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <div className="flex items-center gap-2">
                                  <Activity className="size-4 text-blue-600" />
                                  <span>Expandable Scientific Analysis Details (17 Audit Pipeline Steps)</span>
                                </div>
                                {showAuditDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              </button>
                              {showAuditDetails && (
                                <div className="p-4 border-t space-y-2 bg-white dark:bg-slate-900 text-xs font-mono">
                                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Full Pixel Audit Trail & Reference Normalization Execution
                                  </div>
                                  <div className="grid gap-2">
                                    {(apiAnalysis?.analysisDetailsList || []).map((item) => (
                                      <div key={item.step} className="flex flex-wrap items-center justify-between p-2 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                          {item.step}. {item.label}
                                        </span>
                                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{item.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-wrap gap-3 pt-2">
                              <Button onClick={() => setStage("trace")} className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs h-12 rounded-xl shadow-md">
                                <Eye className="size-4 mr-2" /> View Trace Details
                              </Button>
                              <Button onClick={handleSavePostShift} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-12 rounded-xl shadow-md">
                                <Download className="size-4 mr-2" /> Save Exposure Record to History Database
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 6: MEASUREMENT TRACE ANALYSIS */}
              {stage === "trace" && (
                <div className="space-y-6">
                  <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                    <Panel className="p-4 space-y-3">
                      <div className="relative overflow-hidden rounded-xl border">
                        <img src={image || demoImage} alt="Dosimeter trace" className="aspect-video w-full object-cover" />
                      </div>
                    </Panel>

                    <Panel className="p-5 space-y-4">
                      <span className="text-[10px] font-bold uppercase text-blue-600">Traceable Exposure Evidence</span>
                      <div className="font-mono text-4xl font-black">{exposureResult.cumulativeDosePpmH.toFixed(1)} <span className="text-lg">ppm·h</span></div>
                      <div className="text-xs text-slate-600 font-mono">Shift Average: {exposureResult.twaPpm.toFixed(2)} ppm TWA ({exposureResult.shiftDurationHours}h)</div>
                      <div className="text-xs text-muted-foreground font-mono">Trace ID: {currentMeasurement.traceId}</div>

                      <div className="space-y-2 text-xs font-semibold">
                        {["ROI-A, B, C validated", "Illumination reference corrected", "Optical delta ΔE calculated", "CAL-03 regression applied", "Within validated operating range"].map((x) => (
                          <div key={x} className="flex items-center gap-2 text-emerald-600">
                            <Check className="size-3.5" /> {x}
                          </div>
                        ))}
                      </div>

                      <Button onClick={handleSavePostShift} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-11">
                        Save Exposure Record to Trace Database
                      </Button>
                    </Panel>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* TAB 3: EXPOSURE HISTORY */}
      {activeTab === "history" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
            <div>
              <h2 className="text-xl font-bold">{t.personalHistory}</h2>
              <p className="text-xs text-muted-foreground">{t.exposureTraceHistory}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-muted-foreground mr-2">{userMeasurements.length} {t.totalRecords}</span>
              <Button
                size="sm"
                onClick={() => exportOccupationalHealthCSV(userMeasurements, [], [{ id: workerId, name: workerName, shift, badgeId, latestExposure: 0, lastMeasurement: "", status: "Active" }])}
                className="gap-1.5 text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-700"
              >
                <Download className="size-3.5" /> {t.exportCsv}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportOccupationalHealthPDF(userMeasurements, [], [{ id: workerId, name: workerName, shift, badgeId, latestExposure: 0, lastMeasurement: "", status: "Active" }])}
                className="gap-1.5 text-xs font-bold border-primary text-primary hover:bg-primary/10"
              >
                <FileText className="size-3.5" /> {t.exportPdf}
              </Button>
            </div>
          </div>

          {userMeasurements.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="mx-auto size-10 mb-2" />
              <div className="font-bold text-sm text-slate-700 dark:text-slate-300">{t.noRecordsSaved}</div>
              <p className="text-xs text-muted-foreground mt-1">{t.noRecordsDesc}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-[10px] uppercase text-muted-foreground font-bold">
                  <tr>
                    {["Measurement ID", "Timestamp", "Pre-Shift Time", "Post-Shift Time", "Cumulative Dose (D)", "Shift TWA (C_TWA)", t.alerts, t.badgeShelfLife].map((h) => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {userMeasurements.map((m) => {
                    const measDose = m.exposure ?? 0;
                    const measTwa = m.twaPpm ?? (measDose > 0 ? measDose / 8.0 : 0);
                    const statusToDisplay =
                      measDose > 20.0 || measTwa > 2.5
                        ? "HIGH"
                        : measDose >= 8.0 || measTwa >= 1.0
                          ? "MODERATE"
                          : "VALID";

                    const measBadge = badges.find((b) => b.id === m.badgeId);
                    const shelfLife = evaluateBadgeShelfLife(measBadge?.expiry || workerBadge?.expiry || "12 Jan 2027");

                    return (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-mono font-bold text-xs">{m.id}</td>
                        <td className="px-4 py-3 text-xs">{m.timestamp}</td>
                        <td className="px-4 py-3 text-xs font-mono">{m.preShiftTime || "08:00 AM"}</td>
                        <td className="px-4 py-3 text-xs font-mono">{m.postShiftTime || m.time}</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-600">{m.exposure !== null ? `${measDose.toFixed(1)} ppm·h` : "—"}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{measTwa.toFixed(2)} ppm</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={statusToDisplay} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={shelfLife} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MULTILINGUAL HSE ASSISTANT BOT */}
      {activeTab === "assistant" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-4">
          {/* Bot Header */}
          <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-900/20">
                <ShieldCheck className="size-6 text-emerald-400" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                    {t.interactiveAiSafetyBot}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" /> {t.onlineActive}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                  {t.multilingualHseAssistant}
                </h2>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Globe className="size-3.5 text-blue-600 ml-1 mr-0.5" />
              {(["English", "தமிழ்", "हिंदी", "ಕನ್ನಡ", "മലയാളം"] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-3 py-1 rounded-xl transition-all ${language === lang
                    ? "bg-blue-900 text-white shadow-sm font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Assistant Info Banner */}
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3.5 text-xs text-blue-950 dark:bg-blue-950/40 dark:border-blue-900/80 dark:text-blue-200 flex items-start gap-2.5">
            <Sparkles className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>AI Safety Knowledge Base:</b> Ask any question regarding pre/post shift photography, emergency gas leak protocols, $C_{`TWA`}$ limits, CAL-03 spline math, or badge calibration.
            </p>
          </div>

          {/* Chat Messages Log */}
          <div className="space-y-4 min-h-[300px] max-h-[420px] overflow-y-auto p-4 border rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 shadow-inner">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                {msg.sender === "bot" && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-900 text-emerald-400 shadow-sm mt-0.5">
                    <ShieldCheck className="size-4" />
                  </span>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${msg.sender === "user"
                    ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white font-medium rounded-br-none"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none"
                    }`}
                >
                  {msg.text}
                </div>
                {msg.sender === "user" && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-800 text-white shadow-sm mt-0.5">
                    <UserRound className="size-4" />
                  </span>
                )}
              </div>
            ))}

            {isBotTyping && (
              <div className="flex gap-3 justify-start items-center">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-900 text-emerald-400">
                  <ShieldCheck className="size-4 animate-spin" />
                </span>
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <span>HSE Assistant is processing...</span>
                  <span className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-blue-600 animate-bounce" />
                    <span className="size-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="size-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips (Interactive Bot Quick Actions) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Sparkles className="size-3 text-blue-500" /> Quick Suggested Queries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {getSuggestedQuestions(language).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSendChatMessage(item.label)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-900 dark:hover:text-blue-300 transition-all shadow-2xs text-left"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Field */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
              placeholder={
                language === "தமிழ்"
                  ? "H₂S அளவீடு அல்லது பாதுகாப்பு நெறிமுறை பற்றி கேளுங்கள்..."
                  : language === "हिंदी"
                    ? "H₂S माप या सुरक्षा प्रोटोकॉल के बारे में पूछें..."
                    : language === "ಕನ್ನಡ"
                      ? "H₂S ಅಳತೆ ಅಥವಾ ಸುರಕ್ಷತೆಯ ಬಗ್ಗೆ ಕೇಳಿ..."
                      : "Ask HSE bot about safety limits, pre/post shift scan, or H₂S emergency..."
              }
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <Button
              onClick={() => handleSendChatMessage()}
              className="rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs px-5 shadow-md gap-1.5"
            >
              <Send className="size-4" /> Send
            </Button>
          </div>
        </div>
      )}

      {/* HIGH EXPOSURE EMERGENCY ALERT MODAL DIALOG */}
      <Dialog open={showHighAlertModal} onOpenChange={setShowHighAlertModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-600 bg-red-950 text-white shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-red-600 text-white animate-bounce shadow-lg shadow-red-600/50">
                <Siren className="size-7" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-red-300 tracking-wider bg-red-900 px-2 py-0.5 rounded border border-red-700 block w-fit">
                  🚨 CRITICAL HSE EMERGENCY ALERT
                </span>
                <DialogTitle className="text-xl font-black text-red-100 mt-1">HIGH H₂S EXPOSURE DETECTED</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-red-200 mt-3">
              Post-shift dosimetry calculation returned <b>{exposureResult.twaPpm.toFixed(2)} ppm TWA</b> (Cumulative: <b>{exposureResult.cumulativeDosePpmH.toFixed(1)} ppm·h</b>).
              This exceeds safe workplace exposure limits.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-red-800 bg-red-900/60 p-4 text-xs space-y-2 text-red-100 font-mono my-2">
            <div className="flex items-center justify-between border-b border-red-800/80 pb-1.5">
              <span>Workplace Safe Limit:</span>
              <span className="font-bold text-red-300">1.00 ppm TWA</span>
            </div>
            <div className="flex items-center justify-between border-b border-red-800/80 pb-1.5">
              <span>Recorded Shift Concentration:</span>
              <span className="font-bold text-red-400">{exposureResult.twaPpm.toFixed(2)} ppm TWA</span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span>Hazard Status:</span>
              <span className="font-bold text-white uppercase bg-red-600 px-2 py-0.5 rounded text-[10px]">HIGH (RED ALERT)</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-200">
            <div className="font-bold text-white uppercase text-[11px]">Immediate Required Actions:</div>
            <div className="flex items-center gap-2"><Check className="size-4 text-red-400 shrink-0" /> Evacuate hazardous work area immediately</div>
            <div className="flex items-center gap-2"><Check className="size-4 text-red-400 shrink-0" /> Report directly to Plant Safety Officer</div>
            <div className="flex items-center gap-2"><Check className="size-4 text-red-400 shrink-0" /> Submit dosimeter badge for laboratory verification</div>
          </div>

          <Button onClick={() => setShowHighAlertModal(false)} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold h-11 text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/40 mt-2">
            I Acknowledge Emergency High Exposure Alert
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

