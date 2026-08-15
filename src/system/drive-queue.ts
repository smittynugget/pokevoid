import { isReplayMode } from "./replay-mode";

export interface StoredDriveSyncItem {
  id: string;
  username: string;
  payload: string;
  systemTimestamp: number;
  gameVersion: string;
  status: "pending" | "uploading" | "failed";
  attemptCount: number;
  lastError: string | null;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
}

export class DriveQueue {
  private readonly MAX_ATTEMPTS = 8;
  private readonly DB_NAME = "PokeVoidDriveDB";
  private readonly STORE_NAME = "syncQueue";
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;

  public async init(): Promise<void> {
    if (isReplayMode()) return;
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onerror = () => reject(new Error("Could not open drive sync database"));
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.resetStuckItems().then(() => resolve()).catch(() => resolve());
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: "id" });
          store.createIndex("username", "username", { unique: false });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  private async resetStuckItems(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index("status");
      const request = index.getAll("uploading");
      request.onsuccess = () => {
        const items = (request.result || []) as StoredDriveSyncItem[];
        items.forEach((item) => {
          item.status = "pending";
          item.updatedAt = Date.now();
          store.put(item);
        });
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  public async enqueue(username: string, payload: string, systemTimestamp: number, gameVersion: string): Promise<void> {
    if (isReplayMode()) return;
    await this.init();
    const now = Date.now();
    const item: StoredDriveSyncItem = {
      id: `${username}_${now}`,
      username,
      payload,
      systemTimestamp,
      gameVersion,
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: 0,
      createdAt: now,
      updatedAt: now,
    };
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readwrite");
      tx.onerror = () => reject(new Error("Enqueue failed"));
      const store = tx.objectStore(this.STORE_NAME);
      store.put(item).onsuccess = () => resolve();
    });
  }

  public async getLatestPending(username: string): Promise<StoredDriveSyncItem | null> {
    if (isReplayMode()) return null;
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readonly");
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index("username");
      const request = index.getAll(username);
      request.onsuccess = () => {
        const items = (request.result || []) as StoredDriveSyncItem[];
        const now = Date.now();
        const pending = items
          .filter((i) => {
            if (i.status === "pending") return true;
            if (i.status !== "failed") return false;
            const nextRetryAt = (i as any).nextRetryAt ?? 0;
            const attemptCount = (i as any).attemptCount ?? 0;
            return attemptCount < this.MAX_ATTEMPTS && now >= nextRetryAt;
          })
          .sort((a, b) => b.createdAt - a.createdAt);
        resolve(pending[0] || null);
      };
      request.onerror = () => reject(new Error("GetPending failed"));
    });
  }

  public async markUploading(id: string): Promise<void> {
    if (isReplayMode()) return;
    await this.updateStatus(id, "uploading", null);
  }

  public async markFailed(id: string, error: string): Promise<void> {
    if (isReplayMode()) return;
    await this.updateStatus(id, "failed", error);
  }

  public async deleteItem(id: string): Promise<void> {
    if (isReplayMode()) return;
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readwrite");
      tx.objectStore(this.STORE_NAME).delete(id).onsuccess = () => resolve();
      tx.onerror = () => reject(new Error("Delete failed"));
    });
  }

  public async clearOlderPending(username: string, keepId: string, includeFailed: boolean = true): Promise<void> {
    if (isReplayMode()) return;
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index("username");
      const request = index.getAll(username);
      request.onsuccess = () => {
        const items = (request.result || []) as StoredDriveSyncItem[];
        items
          .filter((i) => i.id !== keepId && (includeFailed || i.status !== "failed"))
          .forEach((i) => store.delete(i.id));
        resolve();
      };
      request.onerror = () => reject(new Error("ClearOlder failed"));
    });
  }

  private async updateStatus(id: string, status: StoredDriveSyncItem["status"], error: string | null): Promise<void> {
    if (isReplayMode()) return;
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (!getReq.result) { resolve(); return; }
        const item = getReq.result as StoredDriveSyncItem;
        item.status = status;
        item.updatedAt = Date.now();
        if (status === "failed") {
          item.attemptCount++;
          item.lastError = error;
          const baseDelayMs = 30000;
          const capDelayMs = 30 * 60 * 1000;
          const delay = Math.min(capDelayMs, baseDelayMs * Math.pow(2, Math.max(0, item.attemptCount - 1)));
          item.nextRetryAt = Date.now() + delay;
        } else {
          item.nextRetryAt = 0;
        }
        store.put(item).onsuccess = () => resolve();
      };
      getReq.onerror = () => reject(new Error("UpdateStatus failed"));
    });
  }
}

export const driveQueue = new DriveQueue();