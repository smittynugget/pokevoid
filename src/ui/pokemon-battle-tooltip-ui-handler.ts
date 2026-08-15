import BattleScene from "#app/battle-scene";
import UiHandler from "./ui-handler";
import { Mode } from "./mode";
import { Button } from "#enums/buttons";
import type Pokemon from "#app/field/pokemon";
import type { PlayerPokemon } from "#app/field/pokemon";
import { PokemonBattleTooltipUtils, getBattleTooltipTotalViews } from "./pokemon-battle-tooltip-utils";
import type PartyUiHandler from "#app/ui/party-ui-handler";
import { getTextColor } from "#app/ui/text";
import { TweakMetaMode, cycleMetaMode, TWEAK_META_CYCLE, formatMetaHud, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { DEBUG_YU_VISUAL_TUNING } from "#app/overrides";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";
const TWEAK_MODES = ["scale", "position", "width", "height", "alpha", "fontSize", "textStyle"];

const TWEAK_ASSETS_QS = [
  "QS_TypeIcon", "QS_MoveName", "QS_PowAcc", "QS_FieldText",
  "QS_AbilityName", "QS_AbilityDesc", "QS_StatLabel", "QS_StatBar", "QS_StatValue", "QS_StatStage"
];

const TWEAK_ASSETS_IM = [
  "IM_ItemIcon", "IM_TypeIcon", "IM_MoveName", "IM_CategoryIcon", "IM_PowAcc", "IM_MoveEffect"
];

const TWEAK_ASSETS_TM = [
  "TM_PokemonIcon", "TM_PokemonName", "TM_AbilityText", "TM_LevelText",
  "TM_AllStats", "TM_MoveBG", "TM_MoveName", "TM_RankIcon", "TM_RankText"
];

function getAssetsForView(viewIndex: number, isEnemy: boolean = false): string[] {
  if (isEnemy) {
    switch (viewIndex) {
      case 0: return TWEAK_ASSETS_QS;
      case 1: return TWEAK_ASSETS_IM;
      case 2: return TWEAK_ASSETS_QS;
      case 3: return TWEAK_ASSETS_IM;
      case 4: return TWEAK_ASSETS_TM;
      default: return TWEAK_ASSETS_QS;
    }
  }
  switch (viewIndex) {
    case 0: return TWEAK_ASSETS_QS;
    case 1: return TWEAK_ASSETS_IM;
    case 2: return TWEAK_ASSETS_TM;
    default: return TWEAK_ASSETS_QS;
  }
}

function getViewLabel(viewIndex: number, totalViews: number): string {
  if (totalViews <= 4) {
    const labels = ["Quick Summary", "Items & Moves", "Team", "Opponent QS"];
    return labels[viewIndex] || `View ${viewIndex}`;
  }
  const labels = ["Quick Summary", "Items & Moves", "Player QS", "Player IM", "Team"];
  return labels[viewIndex] || `View ${viewIndex}`;
}

interface TweakBaseline {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  displayWidth: number;
  displayHeight: number;
  alpha: number;
  fontSize: number;
  textStyleIndex: number;
}

export default class PokemonBattleTooltipUiHandler extends UiHandler {
  private pokemon: Pokemon | null = null;
  private viewIndex = 0;
  private totalViews = 4;
  private fromHover = false;
  private pinned = false;
  private itemPageIndex = 0;

  private _metaMode: TweakMetaMode = TweakMetaMode.NONE;
  get _tweakActive(): boolean { return this._metaMode !== TweakMetaMode.NONE; }
  private _tweakMode: number = 0;
  private _tweakAssetIndex: number = 0;
  private _tooltipTweakBaselines: Map<string, TweakBaseline> = new Map();
  private _tweakHudText: Phaser.GameObjects.Text | null = null;
  private _tweakKeyOneHandler: (() => void) | null = null;
  private _tweakKeyTwoHandler: (() => void) | null = null;
  private _tweakKeyThreeHandler: (() => void) | null = null;
  private _tweakKeyVHandler: ((event: KeyboardEvent) => void) | null = null;
  private _tweakKeyFourHandler: (() => void) | null = null;
  private _tweakKeyFiveHandler: (() => void) | null = null;
  private _dropdownPanel: TweakDropdownPanel | null = null;
  private _positionOverride: { x: number } | undefined;

  constructor(scene: BattleScene) {
    super(scene, Mode.POKEMON_BATTLE_TOOLTIP);
  }

  setup(): void {}

  override show(args: any[]): boolean {
    super.show(args);
    this.pokemon = args[0] ?? null;
    this.viewIndex = typeof args[1] === "number" ? args[1] : 0;
    this.fromHover = args[2] === true;
    this._positionOverride = args[3] && typeof args[3] === "object" && "x" in args[3] ? args[3] : undefined;
    this.pinned = !this.fromHover;
    this.itemPageIndex = 0;
    if (!this.pokemon) return false;
    this.totalViews = getBattleTooltipTotalViews(this.pokemon);
    this.viewIndex = Math.min(this.viewIndex, this.totalViews - 1);
    PokemonBattleTooltipUtils.ensureEnemyHoverZone(this.scene as BattleScene);
    PokemonBattleTooltipUtils.ensurePlayerHoverZone(this.scene as BattleScene);
    PokemonBattleTooltipUtils.showView(this.scene as BattleScene, this.pokemon, this.viewIndex, true, this._positionOverride);
    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    if (button === Button.CYCLE_GENDER && DEBUG_YU_VISUAL_TUNING) {
      if (this._metaMode === TweakMetaMode.NONE) {
        this._metaMode = TweakMetaMode.EDIT;
        this._tweakAssetIndex = 0;
        this._tweakMode = 0;
        this.captureBaselines();
        this.setupTweakKeyListeners();
        this.ensureTweakHUD();
        this.updateTweakHUD();
        this.createTweakDropdownPanel();
        this.scene.uiEditModeActive = true;
        console.log(`[BTL-TOOLTIP-TWEAK] ACTIVATED — view=${this.viewIndex}`);
      } else {
        this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
        if (this._metaMode === TweakMetaMode.NONE) {
          this.cleanupTweakKeyListeners();
          this._tooltipTweakBaselines.clear();
          this.scene.uiEditModeActive = false;
          console.log(`[BTL-TOOLTIP-TWEAK] DEACTIVATED`);
        }
        this.updateTweakHUD();
      }
      return true;
    }

    if (this._metaMode !== TweakMetaMode.NONE) {
      return this.handleTweakInput(button);
    }

    switch (button) {
      case Button.CANCEL:
      case Button.TOGGLE_FOE_BAR:
        this.clear();
        ui.revertMode();
        ui.playSelect();
        return true;
      case Button.UP:
      case Button.DOWN: {
        const scene = this.scene as BattleScene;
        const party = scene.getParty();
        const currentIdx = party.indexOf(this.pokemon as PlayerPokemon);
        if (currentIdx < 0) return true;
        let newIdx: number;
        if (button === Button.UP) {
          newIdx = currentIdx > 0 ? currentIdx - 1 : party.length - 1;
        } else {
          newIdx = currentIdx < party.length - 1 ? currentIdx + 1 : 0;
        }
        const newPokemon = party[newIdx];
        if (newPokemon) {
          this.pokemon = newPokemon;
          this.totalViews = getBattleTooltipTotalViews(this.pokemon);
          this.viewIndex = Math.min(this.viewIndex, this.totalViews - 1);
          this.itemPageIndex = 0;
          const partyHandler = ui.handlers[Mode.PARTY] as PartyUiHandler;
          if (partyHandler) {
            partyHandler.setCursor(newIdx);
          }
          const posX = newIdx === 0 ? 186 : 4;
          this._positionOverride = { x: posX };
          PokemonBattleTooltipUtils.showView(scene, this.pokemon, this.viewIndex, true, this._positionOverride);
          ui.playSelect();
        }
        return true;
      }
      case Button.LEFT:
        this.pinned = true;
        this.viewIndex = (this.viewIndex + this.totalViews - 1) % this.totalViews;
        this.itemPageIndex = 0;
        if (this.pokemon) {
          PokemonBattleTooltipUtils.showView(this.scene as BattleScene, this.pokemon, this.viewIndex, true, this._positionOverride);
        }
        ui.playSelect();
        return true;
      case Button.RIGHT:
        this.pinned = true;
        this.viewIndex = (this.viewIndex + 1) % this.totalViews;
        this.itemPageIndex = 0;
        if (this.pokemon) {
          PokemonBattleTooltipUtils.showView(this.scene as BattleScene, this.pokemon, this.viewIndex, true, this._positionOverride);
        }
        ui.playSelect();
        return true;
      default:
        return true;
    }
  }

  cycleItemPage(direction: number): void {
    this.pinned = true;
    this.itemPageIndex += direction;
    if (this.itemPageIndex < 0) this.itemPageIndex = 0;
    if (this.pokemon) {
      PokemonBattleTooltipUtils.showView(
        this.scene as BattleScene, this.pokemon, this.viewIndex, true,
        this._positionOverride, { itemPageIndex: this.itemPageIndex }
      );
    }
  }

  private isEnemyTooltip(): boolean {
    return this.pokemon ? !this.pokemon.isPlayer() : false;
  }

  private getStepMultiplier(): number {
    const shiftKey = this.scene.input.keyboard?.addKey("SHIFT");
    return shiftKey && this.scene.input.keyboard?.checkDown(shiftKey, 0) ? 10 : 1;
  }

  private handleTweakInput(button: Button): boolean {
    const assets = getAssetsForView(this.viewIndex, this.isEnemyTooltip());

    if (button === Button.CANCEL) {
      this._metaMode = TweakMetaMode.NONE;
      this.cleanupTweakKeyListeners();
      this._tooltipTweakBaselines.clear();
      this.updateTweakHUD();
      this.scene.uiEditModeActive = false;
      console.log(`[BTL-TOOLTIP-TWEAK] DEACTIVATED via CANCEL`);
      return true;
    }

    if (this._metaMode === TweakMetaMode.EDIT_TYPE) {
      if (button === Button.LEFT) {
        this._tweakMode = (this._tweakMode - 1 + TWEAK_MODES.length) % TWEAK_MODES.length;
        this.updateTweakHUD();
        console.log(`[BTL-TOOLTIP-TWEAK] mode=${TWEAK_MODES[this._tweakMode]}`);
      } else if (button === Button.RIGHT) {
        this._tweakMode = (this._tweakMode + 1) % TWEAK_MODES.length;
        this.updateTweakHUD();
        console.log(`[BTL-TOOLTIP-TWEAK] mode=${TWEAK_MODES[this._tweakMode]}`);
      }
      return true;
    }

    if (this._metaMode === TweakMetaMode.ELEMENT) {
      if (button === Button.LEFT) {
        this._tweakAssetIndex = (this._tweakAssetIndex - 1 + assets.length) % assets.length;
        this.updateTweakHUD();
        console.log(`[BTL-TOOLTIP-TWEAK] asset=${assets[this._tweakAssetIndex]}`);
      } else if (button === Button.RIGHT) {
        this._tweakAssetIndex = (this._tweakAssetIndex + 1) % assets.length;
        this.updateTweakHUD();
        console.log(`[BTL-TOOLTIP-TWEAK] asset=${assets[this._tweakAssetIndex]}`);
      }
      return true;
    }

    const mode = TWEAK_MODES[this._tweakMode];
    const assetName = assets[this._tweakAssetIndex];
    const targets = PokemonBattleTooltipUtils.getTweakTargets(assetName);
    if (!targets || targets.length === 0) {
      console.log(`[BTL-TOOLTIP-TWEAK] no target for asset=${assetName}`);
      return true;
    }

    const mult = this.getStepMultiplier();
    const scaleStep = 0.01 * mult;
    const posStep = 1 * mult;
    const sizeStep = 1 * mult;
    const alphaStep = 0.02 * mult;
    const fontStep = 1 * mult;

    let direction = "";
    switch (button) {
      case Button.UP: direction = "up"; break;
      case Button.DOWN: direction = "down"; break;
      case Button.RIGHT: direction = "right"; break;
      case Button.LEFT: direction = "left"; break;
      default: return true;
    }

    for (const target of targets) {
      this.applyTweakToTarget(target, mode, direction, scaleStep, posStep, sizeStep, alphaStep, fontStep);
    }

    this.logTweakState(assetName, targets[0], `${mode} ${direction}`);
    return true;
  }

  private applyTweakToTarget(target: any, mode: string, direction: string, scaleStep: number, posStep: number, sizeStep: number, alphaStep: number, fontStep: number): void {
    if (direction === "up") {
      if (mode === "scale") target.setScale((target.scaleX ?? 1) + scaleStep);
      else if (mode === "position") target.y -= posStep;
      else if (mode === "width" && typeof target.setDisplaySize === "function") target.setDisplaySize((target.displayWidth ?? 0) + sizeStep, target.displayHeight ?? 0);
      else if (mode === "height" && typeof target.setDisplaySize === "function") target.setDisplaySize(target.displayWidth ?? 0, (target.displayHeight ?? 0) + sizeStep);
      else if (mode === "alpha" && typeof target.setAlpha === "function") target.setAlpha(Math.min(1.0, (target.alpha ?? 1.0) + alphaStep));
      else if (mode === "fontSize" && typeof target.setFontSize === "function") {
        const currentSize = parseInt(target.style?.fontSize || "16", 10);
        target.setFontSize(currentSize + fontStep);
      }
    } else if (direction === "down") {
      if (mode === "scale") target.setScale(Math.max(0.01, (target.scaleX ?? 1) - scaleStep));
      else if (mode === "position") target.y += posStep;
      else if (mode === "width" && typeof target.setDisplaySize === "function") target.setDisplaySize(Math.max(1, (target.displayWidth ?? 0) - sizeStep), target.displayHeight ?? 0);
      else if (mode === "height" && typeof target.setDisplaySize === "function") target.setDisplaySize(target.displayWidth ?? 0, Math.max(1, (target.displayHeight ?? 0) - sizeStep));
      else if (mode === "alpha" && typeof target.setAlpha === "function") target.setAlpha(Math.max(0.0, (target.alpha ?? 1.0) - alphaStep));
      else if (mode === "fontSize" && typeof target.setFontSize === "function") {
        const currentSize = parseInt(target.style?.fontSize || "16", 10);
        target.setFontSize(Math.max(4, currentSize - fontStep));
      }
    } else if (mode === "textStyle" && typeof target.setColor === "function") {
      const TEXT_STYLE_COUNT = 34;
      let idx = target.__tweakTextStyleIndex ?? 1;
      if (direction === "up") idx = (idx + 1) % TEXT_STYLE_COUNT;
      else if (direction === "down") idx = (idx - 1 + TEXT_STYLE_COUNT) % TEXT_STYLE_COUNT;
      else return;
      target.__tweakTextStyleIndex = idx;
      const uiTheme = (this.scene as BattleScene).uiTheme;
      target.setColor(getTextColor(idx, false, uiTheme));
      target.setShadowColor(getTextColor(idx, true, uiTheme));
    } else if (direction === "right" && mode === "position") {
      target.x += posStep;
    } else if (direction === "left" && mode === "position") {
      target.x -= posStep;
    }
  }

  private captureBaselines(): void {
    this._tooltipTweakBaselines.clear();
    const assets = getAssetsForView(this.viewIndex, this.isEnemyTooltip());
    for (const name of assets) {
      const targets = PokemonBattleTooltipUtils.getTweakTargets(name);
      if (targets && targets.length > 0) {
        const t = targets[0];
        this._tooltipTweakBaselines.set(name, {
          x: (t as any).x ?? 0,
          y: (t as any).y ?? 0,
          scaleX: (t as any).scaleX ?? 1,
          scaleY: (t as any).scaleY ?? 1,
          displayWidth: (t as any).displayWidth ?? 0,
          displayHeight: (t as any).displayHeight ?? 0,
          alpha: (t as any).alpha ?? 1,
          fontSize: parseInt((t as any).style?.fontSize || "0", 10),
          textStyleIndex: (t as any).__tweakTextStyleIndex ?? 1,
        });
      }
    }
  }

  private logTweakState(assetName: string, target: any, action: string): void {
    const x = target.x ?? 0;
    const y = target.y ?? 0;
    const sx = target.scaleX ?? 1;
    const sy = target.scaleY ?? 1;
    const dw = target.displayWidth ?? 0;
    const dh = target.displayHeight ?? 0;
    const a = target.alpha ?? 1;
    const fs = parseInt(target.style?.fontSize || "0", 10);
    const ts = target.__tweakTextStyleIndex ?? -1;
    const baseline = this._tooltipTweakBaselines.get(assetName);
    if (baseline) {
      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dsx = sx - baseline.scaleX;
      const dsy = sy - baseline.scaleY;
      const ddw = dw - baseline.displayWidth;
      const ddh = dh - baseline.displayHeight;
      const da = a - baseline.alpha;
      const dfs = fs - baseline.fontSize;
      const dts = ts >= 0 ? ts - baseline.textStyleIndex : 0;
      const fsStr = fs > 0 ? ` fs=${fs}` : "";
      const dfsStr = fs > 0 ? ` Δfs=${dfs >= 0 ? "+" : ""}${dfs}` : "";
      const tsStr = ts >= 0 ? ` ts=${ts}` : "";
      const dtsStr = ts >= 0 ? ` Δts=${dts >= 0 ? "+" : ""}${dts}` : "";
      console.log(`[BTL-TOOLTIP-TWEAK] ${action} | asset=${assetName}\n  current: x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${tsStr}\n  delta:   Δx=${dx >= 0 ? "+" : ""}${dx} Δy=${dy >= 0 ? "+" : ""}${dy} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfsStr}${dtsStr}`);
    } else {
      const fsStr = fs > 0 ? ` fontSize=${fs}` : "";
      const tsStr = ts >= 0 ? ` ts=${ts}` : "";
      console.log(`[BTL-TOOLTIP-TWEAK] ${action} | asset=${assetName} | x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} width=${dw.toFixed(1)} height=${dh.toFixed(1)} alpha=${a.toFixed(2)}${fsStr}${tsStr}`);
    }
  }

  private outputAllTweakStates(): void {
    const assets = getAssetsForView(this.viewIndex, this.isEnemyTooltip());
    const changed: string[] = [];
    const unchanged: string[] = [];
    const unavailable: string[] = [];

    for (const name of assets) {
      const targets = PokemonBattleTooltipUtils.getTweakTargets(name);
      if (!targets || targets.length === 0) {
        unavailable.push(`${name} [no live target]`);
        continue;
      }
      const t = targets[0];
      const x = (t as any).x ?? 0;
      const y = (t as any).y ?? 0;
      const sx = (t as any).scaleX ?? 1;
      const sy = (t as any).scaleY ?? 1;
      const dw = (t as any).displayWidth ?? 0;
      const dh = (t as any).displayHeight ?? 0;
      const a = (t as any).alpha ?? 1;
      const fs = parseInt((t as any).style?.fontSize || "0", 10);
      const ts = (t as any).__tweakTextStyleIndex ?? -1;
      const fsStr = fs > 0 ? ` fs=${fs}` : "";
      const tsStr = ts >= 0 ? ` ts=${ts}` : "";
      const baseline = this._tooltipTweakBaselines.get(name);
      if (baseline) {
        const dx = x - baseline.x;
        const dy = y - baseline.y;
        const dsx = sx - baseline.scaleX;
        const dsy = sy - baseline.scaleY;
        const ddw = dw - baseline.displayWidth;
        const ddh = dh - baseline.displayHeight;
        const da = a - baseline.alpha;
        const dfs = fs - baseline.fontSize;
        const dts = ts >= 0 ? ts - baseline.textStyleIndex : 0;
        const hasDelta = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001 || Math.abs(ddw) > 0.5 || Math.abs(ddh) > 0.5 || Math.abs(da) > 0.001 || Math.abs(dfs) > 0 || Math.abs(dts) > 0;
        const dfsStr = fs > 0 ? ` Δfs=${dfs >= 0 ? "+" : ""}${dfs}` : "";
        const dtsStr = ts >= 0 ? ` Δts=${dts >= 0 ? "+" : ""}${dts}` : "";
        const bfsStr = baseline.fontSize > 0 ? ` fs=${baseline.fontSize}` : "";
        const btsStr = baseline.textStyleIndex >= 0 ? ` ts=${baseline.textStyleIndex}` : "";
        if (hasDelta) {
          changed.push(`${name}:\n  ORIGINAL: x=${baseline.x} y=${baseline.y} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} w=${baseline.displayWidth.toFixed(1)} h=${baseline.displayHeight.toFixed(1)} α=${baseline.alpha.toFixed(2)}${bfsStr}${btsStr}\n  CHANGE:   Δx=${dx >= 0 ? "+" : ""}${dx} Δy=${dy >= 0 ? "+" : ""}${dy} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfsStr}${dtsStr}\n  APPLIED:  x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${tsStr}`);
        } else {
          unchanged.push(`${name}:\n  ORIGINAL: x=${baseline.x} y=${baseline.y} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} w=${baseline.displayWidth.toFixed(1)} h=${baseline.displayHeight.toFixed(1)} α=${baseline.alpha.toFixed(2)}${bfsStr}${btsStr} [no changes]`);
        }
      } else {
        unchanged.push(`${name}:\n  ORIGINAL: x=${x} y=${y} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} w=${dw.toFixed(1)} h=${dh.toFixed(1)} α=${a.toFixed(2)}${fsStr}${tsStr} [no baseline captured]`);
      }
    }

    const sections: string[] = [
      `[BTL-TOOLTIP-TWEAK-SNAPSHOT] view=${this.viewIndex}`,
      "NOTE: CHANGE values are deltas for code adjustments."
    ];
    if (changed.length > 0) { sections.push("\n── CHANGED ──"); sections.push(changed.join("\n\n")); }
    if (unchanged.length > 0) { sections.push("\n── UNCHANGED ──"); sections.push(unchanged.join("\n\n")); }
    if (unavailable.length > 0) { sections.push("\n── UNAVAILABLE ──"); sections.push(unavailable.join("\n")); }
    const output = sections.join("\n");
    console.log(output);
    tweakCopyToClipboard(output);
  }

  private ensureTweakHUD(): void {
    if (this._tweakHudText) return;
    const scene = this.scene as BattleScene;
    this._tweakHudText = scene.add.text(2, 2, "", { fontSize: "12px", color: "#00FF00", fontFamily: "monospace" });
    this._tweakHudText.setDepth(9999);
    (scene as any).uiContainer.add(this._tweakHudText);
  }

  private updateTweakHUD(): void {
    if (!this._tweakHudText) return;
    if (this._metaMode === TweakMetaMode.NONE) {
      this._tweakHudText.setVisible(false);
      return;
    }
    const assets = getAssetsForView(this.viewIndex, this.isEnemyTooltip());
    const modeName = TWEAK_MODES[this._tweakMode].toUpperCase();
    const assetName = assets[this._tweakAssetIndex] || "???";
    const { text, color } = formatMetaHud(this._metaMode, modeName, assetName);
    this._tweakHudText.setText(text);
    this._tweakHudText.setColor(color);
    this._tweakHudText.setVisible(true);
  }

  private setupTweakKeyListeners(): void {
    this._tweakKeyOneHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
      if (this._metaMode === TweakMetaMode.NONE) {
        this.cleanupTweakKeyListeners();
        this._tooltipTweakBaselines.clear();
        this.scene.uiEditModeActive = false;
      }
      this.updateTweakHUD();
      console.log(`[BTL-TOOLTIP-TWEAK] meta mode ${TweakMetaMode[this._metaMode]}`);
    };
    this._tweakKeyTwoHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      const assets = getAssetsForView(this.viewIndex, this.isEnemyTooltip());
      this._tweakAssetIndex = (this._tweakAssetIndex + 1) % assets.length;
      this.updateTweakHUD();
      console.log(`[BTL-TOOLTIP-TWEAK] asset=${assets[this._tweakAssetIndex]}`);
    };
    this._tweakKeyThreeHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      const assets = getAssetsForView(this.viewIndex, this.isEnemyTooltip());
      this._tweakAssetIndex = (this._tweakAssetIndex - 1 + assets.length) % assets.length;
      this.updateTweakHUD();
      console.log(`[BTL-TOOLTIP-TWEAK] asset=${assets[this._tweakAssetIndex]}`);
    };
    this._tweakKeyVHandler = (event: KeyboardEvent) => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      event.stopPropagation();
      event.preventDefault();
      this.outputAllTweakStates();
    };
    this._tweakKeyFourHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      this.viewIndex = (this.viewIndex + 1) % this.totalViews;
      this._tweakAssetIndex = 0;
      this.captureBaselines();
      if (this.pokemon) {
        PokemonBattleTooltipUtils.showView(this.scene as BattleScene, this.pokemon, this.viewIndex);
      }
      this.rebuildElementSelect();
      this._dropdownPanel?.syncViewValue(String(this.viewIndex));
      this.updateTweakHUD();
      this._dropdownPanel?.layout();
      console.log(`[BTL-TOOLTIP-TWEAK] switched to view=${this.viewIndex} (${getViewLabel(this.viewIndex, this.totalViews)})`);
    };
    this._tweakKeyFiveHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this.scene.uiEditModeActive) return;
      this.toggleDropdownPanel();
    };
    this.scene.input.keyboard?.on("keydown-ONE", this._tweakKeyOneHandler);
    this.scene.input.keyboard?.on("keydown-TWO", this._tweakKeyTwoHandler);
    this.scene.input.keyboard?.on("keydown-THREE", this._tweakKeyThreeHandler);
    this.scene.input.keyboard?.on("keydown-V", this._tweakKeyVHandler);
    this.scene.input.keyboard?.on("keydown-FOUR", this._tweakKeyFourHandler);
    this.scene.input.keyboard?.on("keydown-FIVE", this._tweakKeyFiveHandler);
  }

  private cleanupTweakKeyListeners(): void {
    if (this._tweakKeyOneHandler) {
      this.scene.input.keyboard?.off("keydown-ONE", this._tweakKeyOneHandler);
      this._tweakKeyOneHandler = null;
    }
    if (this._tweakKeyTwoHandler) {
      this.scene.input.keyboard?.off("keydown-TWO", this._tweakKeyTwoHandler);
      this._tweakKeyTwoHandler = null;
    }
    if (this._tweakKeyThreeHandler) {
      this.scene.input.keyboard?.off("keydown-THREE", this._tweakKeyThreeHandler);
      this._tweakKeyThreeHandler = null;
    }
    if (this._tweakKeyVHandler) {
      this.scene.input.keyboard?.off("keydown-V", this._tweakKeyVHandler);
      this._tweakKeyVHandler = null;
    }
    if (this._tweakKeyFourHandler) {
      this.scene.input.keyboard?.off("keydown-FOUR", this._tweakKeyFourHandler);
      this._tweakKeyFourHandler = null;
    }
    if (this._tweakKeyFiveHandler) {
      this.scene.input.keyboard?.off("keydown-FIVE", this._tweakKeyFiveHandler);
      this._tweakKeyFiveHandler = null;
    }
    this.destroyTweakPanel();
  }

  private rebuildElementSelect(): void {
    const assets = getAssetsForView(this.viewIndex, this.isEnemyTooltip());
    this._dropdownPanel?.rebuildElements(assets);
    this._dropdownPanel?.syncElementValue(assets[this._tweakAssetIndex] || "");
  }

  private createTweakDropdownPanel(): void {
    if (this._dropdownPanel) return;
    const scene = this.scene as BattleScene;
    const viewOpts: { value: string; label: string }[] = [];
    for (let i = 0; i < this.totalViews; i++) {
      viewOpts.push({ value: String(i), label: getViewLabel(i, this.totalViews) });
    }
    this._dropdownPanel = new TweakDropdownPanel({
      scene,
      coordSpace: "logical",
      getAnchorGameCoords: () => {
        const pos = PokemonBattleTooltipUtils.getTooltipPosition();
        if (!pos) return null;
        const canvas = scene.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        const selectWidthLogical = (100 * canvas.width) / (canvasRect.width * 6);
        let anchorX = pos.x - selectWidthLogical - 2;
        if (anchorX < 0) {
          anchorX = pos.x + (pos.width || 0) + 2;
        }
        return { x: anchorX, y: pos.y };
      },
      views: viewOpts,
      elements: getAssetsForView(this.viewIndex, this.isEnemyTooltip()),
      modes: TWEAK_MODES,
      onViewChange: (viewIndex) => {
        if (viewIndex === this.viewIndex) return;
        this.viewIndex = viewIndex;
        this._tweakAssetIndex = 0;
        if (this.pokemon) PokemonBattleTooltipUtils.showView(scene, this.pokemon, this.viewIndex);
        this.captureBaselines();
        this.rebuildElementSelect();
        this.updateTweakHUD();
        this._dropdownPanel?.layout();
      },
      onElementChange: (name, _idx) => {
        const assets = getAssetsForView(this.viewIndex, this.isEnemyTooltip());
        const realIdx = assets.indexOf(name);
        if (realIdx >= 0) this._tweakAssetIndex = realIdx;
        this.updateTweakHUD();
      },
      onModeChange: (_name, idx) => {
        this._tweakMode = idx;
        this.updateTweakHUD();
      },
    });
    this._dropdownPanel.create();
    this._dropdownPanel.syncViewValue(String(this.viewIndex));
  }

  private layoutTweakDropdowns(): void {
    this._dropdownPanel?.layout();
  }

  private toggleDropdownPanel(): void {
    this._dropdownPanel?.toggle();
  }

  private destroyTweakPanel(): void {
    this._dropdownPanel?.destroy();
    this._dropdownPanel = null;
  }

  getViewIndex(): number {
    return this.viewIndex;
  }

  isPinned(): boolean {
    return this.pinned;
  }

  override clear(): void {
    if (this._metaMode !== TweakMetaMode.NONE) {
      this._metaMode = TweakMetaMode.NONE;
      this.cleanupTweakKeyListeners();
      this._tooltipTweakBaselines.clear();
    }
    if (this.scene.uiEditModeActive) {
      this.scene.uiEditModeActive = false;
    }
    this.destroyTweakPanel();
    if (this._tweakHudText) {
      this._tweakHudText.setVisible(false);
    }
    PokemonBattleTooltipUtils.hide();
    this.pokemon = null;
    this.viewIndex = 0;
    this.fromHover = false;
    this.pinned = false;
    super.clear();
  }
}