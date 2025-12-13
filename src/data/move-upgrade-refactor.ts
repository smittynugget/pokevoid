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

export class MoveUpgrade {

  static generateMoveUpgradeOptions(moveId: Moves, scene: BattleScene): ModifierType[] {
        const baseMove = scene.getUpgradedMove(allMoves[moveId]);
        const moveGenerator = new MoveUpgradeModifierTypeGenerator();
        const upgrades: ModifierType[] = [];

        const upgradeManager = new MoveUpgradeManager(moveId, baseMove, moveGenerator);

        return upgradeManager.generateUpgrades();
    }

    private static shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Utils.randSeedInt(i+1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

class MoveUpgradeManager {
    private moveId: Moves;
    private baseMove: any;
    private moveGenerator: MoveUpgradeModifierTypeGenerator;
    private upgrades: ModifierType[] = [];

    constructor(moveId: Moves, baseMove: any, moveGenerator: MoveUpgradeModifierTypeGenerator) {
        this.moveId = moveId;
        this.baseMove = baseMove;
        this.moveGenerator = moveGenerator;
    }

    generateUpgrades(): ModifierType[] {
        this.addPowerUpgrades();
        this.addAccuracyUpgrades();
        this.addEffectChanceUpgrades();
        this.addTypeUpgrades();
        this.addMultiHitUpgrades();
        this.addHealingUpgrades();
        this.addRecoilUpgrades();
        this.addSacrificialUpgrades();
        this.addStatusEffectUpgrades();
        this.addFlinchUpgrades();
        this.addStatChangeUpgrades();
        this.addCritUpgrades();
        this.addFlagUpgrades();
        this.addPriorityUpgrades();
        this.addCategoryUpgrades();
        this.addMiscUpgrades();
        this.addStatusMoveSpecificUpgrades();

        const uniqueUpgrades = Array.from(new Map(this.upgrades.map(u => [u.description, u])).values());
        return MoveUpgrade.shuffleArray(uniqueUpgrades);
    }

    private get constants() {
        return MOVE_UPGRADE_CONSTANTS;
    }

    private get properties() {
        return new MoveProperties(this.baseMove);
    }

    private addUpgrade(powerDelta: number, typeChange: Type | null, category: MoveCategory | null,
                     accuracyDelta: number, description: string, chance?: number | null,
                     conditions?: MoveCondition[] | null, attrs?: MoveAttr[] | null,
                     removeAttrs?: MoveAttr[] | null, flag?: MoveFlags | null) {
        this.upgrades.push(this.moveGenerator.getType(
            this.moveId, powerDelta, typeChange, category, accuracyDelta,
            description, chance, conditions, attrs, removeAttrs, flag
        ));
    }

    private addPowerUpgrades() {
        if (!this.properties.hasPower || this.properties.isStatusMove) return;

        const { POWER_INCREASE_SLIGHT, POWER_INCREASE_MODERATE, POWER_INCREASE_SIGNIFICANT_WEAK } = this.constants;

        this.addUpgrade(POWER_INCREASE_SLIGHT, null, null, 0,
            i18next.t("moveUpgrade:description:power:increaseSlight", { powerValue: POWER_INCREASE_SLIGHT }));
        this.addUpgrade(POWER_INCREASE_MODERATE, null, null, 0,
            i18next.t("moveUpgrade:description:power:increaseModerate", { powerValue: POWER_INCREASE_MODERATE }));

        if (this.properties.baseMovePower <= 80) {
            this.addUpgrade(POWER_INCREASE_SIGNIFICANT_WEAK, null, null, 0,
                i18next.t("moveUpgrade:description:power:increaseSignificantWeak", { powerValue: POWER_INCREASE_SIGNIFICANT_WEAK }));
        }

        this.addPowerVsAccuracyUpgrades();
        this.addPowerVsPriorityUpgrades();
        this.addPowerVsRecoilUpgrades();
        this.addPowerVsSelfStatDropUpgrades();
    }

    private addPowerVsAccuracyUpgrades() {
        if (!this.properties.hasAccuracy || this.properties.baseMoveAccuracy < 70) return;

        const { POWER_VS_ACC_LOW_ACC_PENALTY, POWER_VS_ACC_HIGH_ACC_PENALTY } = this.constants;
        const powerDelta = this.properties.baseMovePower <= 100 ? this.constants.POWER_INCREASE_MODERATE : this.constants.POWER_INCREASE_SLIGHT;

        this.addUpgrade(powerDelta, null, null, -POWER_VS_ACC_LOW_ACC_PENALTY,
            i18next.t("moveUpgrade:description:power:increaseVsAccuracyLow", { powerValue: powerDelta, accuracyValue: POWER_VS_ACC_LOW_ACC_PENALTY }));

        if (this.properties.baseMoveAccuracy >= 85) {
            const higherPowerDelta = powerDelta + 5;
            this.addUpgrade(higherPowerDelta, null, null, -POWER_VS_ACC_HIGH_ACC_PENALTY,
                i18next.t("moveUpgrade:description:power:increaseVsAccuracyHigh", { powerValue: higherPowerDelta, accuracyValue: POWER_VS_ACC_HIGH_ACC_PENALTY }));
        }
    }

    private addPowerVsPriorityUpgrades() {
        if (this.properties.basePriority < 0) return;

        const newPriority = -1;
        const priorityDelta = newPriority - this.properties.basePriority;
        this.addUpgrade(this.constants.POWER_INCREASE_MODERATE, null, null, 0,
            i18next.t("moveUpgrade:description:power:increaseVsPriority", { powerValue: this.constants.POWER_INCREASE_MODERATE, priorityValue: newPriority }),
            null, null, [new ConditionalPriorityAttr(priorityDelta)]);
    }

    private addPowerVsRecoilUpgrades() {
        if (this.properties.hasRecoil) return;

        const { POWER_VS_RECOIL_QUARTER_GAIN, POWER_VS_RECOIL_THIRD_GAIN, RECOIL_QUARTER, RECOIL_THIRD } = this.constants;

        this.addUpgrade(POWER_VS_RECOIL_QUARTER_GAIN, null, null, 0,
            i18next.t("moveUpgrade:description:power:increaseVsRecoil", { powerValue: POWER_VS_RECOIL_QUARTER_GAIN, recoilPercent: 25 }),
            null, null, [new RecoilAttr(false, RECOIL_QUARTER)]);
        this.addUpgrade(POWER_VS_RECOIL_THIRD_GAIN, null, null, 0,
            i18next.t("moveUpgrade:description:power:increaseVsRecoil", { powerValue: POWER_VS_RECOIL_THIRD_GAIN, recoilPercent: 33 }),
            null, null, [new RecoilAttr(false, RECOIL_THIRD)]);
    }

    private addPowerVsSelfStatDropUpgrades() {
        if (this.properties.selfBoostAttrs.some((a: StatChangeAttr) => a.levels < 0)) return;

        const mainStat = this.properties.isPhysicalMove ? BattleStat.ATK : BattleStat.SPATK;
        const otherStats = [BattleStat.DEF, BattleStat.SPDEF, BattleStat.SPD].concat(this.properties.isPhysicalMove ? [] : [BattleStat.ATK]);
        const statsToDrop = [mainStat, Utils.randSeedItem(otherStats.filter(s => s !== mainStat))];

        const powerDelta = this.properties.baseMovePower <= 90 ?
            this.constants.POWER_VS_SELF_STAT_DROP_GAIN_LOW_POWER :
            this.constants.POWER_VS_SELF_STAT_DROP_GAIN_HIGH_POWER;

        const statName1 = getBattleStatName(statsToDrop[0]);
        const statName2 = getBattleStatName(statsToDrop[1]);

        this.addUpgrade(powerDelta, null, null, 0,
            i18next.t("moveUpgrade:description:power:increaseVsSelfStatDrop", {
                powerValue: powerDelta, statName1, statName2, stages: 1
            }),
            null, null, [new StatChangeAttr(statsToDrop, -1, true, null, false, true)]);
    }

    private addAccuracyUpgrades() {
        if (!this.properties.hasAccuracy && !this.properties.isStatusMove) return;

        if (this.properties.hasAccuracy && this.properties.baseMoveAccuracy < 100) {
            this.addBasicAccuracyUpgrades();
            this.addPerfectAccuracyUpgrades();
            this.addAccuracyVsPowerUpgrades();
            this.addAccuracyVsPpUpgrades();
        }

        if (this.properties.baseMoveAccuracy === -1 && this.properties.isStatusMove) {
            this.addUpgrade(0, null, null, 90, i18next.t("moveUpgrade:description:accuracy:setAccuracy", { value: 90 }));
            this.addUpgrade(0, null, null, 100, i18next.t("moveUpgrade:description:accuracy:setAccuracy", { value: 100 }));
        }
    }

    private addBasicAccuracyUpgrades() {
        const { ACC_INCREASE_LOW_ACC_SMALL, ACC_INCREASE_LOW_ACC_MEDIUM, ACC_INCREASE_LOW_ACC_LARGE,
                ACC_INCREASE_HIGH_ACC_SMALL, ACC_INCREASE_HIGH_ACC_MEDIUM } = this.constants;

        const accBoostSmall = this.properties.baseMoveAccuracy < 60 ? ACC_INCREASE_LOW_ACC_SMALL : ACC_INCREASE_HIGH_ACC_SMALL;
        const accBoostMedium = this.properties.baseMoveAccuracy < 60 ? ACC_INCREASE_LOW_ACC_MEDIUM : ACC_INCREASE_HIGH_ACC_MEDIUM;

        this.addUpgrade(0, null, null, accBoostSmall,
            i18next.t("moveUpgrade:description:accuracy:increasePercentage", { value: accBoostSmall }));
        this.addUpgrade(0, null, null, accBoostMedium,
            i18next.t("moveUpgrade:description:accuracy:increasePercentage", { value: accBoostMedium }));

        if (this.properties.baseMoveAccuracy < 60) {
            this.addUpgrade(0, null, null, ACC_INCREASE_LOW_ACC_LARGE,
                i18next.t("moveUpgrade:description:accuracy:increasePercentage", { value: ACC_INCREASE_LOW_ACC_LARGE }));
        }
    }

    private addPerfectAccuracyUpgrades() {
        if (this.properties.baseMoveAccuracy < 95) return;

        const { PERFECT_ACC_POWER_PENALTY_LOW, PERFECT_ACC_POWER_PENALTY_MED, PERFECT_ACC_POWER_PENALTY_HIGH } = this.constants;

        let powerDelta = -PERFECT_ACC_POWER_PENALTY_MED;
        if (this.properties.hasPower && this.properties.baseMovePower >= 70) {
            powerDelta = -PERFECT_ACC_POWER_PENALTY_HIGH;
        } else if (this.properties.hasPower && this.properties.baseMovePower < 50) {
            powerDelta = -PERFECT_ACC_POWER_PENALTY_LOW;
        }

        const accuracyDelta = 101 - this.properties.baseMoveAccuracy;

        if (!this.properties.isStatusMove) {
            this.addUpgrade(powerDelta, null, null, accuracyDelta,
                i18next.t("moveUpgrade:description:accuracy:perfectAccuracy", { powerValue: Math.abs(powerDelta) }));
        } else {
            this.addUpgrade(0, null, null, accuracyDelta,
                i18next.t("moveUpgrade:description:accuracy:perfectAccuracyNoPenalty"));
        }
    }

    private addAccuracyVsPowerUpgrades() {
        if (!this.properties.hasPower || this.properties.baseMovePower < 50) return;

        const { ACC_VS_POWER_LOW_POWER_PENALTY, ACC_VS_POWER_HIGH_POWER_PENALTY,
                ACC_VS_POWER_LOW_ACC_GAIN, ACC_VS_POWER_HIGH_ACC_GAIN } = this.constants;

        this.addUpgrade(-ACC_VS_POWER_LOW_POWER_PENALTY, null, null, ACC_VS_POWER_LOW_ACC_GAIN,
            i18next.t("moveUpgrade:description:accuracy:increaseVsPowerLow", {
                accuracyValue: ACC_VS_POWER_LOW_ACC_GAIN, powerValue: ACC_VS_POWER_LOW_POWER_PENALTY
            }));

        if (this.properties.baseMovePower >= 80) {
            this.addUpgrade(-ACC_VS_POWER_HIGH_POWER_PENALTY, null, null, ACC_VS_POWER_HIGH_ACC_GAIN,
                i18next.t("moveUpgrade:description:accuracy:increaseVsPowerHigh", {
                    accuracyValue: ACC_VS_POWER_HIGH_ACC_GAIN, powerValue: ACC_VS_POWER_HIGH_POWER_PENALTY
                }));
        }
    }

    private addAccuracyVsPpUpgrades() {
        if (this.baseMove.pp < 10) return;

        this.addUpgrade(0, null, null, this.constants.ACC_VS_POWER_LOW_ACC_GAIN,
            i18next.t("moveUpgrade:description:accuracy:increaseVsPp", { accuracyValue: this.constants.ACC_VS_POWER_LOW_ACC_GAIN }));
    }
}