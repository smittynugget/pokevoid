import Phaser from "phaser";
import i18next from "i18next";
import BattleScene from "#app/battle-scene";
import { addBBCodeTextObject, addTextObject, TextStyle } from "#app/ui/text";
import { getUpgradeRarityColors } from "#app/utils";
import { SkillTreeRarity } from "#app/system/skill-tree-data";
import type { ModifierType } from "#app/modifier/modifier-type";
import type { PersistentModifier } from "#app/modifier/modifier";
import { PermaRunQuestModifier } from "#app/modifier/modifier";
import { PermaPartyAbilityModifierType, PokemonAltBuildModifierType, TeraAbilityModifierType, TrainerBondAbilityModifierType, QuestModifierType, FORBIDDEN_FORM_REWARDTYPE_TO_FORMKEY } from "#app/modifier/modifier-type";
import { getPermaModifierRarity } from "#app/phases/modifier-reward-phase";
import { allAbilities } from "#app/data/ability";
import { RewardType } from "#enums/reward-type";
import type { QuestUnlockData } from "#app/system/game-data";
import { getPokemonSpecies, adjustDuelmonIconScale } from "#app/data/pokemon-species";
import { Button } from "#enums/buttons";
import { Device } from "#enums/devices";
import { ModifierTier } from "#app/modifier/modifier-tier";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { isPrimaryPointer } from "./pointer-utils";
import { attachModalBackground } from "./modal-background-utils";

export interface TooltipSection {
  label?: string;
  body: string;
  embeddedContainer?: Phaser.GameObjects.Container;
}

export interface ModifierTooltipData {
  title: string;
  subtitle: string;
  body: string;
  rarity: SkillTreeRarity;
  hasDetails?: boolean;
  lore?: string;
  sections?: TooltipSection[];
}

export class ModifierTooltipUtils {
  private static container: Phaser.GameObjects.Container | null = null;
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

  private static readonly PADDING = 6;
  private static readonly BUTTON_ROW_H = 10;

  static isPinned(): boolean {
    return this.pinned;
  }

  static setPinned(pinned: boolean): void {
    this.pinned = pinned;
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
    const lore = typeof typeAny.getTooltipLore === "function" ? String(typeAny.getTooltipLore(scene)) : undefined;
    const data: ModifierTooltipData = { title: String(type.name), subtitle, body, rarity, hasDetails: false, lore };
    this.show(scene, data, _anchor);
  }

  private static buildPartyAbilitySections(scene: BattleScene, type: PermaPartyAbilityModifierType): TooltipSection[] {
    const sections: TooltipSection[] = [];
    const desc = type.getDescription(scene).replace(/\n?\(Hold C.*?\)\.?/i, "").replace(/\n?\(Press P.*?\)\.?/i, "").trim();
    sections.push({ label: "DESCRIPTION", body: desc });
    const abilityData = allAbilities[(type as any).ability?.id];
    if (abilityData) {
      const abilityBody = `[color=#78c850]${abilityData.name}[/color]\n${abilityData.description || ""}`;
      sections.push({ label: "ABILITY", body: abilityBody });
    }
    return sections;
  }

  private static buildQuestSections(scene: BattleScene, type: QuestModifierType, progress?: string): TooltipSection[] {
    const sections: TooltipSection[] = [];
    const rarityColors = getUpgradeRarityColors(SkillTreeRarity.LEGENDARY);
    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;
    const localeNameKey = `quests:${(type as any).id}.name`;
    const oldName = i18next.exists(localeNameKey) ? (i18next.t(localeNameKey) as string) : ((type as any).config?.name || "");
    const taskText = (type as any).config?.task || type.getDescription(scene);
    const descLines: string[] = [];
    if (oldName) descLines.push(`[color=${rarityHex}]${oldName}[/color]`);
    if (taskText && taskText !== oldName) descLines.push(taskText);
    const descBody = progress ? `${descLines.join("\n")}\n${progress}` : descLines.join("\n");
    sections.push({ label: "DESCRIPTION", body: descBody });
    let rewardText = (type as any).config?.questUnlockData?.rewardText;
    if (!rewardText && (type as any).config?.questUnlockData) {
      rewardText = this.buildQuestRewardFallback((type as any).config.questUnlockData);
    }
    const formContainer = this.buildQuestFormRewardIcon(scene, (type as any).config?.questUnlockData, rewardText || "");
    if (formContainer) {
      sections.push({ label: "REWARD", body: "", embeddedContainer: formContainer });
    } else if (rewardText) {
      const rewardContainer = this.buildQuestRewardTextContainer(scene, rewardText);
      sections.push({ label: "REWARD", body: "", embeddedContainer: rewardContainer });
    }
    return sections;
  }

  private static buildQuestRewardTextContainer(scene: BattleScene, rewardText: string): Phaser.GameObjects.Container {
    const tooltipW = 120;
    const padding = 6;
    const container = scene.add.container(0, 0);
    const centerTextX = (tooltipW - padding * 2) / 2;
    const rarityColors = getUpgradeRarityColors(SkillTreeRarity.LEGENDARY);
    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;
    const label = addTextObject(scene, centerTextX, 0, rewardText, TextStyle.PARTY, { fontSize: "36px" });
    label.setOrigin(0.5, 0);
    label.setColor(rarityHex);
    label.setShadow(0, 0, undefined);
    label.setStroke("#1a1a2e", 10);
    label.setWordWrapWidth((tooltipW - padding * 2) / (label.scaleX || 0.1667));
    (label.style as any).align = "center";
    container.add(label);
    const h = label.displayHeight + 2;
    container.setData("renderedHeight", h);
    return container;
  }

  private static buildQuestRewardFallback(data: QuestUnlockData): string {
    switch (data.rewardType) {
      case RewardType.GAME_MODE:
        return i18next.t("quests:rewardUnlocksGameMode", { defaultValue: "Unlocks a new game mode" });
      case RewardType.MODIFIER:
        return i18next.t("quests:rewardUnlocksModifier", { defaultValue: "Unlocks a new modifier" });
      case RewardType.PERMA_MODIFIER:
        return i18next.t("quests:rewardUnlocksPermaModifier", { defaultValue: "Unlocks a permanent modifier" });
      case RewardType.PERMA_MONEY:
        return i18next.t("quests:rewardGrantsPermaMoney", { defaultValue: "Grants Ω Gold" });
      case RewardType.PERMA_MONEY_AND_MODIFIER:
        return i18next.t("quests:rewardGrantsPermaMoneyAndModifier", { defaultValue: "Grants Ω Gold and unlocks a modifier" });
      case RewardType.NEW_MOVES_FOR_SPECIES:
        return i18next.t("quests:rewardUnlocksNewMoves", { defaultValue: "Unlocks new moves for a Pokémon" });
      case RewardType.GLITCH_FORM_A:
      case RewardType.GLITCH_FORM_B:
      case RewardType.GLITCH_FORM_C:
      case RewardType.GLITCH_FORM_D:
      case RewardType.GLITCH_FORM_E:
        return i18next.t("quests:rewardUnlocksGlitchForm", { defaultValue: "Unlocks a Glitch Form" });
      case RewardType.SMITTY_FORM:
      case RewardType.SMITTY_FORM_B:
        return i18next.t("quests:rewardUnlocksSmittyForm", { defaultValue: "Unlocks a Smitty Form" });
      case RewardType.UNLOCKABLE:
        return i18next.t("quests:rewardUnlocksContent", { defaultValue: "Unlocks new content" });
      default:
        return i18next.t("quests:rewardUnlocksContent", { defaultValue: "Unlocks new content" });
    }
  }

  private static buildQuestFormRewardIcon(scene: BattleScene, data?: QuestUnlockData, rewardText?: string): Phaser.GameObjects.Container | null {
    if (!data) return null;
    const formKey = FORBIDDEN_FORM_REWARDTYPE_TO_FORMKEY[data.rewardType];
    if (!formKey) return null;
    const speciesId = Array.isArray(data.rewardId) ? data.rewardId[0] : data.rewardId;
    if (typeof speciesId !== "number") return null;
    const species = getPokemonSpecies(speciesId);
    if (!species) return null;
    const formIndex = species.forms.findIndex((f: any) => f.formKey === formKey);
    if (formIndex < 0) return null;
    const form = species.forms[formIndex];
    const atlasKey = form.getIconAtlasKey(formIndex, false, 0);
    const frameId = form.getIconId(false, formIndex, false, 0);
    const tooltipW = 120;
    const container = scene.add.container(0, 0);
    let currentY = 0;
    const rarityColors = getUpgradeRarityColors(SkillTreeRarity.LEGENDARY);
    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;
    if (rewardText) {
      const padding = 6;
      const centerTextX = (tooltipW - padding * 2) / 2;
      const label = addTextObject(scene, centerTextX, currentY, rewardText, TextStyle.PARTY, { fontSize: "36px" });
      label.setOrigin(0.5, 0);
      label.setColor(rarityHex);
      label.setShadow(0, 0, undefined);
      label.setStroke("#1a1a2e", 10);
      label.setWordWrapWidth((tooltipW - padding * 2) / (label.scaleX || 0.1667));
      (label.style as any).align = "center";
      container.add(label);
      currentY += label.displayHeight + 3;
    }
    const centerX = (tooltipW - 12) / 2;
    const iconScale = adjustDuelmonIconScale(0.5, species.generation);
    const icon = scene.add.sprite(centerX, currentY, atlasKey);
    if (!atlasKey.startsWith("pokemon_icons_mod_")) {
      icon.setFrame(frameId);
      if (icon.frame && icon.frame.name !== frameId) {
        icon.setFrame("smitom");
      }
    }
    icon.setScale(iconScale);
    icon.setOrigin(0.5, 0);
    icon.setTintFill(0x000000);
    container.add(icon);
    currentY += Math.ceil(icon.displayHeight) + 2;
    container.setData("renderedHeight", currentY);
    return container;
  }

  static showForModifier(scene: BattleScene, modifier: PersistentModifier, _anchor?: { x: number; y: number }, opts?: { context?: string }): void {
    const meta = (modifier as any)?.skillTreeTooltip;
    if (meta?.title && meta?.body && meta?.rarity && !(modifier instanceof PermaRunQuestModifier)) {
      const rarity = meta.rarity as SkillTreeRarity;
      const subtitle = this.getRarityText(rarity);
      const isPartyAbility = modifier.type instanceof PermaPartyAbilityModifierType;
      const useModifierTypeInfo = isPartyAbility
        || modifier.type instanceof PokemonAltBuildModifierType
        || modifier.type instanceof TeraAbilityModifierType
        || modifier.type instanceof TrainerBondAbilityModifierType;
      const title = useModifierTypeInfo ? String(modifier.type.name) : String(meta.title);
      const typeAny: any = modifier.type as any;
      const body = useModifierTypeInfo
        ? (typeof typeAny.getTooltipDescription === "function" ? String(typeAny.getTooltipDescription(scene)) : String(modifier.type.getDescription(scene)))
        : String(meta.body);
      let lore = typeof typeAny.getTooltipLore === "function" ? String(typeAny.getTooltipLore(scene)) : undefined;
      if (isPartyAbility && (modifier as any).remainingCount !== undefined) {
        const remaining = (modifier as any).remainingCount;
        const durationLine = i18next.t("modifierType:permaWaveTooltip", { count: remaining });
        const removeHint = i18next.t("modifierType:permaRemoveHint");
        lore = `${durationLine}\n${removeHint}`;
      }
      let sections: TooltipSection[] | undefined = undefined;
      if (isPartyAbility) {
        sections = this.buildPartyAbilitySections(scene, modifier.type as PermaPartyAbilityModifierType);
      }
      const data: ModifierTooltipData = { title, subtitle, body: sections ? "" : body, rarity, hasDetails: false, lore, sections };
      this.show(scene, data, _anchor);
      return;
    }

    let bodyOverride: string | null = null;
    let questLore: string | undefined = undefined;
    let questSections: TooltipSection[] | undefined = undefined;
    if (modifier instanceof PermaRunQuestModifier) {
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
        const typeAny: any = modifier.type as any;
        const baseBody = typeof typeAny.getTooltipDescription === "function"
          ? String(typeAny.getTooltipDescription(scene))
          : String(modifier.type.getDescription(scene));
        if (typeof currentCount === "number" && typeof goalCount === "number" && goalCount > 1) {
          bodyOverride = `${baseBody}\n(${currentCount}/${goalCount})`;
        } else {
          bodyOverride = baseBody;
        }
        questLore = typeof typeAny.getTooltipLore === "function" ? String(typeAny.getTooltipLore(scene)) : undefined;
        if (modifier.type instanceof QuestModifierType) {
          const progress = (typeof currentCount === "number" && typeof goalCount === "number" && goalCount > 1)
            ? `(${currentCount}/${goalCount})` : undefined;
          questSections = this.buildQuestSections(scene, modifier.type, progress);
        }
      } catch {
      }
    }

    if (bodyOverride) {
      const rarity = this.getTooltipRarityForModifierType(modifier.type as any);
      const subtitle = this.getRarityText(rarity);
      const data: ModifierTooltipData = {
        title: String(modifier.type.name),
        subtitle,
        body: questSections ? "" : bodyOverride,
        rarity,
        hasDetails: false,
        lore: questLore,
        sections: questSections
      };
      this.show(scene, data, _anchor);
      return;
    }

    if (modifier.type instanceof PermaPartyAbilityModifierType && (modifier as any).remainingCount !== undefined) {
      const remaining = (modifier as any).remainingCount;
      const durationLine = i18next.t("modifierType:permaWaveTooltip", { count: remaining });
      const removeHint = i18next.t("modifierType:permaRemoveHint");
      const rarity = this.getTooltipRarityForModifierType(modifier.type as any);
      const sections = this.buildPartyAbilitySections(scene, modifier.type);
      this.show(scene, {
        title: String(modifier.type.name),
        subtitle: this.getRarityText(rarity),
        body: "",
        rarity,
        hasDetails: false,
        lore: `${durationLine}\n${removeHint}`,
        sections,
      }, _anchor);
      return;
    }

    this.showForModifierType(scene, modifier.type as any, _anchor, opts);
  }

  private static currentAnchor: { x: number; y: number } | undefined = undefined;

  static show(scene: BattleScene, data: ModifierTooltipData, anchor?: { x: number; y: number }): void {
    this.currentScene = scene;
    this.currentData = data;
    this.currentAnchor = anchor;
    this.pinned = false;
    this.buildTooltip(scene, data, anchor);
  }

  static hide(scene: BattleScene): void {
    this.pinned = false;
    this.currentScene = null;
    this.currentData = null;
    this.currentAnchor = undefined;
    if (this.container) {
      this.container.destroy();
    }
    this.container = null;
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
    this.buildTooltip(scene, this.currentData, this.currentAnchor);
  }

  private static buildTooltip(scene: BattleScene, data: ModifierTooltipData, anchor?: { x: number; y: number }): void {
    if (this.container) {
      this.container.destroy();
    }
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10000000000);

    const rarityColors = getUpgradeRarityColors(data.rarity);
    const tooltipWidth = 120;
    const padding = this.PADDING;

    const subtitleDisplay = data.subtitle || this.getRarityText(data.rarity);

    this.titleText = addTextObject(scene, tooltipWidth / 2 + 2, 8, data.title, TextStyle.WINDOW, { fontSize: "40px", fontStyle: "bold" });
    this.titleText.setOrigin(0.5, 0.5);
    const rarityHex = "#" + rarityColors.border.toString(16).padStart(6, "0");
    this.titleText.setColor(rarityHex);

    this.subtitleText = addTextObject(scene, tooltipWidth / 2 + 2, 17, subtitleDisplay, TextStyle.WINDOW, { fontSize: "30px" });
    this.subtitleText.setOrigin(0.5, 0.5);
    this.subtitleText.setTint(rarityColors.border);

    this.bodyText = addBBCodeTextObject(scene, padding + 2, 22, data.body, TextStyle.WINDOW, { fontSize: "36px" });
    this.bodyText.setOrigin(0, 0);
    this.applyBbCodeWordWrap(this.bodyText, tooltipWidth, padding);

    let contentBottom = this.bodyText.y + this.bodyText.displayHeight;

    const sectionChildren: Phaser.GameObjects.GameObject[] = [];
    if (data.sections && data.sections.length > 0) {
      for (const section of data.sections) {
        if (section.label) {
          const sectionHeader = addTextObject(scene, padding + 2, contentBottom + 4, section.label, TextStyle.WINDOW, {
            fontSize: "33px",
            fontFamily: "pkmnems",
          });
          sectionHeader.setOrigin(0, 0.5);
          sectionHeader.setColor("#666666");
          sectionHeader.setAlpha(0.72);
          sectionHeader.setShadow(0, 0, undefined);
          sectionHeader.setLetterSpacing(2);
          sectionChildren.push(sectionHeader);

          const headerLine = scene.add.graphics();
          headerLine.lineStyle(0.5, 0x666666, 0.6);
          const lineStartX = padding + 2 + sectionHeader.displayWidth + 4;
          const lineEndX = tooltipWidth - padding - 2;
          if (lineEndX > lineStartX) {
            headerLine.lineBetween(lineStartX, contentBottom + 4, lineEndX, contentBottom + 4);
          }
          sectionChildren.push(headerLine);
          contentBottom += sectionHeader.displayHeight + 2;
        }

        if (section.body) {
          const sectionBody = addBBCodeTextObject(scene, padding + 2, contentBottom + 2, section.body, TextStyle.WINDOW, { fontSize: "36px" });
          sectionBody.setOrigin(0, 0);
          sectionBody.setColor("#ffffff");
          this.applyBbCodeWordWrap(sectionBody, tooltipWidth, padding);
          sectionChildren.push(sectionBody);
          contentBottom = sectionBody.y + sectionBody.displayHeight;
        }

        if (section.embeddedContainer) {
          section.embeddedContainer.setPosition(padding, contentBottom + 2);
          sectionChildren.push(section.embeddedContainer);
          const renderedH = section.embeddedContainer.getData("renderedHeight");
          if (typeof renderedH === "number" && renderedH > 0) {
            contentBottom += renderedH + 2;
          } else {
            const bounds = section.embeddedContainer.getBounds();
            contentBottom += (bounds.height / 6) + 2;
          }
        }
      }
    }

    let loreBarHeight = 0;
    let loreStripe: Phaser.GameObjects.Graphics | null = null;
    let loreText: BBCodeText | null = null;
    if (data.lore) {
      const loreStripePad = 3;
      loreText = addBBCodeTextObject(scene, tooltipWidth / 2, 0, data.lore, TextStyle.WINDOW, { fontSize: "30px", fontStyle: "italic" });
      loreText.setOrigin(0.5, 0);
      loreText.setColor("#B0B0B0");
      const loreScaleX = loreText.scaleX || 1;
      const loreWrapWidth = Math.max(0, (tooltipWidth - padding * 2 - 8) / loreScaleX);
      loreText.setStyle({ ...(loreText.style as any), wordWrap: { width: loreWrapWidth, useAdvancedWrap: true } } as any);
      const loreTextH = Math.min(loreText.displayHeight, 50);
      loreBarHeight = loreTextH + loreStripePad * 2;
    }

    const hasDetails = !!data.hasDetails;
    let tooltipHeight = contentBottom + padding + loreBarHeight;
    tooltipHeight += hasDetails ? (this.BUTTON_ROW_H + padding) : padding;

    const bgNineSlice = scene.add.nineslice(0, 0, "tooltip_info", undefined, tooltipWidth, Math.round(tooltipHeight), 12, 12, 12, 12);
    bgNineSlice.setOrigin(0, 0);

    this.titleBar = scene.add.graphics();

    this.rarityBar = scene.add.graphics();
    this.rarityBar.fillStyle(0x0f0f1e, 1.0);
    this.rarityBar.fillRect(2, 14, tooltipWidth - 4, 6);

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

    if (data.lore && loreText && loreBarHeight > 0) {
      const bottomInset = 2;
      const loreBarY = tooltipHeight - bottomInset - loreBarHeight;
      loreStripe = scene.add.graphics();
      loreStripe.fillStyle(0x0f0f1e, 0.85);
      loreStripe.fillRect(2, loreBarY, tooltipWidth - 4, loreBarHeight);
      loreText.setPosition(tooltipWidth / 2, loreBarY + 3);
    }

    const children: Phaser.GameObjects.GameObject[] = [
      bgNineSlice,
      this.titleBar,
      this.rarityBar,
      this.titleText,
      this.subtitleText,
      this.bodyText
    ];
    for (const sc of sectionChildren) children.push(sc);
    if (loreStripe) children.push(loreStripe);
    if (loreText) children.push(loreText);
    if (this.detailsButton) children.push(this.detailsButton);
    if (this.backButton) children.push(this.backButton);
    this.container.add(children);

    const finalTooltipWidth = tooltipWidth;
    const finalTooltipHeight = Math.round(tooltipHeight);
    attachModalBackground(scene, this.container, () => ({
      bgX: 0, bgY: 0, bgWidth: finalTooltipWidth, bgHeight: finalTooltipHeight
    }), { mask: false, alphaMultiplier: 0.6 });

    const { x, y } = this.resolveTooltipPosition(scene, tooltipWidth, tooltipHeight, anchor);
    this.container.setPosition(x, y);
    scene.uiContainer.add(this.container);
  }

  private static resolveTooltipPosition(scene: BattleScene, tooltipWidth: number, tooltipHeight: number, anchor?: { x: number; y: number }): { x: number; y: number } {
    const screenW = scene.game.canvas.width / 6;
    const screenH = scene.game.canvas.height / 6;

    if (anchor) {
      const iconHalfW = 5;
      const tipGap = 4;
      const anchorX = anchor.x / 6;
      const anchorY = anchor.y / 6;
      const xRight = anchorX + iconHalfW + tipGap;
      const xLeft = anchorX - iconHalfW - tipGap - tooltipWidth;
      let x = xRight + tooltipWidth > screenW ? xLeft : xRight;
      x = Math.max(4, Math.min(screenW - tooltipWidth - 4, x));
      let y = anchorY - tooltipHeight / 2;
      y = Math.max(4, Math.min(screenH - tooltipHeight - 4, y));
      return { x, y };
    }

    const ptr = scene.game.input.mousePointer;
    if (ptr) {
      const reverse = ptr.x >= scene.game.canvas.width - (tooltipWidth * 6) - 12;
      const x = !reverse ? (ptr.x / 6 + 2) : (ptr.x / 6 - tooltipWidth - 2);
      const y = ptr.y / 6 + 2;
      return { x, y };
    }
    const x = Math.max(0, Math.min(screenW - tooltipWidth, 2));
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
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      this.handleStatsPressed(scene);
    });
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
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      this.hide(scene);
    });
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
  private static getTooltipRarityForModifierType(type: ModifierType): SkillTreeRarity {
    const id = (type as any)?.id as string | undefined;
    const iconImage = (type as any)?.iconImage as string | undefined;
    if (iconImage === "quest_icon" || (id && id.endsWith("_QUEST"))) return SkillTreeRarity.LEGENDARY;
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