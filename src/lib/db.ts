// Persistent Database Integration (PostgreSQL + Fallback Cache) for HSG Guard Trace
import type { UserAccount } from "@/types/h2s";
import { saveUserToPostgres } from "./postgresClient";

const DB_NAME = "H2SGuardDB";
const DB_VERSION = 1;
const USERS_STORE = "users";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject("IndexedDB not supported");
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(USERS_STORE)) {
        db.createObjectStore(USERS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save User to PostgreSQL & local DB fallback
export async function saveUserToDB(user: UserAccount): Promise<void> {
  saveUserToPostgres(user);
  try {
    const db = await openDB();
    const tx = db.transaction(USERS_STORE, "readwrite");
    const store = tx.objectStore(USERS_STORE);
    store.put(user);
  } catch (err) {
    console.error("Local DB saveUser error:", err);
  }
}

// Get Users from Local DB fallback
export async function getUsersFromDB(): Promise<UserAccount[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(USERS_STORE, "readonly");
      const store = tx.objectStore(USERS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result as UserAccount[]) || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
