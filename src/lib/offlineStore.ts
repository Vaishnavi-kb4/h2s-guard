/**
 * Offline Store & IndexedDB Engine for H₂S Guard
 *
 * Provides persistent local database storage for:
 * - Completed measurements
 * - Pre-shift & post-shift captured images & RGB color profiles
 * - Worker safety records, badge records, alerts, HSE reviews, audit logs
 * - Queueing pending sync actions when internet is unavailable
 */

import type {
  Measurement,
  Worker,
  BadgeRecord,
  ReviewAlert,
  HseReview,
  AuditLog,
} from "@/types/h2s";

const DB_NAME = "H2SGuardDB";
const DB_VERSION = 1;

export interface QueueItem {
  id: string;
  type: "measurement" | "worker" | "badge" | "alert" | "hse_review" | "audit_log" | "user";
  data: any;
  timestamp: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Initializes IndexedDB for offline storage
 */
export async function initIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return null;
  }
  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("measurements")) {
          db.createObjectStore("measurements", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("workers")) {
          db.createObjectStore("workers", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("badges")) {
          db.createObjectStore("badges", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("alerts")) {
          db.createObjectStore("alerts", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("hse_reviews")) {
          db.createObjectStore("hse_reviews", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("audit_logs")) {
          db.createObjectStore("audit_logs", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("queue")) {
          db.createObjectStore("queue", { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn("[OfflineStore] IndexedDB open error, falling back to LocalStorage.");
        resolve(null);
      };
    } catch (e) {
      console.warn("[OfflineStore] IndexedDB initialization failed:", e);
      resolve(null);
    }
  });
}

// Generic IndexedDB Helpers
async function getFromStore<T>(storeName: string): Promise<T[]> {
  const db = await initIndexedDB();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => resolve(getFallbackLocalStorage<T>(storeName));
      } catch (e) {
        resolve(getFallbackLocalStorage<T>(storeName));
      }
    });
  }
  return getFallbackLocalStorage<T>(storeName);
}

async function saveToStore<T extends { id: string }>(storeName: string, item: T): Promise<void> {
  // Always write to LocalStorage fallback for high resilience
  saveFallbackLocalStorageItem(storeName, item);

  const db = await initIndexedDB();
  if (db) {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.put(item);
    } catch (e) {
      console.warn(`[OfflineStore] Failed to write to store ${storeName}:`, e);
    }
  }
}

async function saveAllToStore<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
  saveFallbackLocalStorage(storeName, items);

  const db = await initIndexedDB();
  if (db) {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      items.forEach((item) => store.put(item));
    } catch (e) {
      console.warn(`[OfflineStore] Failed bulk write to store ${storeName}:`, e);
    }
  }
}

// LocalStorage Fallback Helpers
function getFallbackLocalStorage<T>(storeName: string): T[] {
  try {
    const data = localStorage.getItem(`h2s.offline_db.${storeName}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveFallbackLocalStorage<T>(storeName: string, items: T[]): void {
  try {
    localStorage.setItem(`h2s.offline_db.${storeName}`, JSON.stringify(items));
  } catch (e) {
    console.warn(`[LocalStorage] Quota error on store ${storeName}:`, e);
  }
}

function saveFallbackLocalStorageItem<T extends { id: string }>(storeName: string, item: T): void {
  try {
    const list = getFallbackLocalStorage<T>(storeName);
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    localStorage.setItem(`h2s.offline_db.${storeName}`, JSON.stringify(list));
  } catch (e) {
    console.warn(`[LocalStorage] Error updating item in store ${storeName}:`, e);
  }
}

// PUBLIC OFFLINE DATABASE API

// --- MEASUREMENTS ---
export async function getOfflineMeasurements(): Promise<Measurement[]> {
  return getFromStore<Measurement>("measurements");
}

export async function saveOfflineMeasurement(m: Measurement, syncStatus: "SYNCED" | "PENDING SYNC" = "PENDING SYNC"): Promise<void> {
  const record: Measurement = {
    ...m,
    syncStatus,
  };
  await saveToStore<Measurement>("measurements", record);
}

export async function updateOfflineMeasurementSyncStatus(id: string, syncStatus: "SYNCED" | "PENDING SYNC"): Promise<void> {
  const measurements = await getOfflineMeasurements();
  const target = measurements.find((m) => m.id === id);
  if (target) {
    target.syncStatus = syncStatus;
    await saveToStore<Measurement>("measurements", target);
  }
}

// --- WORKERS ---
export async function getOfflineWorkers(): Promise<Worker[]> {
  return getFromStore<Worker>("workers");
}

export async function saveOfflineWorkers(workers: Worker[]): Promise<void> {
  await saveAllToStore<Worker>("workers", workers);
}

// --- BADGES ---
export async function getOfflineBadges(): Promise<BadgeRecord[]> {
  return getFromStore<BadgeRecord>("badges");
}

export async function saveOfflineBadges(badges: BadgeRecord[]): Promise<void> {
  await saveAllToStore<BadgeRecord>("badges", badges);
}

// --- ALERTS ---
export async function getOfflineAlerts(): Promise<ReviewAlert[]> {
  return getFromStore<ReviewAlert>("alerts");
}

export async function saveOfflineAlerts(alerts: ReviewAlert[]): Promise<void> {
  await saveAllToStore<ReviewAlert>("alerts", alerts);
}

// --- HSE REVIEWS ---
export async function getOfflineHseReviews(): Promise<HseReview[]> {
  return getFromStore<HseReview>("hse_reviews");
}

export async function saveOfflineHseReviews(reviews: HseReview[]): Promise<void> {
  await saveAllToStore<HseReview>("hse_reviews", reviews);
}

// --- AUDIT LOGS ---
export async function getOfflineAuditLogs(): Promise<AuditLog[]> {
  return getFromStore<AuditLog>("audit_logs");
}

export async function saveOfflineAuditLogs(logs: AuditLog[]): Promise<void> {
  await saveAllToStore<AuditLog>("audit_logs", logs);
}

// --- QUEUE ---
export async function getOfflineQueue(): Promise<QueueItem[]> {
  const items = await getFromStore<QueueItem>("queue");
  // Also sync with h2s.offline_queue in LocalStorage
  try {
    const legacyStr = localStorage.getItem("h2s.offline_queue");
    if (legacyStr) {
      const legacy: QueueItem[] = JSON.parse(legacyStr);
      const mergedMap = new Map<string, QueueItem>();
      items.forEach((item) => mergedMap.set(item.id, item));
      legacy.forEach((item, index) => {
        const itemId = item.id || `Q-${item.timestamp || Date.now()}-${index}`;
        if (!mergedMap.has(itemId)) {
          mergedMap.set(itemId, { ...item, id: itemId });
        }
      });
      return Array.from(mergedMap.values());
    }
  } catch {}
  return items;
}

export async function enqueueOfflineItem(type: QueueItem["type"], data: any): Promise<QueueItem> {
  const item: QueueItem = {
    id: `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    data,
    timestamp: Date.now(),
  };

  await saveToStore<QueueItem>("queue", item);

  // Sync to localStorage.getItem("h2s.offline_queue") for back-compat
  try {
    const q = await getOfflineQueue();
    localStorage.setItem("h2s.offline_queue", JSON.stringify(q));
  } catch {}

  return item;
}

export async function removeOfflineItem(id: string): Promise<void> {
  const db = await initIndexedDB();
  if (db) {
    try {
      const tx = db.transaction("queue", "readwrite");
      tx.objectStore("queue").delete(id);
    } catch {}
  }
  // Remove from localStorage fallback
  try {
    const list = getFallbackLocalStorage<QueueItem>("queue");
    const filtered = list.filter((x) => x.id !== id);
    saveFallbackLocalStorage("queue", filtered);
    localStorage.setItem("h2s.offline_queue", JSON.stringify(filtered));
  } catch {}
}

export async function clearOfflineQueue(): Promise<void> {
  const db = await initIndexedDB();
  if (db) {
    try {
      const tx = db.transaction("queue", "readwrite");
      tx.objectStore("queue").clear();
    } catch {}
  }
  saveFallbackLocalStorage("queue", []);
  localStorage.removeItem("h2s.offline_queue");
}
