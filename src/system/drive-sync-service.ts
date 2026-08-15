import BattleScene from "#app/battle-scene";
import { isDriveConnected } from "./drive-auth";
import { getDriveSaveMeta, downloadDriveSave, uploadDriveSave } from "./drive-sync";
import { driveQueue } from "./drive-queue";
import { loggedInUser } from "#app/account";
import { AES, enc } from "crypto-js";
import { isReplayMode } from "./replay-mode";

import { saveKey } from "./game-data";

export interface SaveCompleteMeta {
  sync: boolean;
  systemOnly: boolean;
  sessionSaved: boolean;
}

class DriveSyncService {
  private scene: BattleScene | null = null;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private flushing = false;
  private flushingItemId: string | null = null;
  private initialized = false;
  private readonly boundOnOnline = () => { this.flush(); };

  public init(scene: BattleScene): void {
    if (isReplayMode(scene)) return;
    if (this.initialized) return;
    this.initialized = true;
    this.scene = scene;
    if (isDriveConnected() && scene.cloudSaveEnabled) {
      this.restartInterval(scene.cloudSaveIntervalMs);
    }
    window.addEventListener("online", this.boundOnOnline);
  }

  public dispose(): void {
    this.stopInterval();
    window.removeEventListener("online", this.boundOnOnline);
    this.scene = null;
    this.initialized = false;
  }

  public restartInterval(intervalMs: number): void {
    this.stopInterval();
    if (!this.scene || intervalMs <= 0) return;
    if (isReplayMode(this.scene)) return;
    this.timerEvent = this.scene.time.addEvent({
      delay: intervalMs,
      repeat: -1,
      callback: () => this.flush(),
    });
  }

  public stopInterval(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
  }

  public intervalMsFromIndex(index: number): number {
    const intervals = [30 * 60 * 1000, 60 * 60 * 1000, 120 * 60 * 1000, 0];
    return intervals[index] ?? 60 * 60 * 1000;
  }

  public isEnabled(): boolean {
    if (isReplayMode(this.scene)) return false;
    return !!this.scene?.cloudSaveEnabled && isDriveConnected();
  }

  public async onSaveComplete(scene: BattleScene, meta: SaveCompleteMeta): Promise<void> {
    if (isReplayMode(scene)) return;
    if (!scene.cloudSaveEnabled || !isDriveConnected()) return;
    const force = meta.sync;
    if (!force && scene.cloudSaveIntervalMs === 0) return;
    const now = Date.now();
    const elapsed = now - (scene._lastDriveSyncTime || 0);
    if (!force && scene.cloudSaveIntervalMs > 0 && elapsed < scene.cloudSaveIntervalMs) return;
    await this.enqueueCurrentSave(scene);
    this.flush();
  }

  public async syncNow(): Promise<{ success: boolean; error?: string }> {
    if (!this.scene) return { success: false, error: "No scene" };
    if (isReplayMode(this.scene)) return { success: false, error: "Replay mode" };
    if (!isDriveConnected()) return { success: false, error: "Not connected" };
    await this.enqueueCurrentSave(this.scene);
    return this.flush();
  }

  private async enqueueCurrentSave(scene: BattleScene): Promise<void> {
    if (isReplayMode(scene)) return;
    const blob = await scene.gameData.getExportDataBlob();
    if (!blob) return;
    const payload = await blob.text();
    const username = loggedInUser?.username || "Champion";
    const systemTs = scene.gameData.getLocalSystemTimestamp?.() || Date.now();
    const gameVersion = scene.gameData.getDisplayVersionForDrive?.() || "1.0.0";
    const protectedId = this.flushingItemId || "";
    await driveQueue.clearOlderPending(username, protectedId, false);
    await driveQueue.enqueue(username, payload, systemTs, gameVersion);
  }

  public async flush(): Promise<{ success: boolean; error?: string }> {
    if (isReplayMode(this.scene)) return { success: false, error: "Replay mode" };
    if (this.flushing) return { success: false, error: "Sync in progress" };
    if (!navigator.onLine) return { success: false, error: "Offline" };
    if (!isDriveConnected()) return { success: false, error: "Not connected" };
    this.flushing = true;
    this.flushingItemId = null;
    try {
      const username = loggedInUser?.username || "Champion";
      const item = await driveQueue.getLatestPending(username);
      if (!item) {
        this.flushing = false;
        this.flushingItemId = null;
        return { success: true };
      }
      this.flushingItemId = item.id;
      const cloudMeta = await getDriveSaveMeta();
      if (cloudMeta && cloudMeta.systemTimestamp > item.systemTimestamp) {
        await driveQueue.markFailed(item.id, "Cloud is newer");
        this.flushing = false;
        this.flushingItemId = null;
        return { success: false, error: "Cloud is newer" };
      }
      await driveQueue.markUploading(item.id);
      const ok = await uploadDriveSave(item.payload, item.systemTimestamp, item.gameVersion);
      if (ok) {
        await driveQueue.deleteItem(item.id);
        await driveQueue.clearOlderPending(username, item.id);
        if (this.scene) {
          this.scene._lastDriveSyncTime = Date.now();
        }
        this.flushing = false;
        this.flushingItemId = null;
        return { success: true };
      }
      await driveQueue.markFailed(item.id, "Upload failed");
      this.flushing = false;
      this.flushingItemId = null;
      return { success: false, error: "Upload failed" };
    } catch (e: any) {
      if (this.flushingItemId) {
        await driveQueue.markFailed(this.flushingItemId, e?.message || "Exception").catch(() => {});
      }
      this.flushing = false;
      this.flushingItemId = null;
      return { success: false, error: e?.message || "Unknown error" };
    }
  }

  public async resolveBootSaveSource(scene: BattleScene): Promise<"local" | "cloud_applied" | "reload"> {
    if (isReplayMode(scene)) return "local";
    if (!isDriveConnected() || !navigator.onLine) return "local";
    try {
      const meta = await getDriveSaveMeta();
      if (!meta) return "local";
      const localTs = scene.gameData.getLocalSystemTimestamp();
      if (localTs === 0 && meta.systemTimestamp > 0) {
        return await this.applyCloudSave(scene);
      }
      if (meta.systemTimestamp > localTs + 60000) {
        return await this.promptAndApplyCloudSave(scene, meta.systemTimestamp, localTs);
      }
      return "local";
    } catch {
      return "local";
    }
  }

  private async applyCloudSave(scene: BattleScene): Promise<"local" | "reload"> {
    if (isReplayMode(scene)) return "local";
    const encrypted = await downloadDriveSave();
    if (!encrypted) return "local";
    try {
      const dataStr = AES.decrypt(encrypted.trim(), saveKey).toString(enc.Utf8);
      if (!dataStr) return "local";
      const combined = JSON.parse(dataStr);
      if (!scene.gameData.validateCombinedData(combined)) return "local";
      scene.gameData.applyCombinedSaveToLocalStorage(combined);
      return "reload";
    } catch {
      return "local";
    }
  }

  private async promptAndApplyCloudSave(scene: BattleScene, cloudTs: number, localTs: number): Promise<"local" | "reload"> {
    if (isReplayMode(scene)) return "local";
    return scene.gameData.promptCloudSaveOverride(cloudTs, localTs);
  }
}

export const driveSyncService = new DriveSyncService();