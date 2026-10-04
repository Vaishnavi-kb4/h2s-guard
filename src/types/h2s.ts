export type SafetyStatus = "VALID" | "INVALID" | "REVIEW REQUIRED" | "EXPIRED" | "PROCESSING" | "OFFLINE" | "SYNCED" | "ACTIVE" | "EXPIRING SOON";

export type UserRole = "worker" | "monitor";
export type ActiveViewMode = "mobile" | "dashboard";

export interface UserAccount {
  id: string; // e.g. W-101
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  shift: string;
  badgeId: string;
  batchId: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  shift: string;
  badgeId: string;
  latestExposure: number;
  lastMeasurement: string;
  status: "Active" | "Review";
  preShiftRecorded?: boolean;
  preShiftTime?: string;
  preShiftColor?: { r: number; g: number; b: number };
}

export interface BadgeRecord { id:string; batch:string; workerId:string; manufactured:string; expiry:string; calibration:string; status:"VALID"|"EXPIRED"|"EXPIRING SOON"; measurements:number; }

export type CalibrationRangeStatus =
  | "WITHIN VALIDATED RANGE"
  | "OUTSIDE VALIDATED RANGE"
  | "INSUFFICIENT CALIBRATION DATA";

export interface Measurement {
  id: string;
  traceId: string;
  workerId: string;
  badgeId: string;
  batchId: string;
  shift: string;
  timestamp: string;
  time: string;
  exposure: number | null; // Cumulative Exposure D in ppm·h
  twaPpm?: number; // Estimated Shift-Average Concentration C_TWA = D / t in ppm
  shiftDurationHours?: number; // Exposure shift duration t in hours (default: 8.0)
  deltaE?: number; // CIELAB / Optical colour distance feature ΔE
  calibration: string;
  status: "VALID" | "INVALID" | "REVIEW REQUIRED";
  quality: number;
  uncertainty: string; // Formatted string e.g. "±0.15 ppm·h"
  uncertaintyValue?: number; // Numeric value e.g. 0.15
  lowerBound?: number; // exposure - uncertaintyValue
  upperBound?: number; // exposure + uncertaintyValue
  calibrationRange?: CalibrationRangeStatus; // "WITHIN VALIDATED RANGE" | "OUTSIDE VALIDATED RANGE" | "INSUFFICIENT CALIBRATION DATA"
  calibrationVersion?: string;
  confidenceScore?: number;
  requiresHseReview?: boolean;
  warningMessage?: string;
  temperature: string;
  humidity: string;
  rawDose?: number;
  compensatedDose?: number;
  compensationStatus?: string;
  environmentalCompensationApplied?: boolean;
  imageFingerprint?: string;
  replayDetected?: boolean;
  wristContextDetected?: boolean;
  deviceId?: string;
  deviceBindingStatus?: "DEVICE MATCHED" | "DEVICE MISMATCH";
  workerVerified?: boolean;
  deviceVerified?: boolean;
  timestampVerified?: boolean;
  color: { r: number; g: number; b: number };
  preShiftColor?: { r: number; g: number; b: number };
  preShiftTime?: string;
  postShiftTime?: string;
  source?: "demo" | "upload" | "camera";
  normalizedRgb?: { r: number; g: number; b: number };
  preShiftNormRgb?: { r: number; g: number; b: number };
  deltaRgb?: { r: number; g: number; b: number };
  syncStatus?: "SYNCED" | "PENDING SYNC";
}

export interface ReviewAlert { id:string; category:"IMAGE"|"BADGE"|"MEASUREMENT"|"CALIBRATION"|"HSE REVIEW"; title:string; subject:string; reason:string; status:"Open"|"Approved"|"Rejected"|"Recapture Requested"; }
export interface NotificationItem { id:string; title:string; detail:string; to:string; read:boolean; }
export type CaptureStage = "identify"|"capture"|"validate"|"badge"|"normalize"|"estimate"|"trace";

export interface HseReview {
  id: string;
  alertId: string;
  workerId: string;
  reviewerId: string;
  findings: string;
  actionTaken: string;
  status: "Completed" | "Pending" | "Escalated";
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: "MEASUREMENT" | "WORKER" | "BADGE" | "CALIBRATION" | "HSE_REVIEW" | "SYSTEM" | "AUTH";
  details: string;
  ipAddress?: string;
  status: "Success" | "Failed" | "Warning";
}

export interface CalibrationRecord {
  id: string;
  version: string;
  model: string;
  points: number;
  rSquared: number;
  rmse: number;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  createdAt: string;
}

export interface ShiftSession {
  id: string;
  workerId: string;
  shift: string;
  startTime: string;
  startTimestamp: number;
  badgeId: string;
  status: "ACTIVE" | "CLOSED";
  durationHours?: number;
  cumulativeDose?: number;
  twaPpm?: number;
  validMeasurementsCount?: number;
}



