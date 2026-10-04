/**
 * PostgreSQL Frontend Client Interface for H₂S Guard
 * 
 * Interacts with PostgreSQL database via FastAPI REST endpoints or Supabase Client.
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  Worker,
  BadgeRecord,
  Measurement,
  ReviewAlert,
  UserAccount,
  HseReview,
  AuditLog,
  CalibrationRecord,
} from "@/types/h2s";

const FASTAPI_URL = "http://localhost:8000/api";

export interface PostgresFullState {
  workers: Worker[];
  badges: BadgeRecord[];
  measurements: Measurement[];
  calibration: CalibrationRecord[];
  alerts: ReviewAlert[];
  hseReviews: HseReview[];
  auditLogs: AuditLog[];
  users: UserAccount[];
}

/**
 * Fetches all persistent data from PostgreSQL database
 */
export async function fetchFullStateFromPostgres(): Promise<Partial<PostgresFullState> | null> {
  // 1. Try Python FastAPI PostgreSQL REST endpoints first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${FASTAPI_URL}/db/state`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      console.log("[PostgreSQL] Loaded full database state from FastAPI backend:", data);
      return data;
    }
  } catch (err) {
    // FastAPI backend not reachable or timing out
  }

  // 2. Try direct Supabase PostgreSQL queries if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const [wRes, bRes, mRes, aRes, uRes, hRes, lRes, cRes] = await Promise.all([
        supabase.from("workers").select("*"),
        supabase.from("badges").select("*"),
        supabase.from("measurements").select("*"),
        supabase.from("alerts").select("*"),
        supabase.from("users").select("*"),
        supabase.from("hse_reviews").select("*"),
        supabase.from("audit_logs").select("*"),
        supabase.from("calibration").select("*"),
      ]);

      const state: Partial<PostgresFullState> = {};
      if (wRes.data) state.workers = wRes.data as Worker[];
      if (bRes.data) state.badges = bRes.data as BadgeRecord[];
      if (mRes.data) state.measurements = mRes.data as Measurement[];
      if (aRes.data) state.alerts = aRes.data as ReviewAlert[];
      if (uRes.data) state.users = uRes.data as UserAccount[];
      if (hRes.data) state.hseReviews = hRes.data as HseReview[];
      if (lRes.data) state.auditLogs = lRes.data as AuditLog[];
      if (cRes.data) state.calibration = cRes.data as CalibrationRecord[];

      return state;
    } catch (err) {
      console.error("[PostgreSQL] Supabase query error:", err);
    }
  }

  return null;
}

/**
 * Saves a measurement record to PostgreSQL
 */
export async function saveMeasurementToPostgres(measurement: Measurement): Promise<boolean> {
  let saved = false;

  try {
    const res = await fetch(`${FASTAPI_URL}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(measurement),
    });
    if (res.ok) saved = true;
  } catch (err) {
    // FastAPI backend call failed
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("measurements").upsert([
      {
        id: measurement.id,
        trace_id: measurement.traceId,
        worker_id: measurement.workerId,
        badge_id: measurement.badgeId,
        batch_id: measurement.batchId,
        shift: measurement.shift,
        timestamp: measurement.timestamp,
        time: measurement.time,
        exposure: measurement.exposure,
        twa_ppm: measurement.twaPpm || 0.0,
        uncertainty: measurement.uncertainty,
        uncertainty_value: measurement.uncertaintyValue || 0.15,
        lower_bound: measurement.lowerBound || 0.0,
        upper_bound: measurement.upperBound || 0.0,
        calibration_range: measurement.calibrationRange || "WITHIN VALIDATED RANGE",
        calibration_version: measurement.calibrationVersion || "SentraBand PCHIP + CIEDE2000 LUT Model",
        calibration: measurement.calibration || "CAL-03 Model",
        status: measurement.status,
        quality: measurement.quality || 94,
        temperature: measurement.temperature || "31.2 °C",
        humidity: measurement.humidity || "68% RH",
        color_r: measurement.color?.r || 105,
        color_g: measurement.color?.g || 85,
        color_b: measurement.color?.b || 70,
        source: measurement.source || "demo",
      },
    ]);
    if (!error) saved = true;
  }

  return saved;
}

/**
 * Saves a worker record to PostgreSQL
 */
export async function saveWorkerToPostgres(worker: Worker): Promise<boolean> {
  let saved = false;

  try {
    const res = await fetch(`${FASTAPI_URL}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(worker),
    });
    if (res.ok) saved = true;
  } catch (err) {}

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("workers").upsert([
      {
        id: worker.id,
        name: worker.name,
        shift: worker.shift,
        badge_id: worker.badgeId,
        latest_exposure: worker.latestExposure || 0.0,
        last_measurement: worker.lastMeasurement || "Registered worker",
        status: worker.status || "Active",
      },
    ]);
    if (!error) saved = true;
  }

  return saved;
}

/**
 * Saves a badge record to PostgreSQL
 */
export async function saveBadgeToPostgres(badge: BadgeRecord): Promise<boolean> {
  let saved = false;

  try {
    const res = await fetch(`${FASTAPI_URL}/badges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badge),
    });
    if (res.ok) saved = true;
  } catch (err) {}

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("badges").upsert([
      {
        id: badge.id,
        batch: badge.batch,
        worker_id: badge.workerId,
        manufactured: badge.manufactured,
        expiry: badge.expiry,
        calibration: badge.calibration,
        status: badge.status,
        measurements: badge.measurements || 0,
      },
    ]);
    if (!error) saved = true;
  }

  return saved;
}

/**
 * Saves an alert record to PostgreSQL
 */
export async function saveAlertToPostgres(alert: ReviewAlert): Promise<boolean> {
  let saved = false;

  try {
    const res = await fetch(`${FASTAPI_URL}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
    });
    if (res.ok) saved = true;
  } catch (err) {}

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("alerts").upsert([
      {
        id: alert.id,
        category: alert.category,
        title: alert.title,
        subject: alert.subject,
        reason: alert.reason,
        status: alert.status,
      },
    ]);
    if (!error) saved = true;
  }

  return saved;
}

/**
 * Saves an HSE review to PostgreSQL
 */
export async function saveHseReviewToPostgres(review: HseReview): Promise<boolean> {
  let saved = false;

  try {
    const res = await fetch(`${FASTAPI_URL}/hse-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    });
    if (res.ok) saved = true;
  } catch (err) {}

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("hse_reviews").upsert([
      {
        id: review.id,
        alert_id: review.alertId,
        worker_id: review.workerId,
        reviewer_id: review.reviewerId,
        findings: review.findings,
        action_taken: review.actionTaken,
        status: review.status,
      },
    ]);
    if (!error) saved = true;
  }

  return saved;
}

/**
 * Saves an audit log entry to PostgreSQL
 */
export async function saveAuditLogToPostgres(log: AuditLog): Promise<boolean> {
  let saved = false;

  try {
    const res = await fetch(`${FASTAPI_URL}/audit-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (res.ok) saved = true;
  } catch (err) {}

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("audit_logs").upsert([
      {
        id: log.id,
        timestamp: log.timestamp,
        user_id: log.userId,
        user_name: log.userName,
        action: log.action,
        category: log.category,
        details: log.details,
        ip_address: log.ipAddress || "127.0.0.1",
        status: log.status,
      },
    ]);
    if (!error) saved = true;
  }

  return saved;
}

/**
 * Saves a user account to PostgreSQL
 */
export async function saveUserToPostgres(user: UserAccount): Promise<boolean> {
  let saved = false;

  try {
    const res = await fetch(`${FASTAPI_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    if (res.ok) saved = true;
  } catch (err) {}

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("users").upsert([
      {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        shift: user.shift,
        badge_id: user.badgeId,
        batch_id: user.batchId,
      },
    ]);
    if (!error) saved = true;
  }

  return saved;
}

/**
 * Syncs offline queue items to PostgreSQL
 */
export async function syncOfflineQueueToPostgres(queue: Array<{ type: string; data: any }>): Promise<boolean> {
  // 1. Try bulk FastAPI endpoint
  try {
    const res = await fetch(`${FASTAPI_URL}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queue),
    });
    if (res.ok) return true;
  } catch (err) {}

  // 2. Fallback: item-by-item sync to PostgreSQL/Supabase endpoints
  let allSuccess = true;
  for (const item of queue) {
    let itemSuccess = false;
    if (item.type === "measurement") {
      itemSuccess = await saveMeasurementToPostgres(item.data);
    } else if (item.type === "worker") {
      itemSuccess = await saveWorkerToPostgres(item.data);
    } else if (item.type === "badge") {
      itemSuccess = await saveBadgeToPostgres(item.data);
    } else if (item.type === "alert") {
      itemSuccess = await saveAlertToPostgres(item.data);
    } else if (item.type === "hse_review") {
      itemSuccess = await saveHseReviewToPostgres(item.data);
    } else if (item.type === "audit_log") {
      itemSuccess = await saveAuditLogToPostgres(item.data);
    } else if (item.type === "user") {
      itemSuccess = await saveUserToPostgres(item.data);
    }
    if (!itemSuccess) {
      allSuccess = false;
    }
  }

  return allSuccess;
}

