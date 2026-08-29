import { DEBUG_YU_VISUAL_TUNING } from "./overrides";
import { TweakMetaMode } from "./ui/tweak/tweak-meta-types";

export interface YuTuningState {
  portalScaleOffset: number;
  creatureScaleOffset: number;
  yOffset: number;
  xOffset: number;
  creatureYOffset: number;
  enemyPortalScaleOffset: number;
  enemyCreatureScaleOffset: number;
  enemyYOffset: number;
  enemyXOffset: number;
  enemyCreatureYOffset: number;
  creatureXOffset: number;
  enemyCreatureXOffset: number;
}

const STEP_SCALE = 0.05;
const STEP_PX = 2;

const _state: YuTuningState = {
  portalScaleOffset: 0,
  creatureScaleOffset: 0,
  yOffset: 0,
  xOffset: 0,
  creatureYOffset: 0,
  creatureXOffset: 0,
  enemyPortalScaleOffset: 0.015,
  enemyCreatureScaleOffset: -0.095,
  enemyYOffset: 3,
  enemyXOffset: 6,
  enemyCreatureYOffset: 5,
  enemyCreatureXOffset: 6,
};

let _initialized = false;
let _lastHandler = "";
const _reapplyCallbacks = new Set<() => void>();

const TWEAK_MODES = ["portalScale", "position", "creatureScale"] as const;
type TweakMode = typeof TWEAK_MODES[number];
let _tweakMode: TweakMode = "portalScale";
let _tweakModeIndex: number = 0;
let _yuTuneMetaMode: TweakMetaMode = TweakMetaMode.NONE;

export function getYuTuning(): YuTuningState {
  return _state;
}

export function registerYuTuningReapply(fn: () => void): () => void {
  _reapplyCallbacks.add(fn);
  return () => { _reapplyCallbacks.delete(fn); };
}

export function getYuTweakMode(): string { return _tweakMode; }
export function getYuTuningLastHandler(): string { return _lastHandler; }

export function refreshYuTuneHud(scene: any): void {
  const hud = scene?.yuTuneHudText;
  if (!hud) return;
  if (!scene.uiEditModeActive || _yuTuneMetaMode === TweakMetaMode.NONE) {
    hud.setVisible(false);
    return;
  }
  const modeName = _tweakMode.toUpperCase();
  const handler = _lastHandler || "Battle";
  if (_yuTuneMetaMode === TweakMetaMode.EDIT) {
    hud.setText(`EDIT MODE - ${modeName} - ${handler}`);
    hud.setColor("#00FF00");
  } else if (_yuTuneMetaMode === TweakMetaMode.EDIT_TYPE) {
    hud.setText(`EDIT TYPE SELECT - ${modeName}`);
    hud.setColor("#FFD700");
  }
  hud.setVisible(true);
}

export function getYuTuneMetaMode(): TweakMetaMode { return _yuTuneMetaMode; }
export function setYuTuneMetaMode(m: TweakMetaMode): void { _yuTuneMetaMode = m; }

export function yuTuningLog(handler: string, label: string, values: Record<string, number | string | boolean>): void {
  if (!DEBUG_YU_VISUAL_TUNING) return;
  _lastHandler = handler;
  const parts = Object.entries(values).map(([k, v]) => {
    if (typeof v === "number") return `${k}=${v.toFixed(4)}`;
    return `${k}=${v}`;
  });
}

function _resetAll(): void {
  _state.portalScaleOffset = 0;
  _state.creatureScaleOffset = 0;
  _state.yOffset = 0;
  _state.xOffset = 0;
  _state.creatureYOffset = 0;
  _state.enemyPortalScaleOffset = 0;
  _state.enemyCreatureScaleOffset = 0;
  _state.enemyYOffset = 0;
  _state.enemyXOffset = 0;
  _state.enemyCreatureYOffset = 0;
  _state.creatureXOffset = 0;
  _state.enemyCreatureXOffset = 0;
}

function _applyAdjustment(direction: "up" | "down" | "left" | "right"): boolean {
  switch (_tweakMode) {
    case "portalScale":
      if (direction === "up") _state.portalScaleOffset += STEP_SCALE;
      else if (direction === "down") _state.portalScaleOffset -= STEP_SCALE;
      else return false;
      return true;
    case "creatureScale":
      if (direction === "up") _state.creatureScaleOffset += STEP_SCALE;
      else if (direction === "down") _state.creatureScaleOffset -= STEP_SCALE;
      else if (direction === "left") _state.creatureYOffset -= STEP_PX;
      else if (direction === "right") _state.creatureYOffset += STEP_PX;
      return true;
    case "position":
      if (direction === "up") _state.yOffset -= STEP_PX;
      else if (direction === "down") _state.yOffset += STEP_PX;
      else if (direction === "left") _state.xOffset -= STEP_PX;
      else if (direction === "right") _state.xOffset += STEP_PX;
      return true;
  }
  return false;
}

export function initYuVisualTuning(_scene?: any): void {
  if (_initialized || !DEBUG_YU_VISUAL_TUNING) return;
  _initialized = true;
}