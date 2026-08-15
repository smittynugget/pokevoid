import type { BattleReplayPackage } from "./replay-package";

type PendingReplaySource = "hash" | "file";

let pendingReplay: { source: PendingReplaySource; hashPayload?: string; pkg?: BattleReplayPackage } | null = null;

export const REPLAY_URL_MAX_CHARS: integer = 1900;
const REPLAY_BOOT_ERROR_KEY: string = "__POKEVOID_REPLAY_BOOT_ERROR__";

export function setReplayBootError(message: string): void {
  try {
    sessionStorage.setItem(REPLAY_BOOT_ERROR_KEY, message);
  } catch {}
}

export function consumeReplayBootError(): string | null {
  try {
    const msg = sessionStorage.getItem(REPLAY_BOOT_ERROR_KEY);
    if (msg) {
      sessionStorage.removeItem(REPLAY_BOOT_ERROR_KEY);
      return msg;
    }
  } catch {}
  return null;
}

export function hasPendingReplay(): boolean {
  return false;
}

export function getPendingReplay(): { source: PendingReplaySource; hashPayload?: string; pkg?: BattleReplayPackage } | null {
  return pendingReplay;
}

export function setPendingReplayPackage(pkg: BattleReplayPackage, source: PendingReplaySource): void {
  pendingReplay = { source, pkg };
  (globalThis as any).__POKEVOID_REPLAY_MODE__ = true;
}

export function setPendingReplayHashPayload(hashPayload: string): void {
  pendingReplay = { source: "hash", hashPayload };
  (globalThis as any).__POKEVOID_REPLAY_MODE__ = true;
}

export function parseReplayHashFromLocation(): boolean {
  return false;
}

export function clearReplayHashFromLocation(): void {
  try {
    const url = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", url);
  } catch {}
}

export function clearPendingReplay(): void {
  pendingReplay = null;
  try {
    delete (globalThis as any).__POKEVOID_REPLAY_MODE__;
  } catch {}
}