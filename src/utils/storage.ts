import { ExamAttemptState, NetworkSimulationMode } from '../types/exam';
import { upsertMonitoringAttempt } from './examStore';

const DB_NAME = 'examcore_cbt_db';
const DB_VERSION = 1;
const STORE_NAME = 'attempts';
const ACTIVE_KEY = 'examcore_active_attempt_v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'attemptId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

/**
 * Offline-first instant local save: writes synchronously to localStorage (<5ms)
 * and asynchronously persists to IndexedDB (<50ms).
 */
export async function saveAttemptLocally(attempt: ExamAttemptState): Promise<void> {
  try {
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(attempt));
  } catch {
    // Ignore quota errors in restricted browser modes
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(attempt);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // LocalStorage mirror already saved the state
  }
}

export async function loadActiveAttempt(): Promise<ExamAttemptState | null> {
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    if (raw) {
      return JSON.parse(raw) as ExamAttemptState;
    }
  } catch {
    // Fall back to IndexedDB
  }

  try {
    const db = await openDatabase();
    return await new Promise<ExamAttemptState | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const items = req.result as ExamAttemptState[];
        if (!items || items.length === 0) {
          resolve(null);
          return;
        }
        items.sort((a, b) => b.startedAt - a.startedAt);
        resolve(items[0]);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function clearActiveAttempt(): Promise<void> {
  try {
    window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Ignore
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Ignore
  }
}

export interface SyncResult {
  ok: boolean;
  reason?: 'offline' | 'server_error';
  syncedAt?: number;
}

/**
 * Simulates POST /api/attempts/:id/sync with realistic network check and latency.
 */
export async function syncAttemptToServer(
  attempt: ExamAttemptState,
  simulationMode: NetworkSimulationMode,
): Promise<SyncResult> {
  const isBrowserOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (simulationMode === 'force_offline' || isBrowserOffline) {
    return { ok: false, reason: 'offline' };
  }

  // Simulated network RTT (180ms - 360ms)
  await new Promise((resolve) => setTimeout(resolve, 180 + Math.floor(Math.random() * 180)));

  if (simulationMode === 'force_error') {
    return { ok: false, reason: 'server_error' };
  }

  // Server acknowledged sync; update shared monitoring registry & return syncedAt
  const syncedAt = Date.now();
  upsertMonitoringAttempt({
    ...attempt,
    lastSyncedAt: syncedAt,
    pendingSync: false,
  });
  return { ok: true, syncedAt };
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatTimeWIB(timestampMs?: number): string {
  if (!timestampMs) return '—';
  return new Date(timestampMs).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
