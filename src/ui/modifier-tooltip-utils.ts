import Phaser from "phaser";
import i18next from "i18next";
import BattleScene from "#app/battle-scene";
import { addBBCodeTextObject, addTextObject, TextStyle } from "#app/ui/text";
import { getUpgradeRarityColors } from "#app/utils";
import { SkillTreeRarity } from "#app/system/skill-tree-data";
import type { ModifierType } from "#app/modifier/modifier-type";
import type { PersistentModifier } from "#app/modifier/modifier";
import { PermaRunQuestModifier } from "#app/modifier/modifier";
import { PermaPartyAbilityModifierType, TeraAbilityModifierType, TrainerBondAbilityModifierType } from "#app/modifier/modifier-type";
import { getPermaModifierRarity } from "#app/phases/modifier-reward-phase";
import { Button } from "#enums/buttons";
import { Device } from "#enums/devices";
import { ModifierTier } from "#app/modifier/modifier-tier";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";

export interface ModifierTooltipData {
  title: string;
  subtitle: string;
  body: string;
  rarity: SkillTreeRarity;
  hasDetails?: boolean;
}

export class ModifierTooltipUtils {
  private static container: Phaser.GameObjects.Container | null = null;
  private static bg: Phaser.GameObjects.Graphics | null = null;
  private static titleBar: Phaser.GameObjects.Graphics | null = null;
  private static rarityBar: Phaser.GameObjects.Graphics | null = null;
  private static titleText: Phaser.GameObjects.Text | null = null;
  private static subtitleText: Phaser.GameObjects.Text | null = null;
  private static bodyText: BBCodeText | null = null;
  private static detailsButton: Phaser.GameObjects.Container | null = null;
  private static backButton: Phaser.GameObjects.Container | null = null;

  private static pinned: boolean = false;
  private static currentScene: BattleScene | null = null;
  private static currentData: ModifierTooltipData | null = null;

  private static readonly TOOLTIP_WIDTH = 625 / 6;
  private static readonly TITLE_BAR_H = 12;
  private static readonly RARITY_BAR_H = 6;
  private static readonly PADDING = 6;
  private static readonly RADIUS = 0;
  private static readonly BUTTON_ROW_H = 10;

  static isPinned(): boolean {
    return this.pinned;
  }

  static hideIfNotPinned(scene: BattleScene): void {
    if (this.pinned) return;
    this.hide(scene);
  }

  static handleStatsPressed(scene: BattleScene): boolean {
    if (!this.container || !this.container.visible) return false;
    if (!this.currentData?.hasDetails) return false;
    this.pinned = true;
    this.rebuild(scene);
    return true;
  }

  static handleUiInput(scene: BattleScene, button: Button): boolean {
    if (!this.pinned) return false;
    if (button === Button.CANCEL) {
      this.hide(scene);
      return true;
    }
    return false;
  }

  static showForModifierType(scene: BattleScene, type: ModifierType, _anchor?: { x: number; y: number }, _opts?: { context?: string }): void {
    const rarity = this.getTooltipRarityForModifierType(type);
    const subtitle = this.getRarityText(rarity);
    const typeAny: any = type as any;
    const body = typeof typeAny.getTooltipDescription === "function" ? String(typeAny.getTooltipDescription(scene)) : String(type.getDescription(scene));
    const data: ModifierTooltipData = { title: String(type.name), subtitle, body, rarity, hasDetails: false };
    this.show(scene, data);
  }

  static showForModifier(scene: BattleScene, modifier: PersistentModifier, _anchor?: { x: number; y: number }, opts?: { context?: string }): void {
    const meta = (modifier as any)?.skillTreeTooltip;
    if (meta?.title && meta?.body && meta?.rarity && !(modifier instanceof PermaRunQuestModifier)) {
      const rarity = meta.rarity as SkillTreeRarity;
      const subtitle = this.getRarityText(rarity);
      const isPartyAbility = modifier.type instanceof PermaPartyAbilityModifierType;
      const useModifierTypeInfo = isPartyAbility
        || modifier.type instanceof TeraAbilityModifierType
        || modifier.type instanceof TrainerBondAbilityModifierType;
      const title = useModifierTypeInfo ? String(modifier.type.name) : String(meta.title);
      const typeAny: any = modifier.type as any;
      const body = useModifierTypeInfo
        ? (typeof typeAny.getTooltipDescription === "function" ? String(typeAny.getTooltipDescription(scene)) : String(modifier.type.getDescription(scene)))
        : String(meta.body);
      const data: ModifierTooltipData = { title, subtitle, body, rarity, hasDetails: false };
      this.show(scene, data);
      return;
    }

    let bodyOverride: string | null = null;
    if ((modifier as any)?.constructor?.name === "PermaRunQuestModifier") {
      try {
        const goalCount = (modifier as any).goalCount;
        let currentCount: number | undefined = undefined;
        if (typeof (modifier as any).getCurrentCount === "function") {
          try {
            currentCount = (modifier as any).getCurrentCount(scene);
          } catch {
            currentCount = (modifier as any).currentCount;
          }
        } else {
          currentCount = (modifier as any).currentCount;
        }
        if (typeof currentCount === "number" && typeof goalCount === "number" && goalCount > 1) {
          bodyOverride = `${modifier.type.getDescription(scene)} (${currentCount}/${goalCount})`;
        }
      } catch {
      }
    }

    if (bodyOverride) {
      const rarity = this.getTooltipRarityForModifierType(modifier.type as any);
      const subtitle = this.getRarityText(rarity);
      const data: ModifierTooltipData = { title: String(modifier.type.name), subtitle, body: bodyOverride, rarity, hasDetails: false };
      this.show(scene, data);
      return;
    }

    this.showForModifierType(scene, modifier.type as any, undefined, opts);
  }

  static show(scene: BattleScene, data: ModifierTooltipData): void {
    this.currentScene = scene;
    this.currentData = data;
    this.pinned = false;
    this.buildTooltip(scene, data);
  }

  static hide(scene: BattleScene): void {
    this.pinned = false;
    this.currentScene = null;
    this.currentData = null;
    if (this.container) {
      this.container.destroy();
    }
    this.container = null;
    this.bg = null;
    this.titleBar = null;
    this.rarityBar = null;
    this.titleText = null;
    this.subtitleText = null;
    this.bodyText = null;
    this.detailsButton = null;
    this.backButton = null;
  }

  private static rebuild(scene: BattleScene): void {
    if (!this.currentData) return;
    this.buildTooltip(scene, this.currentData);
  }

  private static buildTooltip(scene: BattleScene, data: ModifierTooltipData): void {
    if (this.container) {
      this.container.destroy();
    }
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10000000000);

    const rarityColors = getUpgradeRarityColors(data.rarity);
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = this.PADDING;
    const barsH = this.TITLE_BAR_H + this.RARITY_BAR_H;
    const bodyY = barsH + padding;

    this.titleText = addTextObject(scene, tooltipWidth / 2, this.TITLE_BAR_H / 2, data.title, TextStyle.SUMMARY_GOLD, { fontSize: "40px", fontStyle: "bold" });
    this.titleText.setOrigin(0.5, 0.5);

    this.subtitleText = addTextObject(scene, tooltipWidth / 2, this.TITLE_BAR_H + (this.RARITY_BAR_H / 2), data.subtitle, TextStyle.WINDOW, { fontSize: "35px" });
    this.subtitleText.setOrigin(0.5, 0.5);
    this.subtitleText.setTint(rarityColors.border);

    this.bodyText = addBBCodeTextObject(scene, padding, bodyY, data.body, TextStyle.WINDOW, { fontSize: "40px" });
    this.bodyText.setOrigin(0, 0);
    this.applyBbCodeWordWrap(this.bodyText, tooltipWidth, padding);

    const contentBottom = this.bodyText.y + this.bodyText.displayHeight;
    const hasDetails = !!data.hasDetails;
    let tooltipHeight = contentBottom + padding;
    tooltipHeight += hasDetails ? (this.BUTTON_ROW_H + padding) : padding;

    this.bg = scene.add.graphics();
    this.drawTooltipGradientBackground(this.bg, 0, 0, tooltipWidth, tooltipHeight, this.RADIUS);
    this.bg.lineStyle(0.5, 0xffffff, 0.5);
    this.bg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, this.RADIUS);

    this.titleBar = scene.add.graphics();
    this.titleBar.fillStyle(rarityColors.border, 0.65);
    this.titleBar.fillRect(0, 0, tooltipWidth, this.TITLE_BAR_H);

    this.rarityBar = scene.add.graphics();
    this.rarityBar.fillStyle(rarityColors.bg, 0.7);
    this.rarityBar.fillRect(0, this.TITLE_BAR_H, tooltipWidth, this.RARITY_BAR_H);

    const buttonY = tooltipHeight - padding - (this.BUTTON_ROW_H / 2);
    this.detailsButton = null;
    this.backButton = null;
    if (hasDetails) {
      if (this.pinned) {
        this.backButton = this.createBackButton(scene, tooltipWidth, buttonY);
      } else {
        this.detailsButton = this.createDetailsButton(scene, tooltipWidth, buttonY);
      }
    }

    const children: Phaser.GameObjects.GameObject[] = [
      this.bg,
      this.titleBar,
      this.rarityBar,
      this.titleText,
      this.subtitleText,
      this.bodyText
    ];
    if (this.detailsButton) children.push(this.detailsButton);
    if (this.backButton) children.push(this.backButton);
    this.container.add(children);

    const { x, y } = this.resolveTooltipPosition(scene, tooltipWidth, tooltipHeight);
    this.container.setPosition(x, y);
    scene.uiContainer.add(this.container);
  }

  private static resolveTooltipPosition(scene: BattleScene, tooltipWidth: number, tooltipHeight: number): { x: number; y: number } {
    const ptr = scene.game.input.mousePointer;
    if (ptr) {
      const reverse = ptr.x >= scene.game.canvas.width - (tooltipWidth * 6) - 12;
      const x = !reverse ? (ptr.x / 6 + 2) : (ptr.x / 6 - tooltipWidth - 2);
      const y = ptr.y / 6 + 2;
      return { x, y };
    }
    const screenWidth = scene.game.canvas.width / 6;
    const x = Math.max(0, Math.min(screenWidth - tooltipWidth, 2));
    const y = 2;
    return { x, y };
  }

  private static createDetailsButton(scene: BattleScene, tooltipWidth: number, y: number): Phaser.GameObjects.Container {
    const { gamepadType, iconPath, scale } = this.getStatsIconInfo(scene);
    const container = scene.add.container(tooltipWidth / 2, y);
    const keySprite = scene.add.sprite(-10, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0.5, 0.5);
    const label = addTextObject(scene, 0, 0, i18next.t("nodeMode:tooltipDetails", { defaultValue: "More Info" }), TextStyle.WINDOW, { fontSize: "35px" });
    label.setOrigin(0, 0.5);
    label.x = keySprite.x + (keySprite.displayWidth / 2) + 1;
    container.add([keySprite, label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-60, -6, 220, 12), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", () => this.handleStatsPressed(scene));
    return container;
  }

  private static createBackButton(scene: BattleScene, tooltipWidth: number, y: number): Phaser.GameObjects.Container {
    const { gamepadType, iconPath, scale } = this.getCancelIconInfo(scene);
    const container = scene.add.container(tooltipWidth / 2, y);
    const keySprite = scene.add.sprite(-10, 0, gamepadType);
    keySprite.setFrame(iconPath);
    keySprite.setScale(scale);
    keySprite.setOrigin(0.5, 0.5);
    const label = addTextObject(scene, 0, 0, i18next.t("nodeMode:tooltipBack", { defaultValue: "Back" }), TextStyle.WINDOW, { fontSize: "35px" });
    label.setOrigin(0, 0.5);
    label.x = keySprite.x + (keySprite.displayWidth / 2) + 1;
    container.add([keySprite, label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-60, -6, 220, 12), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", () => this.hide(scene));
    return container;
  }

  private static getStatsIconInfo(scene: BattleScene): { gamepadType: string; iconPath: string; scale: number } {
    let gamepadType: string;
    if (scene.inputMethod === "gamepad") {
      gamepadType = scene.inputController?.getConfig(scene.inputController.selectedDevice[Device.GAMEPAD])?.padType || "keyboard";
    } else if (scene.inputMethod === "touch") {
      gamepadType = "keyboard";
    } else {
      gamepadType = scene.inputMethod || "keyboard";
    }
    const isGamepad = gamepadType !== "keyboard" && scene.inputMethod !== "touch";
    const iconPath = isGamepad ? (scene.inputController?.getIconForLatestInputRecorded("BUTTON_STATS") || "C.png") : "C.png";
    return { gamepadType, iconPath, scale: isGamepad ? 0.62 : 0.5 };
  }

  private static getCancelIconInfo(scene: BattleScene): { gamepadType: string; iconPath: string; scale: number } {
    let gamepadType: string;
    if (scene.inputMethod === "gamepad") {
      gamepadType = scene.inputController?.getConfig(scene.inputController.selectedDevice[Device.GAMEPAD])?.padType || "keyboard";
    } else if (scene.inputMethod === "touch") {
      gamepadType = "keyboard";
    } else {
      gamepadType = scene.inputMethod || "keyboard";
    }
    const isGamepad = gamepadType !== "keyboard" && scene.inputMethod !== "touch";
    const iconPath = isGamepad ? (scene.inputController?.getIconForLatestInputRecorded("BUTTON_CANCEL") || "BACK.png") : "BACK.png";
    return { gamepadType, iconPath, scale: isGamepad ? 0.62 : 0.5 };
  }

  private static applyBbCodeWordWrap(textObj: BBCodeText, tooltipWidth: number, padding: number): void {
    const scaleX = textObj.scaleX || 1;
    const wrapWidthPreScale = Math.max(0, (tooltipWidth - padding * 2) / scaleX);
    const lineSpacing = textObj.lineSpacing;
    textObj.setStyle({
      ...(textObj.style as any),
      wordWrap: { width: wrapWidthPreScale, useAdvancedWrap: true }
    } as any);
    textObj.setLineSpacing(lineSpacing);
  }

  private static drawTooltipGradientBackground(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, _radius: number): void {
    const topColor = { r: 106, g: 15, b: 58 };
    const bottomColor = { r: 0, g: 0, b: 0 };
    const gradientSteps = 48;
    for (let step = 0; step < gradientSteps; step++) {
      const stepY = y + (step / gradientSteps) * height;
      const stepHeight = height / gradientSteps;
      const rawFactor = step / (gradientSteps - 1);
      const factor = Math.pow(rawFactor, 2.5);
      const r = Math.floor(topColor.r * (1 - factor) + bottomColor.r * factor);
      const g = Math.floor(topColor.g * (1 - factor) + bottomColor.g * factor);
      const b = Math.floor(topColor.b * (1 - factor) + bottomColor.b * factor);
      const color = (r << 16) | (g << 8) | b;
      const remainingHeight = (y + height) - stepY;
      if (remainingHeight <= 0) continue;
      graphics.fillStyle(color, 0.98);
      graphics.fillRect(x, stepY, width, Math.min(stepHeight, remainingHeight));
    }
  }

  private static getTooltipRarityForModifierType(type: ModifierType): SkillTreeRarity {
    const id = (type as any)?.id as string | undefined;
    const iconImage = (type as any)?.iconImage as string | undefined;
    if (iconImage === "quest_icon" || (id && id.endsWith("_QUEST"))) return SkillTreeRarity.MASTER;
    if (id === "PERMA_COLLECTED_TYPE") return SkillTreeRarity.LEGENDARY;
    if (id && id.startsWith("PERMA_")) {
      const rank = getPermaModifierRarity(id);
      if (rank <= 1) return SkillTreeRarity.ULTRA;
      if (rank === 2) return SkillTreeRarity.ROGUE;
      return SkillTreeRarity.MASTER;
    }

    const tier: ModifierTier | null = (type as any)?.tier ?? (typeof (type as any)?.getOrInferTier === "function" ? (type as any).getOrInferTier() : null);
    switch (tier) {
      case ModifierTier.MEH:
      case ModifierTier.COMMON:
        return SkillTreeRarity.COMMON;
      case ModifierTier.GREAT:
        return SkillTreeRarity.GREAT;
      case ModifierTier.ULTRA:
        return SkillTreeRarity.ULTRA;
      case ModifierTier.ROGUE:
        return SkillTreeRarity.ROGUE;
      case ModifierTier.MASTER:
        return SkillTreeRarity.MASTER;
      case ModifierTier.LUXURY:
        return SkillTreeRarity.LEGENDARY;
      default:
        return SkillTreeRarity.COMMON;
    }
  }

  private static getRarityText(rarity: SkillTreeRarity): string {
    const rarityString = rarity.toString();
    return i18next.t(`championSelect:rarity.${rarityString}`, { defaultValue: rarityString.toUpperCase() });
  }
}