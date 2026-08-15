import BattleScene from "#app/battle-scene.js";
import UiHandler from "./ui-handler";
import { Mode } from "./mode";
import { Button } from "../enums/buttons";
import { SlideshowCutscenePhase } from "#app/phases/slideshow-cutscene-phase.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";

export default class SlideshowCutsceneUiHandler extends UiHandler {
  private holdText: Phaser.GameObjects.Text | null = null;
  private holdGaugeBg: Phaser.GameObjects.Rectangle | null = null;
  private holdGaugeFill: Phaser.GameObjects.Rectangle | null = null;
  private holdGaugeTween: Phaser.Tweens.Tween | null = null;
  private holdTimer: Phaser.Time.TimerEvent | null = null;
  private holdingButton: Button | null = null;
  private holdingPointer: boolean = false;
  private _justCompletedText: boolean = false;
  private inputDownHandler: ((event: any) => void) | null = null;
  private inputUpHandler: ((event: any) => void) | null = null;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private prevFieldVisible: boolean | null = null;
  private prevFieldUiVisible: boolean | null = null;
  private prevPermaMoneyVisible: boolean | null = null;
  private prevPermaModifierBarVisible: boolean | null = null;
  private prevPlayerModifierBarVisible: boolean | null = null;
  private prevEnemyModifierBarVisible: boolean | null = null;

  constructor(scene: BattleScene) {
    super(scene, Mode.SLIDESHOW_CUTSCENE);
  }

  setup(): void {}

  show(_args: any[]): boolean {
    super.show(_args);
    const isEndOfRunCutscene = !!(this.scene as any).finalBattleVictory || !!this.scene.lossWhiteoutPreSummaryQueued;
    if (isEndOfRunCutscene) {
      (this.scene as any).beginEndOfRunBattleVisualSuppression?.();
    }
    if (this.prevFieldUiVisible === null) {
      this.prevFieldUiVisible = typeof (this.scene as any).fieldUI?.visible === "boolean" ? (this.scene as any).fieldUI.visible : null;
    }
    if (this.prevPermaMoneyVisible === null) {
      const permaMoney = (this.scene as any).ui?.getPermaMoneyContainer?.();
      this.prevPermaMoneyVisible = typeof permaMoney?.visible === "boolean" ? permaMoney.visible : null;
    }
    if (this.prevPermaModifierBarVisible === null) {
      const permaBar = (this.scene as any).ui?.permaModifierBar;
      this.prevPermaModifierBarVisible = typeof permaBar?.visible === "boolean" ? permaBar.visible : null;
    }
    if (this.prevPlayerModifierBarVisible === null) {
      const mb = (this.scene as any).modifierBar;
      this.prevPlayerModifierBarVisible = typeof mb?.visible === "boolean" ? mb.visible : null;
    }
    if (this.prevEnemyModifierBarVisible === null) {
      const emb = (this.scene as any).enemyModifierBar;
      this.prevEnemyModifierBarVisible = typeof emb?.visible === "boolean" ? emb.visible : null;
    }

    (this.scene as any).fieldUI?.setVisible?.(false);
    (this.scene as any).ui?.getPermaMoneyContainer?.()?.setVisible?.(false);
    (this.scene as any).ui?.permaModifierBar?.setVisible?.(false);
    (this.scene as any).modifierBar?.setVisible?.(false);
    (this.scene as any).enemyModifierBar?.setVisible?.(false);
    this.ensureInputHandlers();
    this.ensureHoldHint();
    return true;
  }

  private ensureInputHandlers(): void {
    if (this.inputDownHandler || this.inputUpHandler || this.pointerDownHandler || this.pointerUpHandler) {
      return;
    }
    this.inputDownHandler = (evt: any) => this.onInputDown(evt);
    this.inputUpHandler = (evt: any) => this.onInputUp(evt);
    this.scene.inputController.events.on("input_down", this.inputDownHandler);
    this.scene.inputController.events.on("input_up", this.inputUpHandler);
    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer);
    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer);
    this.scene.input.on("pointerdown", this.pointerDownHandler);
    this.scene.input.on("pointerup", this.pointerUpHandler);
  }

  private ensureHoldHint(): void {
    const currentPhase = this.scene.getCurrentPhase();
    if (!(currentPhase instanceof SlideshowCutscenePhase) || !currentPhase.canSkip()) {
      return;
    }
    if (this.holdText) {
      return;
    }
    const w = this.scene.game.canvas.width;
    const h = this.scene.game.canvas.height;
    const text = i18next.t("cutscene:holdToSkip", { defaultValue: "Press Any to Skip" });
    this.holdText = this.scene.add.text(w - 20, h - 20, text, { fontFamily: "emerald", fontSize: "22px", color: "#ffffff" });
    this.holdText.setOrigin(1, 1);
    this.holdText.setAlpha(0.85);
    this.holdText.setDepth(11);

    const barW = 120;
    const barH = 8;
    const barRightX = w - 20;
    const barBottomY = (h - 20) + barH + 6;
    const barLeftX = barRightX - barW;
    this.holdGaugeBg = this.scene.add.rectangle(barLeftX, barBottomY, barW, barH, 0x000000, 0.55);
    this.holdGaugeBg.setOrigin(0, 1);
    this.holdGaugeBg.setDepth(11);
    this.holdGaugeFill = this.scene.add.rectangle(barLeftX, barBottomY, 0, barH, 0xffffff, 0.85);
    this.holdGaugeFill.setOrigin(0, 1);
    this.holdGaugeFill.setDepth(11);
  }

  private onInputDown(evt: any): void {
    if (this.scene.ui.getMode() !== Mode.SLIDESHOW_CUTSCENE) {
      return;
    }
    const currentPhase = this.scene.getCurrentPhase();
    if (!(currentPhase instanceof SlideshowCutscenePhase)) {
      return;
    }
    const button = evt?.button as Button;
    if (button === undefined) {
      return;
    }
    if (this.holdTimer || this.holdingButton !== null || this.holdingPointer) {
      return;
    }
    this.holdingButton = button;
    this.holdingPointer = false;
    const canArmSkipHold =
      currentPhase.canSkip() &&
      (currentPhase as any).isHoldToSkipAllowed?.(300) !== false &&
      (currentPhase as any).isManualAdvanceBlocked?.() !== true;
    if (canArmSkipHold) {
      this.holdTimer = this.scene.time.delayedCall(Utils.fixedInt(1000) as any, () => {
        this.holdTimer = null;
        if (this.scene.ui.getMode() !== Mode.SLIDESHOW_CUTSCENE) return;
        if ((currentPhase as any).isManualAdvanceBlocked?.() === true) return;
        if ((currentPhase as any).isHoldToSkipAllowed?.(300) === false) return;
        this.holdingButton = null;
        this.holdingPointer = false;
        currentPhase.skipCutscene();
      });
      this.startHoldGauge();
    }
  }

  private onInputUp(evt: any): void {
    const button = evt?.button as Button;
    if (this.holdingButton === null || button !== this.holdingButton) {
      return;
    }
    this.holdingButton = null;
    if (this.holdTimer) {
      this.holdTimer.remove();
      this.holdTimer = null;
    }
    this.resetHoldGauge();
    if (this.scene.ui.getMode() !== Mode.SLIDESHOW_CUTSCENE) {
      return;
    }
    const currentPhase = this.scene.getCurrentPhase();
    if (!(currentPhase instanceof SlideshowCutscenePhase)) {
      return;
    }
    const isAdvanceButton = button === Button.CANCEL || button === Button.SUBMIT || button === Button.ACTION;
    const isNonSkippable = currentPhase instanceof SlideshowCutscenePhase && !currentPhase.canSkip();
    if (!isAdvanceButton && !isNonSkippable) {
      return;
    }
    if (this._justCompletedText) {
      this._justCompletedText = false;
      return;
    }
    if ((currentPhase as any).isQuickSkipAllowed?.(300) === false) {
      return;
    }
    if ((currentPhase as any).isCurrentTextComplete?.() !== true) {
      (currentPhase as any).completeCurrentText?.();
      this._justCompletedText = true;
      return;
    }
    if (!currentPhase.isTextReadyForAdvance(250)) {
      return;
    }
    if ((currentPhase as any).isManualAdvanceBlocked?.() === true) {
      return;
    }
    currentPhase.nextSlide();
  }

  private onPointerDown(_pointer: Phaser.Input.Pointer): void {
    if (this.scene.ui.getMode() !== Mode.SLIDESHOW_CUTSCENE) {
      return;
    }
    const currentPhase = this.scene.getCurrentPhase();
    if (!(currentPhase instanceof SlideshowCutscenePhase)) {
      return;
    }
    if (this.holdTimer || this.holdingPointer || this.holdingButton !== null) {
      return;
    }
    this.holdingPointer = true;
    this.holdingButton = null;
    const canArmSkipHold =
      currentPhase.canSkip() &&
      (currentPhase as any).isHoldToSkipAllowed?.(300) !== false &&
      (currentPhase as any).isManualAdvanceBlocked?.() !== true;
    if (canArmSkipHold) {
      this.holdTimer = this.scene.time.delayedCall(Utils.fixedInt(1000) as any, () => {
        this.holdTimer = null;
        if (this.scene.ui.getMode() !== Mode.SLIDESHOW_CUTSCENE) return;
        if ((currentPhase as any).isManualAdvanceBlocked?.() === true) return;
        if ((currentPhase as any).isHoldToSkipAllowed?.(300) === false) return;
        this.holdingButton = null;
        this.holdingPointer = false;
        currentPhase.skipCutscene();
      });
      this.startHoldGauge();
    }
  }

  private onPointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.holdingPointer) {
      return;
    }
    this.holdingPointer = false;
    if (this.holdTimer) {
      this.holdTimer.remove();
      this.holdTimer = null;
    }
    this.resetHoldGauge();
    if (this.scene.ui.getMode() !== Mode.SLIDESHOW_CUTSCENE) {
      return;
    }
    const currentPhase = this.scene.getCurrentPhase();
    if (!(currentPhase instanceof SlideshowCutscenePhase)) {
      return;
    }
    if (this._justCompletedText) {
      this._justCompletedText = false;
      return;
    }
    if ((currentPhase as any).isQuickSkipAllowed?.(300) === false) {
      return;
    }
    if ((currentPhase as any).isCurrentTextComplete?.() !== true) {
      (currentPhase as any).completeCurrentText?.();
      this._justCompletedText = true;
      return;
    }
    if (!currentPhase.isTextReadyForAdvance(250)) {
      return;
    }
    if ((currentPhase as any).isManualAdvanceBlocked?.() === true) {
      return;
    }
    currentPhase.nextSlide();
  }

  private startHoldGauge(): void {
    if (!this.holdGaugeFill || !this.holdGaugeBg) {
      return;
    }
    this.resetHoldGauge();
    this.holdGaugeFill.width = 0;
    this.holdGaugeTween = this.scene.tweens.add({
      targets: this.holdGaugeFill,
      width: this.holdGaugeBg.width,
      duration: Utils.fixedInt(1000) as any,
      ease: "Linear",
    });
  }

  private resetHoldGauge(): void {
    if (this.holdGaugeTween) {
      this.holdGaugeTween.stop();
      this.holdGaugeTween = null;
    }
    if (this.holdGaugeFill) {
      this.holdGaugeFill.width = 0;
    }
  }

  processInput(button: Button): boolean {
    const currentPhase = this.scene.getCurrentPhase();
    if (!(currentPhase instanceof SlideshowCutscenePhase)) {
      return false;
    }
    return false;
  }

  setCursor(_cursor: number): boolean {
    return false;
  }

  clear(): void {
    try {
      (this.scene as BattleScene).endEndOfRunBattleVisualSuppression();
    } catch {}
    this.prevFieldVisible = null;
    if (this.prevFieldUiVisible !== null) {
      (this.scene as any).fieldUI?.setVisible?.(this.prevFieldUiVisible);
    }
    if (this.prevPermaMoneyVisible !== null) {
      (this.scene as any).ui?.getPermaMoneyContainer?.()?.setVisible?.(this.prevPermaMoneyVisible);
    }
    if (this.prevPermaModifierBarVisible !== null) {
      (this.scene as any).ui?.permaModifierBar?.setVisible?.(this.prevPermaModifierBarVisible);
    }
    if (this.prevPlayerModifierBarVisible !== null) {
      (this.scene as any).modifierBar?.setVisible?.(this.prevPlayerModifierBarVisible);
    }
    if (this.prevEnemyModifierBarVisible !== null) {
      (this.scene as any).enemyModifierBar?.setVisible?.(this.prevEnemyModifierBarVisible);
    }
    this.prevFieldUiVisible = null;
    this.prevPermaMoneyVisible = null;
    this.prevPermaModifierBarVisible = null;
    this.prevPlayerModifierBarVisible = null;
    this.prevEnemyModifierBarVisible = null;

    if (this.holdTimer) {
      this.holdTimer.remove();
      this.holdTimer = null;
    }
    this.holdingButton = null;
    this.holdingPointer = false;
    this.resetHoldGauge();
    if (this.inputDownHandler) {
      this.scene.inputController.events.off("input_down", this.inputDownHandler);
      this.inputDownHandler = null;
    }
    if (this.inputUpHandler) {
      this.scene.inputController.events.off("input_up", this.inputUpHandler);
      this.inputUpHandler = null;
    }
    if (this.pointerDownHandler) {
      this.scene.input.off("pointerdown", this.pointerDownHandler);
      this.pointerDownHandler = null;
    }
    if (this.pointerUpHandler) {
      this.scene.input.off("pointerup", this.pointerUpHandler);
      this.pointerUpHandler = null;
    }
    if (this.holdGaugeBg) {
      this.holdGaugeBg.destroy();
      this.holdGaugeBg = null;
    }
    if (this.holdGaugeFill) {
      this.holdGaugeFill.destroy();
      this.holdGaugeFill = null;
    }
    if (this.holdText) {
      this.holdText.destroy();
      this.holdText = null;
    }
  }
}