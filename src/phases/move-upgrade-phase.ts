import { MoveUpgradeModifierType, MoveUpgradeModifierTypeGenerator, ModifierTypeOption } from "#app/modifier/modifier-type.js";
import { Moves } from "#enums/moves.js";
import { Type } from "#app/data/type.js";
import { StatusEffect} from "#enums/status-effect";
import { getStatusEffectMessageKey } from "#app/data/status-effect";
import { ModifierType } from "#app/modifier/modifier-type.js";
import { PermaType } from "#app/modifier/perma-modifiers";
import { allMoves, MoveCategory, MultiHitType, HighCritAttr, CritOnlyAttr, FixedDamageAttr, LevelDamageAttr, RandomLevelDamageAttr, TargetHalfHpDamageAttr, RecoilAttr, SacrificialAttr, SacrificialAttrOnHit, HalfSacrificialAttr, HealAttr, HitHealAttr, MultiHitAttr, StatusEffectAttr, MultiStatusEffectAttr, StatChangeAttr, FlinchAttr, ProtectAttr, ChargeAttr, VariablePowerAttr, LowHpPowerAttr, HpPowerAttr, WeightPowerAttr, CompareWeightPowerAttr, ConsecutiveUseDoublePowerAttr, TurnDamagedDoublePowerAttr, VariableAccuracyAttr, ToxicAccuracyAttr, BlizzardAccuracyAttr, ThunderAccuracyAttr, StormAccuracyAttr, MinimizeAccuracyAttr, IgnoreOpponentStatChangesAttr, VariableDefAttr, DefDefAttr, VariableAtkAttr, DefAtkAttr, TargetAtkUserAtkAttr, IgnoreAccuracyAttr, TrapAttr, HitsTagAttr, RemoveScreensAttr, RemoveArenaTrapAttr, IncrementMovePriorityAttr, BypassSleepAttr, BypassBurnDamageReductionAttr, TypelessAttr, SurviveDamageAttr, OneHitKOAttr, OneHitKOAccuracyAttr, SheerColdAccuracyAttr, BoostHealAttr, PlantHealAttr, SandHealAttr, WeatherBallTypeAttr, TerrainPulseTypeAttr, HiddenPowerTypeAttr, MatchUserTypeAttr, RemoveTypeAttr, AddTypeAttr, CopyTypeAttr, AddBattlerTagAttr, LapseBattlerTagAttr, RemoveBattlerTagAttr, AddArenaTagAttr, AddArenaTrapTagAttr, WeatherChangeAttr, ClearWeatherAttr, TerrainChangeAttr, ClearTerrainAttr, ForceSwitchOutAttr, StealHeldItemChanceAttr, RemoveHeldItemAttr, IgnoreWeatherTypeDebuffAttr, MoveTarget, MoveFlags, MoveAttr, ConfuseAttr, MoveCondition, FirstMoveCondition, MultiHitToExactThreeCondition, MultiHitToRangeFourToEightCondition, WaterSuperEffectTypeMultiplierAttr, HealStatusEffectAttr, GyroBallPowerAttr, ElectroBallPowerAttr, MovePowerMultiplierAttr, ChangeMultiHitTypeAttr, WaterShurikenMultiHitTypeAttr, JawLockAttr, CurseAttr, RechargeAttr, WaterShurikenPowerAttr, SpitUpPowerAttr, SwallowHealAttr, MultiHitPowerIncrementAttr, LastMoveDoublePowerAttr, EatBerryAttr, StealEatBerryAttr, ExposedMoveAttr, SmittyTypeAttr, ResistLastMoveTypeAttr, FlyingTypeMultiplierAttr, ConsecutiveUseMultiBasePowerAttr, AnyTypeSuperEffectTypeMultiplierAttr, AnyTypeMultiplierAttr, TerrainMovePriorityAttr, FirstTurnPriorityAttr, ConditionalPriorityAttr, TerrainPowerBoostAttr, WeatherPowerBoostAttr } from "#app/data/move.js";
import { MoveUpgradeModifier } from "#app/modifier/modifier.js";
import { Mode } from "#app/ui/ui.js";
import { BattleStat, getBattleStatName } from "#app/data/battle-stat.js";
import * as Utils from "#app/utils.js";
import { TerrainType } from "#app/data/terrain.js";
import { BattlerTagType } from "#enums/battler-tag-type.js";
import { ArenaTagType } from "#enums/arena-tag-type.js";
import { WeatherType } from "#app/data/weather.js";
import i18next, { ParseKeys } from "i18next";
import { Phase } from "#app/phase.js";
import BattleScene from "#app/battle-scene.js";
import { RewardObtainDisplayPhase } from "./reward-obtain-display-phase.js";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import { ModifierTier } from "#app/modifier/modifier-tier.js";
import { ChargeAnim } from "#app/data/battle-anims.js";
import { SelectMoveUpgradeModifierPhase } from "./select-move-upgrade-modifier-phase.js";

function getRandomValidType(excludeTypes: Type[] = [Type.UNKNOWN, Type.STELLAR]): Type {
    const possibleTypes = Object.values(Type).filter(
        t => typeof t === "number" && !excludeTypes.includes(t)
    ) as Type[];
    return Utils.randSeedItem(possibleTypes);
}

export function getStatusEffectName(statusEffect: StatusEffect): string {
  const i18nKey = `${getStatusEffectMessageKey(statusEffect)}.name` as ParseKeys;
  return i18next.t(i18nKey);
}

function getTypeName(type: Type): string {
  return i18next.t(`pokemonInfo:Type:${Type[type]}`);
}

function toCamelCase(str: string): string {
  return str.toLowerCase().replace(/[ _-]/g, ' ').replace(/(?:^\w|\b\w|\s+)/g, (match, index) => {
    if (+match === 0) return '';
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function getWeatherName(weather: WeatherType): string {
  return i18next.t(`arenaFlyout:${toCamelCase(WeatherType[weather])}`);
}

function getTerrainName(terrain: TerrainType): string {
  return i18next.t(`arenaFlyout:${toCamelCase(TerrainType[terrain])}`);
}

function getTrapName(trap: BattlerTagType): string {
  return i18next.t(`arenaFlyout:${toCamelCase(BattlerTagType[trap])}`);
}

function getHazardName(hazard: ArenaTagType): string {
  return i18next.t(`arenaFlyout:${toCamelCase(ArenaTagType[hazard])}`);
}

/**
 * Phase that handles upgrading a move that has been used many times
 */
export class MoveUpgradePhase extends Phase {
    private moveId: Moves;
    private upgradedMoveName: string;
    private upgradeCount: number;
    
    constructor(scene: BattleScene, moveId: Moves) {
        super(scene);
        this.moveId = moveId;
        this.upgradedMoveName = allMoves[moveId].name;
        
        this.upgradeCount = this.scene.findModifiers(m => 
            m instanceof MoveUpgradeModifier && 
            (m as MoveUpgradeModifier).moveId === moveId
        ).length;
    }
    
    start(): void {
        super.start();
        
        const rewardConfig: RewardConfig = {
            type: RewardObtainedType.MODIFIER,
            name: i18next.t("moveUpgrade:rewardTitle", { count: this.upgradeCount + 1}),
            sprite: "permaLongerStatBoosts", 
            isLevelUp: true,
            modifierType: new MoveUpgradeModifierTypeGenerator().getType(this.moveId, 0, null, 0)
        };
        
        const rewardPhase = new RewardObtainDisplayPhase(
            this.scene,
            rewardConfig,
            [() => this.showMoveUpgradeOptions()]
        );
        
        this.scene.unshiftPhase(rewardPhase);
        this.end();
    }
    
    /**
     * Shows 3-4 options for upgrading the move
     */
    private showMoveUpgradeOptions(): void {
        const upgradeOptions = this.generateMoveUpgradeOptions();
        
        
        this.scene.unshiftPhase(new SelectMoveUpgradeModifierPhase(this.scene, 0, [ModifierTier.COMMON, ModifierTier.GREAT, ModifierTier.ULTRA], true, upgradeOptions, null, () => this.generateMoveUpgradeOptions()));
    }
    
    /**
     * Generate upgrade options for the move based on its characteristics
     */
    private generateMoveUpgradeOptions(): ModifierType[] {
        const baseMove = this.scene.getUpgradedMove(allMoves[this.moveId]);
        const moveGenerator = new MoveUpgradeModifierTypeGenerator();
        const upgrades: ModifierType[] = [];

        const POWER_INCREASE_SLIGHT = 10;
        const POWER_INCREASE_MODERATE = 20;
        const POWER_INCREASE_SIGNIFICANT_WEAK = 30;
        const POWER_VS_ACC_LOW_ACC_PENALTY = 20;
        const POWER_VS_ACC_HIGH_ACC_PENALTY = 30;
        const POWER_VS_PRIORITY_PENALTY = -1;
        const POWER_VS_RECOIL_QUARTER_GAIN = 20;
        const POWER_VS_RECOIL_THIRD_GAIN = 30;
        const POWER_VS_SELF_STAT_DROP_GAIN_HIGH_POWER = 20;
        const POWER_VS_SELF_STAT_DROP_GAIN_LOW_POWER = 30;
        const ACC_INCREASE_LOW_ACC_SMALL = 15;
        const ACC_INCREASE_LOW_ACC_MEDIUM = 20;
        const ACC_INCREASE_LOW_ACC_LARGE = 25;
        const ACC_INCREASE_HIGH_ACC_SMALL = 5;
        const ACC_INCREASE_HIGH_ACC_MEDIUM = 10;
        const PERFECT_ACC_POWER_PENALTY_LOW = 10;
        const PERFECT_ACC_POWER_PENALTY_MED = 20;
        const PERFECT_ACC_POWER_PENALTY_HIGH = 30;
        const ACC_VS_POWER_LOW_POWER_PENALTY = 10;
        const ACC_VS_POWER_HIGH_POWER_PENALTY = 20;
        const ACC_VS_POWER_LOW_ACC_GAIN = 15;
        const ACC_VS_POWER_HIGH_ACC_GAIN = 20;
        const CHANCE_INCREASE_LOW_CHANCE_SMALL = 15;
        const CHANCE_INCREASE_LOW_CHANCE_MEDIUM = 25;
        const CHANCE_INCREASE_HIGH_CHANCE_SMALL = 10;
        const CHANCE_INCREASE_HIGH_CHANCE_MEDIUM = 20;
        const GUARANTEE_EFFECT_POWER_PENALTY = 50;
        const GUARANTEE_EFFECT_ACC_PENALTY = 15; 
        const ADD_EFFECT_POWER_PENALTY_LOW = 5;
        const ADD_EFFECT_POWER_PENALTY_HIGH = 10;
        const ADD_STATUS_CHANCE_LOW = 20;
        const ADD_STATUS_CHANCE_HIGH = 30;
        const ADD_FLINCH_CHANCE_LOW = 20;
        const ADD_STAT_DROP_CHANCE = 30;
        const TYPE_CHANGE_POWER_BOOST = 10;
        const TYPE_CHANGE_ACC_BOOST = 10;
        const TYPE_CHANGE_ADD_STATUS_CHANCE = 10;
        const TYPELESS_POWER_BOOST = 10;
        const ADD_TYPE_EFFECTIVENESS_POWER_BOOST = 5;
        const MULTI_HIT_2_TO_5_POWER_REDUCTION_HIGH = 25;
        const MULTI_HIT_2_TO_5_POWER_TARGET = 25;
        const MULTI_HIT_4_TO_8_POWER_TARGET = 15;
        const MULTI_HIT_2_POWER_REDUCTION_HIGH = 55;
        const MULTI_HIT_2_POWER_TARGET = 35;
        const MULTI_HIT_3_POWER_REDUCTION_HIGH = 40;
        const MULTI_HIT_3_POWER_TARGET = 30;
        const MULTI_HIT_CHECK_ALL_POWER_REDUCTION = 30;
        const MULTI_HIT_CHECK_ALL_POWER_TARGET = 15;
        const MULTI_HIT_CHECK_ALL_ACC_PENALTY = 10;
        const MULTI_HIT_UPGRADE_POWER_BOOST_SMALL = 15;
        const MULTI_HIT_UPGRADE_POWER_BOOST_MEDIUM = 10;
        const MULTI_HIT_UPGRADE_POWER_PENALTY = 5;
        const MULTI_HIT_CHECK_ALL_TOGGLE_OFF_POWER_BOOST = 5;
        const MULTI_HIT_CHECK_ALL_TOGGLE_OFF_ACC_BOOST = 5;
        const MULTI_HIT_EFFECT_CHANCE = 1;
        const HITHEAL_THIRD_POWER_PENALTY = 15;
        const HITHEAL_50_POWER_PENALTY = 25;
        const HITHEAL_75_POWER_PENALTY = 40;
        const HITHEAL_UPGRADE_POWER_PENALTY = 20;
        const RECOIL_ADD_QUARTER_POWER_BOOST = 15;
        const RECOIL_ADD_THIRD_POWER_BOOST = 25;
        const RECOIL_ADD_HALF_POWER_BOOST = 35;
        const RECOIL_ADD_HALF_ACC_PENALTY = 15;
        const RECOIL_INCREASE_POWER_BOOST = 15;
        const RECOIL_DECREASE_POWER_PENALTY = 15;
        const RECOIL_REMOVE_POWER_PENALTY = 30;
        const SACRIFICIAL_POWER_TARGET_200 = 200;
        const SACRIFICIAL_POWER_TARGET_250 = 250;
        const SACRIFICIAL_HALF_POWER_TARGET_150 = 135;
        const SACRIFICIAL_ON_HIT_POWER_TARGET_180 = 180;
        const HEAL_STATUS_ADD_25 = 0.25;
        const HEAL_STATUS_ADD_50 = 0.50;
        const HEAL_STATUS_UPGRADE_INCREASE = 0.15;
        const HEAL_STATUS_UPGRADE_TARGET_66 = 0.66;
        const HEAL_STATUS_UPGRADE_TARGET_100 = 1.0;
        const ADD_STATUS_SEVERE_CHANCE = 15; 
        const ADD_STATUS_NORMAL_CHANCE = 25;
        const ADD_STATUS_SEVERE_POWER_PENALTY = 10;
        const ADD_STATUS_NORMAL_POWER_PENALTY = 5;
        const ADD_LEECH_SEED_POWER_PENALTY = 30;
        const CHANGE_STATUS_DEFAULT_CHANCE = 20;
        const ADD_DUAL_STATUS_POWER_PENALTY = 10;
        const ADD_DUAL_STATUS_CHANCE_REDUCTION = 10;
        const ADD_STATUS_TO_STATUS_MOVE_ACC_PENALTY_SEVERE = 15;
        const ADD_STATUS_TO_STATUS_MOVE_ACC_PENALTY_NORMAL = 10;
        const ADD_FLINCH_LOW_CHANCE = 10;
        const ADD_FLINCH_HIGH_CHANCE = 30;
        const ADD_FLINCH_PRIORITY_CHANCE = 20;
        const ADD_FLINCH_PRIORITY_POWER_PENALTY = 10;
        const FLINCH_INCREASE_CHANCE = 10;
        const FLINCH_INCREASE_HIGH_CHANCE = 20;
        const FLINCH_INCREASE_HIGH_POWER_PENALTY = 15;
        const ADD_STAT_BOOST_SELF_CHANCE_NON_STATUS = 20;
        const ADD_STAT_LOWER_TARGET_POWER_PENALTY = 15;
        const ADD_STAT_LOWER_TARGET_ACC_PENALTY_STATUS = 5;
        const ADD_STAT_LOWER_TARGET_HARSH_CHANCE = 30;
        const ADD_STAT_LOWER_TARGET_HARSH_POWER_PENALTY = 30;
        const ADD_STAT_LOWER_TARGET_HARSH_ACC_PENALTY_STATUS = 30;
        const MODIFY_STAT_LOWER_TARGET_POWER_PENALTY = 15;
        const MODIFY_STAT_LOWER_TARGET_ACC_PENALTY_STATUS = 15;
        const MODIFY_STAT_LOWER_TARGET_GUARANTEE_POWER_PENALTY = 30;
        const MODIFY_STAT_LOWER_TARGET_GUARANTEE_ACC_PENALTY_STATUS = 30;
        const HIGH_CRIT_POWER_PENALTY_THRESHOLD = 80;
        const HIGH_CRIT_POWER_PENALTY_ABOVE_THRESHOLD = 30;
        const HIGH_CRIT_PLUS_POWER_BOOST = 5;
        const CRIT_ONLY_POWER_PENALTY = 20;
        const CRIT_ONLY_ACC_PENALTY = 15;
        const IGNORE_PROTECT_POWER_PENALTY = 5;
        const IGNORE_ABILITIES_POWER_BOOST = 5;
        const SOUND_BASED_POWER_BOOST = 10;
        const PUNCHING_MOVE_POWER_BOOST = 10;
        const SLICING_MOVE_POWER_BOOST = 10;
        const PULSE_MOVE_POWER_BOOST = 10;
        const BITING_MOVE_POWER_BOOST = 10;
        const WIND_MOVE_POWER_BOOST = 10;
        const CONTACT_TOGGLE_POWER_BOOST = 10;
        const IGNORE_STATS_POWER_BOOST = 10;
        const REMOVE_SCREENS_POWER_BOOST = 10;
        const THAW_TARGET_POWER_BOOST = 10;
        const PRIORITY_PLUS_1_POWER_PENALTY = 25;
        const PRIORITY_PLUS_3_POWER_PENALTY = 40; 
        const PRIORITY_MINUS_1_POWER_BOOST = 20;
        const PRIORITY_MINUS_3_POWER_BOOST = 25;
        const CONDITIONAL_PRIORITY_TERRAIN_POWER_BOOST = 10;
        const CONDITIONAL_PRIORITY_FIRST_TURN_POWER_BOOST = 20;
        const CONDITIONAL_PRIORITY_TARGET_MOVED_POWER_BOOST = 15;
        const STATUS_TO_DAMAGE_BASE_POWER = 75; 
        const ADD_TRAP_POWER_PENALTY = 25;
        const FIXED_DAMAGE_40_POWER_OFFSET = 75;
        const SURVIVE_DAMAGE_POWER_BOOST = 25;
        const HP_POWER_MAX = 150;
        const CHARGE_TURN_POWER_BOOST = 50;
        const STEAL_ITEM_30_CHANCE = 0.3;
        const STEAL_ITEM_100_POWER_PENALTY = 40;
        const REMOVE_ITEM_POWER_BOOST = 15;
        const STATUS_MOVE_SELF_HEAL_AMOUNT = 0.20;
        const RECOIL_QUARTER = 0.25;
        const RECOIL_THIRD = 1/3;
        const RECOIL_HALF = 0.5;
        const HITHEAL_THIRD = 1/4;
        const HITHEAL_HALF = 0.33;
        const HITHEAL_THREE_QUARTERS = 0.75;
        const SWITCH_OUT_POWER_PENALTY = 15;

        const isPhysicalMove = baseMove.category === MoveCategory.PHYSICAL;
        const isSpecialMove = baseMove.category === MoveCategory.SPECIAL;
        const isStatusMove = baseMove.category === MoveCategory.STATUS;
        const hasPower = baseMove.power > 0;
        const baseMovePower = baseMove.power;
        const hasAccuracy = typeof baseMove.accuracy === 'number' && baseMove.accuracy > 0 && baseMove.accuracy < 101; 
        const baseMoveAccuracy = typeof baseMove.accuracy === 'number' ? baseMove.accuracy : -1; 
        const baseMoveChance = baseMove.chance > 0 ? baseMove.chance : 0; 
        const hasContact = baseMove.hasFlag(MoveFlags.MAKES_CONTACT);
        const hasRecoil = baseMove.hasAttr(RecoilAttr);
        const hasSacrificialAttr = baseMove.hasAttr(SacrificialAttr);
        const hasSacrificialAttrOnHit = baseMove.hasAttr(SacrificialAttrOnHit);
        const hasHalfSacrificialAttr = baseMove.hasAttr(HalfSacrificialAttr);
        const isSacrificial = hasSacrificialAttr || hasSacrificialAttrOnHit || hasHalfSacrificialAttr;
        const hasFlinch = baseMove.hasAttr(FlinchAttr);
        const hasProtect = baseMove.hasAttr(ProtectAttr); 
        const multiHitAttr = baseMove.getAttrs(MultiHitAttr)[0] as MultiHitAttr | undefined; 
        const isMultiHit = !!multiHitAttr;
        const hasCharge = baseMove.hasAttr(ChargeAttr);
        const hasHighCrit = baseMove.hasAttr(HighCritAttr);
        const isCritOnly = baseMove.hasAttr(CritOnlyAttr);
        const isHighCritRatio = hasHighCrit || isCritOnly; 
        const hasHealAttr = baseMove.hasAttr(HealAttr); 
        const hasHitHealAttr = baseMove.hasAttr(HitHealAttr); 
        const hasHealing = hasHealAttr || hasHitHealAttr;
        const selfBoostAttrs = baseMove.getAttrs(StatChangeAttr).filter((a:StatChangeAttr) => a.selfTarget && a.levels > 0);
        const targetLowerAttrs = baseMove.getAttrs(StatChangeAttr).filter((a:StatChangeAttr) => !a.selfTarget && a.levels < 0);
        const statusEffectAttrs = baseMove.getAttrs(StatusEffectAttr);
        const hasConfuseAttr = baseMove.hasAttr(ConfuseAttr);
        const hasStatBoostSelf = selfBoostAttrs.length > 0;
        const hasStatLowerTarget = targetLowerAttrs.length > 0;
        const hasStatusEffect = statusEffectAttrs.length > 0 || hasConfuseAttr;
        const ignoresProtect = baseMove.hasFlag(MoveFlags.IGNORE_PROTECT);
        const ignoresAbilities = baseMove.hasFlag(MoveFlags.IGNORE_ABILITIES);
        const hasVariablePower = baseMove.hasAttr(VariablePowerAttr);
        const hasFixedDamage = baseMove.hasAttr(FixedDamageAttr) || baseMove.hasAttr(LevelDamageAttr) || baseMove.hasAttr(RandomLevelDamageAttr);
        const hasPriority = baseMove.priority > 0;
        const basePriority = baseMove.priority; 
        const isSoundBased = baseMove.hasFlag(MoveFlags.SOUND_BASED);
        const isPunchingMove = baseMove.hasFlag(MoveFlags.PUNCHING_MOVE);
        const isSlicingMove = baseMove.hasFlag(MoveFlags.SLICING_MOVE);
        const isBitingMove = baseMove.hasFlag(MoveFlags.BITING_MOVE);
        const isPulseMove = baseMove.hasFlag(MoveFlags.PULSE_MOVE);
        const isBallBombMove = baseMove.hasFlag(MoveFlags.BALLBOMB_MOVE);
        const isPowderMove = baseMove.hasFlag(MoveFlags.POWDER_MOVE);
        const isDanceMove = baseMove.hasFlag(MoveFlags.DANCE_MOVE);
        const isWindMove = baseMove.hasFlag(MoveFlags.WIND_MOVE);
        const hasSecondaryEffectChance = baseMove.chance > 0 && baseMove.chance <= 100;
        const hasAnySecondaryEffect = hasSecondaryEffectChance && (hasStatLowerTarget || hasStatusEffect || hasFlinch); 
        const hasGuaranteedSecondaryEffect = (baseMove.chance === 100 || baseMove.chance === -1) && (hasStatLowerTarget || hasStatusEffect || hasFlinch); 
        const hasAnyEffectWithChance = hasAnySecondaryEffect || (hasSecondaryEffectChance && (hasStatBoostSelf || hasHitHealAttr)); 

        const possibleBoostStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
        const possibleLowerStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];

        const getPowerDelta = (threshold: number, deltaIfMet: number, deltaIfNot: number, checkLessThan: boolean = true): number => {
            if (checkLessThan ? baseMovePower <= threshold : baseMovePower >= threshold) {
                return deltaIfMet;
            }
            return deltaIfNot;
        };

        if (hasPower) {
            if (!isStatusMove) {
                upgrades.push(moveGenerator.getType(this.moveId, POWER_INCREASE_SLIGHT, null, null, 0, i18next.t("moveUpgrade:description:power:increaseSlight", { powerValue: POWER_INCREASE_SLIGHT })));
                upgrades.push(moveGenerator.getType(this.moveId, POWER_INCREASE_MODERATE, null, null, 0, i18next.t("moveUpgrade:description:power:increaseModerate", { powerValue: POWER_INCREASE_MODERATE })));
                if (baseMovePower <= 80) {
                    upgrades.push(moveGenerator.getType(this.moveId, POWER_INCREASE_SIGNIFICANT_WEAK, null, null, 0, i18next.t("moveUpgrade:description:power:increaseSignificantWeak", { powerValue: POWER_INCREASE_SIGNIFICANT_WEAK })));
                }
            }
            if (hasAccuracy && baseMoveAccuracy >= 70 && !isStatusMove) {
                let powerDelta = getPowerDelta(100, POWER_INCREASE_MODERATE, POWER_INCREASE_SLIGHT); 
                upgrades.push(moveGenerator.getType(this.moveId, powerDelta, null, null, -POWER_VS_ACC_LOW_ACC_PENALTY, i18next.t("moveUpgrade:description:power:increaseVsAccuracyLow", { powerValue: powerDelta, accuracyValue: POWER_VS_ACC_LOW_ACC_PENALTY })));
                if (baseMoveAccuracy >= 85) {
                    powerDelta = getPowerDelta(100, POWER_INCREASE_SIGNIFICANT_WEAK + 5, POWER_INCREASE_SLIGHT + 5); 
                    upgrades.push(moveGenerator.getType(this.moveId, powerDelta, null, null, -POWER_VS_ACC_HIGH_ACC_PENALTY, i18next.t("moveUpgrade:description:power:increaseVsAccuracyHigh", { powerValue: powerDelta, accuracyValue: POWER_VS_ACC_HIGH_ACC_PENALTY })));
                }
            }
            if (basePriority >= 0 && !isStatusMove) {
                const newPriority = POWER_VS_PRIORITY_PENALTY; 
                const priorityDelta = newPriority - basePriority;
                upgrades.push(moveGenerator.getType(this.moveId, POWER_INCREASE_MODERATE, null, null, 0, i18next.t("moveUpgrade:description:power:increaseVsPriority", { powerValue: POWER_INCREASE_MODERATE, priorityValue: newPriority }), null, null, [new ConditionalPriorityAttr(priorityDelta)]));
            }
            if (!hasRecoil && !isStatusMove) {
                upgrades.push(moveGenerator.getType(this.moveId, POWER_VS_RECOIL_QUARTER_GAIN, null, null, 0, i18next.t("moveUpgrade:description:power:increaseVsRecoil", { powerValue: POWER_VS_RECOIL_QUARTER_GAIN, recoilPercent: 25 }), null, null, [new RecoilAttr(false, RECOIL_QUARTER)]));
                upgrades.push(moveGenerator.getType(this.moveId, POWER_VS_RECOIL_THIRD_GAIN, null, null, 0, i18next.t("moveUpgrade:description:power:increaseVsRecoil", { powerValue: POWER_VS_RECOIL_THIRD_GAIN, recoilPercent: 33 }), null, null, [new RecoilAttr(false, RECOIL_THIRD)]));
            }
             if (!isStatusMove && !selfBoostAttrs.some((a:StatChangeAttr) => a.levels < 0)) { 
                const mainStat = isPhysicalMove ? BattleStat.ATK : BattleStat.SPATK;
                const otherStats = [BattleStat.DEF, BattleStat.SPDEF, BattleStat.SPD].concat(isPhysicalMove ? [] : [BattleStat.ATK]); 
                const statsToDrop = [mainStat, Utils.randSeedItem(otherStats.filter(s => s !== mainStat))]; 
                let powerDelta = getPowerDelta(90, POWER_VS_SELF_STAT_DROP_GAIN_LOW_POWER, POWER_VS_SELF_STAT_DROP_GAIN_HIGH_POWER);
                const statDropLevel = 1;
                const statName1 = getBattleStatName(statsToDrop[0]);
                const statName2 = getBattleStatName(statsToDrop[1]);
                upgrades.push(moveGenerator.getType(this.moveId, powerDelta, null, null, 0, i18next.t("moveUpgrade:description:power:increaseVsSelfStatDrop", { powerValue: powerDelta, statName1: statName1, statName2: statName2, stages: statDropLevel }), null, null, [new StatChangeAttr(statsToDrop, -statDropLevel, true, null, false, true)]));
            }
        }

        if (hasAccuracy && baseMoveAccuracy < 100) {
            const accBoostSmall = baseMoveAccuracy < 60 ? ACC_INCREASE_LOW_ACC_SMALL : ACC_INCREASE_HIGH_ACC_SMALL;
            const accBoostMedium = baseMoveAccuracy < 60 ? ACC_INCREASE_LOW_ACC_MEDIUM : ACC_INCREASE_HIGH_ACC_MEDIUM;
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, accBoostSmall, i18next.t("moveUpgrade:description:accuracy:increasePercentage", { value: accBoostSmall })));
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, accBoostMedium, i18next.t("moveUpgrade:description:accuracy:increasePercentage", { value: accBoostMedium })));
            if (baseMoveAccuracy < 60) {
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, ACC_INCREASE_LOW_ACC_LARGE, i18next.t("moveUpgrade:description:accuracy:increasePercentage", { value: ACC_INCREASE_LOW_ACC_LARGE })));
            }
            if (baseMoveAccuracy >= 95) {
                let powerDelta = -PERFECT_ACC_POWER_PENALTY_MED; 
                if (hasPower && baseMovePower >= 70) {
                   powerDelta = -PERFECT_ACC_POWER_PENALTY_HIGH;
                } else if (hasPower && baseMovePower < 50) {
                    powerDelta = -PERFECT_ACC_POWER_PENALTY_LOW;
                }
                const accuracyDelta = 101 - baseMoveAccuracy; 
                if (!isStatusMove) {
                    upgrades.push(moveGenerator.getType(this.moveId, powerDelta, null, null, accuracyDelta, i18next.t("moveUpgrade:description:accuracy:perfectAccuracy", { powerValue: Math.abs(powerDelta) }), null, null, []));
                } else { 
                    upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, accuracyDelta, i18next.t("moveUpgrade:description:accuracy:perfectAccuracyNoPenalty"), null, null, []));
                }
            }
            if (hasPower && baseMovePower >= 50 && !isStatusMove) {
                upgrades.push(moveGenerator.getType(this.moveId, -ACC_VS_POWER_LOW_POWER_PENALTY, null, null, ACC_VS_POWER_LOW_ACC_GAIN, i18next.t("moveUpgrade:description:accuracy:increaseVsPowerLow", { accuracyValue: ACC_VS_POWER_LOW_ACC_GAIN, powerValue: ACC_VS_POWER_LOW_POWER_PENALTY })));
                if (baseMovePower >= 80) {
                     upgrades.push(moveGenerator.getType(this.moveId, -ACC_VS_POWER_HIGH_POWER_PENALTY, null, null, ACC_VS_POWER_HIGH_ACC_GAIN, i18next.t("moveUpgrade:description:accuracy:increaseVsPowerHigh", { accuracyValue: ACC_VS_POWER_HIGH_ACC_GAIN, powerValue: ACC_VS_POWER_HIGH_POWER_PENALTY })));
                }
            }
            if (baseMove.pp >= 10) {
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, ACC_VS_POWER_LOW_ACC_GAIN, i18next.t("moveUpgrade:description:accuracy:increaseVsPp", { accuracyValue: ACC_VS_POWER_LOW_ACC_GAIN }))); 
            }
        }
        if (baseMoveAccuracy === -1 && isStatusMove) {
             const targetAcc90 = 90;
             const targetAcc100 = 100;
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, targetAcc90, i18next.t("moveUpgrade:description:accuracy:setAccuracy", { value: targetAcc90 }))); 
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, targetAcc100, i18next.t("moveUpgrade:description:accuracy:setAccuracy", { value: targetAcc100 }))); 
        }

        if (hasAnyEffectWithChance && baseMoveChance < 100) { 
            const chanceIncreaseSmall = baseMoveChance < 30 ? CHANCE_INCREASE_LOW_CHANCE_SMALL : CHANCE_INCREASE_HIGH_CHANCE_SMALL;
            const chanceIncreaseMedium = baseMoveChance < 40 ? CHANCE_INCREASE_LOW_CHANCE_MEDIUM : CHANCE_INCREASE_HIGH_CHANCE_MEDIUM;
            const newChanceSmall = Math.min(100, baseMoveChance + chanceIncreaseSmall);
            const newChanceMedium = Math.min(100, baseMoveChance + chanceIncreaseMedium);

            if (newChanceSmall > baseMoveChance) {
                upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:effectChance:increaseToValue", { value: newChanceSmall }), newChanceSmall));
            }
            if (newChanceMedium > baseMoveChance && newChanceMedium > newChanceSmall) {
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:effectChance:increaseToValue", { value: newChanceMedium }), newChanceMedium));
            }
            if (baseMoveChance < 100) {
                const guaranteeChance = 100;
                if (hasPower && baseMovePower >= 20 && !isStatusMove) {
                    upgrades.push(moveGenerator.getType(this.moveId, -GUARANTEE_EFFECT_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:effectChance:guaranteeVsPower", { powerValue: GUARANTEE_EFFECT_POWER_PENALTY }), guaranteeChance));
                } else if (isStatusMove) { 
                     upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, -GUARANTEE_EFFECT_ACC_PENALTY, i18next.t("moveUpgrade:description:effectChance:guaranteeVsAccuracy", { accuracyValue: GUARANTEE_EFFECT_ACC_PENALTY }), guaranteeChance));
                }
                 if (baseMove.pp >= 10) {
                     upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:effectChance:guaranteeVsPp"), guaranteeChance)); 
                 }
            }
        } else if (!isStatusMove && !hasAnySecondaryEffect && !hasGuaranteedSecondaryEffect && !hasFlinch) { 
            const randomStatus = Utils.randSeedItem([StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.FREEZE, StatusEffect.POISON]);
            let newAttrStatus = new StatusEffectAttr(randomStatus);
            const statusName = getStatusEffectName(randomStatus);
            upgrades.push(moveGenerator.getType(this.moveId, -ADD_EFFECT_POWER_PENALTY_LOW, null, null, 0, i18next.t("moveUpgrade:description:status:addChanceVsPower", { chance: ADD_STATUS_CHANCE_LOW, statusName: statusName, powerValue: ADD_EFFECT_POWER_PENALTY_LOW }), ADD_STATUS_CHANCE_LOW, null, [newAttrStatus]));
            upgrades.push(moveGenerator.getType(this.moveId, -ADD_EFFECT_POWER_PENALTY_HIGH, null, null, 0, i18next.t("moveUpgrade:description:status:addChanceVsPower", { chance: ADD_STATUS_CHANCE_HIGH, statusName: statusName, powerValue: ADD_EFFECT_POWER_PENALTY_HIGH }), ADD_STATUS_CHANCE_HIGH, null, [newAttrStatus]));

            upgrades.push(moveGenerator.getType(this.moveId, -ADD_EFFECT_POWER_PENALTY_LOW, null, null, 0, i18next.t("moveUpgrade:description:flinch:addChanceHighVsPower", { chance: ADD_FLINCH_CHANCE_LOW, powerValue: ADD_EFFECT_POWER_PENALTY_LOW }), ADD_FLINCH_CHANCE_LOW, null, [new FlinchAttr()]));

            const randomStat = Utils.randSeedItem([BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC]);
            const statDropName = getBattleStatName(randomStat);
            const statDropStages = 1;
             upgrades.push(moveGenerator.getType(this.moveId, -ADD_EFFECT_POWER_PENALTY_LOW, null, null, 0, i18next.t("moveUpgrade:description:stat:addLowerTargetChance", { chance: ADD_STAT_DROP_CHANCE, statName: statDropName, stages: statDropStages, powerValue: ADD_EFFECT_POWER_PENALTY_LOW }), ADD_STAT_DROP_CHANCE, null, [new StatChangeAttr(randomStat, -statDropStages, false)]));
        }

        const possibleTypes = Object.values(Type).filter(
            t => typeof t === "number" && t > Type.UNKNOWN && t < Type.STELLAR && t !== baseMove.type
        ) as Type[];
        const shuffledTypes = this.shuffleArray([...possibleTypes]);

        for (let i = 0; i < 4 && i < shuffledTypes.length; i++) { 
            const typeChange = shuffledTypes[i];
            const typeName = getTypeName(typeChange);
            let powerAdjust = TYPE_CHANGE_POWER_BOOST;
            let accAdjust = 0;
            let descriptionKey = "moveUpgrade:description:type:changePowerBoost";
            let descriptionParams: any = { typeName: typeName, powerValue: powerAdjust };
            let attrs: MoveAttr[] = [];
            let chance: number | null = null;

            if (i === 1) { 
                powerAdjust = 0;
                accAdjust = TYPE_CHANGE_ACC_BOOST;
                descriptionKey = "moveUpgrade:description:type:changeAccuracyBoost";
                descriptionParams = { typeName: typeName, accuracyValue: accAdjust };
            } else if (i === 2 && !hasAnySecondaryEffect && !hasStatusEffect && !isStatusMove) { 
                powerAdjust = -ADD_EFFECT_POWER_PENALTY_LOW;
                const randomStatus = Utils.randSeedItem([StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON]);
                const statusName = getStatusEffectName(randomStatus);
                attrs.push(new StatusEffectAttr(randomStatus));
                chance = TYPE_CHANGE_ADD_STATUS_CHANCE;
                descriptionKey = "moveUpgrade:description:type:changeAddStatus";
                descriptionParams = { typeName: typeName, chance: chance, statusName: statusName, powerValue: Math.abs(powerAdjust) }; 
                 if (!isStatusMove) { 
                     upgrades.push(moveGenerator.getType(this.moveId, powerAdjust, typeChange, null, accAdjust, i18next.t(descriptionKey, descriptionParams) as string, chance, null, attrs));
                 }
                 continue; 
            } else if (i === 3 && !isHighCritRatio && !isStatusMove) { 
                 powerAdjust = 0; 
                 descriptionKey = "moveUpgrade:description:type:changeAddHighCrit";
                 descriptionParams = { typeName: typeName };
                 attrs.push(new HighCritAttr());
            }

            if (!isStatusMove || powerAdjust === 0) {
                 upgrades.push(moveGenerator.getType(this.moveId, powerAdjust, typeChange, null, accAdjust, i18next.t(descriptionKey, descriptionParams) as string, chance, null, attrs));
            }
        }

        if (!isStatusMove && !baseMove.hasAttr(AnyTypeMultiplierAttr)) {
            const addedType = shuffledTypes[0];
            const addedTypeName = getTypeName(addedType);
            upgrades.push(moveGenerator.getType(this.moveId, ADD_TYPE_EFFECTIVENESS_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:type:addTypeEffectiveness", { typeName: addedTypeName, powerValue: ADD_TYPE_EFFECTIVENESS_POWER_BOOST }), null, null, [new AnyTypeMultiplierAttr(addedType)]));
        }

        if (!isStatusMove && !baseMove.hasAttr(AnyTypeSuperEffectTypeMultiplierAttr)) {
             const targetType = shuffledTypes[0];
             const targetTypeName = getTypeName(targetType);
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:superEffectiveVsType", { targetTypeName: targetTypeName }), null, null, [new AnyTypeSuperEffectTypeMultiplierAttr(targetType)]));
        }

        if (!baseMove.hasAttr(TypelessAttr) && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, TYPELESS_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:type:becomeTypeless", { powerValue: TYPELESS_POWER_BOOST }), null, null, [new TypelessAttr()]));
        }
        if (!isStatusMove && !baseMove.hasAttr(MatchUserTypeAttr)) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:matchUserType"), null, null, [new MatchUserTypeAttr()]));
        }
        if (!isStatusMove && !baseMove.hasAttr(WeatherBallTypeAttr)) {
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:weatherBall"), null, null, [new WeatherBallTypeAttr()]));
        }
        if (!isStatusMove && !baseMove.hasAttr(TerrainPulseTypeAttr) && baseMove.type !== Type.NORMAL) { 
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:terrainPulse"), null, null, [new TerrainPulseTypeAttr()]));
        }
        if (!isStatusMove && !baseMove.hasAttr(HiddenPowerTypeAttr) && baseMove.type !== Type.NORMAL) {
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:hiddenPower"), null, null, [new HiddenPowerTypeAttr()]));
        }


        if (!isMultiHit && !isStatusMove && baseMovePower > 10) {
            const power2to5 = -baseMovePower + MULTI_HIT_2_TO_5_POWER_TARGET;
            upgrades.push(moveGenerator.getType(this.moveId, power2to5, null, null, 0, i18next.t("moveUpgrade:description:multiHit:add2to5", { powerValue: MULTI_HIT_2_TO_5_POWER_TARGET, chance: MULTI_HIT_EFFECT_CHANCE }), MULTI_HIT_EFFECT_CHANCE, null, [new MultiHitAttr(MultiHitType._2_TO_5)]));

            const power2 = -baseMovePower + MULTI_HIT_2_POWER_TARGET
            upgrades.push(moveGenerator.getType(this.moveId, power2, null, null, 0, i18next.t("moveUpgrade:description:multiHit:addExact", { hits: 2, powerValue: MULTI_HIT_2_POWER_TARGET, chance: MULTI_HIT_EFFECT_CHANCE }), MULTI_HIT_EFFECT_CHANCE, null, [new MultiHitAttr(MultiHitType._2)]));

            const power3 = -baseMovePower + MULTI_HIT_3_POWER_TARGET;
            upgrades.push(moveGenerator.getType(this.moveId, power3, null, null, 0, i18next.t("moveUpgrade:description:multiHit:addExact", { hits: 3, powerValue: MULTI_HIT_3_POWER_TARGET, chance: MULTI_HIT_EFFECT_CHANCE }), MULTI_HIT_EFFECT_CHANCE, null, [new MultiHitAttr(MultiHitType._3)]));

            if (hasAccuracy && baseMoveAccuracy < 100) {
                 const powerCheckAll = -baseMovePower + MULTI_HIT_CHECK_ALL_POWER_TARGET;
                 upgrades.push(moveGenerator.getType(this.moveId, powerCheckAll, null, null, -MULTI_HIT_CHECK_ALL_ACC_PENALTY, i18next.t("moveUpgrade:description:multiHit:addCheckAll", { hits: 2, powerValue: MULTI_HIT_CHECK_ALL_POWER_TARGET, accuracyReduction: MULTI_HIT_CHECK_ALL_ACC_PENALTY, chance: MULTI_HIT_EFFECT_CHANCE }), MULTI_HIT_EFFECT_CHANCE, null, [new MultiHitAttr(MultiHitType._2)], [], MoveFlags.CHECK_ALL_HITS));
            }
        } else if (isMultiHit && multiHitAttr && !isStatusMove) { 
            const currentType = multiHitAttr.getMultiHitType;

            if (currentType === MultiHitType._2_TO_5) {
                upgrades.push(moveGenerator.getType(this.moveId, -baseMovePower + MULTI_HIT_3_POWER_TARGET, null, null, 0, i18next.t("moveUpgrade:description:multiHit:changeToExact", { hits: 3, powerValue: MULTI_HIT_3_POWER_TARGET, chance: MULTI_HIT_EFFECT_CHANCE }), MULTI_HIT_EFFECT_CHANCE, null, [new ChangeMultiHitTypeAttr()], [new MultiHitToExactThreeCondition()]));
                upgrades.push(moveGenerator.getType(this.moveId, -baseMovePower + MULTI_HIT_4_TO_8_POWER_TARGET, null, null, 0, i18next.t("moveUpgrade:description:multiHit:changeToRange", { range: "4-8", powerValue: MULTI_HIT_4_TO_8_POWER_TARGET, chance: MULTI_HIT_EFFECT_CHANCE }), MULTI_HIT_EFFECT_CHANCE, null, [new ChangeMultiHitTypeAttr()], [new MultiHitToRangeFourToEightCondition()]));
            }
            else if (currentType === MultiHitType._2) {
                upgrades.push(moveGenerator.getType(this.moveId, -baseMovePower + MULTI_HIT_3_POWER_TARGET, null, null, 0, i18next.t("moveUpgrade:description:multiHit:changeToExact", { hits: 3, powerValue: MULTI_HIT_3_POWER_TARGET, chance: MULTI_HIT_EFFECT_CHANCE }), MULTI_HIT_EFFECT_CHANCE, null, [new ChangeMultiHitTypeAttr()], [new MultiHitToExactThreeCondition()]));
            }
             else if (currentType === MultiHitType._3) {
                 upgrades.push(moveGenerator.getType(this.moveId, -baseMovePower + MULTI_HIT_4_TO_8_POWER_TARGET, null, null, 0, i18next.t("moveUpgrade:description:multiHit:changeToRange", { range: "4-8", powerValue: MULTI_HIT_4_TO_8_POWER_TARGET, chance: MULTI_HIT_EFFECT_CHANCE }), MULTI_HIT_EFFECT_CHANCE, null, [new ChangeMultiHitTypeAttr()], [new MultiHitToRangeFourToEightCondition()]));
            }

            if (!baseMove.hasFlag(MoveFlags.CHECK_ALL_HITS) && hasAccuracy && baseMoveAccuracy < 100) {
                upgrades.push(moveGenerator.getType(this.moveId, MULTI_HIT_UPGRADE_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:multiHit:enableCheckAll", { powerValue: MULTI_HIT_UPGRADE_POWER_PENALTY, accuracyValue: 0 }), null, null, [], [], MoveFlags.CHECK_ALL_HITS));
            }

            if (baseMove.hasFlag(MoveFlags.CHECK_ALL_HITS)) {
                 upgrades.push(moveGenerator.getType(this.moveId, MULTI_HIT_CHECK_ALL_TOGGLE_OFF_POWER_BOOST, null, null, MULTI_HIT_CHECK_ALL_TOGGLE_OFF_ACC_BOOST, i18next.t("moveUpgrade:description:multiHit:disableCheckAll", { powerValue: MULTI_HIT_CHECK_ALL_TOGGLE_OFF_POWER_BOOST, accuracyValue: MULTI_HIT_CHECK_ALL_TOGGLE_OFF_ACC_BOOST }), null, null, [], [], MoveFlags.CHECK_ALL_HITS));
            }
        }

        if (!isStatusMove) {
            if (!hasHitHealAttr) {
                upgrades.push(moveGenerator.getType(this.moveId, -HITHEAL_THIRD_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:heal:addHitHealVsPower", { percent: 33, powerValue: HITHEAL_THIRD_POWER_PENALTY  }), null, null, [new HitHealAttr(HITHEAL_THIRD)]));
                upgrades.push(moveGenerator.getType(this.moveId, -HITHEAL_50_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:heal:addHitHealVsPower", { percent: 50, powerValue: HITHEAL_50_POWER_PENALTY }), null, null, [new HitHealAttr(HITHEAL_HALF)]));
            }
            else { 
                const healAttr = baseMove.getAttrs(HitHealAttr)[0] as HitHealAttr; 
                const currentRatio = (healAttr as any).healRatio ?? 0; 
                if (currentRatio < HITHEAL_THREE_QUARTERS) {
                    const newRatio = Math.min(HITHEAL_THREE_QUARTERS, currentRatio + 0.25); 
                    upgrades.push(moveGenerator.getType(this.moveId, -HITHEAL_UPGRADE_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:heal:increaseHitHealVsPower", { percent: Math.round(newRatio * 100), powerValue: HITHEAL_UPGRADE_POWER_PENALTY }), null, null, [new HitHealAttr(newRatio)]));
                }
            }

            if (!hasRecoil) {
                upgrades.push(moveGenerator.getType(this.moveId, RECOIL_ADD_QUARTER_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:recoil:addVsPower", { percent: 25, powerValue: RECOIL_ADD_QUARTER_POWER_BOOST }), null, null, [new RecoilAttr(false, RECOIL_QUARTER)]));
                upgrades.push(moveGenerator.getType(this.moveId, RECOIL_ADD_THIRD_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:recoil:addVsPower", { percent: 33, powerValue: RECOIL_ADD_THIRD_POWER_BOOST }), null, null, [new RecoilAttr(false, RECOIL_THIRD)]));
                upgrades.push(moveGenerator.getType(this.moveId, RECOIL_ADD_HALF_POWER_BOOST, null, null, -RECOIL_ADD_HALF_ACC_PENALTY, i18next.t("moveUpgrade:description:recoil:addVsPowerAccuracy", { percent: 50, powerValue: RECOIL_ADD_HALF_POWER_BOOST, accuracyValue: RECOIL_ADD_HALF_ACC_PENALTY }), null, null, [new RecoilAttr(false, RECOIL_HALF)]));
            } else { 
                 const recoilAttr = baseMove.getAttrs(RecoilAttr)[0] as RecoilAttr;
                 const currentRatio = recoilAttr.damageRatio ?? 0;
                 if (currentRatio < RECOIL_HALF) {
                     const newRatio = Math.min(RECOIL_HALF, currentRatio + 0.15);
                     upgrades.push(moveGenerator.getType(this.moveId, RECOIL_INCREASE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:recoil:increaseVsPower", { percent: Math.round(newRatio * 100), powerValue: RECOIL_INCREASE_POWER_BOOST }), null, null, [new RecoilAttr(recoilAttr.useHp, newRatio, recoilAttr.unblockable)]));
                 }
                 if (currentRatio > 0.15) { 
                     const newRatio = Math.max(0.1, currentRatio - 0.15); 
                     upgrades.push(moveGenerator.getType(this.moveId, -RECOIL_DECREASE_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:recoil:decreaseVsPower", { percent: Math.round(newRatio * 100), powerValue: RECOIL_DECREASE_POWER_PENALTY }), null, null, [new RecoilAttr(recoilAttr.useHp, newRatio, recoilAttr.unblockable)]));
                 }
                 upgrades.push(moveGenerator.getType(this.moveId, -RECOIL_REMOVE_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:recoil:removeVsPower", { powerValue: RECOIL_REMOVE_POWER_PENALTY }), null, null, [new RecoilAttr(recoilAttr.useHp, 0, recoilAttr.unblockable)]));
            }
            if (!isSacrificial && baseMove.id !== Moves.STRUGGLE) { 
                const powerDelta200 = Math.max(0, SACRIFICIAL_POWER_TARGET_200 - baseMovePower);
                upgrades.push(moveGenerator.getType(this.moveId, powerDelta200, null, null, 0, i18next.t("moveUpgrade:description:sacrificial:addFull", { power: SACRIFICIAL_POWER_TARGET_200 }), null, null, [new SacrificialAttr()]));

                const powerDelta250 = Math.max(0, SACRIFICIAL_POWER_TARGET_250 - baseMovePower);
                upgrades.push(moveGenerator.getType(this.moveId, powerDelta250, null, null, 0, i18next.t("moveUpgrade:description:sacrificial:addFull", { power: SACRIFICIAL_POWER_TARGET_250 }), null, null, [new SacrificialAttr()]));

                const powerDelta150 = Math.max(0, SACRIFICIAL_HALF_POWER_TARGET_150 - baseMovePower);
                upgrades.push(moveGenerator.getType(this.moveId, powerDelta150, null, null, 0, i18next.t("moveUpgrade:description:sacrificial:addHalf", { power: SACRIFICIAL_HALF_POWER_TARGET_150 }), null, null, [new HalfSacrificialAttr()]));

                const powerDelta180 = Math.max(0, SACRIFICIAL_ON_HIT_POWER_TARGET_180 - baseMovePower);
                upgrades.push(moveGenerator.getType(this.moveId, powerDelta180, null, null, 0, i18next.t("moveUpgrade:description:sacrificial:addOnHit", { power: SACRIFICIAL_ON_HIT_POWER_TARGET_180 }), null, null, [new SacrificialAttrOnHit()]));
            }
        }

        if (isStatusMove && !hasHealAttr) { 
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:heal:addSelfHeal", { percent: Math.round(HEAL_STATUS_ADD_25 * 100) }), null, null, [new HealAttr(HEAL_STATUS_ADD_25, true, true)]));
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:heal:addPlantHeal"), null, null, [new PlantHealAttr()]));
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:heal:addSandHeal"), null, null, [new SandHealAttr()]));
        }

        if (!isStatusMove && !hasAnySecondaryEffect && !hasGuaranteedSecondaryEffect && !hasFlinch) { 
            const statuses = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.FREEZE, StatusEffect.SLEEP, StatusEffect.TOXIC];
            const shuffledStatuses = this.shuffleArray(statuses);

            for (let i = 0; i < 3 && i < shuffledStatuses.length; i++) {
                const status = shuffledStatuses[i];
                const isSevereStatus = [StatusEffect.FREEZE, StatusEffect.SLEEP, StatusEffect.TOXIC].includes(status);
                let chance = isSevereStatus ? ADD_STATUS_SEVERE_CHANCE : ADD_STATUS_NORMAL_CHANCE;
                let powerAdjust = isSevereStatus ? -ADD_STATUS_SEVERE_POWER_PENALTY : -ADD_STATUS_NORMAL_POWER_PENALTY;
                let attr: MoveAttr = new StatusEffectAttr(status);
                const statusName = getStatusEffectName(status);
                upgrades.push(moveGenerator.getType(this.moveId, powerAdjust, null, null, 0, i18next.t("moveUpgrade:description:status:addChanceVsPower", { chance: chance, statusName: statusName, powerValue: Math.abs(powerAdjust) }), chance, null, [attr]));
            }
            if (!baseMove.getAttrs(AddBattlerTagAttr).some((a:AddBattlerTagAttr) => a.tagType === BattlerTagType.SEEDED)) {
                upgrades.push(moveGenerator.getType(this.moveId, -ADD_LEECH_SEED_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:status:addLeechSeed", { powerValue: ADD_LEECH_SEED_POWER_PENALTY }), 100, null, [new AddBattlerTagAttr(BattlerTagType.SEEDED)]));
            }
        } else if (!isStatusMove && (hasAnySecondaryEffect || hasGuaranteedSecondaryEffect)) { 
            const currentStatusAttr = statusEffectAttrs[0] as StatusEffectAttr | undefined;
            const currentStatus = currentStatusAttr?.effect

            if (currentStatus) {
                const otherStatuses = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.FREEZE, StatusEffect.SLEEP, StatusEffect.TOXIC]
                    .filter(s => s !== currentStatus);
                if (otherStatuses.length > 0) {
                    const newStatus = Utils.randSeedItem(otherStatuses);
                    let newAttr: MoveAttr = new StatusEffectAttr(newStatus);
                    const chance = baseMoveChance > 0 ? baseMoveChance : CHANGE_STATUS_DEFAULT_CHANCE; 
                    const newStatusName = getStatusEffectName(newStatus);
                    upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:status:changeEffect", { chance: chance, statusName: newStatusName }), chance, null, [newAttr])); 
                }
            }
             if (currentStatus && !baseMove.hasAttr(MultiStatusEffectAttr)) {
                 const possibleNewStatuses = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.FREEZE].filter(s => s !== currentStatus);
                 if (possibleNewStatuses.length > 0) {
                     const newStatus = Utils.randSeedItem(possibleNewStatuses);
                     const combinedStatuses = [currentStatus, newStatus];
                     const chance = Math.max(10, baseMoveChance - ADD_DUAL_STATUS_CHANCE_REDUCTION); 
                     const statusName1 = getStatusEffectName(currentStatus);
                     const statusName2 = getStatusEffectName(newStatus);
                     upgrades.push(moveGenerator.getType(this.moveId, -ADD_DUAL_STATUS_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:status:addSecondEffect", { chance: chance, statusName1: statusName1, statusName2: statusName2, powerValue: ADD_DUAL_STATUS_POWER_PENALTY }), chance, null, [new MultiStatusEffectAttr(combinedStatuses)])); 
                 }
             }
        }

        if (isStatusMove && !hasStatusEffect && !hasStatBoostSelf && !hasStatLowerTarget && !hasHealAttr) {
             const statusesToAdd = [StatusEffect.PARALYSIS, StatusEffect.BURN, StatusEffect.POISON, StatusEffect.SLEEP, StatusEffect.TOXIC];
             const shuffledStatuses = this.shuffleArray(statusesToAdd);
             for (let i = 0; i < 2 && i < shuffledStatuses.length; i++) {
                const status = shuffledStatuses[i];
                const isSevereStatus = [StatusEffect.SLEEP, StatusEffect.TOXIC].includes(status);
                let accuracyPenalty = isSevereStatus ? ADD_STATUS_TO_STATUS_MOVE_ACC_PENALTY_SEVERE : ADD_STATUS_TO_STATUS_MOVE_ACC_PENALTY_NORMAL;
                let currentAccForCalc = baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy; 
                let targetAcc = Math.max(50, currentAccForCalc - accuracyPenalty);
                let accuracyDelta = targetAcc - currentAccForCalc;

                let attr: MoveAttr = new StatusEffectAttr(status);
                const statusName = getStatusEffectName(status);
                upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, accuracyDelta, i18next.t("moveUpgrade:description:status:addStatusViaStatusMove", { statusName: statusName, accuracyValue: targetAcc }), 100, null, [attr]));
             }
        }

        if (!isStatusMove && !hasFlinch) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:flinch:addChanceLow", {chance: ADD_FLINCH_LOW_CHANCE }), ADD_FLINCH_LOW_CHANCE, null, [new FlinchAttr()]));
            upgrades.push(moveGenerator.getType(this.moveId, -ADD_EFFECT_POWER_PENALTY_LOW, null, null, 0, i18next.t("moveUpgrade:description:flinch:addChanceHighVsPower", { powerValue: ADD_EFFECT_POWER_PENALTY_LOW, chance: ADD_FLINCH_HIGH_CHANCE }), ADD_FLINCH_HIGH_CHANCE, null, [new FlinchAttr()]));
            if (hasPriority) {
                 upgrades.push(moveGenerator.getType(this.moveId, -ADD_FLINCH_PRIORITY_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:flinch:addChancePriorityVsPower", { powerValue: ADD_FLINCH_PRIORITY_POWER_PENALTY, chance: ADD_FLINCH_PRIORITY_CHANCE }), ADD_FLINCH_PRIORITY_CHANCE, null, [new FlinchAttr()]));
            }
        } else if (!isStatusMove && hasFlinch && baseMoveChance < 60) { 
            const newChance = Math.min(baseMoveChance + FLINCH_INCREASE_CHANCE, 60);
            if (newChance > baseMoveChance) {
                upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:flinch:increaseChance", { chance: newChance }), newChance));
            }
            if (newChance < 60) { 
                 const newerChance = Math.min(baseMoveChance + FLINCH_INCREASE_HIGH_CHANCE, 60);
                 if (newerChance > newChance) {
                    upgrades.push(moveGenerator.getType(this.moveId, -FLINCH_INCREASE_HIGH_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:flinch:increaseChanceVsPower", { chance: newerChance, powerValue: FLINCH_INCREASE_HIGH_POWER_PENALTY }), newerChance));
                 }
            }
        }

        if (!hasStatBoostSelf) {
            const stat1 = Utils.randSeedItem(possibleBoostStats);
            const stat1Name = getBattleStatName(stat1);
            const stages1 = 1;
            const statusVsAttackChance = isStatusMove ? 100 : ADD_STAT_BOOST_SELF_CHANCE_NON_STATUS;
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:stat:addRaiseSelfSingle", { statName: stat1Name, stages: stages1, chance: statusVsAttackChance }), statusVsAttackChance, null, [new StatChangeAttr(stat1, stages1, true)]));
        } else { 
            const attr = selfBoostAttrs[0] as StatChangeAttr; 
            const currentLevels = attr.levels;
            const currentStats = Array.isArray(attr.stats) ? attr.stats : [attr.stats];
            const currentStatNames = currentStats.map(s => getBattleStatName(s)).join(" & "); 

            if (currentLevels === 1) {
                  const newLevels = 2;
                  upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:stat:increaseRaiseSelf", { statName: currentStatNames, stages: newLevels }), baseMoveChance || 100, null, [new StatChangeAttr(attr.stats, newLevels, true)])); 
            } else if (currentLevels === 2 && isStatusMove) { 
                  const newLevels = 3;
                  upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:stat:increaseRaiseSelf", { statName: currentStatNames, stages: newLevels }), 100, null, [new StatChangeAttr(attr.stats, newLevels, true)])); 
            }

            const potentialNewStats = possibleBoostStats.filter(s => !currentStats.includes(s));
            if (potentialNewStats.length > 0) {
                 const newStat = Utils.randSeedItem(potentialNewStats);
                 const newStatName = getBattleStatName(newStat);
                 const allStats = [...currentStats, newStat];
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:stat:addAnotherRaiseSelf", { existingStats: currentStatNames, newStatName: newStatName, stages: currentLevels }), baseMoveChance || 100, null, [new StatChangeAttr(allStats, currentLevels, true)])); 
            }
        }

        if (!hasStatLowerTarget) {
            const stat1 = Utils.randSeedItem(possibleLowerStats);
            const stat1Name = getBattleStatName(stat1);
            const stages1 = 1;
            const powerPenalty = isStatusMove ? 0 : -ADD_STAT_LOWER_TARGET_POWER_PENALTY;
            const accPenalty = isStatusMove ? -ADD_STAT_LOWER_TARGET_ACC_PENALTY_STATUS : 0;
            const targetAcc = Math.max(50, (baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy) + accPenalty);
                upgrades.push(moveGenerator.getType(this.moveId, powerPenalty, null, null, accPenalty, i18next.t("moveUpgrade:description:stat:addLowerTargetSingle", { statName: stat1Name, stages: stages1, accuracy: targetAcc, powerValue: Math.abs(powerPenalty) }), 100, null, [new StatChangeAttr(stat1, -stages1, false)]));

             if (!isStatusMove) { 
                 const stat2 = Utils.randSeedItem(possibleLowerStats);
                 const stat2Name = getBattleStatName(stat2);
                 const stages2 = 2;
                 upgrades.push(moveGenerator.getType(this.moveId, -ADD_STAT_LOWER_TARGET_HARSH_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:stat:addLowerTargetHarshChance", { statName: stat2Name, stages: stages2, chance: ADD_STAT_LOWER_TARGET_HARSH_CHANCE, powerValue: ADD_STAT_LOWER_TARGET_HARSH_POWER_PENALTY }), ADD_STAT_LOWER_TARGET_HARSH_CHANCE, null, [new StatChangeAttr(stat2, -stages2, false)]));
             }
             if (isStatusMove) { 
                 const stages2 = 2;
                 const harshAccPenalty = -ADD_STAT_LOWER_TARGET_HARSH_ACC_PENALTY_STATUS;
                 const harshTargetAcc = Math.max(50, (baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy) + harshAccPenalty);
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, harshAccPenalty, i18next.t("moveUpgrade:description:stat:addLowerTargetHarsh", { statName: stat1Name, stages: stages2, accuracy: harshTargetAcc }), 100, null, [new StatChangeAttr(stat1, -stages2, false)]));

                 const stat2 = Utils.randSeedItem(possibleLowerStats.filter(s => s !== stat1));
                 const stat2Name = getBattleStatName(stat2);
                 const multiAccPenalty = -ADD_STAT_LOWER_TARGET_HARSH_ACC_PENALTY_STATUS; 
                 const multiTargetAcc = Math.max(50, (baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy) + multiAccPenalty);
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, multiAccPenalty, i18next.t("moveUpgrade:description:stat:addLowerTargetMultiple", { statName1: stat1Name, statName2: stat2Name, stages: stages1, accuracy: multiTargetAcc }), 100, null, [new StatChangeAttr([stat1, stat2], -stages1, false)]));
             }
        } else { 
            const lowerAttr = targetLowerAttrs[0] as StatChangeAttr; 
             if (lowerAttr) {
                 const currentLevels = lowerAttr.levels; 
                 const currentStats = Array.isArray(lowerAttr.stats) ? lowerAttr.stats : [lowerAttr.stats];
                 const currentStatNames = currentStats.map(s => getBattleStatName(s)).join(" & ");

                 if (currentLevels === -1) {
                      const newLevels = -2;
                      const powerPenalty = isStatusMove ? 0 : -MODIFY_STAT_LOWER_TARGET_POWER_PENALTY;
                      const accPenalty = isStatusMove ? -MODIFY_STAT_LOWER_TARGET_ACC_PENALTY_STATUS : 0;
                      const targetAcc = Math.max(50, (baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy) + accPenalty);
                          upgrades.push(moveGenerator.getType(this.moveId, powerPenalty, null, null, accPenalty, i18next.t("moveUpgrade:description:stat:increaseLowerTarget", { statName: currentStatNames, stages: Math.abs(newLevels), accuracy: targetAcc, powerValue: Math.abs(powerPenalty) }), baseMoveChance || 100, null, [new StatChangeAttr(lowerAttr.stats, newLevels, false)])); 
                 } else if (currentLevels === -2 && isStatusMove) { 
                      const newLevels = -3;
                      const accPenalty = -ADD_STAT_LOWER_TARGET_HARSH_ACC_PENALTY_STATUS; 
                      const targetAcc = Math.max(50, (baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy) + accPenalty);
                      upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, accPenalty, i18next.t("moveUpgrade:description:stat:increaseLowerTarget", { statName: currentStatNames, stages: Math.abs(newLevels), accuracy: targetAcc, powerValue: 0 }), 100, null, [new StatChangeAttr(lowerAttr.stats, newLevels, false)])); 
                 }

                 if (baseMoveChance > 0 && baseMoveChance < 100) {
                     const newChance = Math.min(100, baseMoveChance + 25);
                     if (newChance > baseMoveChance) {
                        upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:stat:increaseLowerTargetChance", { chance: newChance }), newChance, null, [new StatChangeAttr(lowerAttr.stats, lowerAttr.levels, false)])); 
                     }
                     if (newChance < 100) { 
                        const powerPenalty = isStatusMove ? 0 : -MODIFY_STAT_LOWER_TARGET_GUARANTEE_POWER_PENALTY;
                        const accPenalty = isStatusMove ? -MODIFY_STAT_LOWER_TARGET_GUARANTEE_ACC_PENALTY_STATUS : 0;
                            upgrades.push(moveGenerator.getType(this.moveId, powerPenalty, null, null, accPenalty, i18next.t("moveUpgrade:description:stat:guaranteeLowerTarget", { powerValue: Math.abs(powerPenalty), accuracyValue: Math.abs(accPenalty) }), 100, null, [new StatChangeAttr(lowerAttr.stats, lowerAttr.levels, false)])); 
                     }
                 }

                  const potentialNewStats = possibleLowerStats.filter(s => !currentStats.includes(s));
                  if (potentialNewStats.length > 0) {
                      const newStat = Utils.randSeedItem(potentialNewStats);
                      const newStatName = getBattleStatName(newStat);
                      const allStats = [...currentStats, newStat];
                      const powerPenalty = isStatusMove ? 0 : -ADD_EFFECT_POWER_PENALTY_LOW; 
                          upgrades.push(moveGenerator.getType(this.moveId, powerPenalty, null, null, 0, i18next.t("moveUpgrade:description:stat:addAnotherLowerTarget", { existingStats: currentStatNames, newStatName: newStatName, stages: Math.abs(currentLevels), powerValue: Math.abs(powerPenalty) }), baseMoveChance || 100, null, [new StatChangeAttr(allStats, currentLevels, false)])); 
                  }
             }
        }

        if (!isStatusMove) {
            if (!isHighCritRatio) {
                const powerDelta = baseMovePower > HIGH_CRIT_POWER_PENALTY_THRESHOLD ? -HIGH_CRIT_POWER_PENALTY_ABOVE_THRESHOLD : 0;
                if (powerDelta !== 0) {
                     upgrades.push(moveGenerator.getType(this.moveId, powerDelta, null, null, 0, i18next.t("moveUpgrade:description:crit:addHighCritVsPower", { powerValue: Math.abs(powerDelta) }), null, null, [new HighCritAttr()]));
                } else {
                     upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:crit:addHighCrit"), null, null, [new HighCritAttr()]));
                }
                upgrades.push(moveGenerator.getType(this.moveId, HIGH_CRIT_PLUS_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:crit:addHighCritAndPower", { powerValue: HIGH_CRIT_PLUS_POWER_BOOST }), null, null, [new HighCritAttr()]));
            }
            else if (hasHighCrit && !isCritOnly) { 
                 upgrades.push(moveGenerator.getType(this.moveId, -CRIT_ONLY_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:crit:upgradeToCritOnlyVsPower", { powerValue: CRIT_ONLY_POWER_PENALTY }), null, null, [new CritOnlyAttr()])); 
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, -CRIT_ONLY_ACC_PENALTY, i18next.t("moveUpgrade:description:crit:upgradeToCritOnlyVsAccuracy", { accuracyValue: CRIT_ONLY_ACC_PENALTY }), null, null, [new CritOnlyAttr()])); 
            }
        }

        if (!ignoresProtect) {
            if (!isStatusMove) {
                upgrades.push(moveGenerator.getType(this.moveId, -IGNORE_PROTECT_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:flags:ignoreProtect", { powerValue: IGNORE_PROTECT_POWER_PENALTY }), null, null, [], [], MoveFlags.IGNORE_PROTECT));
            }
        }
        if (!ignoresAbilities) {
            if (!isStatusMove) {
                upgrades.push(moveGenerator.getType(this.moveId, IGNORE_ABILITIES_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:ignoreAbilities", { powerValue: IGNORE_ABILITIES_POWER_BOOST }), null, null, [], [], MoveFlags.IGNORE_ABILITIES));
            }
        }
        if (!isSoundBased && !isStatusMove) { 
            upgrades.push(moveGenerator.getType(this.moveId, SOUND_BASED_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:soundBased", { powerValue: SOUND_BASED_POWER_BOOST }), null, null, [], [], MoveFlags.SOUND_BASED));
        }
         if (isPhysicalMove && !isPunchingMove && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, PUNCHING_MOVE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:punchingMove", { powerValue: PUNCHING_MOVE_POWER_BOOST }), null, null, [], [], MoveFlags.PUNCHING_MOVE));
        }
        if (!isSlicingMove && (isPhysicalMove || isSpecialMove) && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, SLICING_MOVE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:slicingMove", { powerValue: SLICING_MOVE_POWER_BOOST }), null, null, [], [], MoveFlags.SLICING_MOVE));
        }
        if (isSpecialMove && !isPulseMove && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, PULSE_MOVE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:pulseMove", { powerValue: PULSE_MOVE_POWER_BOOST }), null, null, [], [], MoveFlags.PULSE_MOVE));
        }
        if (isPhysicalMove && !isBitingMove && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, BITING_MOVE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:bitingMove", { powerValue: BITING_MOVE_POWER_BOOST }), null, null, [], [], MoveFlags.BITING_MOVE));
        }

         if (!isWindMove && (baseMove.type === Type.FLYING || baseMove.type === Type.DRAGON || isSpecialMove) && !isStatusMove) { 
            upgrades.push(moveGenerator.getType(this.moveId, WIND_MOVE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:windMove", { powerValue: WIND_MOVE_POWER_BOOST }), null, null, [], [], MoveFlags.WIND_MOVE));
        }
        if ((isPhysicalMove || isSpecialMove) && !isStatusMove) {
            if (hasContact) {
                upgrades.push(moveGenerator.getType(this.moveId, CONTACT_TOGGLE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:disableContact", { powerValue: CONTACT_TOGGLE_POWER_BOOST }), null, null, [], [], MoveFlags.MAKES_CONTACT)); 
            } else {
                 upgrades.push(moveGenerator.getType(this.moveId, CONTACT_TOGGLE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:enableContact", { powerValue: CONTACT_TOGGLE_POWER_BOOST }), null, null, [], [], MoveFlags.MAKES_CONTACT)); 
            }
        }
        if (!isStatusMove && !baseMove.hasAttr(IgnoreOpponentStatChangesAttr)) {
            upgrades.push(moveGenerator.getType(this.moveId, IGNORE_STATS_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:ignoreStatChanges", { powerValue: IGNORE_STATS_POWER_BOOST }), null, null, [new IgnoreOpponentStatChangesAttr()]));
        }
        if (!isStatusMove && !baseMove.hasAttr(RemoveScreensAttr)) {
             upgrades.push(moveGenerator.getType(this.moveId, REMOVE_SCREENS_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:removeScreens", { powerValue: REMOVE_SCREENS_POWER_BOOST }), null, null, [new RemoveScreensAttr(false)]));
        }
        const hasHealFreeze = baseMove.getAttrs(HealStatusEffectAttr).some((a:HealStatusEffectAttr) => a.isOfEffect(StatusEffect.FREEZE));
        if (!isStatusMove && baseMove.type !== Type.FIRE && !hasHealFreeze) {
             upgrades.push(moveGenerator.getType(this.moveId, THAW_TARGET_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:flags:thawTarget", { powerValue: THAW_TARGET_POWER_BOOST }), null, null, [new HealStatusEffectAttr(false, StatusEffect.FREEZE)]));
        }


        if(!isStatusMove) {
            if (basePriority <= 0) {
                const targetPriority1 = 1;
                const priorityDelta1 = targetPriority1 - basePriority;
                upgrades.push(moveGenerator.getType(this.moveId, -PRIORITY_PLUS_1_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:priority:increase", { value: targetPriority1, powerValue: PRIORITY_PLUS_1_POWER_PENALTY }), null, null, [new ConditionalPriorityAttr(priorityDelta1)]));
            }
            if (basePriority >= 1 && basePriority < 3) { 
                const targetPriority3 = 3;
                const priorityDelta3 = targetPriority3 - basePriority;
                upgrades.push(moveGenerator.getType(this.moveId, -PRIORITY_PLUS_3_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:priority:increase", { value: targetPriority3, powerValue: PRIORITY_PLUS_3_POWER_PENALTY }), null, null, [new ConditionalPriorityAttr(priorityDelta3)]));
            }
            if (basePriority >= 0) { 
                 const targetPriorityNeg1 = -1;
                 const priorityDeltaNeg1 = targetPriorityNeg1 - basePriority;
                 upgrades.push(moveGenerator.getType(this.moveId, PRIORITY_MINUS_1_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:priority:decrease", { value: targetPriorityNeg1, powerValue: PRIORITY_MINUS_1_POWER_BOOST }), null, null, [new ConditionalPriorityAttr(priorityDeltaNeg1)]));

                 const targetPriorityNeg3 = -3;
                 const priorityDeltaNeg3 = targetPriorityNeg3 - basePriority;
                 upgrades.push(moveGenerator.getType(this.moveId, PRIORITY_MINUS_3_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:priority:decrease", { value: targetPriorityNeg3, powerValue: PRIORITY_MINUS_3_POWER_BOOST }), null, null, [new ConditionalPriorityAttr(priorityDeltaNeg3)]));
            }
        }
        if (basePriority <= 0 && !isStatusMove) {
             const condPriority1 = 1;
             const condPriorityDelta1 = condPriority1 - basePriority;
             upgrades.push(moveGenerator.getType(this.moveId, CONDITIONAL_PRIORITY_TERRAIN_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:priority:conditionalTerrain", { terrain: getTerrainName(TerrainType.GRASSY), value: condPriority1, powerValue: CONDITIONAL_PRIORITY_TERRAIN_POWER_BOOST }), null, null, [new TerrainMovePriorityAttr(TerrainType.GRASSY, condPriorityDelta1)]));
             upgrades.push(moveGenerator.getType(this.moveId, CONDITIONAL_PRIORITY_TERRAIN_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:priority:conditionalTerrain", { terrain: getTerrainName(TerrainType.ELECTRIC), value: condPriority1, powerValue: CONDITIONAL_PRIORITY_TERRAIN_POWER_BOOST }), null, null, [new TerrainMovePriorityAttr(TerrainType.ELECTRIC, condPriorityDelta1)]));

             const condPriority2 = 2;
             const condPriorityDelta2 = condPriority2 - basePriority;
             upgrades.push(moveGenerator.getType(this.moveId, CONDITIONAL_PRIORITY_FIRST_TURN_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:priority:conditionalFirstTurn", { value: condPriority2, powerValue: CONDITIONAL_PRIORITY_FIRST_TURN_POWER_BOOST }), null, null, [new FirstTurnPriorityAttr(condPriorityDelta2)], [new FirstMoveCondition()]));

        }

        if (isPhysicalMove) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, MoveCategory.SPECIAL, 0, i18next.t("moveUpgrade:description:category:changeToSpecial")));
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, MoveCategory.SPECIAL, 0, i18next.t("moveUpgrade:description:category:changeToSpecialVsDef"), null, null, [new DefDefAttr()])); 
        } else if (isSpecialMove) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, MoveCategory.PHYSICAL, 0, i18next.t("moveUpgrade:description:category:changeToPhysical")));
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, MoveCategory.PHYSICAL, 0, i18next.t("moveUpgrade:description:category:changeToPhysicalVsSpDef"), null, null, [new DefDefAttr()])); 
        }


        if (!isStatusMove && !baseMove.getAttrs(TrapAttr).length) {
            const trapType = Utils.randSeedItem([BattlerTagType.BIND, BattlerTagType.WRAP, BattlerTagType.FIRE_SPIN, BattlerTagType.WHIRLPOOL, BattlerTagType.CLAMP, BattlerTagType.SAND_TOMB, BattlerTagType.MAGMA_STORM, BattlerTagType.SNAP_TRAP, BattlerTagType.THUNDER_CAGE, BattlerTagType.INFESTATION]);
            const trapName = getTrapName(trapType);
            upgrades.push(moveGenerator.getType(this.moveId, -ADD_TRAP_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:misc:addTrap", { trapName: trapName, powerValue: ADD_TRAP_POWER_PENALTY }), null, null, [new TrapAttr(trapType)]));
        }

        if (!isStatusMove && baseMove.type !== Type.GROUND && !baseMove.getAttrs(AddBattlerTagAttr).some((a: AddBattlerTagAttr) => a.tagType === BattlerTagType.IGNORE_FLYING)) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addGrounding"), null, null, [new AddBattlerTagAttr(BattlerTagType.IGNORE_FLYING), new RemoveBattlerTagAttr([BattlerTagType.FLYING, BattlerTagType.MAGNET_RISEN])]));
        }
        if (hasPower && !hasFixedDamage && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, -baseMovePower, null, null, 0, i18next.t("moveUpgrade:description:misc:fixedDamageLevel"), null, null, [new LevelDamageAttr()]));
            upgrades.push(moveGenerator.getType(this.moveId, -baseMovePower + FIXED_DAMAGE_40_POWER_OFFSET, null, null, 0, i18next.t("moveUpgrade:description:misc:fixedDamageValue", { value: FIXED_DAMAGE_40_POWER_OFFSET }), null, null, [new FixedDamageAttr(FIXED_DAMAGE_40_POWER_OFFSET)]));
            upgrades.push(moveGenerator.getType(this.moveId, -baseMovePower, null, null, 0, i18next.t("moveUpgrade:description:misc:fixedDamageTargetHalfHp"), null, null, [new TargetHalfHpDamageAttr()]));
        }
        if (hasPower && !baseMove.hasAttr(SurviveDamageAttr) && !isStatusMove) {
             upgrades.push(moveGenerator.getType(this.moveId, SURVIVE_DAMAGE_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:misc:addSurviveDamage", { powerValue: SURVIVE_DAMAGE_POWER_BOOST }), null, null, [new SurviveDamageAttr()]));
        }
        if (hasPower && !baseMove.hasAttr(WeightPowerAttr) && !baseMove.hasAttr(CompareWeightPowerAttr) && baseMovePower <= 95 && !isStatusMove) {
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addWeightPowerTarget"), null, null, [new WeightPowerAttr()]));
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addWeightPowerCompare"), null, null, [new CompareWeightPowerAttr()]));
        }
        if (hasPower && !baseMove.hasAttr(GyroBallPowerAttr) && !baseMove.hasAttr(ElectroBallPowerAttr) && baseMovePower <= 95 && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addSpeedPowerSlower"), null, null, [new GyroBallPowerAttr()]));
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addSpeedPowerFaster"), null, null, [new ElectroBallPowerAttr()]));
        }
        if (hasPower && !baseMove.hasAttr(HpPowerAttr) && baseMovePower <= 80 && !isStatusMove) {
            const powerDelta = Math.max(0, HP_POWER_MAX - baseMovePower); 
            upgrades.push(moveGenerator.getType(this.moveId, powerDelta, null, null, 0, i18next.t("moveUpgrade:description:misc:addHpPowerHighHp", { maxPower: HP_POWER_MAX }), null, null, [new HpPowerAttr()]));
        }
         if (hasPower && !baseMove.hasAttr(LowHpPowerAttr) && baseMovePower <= 80 && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addHpPowerLowHp"), null, null, [new LowHpPowerAttr()]));
        }


        if (!isStatusMove && !baseMove.hasAttr(ForceSwitchOutAttr) && basePriority >= -5) {
            upgrades.push(moveGenerator.getType(this.moveId, -SWITCH_OUT_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:misc:addSwitchOut", { powerValue: SWITCH_OUT_POWER_PENALTY }), null, null, [new ForceSwitchOutAttr(true)]));
        }

        if (!isStatusMove && !hasCharge && baseMovePower <= 100 && basePriority >= 0) {
            const chargeAnim = isPhysicalMove ? ChargeAnim.SKULL_BASH_CHARGING : ChargeAnim.SOLAR_BEAM_CHARGING; 
            const chargeTextKey = isPhysicalMove ? "moveTriggers:loweredItsHead" : "moveTriggers:tookInSunlight";
            const chargeText = i18next.t(chargeTextKey, {pokemonName: "{USER}"}); 

            upgrades.push(moveGenerator.getType(this.moveId, CHARGE_TURN_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:misc:addChargeTurn", { powerValue: CHARGE_TURN_POWER_BOOST }), null, null, [new ChargeAttr(chargeAnim, chargeText)]));
            const skullBashTextKey = "moveTriggers:loweredItsHead"; 
            const skullBashText = i18next.t(skullBashTextKey, { pokemonName: "{USER}"});
            const statBoost = BattleStat.DEF;
            const statBoostStages = 1;
            const statBoostName = getBattleStatName(statBoost);
            upgrades.push(moveGenerator.getType(this.moveId, CHARGE_TURN_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:misc:addChargeTurnWithBoost", { powerValue: CHARGE_TURN_POWER_BOOST, statName: statBoostName, stages: statBoostStages }), null, null, [new ChargeAttr(ChargeAnim.SKULL_BASH_CHARGING, skullBashText, null, true), new StatChangeAttr(statBoost, statBoostStages, true)]));
        }
        if (isPhysicalMove && !baseMove.hasAttr(StealHeldItemChanceAttr) && !isStatusMove) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addStealItemChance", { chance: Math.round(STEAL_ITEM_30_CHANCE * 100) }), null, null, [new StealHeldItemChanceAttr(STEAL_ITEM_30_CHANCE)]));
            upgrades.push(moveGenerator.getType(this.moveId, -STEAL_ITEM_100_POWER_PENALTY, null, null, 0, i18next.t("moveUpgrade:description:misc:addStealItemGuaranteed", { powerValue: STEAL_ITEM_100_POWER_PENALTY }), null, null, [new StealHeldItemChanceAttr(1.0)]));
        }
        if (!isStatusMove && !baseMove.hasAttr(RemoveHeldItemAttr)) {
             upgrades.push(moveGenerator.getType(this.moveId, REMOVE_ITEM_POWER_BOOST, null, null, 0, i18next.t("moveUpgrade:description:misc:addRemoveItem", { powerValue: REMOVE_ITEM_POWER_BOOST }), null, null, [new RemoveHeldItemAttr(false)]));
        }
        if (!isStatusMove && baseMovePower <= 60) {
            const weather = Utils.randSeedItem([WeatherType.SUNNY, WeatherType.RAIN, WeatherType.SANDSTORM, WeatherType.SNOW]);
            const weatherName = getWeatherName(weather);
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:powerBoostWeather", { weather: weatherName }), null, null, [new WeatherPowerBoostAttr(weather)]));

            const terrain = Utils.randSeedItem([TerrainType.ELECTRIC, TerrainType.GRASSY, TerrainType.MISTY, TerrainType.PSYCHIC]);
            const terrainName = getTerrainName(terrain);
             upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:powerBoostTerrain", { terrain: terrainName }), null, null, [new TerrainPowerBoostAttr(terrain)]));
        }
        if (!isStatusMove && baseMovePower <= 60 && !baseMove.hasAttr(ConsecutiveUseDoublePowerAttr) && !baseMove.hasAttr(ConsecutiveUseMultiBasePowerAttr)) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:powerBoostConsecutive"), null, null, [new ConsecutiveUseDoublePowerAttr(2, true)])); 
        }
        if (!isStatusMove && baseMovePower <= 80 && !baseMove.hasAttr(TurnDamagedDoublePowerAttr)) {
            upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:powerBoostTurnDamaged"), null, null, [new TurnDamagedDoublePowerAttr()]));
        }

        if (isStatusMove) {
             const arenaTagAttr = baseMove.getAttrs(AddArenaTagAttr)[0] as AddArenaTagAttr | undefined;
             if (arenaTagAttr && arenaTagAttr.turnCount > 0 && arenaTagAttr.turnCount < 8) {
                 const newDuration = arenaTagAttr.turnCount + 3;
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:increaseFieldDuration", { turns: newDuration }), null, null, [new AddArenaTagAttr(arenaTagAttr.tagType, newDuration, arenaTagAttr.failOnOverlap, arenaTagAttr.selfSideTarget)])); 
             }
             const battlerTagAttr = baseMove.getAttrs(AddBattlerTagAttr)[0] as AddBattlerTagAttr | undefined;

             if (!ignoresProtect) {
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:ignoreProtect"), null, null, [], [], MoveFlags.IGNORE_PROTECT));
             }
             if (!hasHealAttr && !hasHitHealAttr) { 
                  upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:addSelfHeal", { percent: Math.round(STATUS_MOVE_SELF_HEAL_AMOUNT * 100) }), null, null, [new HealAttr(STATUS_MOVE_SELF_HEAL_AMOUNT, true, true)]));
             }
             if (!hasStatBoostSelf) {
                 const statToBoost = Utils.randSeedItem([BattleStat.DEF, BattleStat.SPDEF, BattleStat.SPD, BattleStat.EVA]);
                 const statName = getBattleStatName(statToBoost);
                 const stages = 1;
                  upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:addSelfBoost", { statName: statName, stages: stages }), null, null, [new StatChangeAttr(statToBoost, stages, true)]));
             }

              if (!baseMove.hasAttr(AddArenaTrapTagAttr)) {
                 const hazard = Utils.randSeedItem([ArenaTagType.STEALTH_ROCK, ArenaTagType.SPIKES, ArenaTagType.TOXIC_SPIKES, ArenaTagType.STICKY_WEB]);
                 const harzardName = getHazardName(hazard);
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:addArenaTrap", { trapName: harzardName }), null, null, [new AddArenaTrapTagAttr(hazard)]));
             }
             if (!baseMove.hasAttr(WeatherChangeAttr) && !baseMove.hasAttr(TerrainChangeAttr)) {
                 const weather = Utils.randSeedItem([WeatherType.SUNNY, WeatherType.RAIN, WeatherType.SANDSTORM, WeatherType.SNOW]);
                 const weatherName = getWeatherName(weather);
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:setWeather", { weather: weatherName }), null, null, [new WeatherChangeAttr(weather)]));

                 const terrain = Utils.randSeedItem([TerrainType.ELECTRIC, TerrainType.GRASSY, TerrainType.MISTY, TerrainType.PSYCHIC]);
                 const terrainName = getTerrainName(terrain);
                 upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:setTerrain", { terrain: terrainName }), null, null, [new TerrainChangeAttr(terrain)]));
             }
             if (!baseMove.hasAttr(ClearWeatherAttr) && !baseMove.hasAttr(ClearTerrainAttr)) {
                  upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:clearWeather"), null, null, [new ClearWeatherAttr(WeatherType.NONE)])); 
                  upgrades.push(moveGenerator.getType(this.moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:clearTerrain"), null, null, [new ClearTerrainAttr()]));
             }
        }


        return this.shuffleArray(upgrades);
    }
    
    /**
     * Shuffles an array in place
     */
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Utils.randSeedInt(i+1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}