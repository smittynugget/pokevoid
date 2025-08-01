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
import i18next from "i18next";
import { getBBCodeFrag, TextStyle, addBBCodeTextObject } from "./text";
import { addWindow } from "./ui-theme";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";

export class MoveUpgradeTooltipUtils {
  
  private static tooltipContainer: Phaser.GameObjects.Container | null = null;
  private static tooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private static tooltipText: BBCodeText | null = null;
  
  
  private static readonly TOOLTIP_WIDTH = 550 / 6;
  private static readonly TOOLTIP_BASE_HEIGHT = 375 / 6;
  
  
  private static multiHitWarning: boolean = false;
  private static flinchWarning: boolean = false;
  private static secondaryEffectNote: boolean = false;
  private static lineCount: number = 0;
  
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
    
    const toRoman = (num: number): string => {
      const romanNumerals: [string, number][] = [
        ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
        ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
        ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
      ];
      let result = '';
      for (const [letter, value] of romanNumerals) {
        while (num >= value) {
          result += letter;
          num -= value;
        }
      }
      return result;
    };

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
    
    const tierDisplay = displayTier ? ` ${toRoman(displayTier)}` : "";
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
      const wrappedWarning = this.wrapTextToWidth(warningText, this.TOOLTIP_WIDTH * 2);
      wrappedWarning.forEach(line => {
        const warningLine = getBBCodeFrag(line, TextStyle.SUMMARY_GRAY, {fontSize: "30px"});
        lines.push(warningLine);
      });
    }

    const isFlinch = currentMove.attrs.some(attr => attr instanceof FlinchAttr);
    if (isFlinch) {
      const warningText = `${i18next.t("moveUpgradeAttrs:flinchWarning")}`;
      this.flinchWarning = true;
      const wrappedWarning = this.wrapTextToWidth(warningText, this.TOOLTIP_WIDTH * 2);
      wrappedWarning.forEach(line => {
        const warningLine = getBBCodeFrag(line, TextStyle.SUMMARY_GRAY, {fontSize: "30px"});
        lines.push(warningLine);
      });
    }
    
    lines.push('');
    
    lines.push(...this.compareBasicStats(scene, currentMove, upgradedMove));
    
    
    if (currentMove.chance > 0 || upgradedMove.chance > 0) {
      lines.push('');
      this.secondaryEffectNote = true;
      const chanceNoteText = `*${i18next.t("moveUpgradeAttrs:secondaryEffectNote")}`;
      const wrappedChanceNote = this.wrapTextToWidth(chanceNoteText, this.TOOLTIP_WIDTH * 1.7);
      wrappedChanceNote.forEach(line => {
        const chanceNoteLine = getBBCodeFrag(line, TextStyle.SUMMARY_GRAY, {fontSize: "25px"});
        lines.push(chanceNoteLine);
      });
    }
    
    this.lineCount = lines.filter(line => line !== undefined).length;
    return lines.filter(line => line !== undefined).join('\n');
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

    const comparisonText = this.generateComparison(scene, modifierType, isPlayer);
    if (!comparisonText) return;

    
    this.tooltipContainer = scene.add.container(0, 0);
    this.tooltipContainer.setDepth(10000000000);
    this.tooltipBg = addWindow(scene, 0, 0, this.TOOLTIP_WIDTH, this.getTooltipHeight(comparisonText));
    this.tooltipText = this.createColoredComparisonText(scene, comparisonText);
    
    const screenWidth = scene.game.canvas.width / 6;
    let tooltipX: number;
    const tooltipY = (iconPosition.y / 6) + 25;
    
    if (isPlayer) {
      
      tooltipX = (iconPosition.x / 6);
    } else {
      
      tooltipX = screenWidth + (iconPosition.x / 6) - this.TOOLTIP_WIDTH;
    }
    
    this.tooltipContainer.setPosition(tooltipX, tooltipY);

    this.tooltipContainer.add([this.tooltipBg, this.tooltipText]);
    scene.uiContainer.add(this.tooltipContainer);
  }

  static hideTooltip(scene: BattleScene): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
      this.tooltipBg = null;
      this.tooltipText = null;
    }
  }

  private static createColoredComparisonText(scene: BattleScene, comparisonText: string): BBCodeText {
    
    const textObj = addBBCodeTextObject(scene, 8, 8, comparisonText, TextStyle.WINDOW, {fontSize: "45px"});
    return textObj;
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