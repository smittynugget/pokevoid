import i18next from "i18next";
import BattleScene from "../battle-scene";
import { ModalConfig, ModalUiHandler } from "./modal-ui-handler";
import { Mode } from "./ui";
import { Button } from "../enums/buttons";
import { Device } from "../enums/devices";
import * as Utils from "../utils";
import { createSporadicPattern } from "../utils";
import { Type } from "../data/type";
import { applyTypeBallRecolor, applyVoidBallRecolor } from "../data/pokeball";
import { getPokemonSpecies, allSpecies } from "../data/pokemon-species";
import { getAllRivalTrainerTypes, trainerConfigs, trainerPokemonPools, RivalTrainerType } from "../data/trainer-config";
import { SkillTreeGenerator } from "../system/skill-tree-generator";
import { SkillTreeNode, SkillTreeRewardType } from "../system/skill-tree-data";
import { addTextObject, TextStyle } from "./text";

type EssenceTotals = Partial<Record<Type, number>>;

export interface RunEndSummaryArgs {
  runInfoEntry?: any;
  debug?: boolean;
}

type SectionKind =
  | "hatched"
  | "captured"
  | "defeated"
  | "rivals"
  | "smitty"
  | "fusions"
  | "majorBoss"
  | "challengeRewards"
  | "shinies"
  | "skillPoints"
  | "hallOfFame";

type SectionIcon =
  | { kind: "pokemon"; speciesId: number; formIndex?: number; shiny?: boolean; variant?: number; female?: boolean }
  | { kind: "fusion"; primarySpeciesId: number; fusionSpeciesId: number; primaryFormIndex?: number; fusionFormIndex?: number }
  | { kind: "item"; key: string; frame?: string | number; scale?: number; type?: Type; voidBall?: boolean }
  | { kind: "type"; type: Type };

interface SectionData {
  kind: SectionKind;
  title: string;
  icons: SectionIcon[];
  essence: EssenceTotals;
}

type RevealableIcon = Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | Phaser.GameObjects.Text;

export default class RunEndSummaryUiHandler extends ModalUiHandler {
  private prevGameSpeed: number | null = null;
  private cappedGameSpeedActive: boolean = false;
  private prevFieldVisible: boolean | null = null;
  private modalBackgroundImage: Phaser.GameObjects.Image | null = null;
  private modalBackgroundCreated: boolean = false;
  private modalPatternOverlay: Phaser.GameObjects.Container | null = null;
  private modalPatternCreated: boolean = false;

  private root: Phaser.GameObjects.Container | null = null;
  private headerContainer: Phaser.GameObjects.Container | null = null;
  private titleTextObj: Phaser.GameObjects.Text | null = null;
  private subtitleTextObj: Phaser.GameObjects.Text | null = null;

  private scrollContainer: Phaser.GameObjects.Container | null = null;
  private contentContainer: Phaser.GameObjects.Container | null = null;
  private scrollMaskRect: Phaser.GameObjects.Graphics | null = null;
  private scrollMask: Phaser.Display.Masks.GeometryMask | null = null;

  private footerContainer: Phaser.GameObjects.Container | null = null;
  private continuePrompt: Phaser.GameObjects.Sprite | null = null;
  private continueTextObj: Phaser.GameObjects.Text | null = null;

  private sections: SectionData[] = [];
  private sectionContainers: Phaser.GameObjects.Container[] = [];
  private revealTimers: Phaser.Time.TimerEvent[] = [];

  private isAnimating: boolean = false;
  private skipRequested: boolean = false;
  private completed: boolean = false;
  private manualScroll: boolean = false;
  private startAtTop: boolean = false;
  private ignoreSkipUntil: number = 0;
  private exitLockedUntil: number = 0;

  private runInfoEntry: any | null = null;
  private debug: boolean = false;
  private selectedSubtitleKey: string | null = null;

  private totalEssence: EssenceTotals = {};

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
  }

  getModalTitle(): string { return ""; }
  getWidth(): number { return Math.floor(this.scene.game.canvas.width / 6) + 8; }
  getHeight(): number { return Math.floor(this.scene.game.canvas.height / 6) + 6; }
  getMargin(): [number, number, number, number] { return [4, 4, 4, 4]; }
  getButtonLabels(): string[] { return []; }

  protected createModalBackground(): void {
  }

  setup(): void {
    super.setup();

    this.root = this.scene.add.container(0, 0);
    this.modalContainer.add(this.root);

    this.headerContainer = this.scene.add.container(0, 0);
    this.root.add(this.headerContainer);

    this.titleTextObj = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "72px", align: "center" });
    this.titleTextObj.setOrigin(0.5, 0);
    this.headerContainer.add(this.titleTextObj);

    this.subtitleTextObj = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "36px", align: "center" });
    this.subtitleTextObj.setOrigin(0.5, 0);
    this.subtitleTextObj.setAlpha(0.85);
    this.headerContainer.add(this.subtitleTextObj);

    this.scrollContainer = this.scene.add.container(0, 0);
    this.root.add(this.scrollContainer);

    this.contentContainer = this.scene.add.container(0, 0);
    this.scrollContainer.add(this.contentContainer);

    this.footerContainer = this.scene.add.container(0, 0);
    this.root.add(this.footerContainer);

    this.continuePrompt = this.scene.add.sprite(0, 0, "keyboard", "ENTER.png");
    this.continuePrompt.setOrigin(0, 0.5);
    this.footerContainer.add(this.continuePrompt);

    this.continueTextObj = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "34px", align: "left" });
    this.continueTextObj.setOrigin(0, 0.5);
    this.continueTextObj.setAlpha(0.85);
    this.footerContainer.add(this.continueTextObj);
  }

  updateContainer(config?: ModalConfig): void {
    super.updateContainer(config);

    if (!this.modalBackgroundCreated) {
      this.modalBackgroundImage = this.scene.add.image(0, 0, "modal_bg");
      this.modalBackgroundImage.setOrigin(0, 0);
      this.modalContainer.addAt(this.modalBackgroundImage, 1);
      this.modalBackgroundCreated = true;
    }

    if (this.modalBackgroundImage) {
      this.modalBackgroundImage.setPosition(this.modalBg.x, this.modalBg.y);
      this.modalBackgroundImage.setDisplaySize(this.modalBg.width, this.modalBg.height);
    }

    if (!this.modalPatternCreated) {
      this.modalPatternOverlay = this.scene.add.container(0, 0);
      this.modalContainer.addAt(this.modalPatternOverlay, 2);
      createSporadicPattern(this.scene, this.modalPatternOverlay);
      this.modalPatternCreated = true;
    }

    if (this.modalPatternOverlay) {
      this.modalPatternOverlay.setPosition(this.modalBg.x, this.modalBg.y);
    }

    this.layout();
  }

  show(args: any[]): boolean {
    const modalConfig: ModalConfig = { buttonActions: [] };
    if (!super.show([modalConfig])) return false;

    if (!this.cappedGameSpeedActive) {
      this.prevGameSpeed = this.scene.gameSpeed;
      if (this.scene.gameSpeed > 3) {
        this.scene.gameSpeed = 3 as any;
      }
      this.cappedGameSpeedActive = true;
    }

    const cfg = (args?.[0] || {}) as RunEndSummaryArgs;
    this.runInfoEntry = cfg.runInfoEntry ?? null;
    this.debug = !!cfg.debug;
    this.selectedSubtitleKey = this.pickSubtitleKey();
    this.prevFieldVisible = null;
    if (this.runInfoEntry?.isFinalBattleContext) {
      (this.scene as any).beginEndOfRunBattleVisualSuppression?.();
    }
    this.isAnimating = false;
    this.skipRequested = false;
    this.completed = false;
    this.manualScroll = false;
    this.ignoreSkipUntil = this.scene.time.now + 250;
    this.exitLockedUntil = 0;

    this.clearContent();
    if (this.titleTextObj) {
      this.titleTextObj.setText(i18next.t("runEndSummary:title", { defaultValue: "VOID EXPLOIT SUMMARY" }));
    }
    if (this.subtitleTextObj) {
      const subtitleKey = this.selectedSubtitleKey ?? "runEndSummary:subtitle";
      this.subtitleTextObj.setText(i18next.t(subtitleKey, { defaultValue: "The resistance is nothing without your efforts" }));
    }
    this.buildSections();
    this.ensureSummaryAssetsLoaded();
    this.startAtTop = true;
    this.layout();
    this.startRevealSequence();

    return true;
  }

  processInput(button: Button): boolean {
    if (!this.active) return false;

    if (button === Button.UP || button === Button.DOWN) {
      this.manualScroll = true;
      this.scrollBy(button === Button.UP ? 30 : -30);
      return true;
    }

    if (button === Button.CANCEL || button === Button.SUBMIT || button === Button.ACTION) {
      if (this.scene.time.now < this.ignoreSkipUntil) {
        return true;
      }
      if (this.completed && this.scene.time.now < this.exitLockedUntil) {
        return true;
      }
      if (!this.completed) {
        this.requestSkip();
        return true;
      }
      this.finishAndExit();
      return true;
    }

    return false;
  }

  clear(): void {
    if (this.cappedGameSpeedActive) {
      if (this.prevGameSpeed !== null) {
        this.scene.gameSpeed = this.prevGameSpeed as any;
      }
      this.prevGameSpeed = null;
      this.cappedGameSpeedActive = false;
    }
    this.clearTimers();
    this.clearContent();
    if (this.scrollContainer) {
      this.scrollContainer.clearMask();
    }
    if (this.scrollMaskRect) {
      this.scrollMaskRect.destroy();
      this.scrollMaskRect = null;
    }
    this.scrollMask = null;
    this.prevFieldVisible = null;
    super.clear();
  }

  private layout(): void {
    const w = this.getWidth();
    const h = this.getHeight();
    const headerY = 18;
    const titleSubtitleGap = 2;
    const padding = 12;

    if (this.titleTextObj) {
      this.titleTextObj.setPosition(w / 2, headerY);
    }
    if (this.subtitleTextObj && this.titleTextObj) {
      this.subtitleTextObj.setPosition(w / 2, headerY + this.titleTextObj.displayHeight + titleSubtitleGap);
    }

    const contentTop = this.getContentTop();

    if (this.scrollContainer) {
      this.scrollContainer.setPosition(padding, contentTop);
    }
    if (this.contentContainer) {
      this.contentContainer.setPosition(0, 0);
    }

    const viewW = w - padding * 2;
    const viewH = h - contentTop - padding;

    if (this.footerContainer && this.continuePrompt && this.continueTextObj) {
      const controller = this.scene.inputController;
      let gamepadType = "keyboard";
      if (this.scene.inputMethod === "gamepad") {
        gamepadType = controller?.getConfig(controller.selectedDevice[Device.GAMEPAD])?.padType || "keyboard";
      } else if (this.scene.inputMethod === "touch") {
        gamepadType = "keyboard";
      } else {
        gamepadType = this.scene.inputMethod || "keyboard";
      }
      const isGamepad = gamepadType !== "keyboard" && this.scene.inputMethod !== "touch";
      let iconPath = controller?.getIconForLatestInputRecorded("BUTTON_SUBMIT") || "";
      if (!iconPath) {
        iconPath = isGamepad ? "A.png" : "ENTER.png";
      }
      this.continuePrompt.setTexture(gamepadType);
      this.continuePrompt.setFrame(iconPath);
      this.continuePrompt.setScale(isGamepad ? 0.62 : 0.5);
      this.continueTextObj.setText(i18next.t("runEndSummary:continue", { defaultValue: "Continue" }));

      const gap = 4;
      const pw = this.continuePrompt.displayWidth;
      const tw = this.continueTextObj.displayWidth;
      const startX = -((pw + gap + tw) / 2);
      this.continuePrompt.setPosition(startX, 0);
      this.continueTextObj.setPosition(startX + pw + gap, 0);
      this.footerContainer.setPosition(w / 2, h - 12);
    }

    if (this.scrollMaskRect) {
      this.scrollMaskRect.destroy();
      this.scrollMaskRect = null;
      this.scrollMask = null;
    }

    if (this.scrollContainer) {
      const modalBounds = this.modalContainer.getBounds();
      this.scrollMaskRect = this.scene.make.graphics({});
      this.scrollMaskRect.setScale(6);
      this.scrollMaskRect.fillStyle(0xffffff);
      const maskX = modalBounds.x / 6 + padding;
      const maskY = modalBounds.y / 6 + contentTop;
      this.scrollMaskRect.fillRect(maskX, maskY, viewW, viewH);
      this.scrollMask = this.scrollMaskRect.createGeometryMask();
    }

    if (this.scrollContainer) {
      this.scrollContainer.clearMask();
      if (this.scrollMask) {
        this.scrollContainer.setMask(this.scrollMask);
      }
    }

    if (this.contentContainer) {
      if (this.startAtTop) {
        this.contentContainer.setY(0);
        this.startAtTop = false;
      } else if (!this.manualScroll) {
        const padding = 12;
        const contentTop = this.getContentTop();
        const viewHClamp = h - contentTop - padding;
        const contentHeight = this.computeContentHeight();
        const minY = contentHeight > viewHClamp ? -(contentHeight - viewHClamp) : 0;
        const maxY = 0;
        this.contentContainer.setY(Phaser.Math.Clamp(this.contentContainer.y, minY, maxY));
      }
    }
  }

  private clearContent(): void {
    this.clearTimers();
    this.sections = [];
    this.sectionContainers.forEach(c => c.destroy(true));
    this.sectionContainers = [];
    if (this.contentContainer) {
      this.contentContainer.removeAll(true);
    }
    this.totalEssence = {};
  }

  private clearTimers(): void {
    this.revealTimers.forEach(t => t.remove(false));
    this.revealTimers = [];
    this.isAnimating = false;
  }

  private requestSkip(): void {
    this.skipRequested = true;
    this.clearTimers();
    this.revealAllImmediately();
    this.completed = true;
    this.exitLockedUntil = this.scene.time.now + 3000;
    this.scene.time.delayedCall(1000, () => {
      this.manualScroll = false;
      this.updateScrollToBottom(true);
    });
  }

  private finishAndExit(): void {
    if (!this.active) return;
    this.applyEssenceAwards();
    const ui = this.getUi();
    ui.revertMode().then(() => {
      if (this.runInfoEntry) {
        ui.setOverlayMode(Mode.RUN_INFO, this.runInfoEntry, true);
      }
    });
  }

  private startRevealSequence(): void {
    if (!this.titleTextObj || !this.subtitleTextObj) return;
    this.titleTextObj.setText(i18next.t("runEndSummary:title", { defaultValue: "VOID EXPLOIT SUMMARY" }));
    const subtitleKey = this.selectedSubtitleKey ?? "runEndSummary:subtitle";
    this.subtitleTextObj.setText(i18next.t(subtitleKey, { defaultValue: "The resistance is nothing without your efforts" }));

    this.isAnimating = true;
    this.skipRequested = false;
    this.completed = false;

    const sectionDelay = 450;
    const iconDelay = 90;
    let delay = 0;

    this.sectionContainers.forEach(sc => sc.setAlpha(0));
    for (const sc of this.sectionContainers) {
      const sectionRevealDelay = delay;
      const revealSectionTimer = this.scene.time.delayedCall(sectionRevealDelay, () => {
        if (this.skipRequested) return;
        this.scene.tweens.add({
          targets: sc,
          alpha: 1,
          duration: 200,
          ease: "Sine.easeOut",
          onComplete: () => this.updateScrollToBottom(true)
        });
      });
      this.revealTimers.push(revealSectionTimer);
      delay += sectionDelay;

      const iconSprites = (sc.getData("iconSprites") as RevealableIcon[] | undefined) || [];
      for (const icon of iconSprites) {
        const t = this.scene.time.delayedCall(delay, () => {
          if (this.skipRequested) return;
          const revealSound = (icon as any).getData?.("revealSound") || "battle_anims/PRSFX- Healing Pulse";
          try { (this.scene as BattleScene).playSound(revealSound); } catch {}
          const targetAlpha = (icon as any).getData?.("targetAlpha");
          const finalAlpha = typeof targetAlpha === "number" ? targetAlpha : 1;
          icon.setAlpha(0);
          icon.setScale((icon.scaleX || 1) * 0.65, (icon.scaleY || 1) * 0.65);
          this.scene.tweens.add({
            targets: icon,
            alpha: finalAlpha,
            scaleX: (icon.scaleX || 1) / 0.65,
            scaleY: (icon.scaleY || 1) / 0.65,
            duration: 180,
            ease: "Back.easeOut",
            onComplete: () => this.updateScrollToBottom(true)
          });
        });
        this.revealTimers.push(t);
        delay += iconDelay;
      }
    }

    const endTimer = this.scene.time.delayedCall(delay + 250, () => {
      if (this.skipRequested) return;
      this.completed = true;
      this.isAnimating = false;
      this.updateScrollToBottom(true);
    });
    this.revealTimers.push(endTimer);
  }

  private revealAllImmediately(): void {
    this.sectionContainers.forEach(sc => {
      sc.setAlpha(1);
      const icons = (sc.getData("iconSprites") as RevealableIcon[] | undefined) || [];
      icons.forEach(i => {
        const targetAlpha = (i as any).getData?.("targetAlpha");
        const finalAlpha = typeof targetAlpha === "number" ? targetAlpha : 1;
        i.setAlpha(finalAlpha);
      });
    });
    this.updateScrollToBottom(false);
  }

  private updateScrollToBottom(tween: boolean): void {
    if (!this.scrollContainer || !this.contentContainer) return;
    if (this.manualScroll) return;
    const h = this.getHeight();
    const padding = 12;
    const contentTop = this.getContentTop();
    const viewH = h - contentTop - padding;
    const contentHeight = this.isAnimating && !this.completed ? this.computeRevealedContentHeight() : this.computeContentHeight();
    const targetY = contentHeight > viewH ? -(contentHeight - viewH) : 0;
    if (tween) {
      this.scene.tweens.add({
        targets: this.contentContainer,
        y: targetY,
        duration: 200,
        ease: "Sine.easeOut"
      });
    } else {
      this.contentContainer.setY(targetY);
    }
  }

  private scrollBy(delta: number): void {
    if (!this.contentContainer) return;
    const h = this.getHeight();
    const padding = 12;
    const contentTop = this.getContentTop();
    const viewH = h - contentTop - padding;
    const contentHeight = this.computeContentHeight();
    const minY = contentHeight > viewH ? -(contentHeight - viewH) : 0;
    const maxY = 0;
    const nextY = Phaser.Math.Clamp(this.contentContainer.y + delta, minY, maxY);
    this.contentContainer.setY(nextY);
  }

  private getContentTop(): number {
    if (this.subtitleTextObj) {
      return this.subtitleTextObj.y + this.subtitleTextObj.displayHeight + 2 + (10 / 6);
    }
    return 82;
  }

  private computeContentHeight(): number {
    if (!this.contentContainer) return 0;
    const bounds = this.contentContainer.getBounds();
    return bounds.height / 6 + 10 + (50 / 6);
  }

  private computeRevealedContentHeight(): number {
    let maxBottom = 0;
    for (const sc of this.sectionContainers) {
      if (sc.alpha <= 0) continue;
      const h = sc.getData("sectionHeight") as number | undefined;
      if (typeof h === "number") {
        maxBottom = Math.max(maxBottom, sc.y + h);
      }
    }
    return maxBottom + 10 + (50 / 6);
  }

  private buildSections(): void {
    const rawSections = this.debug ? this.generateDebugSections() : this.generateRunSections();
    this.sections = rawSections.filter(s => {
      const hasIcons = (s.icons?.length ?? 0) > 0;
      const hasEssence = Object.values(s.essence).some(v => (v || 0) > 0);
      return hasIcons || hasEssence;
    });
    this.totalEssence = {};
    for (const s of this.sections) {
      for (const [k, v] of Object.entries(s.essence)) {
        const t = Number(k) as Type;
        const amt = v || 0;
        if (amt <= 0) continue;
        this.totalEssence[t] = (this.totalEssence[t] || 0) + amt;
      }
    }
    this.renderSections();
  }

  private renderSections(): void {
    if (!this.contentContainer) return;
    const w = this.getWidth();
    const sectionW = w - 24;
    let y = 0;

    for (const section of this.sections) {
      const sc = this.scene.add.container(0, y);
      this.contentContainer.add(sc);

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x000000, 0.25);
      bg.fillRoundedRect(0, 0, sectionW, 56, 6);
      sc.add(bg);

      const title = addTextObject(this.scene, sectionW / 2, 6, section.title, TextStyle.WINDOW, { fontSize: "44px", align: "center" });
      title.setOrigin(0.5, 0);
      sc.add(title);

      const iconsContainer = this.scene.add.container(0, 0);
      sc.add(iconsContainer);

      const iconSprites: RevealableIcon[] = [];
      const gapOverride = section.kind === "rivals"
        ? (2.5 + (15 / 6) + (15 / 6))
        : (section.kind === "smitty" ? (2.5 + (15 / 6)) : undefined);
      const gridIconSize = (section.kind === "rivals" || section.kind === "smitty") ? 36 : 30;
      const iconGrid = this.buildIconGrid(section.icons, sectionW, 28, gridIconSize, 999, gapOverride);
      iconGrid.forEach(obj => {
        iconsContainer.add(obj);
        iconSprites.push(obj);
      });
      const iconSize = 30;
      const iconScale = 0.35;
      const fallbackH = iconSize * iconScale;
      let iconBottom = 0;
      for (const obj of iconGrid) {
        const anyObj: any = obj as any;
        const oy = typeof anyObj.y === "number" ? anyObj.y : 0;
        const oh = typeof anyObj.displayHeight === "number" && anyObj.displayHeight > 0 ? anyObj.displayHeight : fallbackH;
        iconBottom = Math.max(iconBottom, oy + oh);
      }
      const essenceEntryCount = Object.values(section.essence).filter(v => (v || 0) > 0).length;
      const hasEssenceBlock = essenceEntryCount > 0;

      let sectionHeight: number;
      if (hasEssenceBlock) {
        const essenceContainer = this.scene.add.container(0, 0);
        sc.add(essenceContainer);

        const essenceY = Math.ceil(iconBottom + 1 + (20 / 6));
        essenceContainer.setPosition(0, essenceY);

        const essenceLabel = addTextObject(this.scene, sectionW / 2, 15 / 6, i18next.t("runEndSummary:essence", { defaultValue: "ESSENCE" }), TextStyle.WINDOW, { fontSize: "37px", align: "center" });
        essenceLabel.setOrigin(0.5, 0);
        essenceLabel.setAlpha(0.85);
        essenceContainer.add(essenceLabel);

        const essenceStacksStartY = 18 - (20 / 6);
        let essenceOrder: Type[] | undefined = undefined;
        if (section.kind === "rivals") {
          const seen = new Set<Type>();
          const order: Type[] = [];
          for (const icon of section.icons) {
            if (icon.kind === "item" && typeof icon.type === "number") {
              const t = icon.type;
              if (!seen.has(t)) {
                seen.add(t);
                order.push(t);
              }
            }
          }
          essenceOrder = order;
        } else if (section.kind === "hallOfFame") {
          const seen = new Set<Type>();
          const order: Type[] = [];
          for (const icon of section.icons) {
            if (icon.kind === "pokemon") {
              const t = getPokemonSpecies(icon.speciesId as any).type1;
              if (!seen.has(t)) {
                seen.add(t);
                order.push(t);
              }
            }
          }
          essenceOrder = order;
        }
        const rowOffsetY = 4;
        const essenceIcons = this.buildEssenceIcons(section.essence, sectionW, essenceStacksStartY, essenceOrder, rowOffsetY);
        essenceIcons.forEach(obj => {
          const targetAlpha = (obj as any).alpha;
          (obj as any).setData?.("targetAlpha", typeof targetAlpha === "number" ? targetAlpha : 1);
          (obj as any).setData?.("revealSound", "battle_anims/PRSFX- Last Resort1");
          (obj as any).setAlpha?.(0);
          essenceContainer.add(obj);
          iconSprites.push(obj as any);
        });

        const essenceRows = Math.ceil(essenceEntryCount / 10);
        const essenceContentBottom = (essenceStacksStartY + rowOffsetY) + (essenceRows - 1) * 26 + (essenceRows - 1) * (3 / 6) + 24;
        sectionHeight = Math.ceil(essenceY + essenceContentBottom + 4);
      } else {
        const essenceY = Math.ceil(iconBottom + 1 + (20 / 6));
        sectionHeight = essenceY;
      }
      const containerHeight = Math.max(72, sectionHeight);
      bg.clear();
      bg.fillStyle(0x000000, 0.25);
      bg.fillRoundedRect(0, 0, sectionW, containerHeight, 6);
      sc.setData("sectionHeight", containerHeight);

      sc.setData("iconSprites", iconSprites);

      this.sectionContainers.push(sc);
      y += Math.max(84, containerHeight) + 10;
    }

    const totalEntries = Object.values(this.totalEssence).filter(v => (v || 0) > 0).length;
    if (totalEntries <= 0) {
      return;
    }
    const totalContainer = this.scene.add.container(0, y);
    this.contentContainer.add(totalContainer);
    const totalBg = this.scene.add.graphics();
    totalBg.fillStyle(0x000000, 0.35);
    const totalRows = Math.max(1, Math.ceil(totalEntries / 10));
    const totalHeight = Math.ceil((18 + 10) + (totalRows - 1) * 26 + (totalRows - 1) * (3 / 6) + 24 + 8);
    const totalContainerHeight = Math.max(64, totalHeight);
    totalBg.fillRoundedRect(0, 0, sectionW, totalContainerHeight, 6);
    totalContainer.add(totalBg);
    totalContainer.setData("sectionHeight", totalContainerHeight);
    const totalTitle = addTextObject(this.scene, sectionW / 2, 6, i18next.t("runEndSummary:total", { defaultValue: "TOTAL ESSENCE" }), TextStyle.WINDOW, { fontSize: "44px", align: "center" });
    totalTitle.setOrigin(0.5, 0);
    totalContainer.add(totalTitle);
    const totalIcons = this.buildEssenceIcons(this.totalEssence, sectionW, 18, undefined);
    const totalIconSprites: RevealableIcon[] = [];
    totalIcons.forEach(obj => {
      const targetAlpha = (obj as any).alpha;
      (obj as any).setData?.("targetAlpha", typeof targetAlpha === "number" ? targetAlpha : 1);
      (obj as any).setData?.("revealSound", "battle_anims/PRSFX- Last Resort1");
      (obj as any).setAlpha?.(0);
      totalContainer.add(obj);
      totalIconSprites.push(obj as any);
    });
    totalContainer.setData("iconSprites", totalIconSprites);
    this.sectionContainers.push(totalContainer);
  }

  private buildIconGrid(icons: SectionIcon[], width: number, startY: number, iconSize: number, cols: number, gapOverride?: number): RevealableIcon[] {
    const list: RevealableIcon[] = [];
    const maxIcons = Math.min(icons.length, 100);
    const gap = gapOverride ?? 2.5;
    const scale = 0.35;
    const iconW = iconSize * scale;
    const pitch = iconSize * scale + gap;
    const margin = 35 / 6;
    const maxCols = Math.max(1, Math.floor((width - 2 * margin - iconW) / pitch) + 1);
    const colsToUse = Math.max(1, Math.min(cols, maxCols));

    for (let i = 0; i < maxIcons; i++) {
      const icon = icons[i];
      const col = i % colsToUse;
      const row = Math.floor(i / colsToUse);
      const rowStartIndex = row * colsToUse;
      const rowCount = Math.min(colsToUse, maxIcons - rowStartIndex);
      const usable = width - 2 * margin;
      const rowWidth = iconW + (rowCount - 1) * pitch;
      const rowStartX = margin + (usable - rowWidth) / 2 + iconW / 2;
      const x = rowStartX + col * pitch;
      const y = startY + row * (iconSize * scale + gap);
      const obj = this.createIconSprite(icon, x, y, scale);
      obj.setAlpha(0);
      list.push(obj);
    }
    return list;
  }

  private createIconSprite(icon: SectionIcon, x: number, y: number, scale: number): RevealableIcon {
    if (icon.kind === "item") {
      const spr = this.scene.textures.exists(icon.key)
        ? this.scene.add.sprite(x, y, icon.key, icon.frame as any)
        : this.scene.add.sprite(x, y, "items", "master_ribbon");
      spr.setOrigin(0.5, 0);
      spr.setScale(icon.scale ?? scale);
      try {
        if (icon.voidBall) {
          applyVoidBallRecolor(this.scene as BattleScene, spr, true);
          spr.setAlpha(0.85);
        } else if (icon.type !== undefined && icon.frame === "gb") {
          applyTypeBallRecolor(this.scene as BattleScene, spr, icon.type, true);
        }
      } catch {}
      if (!this.scene.textures.exists(icon.key)) {
        spr.setData("pendingTextureKey", icon.key);
        spr.setData("pendingFrame", icon.frame ?? null);
        spr.setData("pendingScale", icon.scale ?? scale);
      }
      return spr;
    }
    if (icon.kind === "type") {
      const spr = this.scene.add.sprite(x, y, Utils.getLocalizedSpriteKey("types"));
      spr.setOrigin(0.5, 0);
      spr.setFrame(Type[icon.type].toLowerCase());
      spr.setScale(scale * 0.9);
      return spr;
    }
    if (icon.kind === "fusion") {
      return this.createFusionIcon(icon, x, y, scale);
    }

    const s = getPokemonSpecies(icon.speciesId as any);
    const formIndex = icon.formIndex ?? 0;
    const shiny = !!icon.shiny;
    const variant = icon.variant ?? 0;
    const female = !!icon.female;
    const atlasKey = s.getIconAtlasKey(formIndex, shiny, variant);
    const frame = s.getIconId(female, formIndex, shiny, variant);
    const spr = this.scene.add.sprite(x, y, atlasKey);
    if (!atlasKey.startsWith("pokemon_icons_mod_")) {
      const candidates: (string | number)[] = [frame];
      if (typeof frame === "string" && frame.endsWith("s")) {
        candidates.push(frame.slice(0, -1));
      }
      for (const f of candidates) {
        if (spr.texture.has(f as any)) {
          spr.setFrame(f as any);
          break;
        }
      }
    }
    spr.setOrigin(0.5, 0);
    spr.setScale(scale);
    return spr;
  }

  private createFusionIcon(icon: Extract<SectionIcon, { kind: "fusion" }>, x: number, y: number, scale: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const primary = getPokemonSpecies(icon.primarySpeciesId as any);
    const fusion = getPokemonSpecies(icon.fusionSpeciesId as any);
    const pf = icon.primaryFormIndex ?? 0;
    const ff = icon.fusionFormIndex ?? 0;

    const primaryAtlasKey = primary.getIconAtlasKey(pf, false, 0);
    const primaryIconId = primary.getIconId(false, pf, false, 0);
    const fusionAtlasKey = fusion.getIconAtlasKey(ff, false, 0);
    const fusionIconId = fusion.getIconId(false, ff, false, 0);

    const top = this.scene.add.sprite(0, 0, primaryAtlasKey);
    if (!primaryAtlasKey.startsWith("pokemon_icons_mod_")) {
      const candidates: (string | number)[] = [primaryIconId];
      if (typeof primaryIconId === "string" && primaryIconId.endsWith("s")) {
        candidates.push(primaryIconId.slice(0, -1));
      }
      for (const f of candidates) {
        if (top.texture.has(f as any)) {
          top.setFrame(f as any);
          break;
        }
      }
    }
    top.setOrigin(0.5, 0);
    top.setScale(scale);

    const bottom = this.scene.add.sprite(0, 0, fusionAtlasKey);
    if (!fusionAtlasKey.startsWith("pokemon_icons_mod_")) {
      const candidates: (string | number)[] = [fusionIconId];
      if (typeof fusionIconId === "string" && fusionIconId.endsWith("s")) {
        candidates.push(fusionIconId.slice(0, -1));
      }
      for (const f of candidates) {
        if (bottom.texture.has(f as any)) {
          bottom.setFrame(f as any);
          break;
        }
      }
    }
    bottom.setOrigin(0.5, 0);
    bottom.setScale(scale);

    container.add(top);
    container.add(bottom);

    if (!primaryAtlasKey.startsWith("pokemon_icons_mod_") && !fusionAtlasKey.startsWith("pokemon_icons_mod_")) {
      const originalTopFrame = top.frame;
      const originalBottomFrame = bottom.frame;
      const topHeight = (originalTopFrame.cutHeight <= originalBottomFrame.cutHeight ? Math.ceil : Math.floor)((originalTopFrame.cutHeight + originalBottomFrame.cutHeight) / 4);

      const topFrameId = `${originalTopFrame.name}f${originalBottomFrame.name}`;
      if (!originalTopFrame.texture.has(topFrameId)) {
        originalTopFrame.texture.add(topFrameId, originalTopFrame.sourceIndex, originalTopFrame.cutX, originalTopFrame.cutY, originalTopFrame.cutWidth, topHeight);
      }
      top.setFrame(topFrameId);

      const bottomY = originalBottomFrame.cutY + topHeight;
      const bottomHeight = originalBottomFrame.cutHeight - topHeight;
      const bottomFrameId = `${originalBottomFrame.name}f${originalTopFrame.name}`;
      if (!originalBottomFrame.texture.has(bottomFrameId)) {
        originalBottomFrame.texture.add(bottomFrameId, originalBottomFrame.sourceIndex, originalBottomFrame.cutX, bottomY, originalBottomFrame.cutWidth, bottomHeight);
      }
      bottom.setFrame(bottomFrameId);

      bottom.setY(top.y + top.frame.cutHeight * top.scaleY);

      const frameY = (originalTopFrame.y + originalBottomFrame.y) / 2;
      (top.frame as any).y = frameY;
      (bottom.frame as any).y = frameY;
    } else {
      bottom.setY(top.y + 10);
    }

    container.setScale(1);
    container.setAlpha(1);
    return container;
  }

  private buildEssenceIcons(essence: EssenceTotals, width: number, startY: number, order?: Type[], rowOffsetY: number = 10): Phaser.GameObjects.GameObject[] {
    const entries = Object.entries(essence)
      .map(([k, v]) => [Number(k) as Type, v || 0] as const)
      .filter(([, v]) => v > 0)
      .sort((a, b) => a[0] - b[0]);

    if (order?.length) {
      const orderIndex = new Map<Type, number>();
      for (let i = 0; i < order.length; i++) {
        const t = order[i];
        if (!orderIndex.has(t)) {
          orderIndex.set(t, i);
        }
      }
      entries.sort((a, b) => {
        const ai = orderIndex.has(a[0]) ? (orderIndex.get(a[0]) as number) : 1000 + a[0];
        const bi = orderIndex.has(b[0]) ? (orderIndex.get(b[0]) as number) : 1000 + b[0];
        return ai - bi;
      });
    }

    const icons: Phaser.GameObjects.GameObject[] = [];
    if (!entries.length) {
      return icons;
    }

    const cols = Math.min(entries.length, 10);
    const gap = 26;
    const startX = width / 2 - ((cols - 1) * gap) / 2;

    entries.forEach(([t, amt], idx) => {
      const col = idx % 10;
      const row = Math.floor(idx / 10);
      const x = startX + col * gap;
      const y = startY + rowOffsetY + row * 26 + row * (3 / 6);

      const stack = this.scene.add.container(x, y);

      const soul = this.scene.add.sprite(0, 0, "smitems", "modSoulCollected");
      soul.setOrigin(0.5, 0.5);
      soul.setScale(0.185);

      const isGlitch = (t === (Type as any).GLITCH);
      const isSmitty = (t === (Type as any).SMITTY);
      const useCategories = isGlitch || isSmitty;
      const atlasKey = useCategories ? "categories" : Utils.getLocalizedSpriteKey("types");
      const frameKey = useCategories ? (isGlitch ? "physical" : "special") : Type[t].toLowerCase();
      const typeIconY = 8 - (9 / 6);
      const typeIcon = this.scene.add.sprite(0, typeIconY, atlasKey, frameKey as any);
      typeIcon.setOrigin(0.5, 0.5);
      typeIcon.setScale(useCategories ? 0.425 : 0.35);
      if (isSmitty) typeIcon.setTint(0xFF0000);
      if (isGlitch) {
        try {
          if (typeIcon.postFX && typeof typeIcon.postFX.addColorMatrix === "function") {
            const cm = typeIcon.postFX.addColorMatrix();
            cm.negative();
          } else {
            typeIcon.setTint(0xFF00FF);
          }
        } catch {
          typeIcon.setTint(0xFF00FF);
        }
      }

      const txt = addTextObject(this.scene, 0, 16 - (24 / 6), `x${amt}`, TextStyle.WINDOW, { fontSize: "32px", align: "center" });
      txt.setOrigin(0.5, 0);
      txt.setAlpha(0.9);

      stack.add([soul, typeIcon, txt]);
      if (isSmitty) {
        const iconLabel = addTextObject(this.scene, 0, typeIconY, "SMITTY", TextStyle.WINDOW, { fontSize: "24px", align: "center", stroke: "#000000", strokeThickness: 3 });
        iconLabel.setOrigin(0.5, 0.5);
        stack.add(iconLabel);
      }
      icons.push(stack);
    });

    return icons;
  }

  private ensureSummaryAssetsLoaded(): boolean {
    const loader = this.scene.load;
    if (loader.isLoading()) {
      return false;
    }
    const toLoad: { key: string; folder: string }[] = [];
    for (const section of this.sections) {
      for (const icon of section.icons) {
        if (icon.kind !== "item") continue;
        if (this.scene.textures.exists(icon.key)) continue;
        const folder = icon.key === "smitty_trainers" ? "smittytrainers" : "trainer";
        toLoad.push({ key: icon.key, folder });
      }
    }
    const unique = Array.from(new Map(toLoad.map(i => [i.key, i])).values());
    if (!unique.length) {
      return false;
    }
    for (const i of unique) {
      this.scene.loadAtlas(i.key, i.folder);
    }
    loader.once(Phaser.Loader.Events.COMPLETE, () => {
      if (!this.active) return;
      this.applyPendingTextures();
      this.layout();
    });
    loader.start();
    return true;
  }

  private applyPendingTextures(): void {
    for (const sc of this.sectionContainers) {
      const iconSprites = (sc.getData("iconSprites") as RevealableIcon[] | undefined) || [];
      for (const icon of iconSprites) {
        const spr: any = icon as any;
        if (!spr || typeof spr.getData !== "function") continue;
        const pendingKey = spr.getData("pendingTextureKey") as string | null | undefined;
        if (!pendingKey) continue;
        if (!this.scene.textures.exists(pendingKey)) continue;
        spr.setTexture(pendingKey);
        let pendingFrame = spr.getData("pendingFrame") as any;
        if (pendingFrame === null || pendingFrame === undefined) {
          const texture = this.scene.textures.get(pendingKey);
          const frames = texture.getFrameNames().sort((a, b) => {
            const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
            const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
            return na - nb;
          });
          pendingFrame = frames.length > 1 ? frames[frames.length - 1] : undefined;
        }
        if (pendingFrame !== undefined) {
          spr.setFrame(pendingFrame);
        }
        const pendingScale = spr.getData("pendingScale") as number | null | undefined;
        if (typeof pendingScale === "number") {
          spr.setScale(pendingScale);
        }
        spr.setData("pendingTextureKey", null);
        spr.setData("pendingFrame", null);
        spr.setData("pendingScale", null);
      }
    }
  }

  private getSmittyTrainerFrames(): string[] {
    if (!this.scene.textures.exists("smitty_trainers")) {
      return [];
    }
    const texture = this.scene.textures.get("smitty_trainers");
    const frames = texture.getFrameNames()
      .filter(f => {
        const m = f.match(/\d+/);
        if (!m) return false;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) && n > 0;
      })
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
        const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
        return na - nb;
      });
    return frames;
  }

  private generateDebugSections(): SectionData[] {
    const sections: SectionData[] = [];

    const seedOffset = 100000 + (this.scene.currentBattle?.waveIndex ?? 0);
    this.scene.executeWithSeedOffset(() => {
      const captured = this.randomPokemonIcons(100, false);
      sections.push({
        kind: "captured",
        title: i18next.t("runEndSummary:captured", { defaultValue: "Captured Pokémon" }),
        icons: captured,
        essence: this.essenceFromPokemonIcons(captured, 20, true)
      });

      const defeated = this.randomPokemonIcons(100, false);
      sections.push({
        kind: "defeated",
        title: i18next.t("runEndSummary:defeated", { defaultValue: "Defeated Pokémon" }),
        icons: defeated,
        essence: this.essenceFromPokemonIcons(defeated, 20, true)
      });

      const rivals = this.randomRivalIcons(6);
      sections.push({
        kind: "rivals",
        title: i18next.t("runEndSummary:rivals", { defaultValue: "Defeated Rivals" }),
        icons: rivals.icons,
        essence: rivals.essence
      });

      const smittyCount = 3;
      const smittyFrames = this.getSmittyTrainerFrames();
      const smittyIcons: SectionIcon[] = new Array(smittyCount).fill(0).map(() => ({
        kind: "item",
        key: "smitty_trainers",
        frame: smittyFrames.length ? Utils.randSeedItem(smittyFrames) : undefined,
        scale: 0.19
      }));
      const smittyEssence = this.essenceFromSmitty(smittyCount);
      smittyEssence[(Type as any).SMITTY] = Math.max(1, smittyEssence[(Type as any).SMITTY] || 0);
      sections.push({
        kind: "smitty",
        title: i18next.t("runEndSummary:smitty", { defaultValue: "Defeated Smitty" }),
        icons: smittyIcons,
        essence: smittyEssence
      });

      const fusions = this.randomFusionIcons(100);
      sections.push({
        kind: "fusions",
        title: i18next.t("runEndSummary:fusions", { defaultValue: "New Fusions Caught" }),
        icons: fusions.icons,
        essence: fusions.essence
      });

      const bosses = this.randomPokemonIcons(20, false);
      sections.push({
        kind: "majorBoss",
        title: i18next.t("runEndSummary:bosses", { defaultValue: "Major Boss Pokémon Defeated" }),
        icons: bosses,
        essence: this.essenceFromPokemonIcons(bosses, 2)
      });

      const challengeCount = 10;
      const challengeIcons: SectionIcon[] = new Array(challengeCount).fill(0).map(() => ({ kind: "item", key: "items", frame: "master_ribbon", scale: 0.35 }));
      sections.push({
        kind: "challengeRewards",
        title: i18next.t("runEndSummary:challenges", { defaultValue: "Challenge Rewards Obtained" }),
        icons: challengeIcons,
        essence: this.essenceFromRandomTypes(challengeCount)
      });

      const shinies = this.randomPokemonIcons(100, true);
      sections.push({
        kind: "shinies",
        title: i18next.t("runEndSummary:shinies", { defaultValue: "Shiny Pokémon Caught" }),
        icons: shinies,
        essence: this.essenceFromPokemonIcons(shinies, 4)
      });

      const skillIcons = this.getSkillsObtainedIcons(60);
      sections.push({
        kind: "skillPoints",
        title: i18next.t("runEndSummary:skillsObtained", { defaultValue: "Skills Obtained" }),
        icons: skillIcons,
        essence: this.essenceFromRandomTypes(Math.floor(skillIcons.length / 6))
      });

      const hall = this.randomPokemonIcons(6, false);
      sections.push({
        kind: "hallOfFame",
        title: i18next.t("runEndSummary:hallOfFame", { defaultValue: "Hall of Fame Party" }),
        icons: hall,
        essence: this.essenceFromPokemonIcons(hall, 1)
      });
    }, seedOffset);

    return sections;
  }

  private generateRunSections(): SectionData[] {
    const sections: SectionData[] = [];
    const rd = this.scene.runEndSummaryRunData;

    const hatchedRaw = Array.isArray((rd as any).hatched) ? (rd as any).hatched : [];
    const hatched = hatchedRaw.map(h => ({
      kind: "pokemon",
      speciesId: h.speciesId,
      formIndex: h.formIndex,
      shiny: h.shiny,
      variant: h.variant,
      female: h.female
    }) as SectionIcon);
    sections.push({
      kind: "hatched",
      title: i18next.t("runEndSummary:hatched", { defaultValue: "Hatched Pokémon" }),
      icons: hatched,
      essence: this.essenceFromPokemonIcons(hatched, 20, true)
    });

    const capturedIds = new Set(rd.captured.map(c => c.id));

    const captured = rd.captured
      .filter(c => !c.isFusion)
      .map(c => ({
        kind: "pokemon",
        speciesId: c.speciesId,
        formIndex: c.formIndex,
        shiny: c.shiny,
        variant: c.variant,
        female: c.female
      }) as SectionIcon);
    sections.push({
      kind: "captured",
      title: i18next.t("runEndSummary:captured", { defaultValue: "Captured Pokémon" }),
      icons: captured,
      essence: this.essenceFromPokemonIcons(captured, 20, true)
    });

    const defeated = rd.defeated
      .filter(d => !capturedIds.has(d.id))
      .map(d => ({
        kind: "pokemon",
        speciesId: d.speciesId,
        formIndex: d.formIndex,
        shiny: d.shiny,
        variant: d.variant,
        female: d.female
      }) as SectionIcon);
    sections.push({
      kind: "defeated",
      title: i18next.t("runEndSummary:defeated", { defaultValue: "Defeated Pokémon" }),
      icons: defeated,
      essence: this.essenceFromPokemonIcons(defeated, 20, true)
    });

    const rivals = this.rivalIconsFromTrainerTypes(rd.rivalsDefeated);
    sections.push({
      kind: "rivals",
      title: i18next.t("runEndSummary:rivals", { defaultValue: "Defeated Rivals" }),
      icons: rivals.icons,
      essence: rivals.essence
    });

    const baseSeedOffset = 200000 + ((this.runInfoEntry as any)?.entry?.waveIndex ?? this.scene.currentBattle?.waveIndex ?? 0);

    const smittyCount = rd.smittyDefeatedFrames.length;
    const smittyIcons: SectionIcon[] = rd.smittyDefeatedFrames.map(frame => ({
      kind: "item",
      key: "smitty_trainers",
      frame,
      scale: 0.19
    }));
    let smittyEssence: EssenceTotals = {};
    this.scene.executeWithSeedOffset(() => {
      smittyEssence = this.essenceFromSmitty(smittyCount);
    }, baseSeedOffset + 11);
    sections.push({
      kind: "smitty",
      title: i18next.t("runEndSummary:smitty", { defaultValue: "Defeated Smitty" }),
      icons: smittyIcons,
      essence: smittyEssence
    });

    const fusions: SectionIcon[] = rd.captured
      .filter(c => c.isFusion && !!c.fusionSpeciesId)
      .map(c => ({
        kind: "fusion",
        primarySpeciesId: c.speciesId,
        fusionSpeciesId: c.fusionSpeciesId as number,
        primaryFormIndex: c.formIndex,
        fusionFormIndex: c.fusionFormIndex ?? 0
      }) as SectionIcon);
    let fusionEssence: EssenceTotals = {};
    this.scene.executeWithSeedOffset(() => {
      fusionEssence = this.essenceFromFusionIcons(fusions);
    }, baseSeedOffset + 12);
    sections.push({
      kind: "fusions",
      title: i18next.t("runEndSummary:fusions", { defaultValue: "New Fusions Caught" }),
      icons: fusions,
      essence: fusionEssence
    });

    const bosses: SectionIcon[] = rd.majorBossesDefeated.map(b => ({
      kind: "pokemon",
      speciesId: b.speciesId,
      formIndex: 0,
      shiny: false,
      variant: 0,
      female: false
    }) as SectionIcon);
    sections.push({
      kind: "majorBoss",
      title: i18next.t("runEndSummary:bosses", { defaultValue: "Major Boss Pokémon Defeated" }),
      icons: bosses,
      essence: this.essenceFromPokemonIcons(bosses, 2)
    });

    const challengeCount = rd.challengeRewardsObtainedCount;
    const challengeIcons: SectionIcon[] = new Array(Math.min(challengeCount, 100)).fill(0).map(() => ({
      kind: "item",
      key: "items",
      frame: "master_ribbon",
      scale: 0.35
    }));
    let challengeEssence: EssenceTotals = {};
    this.scene.executeWithSeedOffset(() => {
      challengeEssence = this.essenceFromRandomTypes(challengeCount);
    }, baseSeedOffset + 13);
    sections.push({
      kind: "challengeRewards",
      title: i18next.t("runEndSummary:challenges", { defaultValue: "Challenge Rewards Obtained" }),
      icons: challengeIcons,
      essence: challengeEssence
    });

    const shinies = rd.captured
      .filter(c => c.shiny && !c.isFusion)
      .map(c => ({
        kind: "pokemon",
        speciesId: c.speciesId,
        formIndex: c.formIndex,
        shiny: c.shiny,
        variant: c.variant,
        female: c.female
      }) as SectionIcon);
    sections.push({
      kind: "shinies",
      title: i18next.t("runEndSummary:shinies", { defaultValue: "Shiny Pokémon Caught" }),
      icons: shinies,
      essence: this.essenceFromPokemonIcons(shinies, 4)
    });

    const trackedSkillIcons = this.getTrackedSkillsObtainedIcons(60);
    const skillIcons = trackedSkillIcons.length ? trackedSkillIcons : this.getSkillsObtainedIcons(60);
    let skillsObtainedCount = 0;
    const trackedCount = Array.isArray((rd as any)?.skillNodesObtained) ? (rd as any).skillNodesObtained.length : 0;
    if (trackedCount > 0) {
      skillsObtainedCount = trackedCount;
    }
    const astRuntime: any = (this.scene as any).gameData?.activeSkillTree;
    if (skillsObtainedCount === 0 && astRuntime?.unlockedNodes instanceof Set) {
      skillsObtainedCount = Array.from(astRuntime.unlockedNodes).filter((id: any) => id !== "root_0").length;
    } else {
      const unlocked = (this.runInfoEntry as any)?.entry?.activeSkillTree?.unlockedNodes;
      if (skillsObtainedCount === 0 && Array.isArray(unlocked)) {
        skillsObtainedCount = unlocked.filter((id: any) => id !== "root_0").length;
      }
    }
    const skillEssenceCount = Math.floor(skillsObtainedCount / 6);
    let skillEssence: EssenceTotals = {};
    this.scene.executeWithSeedOffset(() => {
      skillEssence = this.essenceFromRandomTypes(skillEssenceCount);
    }, baseSeedOffset + 14);
    sections.push({
      kind: "skillPoints",
      title: i18next.t("runEndSummary:skillsObtained", { defaultValue: "Skills Obtained" }),
      icons: skillIcons,
      essence: skillEssence
    });

    const hallParty: any[] = Array.isArray((this.runInfoEntry as any)?.entry?.party)
      ? ((this.runInfoEntry as any).entry.party as any[])
      : [];
    const hall: SectionIcon[] = (hallParty.length ? hallParty : (this.scene.getParty?.() as any[] || []))
      .slice(0, 6)
      .map(p => ({
        kind: "pokemon",
        speciesId: Number((p as any).species?.speciesId ?? (p as any).species ?? (p as any).speciesId ?? 1),
        formIndex: Number((p as any).formIndex ?? 0),
        shiny: !!(p as any).shiny,
        variant: Number((p as any).variant ?? 0),
        female: Number((p as any).gender ?? 0) === 1
      }) as SectionIcon);
    const isVictory = !!(this.runInfoEntry as any)?.isVictory;
    const hallTitle = isVictory
      ? i18next.t("runEndSummary:hallOfFame", { defaultValue: "Hall of Fame Party" })
      : i18next.t("runEndSummary:goneButNotForgotten", { defaultValue: "Gone But Not Forgotten" });
    sections.push({
      kind: "hallOfFame",
      title: hallTitle,
      icons: hall,
      essence: this.essenceFromPokemonIcons(hall, 1)
    });

    return sections;
  }

  private essenceFromFusionIcons(icons: SectionIcon[]): EssenceTotals {
    const counts: Partial<Record<Type, number>> = {};
    for (const icon of icons) {
      if (icon.kind !== "fusion") continue;
      const chosen = Utils.randSeedInt(2) === 0
        ? getPokemonSpecies(icon.primarySpeciesId as any).type1
        : getPokemonSpecies(icon.fusionSpeciesId as any).type1;
      counts[chosen] = (counts[chosen] || 0) + 1;
    }
    const essence: EssenceTotals = {};
    for (const [k, v] of Object.entries(counts)) {
      const t = Number(k) as Type;
      const amt = Math.floor((v || 0) / 15);
      if (amt > 0) essence[t] = amt;
    }
    if (Object.keys(essence).length === 0) {
      let bestType: Type | null = null;
      let bestCount = 0;
      for (const [k, v] of Object.entries(counts)) {
        const c = v || 0;
        if (c > bestCount) {
          bestCount = c;
          bestType = Number(k) as Type;
        }
      }
      if (bestType !== null) {
        essence[bestType] = 1;
      }
    }
    return essence;
  }

  private rivalIconsFromTrainerTypes(rivalTypes: number[]): { icons: SectionIcon[]; essence: EssenceTotals } {
    const icons: SectionIcon[] = [];
    const essence: EssenceTotals = {};
    for (const rt of rivalTypes) {
      const pools = (trainerPokemonPools as any)[rt] as number[][] | undefined;
      const sig = (pools?.[0]?.[0] ?? 1) as number;
      const t = getPokemonSpecies(sig as any).type1;
      essence[t] = (essence[t] || 0) + 1;
      const trainerConfig: any = (trainerConfigs as any)[rt];
      const spriteKey = trainerConfig ? trainerConfig.getSpriteKey(false, false) : null;
      if (spriteKey) {
        let frame: string | number | undefined = undefined;
        if (this.scene.textures.exists(spriteKey)) {
          const texture = this.scene.textures.get(spriteKey);
          const frames = texture.getFrameNames().sort((a, b) => {
            const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
            const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
            return na - nb;
          });
          frame = frames.length > 1 ? frames[frames.length - 1] : undefined;
        }
        icons.push({ kind: "item", key: spriteKey, frame, scale: 0.35, type: t });
      } else {
        icons.push({ kind: "pokemon", speciesId: sig, formIndex: 0, shiny: false, variant: 0, female: false });
      }
    }
    return { icons, essence };
  }

  private pickSubtitleKey(): string {
    const keys = [
      "runEndSummary:subtitle",
      "runEndSummary:subtitle_victoryForged",
      "runEndSummary:subtitle_collectVoidPower",
      "runEndSummary:subtitle_livedToTell",
      "runEndSummary:subtitle_welcomeHomebase"
    ];
    return Utils.randItem(keys);
  }

  private randomPokemonIcons(count: number, shiny: boolean): SectionIcon[] {
    const icons: SectionIcon[] = [];
    const pool = allSpecies.filter(s => !!s && (s as any).speciesId > 0);
    for (let i = 0; i < count; i++) {
      const s = Utils.randSeedItem(pool) as any;
      const speciesId = (s as any).speciesId as number;
      icons.push({ kind: "pokemon", speciesId, formIndex: 0, shiny, variant: 0, female: false });
    }
    return icons;
  }

  private getSkillsObtainedIcons(maxIcons: number): SectionIcon[] {
    const ast: any = (this.scene as any).gameData?.activeSkillTree;
    try {
      if (ast?.seed !== undefined && ast?.championId && ast?.unlockedNodes instanceof Set) {
        let nodes: SkillTreeNode[] = [];
        this.scene.executeWithSeedOffset(() => {
          const generator = new SkillTreeGenerator(this.scene as BattleScene, ast.seed, ast.championId);
          nodes = generator.generateCompleteTree(ast.maxVisibleDepth ?? 6);
        }, 0, String(ast.seed));
        const unlocked: Set<string> = ast.unlockedNodes as Set<string>;
        const unlockedNodes = nodes
          .filter(n => n && n.id !== "root_0" && unlocked.has(n.id))
          .sort((a, b) => (a.depth - b.depth) || a.id.localeCompare(b.id));
        const pickIcons: SectionIcon[] = Array.isArray(ast?.selectedPokemonPicks)
          ? ast.selectedPokemonPicks
              .filter(p => p && typeof p.species === "number")
              .map(p => ({ kind: "pokemon", speciesId: p.species, formIndex: 0, shiny: false, variant: 0, female: false }))
          : [];
        const nodeIcons = unlockedNodes.map(n => this.skillNodeToSectionIcon(n));
        return [...pickIcons, ...nodeIcons].slice(0, maxIcons);
      }
    } catch {}
    return this.randomSkillNodeIcons(maxIcons);
  }

  private getTrackedSkillsObtainedIcons(maxIcons: number): SectionIcon[] {
    const rd: any = (this.scene as any).runEndSummaryRunData;
    const entries = Array.isArray(rd?.skillNodesObtained) ? rd.skillNodesObtained : [];
    if (!entries.length) return [];
    return entries.slice(0, maxIcons).map((e: any) => {
      const node = { rewardData: { type: e?.rewardType, data: e?.rewardData } } as any as SkillTreeNode;
      return this.skillNodeToSectionIcon(node);
    });
  }

  private randomSkillNodeIcons(count: number): SectionIcon[] {
    const championId = ((this.scene as any).gameData?.activeSkillTree?.championId as string | undefined) || "brock";
    const seed = (((this.scene as any).gameData?.activeSkillTree?.seed as number | undefined) ?? 12345) + 500000;
    try {
      const generator = new SkillTreeGenerator(this.scene as BattleScene, seed, championId);
      const nodes = generator.generateCompleteTree(6).filter(n => n && n.id !== "root_0");
      const icons: SectionIcon[] = [];
      if (!nodes.length) return icons;
      for (let i = 0; i < count; i++) {
        const n = Utils.randSeedItem(nodes) as SkillTreeNode;
        icons.push(this.skillNodeToSectionIcon(n));
      }
      return icons;
    } catch {}
    return new Array(count).fill(0).map(() => ({ kind: "item", key: "smitems", frame: "permaMoreRewardChoice", scale: 0.175 }));
  }

  private skillNodeToSectionIcon(node: SkillTreeNode): SectionIcon {
    const reward = node.rewardData;
    const itemScale = 0.35;
    const smitemsScale = 0.175;
    switch (reward?.type) {
      case SkillTreeRewardType.SIGNATURE_POKEMON:
      case SkillTreeRewardType.LEGENDARY_POKEMON:
      case SkillTreeRewardType.POKEMON_ALT_BUILD: {
        const species = reward?.data?.species;
        if (species && typeof species === "number") {
          return { kind: "pokemon", speciesId: species, formIndex: 0, shiny: false, variant: 0, female: false };
        }
        return { kind: "item", key: "items", frame: "mb", scale: itemScale };
      }
      case SkillTreeRewardType.TM_FILTERED: return { kind: "item", key: "items", frame: "tm_normal", scale: itemScale };
      case SkillTreeRewardType.XM_FILTERED: return { kind: "item", key: "smitems", frame: "glitchTm", scale: smitemsScale };
      case SkillTreeRewardType.ABILITY_GRANT: return { kind: "item", key: "smitems", frame: "glitchAbilitySwitch", scale: smitemsScale };
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT: return { kind: "item", key: "smitems", frame: "modPassiveAbility", scale: smitemsScale };
      case SkillTreeRewardType.TERA_ABILITY: return { kind: "item", key: "items", frame: "stellar_tera_shard", scale: itemScale };
      case SkillTreeRewardType.SMITTY_ABILITY: return { kind: "item", key: "smitems", frame: "smittyMask", scale: smitemsScale };
      case SkillTreeRewardType.GENERAL_POKEMON: {
        const species = reward?.data?.species;
        if (species && typeof species === "number") {
          return { kind: "pokemon", speciesId: species, formIndex: 0, shiny: false, variant: 0, female: false };
        }
        return { kind: "item", key: "smitems", frame: "draftMode", scale: smitemsScale };
      }
      case SkillTreeRewardType.STAT_BOOST: return { kind: "item", key: "items", frame: "protein", scale: itemScale };
      case SkillTreeRewardType.MOVE_UPGRADE: return { kind: "item", key: "smitems", frame: "smittyShard", scale: smitemsScale };
      case SkillTreeRewardType.MOVE_UPGRADE_SPECIFIC: return { kind: "item", key: "smitems", frame: "smittyHumor", scale: smitemsScale };
      case SkillTreeRewardType.ESSENCE_BUNDLE: return { kind: "item", key: "smitems", frame: "modSoulCollected", scale: smitemsScale };
      case SkillTreeRewardType.PERMA_MONEY: return { kind: "item", key: "smitems", frame: "permaMoney", scale: smitemsScale };
      case SkillTreeRewardType.MONEY_REWARD: return { kind: "item", key: "items", frame: "relic_gold", scale: itemScale };
      case SkillTreeRewardType.SKILL_POINTS: return { kind: "item", key: "items", frame: "ribbon_gen9", scale: itemScale };
      case SkillTreeRewardType.SKILL_TREE_TOKENS: return { kind: "item", key: "smitems", frame: "permaMoreRevive", scale: smitemsScale };
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM: return { kind: "item", key: "items", frame: "silk_scarf", scale: itemScale };
      case SkillTreeRewardType.GOLDEN_POKEBALL: return { kind: "item", key: "items", frame: "pb_gold", scale: itemScale };
      case SkillTreeRewardType.MASTER_BALL: return { kind: "item", key: "items", frame: "mb", scale: itemScale };
      case SkillTreeRewardType.VOID_BALL: return { kind: "item", key: "items", frame: "mb", scale: itemScale, voidBall: true };
      case SkillTreeRewardType.TYPE_BALL_FILTERED: {
        const ballType = reward?.data?.ballType;
        if (typeof ballType === "number") {
          return { kind: "item", key: "items", frame: "gb", scale: itemScale, type: ballType as Type };
        }
        return { kind: "item", key: "items", frame: "gb", scale: itemScale };
      }
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT: return { kind: "item", key: "items", frame: "rb", scale: itemScale };
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT: return { kind: "item", key: "items", frame: "mb", scale: itemScale };
      case SkillTreeRewardType.EGG_VOUCHER: return { kind: "item", key: "items", frame: "coupon", scale: itemScale };
      case SkillTreeRewardType.ESSENCE_TYPE_WEIGHT: return { kind: "item", key: "smitems", frame: "modSoulCollected", scale: smitemsScale };
      case SkillTreeRewardType.FUSION_SECONDARY_PRIORITY: return { kind: "item", key: "items", frame: "dna_splicers", scale: itemScale };
      case SkillTreeRewardType.CATCH_RATE_BONUS: return { kind: "item", key: "smitems", frame: "permaCatchRate", scale: smitemsScale };
      case SkillTreeRewardType.REVIVE_BOOST: return { kind: "item", key: "items", frame: "revive", scale: itemScale };
      case SkillTreeRewardType.TERA_TYPE: return { kind: "item", key: "items", frame: "stellar_tera_shard", scale: itemScale };
      case SkillTreeRewardType.GLITCH_CHANGE: return { kind: "item", key: "smitems", frame: "glitchFruit", scale: smitemsScale };
      case SkillTreeRewardType.MEGA_STONE: return { kind: "item", key: "items", frame: "pinsirite", scale: itemScale };
      case SkillTreeRewardType.DYNA_MUSHROOM: return { kind: "item", key: "items", frame: "max_mushrooms", scale: itemScale };
      case SkillTreeRewardType.TYPE_SWITCHER: return { kind: "item", key: "smitems", frame: "glitchTypeSwitch", scale: smitemsScale };
      case SkillTreeRewardType.HEALING_ITEMS: return { kind: "item", key: "items", frame: "max_potion", scale: itemScale };
      case SkillTreeRewardType.MEMORY_MUSHROOM: return { kind: "item", key: "items", frame: "big_mushroom", scale: itemScale };
      case SkillTreeRewardType.BERRY_ITEMS: return { kind: "item", key: "items", frame: "sitrus_berry", scale: itemScale };
      case SkillTreeRewardType.ABILITY_SWITCHER: return { kind: "item", key: "smitems", frame: "glitchAbilitySwitch", scale: smitemsScale };
      case SkillTreeRewardType.GENERAL_ITEMS: return { kind: "item", key: "smitems", frame: "permaShowRewards", scale: smitemsScale };
      case SkillTreeRewardType.BATON_ITEM: return { kind: "item", key: "items", frame: "baton", scale: itemScale };
      case SkillTreeRewardType.PP_MAX_ITEM: return { kind: "item", key: "items", frame: "pp_max", scale: itemScale };
      case SkillTreeRewardType.ROGUE_BALL: return { kind: "item", key: "items", frame: "rb", scale: itemScale };
      case SkillTreeRewardType.PARTY_ABILITY_GRANT: return { kind: "item", key: "smitems", frame: "permaPartyAbility", scale: smitemsScale };
      default:
        return { kind: "item", key: "smitems", frame: "permaMoreRewardChoice", scale: smitemsScale };
    }
  }

  private randomFusionIcons(count: number): { icons: SectionIcon[]; essence: EssenceTotals } {
    const pool = allSpecies.filter(s => !!s && (s as any).speciesId > 0);
    const icons: SectionIcon[] = [];
    const counts: Partial<Record<Type, number>> = {};
    for (let i = 0; i < count; i++) {
      const a = Utils.randSeedItem(pool) as any;
      const b = Utils.randSeedItem(pool) as any;
      const aId = (a as any).speciesId as number;
      const bId = (b as any).speciesId as number;
      icons.push({ kind: "fusion", primarySpeciesId: aId, fusionSpeciesId: bId, primaryFormIndex: 0, fusionFormIndex: 0 });
      const chosen = Utils.randSeedInt(2) === 0 ? getPokemonSpecies(aId as any).type1 : getPokemonSpecies(bId as any).type1;
      counts[chosen] = (counts[chosen] || 0) + 1;
    }
    const essence: EssenceTotals = {};
    for (const [k, v] of Object.entries(counts)) {
      const t = Number(k) as Type;
      const amt = Math.floor((v || 0) / 15);
      if (amt > 0) essence[t] = amt;
    }
    if (Object.keys(essence).length === 0) {
      let bestType: Type | null = null;
      let bestCount = 0;
      for (const [k, v] of Object.entries(counts)) {
        const c = v || 0;
        if (c > bestCount) {
          bestCount = c;
          bestType = Number(k) as Type;
        }
      }
      if (bestType !== null) essence[bestType] = 1;
    }
    return { icons, essence };
  }

  private randomRivalIcons(count: number): { icons: SectionIcon[]; essence: EssenceTotals } {
    const rivals = getAllRivalTrainerTypes().map(v => Number(v) as RivalTrainerType);
    const icons: SectionIcon[] = [];
    const essence: EssenceTotals = {};
    for (let i = 0; i < count; i++) {
      const rt = Utils.randSeedItem(rivals) as RivalTrainerType;
      const pools = (trainerPokemonPools as any)[rt] as number[][] | undefined;
      const sig = (pools?.[0]?.[0] ?? 1) as number;
      const t = getPokemonSpecies(sig as any).type1;
      essence[t] = (essence[t] || 0) + 1;
      const trainerConfig: any = (trainerConfigs as any)[rt];
      const spriteKey = trainerConfig ? trainerConfig.getSpriteKey(false, false) : null;
      if (spriteKey) {
        let frame: string | number | undefined = undefined;
        if (this.scene.textures.exists(spriteKey)) {
          const texture = this.scene.textures.get(spriteKey);
          const frames = texture.getFrameNames().sort((a, b) => {
            const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
            const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
            return na - nb;
          });
          frame = frames.length > 1 ? frames[frames.length - 1] : undefined;
        }
        icons.push({ kind: "item", key: spriteKey, frame, scale: 0.35, type: t });
      } else {
        icons.push({ kind: "pokemon", speciesId: sig, formIndex: 0, shiny: false, variant: 0, female: false });
      }
    }
    return { icons, essence };
  }

  private essenceFromPokemonIcons(icons: SectionIcon[], divisor: number, minOneIfEmpty: boolean = false): EssenceTotals {
    const counts: Partial<Record<Type, number>> = {};
    for (const icon of icons) {
      if (icon.kind !== "pokemon") continue;
      const species = getPokemonSpecies(icon.speciesId as any);
      const t = species.type1;
      counts[t] = (counts[t] || 0) + 1;
    }
    const essence: EssenceTotals = {};
    for (const [k, v] of Object.entries(counts)) {
      const t = Number(k) as Type;
      const amt = Math.floor((v || 0) / divisor);
      if (amt > 0) essence[t] = amt;
    }
    if (minOneIfEmpty && Object.keys(essence).length === 0) {
      let bestType: Type | null = null;
      let bestCount = 0;
      for (const [k, v] of Object.entries(counts)) {
        const c = v || 0;
        if (c > bestCount) {
          bestCount = c;
          bestType = Number(k) as Type;
        }
      }
      if (bestType !== null) {
        essence[bestType] = 1;
      }
    }
    return essence;
  }

  private essenceFromRandomTypes(count: number): EssenceTotals {
    const types = this.getRandomizableTypes();
    const essence: EssenceTotals = {};
    for (let i = 0; i < count; i++) {
      const t = Utils.randSeedItem(types);
      essence[t] = (essence[t] || 0) + 1;
    }
    return essence;
  }

  private essenceFromSmitty(count: number): EssenceTotals {
    const types = this.getRandomizableTypes();
    const essence: EssenceTotals = {};
    for (let i = 0; i < count; i++) {
      const roll = Utils.randSeedInt(10);
      const t = roll === 0 ? Type.SMITTY : Utils.randSeedItem(types);
      essence[t] = (essence[t] || 0) + 1;
    }
    return essence;
  }

  private getRandomizableTypes(): Type[] {
    return [
      Type.NORMAL, Type.FIGHTING, Type.FLYING, Type.POISON, Type.GROUND, Type.ROCK, Type.BUG, Type.GHOST,
      Type.STEEL, Type.FIRE, Type.WATER, Type.GRASS, Type.ELECTRIC, Type.PSYCHIC, Type.ICE, Type.DRAGON,
      Type.DARK, Type.FAIRY, Type.STELLAR
    ];
  }

  private applyEssenceAwards(): void {
    if (this.scene.runEndSummaryRunData.essenceApplied) return;
    for (const [k, v] of Object.entries(this.totalEssence)) {
      const t = Number(k) as Type;
      const amt = v || 0;
      if (amt > 0) {
        this.scene.gameData.addEssence(t, amt);
      }
    }
    this.scene.recordRunEndSummaryEssenceApplied();
  }
}