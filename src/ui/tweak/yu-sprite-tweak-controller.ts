import BattleScene from "../../battle-scene";
import { Button } from "#app/enums/buttons";
import { TweakMetaMode, TWEAK_META_CYCLE, cycleMetaMode, formatMetaHud, tweakCopyToClipboard } from "./tweak-meta-types";
import { TweakDropdownPanel } from "./tweak-dropdown-panel";

export interface TweakOffsets {
    portalScaleOffset: number;
    creatureScaleOffset: number;
    yOffset: number;
    xOffset: number;
    creatureYOffset: number;
    creatureXOffset: number;
}

export interface TweakSideOffsets {
    player: TweakOffsets;
    enemy: TweakOffsets;
}

export interface TweakBaseValues {
    portalScale: number;
    creatureScale: number;
    portalX: number;
    portalY: number;
    creatureX: number;
    creatureY: number;
}

export interface TweakControllerConfig {
    scene: BattleScene;
    logTag: string;
    modes: string[];
    assets: string[];
    hudTextObject: Phaser.GameObjects.Text | null;
    applyOffsets: (offsets: TweakOffsets) => void;
    applySideOffsets?: (offsets: TweakSideOffsets) => void;
    onHydrate?: () => TweakSideOffsets | null;
    getBaseValues?: () => TweakBaseValues | null;
    onRectAdjust?: (ctx: { assetName: string; modeName: string; button: Button; delta: number }) => void;
    onRectSnapshot?: (assetName: string) => void;
    onRectReset?: (assetName: string) => void;
    onIconSnapshot?: (assetName: string) => void;
    onAssetChanged?: (assetName: string) => void;
    stepPx?: number;
    stepScale?: number;
    getDropdownAnchor?: () => { x: number; y: number } | null;
    dropdownCoordSpace?: "canvas" | "logical" | "screen";
}

const DEFAULT_STEP_PX = 0.5;
const DEFAULT_STEP_SCALE = 0.005;

const ZERO_OFFSETS: TweakOffsets = { portalScaleOffset: 0, creatureScaleOffset: 0, yOffset: 0, xOffset: 0, creatureYOffset: 0, creatureXOffset: 0 };

export class YuSpriteTweakController {
    private _metaMode: TweakMetaMode = TweakMetaMode.NONE;
    private _tweakMode: number = 0;
    private _tweakAssetIndex: number = 0;
    private _offsets: TweakOffsets = { ...ZERO_OFFSETS };
    private _enemyOffsets: TweakOffsets = { ...ZERO_OFFSETS };
    private _config: TweakControllerConfig;
    private _stepPx: number;
    private _stepScale: number;
    private _keyOneHandler: (() => void) | null = null;
    private _keyTwoHandler: (() => void) | null = null;
    private _keyThreeHandler: (() => void) | null = null;
    private _keyVHandler: (() => void) | null = null;
    private _keyRHandler: (() => void) | null = null;
    private _keyFiveHandler: (() => void) | null = null;
    private _dropdownPanel: TweakDropdownPanel | null = null;

    get tweakActive(): boolean { return this._metaMode !== TweakMetaMode.NONE; }
    get metaMode(): TweakMetaMode { return this._metaMode; }
    get offsets(): TweakOffsets { return this._offsets; }

    constructor(config: TweakControllerConfig) {
        this._config = config;
        this._stepPx = config.stepPx ?? DEFAULT_STEP_PX;
        this._stepScale = config.stepScale ?? DEFAULT_STEP_SCALE;
    }

    private _isEnemyAsset(assetName: string): boolean {
        return assetName.toLowerCase().startsWith("enemy");
    }

    private _isRectAsset(assetName: string): boolean {
        return assetName.toLowerCase().includes("hoverbox");
    }

    private _isIconAsset(assetName: string): boolean {
        return assetName.startsWith("P_") || assetName.startsWith("E_");
    }

    private _activeBank(): TweakOffsets {
        const assetName = this._config.assets[this._tweakAssetIndex];
        return this._isEnemyAsset(assetName) ? this._enemyOffsets : this._offsets;
    }

    private _dispatchOffsets(): void {
        if (this._config.applySideOffsets) {
            this._config.applySideOffsets({ player: this._offsets, enemy: this._enemyOffsets });
        } else {
            this._config.applyOffsets(this._offsets);
        }
    }

    onCycleAbility(): boolean {
        const wasActive = this._metaMode !== TweakMetaMode.NONE;
        this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
        const isActive = this._metaMode !== TweakMetaMode.NONE;
        this.updateHUD();
        if (isActive && !wasActive) {
            if (this._config.onHydrate) {
                const hydrated = this._config.onHydrate();
                if (hydrated) {
                    this._offsets = { ...hydrated.player };
                    this._enemyOffsets = { ...hydrated.enemy };
                }
            }
            this._dispatchOffsets();
            this.setupKeyListeners();
            if (this._config.getDropdownAnchor) {
                this._dropdownPanel = new TweakDropdownPanel({
                    scene: this._config.scene,
                    coordSpace: this._config.dropdownCoordSpace,
                    getAnchorGameCoords: this._config.getDropdownAnchor,
                    elements: this._config.assets,
                    modes: this._config.modes,
                    onElementChange: (_name, idx) => {
                        this._tweakAssetIndex = idx;
                        this.updateHUD();
                        if (this._config.onAssetChanged) this._config.onAssetChanged(this._config.assets[idx]);
                    },
                    onModeChange: (_name, idx) => {
                        this._tweakMode = idx;
                        this.updateHUD();
                    },
                });
                this._dropdownPanel.create();
            }
        } else if (!isActive && wasActive) {
            this.cleanupKeyListeners();
            this._dropdownPanel?.destroy();
            this._dropdownPanel = null;
            this._config.scene.refreshUiEditModeActive();
        }
        console.log(`[${this._config.logTag}] meta mode ${TweakMetaMode[this._metaMode]}`);
        return true;
    }

    processInput(button: Button): boolean {
        if (button === Button.CANCEL) {
            this._metaMode = TweakMetaMode.NONE;
            this.cleanupKeyListeners();
            this.updateHUD();
            this._config.scene.refreshUiEditModeActive();
            console.log(`[${this._config.logTag}] meta mode ${TweakMetaMode[this._metaMode]}`);
            return true;
        }
        if (button === Button.SUBMIT) {
            if (this._metaMode === TweakMetaMode.EDIT_TYPE || this._metaMode === TweakMetaMode.ELEMENT) {
                this._metaMode = TweakMetaMode.EDIT;
                this.updateHUD();
                console.log(`[${this._config.logTag}] meta mode ${TweakMetaMode[this._metaMode]}`);
            }
            return true;
        }

        if (this._metaMode === TweakMetaMode.EDIT_TYPE) {
            if (button === Button.LEFT) {
                this._tweakMode = (this._tweakMode - 1 + this._config.modes.length) % this._config.modes.length;
                this.updateHUD();
                this._dropdownPanel?.syncModeValue(this._config.modes[this._tweakMode]);
                console.log(`[${this._config.logTag}] mode=${this._config.modes[this._tweakMode]}`);
            } else if (button === Button.RIGHT) {
                this._tweakMode = (this._tweakMode + 1) % this._config.modes.length;
                this.updateHUD();
                this._dropdownPanel?.syncModeValue(this._config.modes[this._tweakMode]);
                console.log(`[${this._config.logTag}] mode=${this._config.modes[this._tweakMode]}`);
            }
            return true;
        }

        if (this._metaMode === TweakMetaMode.ELEMENT) {
            if (button === Button.LEFT) {
                this._tweakAssetIndex = (this._tweakAssetIndex - 1 + this._config.assets.length) % this._config.assets.length;
                this.updateHUD();
                this._dropdownPanel?.syncElementValue(this._config.assets[this._tweakAssetIndex]);
                if (this._config.onAssetChanged) this._config.onAssetChanged(this._config.assets[this._tweakAssetIndex]);
                console.log(`[${this._config.logTag}] asset=${this._config.assets[this._tweakAssetIndex]}`);
            } else if (button === Button.RIGHT) {
                this._tweakAssetIndex = (this._tweakAssetIndex + 1) % this._config.assets.length;
                this.updateHUD();
                this._dropdownPanel?.syncElementValue(this._config.assets[this._tweakAssetIndex]);
                if (this._config.onAssetChanged) this._config.onAssetChanged(this._config.assets[this._tweakAssetIndex]);
                console.log(`[${this._config.logTag}] asset=${this._config.assets[this._tweakAssetIndex]}`);
            }
            return true;
        }

        if (this._metaMode === TweakMetaMode.EDIT) {
            const modeName = this._config.modes[this._tweakMode];
            const assetName = this._config.assets[this._tweakAssetIndex];

            if (this._isRectAsset(assetName) || this._isIconAsset(assetName)) {
                const step = modeName.toLowerCase().includes("scale") ? this._stepScale : this._stepPx;
                let delta = 0;
                if (button === Button.LEFT) delta = -step;
                else if (button === Button.RIGHT) delta = step;
                else if (button === Button.UP) delta = -step;
                else if (button === Button.DOWN) delta = step;
                if (delta !== 0 && this._config.onRectAdjust) {
                    this._config.onRectAdjust({ assetName, modeName, button, delta });
                }
                this.updateHUD();
                return true;
            }

            const isPortal = assetName.toLowerCase().includes("portal");
            const isBoth = assetName.toLowerCase().includes("both");
            const bank = this._activeBank();
            const step = modeName.toLowerCase().includes("scale") ? this._stepScale : this._stepPx;

            let delta = 0;
            if (button === Button.LEFT) delta = -step;
            else if (button === Button.RIGHT) delta = step;
            else if (button === Button.UP) delta = -step;
            else if (button === Button.DOWN) delta = step;

            if (delta !== 0) {
                if (modeName === "scale") {
                    if (isBoth) {
                        bank.portalScaleOffset += delta;
                        bank.creatureScaleOffset += delta;
                    } else if (isPortal) {
                        bank.portalScaleOffset += delta;
                    } else {
                        bank.creatureScaleOffset += delta;
                    }
                } else if (modeName === "portalScale") {
                    bank.portalScaleOffset += delta;
                } else if (modeName === "creatureScale") {
                    bank.creatureScaleOffset += delta;
                } else if (modeName === "position") {
                    if (button === Button.LEFT || button === Button.RIGHT) {
                        if (isBoth) {
                            bank.xOffset += delta;
                            bank.creatureXOffset += delta;
                        } else if (isPortal) {
                            bank.xOffset += delta;
                        } else {
                            bank.creatureXOffset += delta;
                        }
                    } else {
                        if (isBoth) {
                            bank.yOffset += delta;
                            bank.creatureYOffset += delta;
                        } else if (isPortal) {
                            bank.yOffset += delta;
                        } else {
                            bank.creatureYOffset += delta;
                        }
                    }
                }
                this._dispatchOffsets();
                this.updateHUD();
            }
            return true;
        }

        return true;
    }

    setupKeyListeners(): void {
        this._keyOneHandler = () => {
            if (this._metaMode === TweakMetaMode.NONE) return;
            if (!this._config.scene.uiEditModeActive) return;
            this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
            if (this._metaMode === TweakMetaMode.NONE) {
                this.cleanupKeyListeners();
                this._config.scene.refreshUiEditModeActive();
            }
            this.updateHUD();
            console.log(`[${this._config.logTag}] meta mode ${TweakMetaMode[this._metaMode]}`);
        };
        this._keyTwoHandler = () => {
            if (this._metaMode === TweakMetaMode.NONE) return;
            if (!this._config.scene.uiEditModeActive) return;
            this._tweakAssetIndex = (this._tweakAssetIndex + 1) % this._config.assets.length;
            this.updateHUD();
            this._dropdownPanel?.syncElementValue(this._config.assets[this._tweakAssetIndex]);
            if (this._config.onAssetChanged) this._config.onAssetChanged(this._config.assets[this._tweakAssetIndex]);
            console.log(`[${this._config.logTag}] asset=${this._config.assets[this._tweakAssetIndex]}`);
        };
        this._keyThreeHandler = () => {
            if (this._metaMode === TweakMetaMode.NONE) return;
            if (!this._config.scene.uiEditModeActive) return;
            this._tweakAssetIndex = (this._tweakAssetIndex - 1 + this._config.assets.length) % this._config.assets.length;
            this.updateHUD();
            this._dropdownPanel?.syncElementValue(this._config.assets[this._tweakAssetIndex]);
            if (this._config.onAssetChanged) this._config.onAssetChanged(this._config.assets[this._tweakAssetIndex]);
            console.log(`[${this._config.logTag}] asset=${this._config.assets[this._tweakAssetIndex]}`);
        };
        this._keyVHandler = () => {
            if (this._metaMode === TweakMetaMode.NONE) return;
            if (!this._config.scene.uiEditModeActive) return;
            const assetName = this._config.assets[this._tweakAssetIndex];
            if (this._isRectAsset(assetName)) {
                if (this._config.onRectSnapshot) this._config.onRectSnapshot(assetName);
                return;
            }
            if (this._isIconAsset(assetName)) {
                if (this._config.onIconSnapshot) this._config.onIconSnapshot(assetName);
                return;
            }
            const o = this._activeBank();
            const side = this._isEnemyAsset(assetName) ? "ENEMY" : "PLAYER";
            const base = this._config.getBaseValues?.() ?? null;
            const fmt = (n: number) => Math.round(n * 1000) / 1000;
            const fmtD = (n: number) => (n >= 0 ? "+" : "") + fmt(n);
            let origLine: string;
            let appliedLine: string;
            if (base) {
                origLine = `  ORIGINAL: portalScale=${fmt(base.portalScale)} creatureScale=${fmt(base.creatureScale)} portalY=${fmt(base.portalY)} portalX=${fmt(base.portalX)} creatureY=${fmt(base.creatureY)} creatureX=${fmt(base.creatureX)}`;
                appliedLine = `  APPLIED:  portalScale=${fmt(base.portalScale + o.portalScaleOffset)} creatureScale=${fmt(base.creatureScale + o.creatureScaleOffset)} portalY=${fmt(base.portalY + o.yOffset)} portalX=${fmt(base.portalX + o.xOffset)} creatureY=${fmt(base.creatureY + o.creatureYOffset)} creatureX=${fmt(base.creatureX + o.creatureXOffset)}`;
            } else {
                origLine = `  ORIGINAL: (base values unavailable)`;
                appliedLine = `  APPLIED:  portalScale=${fmt(o.portalScaleOffset)} creatureScale=${fmt(o.creatureScaleOffset)} portalY=${fmt(o.yOffset)} portalX=${fmt(o.xOffset)} creatureY=${fmt(o.creatureYOffset)} creatureX=${fmt(o.creatureXOffset)}`;
            }
            const lines = [
                `[${this._config.logTag}] SNAPSHOT (${side})`,
                "NOTE: CHANGE values are deltas for code adjustments.",
                "",
                origLine,
                `  CHANGE:   Δportal=${fmtD(o.portalScaleOffset)} Δcreature=${fmtD(o.creatureScaleOffset)} Δy=${fmtD(o.yOffset)} Δx=${fmtD(o.xOffset)} ΔcreatureY=${fmtD(o.creatureYOffset)} ΔcreatureX=${fmtD(o.creatureXOffset)}`,
                appliedLine,
            ];
            const output = lines.join("\n");
            console.log(output);
            tweakCopyToClipboard(output);
        };
        this._keyRHandler = () => {
            if (this._metaMode === TweakMetaMode.NONE) return;
            if (!this._config.scene.uiEditModeActive) return;
            const assetName = this._config.assets[this._tweakAssetIndex];
            if (this._isRectAsset(assetName)) {
                if (this._config.onRectReset) this._config.onRectReset(assetName);
                this.updateHUD();
                return;
            }
            if (this._isEnemyAsset(assetName)) {
                this._enemyOffsets = { ...ZERO_OFFSETS };
            } else {
                this._offsets = { ...ZERO_OFFSETS };
            }
            this._dispatchOffsets();
            this.updateHUD();
            const side = this._isEnemyAsset(assetName) ? "ENEMY" : "PLAYER";
            console.log(`[${this._config.logTag}] RESET (${side})`);
        };
        this._keyFiveHandler = () => {
            if (this._metaMode === TweakMetaMode.NONE) return;
            if (!this._config.scene.uiEditModeActive) return;
            this._dropdownPanel?.toggle();
        };
        this._config.scene.input.keyboard?.on("keydown-ONE", this._keyOneHandler);
        this._config.scene.input.keyboard?.on("keydown-TWO", this._keyTwoHandler);
        this._config.scene.input.keyboard?.on("keydown-THREE", this._keyThreeHandler);
        this._config.scene.input.keyboard?.on("keydown-V", this._keyVHandler);
        this._config.scene.input.keyboard?.on("keydown-R", this._keyRHandler);
        this._config.scene.input.keyboard?.on("keydown-FIVE", this._keyFiveHandler);
    }

    cleanupKeyListeners(): void {
        if (this._keyOneHandler) { this._config.scene.input.keyboard?.off("keydown-ONE", this._keyOneHandler); this._keyOneHandler = null; }
        if (this._keyTwoHandler) { this._config.scene.input.keyboard?.off("keydown-TWO", this._keyTwoHandler); this._keyTwoHandler = null; }
        if (this._keyThreeHandler) { this._config.scene.input.keyboard?.off("keydown-THREE", this._keyThreeHandler); this._keyThreeHandler = null; }
        if (this._keyVHandler) { this._config.scene.input.keyboard?.off("keydown-V", this._keyVHandler); this._keyVHandler = null; }
        if (this._keyRHandler) { this._config.scene.input.keyboard?.off("keydown-R", this._keyRHandler); this._keyRHandler = null; }
        if (this._keyFiveHandler) { this._config.scene.input.keyboard?.off("keydown-FIVE", this._keyFiveHandler); this._keyFiveHandler = null; }
        this._dropdownPanel?.destroy();
        this._dropdownPanel = null;
    }

    updateHUD(): void {
        if (!this._config.hudTextObject) return;
        if (this._metaMode === TweakMetaMode.NONE) {
            this._config.hudTextObject.setVisible(false);
            return;
        }
        const modeName = this._config.modes[this._tweakMode].toUpperCase();
        const assetName = this._config.assets[this._tweakAssetIndex];
        const { text, color } = formatMetaHud(this._metaMode, modeName, assetName);
        this._config.hudTextObject.setText(text);
        this._config.hudTextObject.setColor(color);
        this._config.hudTextObject.setVisible(true);
        const parent = this._config.hudTextObject.parentContainer;
        if (parent) {
            parent.bringToTop(this._config.hudTextObject);
        }
    }

    deactivate(): void {
        const wasActive = this._metaMode !== TweakMetaMode.NONE;
        this._metaMode = TweakMetaMode.NONE;
        this.cleanupKeyListeners();
        this._dropdownPanel?.destroy();
        this._dropdownPanel = null;
        if (this._config.hudTextObject) {
            this._config.hudTextObject.setVisible(false);
        }
        if (wasActive) {
            this._config.scene.refreshUiEditModeActive();
        }
    }

    resetOffsets(): void {
        this._offsets = { ...ZERO_OFFSETS };
        this._enemyOffsets = { ...ZERO_OFFSETS };
        this._tweakMode = 0;
        this._tweakAssetIndex = 0;
    }

    clear(): void {
        this.deactivate();
    }
}