import type { SessionSaveData } from "./game-data";
import { base64ToUint8Array } from "../utils";

export type BattleReplayPackageKind = "battle_replay_keyframes";

export type ReplayMessageKind = "text" | "dialogue" | "levelUpStats" | "ivScan";
export type ReplayMessageSource = "showText" | "showDialogue" | "promptLevelUpStats" | "promptIvs";

export interface ReplayMessage {
  kind: ReplayMessageKind;
  source: ReplayMessageSource;
  text: string;
  speakerName?: string;
  i18nKey?: string;
  prompt?: boolean | null;
  callbackDelay?: integer | null;
  promptDelay?: integer | null;
  charDelay?: integer | null;
  defer?: boolean | null;
  phaseName?: string;
  skipped?: boolean;
}

export interface BattleReplayPackageMeta {
  gameVersion: string;
  gameMode: number;
  waveIndex: integer;
  battleType: string | number;
  double: boolean;
  createdAt: integer;
}

export interface BattleReplayPackagePrivacy {
  redactedNicknames: boolean;
  redactedTrainerId: boolean;
  redactedSeed: boolean;
}

export interface BattleReplayPackageBattleStart {
  session: SessionSaveData;
  battleSeed: string | null;
  battleTurn: integer;
}

export interface BattleReplayPackageStepMove {
  move: any;
  targets: any[];
}

export interface BattleReplayPackageStep {
  i: integer;
  turn: integer;
  actor: any;
  command: any;
  move?: BattleReplayPackageStepMove | null;
  messages: ReplayMessage[];
  keyframe: SessionSaveData;
}

export interface BattleReplayPackageV1 {
  v: 1;
  kind: BattleReplayPackageKind;
  meta: BattleReplayPackageMeta;
  privacy: BattleReplayPackagePrivacy;
  battleStart: BattleReplayPackageBattleStart;
  steps: BattleReplayPackageStep[];
}

export type BattleReplayPackage = BattleReplayPackageV1;

export interface ReplayDecodeOptions {
  maxCompressedBytes?: integer;
  maxInflatedChars?: integer;
}

const MAX_HASH_PAYLOAD_CHARS: integer = 1900;

export function encodeReplayPackage(pkg: BattleReplayPackage): Uint8Array {
  const pako = (window as any).pako;
  if (!pako?.deflate) {
    throw new Error("Replay encode unavailable (pako missing)");
  }
  const json = JSON.stringify(pkg);
  return pako.deflate(json) as Uint8Array;
}

export function decodeReplayPackage(bytes: Uint8Array, opts: ReplayDecodeOptions = {}): BattleReplayPackage {
  const maxCompressedBytes = opts.maxCompressedBytes ?? (5 * 1024 * 1024);
  if (bytes.byteLength > maxCompressedBytes) {
    throw new Error("Replay payload too large");
  }
  const pako = (window as any).pako;
  if (!pako?.inflate) {
    throw new Error("Replay decode unavailable (pako missing)");
  }
  const json = pako.inflate(bytes, { to: "string" }) as string;
  const maxInflatedChars = opts.maxInflatedChars ?? (5 * 1024 * 1024);
  if (json.length > maxInflatedChars) {
    throw new Error("Replay payload too large");
  }
  const parsed = JSON.parse(json);
  return validateReplayPackage(parsed);
}

export function encodeReplayHash(pkg: BattleReplayPackage): string {
  const bytes = encodeReplayPackage(pkg);
  return uint8ArrayToBase64Url(bytes);
}

export function decodeReplayHash(payload: string, opts: ReplayDecodeOptions = {}): BattleReplayPackage {
  if (payload.length > MAX_HASH_PAYLOAD_CHARS) {
    throw new Error("Replay payload too large");
  }
  const bytes = base64UrlToUint8Array(payload);
  return decodeReplayPackage(bytes, opts);
}

export function sanitizeSessionForReplay(session: SessionSaveData, opts: { publicShare: boolean }): SessionSaveData {
  const clone: any = deepClone(session);

  delete clone.battlePath;
  delete clone.nightmareBattleSeeds;
  delete clone.fixedBattleSeeds;
  delete clone.preargsForShop;
  delete clone.moveUsageCount;
  delete clone.pendingMoveUpgrades;
  delete clone.runEndSummaryRunData;
  delete clone.sessionQuestModifierData;
  delete clone.activeConsoleCodeQuests;
  delete clone.pathNodeContext;
  delete clone.selectedNodeType;
  delete clone.selectedPath;
  delete clone.battlePathWave;
  delete clone.lastBattleNodeWave;

  if (clone.party?.length) {
    for (const p of clone.party) {
      if (p && typeof p === "object") {
        if ("nickname" in p) {
          p.nickname = "";
        }
      }
    }
  }
  if (clone.enemyParty?.length) {
    for (const p of clone.enemyParty) {
      if (p && typeof p === "object") {
        if ("nickname" in p) {
          p.nickname = "";
        }
      }
    }
  }
  if (clone.trainer && typeof clone.trainer === "object") {
    if ("name" in clone.trainer) clone.trainer.name = "";
    if ("partnerName" in clone.trainer) clone.trainer.partnerName = "";
  }

  for (const listKey of ["modifiers", "enemyModifiers"]) {
    const mods = clone[listKey];
    if (Array.isArray(mods)) {
      for (const m of mods) {
        if (m && typeof m === "object" && "consoleCode" in m) {
          delete m.consoleCode;
        }
      }
    }
  }

  clone.timestamp = 0;

  if (opts.publicShare) {
    clone.seed = null;
  }

  return clone as SessionSaveData;
}

export function assertNoForbiddenSystemKeys(value: unknown): void {
  const forbidden = new Set([
    "systemData",
    "trainerId",
    "secretId",
    "dexData",
    "starterData",
    "eggs",
    "unlocks",
    "achvUnlocks",
    "permaMoney",
    "questUnlockables",
    "gameStats",
  ]);
  walkObject(value, (k) => {
    if (forbidden.has(k)) {
      throw new Error(`Replay payload contains forbidden key: ${k}`);
    }
  });
}

function validateReplayPackage(value: any): BattleReplayPackage {
  if (!value || typeof value !== "object") throw new Error("Invalid replay package");
  assertNoForbiddenSystemKeys(value);
  const topAllowed = new Set(["v", "kind", "meta", "privacy", "battleStart", "steps"]);
  for (const k of Object.keys(value)) {
    if (!topAllowed.has(k)) {
      throw new Error(`Invalid replay key: ${k}`);
    }
  }
  if (value.v !== 1) throw new Error("Unsupported replay version");
  if (value.kind !== "battle_replay_keyframes") throw new Error("Invalid replay kind");
  if (!value.meta || typeof value.meta !== "object") throw new Error("Invalid replay meta");
  if (!value.privacy || typeof value.privacy !== "object") throw new Error("Invalid replay privacy");
  if (!value.battleStart || typeof value.battleStart !== "object") throw new Error("Invalid replay battleStart");
  if (!Array.isArray(value.steps)) throw new Error("Invalid replay steps");
  const metaAllowed = new Set(["gameVersion", "gameMode", "waveIndex", "battleType", "double", "createdAt"]);
  for (const k of Object.keys(value.meta)) {
    if (!metaAllowed.has(k)) throw new Error(`Invalid replay meta key: ${k}`);
  }
  if (typeof value.meta.gameVersion !== "string") throw new Error("Invalid replay meta.gameVersion");
  if (typeof value.meta.gameMode !== "number") throw new Error("Invalid replay meta.gameMode");
  if (typeof value.meta.waveIndex !== "number") throw new Error("Invalid replay meta.waveIndex");
  if (!(typeof value.meta.battleType === "string" || typeof value.meta.battleType === "number")) throw new Error("Invalid replay meta.battleType");
  if (typeof value.meta.double !== "boolean") throw new Error("Invalid replay meta.double");
  if (typeof value.meta.createdAt !== "number") throw new Error("Invalid replay meta.createdAt");

  const privacyAllowed = new Set(["redactedNicknames", "redactedTrainerId", "redactedSeed"]);
  for (const k of Object.keys(value.privacy)) {
    if (!privacyAllowed.has(k)) throw new Error(`Invalid replay privacy key: ${k}`);
  }
  if (typeof value.privacy.redactedNicknames !== "boolean") throw new Error("Invalid replay privacy.redactedNicknames");
  if (typeof value.privacy.redactedTrainerId !== "boolean") throw new Error("Invalid replay privacy.redactedTrainerId");
  if (typeof value.privacy.redactedSeed !== "boolean") throw new Error("Invalid replay privacy.redactedSeed");

  const battleStartAllowed = new Set(["session", "battleSeed", "battleTurn"]);
  for (const k of Object.keys(value.battleStart)) {
    if (!battleStartAllowed.has(k)) throw new Error(`Invalid replay battleStart key: ${k}`);
  }
  if (!value.battleStart.session || typeof value.battleStart.session !== "object") throw new Error("Invalid replay battleStart.session");
  if (!(typeof value.battleStart.battleSeed === "string" || value.battleStart.battleSeed === null)) throw new Error("Invalid replay battleStart.battleSeed");
  if (typeof value.battleStart.battleTurn !== "number") throw new Error("Invalid replay battleStart.battleTurn");
  if (value.privacy.redactedSeed) {
    if (value.battleStart.battleSeed !== null || ((value.battleStart.session as any)?.seed != null)) {
      value.privacy.redactedSeed = false;
    }
  }

  for (const step of value.steps) {
    if (!step || typeof step !== "object") throw new Error("Invalid replay step");
    const stepAllowed = new Set(["i", "turn", "actor", "command", "move", "messages", "keyframe"]);
    for (const k of Object.keys(step)) {
      if (!stepAllowed.has(k)) throw new Error(`Invalid replay step key: ${k}`);
    }
    if (typeof step.i !== "number") throw new Error("Invalid replay step.i");
    if (typeof step.turn !== "number") throw new Error("Invalid replay step.turn");
    if (typeof step.command !== "string") throw new Error("Invalid replay step.command");
    if (!Array.isArray(step.messages)) throw new Error("Invalid replay step.messages");
    if (!step.keyframe || typeof step.keyframe !== "object") throw new Error("Invalid replay step.keyframe");
    if (step.move !== undefined && step.move !== null) {
      if (typeof step.move !== "object") throw new Error("Invalid replay step.move");
      const moveAllowed = new Set(["move", "targets"]);
      for (const k of Object.keys(step.move)) {
        if (!moveAllowed.has(k)) throw new Error(`Invalid replay step.move key: ${k}`);
      }
      if (!Array.isArray(step.move.targets)) throw new Error("Invalid replay step.move.targets");
    }
    for (const m of step.messages) {
      if (!m || typeof m !== "object") throw new Error("Invalid replay message");
      const msgAllowed = new Set(["kind", "source", "text", "speakerName", "i18nKey", "prompt", "callbackDelay", "promptDelay", "charDelay", "defer", "phaseName", "skipped"]);
      for (const k of Object.keys(m)) {
        if (!msgAllowed.has(k)) throw new Error(`Invalid replay message key: ${k}`);
      }
      if (typeof m.kind !== "string") throw new Error("Invalid replay message.kind");
      if (typeof m.source !== "string") throw new Error("Invalid replay message.source");
      if (typeof m.text !== "string") throw new Error("Invalid replay message.text");
      if (m.speakerName !== undefined && m.speakerName !== null && typeof m.speakerName !== "string") throw new Error("Invalid replay message.speakerName");
      if (m.i18nKey !== undefined && m.i18nKey !== null && typeof m.i18nKey !== "string") throw new Error("Invalid replay message.i18nKey");
      if (m.skipped !== undefined && m.skipped !== null && typeof m.skipped !== "boolean") throw new Error("Invalid replay message.skipped");
    }
  }
  return value as BattleReplayPackage;
}

function base64UrlToUint8Array(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padLen);
  return base64ToUint8Array(padded);
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function deepClone<T>(value: T): T {
  const sc = (globalThis as any).structuredClone;
  if (typeof sc === "function") {
    try {
      return sc(value);
    } catch {}
  }
  return deepCloneLossy(value) as T;
}

function deepCloneLossy(value: any): any {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "bigint") return value;
  if (t === "function" || t === "symbol") return null;
  if (Array.isArray(value)) {
    const out: any[] = [];
    for (const v of value) {
      out.push(deepCloneLossy(v));
    }
    return out;
  }
  if (t === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "function" || typeof v === "symbol") {
        continue;
      }
      const cv = deepCloneLossy(v);
      if (cv === undefined) continue;
      out[k] = cv;
    }
    return out;
  }
  return null;
}

function walkObject(value: any, onKey: (key: string) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const v of value) walkObject(v, onKey);
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    onKey(k);
    walkObject(v, onKey);
  }
}