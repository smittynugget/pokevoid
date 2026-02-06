import BattleScene from "../battle-scene";
import { MoveUpgradeModifierType } from "../modifier/modifier-type";
import { MoveUpgradeModifier } from "../modifier/modifier";
import Move, {
  allMoves, MoveCategory, MoveFlags, MultiHitAttr, FlinchAttr, RecoilAttr,
  SacrificialAttr, HalfSacrificialAttr, SacrificialAttrOnHit, HealAttr,
  HitHealAttr, HighCritAttr, CritOnlyAttr, ChargeAttr, StatusEffectAttr,
  StatChangeAttr, MultiHitType, RemoveHeldItemAttr, StealHeldItemChanceAttr,
  ConfuseAttr, AddBattlerTagAttr, WeatherChangeAttr, ClearWeatherAttr,
  TerrainChangeAttr, ClearTerrainAttr, AddArenaTrapTagAttr, AddArenaTrapTagUpgradeAttr, MatchUserTypeAttr,
  WeatherBallTypeAttr, TerrainPulseTypeAttr, HiddenPowerTypeAttr, TypelessAttr,
  AnyTypeSuperEffectTypeMultiplierAttr, GyroBallPowerAttr, ElectroBallPowerAttr,
  WeightPowerAttr, CompareWeightPowerAttr, HpPowerAttr, LowHpPowerAttr,
  ConsecutiveUseDoublePowerAttr, TurnDamagedDoublePowerAttr, TerrainMovePriorityAttr,
  FirstTurnPriorityAttr, ForceSwitchOutAttr, SurviveDamageAttr, TrapAttr,
  FixedDamageAttr, LevelDamageAttr, TargetHalfHpDamageAttr,
  IgnoreOpponentStatChangesAttr, RemoveScreensAttr, ConditionalPriorityAttr,
  IncrementMovePriorityAttr,
  MultiStatusEffectAttr
} from "../data/move";
import { Type } from "../data/type";
import { BattleStat, getBattleStatName } from "../data/battle-stat";
import { getStatusEffectMessageKey } from "../data/status-effect";
import { BattlerTagType } from "../enums/battler-tag-type";
import { ArenaTagType } from "../enums/arena-tag-type";
import { WeatherType } from "../data/weather";
import { TerrainType } from "../data/terrain";
import * as Utils from "../utils";
import { getUpgradeRarityFromTier, getUpgradeRarityColors } from "../utils";
import { UpgradeCategory, UpgradeCategoryUtils } from "../enums/upgrade-category";
import { SkillTreeRarity } from "../system/skill-tree-data";
import i18next from "i18next";
import { getBBCodeFrag, TextStyle, addBBCodeTextObject, addTextObject } from "./text";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { MoveUpgrade } from "../data/move-upgrade";

export class MoveUpgradeTooltipUtils {

  private static tooltipContainer: Phaser.GameObjects.Container | null = null;
  private static tooltipBg: Phaser.GameObjects.Graphics | null = null;
  private static tooltipTitleBarBg: Phaser.GameObjects.Graphics | null = null;
  private static tooltipRarityBarBg: Phaser.GameObjects.Graphics | null = null;
  private static tooltipTitle: Phaser.GameObjects.Text | null = null;
  private static tooltipSubtitle: Phaser.GameObjects.Text | null = null;
  private static tooltipBody: BBCodeText | null = null;
  private static detailsButton: Phaser.GameObjects.Container | null = null;
  private static backButton: Phaser.GameObjects.Container | null = null;
  private static navContainer: Phaser.GameObjects.Container | null = null;
  private static _tooltipPattern: ModalBackgroundHandle | null = null;
  private static detailsActive: boolean = false;
  private static previewTier: number = 1;
  private static currentTier: number = 1;
  private static previewMaxTier: number = 1;
  private static previewCategory: UpgradeCategory | null = null;
  private static previewMoveId: number | null = null;
  private static previewMoveName: string | null = null;
  private static lastTooltipX: number = 0;
  private static lastTooltipY: number = 0;
  private static sourceModifierType: MoveUpgradeModifierType | null = null;
  private static sourceScene: BattleScene | null = null;
  private static sourceIconPosition: { x: number; y: number } | null = null;
  private static sourceIsPlayer: boolean = true;
  private static keyLeftHandler: ((event: KeyboardEvent) => void) | null = null;
  private static keyRightHandler: ((event: KeyboardEvent) => void) | null = null;
  private static keyEscapeHandler: ((event: KeyboardEvent) => void) | null = null;
  private static readonly TOOLTIP_CONSTANTS = {
    MIN_WIDTH: 70,
    MAX_WIDTH: 120,
    TITLE_BAR_HEIGHT: 12,
    TITLE_BAR_Y: 0,
    RARITY_BAR_HEIGHT: 6,
    RARITY_BAR_Y: 12,
    CONTENT_Y: 23,
    TITLE_TEXT_Y: 6,
    RARITY_TEXT_Y: 15,
    TITLE_FONT_SIZE: "40px",
    BODY_FONT_SIZE: "40px",
    RADIUS: 0,
    BORDER_THICKNESS: 0.5,
    BORDER_COLOR: 0xffffff,
    BORDER_ALPHA: 0.5,
    PADDING: 6,
    LINE_HEIGHT: 8,
    TITLE_BAR_COLOR: 0xFFD700,
    TITLE_BAR_ALPHA: 0.7,
    SUBHEADER_BAR_COLOR: 0x00BFFF,
    SUBHEADER_BAR_ALPHA: 0.7,
  };

  private static readonly TOOLTIP_WIDTH = 550 / 6;
  private static readonly TOOLTIP_BASE_HEIGHT = 375 / 6;
  private static multiHitWarning: boolean = false;
  private static flinchWarning: boolean = false;
  private static secondaryEffectNote: boolean = false;
  private static lineCount: number = 0;

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

  static generateComparison(scene: BattleScene, modifierType: MoveUpgradeModifierType, isPlayerMove: boolean): string {
    this.multiHitWarning = false;
    this.flinchWarning = false;
    this.secondaryEffectNote = false;
    this.lineCount = 0;

    const tempModifier = modifierType.newModifier() as MoveUpgradeModifier;
    const moveId = tempModifier.moveId;

    const currentMove = allMoves[moveId];
    const upgradedMove = scene.getUpgradedMove(allMoves[moveId], isPlayerMove);
    const uiTheme = scene.uiTheme;

    const lines: string[] = [];

    let displayTier = tempModifier.upgradeTier;
    let displayCategory: string | undefined = i18next.t(`moveUpgradeAttrs:${tempModifier.upgradeCategory}`);
    let shouldShowEX = false;

    const activeUpgrades = scene.getUpgradesForMove(moveId);

    if (!tempModifier.upgradeCategory) {
      const categoryUpgrade = activeUpgrades.find(upgrade => upgrade.upgradeCategory);
      if (categoryUpgrade) {
        displayTier = categoryUpgrade.upgradeTier;
      }
        displayCategory = i18next.t("moveUpgradeAttrs:extraEffectUpgrade");
        shouldShowEX = true;
    } else {
      displayCategory = `${displayCategory} ${i18next.t(`moveUpgradeAttrs:path`)}`;
      const hasNonCategoryUpgrade = activeUpgrades.some(upgrade => !upgrade.upgradeCategory);
      if (hasNonCategoryUpgrade) {
        shouldShowEX = true;
      }
    }

    const tierDisplay = displayTier ? ` ${Utils.intToRoman(displayTier)}` : "";
    const exDisplay = shouldShowEX ? ` ${i18next.t("moveUpgradeAttrs:EX")}` : "";
    const moveName = getBBCodeFrag(`${currentMove.name}${tierDisplay}${exDisplay}`, TextStyle.SUMMARY_GOLD, uiTheme);
    lines.push(moveName);

    if (displayCategory) {
      const categoryInfo = getBBCodeFrag(displayCategory, TextStyle.PERFECT_IV, uiTheme);
      lines.push(categoryInfo);
    }

    const isMultiHit = currentMove.attrs.some(attr => attr instanceof MultiHitAttr || attr.constructor.name.includes('MultiHit'));
    if (isMultiHit) {
      const warningText = `${i18next.t("moveUpgradeAttrs:multiHitWarning")}`;
      this.multiHitWarning = true;
      lines.push(getBBCodeFrag(warningText, TextStyle.SUMMARY_GRAY, uiTheme));
    }

    const isFlinch = currentMove.attrs.some(attr => attr instanceof FlinchAttr);
    if (isFlinch) {
      const warningText = `${i18next.t("moveUpgradeAttrs:flinchWarning")}`;
      this.flinchWarning = true;
      lines.push(getBBCodeFrag(warningText, TextStyle.SUMMARY_GRAY, uiTheme));
    }

    lines.push('');

    lines.push(...this.compareBasicStats(scene, currentMove, upgradedMove));
    if (currentMove.chance > 0 || upgradedMove.chance > 0) {
      lines.push('');
      this.secondaryEffectNote = true;
      const chanceNoteText = `*${i18next.t("moveUpgradeAttrs:secondaryEffectNote")}`;
      lines.push(getBBCodeFrag(chanceNoteText, TextStyle.SUMMARY_GRAY, uiTheme));
    }

    this.lineCount = lines.filter(line => line !== undefined).length;
    return lines.filter(line => line !== undefined).join('\n');
  }

  static generateMoveDetails(scene: BattleScene, moveId: number): string {
    const move = allMoves[moveId];
    if (!move) return "";

    const uiTheme = scene.uiTheme;
    const lines: string[] = [];

    if (move.effect) {
      const desc = getBBCodeFrag(`[size=37]${move.effect}[/size]`, TextStyle.WINDOW, uiTheme);
      lines.push(desc);
      lines.push('');
    }

    const powerAccuracyParts: string[] = [];
    if (move.power > 0) {
      const powerLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:power"), TextStyle.SUMMARY_GOLD, uiTheme);
      const power = getBBCodeFrag(move.power.toString(), TextStyle.WINDOW, uiTheme);
      powerAccuracyParts.push(`${powerLabel}: ${power}`);
    }
    if (move.accuracy > 0) {
      const accuracyLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:accuracy"), TextStyle.SUMMARY_GOLD, uiTheme);
      const accuracy = getBBCodeFrag(`${move.accuracy}%`, TextStyle.WINDOW, uiTheme);
      powerAccuracyParts.push(`${accuracyLabel}: ${accuracy}`);
    }
    if (powerAccuracyParts.length > 0) {
      lines.push(powerAccuracyParts.join(' | '));
    }

    const categoryLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:category"), TextStyle.SUMMARY_GOLD, uiTheme);
    const typeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:type"), TextStyle.SUMMARY_GOLD, uiTheme);
    const category = getBBCodeFrag(MoveCategory[move.category], TextStyle.WINDOW, uiTheme);
    const type = getBBCodeFrag(Type[move.type], TextStyle.WINDOW, uiTheme);
    lines.push(`${categoryLabel}: ${category} | ${typeLabel}: ${type}`);

    return lines.filter(line => line !== undefined && line !== '').join('\n');
  }

  private static extractSingleMoveDetails(scene: BattleScene, move: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const recoilAttr = move.getAttrs(RecoilAttr)[0] as RecoilAttr | undefined;
    if (recoilAttr) {
      const recoil = Math.round(recoilAttr.damageRatio * 100);
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:recoilDamage"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(`${recoil}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${label}: ${value}`);
    }

    const healAttr = move.getAttrs(HealAttr)[0] as HealAttr | undefined;
    const hitHealAttr = move.getAttrs(HitHealAttr)[0] as HitHealAttr | undefined;
    const heal = healAttr ? Math.round(healAttr.healRatio * 100) :
                hitHealAttr ? Math.round(hitHealAttr.healRatio * 100) : 0;
    if (heal > 0) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:healAmount"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(`${heal}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${label}: ${value}`);
    }

    const getSacrificeType = (): string => {
      if (move.hasAttr(SacrificialAttr)) return i18next.t("moveUpgradeAttrs:sacrificialFull");
      if (move.hasAttr(HalfSacrificialAttr)) return i18next.t("moveUpgradeAttrs:sacrificialHalf");
      if (move.hasAttr(SacrificialAttrOnHit)) return i18next.t("moveUpgradeAttrs:sacrificialOnHit");
      return "";
    };
    const sacrifice = getSacrificeType();
    if (sacrifice) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:sacrificial"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(sacrifice, TextStyle.WINDOW, uiTheme);
      lines.push(`${label}: ${value}`);
    }

    const multiHitAttr = move.getAttrs(MultiHitAttr)[0] as MultiHitAttr | undefined;
    if (multiHitAttr) {
      const getMultiHitDescription = (type: MultiHitType): string => {
        switch (type) {
          case MultiHitType._2: return "2";
          case MultiHitType._3: return "3";
          case MultiHitType._2_TO_5: return "2-5";
          case MultiHitType._4_TO_8: return "4-8";
          default: return "1";
        }
      };
      const hits = getMultiHitDescription(multiHitAttr.getMultiHitType);
      if (hits !== "1") {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:multiHitType"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(hits, TextStyle.WINDOW, uiTheme);
        lines.push(`${label}: ${value}`);
      }
    }

    if (move.hasAttr(HighCritAttr)) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:critRate"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:critRateHigh"), TextStyle.WINDOW, uiTheme);
      lines.push(`${label}: ${value}`);
    } else if (move.hasAttr(CritOnlyAttr)) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:critRate"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:critRateAlways"), TextStyle.WINDOW, uiTheme);
      lines.push(`${label}: ${value}`);
    }

    if (move.hasAttr(ChargeAttr)) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:chargeRequired"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:chargeRequiredYes"), TextStyle.WINDOW, uiTheme);
      lines.push(`${label}: ${value}`);
    }

    const statusAttr = move.getAttrs(StatusEffectAttr)[0] as StatusEffectAttr | undefined;
    if (statusAttr && statusAttr.effect !== undefined) {
      const statusKey = getStatusEffectMessageKey(statusAttr.effect);
      const statusName = i18next.t(statusKey);
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statusEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(statusName, TextStyle.WINDOW, uiTheme);
      lines.push(`${label}: ${value}`);
    }

    return lines;
  }

  private static compareBasicStats(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;
    if (currentMove.power !== upgradedMove.power && upgradedMove.power > 0) {
      const powerLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:power"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentPower = getBBCodeFrag(currentMove.power.toString(), upgradedMove.power > currentMove.power ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newPower = getBBCodeFrag(upgradedMove.power.toString(), upgradedMove.power > currentMove.power ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${powerLabel}: ${currentPower}${arrow}${newPower}`);
    } else if (currentMove.power > 0) {
      const powerLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:power"), TextStyle.SUMMARY_GOLD, uiTheme);
      const power = getBBCodeFrag(currentMove.power.toString(), TextStyle.WINDOW, uiTheme);
      lines.push(`${powerLabel}: ${power}`);
    }
    if (currentMove.accuracy !== upgradedMove.accuracy && upgradedMove.accuracy > 0) {
      const accuracyLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:accuracy"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentAcc = getBBCodeFrag(`${currentMove.accuracy}%`, upgradedMove.accuracy > currentMove.accuracy ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newAcc = getBBCodeFrag(`${upgradedMove.accuracy}%`, upgradedMove.accuracy > currentMove.accuracy ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${accuracyLabel}: ${currentAcc}${arrow}${newAcc}`);
    } else if (currentMove.accuracy > 0) {
      const accuracyLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:accuracy"), TextStyle.SUMMARY_GOLD, uiTheme);
      const accuracy = getBBCodeFrag(`${currentMove.accuracy}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${accuracyLabel}: ${accuracy}`);
    }
    if (currentMove.chance !== upgradedMove.chance && upgradedMove.chance > 0) {
      const chanceLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:chance"), TextStyle.SUMMARY_GOLD, uiTheme);
      const displayCurrentChance = currentMove.chance === -1 ? 0 : currentMove.chance;
      let displayUpgradedChance = upgradedMove.chance === -1 ? 0 : upgradedMove.chance;
      const isFlinch = currentMove.attrs.some(attr => attr instanceof FlinchAttr);
      if (isFlinch && displayUpgradedChance > 30) {
        displayUpgradedChance = 30;
      }

      const currentChance = getBBCodeFrag(`${displayCurrentChance}%`, upgradedMove.chance > currentMove.chance ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newChance = getBBCodeFrag(`${displayUpgradedChance}%`, upgradedMove.chance > currentMove.chance ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${chanceLabel}: ${currentChance}${arrow}${newChance}`);
    } else if (currentMove.chance > 0) {
      const chanceLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:chance"), TextStyle.SUMMARY_GOLD, uiTheme);
      const chance = getBBCodeFrag(`${currentMove.chance}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${chanceLabel}: ${chance}`);
    }
    const currentEffectivePriority = this.calculateEffectivePriority(currentMove);
    const upgradedEffectivePriority = this.calculateEffectivePriority(upgradedMove);

    if (currentEffectivePriority !== upgradedEffectivePriority && upgradedEffectivePriority !== 0) {
      const priorityLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:priority"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentPriority = getBBCodeFrag(currentEffectivePriority.toString(), upgradedEffectivePriority > currentEffectivePriority ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newPriority = getBBCodeFrag(upgradedEffectivePriority.toString(), upgradedEffectivePriority > currentEffectivePriority ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${priorityLabel}: ${currentPriority}${arrow}${newPriority}`);
    } else if (currentEffectivePriority !== 0) {
      const priorityLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:priority"), TextStyle.SUMMARY_GOLD, uiTheme);
      const priority = getBBCodeFrag(currentEffectivePriority.toString(), TextStyle.WINDOW, uiTheme);
      lines.push(`${priorityLabel}: ${priority}`);
    }
    if (currentMove.category !== upgradedMove.category) {
      const categoryLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:category"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentCat = getBBCodeFrag(MoveCategory[currentMove.category], TextStyle.WINDOW, uiTheme);
      const newCat = getBBCodeFrag(MoveCategory[upgradedMove.category], TextStyle.SUMMARY_BLUE, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${categoryLabel}: ${currentCat}${arrow}${newCat}`);
    } else {
      const categoryLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:category"), TextStyle.SUMMARY_GOLD, uiTheme);
      const category = getBBCodeFrag(MoveCategory[currentMove.category], TextStyle.WINDOW, uiTheme);
      lines.push(`${categoryLabel}: ${category}`);
    }
    if (currentMove.type !== upgradedMove.type) {
      const typeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:type"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentType = getBBCodeFrag(Type[currentMove.type], TextStyle.WINDOW, uiTheme);
      const newType = getBBCodeFrag(Type[upgradedMove.type], TextStyle.SUMMARY_BLUE, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${typeLabel}: ${currentType}${arrow}${newType}`);
    } else {
      const typeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:type"), TextStyle.SUMMARY_GOLD, uiTheme);
      const type = getBBCodeFrag(Type[currentMove.type], TextStyle.WINDOW, uiTheme);
      lines.push(`${typeLabel}: ${type}`);
    }
    lines.push(...this.compareRecoilDamage(scene, currentMove, upgradedMove));
    lines.push(...this.compareHPSacrifice(scene, currentMove, upgradedMove));
    lines.push(...this.compareHealAmount(scene, currentMove, upgradedMove));
    lines.push(...this.compareMultiHit(scene, currentMove, upgradedMove));
    lines.push(...this.compareCritRate(scene, currentMove, upgradedMove));
    lines.push(...this.compareChargeTurn(scene, currentMove, upgradedMove));
    lines.push(...this.compareStatusEffect(scene, currentMove, upgradedMove));
    lines.push(...this.compareSelfBoost(scene, currentMove, upgradedMove));
    lines.push(...this.compareFoeDebuff(scene, currentMove, upgradedMove));
    lines.push(...this.compareItemInteraction(scene, currentMove, upgradedMove));
    lines.push(...this.compareEffectChanceExtensions(scene, currentMove, upgradedMove));
    lines.push(...this.compareGroundingEffects(scene, currentMove, upgradedMove));
    lines.push(...this.compareWeatherEffects(scene, currentMove, upgradedMove));
    lines.push(...this.compareTerrainEffects(scene, currentMove, upgradedMove));
    lines.push(...this.compareArenaTrapSetup(scene, currentMove, upgradedMove));
    lines.push(...this.compareTypeModifications(scene, currentMove, upgradedMove));
    lines.push(...this.compareHealingOverTime(scene, currentMove, upgradedMove));
    lines.push(...this.compareVariablePowerEffects(scene, currentMove, upgradedMove));
    lines.push(...this.comparePriorityModifications(scene, currentMove, upgradedMove));
    lines.push(...this.compareUtilityEffects(scene, currentMove, upgradedMove));
    lines.push(...this.compareFixedDamageEffects(scene, currentMove, upgradedMove));
    lines.push(...this.compareMoveFlags(scene, currentMove, upgradedMove));
    lines.push(...this.compareBattleMechanicsEffects(scene, currentMove, upgradedMove));

    return lines.filter(line => line !== undefined && line !== '');
  }

  private static calculateEffectivePriority(move: Move): number {
    const priority = new Utils.IntegerHolder(move.priority);
    const priorityAttrs = move.getAttrs(IncrementMovePriorityAttr);
    for (const attr of priorityAttrs) {
      if (attr instanceof ConditionalPriorityAttr) {
        priority.value += attr.increaseAmount;
      }
    }
    return priority.value;
  }

  private static compareRecoilDamage(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentRecoilAttr = currentMove.getAttrs(RecoilAttr)[0] as RecoilAttr | undefined;
    const upgradedRecoilAttr = upgradedMove.getAttrs(RecoilAttr)[0] as RecoilAttr | undefined;

    const currentRecoil = currentRecoilAttr ? Math.round(currentRecoilAttr.damageRatio * 100) : 0;
    const upgradedRecoil = upgradedRecoilAttr ? Math.round(upgradedRecoilAttr.damageRatio * 100) : 0;

    if (currentRecoil !== upgradedRecoil && upgradedRecoil > 0) {
      const recoilLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:recoilDamage"), TextStyle.SUMMARY_GOLD, uiTheme);

      if (currentRecoil === 0 && upgradedRecoil > 0) {
        const currentRecoilText = getBBCodeFrag(`${currentRecoil}%`, TextStyle.WINDOW, uiTheme);
        const newRecoilText = getBBCodeFrag(`${upgradedRecoil}%`, TextStyle.SUMMARY_RED, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${recoilLabel}: ${currentRecoilText}${arrow}${newRecoilText}`);
      } else {
        const isWorse = upgradedRecoil > currentRecoil;
        const currentRecoilText = getBBCodeFrag(`${currentRecoil}%`, isWorse ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const newRecoilText = getBBCodeFrag(`${upgradedRecoil}%`, isWorse ? TextStyle.SUMMARY_RED : TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${recoilLabel}: ${currentRecoilText}${arrow}${newRecoilText}`);
      }
    } else if (currentRecoil > 0) {
      const recoilLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:recoilDamage"), TextStyle.SUMMARY_GOLD, uiTheme);
      const recoilText = getBBCodeFrag(`${currentRecoil}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${recoilLabel}: ${recoilText}`);
    }

    return lines;
  }

  private static compareHPSacrifice(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const getSacrificeType = (move: Move): string => {
      if (move.hasAttr(SacrificialAttr)) return i18next.t("moveUpgradeAttrs:sacrificialFull");
      if (move.hasAttr(HalfSacrificialAttr)) return i18next.t("moveUpgradeAttrs:sacrificialHalf");
      if (move.hasAttr(SacrificialAttrOnHit)) return i18next.t("moveUpgradeAttrs:sacrificialOnHit");
      return "";
    };

    const currentSacrifice = getSacrificeType(currentMove);
    const upgradedSacrifice = getSacrificeType(upgradedMove);

    if (currentSacrifice !== upgradedSacrifice && upgradedSacrifice) {
      const sacrificeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:sacrificial"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentSacrifice) {
        const currentSacrificeText = getBBCodeFrag(currentSacrifice, TextStyle.SUMMARY_RED, uiTheme);
        const newSacrificeText = getBBCodeFrag(upgradedSacrifice, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${sacrificeLabel}: ${currentSacrificeText}${arrow}${newSacrificeText}`);
      } else {
        const sacrificeText = getBBCodeFrag(upgradedSacrifice, TextStyle.SUMMARY_RED, uiTheme);
        lines.push(`${sacrificeLabel}: ${sacrificeText}`);
      }
    } else if (currentSacrifice) {
      const sacrificeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:sacrificial"), TextStyle.SUMMARY_GOLD, uiTheme);
      const sacrificeText = getBBCodeFrag(currentSacrifice, TextStyle.WINDOW, uiTheme);
      lines.push(`${sacrificeLabel}: ${sacrificeText}`);
    }

    return lines;
  }

  private static compareHealAmount(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentHealAttr = currentMove.getAttrs(HealAttr)[0] as HealAttr | undefined;
    const upgradedHealAttr = upgradedMove.getAttrs(HealAttr)[0] as HealAttr | undefined;
    const currentHitHealAttr = currentMove.getAttrs(HitHealAttr)[0] as HitHealAttr | undefined;
    const upgradedHitHealAttr = upgradedMove.getAttrs(HitHealAttr)[0] as HitHealAttr | undefined;

    const currentHeal = currentHealAttr ? Math.round(currentHealAttr.healRatio * 100) :
                       currentHitHealAttr ? Math.round(currentHitHealAttr.healRatio * 100) : 0;
    const upgradedHeal = upgradedHealAttr ? Math.round(upgradedHealAttr.healRatio * 100) :
                        upgradedHitHealAttr ? Math.round(upgradedHitHealAttr.healRatio * 100) : 0;

    if (currentHeal !== upgradedHeal && upgradedHeal > 0) {
      const healLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:healAmount"), TextStyle.SUMMARY_GOLD, uiTheme);
      const currentHealText = getBBCodeFrag(`${currentHeal}%`, upgradedHeal > currentHeal ? TextStyle.SUMMARY_RED : TextStyle.WINDOW, uiTheme);
      const newHealText = getBBCodeFrag(`${upgradedHeal}%`, upgradedHeal > currentHeal ? TextStyle.SUMMARY_GREEN : TextStyle.SUMMARY_RED, uiTheme);
      const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
      lines.push(`${healLabel}: ${currentHealText}${arrow}${newHealText}`);
    } else if (currentHeal > 0) {
      const healLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:healAmount"), TextStyle.SUMMARY_GOLD, uiTheme);
      const healText = getBBCodeFrag(`${currentHeal}%`, TextStyle.WINDOW, uiTheme);
      lines.push(`${healLabel}: ${healText}`);
    }

    return lines;
  }

  private static compareMultiHit(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentMultiHitAttr = currentMove.getAttrs(MultiHitAttr)[0] as MultiHitAttr | undefined;
    const upgradedMultiHitAttr = upgradedMove.getAttrs(MultiHitAttr)[0] as MultiHitAttr | undefined;

    const getMultiHitDescription = (multiHitType: MultiHitType): string => {
      switch (multiHitType) {
        case MultiHitType._2: return "2";
        case MultiHitType._3: return "3";
        case MultiHitType._2_TO_5: return "2-5";
        case MultiHitType._4_TO_8: return "4-8";
        default: return "1";
      }
    };

    const currentMultiHit = currentMultiHitAttr ? getMultiHitDescription(currentMultiHitAttr.getMultiHitType) : "";
    const upgradedMultiHit = upgradedMultiHitAttr ? getMultiHitDescription(upgradedMultiHitAttr.getMultiHitType) : "";

    if (currentMultiHit !== upgradedMultiHit && upgradedMultiHit) {
      const multiHitLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:multiHitType"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentMultiHit) {
        const currentMultiHitText = getBBCodeFrag(currentMultiHit, TextStyle.SUMMARY_RED, uiTheme);
        const newMultiHitText = getBBCodeFrag(upgradedMultiHit, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${multiHitLabel}: ${currentMultiHitText}${arrow}${newMultiHitText}`);
      } else {
        const multiHitText = getBBCodeFrag(upgradedMultiHit, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${multiHitLabel}: ${multiHitText}`);
      }
    } else if (currentMultiHit) {
      const multiHitLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:multiHitType"), TextStyle.SUMMARY_GOLD, uiTheme);
      const multiHitText = getBBCodeFrag(currentMultiHit, TextStyle.WINDOW, uiTheme);
      lines.push(`${multiHitLabel}: ${multiHitText}`);
    }

    return lines;
  }

  private static compareCritRate(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentHighCritAttr = currentMove.getAttrs(HighCritAttr)[0] as HighCritAttr | undefined;
    const upgradedHighCritAttr = upgradedMove.getAttrs(HighCritAttr)[0] as HighCritAttr | undefined;
    const currentCritOnly = currentMove.hasAttr(CritOnlyAttr);
    const upgradedCritOnly = upgradedMove.hasAttr(CritOnlyAttr);

    const getCurrentCritRate = (): string => {
      if (currentCritOnly) return "100%";
      if (currentHighCritAttr) return "10%";
      return "";
    };

    const getUpgradedCritRate = (): string => {
      if (upgradedCritOnly) return "100%";
      if (upgradedHighCritAttr) return "10%";
      return "";
    };

    const currentCritRate = getCurrentCritRate();
    const upgradedCritRate = getUpgradedCritRate();

    if (currentCritRate !== upgradedCritRate && upgradedCritRate) {
      const critLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:highCritRate"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentCritRate) {
        const currentCritText = getBBCodeFrag(currentCritRate, TextStyle.SUMMARY_RED, uiTheme);
        const newCritText = getBBCodeFrag(upgradedCritRate, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${critLabel}: ${currentCritText}${arrow}${newCritText}`);
      } else {
        const critText = getBBCodeFrag(upgradedCritRate, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${critLabel}: ${critText}`);
      }
    } else if (currentCritRate) {
      const critLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:highCritRate"), TextStyle.SUMMARY_GOLD, uiTheme);
      const critText = getBBCodeFrag(currentCritRate, TextStyle.WINDOW, uiTheme);
      lines.push(`${critLabel}: ${critText}`);
    }

    return lines;
  }

  private static compareChargeTurn(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentChargeAttr = currentMove.getAttrs(ChargeAttr)[0] as ChargeAttr | undefined;
    const upgradedChargeAttr = upgradedMove.getAttrs(ChargeAttr)[0] as ChargeAttr | undefined;

    const hasCurrentCharge = !!currentChargeAttr;
    const hasUpgradedCharge = !!upgradedChargeAttr;

    if (!hasCurrentCharge && hasUpgradedCharge) {
      const chargeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:charge"), TextStyle.SUMMARY_GOLD, uiTheme);
      const chargeText = getBBCodeFrag(i18next.t("moveUpgradeAttrs:chargeTurn"), TextStyle.SUMMARY_RED, uiTheme);
      lines.push(`${chargeLabel}: ${chargeText}`);
    } else if (hasCurrentCharge) {
      const chargeLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:charge"), TextStyle.SUMMARY_GOLD, uiTheme);
      const chargeText = getBBCodeFrag(i18next.t("moveUpgradeAttrs:chargeTurn"), TextStyle.WINDOW, uiTheme);
      lines.push(`${chargeLabel}: ${chargeText}`);
    }

    return lines;
  }

  private static compareStatusEffect(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

     const getStatusEffectDescription = (move: Move): string => {
      const statusAttrs = move.getAttrs(StatusEffectAttr);
      if (statusAttrs.length === 0) return "";

      const statusNames: string[] = [];

      for (const attr of statusAttrs) {
        if (attr instanceof MultiStatusEffectAttr) {
          const multiStatusNames = attr.effects.map(effect => {
            const i18nKey = `${getStatusEffectMessageKey(effect)}.name`;
            return i18next.t(i18nKey);
          });
          statusNames.push(...multiStatusNames);
        } else {
          const i18nKey = `${getStatusEffectMessageKey((attr as StatusEffectAttr).effect)}.name`;
          statusNames.push(i18next.t(i18nKey));
        }
      }

      return statusNames.join("/");
    };

    const currentStatusText = getStatusEffectDescription(currentMove);
    const upgradedStatusText = getStatusEffectDescription(upgradedMove);

    if (currentStatusText !== upgradedStatusText && upgradedStatusText) {
      const statusLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statusEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentStatusText) {
        const currentStatusDisplayText = getBBCodeFrag(currentStatusText, TextStyle.SUMMARY_RED, uiTheme);
        const newStatusDisplayText = getBBCodeFrag(upgradedStatusText, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${statusLabel}: ${currentStatusDisplayText}${arrow}${newStatusDisplayText}`);
      } else {
        const statusDisplayText = getBBCodeFrag(upgradedStatusText, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${statusLabel}: ${statusDisplayText}`);
      }
    } else if (currentStatusText) {
      const statusLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statusEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const statusDisplayText = getBBCodeFrag(currentStatusText, TextStyle.WINDOW, uiTheme);
      lines.push(`${statusLabel}: ${statusDisplayText}`);
    }

    return lines;
  }

  private static compareSelfBoost(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentSelfBoostAttrs = currentMove.getAttrs(StatChangeAttr).filter((attr: StatChangeAttr) => attr.selfTarget && attr.levels > 0);
    const upgradedSelfBoostAttrs = upgradedMove.getAttrs(StatChangeAttr).filter((attr: StatChangeAttr) => attr.selfTarget && attr.levels > 0);

    const getSelfBoostText = (attrs: StatChangeAttr[]): string => {
      if (attrs.length === 0) return "";
      const boostTexts = attrs.map(attr => {
        const statNames = attr.stats.map(stat => getBattleStatName(stat)).join("/");
        return `${statNames} ${attr.levels > 0 ? '+' : ''}${attr.levels}`;
      });
      return boostTexts.join(", ");
    };

    const currentSelfBoostText = getSelfBoostText(currentSelfBoostAttrs as StatChangeAttr[]);
    const upgradedSelfBoostText = getSelfBoostText(upgradedSelfBoostAttrs as StatChangeAttr[]);

    if (currentSelfBoostText !== upgradedSelfBoostText && upgradedSelfBoostText) {
      const boostLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statChangeSelf"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentSelfBoostText) {
        const currentBoostDisplayText = getBBCodeFrag(currentSelfBoostText, TextStyle.SUMMARY_RED, uiTheme);
        const newBoostDisplayText = getBBCodeFrag(upgradedSelfBoostText, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${boostLabel}: ${currentBoostDisplayText}${arrow}${newBoostDisplayText}`);
      } else {
        const boostDisplayText = getBBCodeFrag(upgradedSelfBoostText, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${boostLabel}: ${boostDisplayText}`);
      }
    } else if (currentSelfBoostText) {
      const boostLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statChangeSelf"), TextStyle.SUMMARY_GOLD, uiTheme);
      const boostDisplayText = getBBCodeFrag(currentSelfBoostText, TextStyle.WINDOW, uiTheme);
      lines.push(`${boostLabel}: ${boostDisplayText}`);
    }

    return lines;
  }

  private static compareFoeDebuff(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentFoeDebuffAttrs = currentMove.getAttrs(StatChangeAttr).filter((attr: StatChangeAttr) => !attr.selfTarget && attr.levels < 0);
    const upgradedFoeDebuffAttrs = upgradedMove.getAttrs(StatChangeAttr).filter((attr: StatChangeAttr) => !attr.selfTarget && attr.levels < 0);

    const getFoeDebuffText = (attrs: StatChangeAttr[]): string => {
      if (attrs.length === 0) return "";
      const debuffTexts = attrs.map(attr => {
        const statNames = attr.stats.map(stat => getBattleStatName(stat)).join("/");
        return `${statNames} ${attr.levels}`;
      });
      return debuffTexts.join(", ");
    };

    const currentFoeDebuffText = getFoeDebuffText(currentFoeDebuffAttrs as StatChangeAttr[]);
    const upgradedFoeDebuffText = getFoeDebuffText(upgradedFoeDebuffAttrs as StatChangeAttr[]);

    if (currentFoeDebuffText !== upgradedFoeDebuffText && upgradedFoeDebuffText) {
      const debuffLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statChangeTarget"), TextStyle.SUMMARY_GOLD, uiTheme);
      if (currentFoeDebuffText) {
        const currentDebuffDisplayText = getBBCodeFrag(currentFoeDebuffText, TextStyle.SUMMARY_RED, uiTheme);
        const newDebuffDisplayText = getBBCodeFrag(upgradedFoeDebuffText, TextStyle.SUMMARY_GREEN, uiTheme);
        const arrow = getBBCodeFrag(" → ", TextStyle.WINDOW, uiTheme);
        lines.push(`${debuffLabel}: ${currentDebuffDisplayText}${arrow}${newDebuffDisplayText}`);
      } else {
        const debuffDisplayText = getBBCodeFrag(upgradedFoeDebuffText, TextStyle.SUMMARY_GREEN, uiTheme);
        lines.push(`${debuffLabel}: ${debuffDisplayText}`);
      }
    } else if (currentFoeDebuffText) {
      const debuffLabel = getBBCodeFrag(i18next.t("moveUpgradeAttrs:statChangeTarget"), TextStyle.SUMMARY_GOLD, uiTheme);
      const debuffDisplayText = getBBCodeFrag(currentFoeDebuffText, TextStyle.WINDOW, uiTheme);
      lines.push(`${debuffLabel}: ${debuffDisplayText}`);
    }

    return lines;
  }

  private static compareItemInteraction(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentRemove = currentMove.hasAttr(RemoveHeldItemAttr);
    const upgradedRemove = upgradedMove.hasAttr(RemoveHeldItemAttr);
    const currentSteal = currentMove.getAttrs(StealHeldItemChanceAttr)[0] as StealHeldItemChanceAttr | undefined;
    const upgradedSteal = upgradedMove.getAttrs(StealHeldItemChanceAttr)[0] as StealHeldItemChanceAttr | undefined;

    const getCurrentDesc = (): string => {
      if (currentSteal) return `${Math.round(currentSteal.chance * 100)}%`;
      if (currentRemove) return i18next.t("moveUpgradeAttrs:removeFoeItem");
      return "";
    };

    const getUpgradedDesc = (): string => {
      if (upgradedSteal) return `${Math.round(upgradedSteal.chance * 100)}%`;
      if (upgradedRemove) return i18next.t("moveUpgradeAttrs:removeFoeItem");
      return "";
    };

    const currentDesc = getCurrentDesc();
    const upgradedDesc = getUpgradedDesc();

    if (currentDesc !== upgradedDesc && upgradedDesc) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedDesc.includes('%') ? `${i18next.t("moveUpgradeAttrs:stealFoeItem")} (${upgradedDesc})` : upgradedDesc, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareEffectChanceExtensions(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const effects = [
      { attr: FlinchAttr, key: "moveUpgradeAttrs:flinchStatus" },
      { attr: ConfuseAttr, key: "moveUpgradeAttrs:confuseStatus" },
      {
        check: (move: Move) => move.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.SEEDED),
        key: "moveUpgradeAttrs:leechSeedStatus"
      },
      {
        check: (move: Move) => move.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.CURSED),
        key: "moveUpgradeAttrs:curseStatus"
      }
    ];

    for (const effect of effects) {
      let currentHas: boolean, upgradedHas: boolean;

      if (effect.attr) {
        currentHas = currentMove.hasAttr(effect.attr);
        upgradedHas = upgradedMove.hasAttr(effect.attr);
      } else {
        currentHas = effect.check!(currentMove);
        upgradedHas = effect.check!(upgradedMove);
      }

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelStatus"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    return lines;
  }

  private static compareGroundingEffects(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentGround = currentMove.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.IGNORE_FLYING);
    const upgradedGround = upgradedMove.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.IGNORE_FLYING);

    if (!currentGround && upgradedGround) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:groundFlyingTypes"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareWeatherEffects(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentWeatherAttr = currentMove.getAttrs(WeatherChangeAttr)[0] as WeatherChangeAttr | undefined;
    const upgradedWeatherAttr = upgradedMove.getAttrs(WeatherChangeAttr)[0] as WeatherChangeAttr | undefined;
    const currentClear = currentMove.hasAttr(ClearWeatherAttr);
    const upgradedClear = upgradedMove.hasAttr(ClearWeatherAttr);

    const getCurrentWeather = (): string => {
      if (currentClear) return i18next.t("moveUpgradeAttrs:clearWeather");
      if (currentWeatherAttr) return this.getWeatherName(currentWeatherAttr.weatherType);
      return "";
    };

    const getUpgradedWeather = (): string => {
      if (upgradedClear) return i18next.t("moveUpgradeAttrs:clearWeather");
      if (upgradedWeatherAttr) return this.getWeatherName(upgradedWeatherAttr.weatherType);
      return "";
    };

    const currentWeather = getCurrentWeather();
    const upgradedWeather = getUpgradedWeather();

    if (currentWeather !== upgradedWeather && upgradedWeather) {
      const labelKey = upgradedClear ? "moveUpgradeAttrs:labelEffect" : "moveUpgradeAttrs:labelWeatherChange";
      const label = getBBCodeFrag(i18next.t(labelKey), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedWeather, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareTerrainEffects(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentTerrainAttr = currentMove.getAttrs(TerrainChangeAttr)[0] as TerrainChangeAttr | undefined;
    const upgradedTerrainAttr = upgradedMove.getAttrs(TerrainChangeAttr)[0] as TerrainChangeAttr | undefined;
    const currentClear = currentMove.hasAttr(ClearTerrainAttr);
    const upgradedClear = upgradedMove.hasAttr(ClearTerrainAttr);

    const getCurrentTerrain = (): string => {
      if (currentClear) return i18next.t("moveUpgradeAttrs:clearTerrain");
      if (currentTerrainAttr) return this.getTerrainName(currentTerrainAttr.terrainType);
      return "";
    };

    const getUpgradedTerrain = (): string => {
      if (upgradedClear) return i18next.t("moveUpgradeAttrs:clearTerrain");
      if (upgradedTerrainAttr) return this.getTerrainName(upgradedTerrainAttr.terrainType);
      return "";
    };

    const currentTerrain = getCurrentTerrain();
    const upgradedTerrain = getUpgradedTerrain();

    if (currentTerrain !== upgradedTerrain && upgradedTerrain) {
      const labelKey = upgradedClear ? "moveUpgradeAttrs:labelEffect" : "moveUpgradeAttrs:labelTerrainChange";
      const label = getBBCodeFrag(i18next.t(labelKey), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedTerrain, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareArenaTrapSetup(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    let currentTrapAttr = currentMove.getAttrs(AddArenaTrapTagAttr)[0] as AddArenaTrapTagAttr | undefined;
    let upgradedTrapAttr = upgradedMove.getAttrs(AddArenaTrapTagAttr)[0] as AddArenaTrapTagAttr | undefined;

    if (!currentTrapAttr && currentMove.hasAttr(AddArenaTrapTagUpgradeAttr)) {
      currentTrapAttr = currentMove.getAttrs(AddArenaTrapTagUpgradeAttr)[0] as AddArenaTrapTagUpgradeAttr | undefined;
    }

    if (!upgradedTrapAttr && upgradedMove.hasAttr(AddArenaTrapTagUpgradeAttr)) {
      upgradedTrapAttr = upgradedMove.getAttrs(AddArenaTrapTagUpgradeAttr)[0] as AddArenaTrapTagUpgradeAttr | undefined;
    }

    const currentTrap = currentTrapAttr ? this.getHazardName(currentTrapAttr.tagType) : "";
    const upgradedTrap = upgradedTrapAttr ? this.getHazardName(upgradedTrapAttr.tagType) : "";

    if (currentTrap !== upgradedTrap && upgradedTrap) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelSetup"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedTrap, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareTypeModifications(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const typeEffects = [
      { attr: MatchUserTypeAttr, key: "moveUpgradeAttrs:matchPrimaryType" },
      { attr: WeatherBallTypeAttr, key: "moveUpgradeAttrs:weatherBoost" },
      { attr: TerrainPulseTypeAttr, key: "moveUpgradeAttrs:terrainBoost" },
      { attr: HiddenPowerTypeAttr, key: "moveUpgradeAttrs:ivType" },
      { attr: TypelessAttr, key: "moveUpgradeAttrs:typelessType" }
    ];

    for (const effect of typeEffects) {
      const currentHas = currentMove.hasAttr(effect.attr);
      const upgradedHas = upgradedMove.hasAttr(effect.attr);

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }
    const currentSuperAttr = currentMove.getAttrs(AnyTypeSuperEffectTypeMultiplierAttr)[0] as AnyTypeSuperEffectTypeMultiplierAttr | undefined;
    const upgradedSuperAttr = upgradedMove.getAttrs(AnyTypeSuperEffectTypeMultiplierAttr)[0] as AnyTypeSuperEffectTypeMultiplierAttr | undefined;

    if (!currentSuperAttr && upgradedSuperAttr) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelSuperEffectiveVs"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(this.getTypeName(upgradedSuperAttr.superEffectiveAgainstType), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    } else if (currentSuperAttr?.superEffectiveAgainstType !== upgradedSuperAttr?.superEffectiveAgainstType && upgradedSuperAttr) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelSuperEffectiveVs"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(this.getTypeName(upgradedSuperAttr.superEffectiveAgainstType), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareHealingOverTime(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const getCurrentHeal = (): string => {
      const attrs = currentMove.getAttrs(AddBattlerTagAttr);
      if (attrs.some((a: any) => a.tagType === BattlerTagType.AQUA_RING)) return i18next.t("moveUpgradeAttrs:aquaRing");
      if (attrs.some((a: any) => a.tagType === BattlerTagType.INGRAIN)) return i18next.t("moveUpgradeAttrs:ingrain");
      return "";
    };

    const getUpgradedHeal = (): string => {
      const attrs = upgradedMove.getAttrs(AddBattlerTagAttr);
      if (attrs.some((a: any) => a.tagType === BattlerTagType.AQUA_RING)) return i18next.t("moveUpgradeAttrs:aquaRing");
      if (attrs.some((a: any) => a.tagType === BattlerTagType.INGRAIN)) return i18next.t("moveUpgradeAttrs:ingrain");
      return "";
    };

    const currentHeal = getCurrentHeal();
    const upgradedHeal = getUpgradedHeal();

    if (currentHeal !== upgradedHeal && upgradedHeal) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelHeal"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:healEndOfTurn"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareVariablePowerEffects(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const powerEffects = [
      { attr: GyroBallPowerAttr, key: "moveUpgradeAttrs:slowerStrongerBoost" },
      { attr: ElectroBallPowerAttr, key: "moveUpgradeAttrs:fasterStrongerBoost" },
      { attr: WeightPowerAttr, key: "moveUpgradeAttrs:weightBoost" },
      { attr: CompareWeightPowerAttr, key: "moveUpgradeAttrs:weightDiffBoost" },
      { attr: HpPowerAttr, key: "moveUpgradeAttrs:higherHpPowerBoost" },
      { attr: LowHpPowerAttr, key: "moveUpgradeAttrs:lowerHpPowerBoost" },
      { attr: ConsecutiveUseDoublePowerAttr, key: "moveUpgradeAttrs:repeatedUseBoost" },
      { attr: TurnDamagedDoublePowerAttr, key: "moveUpgradeAttrs:revengeBoost" }
    ];

    for (const effect of powerEffects) {
      const currentHas = currentMove.hasAttr(effect.attr);
      const upgradedHas = upgradedMove.hasAttr(effect.attr);

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    return lines;
  }

  private static comparePriorityModifications(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const currentTerrainPrio = currentMove.getAttrs(TerrainMovePriorityAttr)[0] as TerrainMovePriorityAttr | undefined;
    const upgradedTerrainPrio = upgradedMove.getAttrs(TerrainMovePriorityAttr)[0] as TerrainMovePriorityAttr | undefined;
    const currentFirstTurnPrio = currentMove.getAttrs(FirstTurnPriorityAttr)[0] as FirstTurnPriorityAttr | undefined;
    const upgradedFirstTurnPrio = upgradedMove.getAttrs(FirstTurnPriorityAttr)[0] as FirstTurnPriorityAttr | undefined;

    if (!currentTerrainPrio && upgradedTerrainPrio) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:terrainPriorityBoost"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    } else if (currentTerrainPrio?.increaseAmount !== upgradedTerrainPrio?.increaseAmount && upgradedTerrainPrio) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:terrainPriorityBoost"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    if (!currentFirstTurnPrio && upgradedFirstTurnPrio) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:firstTurnOnlyPriority"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    } else if (currentFirstTurnPrio?.increaseAmount !== upgradedFirstTurnPrio?.increaseAmount && upgradedFirstTurnPrio) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(i18next.t("moveUpgradeAttrs:firstTurnOnlyPriority"), TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareUtilityEffects(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const utilityEffects = [
      { attr: ForceSwitchOutAttr, key: "moveUpgradeAttrs:switchAfterAtk" },
      { attr: SurviveDamageAttr, key: "moveUpgradeAttrs:endure" }
    ];

    for (const effect of utilityEffects) {
      const currentHas = currentMove.hasAttr(effect.attr);
      const upgradedHas = upgradedMove.hasAttr(effect.attr);

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }
    const currentTrapAttr = currentMove.getAttrs(TrapAttr)[0] as TrapAttr | undefined;
    const upgradedTrapAttr = upgradedMove.getAttrs(TrapAttr)[0] as TrapAttr | undefined;

    const currentTrap = currentTrapAttr ? this.getTrapName(currentTrapAttr.tagType) : "";
    const upgradedTrap = upgradedTrapAttr ? this.getTrapName(upgradedTrapAttr.tagType) : "";

    if (currentTrap !== upgradedTrap && upgradedTrap) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelTrap"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedTrap, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareFixedDamageEffects(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const getCurrentFixedDamage = (): string => {
      if (currentMove.hasAttr(LevelDamageAttr)) return i18next.t("moveUpgradeAttrs:levelDamage");
      if (currentMove.hasAttr(TargetHalfHpDamageAttr)) return i18next.t("moveUpgradeAttrs:halfTargetHp");
      const fixedAttr = currentMove.getAttrs(FixedDamageAttr)[0] as FixedDamageAttr | undefined;
      if (fixedAttr) return `${fixedAttr.damage}`;
      return "";
    };

    const getUpgradedFixedDamage = (): string => {
      if (upgradedMove.hasAttr(LevelDamageAttr)) return i18next.t("moveUpgradeAttrs:levelDamage");
      if (upgradedMove.hasAttr(TargetHalfHpDamageAttr)) return i18next.t("moveUpgradeAttrs:halfTargetHp");
      const fixedAttr = upgradedMove.getAttrs(FixedDamageAttr)[0] as FixedDamageAttr | undefined;
      if (fixedAttr) return `${fixedAttr.damage}`;
      return "";
    };

    const currentFixed = getCurrentFixedDamage();
    const upgradedFixed = getUpgradedFixedDamage();

    if (currentFixed !== upgradedFixed && upgradedFixed) {
      const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelFixedDmg"), TextStyle.SUMMARY_GOLD, uiTheme);
      const value = getBBCodeFrag(upgradedFixed, TextStyle.SUMMARY_GREEN, uiTheme);
      const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
      lines.push(`${label}${colon}${value}`);
    }

    return lines;
  }

  private static compareMoveFlags(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const flagEffects = [
      { flag: MoveFlags.IGNORE_ABILITIES, key: "moveUpgradeAttrs:uniqueCategoryIgnoreAbilities" },
      { flag: MoveFlags.SOUND_BASED, key: "moveUpgradeAttrs:uniqueCategorySoundMove" },
      { flag: MoveFlags.PUNCHING_MOVE, key: "moveUpgradeAttrs:uniqueCategoryPunchingMove" },
      { flag: MoveFlags.SLICING_MOVE, key: "moveUpgradeAttrs:uniqueCategorySlicingMove" },
      { flag: MoveFlags.BITING_MOVE, key: "moveUpgradeAttrs:uniqueCategoryBitingMove" },
      { flag: MoveFlags.PULSE_MOVE, key: "moveUpgradeAttrs:uniqueCategoryPulseMove" },
      { flag: MoveFlags.WIND_MOVE, key: "moveUpgradeAttrs:uniqueCategoryWindMove" },
      { flag: MoveFlags.BALLBOMB_MOVE, key: "moveUpgradeAttrs:uniqueCategoryBallbombMove" },
      { flag: MoveFlags.POWDER_MOVE, key: "moveUpgradeAttrs:uniqueCategoryPowderMove" },
      { flag: MoveFlags.DANCE_MOVE, key: "moveUpgradeAttrs:uniqueCategoryDanceMove" }
    ];

    for (const effect of flagEffects) {
      const currentHas = currentMove.hasFlag(effect.flag);
      const upgradedHas = upgradedMove.hasFlag(effect.flag);

      if (upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelUniqueCategory"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), !currentHas ? TextStyle.SUMMARY_GREEN : TextStyle.WINDOW, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    return lines;
  }

  private static compareBattleMechanicsEffects(scene: BattleScene, currentMove: Move, upgradedMove: Move): string[] {
    const lines: string[] = [];
    const uiTheme = scene.uiTheme;

    const mechanicsEffects = [
      { attr: IgnoreOpponentStatChangesAttr, key: "moveUpgradeAttrs:ignoreStatChanges" },
      { attr: RemoveScreensAttr, key: "moveUpgradeAttrs:removeScreens" }
    ];

    for (const effect of mechanicsEffects) {
      const currentHas = currentMove.hasAttr(effect.attr);
      const upgradedHas = upgradedMove.hasAttr(effect.attr);

      if (!currentHas && upgradedHas) {
        const label = getBBCodeFrag(i18next.t("moveUpgradeAttrs:labelEffect"), TextStyle.SUMMARY_GOLD, uiTheme);
        const value = getBBCodeFrag(i18next.t(effect.key), TextStyle.SUMMARY_GREEN, uiTheme);
        const colon = getBBCodeFrag(": ", TextStyle.WINDOW, uiTheme);
        lines.push(`${label}${colon}${value}`);
      }
    }

    return lines;
  }

  private static getWeatherName(weather: WeatherType): string {
    return i18next.t(`arenaFlyout:${this.toCamelCase(WeatherType[weather])}`);
  }

  private static getTerrainName(terrain: TerrainType): string {
    return i18next.t(`arenaFlyout:${this.toCamelCase(TerrainType[terrain])}`);
  }

  private static getTrapName(trap: BattlerTagType): string {
    return i18next.t(`arenaFlyout:${this.toCamelCase(BattlerTagType[trap])}`);
  }

  private static getHazardName(hazard: ArenaTagType): string {
    return i18next.t(`arenaFlyout:${this.toCamelCase(ArenaTagType[hazard])}`);
  }

  private static getTypeName(type: Type): string {
    return i18next.t(`pokemonInfo:Type:${Type[type]}`);
  }

  private static toCamelCase(str: string): string {
    return str.toLowerCase().replace(/[ _-]/g, ' ').replace(/(?:^\w|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) return '';
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
  }

  private static wrapTextToWidth(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const avgCharWidth = 6;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {

          lines.push(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  static showTooltip(scene: BattleScene, modifierType: MoveUpgradeModifierType, iconPosition: { x: number, y: number }, isPlayer: boolean = true): void {
    this.hideTooltip(scene);

    this.sourceScene = scene;
    this.sourceModifierType = modifierType;
    this.sourceIconPosition = iconPosition;
    this.sourceIsPlayer = isPlayer;

    const tempModifier = modifierType.newModifier() as MoveUpgradeModifier;
    const category = tempModifier.upgradeCategory;
    const tier = tempModifier.upgradeTier || 1;
    const maxTier = category ? UpgradeCategoryUtils.getMoveUpgradeMaxTier(category) : 1;
    this.detailsActive = false;
    this.previewTier = tier;
    this.currentTier = tier;
    this.previewMaxTier = maxTier;
    this.previewCategory = category || null;
    this.previewMoveId = tempModifier.moveId;
    this.previewMoveName = allMoves[tempModifier.moveId]?.name || "";

    const ptr = scene.game.input.mousePointer;
    if (ptr) {
      const reverse = ptr.x >= scene.game.canvas.width - (this.TOOLTIP_WIDTH * 6) - 12;
      this.lastTooltipX = !reverse ? (ptr.x / 6 + 2) : (ptr.x / 6 - this.TOOLTIP_WIDTH - 2);
      this.lastTooltipY = ptr.y / 6 + 2;
    } else {
      const screenWidth = scene.game.canvas.width / 6;
      this.lastTooltipY = (iconPosition.y / 6) + 25;
      this.lastTooltipX = isPlayer ? (iconPosition.x / 6) : (screenWidth + (iconPosition.x / 6) - this.TOOLTIP_WIDTH);
    }

    this.rebuildComparisonTooltip();
  }

  static hideTooltip(scene: BattleScene): void {
    this.destroyTooltipContainerOnly();
    this.unregisterKeyboardHandlers(scene);
  }

  private static destroyTooltipContainerOnly(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
      this.tooltipBg = null;
      this.tooltipTitleBarBg = null;
      this.tooltipRarityBarBg = null;
      this.tooltipTitle = null;
      this.tooltipSubtitle = null;
      this.tooltipBody = null;
      this.detailsButton = null;
      this.backButton = null;
      this.navContainer = null;
      if (this._tooltipPattern) {
        this._tooltipPattern.clear();
        this._tooltipPattern = null;
      }
    }
  }

  private static rebuildComparisonTooltip(): void {
    const scene = this.sourceScene;
    const modifierType = this.sourceModifierType;
    if (!scene || !modifierType) {
      return;
    }
    const comparisonText = this.generateComparison(scene, modifierType, this.sourceIsPlayer);
    if (!comparisonText) {
      return;
    }
    const { titleText, subtitleText, bodyText } = this.parseComparisonText(comparisonText);
    const category = this.previewCategory;
    const tier = this.currentTier;
    const maxTier = this.previewMaxTier;
    const rarity = (tier && category) ? getUpgradeRarityFromTier(tier, maxTier) : SkillTreeRarity.LEGENDARY;
    const rarityColors = getUpgradeRarityColors(rarity);
    this.detailsActive = false;
    this.unregisterKeyboardHandlers(scene);
    this.buildTooltip(scene, titleText, subtitleText, bodyText, rarityColors);
  }

  private static rebuildTierPreviewTooltip(): void {
    const scene = this.sourceScene;
    if (!scene || !this.previewCategory || this.previewMoveId === null) {
      return;
    }
    const category = this.previewCategory;
    const tier = this.previewTier;
    const maxTier = this.previewMaxTier;
    const rarity = getUpgradeRarityFromTier(tier, maxTier);
    const rarityColors = getUpgradeRarityColors(rarity);
    const moveName = this.previewMoveName || allMoves[this.previewMoveId]?.name || "";
    const titleText = `${moveName} ${Utils.intToRoman(tier)}`;
    const subtitleText = `${i18next.t(`moveUpgradeAttrs:${category}`)} ${i18next.t("moveUpgradeAttrs:path")}`;
    const bodyText = this.getTierPreviewBody(category, tier, maxTier);
    this.detailsActive = true;
    this.registerKeyboardHandlers(scene);
    this.buildTooltip(scene, titleText, subtitleText, bodyText, rarityColors);
  }

  private static buildTooltip(scene: BattleScene, titleText: string, subtitleText: string, bodyText: string, rarityColors: { border: number; bg: number }): void {
    this.destroyTooltipContainerOnly();
    const c = this.TOOLTIP_CONSTANTS;
    const tooltipWidth = this.TOOLTIP_WIDTH;
    const padding = c.PADDING;
    const buttonRowHeight = 10;
    const enableDetails = this.previewCategory !== null && this.previewMaxTier > 1;
    const buttonRowCount = enableDetails ? (this.detailsActive ? 2 : 1) : 0;

    this.tooltipContainer = scene.add.container(0, 0);
    this.tooltipContainer.setDepth(10000000000);

    this.tooltipTitle = addTextObject(scene, tooltipWidth / 2, c.TITLE_TEXT_Y, titleText, TextStyle.SUMMARY_GOLD, {
      fontSize: c.TITLE_FONT_SIZE, fontStyle: "bold"
    });
    this.tooltipTitle.setOrigin(0.5, 0.5);

    this.tooltipSubtitle = addTextObject(scene, tooltipWidth / 2, c.RARITY_TEXT_Y, subtitleText, TextStyle.WINDOW, {
      fontSize: "35px"
    });
    this.tooltipSubtitle.setOrigin(0.5, 0.5);
    this.tooltipSubtitle.setTint(rarityColors.border);

    this.tooltipBody = addBBCodeTextObject(scene, c.PADDING, c.CONTENT_Y, bodyText, TextStyle.WINDOW, { fontSize: c.BODY_FONT_SIZE });
    this.applyBbCodeWordWrap(this.tooltipBody, tooltipWidth, padding);

    const contentBottom = this.tooltipBody.y + this.tooltipBody.displayHeight;
    const tooltipHeight = buttonRowCount > 0
      ? contentBottom + padding + (buttonRowHeight * buttonRowCount) + padding
      : contentBottom + padding;

    this.tooltipBg = scene.add.graphics();
    this.drawTooltipGradientBackground(this.tooltipBg, 0, 0, tooltipWidth, tooltipHeight, c.RADIUS);
    this.tooltipBg.lineStyle(c.BORDER_THICKNESS, c.BORDER_COLOR, c.BORDER_ALPHA);
    this.tooltipBg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, c.RADIUS);

    this.tooltipTitleBarBg = scene.add.graphics();
    this.tooltipTitleBarBg.fillStyle(rarityColors.border, c.TITLE_BAR_ALPHA);
    this.tooltipTitleBarBg.fillRect(0, c.TITLE_BAR_Y, tooltipWidth, c.TITLE_BAR_HEIGHT);

    this.tooltipRarityBarBg = scene.add.graphics();
    this.tooltipRarityBarBg.fillStyle(rarityColors.bg, c.SUBHEADER_BAR_ALPHA);
    this.tooltipRarityBarBg.fillRect(0, c.RARITY_BAR_Y, tooltipWidth, c.RARITY_BAR_HEIGHT);

    if (enableDetails) {
      if (this.detailsActive) {
        this.navContainer = this.createNavRow(scene, tooltipWidth, tooltipHeight, padding, buttonRowHeight);
        this.backButton = this.createBackButton(scene, tooltipWidth, tooltipHeight, padding, buttonRowHeight);
      } else {
        this.detailsButton = this.createDetailsButton(scene, tooltipWidth, tooltipHeight, padding, buttonRowHeight);
      }
    }

    const children: Phaser.GameObjects.GameObject[] = [
      this.tooltipBg,
      this.tooltipTitleBarBg,
      this.tooltipRarityBarBg,
      this.tooltipTitle,
      this.tooltipSubtitle,
      this.tooltipBody
    ];
    if (this.detailsButton) {
      children.push(this.detailsButton);
    }
    if (this.navContainer) {
      children.push(this.navContainer);
    }
    if (this.backButton) {
      children.push(this.backButton);
    }
    this.tooltipContainer.add(children);
    this.tooltipContainer.setPosition(this.lastTooltipX, this.lastTooltipY);
    scene.uiContainer.add(this.tooltipContainer);
  }

  private static createDetailsButton(scene: BattleScene, tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const buttonY = tooltipHeight - padding - (buttonRowHeight / 2);
    const container = scene.add.container(tooltipWidth / 2, buttonY);
    const label = addTextObject(scene, 0, 0, i18next.t("nodeMode:tooltipDetails", { defaultValue: "More Info" }), TextStyle.WINDOW, { fontSize: "35px" });
    label.setOrigin(0.5, 0.5);
    container.add([label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-80, -8, 160, 16), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", () => this.rebuildTierPreviewTooltip());
    return container;
  }

  private static createBackButton(scene: BattleScene, tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const buttonY = tooltipHeight - padding - (buttonRowHeight / 2);
    const container = scene.add.container(tooltipWidth / 2, buttonY);
    const label = addTextObject(scene, 0, 0, i18next.t("nodeMode:tooltipBack", { defaultValue: "Back" }), TextStyle.WINDOW, { fontSize: "35px" });
    label.setOrigin(0.5, 0.5);
    container.add([label]);
    container.setInteractive(new Phaser.Geom.Rectangle(-80, -8, 160, 16), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", () => this.rebuildComparisonTooltip());
    return container;
  }

  private static createNavRow(scene: BattleScene, tooltipWidth: number, tooltipHeight: number, padding: number, buttonRowHeight: number): Phaser.GameObjects.Container {
    const buttonY = tooltipHeight - padding - (buttonRowHeight * 1.5);
    const container = scene.add.container(tooltipWidth / 2, buttonY);
    const left = scene.add.image(-18, 0, "cursor_reverse");
    left.setScale(0.5);
    left.setOrigin(0.5, 0.5);
    left.setInteractive({ useHandCursor: true });
    left.on("pointerdown", () => {
      if (this.previewTier > this.currentTier) {
        this.previewTier--;
        this.rebuildTierPreviewTooltip();
      }
    });
    const right = scene.add.image(18, 0, "cursor");
    right.setScale(0.5);
    right.setOrigin(0.5, 0.5);
    right.setInteractive({ useHandCursor: true });
    right.on("pointerdown", () => {
      if (this.previewTier < this.previewMaxTier) {
        this.previewTier++;
        this.rebuildTierPreviewTooltip();
      }
    });
    const label = addTextObject(scene, 0, 0, `${Utils.intToRoman(this.previewTier)}/${Utils.intToRoman(this.previewMaxTier)}`, TextStyle.WINDOW, { fontSize: "35px" });
    label.setOrigin(0.5, 0.5);
    container.add([left, label, right]);
    return container;
  }

  private static getMoveUpgradePathStep(category: UpgradeCategory, tier: number): any | null {
    const index = tier - 1;
    switch (category) {
      case UpgradeCategory.POWER:
        return MoveUpgrade.POWER_PATH[index] || null;
      case UpgradeCategory.ACCURACY:
        return MoveUpgrade.ACCURACY_PATH[index] || null;
      case UpgradeCategory.HIT_HEAL:
        return MoveUpgrade.HIT_HEAL_PATH[index] || null;
      case UpgradeCategory.EFFECT_CHANCE:
        return MoveUpgrade.EFFECT_CHANCE_PATH[index] || null;
      case UpgradeCategory.CRIT:
        return MoveUpgrade.CRIT_PATH[index] || null;
      case UpgradeCategory.RECOIL_ADD:
        return MoveUpgrade.RECOIL_ADD_PATH[index] || null;
      case UpgradeCategory.RECOIL_DECREASE:
        return MoveUpgrade.RECOIL_DECREASE_PATH[index] || null;
      case UpgradeCategory.SACRIFICIAL:
        return MoveUpgrade.SACRIFICIAL_PATH[index] || null;
      case UpgradeCategory.CHARGE_MOVE:
        return MoveUpgrade.CHARGE_MOVE_PATH[index] || null;
      case UpgradeCategory.MULTI_HIT:
        return MoveUpgrade.MULTI_HIT_PATH[index] || null;
      case UpgradeCategory.POSITIVE_PRIORITY:
        return MoveUpgrade.POSITIVE_PRIORITY_PATH[index] || null;
      case UpgradeCategory.NEGATIVE_PRIORITY:
        return MoveUpgrade.NEGATIVE_PRIORITY_PATH[index] || null;
      case UpgradeCategory.ITEM_INTERACTION:
        return MoveUpgrade.ITEM_INTERACTION_PATH[index] || null;
      case UpgradeCategory.STATUS_IMPROVE:
        return MoveUpgrade.STATUS_IMPROVE_PATH[index] || null;
      case UpgradeCategory.STATUS_DUAL:
        return MoveUpgrade.STATUS_DUAL_PATH[index] || null;
      case UpgradeCategory.STAT_BOOST_SELF:
        return MoveUpgrade.STAT_BOOST_SELF_PATH[index] || null;
      case UpgradeCategory.STAT_LOWER_TARGET:
        return MoveUpgrade.STAT_LOWER_TARGET_PATH[index] || null;
      default:
        return null;
    }
  }

  private static formatPreviewValue(value: any): string {
    if (typeof value === "number") {
      if (!Number.isInteger(value) && value > 0 && value < 1) {
        return `${Math.round(value * 1000) / 10}%`;
      }
      return value.toString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private static getTierPreviewBody(category: UpgradeCategory, tier: number, maxTier: number): string {
    const step = this.getMoveUpgradePathStep(category, tier);
    if (!step) {
      return "";
    }
    const lines: string[] = [];
    lines.push(`${i18next.t(`moveUpgradeAttrs:${category}`)} ${i18next.t("moveUpgradeAttrs:path")} ${tier}/${maxTier}`);
    lines.push("");
    for (const [k, v] of Object.entries(step)) {
      lines.push(`${k}: ${this.formatPreviewValue(v)}`);
    }
    return lines.join("\n");
  }

  private static registerKeyboardHandlers(scene: BattleScene): void {
    if (!scene.input.keyboard) {
      return;
    }
    if (!this.keyLeftHandler) {
      this.keyLeftHandler = (event: KeyboardEvent) => {
        if (this.detailsActive && this.previewTier > this.currentTier) {
          event.preventDefault();
          this.previewTier--;
          this.rebuildTierPreviewTooltip();
        }
      };
      scene.input.keyboard.on("keydown-LEFT", this.keyLeftHandler);
    }
    if (!this.keyRightHandler) {
      this.keyRightHandler = (event: KeyboardEvent) => {
        if (this.detailsActive && this.previewTier < this.previewMaxTier) {
          event.preventDefault();
          this.previewTier++;
          this.rebuildTierPreviewTooltip();
        }
      };
      scene.input.keyboard.on("keydown-RIGHT", this.keyRightHandler);
    }
    if (!this.keyEscapeHandler) {
      this.keyEscapeHandler = (event: KeyboardEvent) => {
        if (this.detailsActive) {
          event.preventDefault();
          this.rebuildComparisonTooltip();
        }
      };
      scene.input.keyboard.on("keydown-ESC", this.keyEscapeHandler);
    }
  }

  private static unregisterKeyboardHandlers(scene: BattleScene): void {
    if (!scene.input.keyboard) {
      return;
    }
    if (this.keyLeftHandler) {
      scene.input.keyboard.off("keydown-LEFT", this.keyLeftHandler);
      this.keyLeftHandler = null;
    }
    if (this.keyRightHandler) {
      scene.input.keyboard.off("keydown-RIGHT", this.keyRightHandler);
      this.keyRightHandler = null;
    }
    if (this.keyEscapeHandler) {
      scene.input.keyboard.off("keydown-ESC", this.keyEscapeHandler);
      this.keyEscapeHandler = null;
    }
  }

  private static parseComparisonText(comparisonText: string): { titleText: string; subtitleText: string; bodyText: string } {

    const lines = comparisonText.split('\n');
    const stripBBCode = (text: string): string => {
      return text.replace(/\[.*?\]/g, '').trim();
    };

    const titleText = lines.length > 0 ? stripBBCode(lines[0]) : '';
    const subtitleText = lines.length > 1 ? stripBBCode(lines[1]) : '';
    const bodyStartIndex = lines.length > 2 && lines[2].trim() === '' ? 3 : 2;
    const bodyText = lines.slice(bodyStartIndex).join('\n');

    return { titleText, subtitleText, bodyText };
  }

  private static drawTooltipGradientBackground(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, radius: number): void {

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
      if (remainingHeight <= 0) {
        continue;
      }
      graphics.fillStyle(color, 1.0);
      graphics.fillRect(x, stepY, width, Math.min(stepHeight, remainingHeight));
    }
  }

  private static getTooltipHeight(comparisonText: string): number {
    let additionalHeight = 0;
    let adjustedLineCount = this.lineCount;

    if (this.multiHitWarning) {
      adjustedLineCount--;
      additionalHeight += 100 / 6;
    }
    if (this.flinchWarning) {
      adjustedLineCount--;
      additionalHeight += 100 / 6;
    }
    if (this.secondaryEffectNote) {
      adjustedLineCount -= 3;
      additionalHeight += 180 / 6;
    }
    if (adjustedLineCount > 7) {
      additionalHeight += (adjustedLineCount - 7) * (25 / 6);
    }

    return this.TOOLTIP_BASE_HEIGHT + additionalHeight;
  }
}