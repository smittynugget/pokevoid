import { BattleStat, getBattleStatName } from "../data/battle-stat";
import { MoveCategory, MoveFlags, allMoves, MoveAttr, RecoilAttr, SacrificialAttr, FlinchAttr, MultiHitAttr, ChargeAttr, HighCritAttr, CritOnlyAttr, HealAttr, HitHealAttr, StatChangeAttr, StatusEffectAttr, ConfuseAttr, FixedDamageAttr, LevelDamageAttr, RandomLevelDamageAttr, TypelessAttr, PlantHealAttr, SandHealAttr, AddBattlerTagAttr, MultiStatusEffectAttr, IgnoreOpponentStatChangesAttr, ConditionalPriorityAttr, FirstTurnPriorityAttr, TerrainMovePriorityAttr, TrapAttr, RemoveBattlerTagAttr, SurviveDamageAttr, TargetHalfHpDamageAttr, WeightPowerAttr, CompareWeightPowerAttr, GyroBallPowerAttr, ElectroBallPowerAttr, HpPowerAttr, LowHpPowerAttr, ForceSwitchOutAttr, StealHeldItemChanceAttr, RemoveHeldItemAttr, WeatherPowerBoostAttr, TerrainPowerBoostAttr, ConsecutiveUseDoublePowerAttr, TurnDamagedDoublePowerAttr, WeatherChangeAttr, TerrainChangeAttr, ClearWeatherAttr, ClearTerrainAttr, RemoveScreensAttr, MatchUserTypeAttr, WeatherBallTypeAttr, TerrainPulseTypeAttr, HiddenPowerTypeAttr, AnyTypeSuperEffectTypeMultiplierAttr, HalfSacrificialAttr, SacrificialAttrOnHit, AddArenaTrapTagAttr, AddArenaTrapTagUpgradeAttr, FirstMoveCondition, MultiHitType } from "../data/move";
import { ChargeAnim } from "../data/battle-anims";
import { Moves } from "../enums/moves";
import { StatusEffect, getStatusEffectMessageKey } from "../data/status-effect";
import { Type } from "../data/type";
import { WeatherType } from "../data/weather";
import { TerrainType } from "../data/terrain";
import { ArenaTagType } from "../enums/arena-tag-type";
import { BattlerTagType } from "../enums/battler-tag-type";
import { UpgradePath, UpgradePathUtils } from "../enums/upgrade-path";
import { UpgradeCategory, UpgradeCategoryUtils } from "../enums/upgrade-category";
import * as Utils from "../utils";
import BattleScene from "../battle-scene";
import { ModifierType, MoveUpgradeModifierType, MoveUpgradeModifierTypeGenerator, nuzlockeUnlockQuestModifier } from "../modifier/modifier-type";
import i18next, { ParseKeys } from "i18next";
export interface FilterUpgrades {
    moveUpgrades?: UpgradePath[];
    moveAttributes?: string[];
    types?: Type[];
}

function getStatusEffectName(statusEffect: StatusEffect): string {
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
    static capPowerBoost(basePower: number, powerBoost: number, maxPower: number = 180): number {
        const newPower = basePower + powerBoost;
        if (newPower > maxPower) {
            return maxPower - basePower;
        }
        return powerBoost;
    }

    static findCurrentTier<T>(path: T[], currentValue: any, compareKey: keyof T, compareFunc?: (current: any, pathValue: any) => boolean): number {
        for (let i = 0; i < path.length; i++) {
            const pathValue = path[i][compareKey];
            if (compareFunc ? compareFunc(currentValue, pathValue) : currentValue === pathValue) {
                return i;
            }
        }
        return -1;
    }

    static findProgressionTier<T>(path: T[], currentValue: number, compareKey: keyof T, isAscending: boolean = true): number {
        let bestTier = -1;

        for (let i = 0; i < path.length; i++) {
            const pathValue = path[i][compareKey] as number;

            if (isAscending) {
                if (pathValue <= currentValue) {
                    bestTier = i;
                }
            } else {
                if (pathValue >= currentValue && (bestTier === -1 || pathValue < (path[bestTier][compareKey] as number))) {
                    bestTier = i;
                }
            }
        }

        return bestTier;
    }

    static calculatePriorityTier(currentPriority: number, targetPath: any[]): number {
        if (targetPath[0]?.prio < 0) {
            if (currentPriority > 0) {
                return Math.min(currentPriority - 1, targetPath.length - 2);
            } else if (currentPriority === 0) {
                return -1;
            } else {
                for (let i = 0; i < targetPath.length; i++) {
                    if (targetPath[i].prio >= currentPriority) {
                        return i - 1;
                    }
                }
                return targetPath.length - 2;
            }
        }

        if (targetPath[0]?.prio > 0) {
            if (currentPriority <= 0) {
                return -1;
            } else {
                for (let i = 0; i < targetPath.length; i++) {
                    if (targetPath[i].prio >= currentPriority) {
                        return i - 1;
                    }
                }
                return targetPath.length - 2;
            }
        }

        return -1;
    }

    static analyzeStatChanges(attrs: StatChangeAttr[]): { statCount: number, levels: number, tier: number } {
        if (attrs.length === 0) {
            return { statCount: 0, levels: 0, tier: -1 };
        }

        const attr = attrs[0];
        const statCount = Array.isArray(attr.stats) ? attr.stats.length : 1;
        const levels = Math.abs(attr.levels);

        for (let i = 0; i < this.STAT_BOOST_SELF_PATH.length; i++) {
            const step = this.STAT_BOOST_SELF_PATH[i];
            if (step.stats === statCount && step.level === levels) {
                return { statCount, levels, tier: i };
            }
        }
        let bestTier = -1;
        let bestScore = -1;

        for (let i = 0; i < this.STAT_BOOST_SELF_PATH.length; i++) {
            const step = this.STAT_BOOST_SELF_PATH[i];

            if (step.stats > statCount || step.level > levels) continue;

            const statDiff = statCount - step.stats;
            const levelDiff = levels - step.level;
            const score = (4 - statDiff) + (3 - levelDiff);

            if (score > bestScore) {
                bestScore = score;
                bestTier = i;
            }
        }

        return { statCount, levels, tier: bestTier };
    }

    static shuffleArray(array: any[]): any[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    static doesPathlessUpgradeExist(moveId: Moves, scene: BattleScene, isPlayer: boolean = true): boolean {
        const existingUpgrades = scene.getUpgradesForMove(moveId, isPlayer);
        return existingUpgrades.some(upgrade => !upgrade.upgradeCategory);
    }

    static POWER_PATH = [
            { pBoost: 5},
            { pBoost: 7, accCost: 10},
            { pBoost: 10, accCost: 5 },
            { pBoost: 12, accCost: 10},
            { pBoost: 15, accCost: 5 },
            { pBoost: 17, accCost: 10},
            { pBoost: 20, accCost: 5 },
            { pBoost: 22, accCost: 10},
            { pBoost: 25, accCost: 15 },
            { pBoost: 27, accCost: 20 },
            { pBoost: 30, accCost: 15 },
            { pBoost: 32, accCost: 20 },
            { pBoost: 35, accCost: 15 },
            { pBoost: 37, accCost: 30 },
            { pBoost: 40, accCost: 25 },
            { pBoost: 42, accCost: 30 },
            { pBoost: 45, accCost: 25 },
            { pBoost: 47, accCost: 30 },
            { pBoost: 50, accCost: 25, setExistingChanceTo: 10 },
            { pBoost: 52, accCost: 30, setExistingChanceTo: 10 },
            { pBoost: 55, accCost: 25, setExistingChanceTo: 10 },
            { pBoost: 57, accCost: 30, setExistingChanceTo: 10 },
            { pBoost: 60, accCost: 25, setExistingChanceTo: 10 },
            { pBoost: 62, accCost: 30, setExistingChanceTo: 10 },
            { pBoost: 65, accCost: 25, setExistingChanceTo: 10 },
            { pBoost: 67, accCost: 30, setExistingChanceTo: 10 },
            { pBoost: 70, accCost: 35, setExistingChanceTo: 10 },
        ];

        static ACCURACY_PATH = [
            { accBoost: 5, pCost: 10 },
            { accBoost: 5, pCost: 5 },
            { accBoost: 10, pCost: 20 },
            { accBoost: 10, pCost: 15 },
            { accBoost: 15, pCost: 20 },
            { accBoost: 15, pCost: 15 },
            { accBoost: 20, pCost: 30 },
            { accBoost: 20, pCost: 25 },
            { accBoost: 25, pCost: 35 },
            { accBoost: 25, pCost: 30 },
            { accBoost: 30, pCost: 40 },
            { accBoost: 30, pCost: 35 },
            { accBoost: 35, pCost: 45 },
            { accBoost: 35, pCost: 40 },
            { accBoost: 40, pCost: 50 },
            { accBoost: 40, pCost: 45 },
            { accBoost: 45, pCost: 55 },
            { accBoost: 45, pCost: 50 },
            { accBoost: 50, pCost: 60 },
            { accBoost: 50, pCost: 55 },
        ];

        static HIT_HEAL_PATH = [
            { ratio: 1/16, pSetToRatio: .5 },
            { ratio: 1/12, pSetToRatio: .5 },
            { ratio: 1/12, pSetToRatio: .6 },
            { ratio: 1/10, pSetToRatio: .6 },
            { ratio: 1/10, pSetToRatio: .65 },
            { ratio: 1/8, pSetToRatio: .65 },
            { ratio: 1/8, pSetToRatio: .7 },
            { ratio: 1/7, pSetToRatio: .7 },
            { ratio: 1/7, pSetToRatio: .75 },
            { ratio: 1/6, pSetToRatio: .75 },
            { ratio: 1/6, pSetToRatio: .85 },
            { ratio: 1/5, pSetToRatio: .85 },
            { ratio: 1/5, pSetToRatio: .9 },
            { ratio: 1/4, pSetToRatio: .9 },
            { ratio: 1/4, pSetToRatio: .95 },
            { ratio: 1/3, pSetToRatio: .95 },
            { ratio: 1/3, pSetToRatio: 1.0 },
            { ratio: 1/2, pSetToRatio: 1.0 },
            { ratio: 1/2, pSetToRatio: 1.05 },
            { ratio: 1/2, pSetToRatio: 1.1 },
            { ratio: 1/2, pSetToRatio: 1.15 },
            { ratio: 1/2, pSetToRatio: 1.2 },

        ];

        static EFFECT_CHANCE_PATH = [
            { chance: 10, pSetToRatio: .5 },
            { chance: 15, pSetToRatio: .5 },
            { chance: 15, pSetToRatio: .6 },
            { chance: 20, pSetToRatio: .6 },
            { chance: 20, pSetToRatio: .65 },
            { chance: 25, pSetToRatio: .65 },
            { chance: 25, pSetToRatio: .7 },
            { chance: 30, pSetToRatio: .7 },
            { chance: 30, pSetToRatio: .75 },
            { chance: 35, pSetToRatio: .75 },
            { chance: 35, pSetToRatio: .85 },
            { chance: 40, pSetToRatio: .85 },
            { chance: 40, pSetToRatio: .9 },
            { chance: 45, pSetToRatio: .9 },
            { chance: 45, pSetToRatio: .95 },
            { chance: 50, pSetToRatio: .5 },
            { chance: 50, pSetToRatio: .6 },
            { chance: 55, pSetToRatio: .6 },
            { chance: 60, pSetToRatio: .65 },
            { chance: 65, pSetToRatio: .65 },
            { chance: 70, pSetToRatio: .7 },
            { chance: 75, pSetToRatio: .7 },
            { chance: 80, pSetToRatio: .75 },
            { chance: 85, pSetToRatio: .75 },
            { chance: 90, pSetToRatio: .8 },
            { chance: 95, pSetToRatio: .8 },
            { chance: 100, pSetToRatio: .8 },
            { chance: 100, pSetToRatio: .85 },
        ];

        static CRIT_PATH = [
            { pSetToRatio: .45 },
            { pSetToRatio: .5 },
            { pSetToRatio: .55 },
            { pSetToRatio: .6 },
            { pSetToRatio: .7 },
            { pSetToRatio: .75 },
            { pSetToRatio: .8 },
            { pSetToRatio: .85 },
            { pSetToRatio: .9 },
            { pSetToRatio: .95 },
            { pSetToRatio: 1 },
            { pSetToRatio: .25, critOnly: true, accCost: 15 },
            { pSetToRatio: .3, critOnly: true, accCost: 10 },
            { pSetToRatio: .35, critOnly: true, accCost: 5 },
            { pSetToRatio: .4, critOnly: true, accCost: 15 },
            { pSetToRatio: .45, critOnly: true, accCost: 10 },
            { pSetToRatio: .5, critOnly: true, accCost: 5 },
            { pSetToRatio: .55, critOnly: true, accCost: 15 },
            { pSetToRatio: .6, critOnly: true, accCost: 10 },
            { pSetToRatio: .65, critOnly: true, accCost: 5 },
            { pSetToRatio: .7, critOnly: true, accCost: 15 },
            { pSetToRatio: .75, critOnly: true, accCost: 10 },
            { pSetToRatio: .8, critOnly: true, accCost: 5 },
        ];

        static RECOIL_ADD_PATH = [
            { ratio: 1/2, pBoost: 10 },
            { ratio: 1/2, pBoost: 20 },
            { ratio: 1/2, pBoost: 30 },
            { ratio: 1/3, pBoost: 10 },
            { ratio: 1/3, pBoost: 20 },
            { ratio: 1/3, pBoost: 30 },
            { ratio: 1/4, pBoost: 10 },
            { ratio: 1/4, pBoost: 20 },
            { ratio: 1/4, pBoost: 30 },
            { ratio: 1/2, pBoost: 40, accCost: 20 },
            { ratio: 1/2, pBoost: 40, accCost: 15 },
            { ratio: 1/2, pBoost: 40, accCost: 10 },
            { ratio: 1/2, pBoost: 50, accCost: 20 },
            { ratio: 1/2, pBoost: 50, accCost: 15 },
            { ratio: 1/2, pBoost: 50, accCost: 10 },
            { ratio: 1/3, pBoost: 40, accCost: 20 },
            { ratio: 1/3, pBoost: 40, accCost: 15 },
            { ratio: 1/3, pBoost: 40, accCost: 10 },
            { ratio: 1/3, pBoost: 50, accCost: 20 },
            { ratio: 1/3, pBoost: 50, accCost: 15 },
            { ratio: 1/3, pBoost: 50, accCost: 10 },
             { ratio: 1/4, pBoost: 40, accCost: 20 },
            { ratio: 1/4, pBoost: 40, accCost: 15 },
            { ratio: 1/4, pBoost: 40, accCost: 10 },
            { ratio: 1/4, pBoost: 50, accCost: 20 },
            { ratio: 1/4, pBoost: 50, accCost: 15 },
            { ratio: 1/4, pBoost: 50, accCost: 10 },
             { ratio: 1/5, pBoost: 10, accCost: 10 },
             { ratio: 1/5, pBoost: 10, accCost: 5 },
            { ratio: 1/5, pBoost: 20, accCost: 10 },
            { ratio: 1/5, pBoost: 20, accCost: 5 },
            { ratio: 1/5, pBoost: 30, accCost: 10 },
            { ratio: 1/5, pBoost: 30, accCost: 5 },
            { ratio: 1/5, pBoost: 40, accCost: 10 },
        ];

        static RECOIL_DECREASE_PATH = [
            { ratio: 1/3, pCost: 25 },
            { ratio: 1/3, pCost: 20 },
            { ratio: 1/3, pCost: 15 },
            { ratio: 1/3, pCost: 10 },
            { ratio: 1/4, pCost: 25, accCost: 15 },
            { ratio: 1/4, pCost: 20, accCost: 15 },
            { ratio: 1/4, pCost: 15, accCost: 15 },
            { ratio: 1/4, pCost: 10, accCost: 15 },
            { ratio: 1/4, pCost: 25, accCost: 10 },
            { ratio: 1/4, pCost: 20, accCost: 10 },
            { ratio: 1/4, pCost: 15, accCost: 10 },
            { ratio: 1/4, pCost: 10, accCost: 10 },
            { ratio: 1/5, pCost: 25, accCost: 15 },
            { ratio: 1/5, pCost: 20, accCost: 15 },
            { ratio: 1/5, pCost: 15, accCost: 15 },
            { ratio: 1/5, pCost: 10, accCost: 15 },
            { ratio: 1/5, pCost: 25, accCost: 10 },
            { ratio: 1/5, pCost: 20, accCost: 10 },
            { ratio: 1/5, pCost: 15, accCost: 10 },
            { ratio: 1/5, pCost: 10, accCost: 10 },
        ];

        static SACRIFICIAL_PATH = [
            { attrId: "Half", pSet: 90, desc: "moveUpgrade:description:sacrificial:addHalf" },
            { attrId: "Half", pSet: 100, desc: "moveUpgrade:description:sacrificial:addHalf" },
            { attrId: "Half", pSet: 110, desc: "moveUpgrade:description:sacrificial:addHalf" },
            { attrId: "Half", pSet: 120, desc: "moveUpgrade:description:sacrificial:addHalf" },
            { attrId: "Half", pSet: 130, desc: "moveUpgrade:description:sacrificial:addHalf" },
            { attrId: "Half", pSet: 140, desc: "moveUpgrade:description:sacrificial:addHalf" },
            { attrId: "Half", pSet: 150, desc: "moveUpgrade:description:sacrificial:addHalf", accCost: 10 },
            { attrId: "Half", pSet: 150, desc: "moveUpgrade:description:sacrificial:addHalf", accCost: 5 },
            { attrId: "Half", pSet: 155, desc: "moveUpgrade:description:sacrificial:addHalf", accCost: 10 },
            { attrId: "Half", pSet: 155, desc: "moveUpgrade:description:sacrificial:addHalf", accCost: 5 },
            { attrId: "Half", pSet: 160, desc: "moveUpgrade:description:sacrificial:addHalf", accCost: 10 },
            { attrId: "Half", pSet: 160, desc: "moveUpgrade:description:sacrificial:addHalf", accCost: 5 },
            { attrId: "Full", pSet: 180, desc: "moveUpgrade:description:sacrificial:upgradeFull" },
            { attrId: "Full", pSet: 190, desc: "moveUpgrade:description:sacrificial:upgradeFull" },
            { attrId: "Full", pSet: 200, desc: "moveUpgrade:description:sacrificial:upgradeFull" },
            { attrId: "Full", pSet: 210, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 10 },
            { attrId: "Full", pSet: 210, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 5 },
            { attrId: "Full", pSet: 220, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 10 },
            { attrId: "Full", pSet: 220, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 5 },
            { attrId: "Full", pSet: 230, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 10 },
            { attrId: "Full", pSet: 230, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 5 },
            { attrId: "Full", pSet: 240, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 10 },
            { attrId: "Full", pSet: 240, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 5 },
            { attrId: "Full", pSet: 250, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 10 },
            { attrId: "Full", pSet: 250, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 5 },
            { attrId: "Full", pSet: 260, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 10 },
            { attrId: "Full", pSet: 260, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 5 },
            { attrId: "Full", pSet: 270, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 10 },
            { attrId: "Full", pSet: 270, desc: "moveUpgrade:description:sacrificial:upgradeFull", accCost: 5 },
            { attrId: "FullOnHit", pSet: 200, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 200, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 200, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 210, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 210, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 210, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 220, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 220, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 220, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 230, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 230, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 230, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 240, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 240, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 240, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 250, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 250, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 250, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 260, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 260, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 260, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 270, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 270, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 270, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 280, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 280, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 280, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 290, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 290, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 290, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
            { attrId: "FullOnHit", pSet: 300, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 15 },
            { attrId: "FullOnHit", pSet: 300, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 10 },
            { attrId: "FullOnHit", pSet: 300, desc: "moveUpgrade:description:sacrificial:upgradeOnHit", accCost: 5 },
        ];

        static CHARGE_MOVE_PATH = [
            { pBoost: 40, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 15 },
            { pBoost: 40, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 10 },
            { pBoost: 40, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 5 },
            { pBoost: 50, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 15 },
            { pBoost: 50, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 10 },
            { pBoost: 50, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 5 },
            { pBoost: 60, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 15 },
            { pBoost: 60, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 10 },
            { pBoost: 60, desc: "moveUpgrade:description:misc:addChargeTurn", accCost: 5 },
            { pBoost: 20, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 20 },
            { pBoost: 20, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 15 },
            { pBoost: 20, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 10 },
            { pBoost: 20, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 5 },
            { pBoost: 25, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 20 },
            { pBoost: 25, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 15 },
            { pBoost: 25, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 10 },
            { pBoost: 25, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 5 },
            { pBoost: 30, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 20 },
            { pBoost: 30, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 15 },
            { pBoost: 30, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 10 },
            { pBoost: 30, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 5 },
            { pBoost: 35, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 20 },
            { pBoost: 35, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 15 },
            { pBoost: 35, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 10 },
            { pBoost: 35, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 5 },
            { pBoost: 40, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 20 },
            { pBoost: 40, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 15 },
            { pBoost: 40, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 10 },
            { pBoost: 40, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 5 },
            { pBoost: 45, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 20 },
            { pBoost: 45, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 15 },
            { pBoost: 45, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 10 },
            { pBoost: 45, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 5 },
            { pBoost: 50, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 20 },
            { pBoost: 50, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 15 },
            { pBoost: 50, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 10 },
            { pBoost: 50, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost", accCost: 5 },
        ];

        static MULTI_HIT_PATH = [
            { typeId: "2", pSet: 30, checkAll: true, accCost: 10, chance: 2 },
            { typeId: "2", pSet: 35, checkAll: true, accCost: 10, chance: 2 },
            { typeId: "2", pSet: 40, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "2", pSet: 45, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "2", pSet: 50, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "2", pSet: 55, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "2", pSet: 55, checkAll: true, accCost: 5, chance: 2, },
            { typeId: "2", pSet: 55, accCost: 5, chance: 2, },
            { typeId: "3", pSet: 20, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "3", pSet: 25, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "3", pSet: 30, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "2-5", pSet: 15, checkAll: true, accCost: 15, chance: 1, },
            { typeId: "2-5", pSet: 15, checkAll: true, accCost: 10, chance: 1, },
            { typeId: "2-5", pSet: 15, checkAll: true, accCost: 5, chance: 1, },
            { typeId: "2-5", pSet: 15, accCost: 5, chance: 1, },
            { typeId: "2-5", pSet: 20, checkAll: true, accCost: 20, chance: 1, },
            { typeId: "2-5", pSet: 20, checkAll: true, accCost: 15, chance: 1, },
            { typeId: "2-5", pSet: 20, checkAll: true, accCost: 10, chance: 1, },
            { typeId: "2-5", pSet: 20, checkAll: true, accCost: 5, chance: 1, },
            { typeId: "2-5", pSet: 20, accCost: 5, chance: 1, },
            { typeId: "2", pSet: 55, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "2", pSet: 55, checkAll: true, accCost: 5, chance: 2, },
            { typeId: "2", pSet: 55, accCost: 5, chance: 2, },
            { typeId: "2", pSet: 55, accCost: 5, chance: 3, },
            { typeId: "2", pSet: 55, accCost: 5, chance: 4, },
            { typeId: "2", pSet: 55, accCost: 5, chance: 5, },
            { typeId: "3", pSet: 35, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "3", pSet: 35, checkAll: true, accCost: 5, chance: 2, },
            { typeId: "3", pSet: 35, accCost: 5, chance: 2 },
            { typeId: "3", pSet: 35, accCost: 5, chance: 3 },
            { typeId: "3", pSet: 35, accCost: 5, chance: 4 },
            { typeId: "2-5", pSet: 25, checkAll: true, accCost: 20, chance: 1, },
            { typeId: "2-5", pSet: 25, checkAll: true, accCost: 15, chance: 1, },
            { typeId: "2-5", pSet: 25, checkAll: true, accCost: 10, chance: 1, },
            { typeId: "2-5", pSet: 25, checkAll: true, accCost: 5, chance: 1, },
            { typeId: "2-5", pSet: 25, accCost: 5, chance: 1, },
            { typeId: "2-5", pSet: 25, chance: 1, },
            { typeId: "2-5", pSet: 25, chance: 2, },
            { typeId: "2-5", pSet: 25, chance: 3, },
            { typeId: "2-5", pSet: 25, chance: 4, },
            { typeId: "4-8", pSet: 15, checkAll: true, accCost: 20, chance: 1, },
            { typeId: "4-8", pSet: 15, checkAll: true, accCost: 15, chance: 1, },
            { typeId: "4-8", pSet: 15, checkAll: true, accCost: 10, chance: 1, },
            { typeId: "4-8", pSet: 15, checkAll: true, accCost: 10, chance: 1, },
            { typeId: "4-8", pSet: 15, checkAll: true, accCost: 10, chance: 2, },
            { typeId: "4-8", pSet: 15, checkAll: true, accCost: 10, chance: 3, },
        ];

        static POSITIVE_PRIORITY_PATH = [
            { prio: 1, pSetToRatio: .3 },
            { prio: 1, pSetToRatio: .35 },
            { prio: 1, pSetToRatio: .4 },
            { prio: 1, pSetToRatio: .45 },
            { prio: 2, pSetToRatio: .5 },
            { prio: 2, pSetToRatio: .55 },
            { prio: 2, pSetToRatio: .6 },
            { prio: 2, pSetToRatio: .65 },
            { prio: 3, pSetToRatio: .5 },
            { prio: 3, pSetToRatio: .55 },
            { prio: 3, pSetToRatio: .6 },
            { prio: 3, pSetToRatio: .65 },
            { prio: 3, pSetToRatio: .7 },
            { prio: 3, pSetToRatio: .75 },
            { prio: 3, pSetToRatio: .8 },
            { prio: 4, pSetToRatio: .6 },
            { prio: 4, pSetToRatio: .65 },
            { prio: 4, pSetToRatio: .7 },
            { prio: 4, pSetToRatio: .75 },
            { prio: 4, pSetToRatio: .8 },
        ];

        static NEGATIVE_PRIORITY_PATH = [
            { prio: -1, pBoost: 5 },
            { prio: -1, pBoost: 10 },
            { prio: -1, pBoost: 15 },
            { prio: -1, pBoost: 20 },
            { prio: -2, pBoost: 25, accCost: 15 },
            { prio: -2, pBoost: 25, accCost: 10 },
            { prio: -2, pBoost: 25, accCost: 5 },
            { prio: -2, pBoost: 25 },
            { prio: -2, pBoost: 30, accCost: 15 },
            { prio: -2, pBoost: 30, accCost: 10 },
            { prio: -2, pBoost: 30, accCost: 5 },
            { prio: -2, pBoost: 30 },
            { prio: -2, pBoost: 35, accCost: 15 },
            { prio: -2, pBoost: 35, accCost: 10 },
            { prio: -2, pBoost: 35, accCost: 5 },
            { prio: -2, pBoost: 35 },
            { prio: -3, pBoost: 40, accCost: 15 },
            { prio: -3, pBoost: 40, accCost: 10 },
            { prio: -3, pBoost: 40, accCost: 5 },
            { prio: -3, pBoost: 40 },
            { prio: -3, pBoost: 45, accCost: 15 },
            { prio: -3, pBoost: 45, accCost: 10 },
            { prio: -3, pBoost: 45, accCost: 5 },
            { prio: -3, pBoost: 45 },
            { prio: -3, pBoost: 50, accCost: 15 },
            { prio: -3, pBoost: 50, accCost: 10 },
            { prio: -3, pBoost: 50, accCost: 5 },
            { prio: -3, pBoost: 50 }
        ];

        static ITEM_INTERACTION_PATH = [
            { type: 'remove', pCost: 40 },
            { type: 'remove', pCost: 30 },
            { type: 'remove', pCost: 20 },
            { type: 'remove', pCost: 10 },
            { type: 'remove', pCost: 0 },
            { type: 'remove', pBoost: 5 },
            { type: 'remove', pBoost: 10 },
            { type: 'remove', pBoost: 15 },
            { type: 'remove', pBoost: 20 },
            { type: 'steal', chance: 5, pSetToRatio: .5 },
            { type: 'steal', chance: 10, pSetToRatio: .5 },
            { type: 'steal', chance: 10, pSetToRatio: .6 },
            { type: 'steal', chance: 15, pSetToRatio: .6 },
            { type: 'steal', chance: 15, pSetToRatio: .65 },
            { type: 'steal', chance: 20, pSetToRatio: .65 },
            { type: 'steal', chance: 20, pSetToRatio: .7 },
            { type: 'steal', chance: 25, pSetToRatio: .7 },
            { type: 'steal', chance: 25, pSetToRatio: .75 },
            { type: 'steal', chance: 30, pSetToRatio: .75 },
            { type: 'steal', chance: 30, pSetToRatio: .85 },
            { type: 'steal', chance: 35, pSetToRatio: .85 },
            { type: 'steal', chance: 35, pSetToRatio: .9 },
            { type: 'steal', chance: 40, pSetToRatio: .9 },
            { type: 'steal', chance: 40, pSetToRatio: .95 },
            { type: 'steal', chance: 45, pSetToRatio: .95 },
            { type: 'steal', chance: 45, pSetToRatio: 1.0 },
            { type: 'steal', chance: 50, pSetToRatio: 1.0 },
            { type: 'steal', chance: 50, pSetToRatio: 1.05 },
            { type: 'steal', chance: 55, pSetToRatio: 1.05 },
            { type: 'steal', chance: 55, pSetToRatio: 1.1 },
            { type: 'steal', chance: 60, pSetToRatio: 1.1 },
            { type: 'steal', chance: 60, pSetToRatio: 1.15 },
            { type: 'steal', chance: 65, pSetToRatio: 1.15 },
            { type: 'steal', chance: 65, pSetToRatio: 1.2 },
            { type: 'steal', chance: 70, pSetToRatio: 1.2 },
            { type: 'steal', chance: 75, pSetToRatio: 1.2 },
            { type: 'steal', chance: 80, pSetToRatio: 1.2 },
            { type: 'steal', chance: 80, pSetToRatio: 1.25 },
            { type: 'steal', chance: 85, pSetToRatio: 1.25 },
            { type: 'steal', chance: 85, pSetToRatio: 1.25 },
            { type: 'steal', chance: 90, pSetToRatio: 1.3 },
            { type: 'steal', chance: 95, pSetToRatio: 1.3 },
            { type: 'steal', chance: 100, pSetToRatio: 1.3 },
        ];

        static STATUS_IMPROVE_PATH = [
            { addChance: 5, pSetToRatio: .5 },
            { addChance: 10, pSetToRatio: .5 },
            { addChance: 10, pSetToRatio: .6 },
            { addChance: 15, pSetToRatio: .6 },
            { addChance: 15, pSetToRatio: .65 },
            { addChance: 20, pSetToRatio: .65 },
            { addChance: 20, pSetToRatio: .7 },
            { addChance: 25, pSetToRatio: .7 },
            { addChance: 25, pSetToRatio: .75, accCost: 50 },
            { addChance: 30, pSetToRatio: .75, accCost: 45 },
            { addChance: 30, pSetToRatio: .85, accCost: 45 },
            { addChance: 35, pSetToRatio: .85, accCost: 40 },
            { addChance: 35, pSetToRatio: .9, accCost: 35 },
            { addChance: 40, pSetToRatio: .9, accCost: 35 },
            { addChance: 40, pSetToRatio: .95, accCost: 30 },
            { addChance: 40, pSetToRatio: 1.0, accCost: 25 },
            { addChance: 40, pSetToRatio: 1.05, accCost: 20 },
            { addChance: 40, pSetToRatio: 1.05, accCost: 15 },
            { addChance: 40, pSetToRatio: 1.1, accCost: 10 },
            { addChance: 40, pSetToRatio: 1.15, accCost: 5 },
            { addChance: 40, pSetToRatio: 1.2, accCost: 5 },
            { addChance: 40, pSetToRatio: 1.25, accCost: 5 },
        ];

        static STATUS_DUAL_PATH = [
            { chance: 5, pSetToRatio: .5 },
            { chance: 10, pSetToRatio: .5 },
            { chance: 10, pSetToRatio: .6 },
            { chance: 15, pSetToRatio: .6 },
            { chance: 15, pSetToRatio: .65 },
            { chance: 20, pSetToRatio: .65 },
            { chance: 20, pSetToRatio: .7 },
            { chance: 25, pSetToRatio: .7 },
            { chance: 25, pSetToRatio: .75, accCost: 50 },
            { chance: 30, pSetToRatio: .75, accCost: 45 },
            { chance: 30, pSetToRatio: .8, accCost: 45 },
            { chance: 35, pSetToRatio: .8, accCost: 40 },
            { chance: 35, pSetToRatio: .85 },
            { chance: 40, pSetToRatio: .85, accCost: 35 },
            { chance: 40, pSetToRatio: .9, accCost: 30 },
            { chance: 45, pSetToRatio: .9, accCost: 25 },
            { chance: 45, pSetToRatio: .95, accCost: 20 },
            { chance: 50, pSetToRatio: .95, accCost: 15 },
            { chance: 50, pSetToRatio: 1.0, accCost: 10 },
            { chance: 50, pSetToRatio: 1.0, accCost: 5 },
            { chance: 50, pSetToRatio: 1.05, accCost: 5 },
            { chance: 50, pSetToRatio: 1.1, accCost: 15 },
            { chance: 50, pSetToRatio: 1.15, accCost: 15 },
            { chance: 50, pSetToRatio: 1.2, accCost: 15 },
            { chance: 50, pSetToRatio: 1.25, accCost: 15 },
        ];

        static STAT_BOOST_SELF_PATH = [
            { stats: 1, level: 1, chance: 10, pSetToRatio: .5 },
            { stats: 1, level: 1, chance: 15, pSetToRatio: .5 },
            { stats: 1, level: 1, chance: 15, pSetToRatio: .6 },
            { stats: 1, level: 1, chance: 20, pSetToRatio: .6 },
            { stats: 1, level: 1, chance: 20, pSetToRatio: .65 },
            { stats: 1, level: 1, chance: 25, pSetToRatio: .65 },
            { stats: 1, level: 1, chance: 25, pSetToRatio: .7 },
            { stats: 1, level: 1, chance: 30, pSetToRatio: .7 },
            { stats: 2, level: 1, chance: 10, pSetToRatio: .5 },
            { stats: 2, level: 1, chance: 15, pSetToRatio: .5 },
            { stats: 2, level: 1, chance: 15, pSetToRatio: .6 },
            { stats: 2, level: 1, chance: 20, pSetToRatio: .6 },
            { stats: 2, level: 1, chance: 20, pSetToRatio: .65 },
            { stats: 2, level: 1, chance: 25, pSetToRatio: .65 },
            { stats: 2, level: 1, chance: 25, pSetToRatio: .7 },
            { stats: 2, level: 1, chance: 30, pSetToRatio: .7 },
            { stats: 3, level: 1, chance: 10, pSetToRatio: .5 },
            { stats: 3, level: 1, chance: 15, pSetToRatio: .5, recoilCost: 1/2 },
            { stats: 3, level: 1, chance: 15, pSetToRatio: .6, recoilCost: 1/2 },
            { stats: 3, level: 1, chance: 20, pSetToRatio: .6, recoilCost: 1/2 },
            { stats: 3, level: 1, chance: 20, pSetToRatio: .65, recoilCost: 1/2 },
            { stats: 3, level: 1, chance: 25, pSetToRatio: .65, recoilCost: 1/2 },
            { stats: 3, level: 1, chance: 25, pSetToRatio: .7, recoilCost: 1/2 },
            { stats: 3, level: 1, chance: 30, pSetToRatio: .7, recoilCost: 1/2 },
            { stats: 1, level: 1, chance: 35, pSetToRatio: .75 },
            { stats: 1, level: 1, chance: 35, pSetToRatio: .85 },
            { stats: 1, level: 1, chance: 40, pSetToRatio: .85 },
            { stats: 1, level: 1, chance: 40, pSetToRatio: .9 },
            { stats: 1, level: 1, chance: 45, pSetToRatio: .9 },
            { stats: 1, level: 1, chance: 45, pSetToRatio: .95 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: .95 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.0 },
            { stats: 2, level: 1, chance: 35, pSetToRatio: .75 },
            { stats: 2, level: 1, chance: 35, pSetToRatio: .85 },
            { stats: 2, level: 1, chance: 40, pSetToRatio: .85 },
            { stats: 2, level: 1, chance: 40, pSetToRatio: .9 },
            { stats: 2, level: 1, chance: 45, pSetToRatio: .9 },
            { stats: 2, level: 1, chance: 45, pSetToRatio: .95 },
            { stats: 2, level: 1, chance: 50, pSetToRatio: .95 },
            { stats: 2, level: 1, chance: 50, pSetToRatio: 1.0 },
            { stats: 5, level: 1, chance: 10, pSetToRatio: .5, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 15, pSetToRatio: .5, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 15, pSetToRatio: .6, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 20, pSetToRatio: .6, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 20, pSetToRatio: .65, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 25, pSetToRatio: .65, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 25, pSetToRatio: .7, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 30, pSetToRatio: .7, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 30, pSetToRatio: .75, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 30, pSetToRatio: .8, recoilCost: 1/2 },
            { stats: 5, level: 1, chance: 30, pSetToRatio: .85, recoilCost: 1/2 },
        ];

        static STAT_LOWER_TARGET_PATH = [
            { stats: 1, level: 1, chance: 10, pSetToRatio: .5 },
            { stats: 1, level: 1, chance: 15, pSetToRatio: .5 },
            { stats: 1, level: 1, chance: 15, pSetToRatio: .6 },
            { stats: 1, level: 1, chance: 20, pSetToRatio: .6 },
            { stats: 1, level: 1, chance: 20, pSetToRatio: .65 },
            { stats: 1, level: 1, chance: 25, pSetToRatio: .65 },
            { stats: 1, level: 1, chance: 25, pSetToRatio: .7 },
            { stats: 1, level: 1, chance: 30, pSetToRatio: .7 },
            { stats: 2, level: 1, chance: 10, pSetToRatio: .5 },
            { stats: 2, level: 1, chance: 15, pSetToRatio: .5 },
            { stats: 2, level: 1, chance: 15, pSetToRatio: .6 },
            { stats: 2, level: 1, chance: 20, pSetToRatio: .6 },
            { stats: 2, level: 1, chance: 20, pSetToRatio: .65 },
            { stats: 2, level: 1, chance: 25, pSetToRatio: .65 },
            { stats: 2, level: 1, chance: 25, pSetToRatio: .7 },
            { stats: 2, level: 1, chance: 30, pSetToRatio: .7 },
            { stats: 2, level: 1, chance: 30, pSetToRatio: .75 },
            { stats: 1, level: 1, chance: 35, pSetToRatio: .75 },
            { stats: 1, level: 1, chance: 35, pSetToRatio: .85 },
            { stats: 1, level: 1, chance: 40, pSetToRatio: .85 },
            { stats: 1, level: 1, chance: 40, pSetToRatio: .9 },
            { stats: 1, level: 1, chance: 45, pSetToRatio: .9 },
            { stats: 1, level: 1, chance: 45, pSetToRatio: .95 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: .95 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.0 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.05 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.1 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.15, accCost: 10 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.2, accCost: 10 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.25, accCost: 10 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.3, accCost: 10 },
            { stats: 1, level: 1, chance: 50, pSetToRatio: 1.35, accCost: 10 },
            { stats: 2, level: 1, chance: 35, pSetToRatio: .75 },
            { stats: 2, level: 1, chance: 35, pSetToRatio: .85 },
            { stats: 2, level: 1, chance: 40, pSetToRatio: .85 },
            { stats: 2, level: 1, chance: 45, pSetToRatio: .85 },
            { stats: 2, level: 1, chance: 50, pSetToRatio: .85, accCost: 10 },
        ];
    static generateMoveUpgradeOptions(moveId: Moves, scene: BattleScene, isPlayer: boolean = true, lowTierUpgrade: boolean = false, filterUpgrades?: FilterUpgrades): ModifierType[] {
        const baseMove = allMoves[moveId];
        const upgradeMove = scene.getUpgradedMove(allMoves[moveId]);
        const moveGenerator = new MoveUpgradeModifierTypeGenerator();
        let upgrades: ModifierType[] = [];

        const getRandomTypeChangeOptions = (preferred?: Type[]): ModifierType[] => {
            const results: ModifierType[] = [];
            const allTypes = Object.values(Type).filter(t => typeof t === "number" && t > Type.UNKNOWN && t < Type.STELLAR) as Type[];
            const preferredList = (preferred && preferred.length > 0) ? preferred : allTypes;
            const currentMatchesPreferred = preferred && preferred.length > 0 ? preferred.includes(baseMove.type) : true;
            const pool = currentMatchesPreferred ? allTypes : preferredList;
            const availableTypes = pool.filter(type => type !== baseMove.type);
            if (availableTypes.length > 0) {
                const numTypesToOffer = Math.min(3, availableTypes.length);
                const selectedTypes = MoveUpgrade.shuffleArray([...availableTypes]).slice(0, numTypesToOffer);
                for (const newType of selectedTypes) {
                    const typeName = getTypeName(newType);
                    results.push(moveGenerator.getType(moveId, 0, newType, null, 0,
                        i18next.t("moveUpgrade:description:type:directChange", { typeName }),
                        null, null, [], [], 0, undefined));
                }
            }
            return results;
        };

        if (filterUpgrades?.types && filterUpgrades.types.length > 0) {
            return getRandomTypeChangeOptions(filterUpgrades.types);
        }

        const getEffectChanceTierIndex = (baseMoveChance: number, upgradeTier: number): number => {
            for (let i = 0; i < this.EFFECT_CHANCE_PATH.length; i++) {
                if (this.EFFECT_CHANCE_PATH[i].chance > baseMoveChance) {
                    return Math.max(0, i + upgradeTier - 1);
                }
            }
            return this.EFFECT_CHANCE_PATH.length;
        };

        const getExistingUpgrades = () => scene.getUpgradesForMove(moveId, isPlayer);

        const shouldOfferUpgradeCategory = (category: UpgradeCategory): boolean => {
            const existingUpgrades = getExistingUpgrades();
            return UpgradeCategoryUtils.canAddUpgradeCategory(category, existingUpgrades);
        };

        const getNextUpgradeTier = (category: UpgradeCategory): number | null => {
            if (isPlayer) {
                const existingUpgrades = getExistingUpgrades();
                return UpgradeCategoryUtils.getNextUpgradeTier(moveId, category, existingUpgrades, lowTierUpgrade);
            } else {
                const waveIndex = scene.currentBattle?.waveIndex || 1;
                const pathLength = UpgradeCategoryUtils.getMoveUpgradeMaxTier(category);

                const segment = Math.ceil(waveIndex / 30);

                const maxSegments = Math.min(15, pathLength);

                const tiersPerSegment = Math.ceil(pathLength / maxSegments);

                const effectiveSegment = Math.min(segment, maxSegments);

                let availableTiers: number[] = [];

                if (effectiveSegment <= 8) {
                    if (effectiveSegment > 1) {
                        const prevSegmentStart = (effectiveSegment - 2) * tiersPerSegment + 1;
                        const prevSegmentEnd = Math.min(prevSegmentStart + tiersPerSegment - 1, pathLength);
                        for (let tier = prevSegmentStart; tier <= prevSegmentEnd; tier++) {
                            availableTiers.push(tier);
                        }
                    }

                    const currentSegmentStart = (effectiveSegment - 1) * tiersPerSegment + 1;
                    const currentSegmentEnd = Math.min(currentSegmentStart + tiersPerSegment - 1, pathLength);
                    for (let tier = currentSegmentStart; tier <= currentSegmentEnd; tier++) {
                        availableTiers.push(tier);
                    }
                } else {
                    const segments = [];
                    for (let seg = 7; seg <= effectiveSegment; seg++) {
                        segments.push(seg);
                    }

                    for (const seg of segments) {
                        const segmentStart = (seg - 1) * tiersPerSegment + 1;
                        const segmentEnd = Math.min(segmentStart + tiersPerSegment - 1, pathLength);
                        for (let tier = segmentStart; tier <= segmentEnd; tier++) {
                            if (tier <= pathLength) {
                                availableTiers.push(tier);
                            }
                        }
                    }
                }
                availableTiers = [...new Set(availableTiers)].sort((a, b) => a - b);

                if (availableTiers.length === 0) {
                    availableTiers = [1];
                }

                const randomIndex = Math.floor(Math.random() * availableTiers.length);
                return availableTiers[randomIndex];
            }
        };

        const isPhysicalMove = upgradeMove.category === MoveCategory.PHYSICAL;
        const isSpecialMove = upgradeMove.category === MoveCategory.SPECIAL;
        const isStatusMove = baseMove.category === MoveCategory.STATUS;
        const hasPower = baseMove.power > 0;
        const baseMovePower = baseMove.power;
        const upgradeMovePower = upgradeMove.power;
        const hasAccuracy = typeof baseMove.accuracy === 'number' && baseMove.accuracy > 0 && baseMove.accuracy < 101;
        const baseMoveAccuracy = typeof baseMove.accuracy === 'number' ? baseMove.accuracy : -1;
        const upgradeMoveAccuracy = typeof upgradeMove.accuracy === 'number' ? upgradeMove.accuracy : -1;
        const baseMoveChance = upgradeMove.chance > 0 ? upgradeMove.chance : 0;
        const hasContact = baseMove.hasFlag(MoveFlags.MAKES_CONTACT);

        const existingEffectChanceUpgrade: any = getExistingUpgrades().find(u => (u as any).upgradeCategory === UpgradeCategory.EFFECT_CHANCE);
        const carriedEffectChanceAttrs: any[] = existingEffectChanceUpgrade?.additionalAttrs ? [...existingEffectChanceUpgrade.additionalAttrs] : [];
        const carriedEffectChanceConditions: any[] = existingEffectChanceUpgrade?.additionalConditions ? [...existingEffectChanceUpgrade.additionalConditions] : [];

        const recoilAttr = baseMove.getAttrs(RecoilAttr)[0] as RecoilAttr | undefined;
        const hasRecoil = !!recoilAttr;
        const isSacrificial = baseMove.hasAttr(SacrificialAttr) || baseMove.hasAttr(HalfSacrificialAttr) || baseMove.hasAttr(SacrificialAttrOnHit);
        const hasCharge = baseMove.hasAttr(ChargeAttr);
        const multiHitAttr = baseMove.getAttrs(MultiHitAttr)[0] as MultiHitAttr | undefined;
        const chargeAttr = baseMove.getAttrs(ChargeAttr)[0] as ChargeAttr | undefined;
        const hasSacrificial = baseMove.hasAttr(SacrificialAttr);
        const hasHalfSacrificial = baseMove.hasAttr(HalfSacrificialAttr);
        const hasSacrificialOnHit = baseMove.hasAttr(SacrificialAttrOnHit);
        const isAnySacrificial = hasSacrificial || hasHalfSacrificial || hasSacrificialOnHit;
        const isMultiHit = !!multiHitAttr;
        const highCritAttr = baseMove.getAttrs(HighCritAttr)[0] as HighCritAttr | undefined;
        const isCritOnly = baseMove.hasAttr(CritOnlyAttr);
        const healAttr = baseMove.getAttrs(HealAttr)[0] as HealAttr | undefined;
        const hitHealAttr = baseMove.getAttrs(HitHealAttr)[0] as HitHealAttr | undefined;

        const selfBoostAttrs = upgradeMove.getAttrs(StatChangeAttr).filter((a: StatChangeAttr) => a.selfTarget && a.levels > 0);
        const targetLowerAttrs = upgradeMove.getAttrs(StatChangeAttr).filter((a: StatChangeAttr) => !a.selfTarget && a.levels < 0);
        const selfLowerAttrs = upgradeMove.getAttrs(StatChangeAttr).filter((a: StatChangeAttr) => a.selfTarget && a.levels < 0);
        const selfBoostAttr = selfBoostAttrs[0] as StatChangeAttr | undefined;
        const targetLowerAttr = targetLowerAttrs[0] as StatChangeAttr | undefined;
        const isSelfTarget = baseMove.getAttrs(MoveAttr).filter((a: MoveAttr) => a.selfTarget).length > 0;

        const statusEffectAttrs = upgradeMove.getAttrs(StatusEffectAttr);
        const upgradeStatusEffectAttrs = upgradeMove.getAttrs(StatusEffectAttr);
        const hasFlinch = baseMove.hasAttr(FlinchAttr);
        const hasConfuse = baseMove.hasAttr(ConfuseAttr);
        const battlerTagAttrs = baseMove.getAttrs(AddBattlerTagAttr);
        const hasLeechSeed = battlerTagAttrs.some((a: any) => a.tagType === BattlerTagType.SEEDED);
        const hasEncore = battlerTagAttrs.some((a: any) => a.tagType === BattlerTagType.ENCORE);
        const hasCurse = battlerTagAttrs.some((a: any) => a.tagType === BattlerTagType.CURSED);
        const hasSecondaryEffect = !!(targetLowerAttr || statusEffectAttrs.length > 0 || hasFlinch || hasConfuse || hasLeechSeed || hasEncore || hasCurse);
        const hasAnySecondaryEffect = hasSecondaryEffect && baseMoveChance > 0;
        const hasStatBoostSelf = selfBoostAttrs.length > 0;
        const hasStatLowerTarget = targetLowerAttrs.length > 0;
        const hasHealAttr = healAttr !== undefined;
        let isVeryRare = Utils.randSeedInt(200) <= 1;

        let isRare = Utils.randSeedInt(100) <= 1;

        let isMinorRare = Utils.randSeedInt(50) <= 1;
        let isPathlessRare = Utils.randSeedInt(20) <= 0;
        let isPathlessVeryRare = Utils.randSeedInt(100) <= 0;
        const hasPathlessUpgrade = MoveUpgrade.doesPathlessUpgradeExist(moveId, scene, isPlayer);
        if (filterUpgrades) {
            isVeryRare = true;
            isRare = true;
            isMinorRare = true;
            isPathlessRare = true;
            isPathlessVeryRare = true;
        }
        if (shouldOfferUpgradeCategory(UpgradeCategory.POSITIVE_PRIORITY) && !isStatusMove && baseMove.priority <= 0 && hasPower && !isMultiHit && upgradeMove.power < 100) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.POSITIVE_PRIORITY);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.POSITIVE_PRIORITY_PATH[tierIndex];

                if (nextStep) {
                    const priorityDelta = nextStep.prio - baseMove.priority;
                    let powerDelta = 0;
                    if (nextStep.pSetToRatio !== undefined) {
                        powerDelta += Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                    }
                    powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
                    const newPower = baseMovePower + powerDelta;

                    const descriptionParams: any = {
                        value: nextStep.prio,
                        newPower: newPower
                    };

                    upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, null,
                        i18next.t("moveUpgrade:description:priority:increaseNoAccuracy", descriptionParams) as string,
                        null, null, [new ConditionalPriorityAttr(priorityDelta)], [], 0, UpgradeCategory.POSITIVE_PRIORITY, upgradeTier));
                }
            }
        }
        if (shouldOfferUpgradeCategory(UpgradeCategory.NEGATIVE_PRIORITY) && !isStatusMove && baseMove.priority >= 0 && hasPower && !isMultiHit) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.NEGATIVE_PRIORITY);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.NEGATIVE_PRIORITY_PATH[tierIndex];

                if (nextStep) {
                    const priorityDelta = nextStep.prio - baseMove.priority;
                    const rawAccCost = nextStep.accCost || 0;
                    const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                    const cappedPBoost = MoveUpgrade.capPowerBoost(baseMovePower, nextStep.pBoost);
                    const newPower = baseMovePower + cappedPBoost;
                    const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);

                    const hasAccuracyCost = nextStep.accCost !== undefined && baseMoveAccuracy !== -1;
                    const descriptionKey = hasAccuracyCost ? "moveUpgrade:description:priority:decrease" : "moveUpgrade:description:priority:decreaseNoAccuracy";
                    const descriptionParams: any = {
                        value: nextStep.prio,
                        newPower: newPower
                    };
                    if (hasAccuracyCost) {
                        descriptionParams.newAccuracy = newAccuracy;
                    }

                    upgrades.push(moveGenerator.getType(moveId, cappedPBoost, null, null, accuracyDelta,
                        i18next.t(descriptionKey, descriptionParams) as string,
                        null, null, [new ConditionalPriorityAttr(priorityDelta)], [], 0, UpgradeCategory.NEGATIVE_PRIORITY, upgradeTier));
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.CRIT) && !isStatusMove && hasPower && !isMultiHit && !isCritOnly && !highCritAttr) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.CRIT);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.CRIT_PATH[tierIndex];

                if (nextStep) {
                    let powerDelta = 0;
                    if (nextStep.pSetToRatio !== undefined) {
                        powerDelta += Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                    }
                    powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);

                    const newPower = Math.round(baseMovePower + powerDelta);
                    const rawAccCost = nextStep.accCost || 0;
                    const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                    const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);

                    const hasAccuracyCost = nextStep.accCost !== undefined && baseMoveAccuracy !== -1;

                    if (nextStep.critOnly) {
                        const descriptionKey = hasAccuracyCost ? "moveUpgrade:description:crit:upgradeToCritOnly" : "moveUpgrade:description:crit:upgradeToCritOnlyNoAccuracy";
                        const descriptionParams: any = { newPower: newPower };
                        if (hasAccuracyCost) {
                            descriptionParams.newAccuracy = newAccuracy;
                        }

                        upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, accuracyDelta,
                            i18next.t(descriptionKey, descriptionParams) as string,
                            null, null, [new CritOnlyAttr()], [], 0, UpgradeCategory.CRIT, upgradeTier));
                    } else {
                        const descriptionKey = hasAccuracyCost ? "moveUpgrade:description:crit:increaseRatio" : "moveUpgrade:description:crit:increaseRatioNoAccuracy";
                        const descriptionParams: any = { newPower: newPower };
                        if (hasAccuracyCost) {
                            descriptionParams.newAccuracy = newAccuracy;
                        }

                        upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, accuracyDelta,
                            i18next.t(descriptionKey, descriptionParams) as string,
                            null, null, [new HighCritAttr()], [], 0, UpgradeCategory.CRIT, upgradeTier));
                    }
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.STAT_BOOST_SELF) && hasStatBoostSelf && selfBoostAttr && hasPower && !isMultiHit) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.STAT_BOOST_SELF);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.STAT_BOOST_SELF_PATH[tierIndex];

                if (nextStep) {
                    const currentStats = Array.isArray(selfBoostAttr.stats) ? selfBoostAttr.stats : [selfBoostAttr.stats];
                    const currentStatNames = currentStats.map(s => getBattleStatName(s)).join(" & ");
                    const chance = isStatusMove ? 100 : nextStep.chance;

                    let powerChange = 0;
                    if (nextStep.pSetToRatio !== undefined) {
                        powerChange = Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                    }
                    powerChange = MoveUpgrade.capPowerBoost(baseMovePower, powerChange);
                    const powerValueForDesc = Math.abs(powerChange);

                    const attributes: MoveAttr[] = [];

                    if (nextStep.stats === currentStats.length && nextStep.level >= selfBoostAttr.levels) {
                        attributes.push(new StatChangeAttr(selfBoostAttr.stats, nextStep.level, true));
                        if (nextStep.recoilCost !== undefined) {
                            attributes.push(new RecoilAttr(false, nextStep.recoilCost));
                        }

                        const hasExistingChance = baseMoveChance > 0;
                        const chanceIsChanging = hasExistingChance && chance !== baseMoveChance;
                        const chanceRemainsSame = hasExistingChance && chance === baseMoveChance;

                        let descriptionKey: string;
                        if (powerValueForDesc > 0) {
                            if (chanceIsChanging) {
                                descriptionKey = "moveUpgrade:description:stat:increaseRaiseSelfVsPowerEffectChanceBecomes";
                            } else if (chanceRemainsSame) {
                                descriptionKey = "moveUpgrade:description:stat:increaseRaiseSelfVsPowerSameChance";
                            } else {
                                descriptionKey = "moveUpgrade:description:stat:increaseRaiseSelfVsPower";
                            }
                        } else {
                            if (chanceIsChanging) {
                                descriptionKey = "moveUpgrade:description:stat:increaseRaiseSelfEffectChanceBecomes";
                            } else if (chanceRemainsSame) {
                                descriptionKey = "moveUpgrade:description:stat:increaseRaiseSelfSameChance";
                            } else {
                                descriptionKey = "moveUpgrade:description:stat:increaseRaiseSelf";
                            }
                        }

                        const descriptionParams: any = {
                            statName: currentStatNames,
                            stages: nextStep.level,
                            chance: chance,
                            powerValue: powerValueForDesc,
                            newPower: baseMovePower + powerChange
                        };
                        if (powerValueForDesc > 0) {
                            descriptionParams.powerValue = powerValueForDesc;
                        }
                        if (chanceRemainsSame && chance > 0) {
                            descriptionParams.chance = chance;
                        }
                        upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, 0,
                            i18next.t(descriptionKey, descriptionParams) as string, chance, null, attributes, [], 0, UpgradeCategory.STAT_BOOST_SELF, upgradeTier));
                    } else if (nextStep.stats > currentStats.length) {
                        const potentialNewStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]
                            .filter(s => !currentStats.includes(s));
                        const newStat = Utils.randSeedItem(potentialNewStats);
                        const newStatName = getBattleStatName(newStat);
                        const allStats = [...currentStats, newStat];

                        attributes.push(new StatChangeAttr(allStats, nextStep.level, true));
                        if (nextStep.recoilCost !== undefined) {
                            attributes.push(new RecoilAttr(false, nextStep.recoilCost));
                        }

                        const hasExistingChance = baseMoveChance > 0;
                        const chanceIsChanging = hasExistingChance && chance !== baseMoveChance;
                        const chanceRemainsSame = hasExistingChance && chance === baseMoveChance;

                        let descriptionKey: string;
                        if (powerValueForDesc > 0) {
                            if (chanceIsChanging) {
                                descriptionKey = "moveUpgrade:description:stat:addAnotherRaiseSelfVsPowerEffectChanceBecomes";
                            } else if (chanceRemainsSame) {
                                descriptionKey = "moveUpgrade:description:stat:addAnotherRaiseSelfVsPowerSameChance";
                            } else {
                                descriptionKey = "moveUpgrade:description:stat:addAnotherRaiseSelfVsPower";
                            }
                        } else {
                            if (chanceIsChanging) {
                                descriptionKey = "moveUpgrade:description:stat:addAnotherRaiseSelfEffectChanceBecomes";
                            } else if (chanceRemainsSame) {
                                descriptionKey = "moveUpgrade:description:stat:addAnotherRaiseSelfSameChance";
                            } else {
                                descriptionKey = "moveUpgrade:description:stat:addAnotherRaiseSelf";
                            }
                        }

                        const descriptionParams: any = {
                            existingStats: currentStatNames,
                            newStatName: newStatName,
                            stages: nextStep.level,
                            powerValue: powerValueForDesc,
                            newPower: baseMovePower + powerChange
                        };
                        if (powerValueForDesc > 0) {
                            descriptionParams.powerValue = powerValueForDesc;
                        }
                        if (chanceRemainsSame && chance > 0) {
                            descriptionParams.chance = chance;
                        }
                        upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, 0,
                            i18next.t(descriptionKey, descriptionParams) as string, chance, null, attributes, [], 0, UpgradeCategory.STAT_BOOST_SELF, upgradeTier));
                    }
                    }
                }
            } else if (shouldOfferUpgradeCategory(UpgradeCategory.STAT_BOOST_SELF) && !hasStatBoostSelf && hasPower && !isMultiHit && !isSelfTarget) {
                const upgradeTier = getNextUpgradeTier(UpgradeCategory.STAT_BOOST_SELF);

                if (upgradeTier !== null) {
                    const tierIndex = upgradeTier - 1;
                    const nextStep = this.STAT_BOOST_SELF_PATH[tierIndex];
                    if (nextStep) {
                        const stat = Utils.randSeedItem([BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]);
                        const statName = getBattleStatName(stat);
                        const chance = isStatusMove ? 100 : nextStep.chance;

                        let powerChange = 0;
                        if (nextStep.pSetToRatio !== undefined) {
                            powerChange = Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                        }
                        powerChange = MoveUpgrade.capPowerBoost(baseMovePower, powerChange);
                        const powerValueForDesc = Math.abs(powerChange);

                        const attributes: MoveAttr[] = [new StatChangeAttr(stat, nextStep.level, true)];
                        if (nextStep.recoilCost !== undefined) {
                            attributes.push(new RecoilAttr(false, nextStep.recoilCost));
                        }

                        const recoilCost = nextStep.recoilCost;
                        const hasExistingChance = baseMoveChance > 0;
                        const chanceIsChanging = hasExistingChance && chance !== baseMoveChance;
                        const chanceRemainsSame = hasExistingChance && chance === baseMoveChance;

                        let descriptionKey: string;
                        if (recoilCost) {
                            if (chanceIsChanging) {
                                descriptionKey = "moveUpgrade:description:stat:addRaiseSelfSingleWithRecoilEffectChanceBecomes";
                            } else if (chanceRemainsSame) {
                                descriptionKey = "moveUpgrade:description:stat:addRaiseSelfSingleWithRecoilSameChance";
                            } else {
                                descriptionKey = "moveUpgrade:description:stat:addRaiseSelfSingleWithRecoil";
                            }
                        } else {
                            if (chanceIsChanging) {
                                descriptionKey = "moveUpgrade:description:stat:addRaiseSelfSingleEffectChanceBecomes";
                            } else if (chanceRemainsSame) {
                                descriptionKey = "moveUpgrade:description:stat:addRaiseSelfSingleSameChance";
                            } else {
                                descriptionKey = "moveUpgrade:description:stat:addRaiseSelfSingle";
                            }
                        }

                        const descriptionParams: any = {
                            statName: statName,
                            stages: nextStep.level,
                            chance: chance,
                            powerValue: powerValueForDesc,
                            newPower: baseMovePower + powerChange
                        };
                        if (recoilCost) {
                            descriptionParams.recoilCost = recoilCost;
                        }
                        upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, 0,
                            i18next.t(descriptionKey, descriptionParams) as string, chance, null, attributes, [], 0, UpgradeCategory.STAT_BOOST_SELF, upgradeTier));
                    }
                }
            }

            if (shouldOfferUpgradeCategory(UpgradeCategory.STAT_LOWER_TARGET) && hasStatLowerTarget && targetLowerAttr && !isStatusMove && hasPower && !isMultiHit && !isSelfTarget) {
                const upgradeTier = getNextUpgradeTier(UpgradeCategory.STAT_LOWER_TARGET);

                if (upgradeTier !== null) {
                    const tierIndex = upgradeTier - 1;
                    const nextStep = this.STAT_LOWER_TARGET_PATH[tierIndex];

                    if (nextStep) {
                        const currentStats = Array.isArray(targetLowerAttr.stats) ? targetLowerAttr.stats : [targetLowerAttr.stats];
                        const currentStatNames = currentStats.map(s => getBattleStatName(s)).join(" & ");
                        let powerPenalty = 0;
                        if (nextStep.pSetToRatio !== undefined) {
                            powerPenalty = Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                        }
                        powerPenalty = MoveUpgrade.capPowerBoost(baseMovePower, powerPenalty);
                        const accPenalty = isStatusMove && baseMoveAccuracy !== -1 ? -nextStep.accCost : 0;
                        const newPower = baseMovePower + powerPenalty;
                        const newAccuracy = baseMoveAccuracy === -1 ? 100 : Math.max(50, baseMoveAccuracy + accPenalty);

                        if (nextStep.stats === currentStats.length && nextStep.level >= Math.abs(targetLowerAttr.levels)) {
                            const hasExistingChance = baseMoveChance > 0;
                            const chanceIsChanging = hasExistingChance && nextStep.chance !== baseMoveChance;
                            const chanceRemainsSame = hasExistingChance && nextStep.chance === baseMoveChance;

                            let descriptionKey: string;
                            if (accPenalty === 0) {
                                if (chanceIsChanging) {
                                    descriptionKey = "moveUpgrade:description:stat:increaseLowerTargetNoAccuracyEffectChanceBecomes";
                                } else if (chanceRemainsSame) {
                                    descriptionKey = "moveUpgrade:description:stat:increaseLowerTargetNoAccuracySameChance";
                                } else {
                                    descriptionKey = "moveUpgrade:description:stat:increaseLowerTargetNoAccuracyWithChance";
                                }
                            } else {
                                if (chanceIsChanging) {
                                    descriptionKey = "moveUpgrade:description:stat:increaseLowerTargetEffectChanceBecomes";
                                } else if (chanceRemainsSame) {
                                    descriptionKey = "moveUpgrade:description:stat:increaseLowerTargetSameChance";
                                } else {
                                    descriptionKey = "moveUpgrade:description:stat:increaseLowerTargetWithChance";
                                }
                            }
                            const descriptionParams: any = {
                                statName: currentStatNames,
                                stages: nextStep.level,
                                newPower: newPower
                            };
                            if (accPenalty !== 0) {
                                descriptionParams.newAccuracy = newAccuracy;
                            }
                            if (nextStep.chance > 0) {
                                descriptionParams.chance = nextStep.chance;
                            }
                            upgrades.push(moveGenerator.getType(moveId, powerPenalty, null, null, accPenalty,
                                i18next.t(descriptionKey, descriptionParams) as string, nextStep.chance, null, [new StatChangeAttr(targetLowerAttr.stats, -nextStep.level, false)], [], 0, UpgradeCategory.STAT_LOWER_TARGET, upgradeTier));
                        } else if (nextStep.stats > currentStats.length) {
                            const potentialNewStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]
                                .filter(s => !currentStats.includes(s));
                            const newStat = Utils.randSeedItem(potentialNewStats);
                            const newStatName = getBattleStatName(newStat);
                            const allStats = [...currentStats, newStat];

                            const hasExistingChance = baseMoveChance > 0;
                            const chanceIsChanging = hasExistingChance && nextStep.chance !== baseMoveChance;
                            const chanceRemainsSame = hasExistingChance && nextStep.chance === baseMoveChance;

                            let descriptionKey2: string;
                            if (accPenalty === 0) {
                                if (chanceIsChanging) {
                                    descriptionKey2 = "moveUpgrade:description:stat:addAnotherLowerTargetNoAccuracyEffectChanceBecomes";
                                } else if (chanceRemainsSame) {
                                    descriptionKey2 = "moveUpgrade:description:stat:addAnotherLowerTargetNoAccuracySameChance";
                                } else {
                                    descriptionKey2 = "moveUpgrade:description:stat:addAnotherLowerTargetNoAccuracyWithChance";
                                }
                            } else {
                                if (chanceIsChanging) {
                                    descriptionKey2 = "moveUpgrade:description:stat:addAnotherLowerTargetEffectChanceBecomes";
                                } else if (chanceRemainsSame) {
                                    descriptionKey2 = "moveUpgrade:description:stat:addAnotherLowerTargetSameChance";
                                } else {
                                    descriptionKey2 = "moveUpgrade:description:stat:addAnotherLowerTargetWithChance";
                                }
                            }
                            let descriptionParams2: any = {
                                existingStats: currentStatNames,
                                newStatName: newStatName,
                                stages: nextStep.level,
                                newPower: newPower
                            };
                            if (accPenalty !== 0) {
                                descriptionParams2.newAccuracy = newAccuracy;
                            }
                            if (nextStep.chance > 0) {
                                descriptionParams2.chance = nextStep.chance;
                            }
                            upgrades.push(moveGenerator.getType(moveId, powerPenalty, null, null, accPenalty,
                                i18next.t(descriptionKey2, descriptionParams2) as string, nextStep.chance, null, [new StatChangeAttr(allStats, -nextStep.level, false)], [], 0, UpgradeCategory.STAT_LOWER_TARGET, upgradeTier));
                        }
                    }
                }
            } else if (shouldOfferUpgradeCategory(UpgradeCategory.STAT_LOWER_TARGET) && !hasStatLowerTarget && !isStatusMove && hasPower && !selfLowerAttrs.length && !isMultiHit) {
                const upgradeTier = getNextUpgradeTier(UpgradeCategory.STAT_LOWER_TARGET);

                if (upgradeTier !== null) {
                    const tierIndex = upgradeTier - 1;
                    const nextStep = this.STAT_LOWER_TARGET_PATH[tierIndex];
                    if (nextStep) {
                        const stat = Utils.randSeedItem([BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]);
                        const statName = getBattleStatName(stat);
                        let powerPenalty = 0;
                        if (nextStep.pSetToRatio !== undefined) {
                            powerPenalty = Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                        }
                        powerPenalty = MoveUpgrade.capPowerBoost(baseMovePower, powerPenalty);
                        const accPenalty = isStatusMove && baseMoveAccuracy !== -1 ? -nextStep.accCost : 0;
                        const newPower = baseMovePower + powerPenalty;
                        const newAccuracy = baseMoveAccuracy === -1 ? 100 : Math.max(50, baseMoveAccuracy + accPenalty);

                        const hasExistingChance = baseMoveChance > 0;
                        const chanceIsChanging = hasExistingChance && nextStep.chance !== baseMoveChance;
                        const chanceRemainsSame = hasExistingChance && nextStep.chance === baseMoveChance;

                        let descriptionKey: string;
                        if (accPenalty === 0) {
                            if (chanceIsChanging) {
                                descriptionKey = "moveUpgrade:description:stat:addLowerTargetSingleNoAccuracyEffectChanceBecomes";
                            } else if (chanceRemainsSame) {
                                descriptionKey = "moveUpgrade:description:stat:addLowerTargetSingleNoAccuracySameChance";
                            } else {
                                descriptionKey = "moveUpgrade:description:stat:addLowerTargetSingleNoAccuracyWithChance";
                            }
                        } else {
                            if (chanceIsChanging) {
                                descriptionKey = "moveUpgrade:description:stat:addLowerTargetSingleEffectChanceBecomes";
                            } else if (chanceRemainsSame) {
                                descriptionKey = "moveUpgrade:description:stat:addLowerTargetSingleSameChance";
                            } else {
                                descriptionKey = "moveUpgrade:description:stat:addLowerTargetSingleWithChance";
                            }
                        }
                        const descriptionParams: any = {
                            statName: statName,
                            stages: nextStep.level,
                            newPower: newPower
                        };
                        if (accPenalty !== 0) {
                            descriptionParams.newAccuracy = newAccuracy;
                        }
                        if (nextStep.chance > 0) {
                            descriptionParams.chance = nextStep.chance;
                        }

                        upgrades.push(moveGenerator.getType(moveId, powerPenalty, null, null, accPenalty,
                            i18next.t(descriptionKey, descriptionParams) as string, nextStep.chance, null, [new StatChangeAttr(stat, -nextStep.level, false)], [], 0, UpgradeCategory.STAT_LOWER_TARGET, upgradeTier));
                    }
                }
            }

            if (!hasPathlessUpgrade && !isStatusMove && baseMove.type !== Type.GROUND && !baseMove.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.IGNORE_FLYING) && hasPower && isPathlessVeryRare) {
                    let attributes: MoveAttr[] = [];

                    attributes = [new AddBattlerTagAttr(BattlerTagType.IGNORE_FLYING), new RemoveBattlerTagAttr([BattlerTagType.FLYING, BattlerTagType.MAGNET_RISEN])];

                    upgrades.push(moveGenerator.getType(moveId, 5, null, null, 0,
                        i18next.t("moveUpgrade:description:misc:addGrounding"), null, null, attributes, [], 0));
            }

            if (!hasPathlessUpgrade && isStatusMove && !isMultiHit && isPathlessVeryRare) {
                if (!baseMove.hasAttr(WeatherChangeAttr) && !baseMove.hasAttr(ClearWeatherAttr)) {
                    const weather = Utils.randSeedItem([WeatherType.SUNNY, WeatherType.RAIN, WeatherType.SANDSTORM, WeatherType.SNOW]);
                    upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                        "WEATHER_CHANGE_PATH 0: " + i18next.t("moveUpgrade:description:statusSpecific:setWeather", { weather: getWeatherName(weather) }),
                        null, null, [new WeatherChangeAttr(weather)]));
                    upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                        "CLEAR_WEATHER_PATH 0: " + i18next.t("moveUpgrade:description:statusSpecific:clearWeather"),
                        null, null, [new ClearWeatherAttr(WeatherType.NONE)]));
                }

                if (!baseMove.hasAttr(TerrainChangeAttr) && !baseMove.hasAttr(ClearTerrainAttr)) {
                    const terrain = Utils.randSeedItem([TerrainType.ELECTRIC, TerrainType.GRASSY, TerrainType.MISTY, TerrainType.PSYCHIC]);
                    upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                        "TERRAIN_CHANGE_PATH 0: " + i18next.t("moveUpgrade:description:statusSpecific:setTerrain", { terrain: getTerrainName(terrain) }),
                        null, null, [new TerrainChangeAttr(terrain)]));
                    upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                        "CLEAR_TERRAIN_PATH 0: " + i18next.t("moveUpgrade:description:statusSpecific:clearTerrain"),
                        null, null, [new ClearTerrainAttr()]));
                }

                if (!baseMove.hasAttr(AddArenaTrapTagAttr)) {
                    const hazard = Utils.randSeedItem([ArenaTagType.STEALTH_ROCK, ArenaTagType.SPIKES, ArenaTagType.TOXIC_SPIKES, ArenaTagType.STICKY_WEB]);
                    const arenaTrapAccDelta = baseMoveAccuracy === -1 ? 0 : -10;
                    upgrades.push(moveGenerator.getType(moveId, 0, null, null, arenaTrapAccDelta,
                        "ARENA_TRAP_PATH 0: " + i18next.t("moveUpgrade:description:statusSpecific:addArenaTrap", { trapName: getHazardName(hazard) }),
                        null, null, [new AddArenaTrapTagUpgradeAttr(hazard, null, false, !isPlayer)]));
                }
            }

            if (shouldOfferUpgradeCategory(UpgradeCategory.POWER) && hasPower && !isStatusMove && !isMultiHit && upgradeMovePower < 180) {
                const upgradeTier = getNextUpgradeTier(UpgradeCategory.POWER);

                if (upgradeTier !== null) {
                    const tierIndex = upgradeTier - 1;
                    const nextStep = this.POWER_PATH[tierIndex];

                    if (nextStep) {
                        const chanceToSet = nextStep.setExistingChanceTo || null;
                        const cappedPBoost = MoveUpgrade.capPowerBoost(baseMovePower, nextStep.pBoost);
                        const newPower = baseMovePower + cappedPBoost;
                    const effectiveAccCost = baseMoveAccuracy === -1 ? 0 : nextStep.accCost;
                    const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy - effectiveAccCost);
                    const descriptionKey = effectiveAccCost > 0 ? "moveUpgrade:description:power:increaseVsAccuracy" : "moveUpgrade:description:power:increaseOnly";
                    const descriptionParams: any = {
                        newPower: newPower,
                        powerValue: cappedPBoost
                    };
                    if (effectiveAccCost > 0) {
                        descriptionParams.newAccuracy = newAccuracy;
                    }
                    upgrades.push(moveGenerator.getType(moveId, cappedPBoost, null, null, -effectiveAccCost,
                        i18next.t(descriptionKey, descriptionParams) as unknown as string, chanceToSet, null, [], [], 0, UpgradeCategory.POWER, upgradeTier));
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.ACCURACY) && hasAccuracy && upgradeMoveAccuracy < 100 && !isStatusMove && hasPower) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.ACCURACY);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.ACCURACY_PATH[tierIndex];

                if (nextStep) {
                    const existingAccuracyUpgrade: any = getExistingUpgrades().find(u => (u as any).upgradeCategory === UpgradeCategory.ACCURACY);
                    const existingAccBoost = existingAccuracyUpgrade ? (existingAccuracyUpgrade as any).accuracyBoost || 0 : 0;
                    const baseAccNoCategory = upgradeMoveAccuracy - existingAccBoost;
                    const accDelta = Math.min(nextStep.accBoost, Math.max(0, 100 - baseAccNoCategory));
                    const descKey = "moveUpgrade:description:accuracy:increaseVsPower";
                    const newPower = baseMovePower - nextStep.pCost;
                    const newAccuracy = baseAccNoCategory + accDelta;
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, accDelta,
                        i18next.t(descKey, { newAccuracy: newAccuracy, newPower: newPower }), null, null, [], [], 0, UpgradeCategory.ACCURACY, upgradeTier));
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.RECOIL_ADD) && !isStatusMove && hasPower && !isMultiHit && !hasRecoil) {
                const upgradeTier = getNextUpgradeTier(UpgradeCategory.RECOIL_ADD);
                if (upgradeTier !== null) {
                    const tierIndex = upgradeTier - 1;
                    const nextStep = this.RECOIL_ADD_PATH[tierIndex];
                    if (nextStep) {
                        const cappedPBoost = MoveUpgrade.capPowerBoost(baseMovePower, nextStep.pBoost);
                        const newPower = baseMovePower + cappedPBoost;
                        const rawAccCost = nextStep.accCost || 0;
                        const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                        const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);
                        const hasAccuracyCostForDesc = rawAccCost > 0 && baseMoveAccuracy !== -1;
                        const descriptionKey = hasAccuracyCostForDesc ? "moveUpgrade:description:recoil:addVsPower" : "moveUpgrade:description:recoil:addVsPowerOnly";
                        const descriptionParams: any = {
                            percent: Math.round(nextStep.ratio * 100),
                            newPower: newPower
                        };
                        if (hasAccuracyCostForDesc) {
                            descriptionParams.newAccuracy = newAccuracy;
                        }
                        upgrades.push(moveGenerator.getType(moveId, cappedPBoost, null, null, accuracyDelta,
                            i18next.t(descriptionKey, descriptionParams) as string, null, null, [new RecoilAttr(false, nextStep.ratio)], [], 0, UpgradeCategory.RECOIL_ADD, upgradeTier));
                    }
                }
        }
        if (shouldOfferUpgradeCategory(UpgradeCategory.RECOIL_DECREASE) && !isStatusMove && hasPower && !isMultiHit && recoilAttr) {
                const decreaseUpgradeTier = getNextUpgradeTier(UpgradeCategory.RECOIL_DECREASE);

                if (decreaseUpgradeTier !== null) {
                    const tierIndex = decreaseUpgradeTier - 1;
                    const nextDecreaseStep = this.RECOIL_DECREASE_PATH[tierIndex];
                    if (nextDecreaseStep) {
                        const newPower = baseMovePower - nextDecreaseStep.pCost;
                        const rawAccCost = nextDecreaseStep.accCost || 0;
                        const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                        const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);

                        const hasAccuracyCost = nextDecreaseStep.accCost !== undefined && baseMoveAccuracy !== -1;
                        const descKey = nextDecreaseStep.ratio === 0 ?
                            (hasAccuracyCost ? "moveUpgrade:description:recoil:removeVsPower" : "moveUpgrade:description:recoil:removeVsPowerNoAccuracy") :
                            (hasAccuracyCost ? "moveUpgrade:description:recoil:decreaseVsPower" : "moveUpgrade:description:recoil:decreaseVsPowerNoAccuracy");

                        const descriptionParams: any = {
                            percent: Math.round(nextDecreaseStep.ratio * 100),
                            newPower: newPower
                        };
                        if (hasAccuracyCost) {
                            descriptionParams.newAccuracy = newAccuracy;
                        }

                        upgrades.push(moveGenerator.getType(moveId, -nextDecreaseStep.pCost, null, null, accuracyDelta,
                            i18next.t(descKey, descriptionParams) as string, null, null, [new RecoilAttr(false, nextDecreaseStep.ratio)], [], 0, UpgradeCategory.RECOIL_DECREASE, decreaseUpgradeTier));
                    }
                }
            }

        if (shouldOfferUpgradeCategory(UpgradeCategory.HIT_HEAL) && !isStatusMove && hasPower && !isMultiHit && !hitHealAttr) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.HIT_HEAL);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.HIT_HEAL_PATH[tierIndex];

                if (nextStep) {
                    const currentRatio = hitHealAttr?.healRatio || 0;
                    const descKey = currentRatio === 0 ? "moveUpgrade:description:heal:addHitHealVsPower" : "moveUpgrade:description:heal:increaseHitHealVsPower";

                    let powerDelta = 0;
                    if (nextStep.pSetToRatio !== undefined) {
                        powerDelta += Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                    }
                    powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
                    const newPower = baseMovePower + powerDelta;

                    upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, 0,
                        i18next.t(descKey, {
                            percent: Math.round(nextStep.ratio * 100), newPower: newPower
                        }), null, null, [new HitHealAttr(nextStep.ratio)], [], 0, UpgradeCategory.HIT_HEAL, upgradeTier));
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.EFFECT_CHANCE) && hasSecondaryEffect && baseMoveChance < 100 && !isStatusMove && hasPower && !isMultiHit && !selfLowerAttrs.length && (!hasFlinch || (hasFlinch && upgradeMove.chance < 30))) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.EFFECT_CHANCE);

            if (upgradeTier !== null) {
                const tierIndex = getEffectChanceTierIndex(baseMoveChance, upgradeTier);
                const nextStep = tierIndex < this.EFFECT_CHANCE_PATH.length ? this.EFFECT_CHANCE_PATH[tierIndex] : null;

                if (nextStep) {
                    let powerDelta = 0;
                    if (nextStep.pSetToRatio !== undefined) {
                        powerDelta += Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                    }
                    powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);

                    const newPower = baseMovePower + powerDelta;

                    const descriptionKey =  "moveUpgrade:description:effectChance:increaseToValueVsPowerNoAccuracy";
                    const descriptionParams: any = {
                        value: nextStep.chance,
                        newPower: newPower
                    };

                    upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, null,
                        i18next.t(descriptionKey, descriptionParams) as string, nextStep.chance, null, carriedEffectChanceAttrs as any, carriedEffectChanceConditions as any, 0, UpgradeCategory.EFFECT_CHANCE, upgradeTier));
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.EFFECT_CHANCE) && hasPower && !isStatusMove && !hasSecondaryEffect && !isMultiHit && !selfLowerAttrs.length) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.EFFECT_CHANCE);

            if (upgradeTier !== null) {
                const tierIndex = getEffectChanceTierIndex(baseMoveChance, upgradeTier);
                const nextStep = tierIndex < this.EFFECT_CHANCE_PATH.length ? this.EFFECT_CHANCE_PATH[tierIndex] : null;

                if (nextStep) {
                    const { chance } = nextStep;

                    let powerDelta = 0;
                    let newPower = 0;
                    if (nextStep.pSetToRatio !== undefined) {
                        newPower = Math.round(baseMovePower * nextStep.pSetToRatio);
                        powerDelta += newPower - baseMovePower;
                    }
                    powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);

                    let status = isVeryRare ? Utils.randSeedItem([StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON]) : Utils.randSeedItem([StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.SLEEP, StatusEffect.FREEZE, StatusEffect.TOXIC]);
                    const addables = isVeryRare ? [
                        { attr: [new FlinchAttr()], desc: "moveUpgrade:description:flinch:addChanceVsPower" },
                        { attr: [new ConfuseAttr()], desc: "moveUpgrade:description:confusion:addChanceVsPower" },
                        { attr: [new AddBattlerTagAttr(BattlerTagType.SEEDED)], desc: "moveUpgrade:description:status:addLeechSeedVsPower" },
                        { attr: [new AddBattlerTagAttr(BattlerTagType.CURSED)], desc: "moveUpgrade:description:curse:addChanceVsPower" },
                        { attr: [new StatusEffectAttr(status)], desc: "moveUpgrade:description:status:addChanceVsPower" }
                    ] : [
                        { attr: [new StatusEffectAttr(status)], desc: "moveUpgrade:description:status:addChanceVsPower" }
                    ];
                    const chosen = Utils.randSeedItem(addables);

                    upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, 0,
                        i18next.t(chosen.desc, {
                            chance, powerValue: newPower, statusName: getStatusEffectName(status)
                        }), chance, null, [...carriedEffectChanceAttrs, ...chosen.attr] as any, carriedEffectChanceConditions as any, 0, UpgradeCategory.EFFECT_CHANCE, upgradeTier));
                }
        }
        }

        function getMultiHitDescription(type: MultiHitType): string {
            switch (type) {
                case MultiHitType._2: return '2';
                case MultiHitType._2_TO_5: return '2-5';
                case MultiHitType._3: return '3';
                case MultiHitType._4_TO_8: return '4-8';
                default: return 'Unknown';
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.MULTI_HIT) && !isStatusMove && hasPower && !isMultiHit) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.MULTI_HIT);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.MULTI_HIT_PATH[tierIndex];

                if (nextStep) {
                    const powerChange = -baseMovePower + nextStep.pSet;
                    const flags = nextStep.checkAll ? [MoveFlags.CHECK_ALL_HITS] : [];
                    const currentType = multiHitAttr?.getMultiHitType;
                    const descKey = !currentType ?
                        (nextStep.checkAll ? "moveUpgrade:description:multiHit:addWithCheckAll" : "moveUpgrade:description:multiHit:addNoCheckAll") :
                        (nextStep.checkAll ? "moveUpgrade:description:multiHit:changeWithCheckAll" : "moveUpgrade:description:multiHit:changeNoCheckAll");

                    const hitsDescription = getMultiHitDescription(nextStep.typeId);
                    const rawAccCost = nextStep.accCost || 0;
                    const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                    const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);
                    const descriptionParams: any = {
                        hits: hitsDescription,
                        newPower: nextStep.pSet,
                        chance: nextStep.chance || 100
                    };
                    if (baseMoveAccuracy !== -1) {
                        descriptionParams.accuracyCost = newAccuracy;
                    }

                    let attr: MoveAttr | null = null;
                    if(nextStep.typeId === "2") {
                        attr = new MultiHitAttr(MultiHitType._2);
                    } else if(nextStep.typeId === "2-5") {
                        attr = new MultiHitAttr(MultiHitType._2_TO_5);
                    } else if(nextStep.typeId === "3") {
                        attr = new MultiHitAttr(MultiHitType._3);
                    } else if(nextStep.typeId === "4-8") {
                        attr = new MultiHitAttr(MultiHitType._4_TO_8);
                    }

                    upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, accuracyDelta,
                        i18next.t(descKey, descriptionParams) as string, nextStep.chance, null, [attr], [], 0, UpgradeCategory.MULTI_HIT, upgradeTier));
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.ITEM_INTERACTION) && isPhysicalMove && !isStatusMove && hasPower && !isSelfTarget && isRare) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.ITEM_INTERACTION);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.ITEM_INTERACTION_PATH[tierIndex];

                if (nextStep) {
                    let powerDelta = nextStep.pBoost || 0;
                    if (nextStep.pCost !== undefined) {
                        powerDelta -= nextStep.pCost;
                    }
                    if (nextStep.pSetToRatio !== undefined) {
                        powerDelta += Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                    }
                    powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);
                    const newPower = baseMovePower + powerDelta;

                    if (nextStep.type === 'remove') {
                        upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, 0,
                            i18next.t("moveUpgrade:description:misc:addRemoveItem", { newPower: newPower }), null, null, [new RemoveHeldItemAttr(false)], [], 0, UpgradeCategory.ITEM_INTERACTION, upgradeTier));
                    } else if (nextStep.type === 'steal') {
                        const descKey = nextStep.chance === 100 ? "moveUpgrade:description:misc:addStealItemGuaranteed" : "moveUpgrade:description:misc:addStealItemChance";
                        upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, 0,
                            i18next.t(descKey, { chance: nextStep.chance, newPower: newPower }), null, null, [new StealHeldItemChanceAttr(nextStep.chance / 100)], [], 0, UpgradeCategory.ITEM_INTERACTION, upgradeTier));
                    }
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.SACRIFICIAL) && !isStatusMove && !isMultiHit && hasPower && baseMove.id !== Moves.STRUGGLE && baseMovePower < 70) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.SACRIFICIAL);

            if (upgradeTier !== null && (upgradeTier > 1 || isRare)) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.SACRIFICIAL_PATH[tierIndex];

                if (nextStep && baseMovePower < nextStep.pSet) {
                    const powerChange = nextStep.pSet - baseMovePower;
                    const rawAccCost = nextStep.accCost || 0;
                    const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                    const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);

                    let descriptionKey = nextStep.desc;
                    if (!nextStep.accCost || baseMoveAccuracy === -1) {
                        descriptionKey = nextStep.desc.replace(":addHalf", ":addHalfNoAccuracy")
                                                    .replace(":upgradeFull", ":upgradeFullNoAccuracy")
                                                    .replace(":upgradeOnHit", ":upgradeOnHitNoAccuracy");
                    }

                    const descriptionParams: any = { power: nextStep.pSet };
                    if (nextStep.accCost && baseMoveAccuracy !== -1) {
                        descriptionParams.newAccuracy = newAccuracy;
                    }

                    let attr: MoveAttr | null = null;
                    if(nextStep.attrId === "Half") {
                        attr = new HalfSacrificialAttr(false);
                    }
                    else if (nextStep.attrId === "Full") {
                        attr = new SacrificialAttr();
                    } else if (nextStep.attrId === "FullOnHit") {
                        attr = new SacrificialAttrOnHit();
                    }

                    upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, accuracyDelta,
                        i18next.t(descriptionKey, descriptionParams) as string, null, null, [attr], [], 0, UpgradeCategory.SACRIFICIAL, upgradeTier));
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.CHARGE_MOVE) && !isStatusMove && !isMultiHit && hasPower && baseMovePower <= 100 && !selfLowerAttrs.length) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.CHARGE_MOVE);

            if (upgradeTier !== null && (upgradeTier > 1 || isRare)) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.CHARGE_MOVE_PATH[tierIndex];

                if (nextStep) {
                    const chargeAnim = isPhysicalMove ? ChargeAnim.SKULL_BASH_CHARGING : ChargeAnim.SOLAR_BEAM_CHARGING;
                    const chargeTextKey = isPhysicalMove ? "moveUpgrade:moveTriggers:loweredItsHead" : "moveUpgrade:moveTriggers:tookInSunlight";
                    const chargeText = i18next.t(chargeTextKey, { pokemonName: "{USER}" });
                    let attrs: MoveAttr[] = [new ChargeAttr(chargeAnim, chargeText, null, !!nextStep.addBoost)];

                    if (nextStep.addBoost) {
                        attrs.push(new StatChangeAttr(BattleStat.DEF, 1, true));
                    }

                    const powerChange = nextStep.addBoost ? -10 : nextStep.pBoost;
                    const newPower = baseMovePower + powerChange;
                    const rawAccCost = nextStep.accCost || 0;
                    const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                    const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);
                    const descriptionParams: any = {
                        newPower: newPower,
                        statName: getBattleStatName(BattleStat.DEF),
                        stages: 1,
                        newAccuracy: baseMoveAccuracy === -1 ? undefined : newAccuracy
                    };
                    upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, accuracyDelta,
                        i18next.t(nextStep.desc, descriptionParams) as string, null, null, attrs, [], 0, UpgradeCategory.CHARGE_MOVE, upgradeTier));
                }
            }
        }

        if(!hasPathlessUpgrade && isPathlessRare) {

        if (isPhysicalMove) {
            upgrades.push(moveGenerator.getType(moveId, 0, null, MoveCategory.SPECIAL, 0,
                i18next.t("moveUpgrade:description:category:changeToSpecial"), null, null, [], [], 0, undefined));
        } else if (isSpecialMove) {
            upgrades.push(moveGenerator.getType(moveId, 0, null, MoveCategory.PHYSICAL, 0,
                i18next.t("moveUpgrade:description:category:changeToPhysical"), null, null, [], [], 0, undefined));
        }

        if (!isStatusMove) {
            if (!baseMove.hasAttr(MatchUserTypeAttr) && !baseMove.hasAttr(WeatherBallTypeAttr) &&
                !baseMove.hasAttr(TerrainPulseTypeAttr) && !baseMove.hasAttr(HiddenPowerTypeAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:type:matchUserType"),
                    null, null, [new MatchUserTypeAttr()], [], 0, undefined));
            }

            if (isPathlessVeryRare && !baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(MatchUserTypeAttr) &&
                !baseMove.hasAttr(TerrainPulseTypeAttr) && !baseMove.hasAttr(HiddenPowerTypeAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:type:weatherBall"),
                    null, null, [new WeatherBallTypeAttr()], [], 0, undefined));
            }

            if (isPathlessVeryRare && !baseMove.hasAttr(TerrainPulseTypeAttr) && !baseMove.hasAttr(MatchUserTypeAttr) &&
                !baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(HiddenPowerTypeAttr) && baseMove.type !== Type.NORMAL) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:type:terrainPulse"),
                    null, null, [new TerrainPulseTypeAttr()], [], 0, undefined));
            }

            if (isPathlessVeryRare && !baseMove.hasAttr(HiddenPowerTypeAttr) && !baseMove.hasAttr(MatchUserTypeAttr) &&
                !baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(TerrainPulseTypeAttr) && baseMove.type !== Type.NORMAL) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:type:hiddenPower"),
                    null, null, [new HiddenPowerTypeAttr()], [], 0, undefined));
            }

            if (!baseMove.hasAttr(TypelessAttr) && !baseMove.hasAttr(MatchUserTypeAttr) &&
                !baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(TerrainPulseTypeAttr) &&
                !baseMove.hasAttr(HiddenPowerTypeAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:type:becomeTypeless", { powerValue: 10 }),
                    null, null, [new TypelessAttr()], [], 0, undefined));
            }

            if (!baseMove.hasAttr(AnyTypeSuperEffectTypeMultiplierAttr)) {
                const targetType = Utils.randSeedItem(Object.values(Type).filter(t => typeof t === "number" && t > Type.UNKNOWN && t < Type.STELLAR) as Type[]);
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:type:superEffectiveVsType", { targetTypeName: getTypeName(targetType) }),
                    null, null, [new AnyTypeSuperEffectTypeMultiplierAttr(targetType)], [], 0, undefined));
            }

            upgrades.push(...getRandomTypeChangeOptions(filterUpgrades?.types));
        }

        if (isPathlessVeryRare && !isStatusMove && !hitHealAttr && hasPower) {
            const healOverTime = Utils.randSeedItem([BattlerTagType.AQUA_RING, BattlerTagType.INGRAIN]);
            upgrades.push(moveGenerator.getType(moveId, -25, null, null, 0,
                i18next.t(`moveUpgrade:description:heal:add${healOverTime}VsPower`, { powerValue: 25 }),
                null, null, [new AddBattlerTagAttr(healOverTime, true, true)], [], 0, undefined));
        }

        if (isPathlessVeryRare && isStatusMove && !healAttr && !hitHealAttr) {
            const passiveHeal = Utils.randSeedItem([
                { attr: new PlantHealAttr(), desc: "moveUpgrade:description:heal:addPlantHeal" },
                { attr: new SandHealAttr(), desc: "moveUpgrade:description:heal:addSandHeal" }
            ]);
            upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                i18next.t(passiveHeal.desc), null, null, [passiveHeal.attr], [], 0, undefined));
        }

        if (isPathlessVeryRare && hasPower && !isStatusMove && upgradeMovePower <= 95) {
            if (!baseMove.hasAttr(GyroBallPowerAttr) && !baseMove.hasAttr(ElectroBallPowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addSpeedPowerSlower"),
                    null, null, [new GyroBallPowerAttr()], [], 0, undefined));
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addSpeedPowerFaster"),
                    null, null, [new ElectroBallPowerAttr()], [], 0, undefined));
            }

            if (!baseMove.hasAttr(WeightPowerAttr) && !baseMove.hasAttr(CompareWeightPowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addWeightPowerTarget"),
                    null, null, [new WeightPowerAttr()], [], 0, undefined));
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addWeightPowerCompare"),
                    null, null, [new CompareWeightPowerAttr()], [], 0, undefined));
            }

            if (baseMovePower <= 80 && !baseMove.hasAttr(HpPowerAttr) && !baseMove.hasAttr(LowHpPowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addHpPowerHighHp"),
                    null, null, [new HpPowerAttr()], [], 0, undefined));
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addHpPowerLowHp"),
                    null, null, [new LowHpPowerAttr()], [], 0, undefined));
            }

            if (baseMovePower <= 60 && !baseMove.hasAttr(ConsecutiveUseDoublePowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:powerBoostConsecutive"),
                    null, null, [new ConsecutiveUseDoublePowerAttr(2, true)], [], 0, undefined));
            }

            if (baseMovePower <= 80 && !baseMove.hasAttr(TurnDamagedDoublePowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:powerBoostTurnDamaged"),
                    null, null, [new TurnDamagedDoublePowerAttr()], [], 0, undefined));
            }
        }

        if (isPathlessVeryRare && !isStatusMove && upgradeMovePower <= 60 && !baseMove.hasAttr(WeatherPowerBoostAttr) && hasPower) {
            const weather = Utils.randSeedItem([WeatherType.SUNNY, WeatherType.RAIN, WeatherType.SANDSTORM, WeatherType.SNOW]);
            const weatherName = getWeatherName(weather);
            upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                i18next.t("moveUpgrade:description:misc:powerBoostWeather", { weatherName }),
                null, null, [new WeatherPowerBoostAttr(weather)], [], 0, undefined));
        }

        if (isPathlessVeryRare && !isStatusMove && upgradeMovePower <= 60 && !baseMove.hasAttr(TerrainPowerBoostAttr) && hasPower) {
            const terrain = Utils.randSeedItem([TerrainType.ELECTRIC, TerrainType.GRASSY, TerrainType.MISTY, TerrainType.PSYCHIC]);
            const terrainName = getTerrainName(terrain);
            upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                i18next.t("moveUpgrade:description:misc:powerBoostTerrain", { terrainName }),
                null, null, [new TerrainPowerBoostAttr(terrain)], [], 0, undefined));
        }

        if (upgradeMove.priority <= 0 && !isStatusMove && !upgradeMove.hasAttr(TerrainMovePriorityAttr) && !upgradeMove.hasAttr(FirstTurnPriorityAttr) && hasPower) {
            const terrain = Utils.randSeedItem([TerrainType.GRASSY, TerrainType.ELECTRIC]);
            upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0,
                i18next.t("moveUpgrade:description:priority:conditionalTerrain", {
                    terrain: getTerrainName(terrain), value: 1, powerValue: 10
                }), null, null, [new TerrainMovePriorityAttr(terrain, 1)], [], 0, undefined));
            upgrades.push(moveGenerator.getType(moveId, 20, null, null, 0,
                i18next.t("moveUpgrade:description:priority:conditionalFirstTurn", { value: 2, powerValue: 20 }),
                null, null, [new FirstTurnPriorityAttr(2)], [new FirstMoveCondition()], 0, undefined));
        }
            if (!baseMove.hasAttr(ForceSwitchOutAttr) && !isMultiHit) {
                upgrades.push(moveGenerator.getType(moveId, -25, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addSwitchOut", { powerValue: 25 }),
                    null, null, [new ForceSwitchOutAttr(true)], [], 0, undefined));
            }

            if (isPathlessVeryRare && !baseMove.hasAttr(SurviveDamageAttr) && hasPower) {
                upgrades.push(moveGenerator.getType(moveId, 25, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addSurviveDamage", { powerValue: 25 }),
                    null, null, [new SurviveDamageAttr()], [], 0, undefined));
            }

            if (isPathlessVeryRare && !baseMove.hasAttr(TrapAttr) && !isSelfTarget) {
                const trapType = Utils.randSeedItem([BattlerTagType.BIND, BattlerTagType.WRAP, BattlerTagType.FIRE_SPIN, BattlerTagType.WHIRLPOOL]);
                upgrades.push(moveGenerator.getType(moveId, -25, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:addTrap", { trapName: getTrapName(trapType), powerValue: 25 }),
                    null, null, [new TrapAttr(trapType)], [], 0, undefined));
            }

            if (isPathlessVeryRare && !baseMove.hasAttr(FixedDamageAttr) && !baseMove.hasAttr(LevelDamageAttr) &&
                !baseMove.hasAttr(TargetHalfHpDamageAttr) && !baseMove.hasAttr(RandomLevelDamageAttr) && !isStatusMove) {
                upgrades.push(moveGenerator.getType(moveId, -baseMovePower + 40, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:fixedDamageValue", { value: 40 }),
                    null, null, [new FixedDamageAttr(40)], [], 0, undefined));
                upgrades.push(moveGenerator.getType(moveId, -baseMovePower, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:fixedDamageLevel"),
                    null, null, [new LevelDamageAttr()], [], 0, undefined));
                upgrades.push(moveGenerator.getType(moveId, -baseMovePower, null, null, 0,
                    i18next.t("moveUpgrade:description:misc:fixedDamageTargetHalfHp"),
                    null, null, [new TargetHalfHpDamageAttr()], [], 0, undefined));
            }
        }

        if(!hasPathlessUpgrade && isPathlessVeryRare) {
             const allFlags = [
            { flag: MoveFlags.IGNORE_ABILITIES, pBoost: 5, desc: "moveUpgrade:description:flags:ignoreAbilities" },
            { flag: MoveFlags.SOUND_BASED, pBoost: 5, desc: "moveUpgrade:description:flags:soundBased" },
            { flag: MoveFlags.PUNCHING_MOVE, pBoost: 5, desc: "moveUpgrade:description:flags:punchingMove", req: isPhysicalMove },
            { flag: MoveFlags.SLICING_MOVE, pBoost: 5, desc: "moveUpgrade:description:flags:slicingMove" },
            { flag: MoveFlags.BITING_MOVE, pBoost: 5, desc: "moveUpgrade:description:flags:bitingMove", req: isPhysicalMove },
            { flag: MoveFlags.PULSE_MOVE, pBoost: 5, desc: "moveUpgrade:description:flags:pulseMove", req: isSpecialMove },
            { flag: MoveFlags.WIND_MOVE, pBoost: 5, desc: "moveUpgrade:description:flags:windMove" },
            { flag: MoveFlags.BALLBOMB_MOVE, pBoost: 5, desc: "moveUpgrade:description:flags:ballBombMove" },
            { flag: MoveFlags.POWDER_MOVE, pBoost: 5, desc: "moveUpgrade:description:flags:powderMove" },
            { flag: MoveFlags.DANCE_MOVE, pBoost: 5, desc: "moveUpgrade:description:flags:danceMove" },
        ];

            if (!isStatusMove && hasPower) {
                for (const util of allFlags) {
                    if ((util.req === undefined || util.req) && !baseMove.hasFlag(util.flag)) {
                        upgrades.push(moveGenerator.getType(moveId, util.pBoost, null, null, 0,
                            i18next.t(util.desc, { powerValue: util.pBoost }),
                            null, null, [], [], util.flag, undefined));
                    }
                }
            }

            if (!isStatusMove && hasPower) {
                if (!baseMove.hasFlag(MoveFlags.IGNORE_PROTECT)) {
                    upgrades.push(moveGenerator.getType(moveId, -5, null, null, 0,
                        i18next.t("moveUpgrade:description:flags:ignoreProtect", { powerValue: 5 }),
                        null, null, [], [], MoveFlags.IGNORE_PROTECT, undefined));
                }

                if (hasContact) {
                    upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0,
                        i18next.t("moveUpgrade:description:flags:disableContact", { powerValue: 10 }),
                        null, null, [], [], MoveFlags.MAKES_CONTACT, undefined));
                } else {
                    upgrades.push(moveGenerator.getType(moveId, -10, null, null, 0,
                        i18next.t("moveUpgrade:description:flags:enableContact", { powerValue: 10 }),
                        null, null, [], [], MoveFlags.MAKES_CONTACT, undefined));
                }

                if (!baseMove.hasAttr(IgnoreOpponentStatChangesAttr)) {
                    upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0,
                        i18next.t("moveUpgrade:description:flags:ignoreStatChanges", { powerValue: 10 }),
                        null, null, [new IgnoreOpponentStatChangesAttr()], [], 0, undefined));
                }

                if (!baseMove.hasAttr(RemoveScreensAttr)) {
                    upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0,
                        i18next.t("moveUpgrade:description:flags:removeScreens", { powerValue: 10 }),
                        null, null, [new RemoveScreensAttr(false)], [], 0, undefined));
                }
            }
        }

        let statusChance = 5;
        const currentStatusAttr = statusEffectAttrs[0] as StatusEffectAttr | undefined;
        const currentStatus = currentStatusAttr?.effect;

        const upgradeStatusAttr = upgradeStatusEffectAttrs[0] as StatusEffectAttr | undefined;
        const upgradeStatus = upgradeStatusAttr?.effect;

        if (shouldOfferUpgradeCategory(UpgradeCategory.STATUS_IMPROVE) && !isStatusMove && hasSecondaryEffect && hasPower && !isSelfTarget) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.STATUS_IMPROVE);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.STATUS_IMPROVE_PATH[tierIndex];

                if (nextStep) {
                    let powerDelta = 0;

                    if (nextStep.pSetToRatio !== undefined) {
                        powerDelta += Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                    }
                    powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);

                    const rawAccCost = nextStep.accCost || 0;
                    const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                    const currentChance = baseMove.chance || 0;
                    const newPower = baseMovePower + powerDelta;
                    const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);

                    if (currentStatus) {
                        const accuracyCost = nextStep.accCost || 0;
                        const hasPowerChange = powerDelta !== 0;
                        const hasAccuracyChange = accuracyCost > 0 && baseMoveAccuracy !== -1;

                        if (currentChance >= 50) {
                            const descriptionKey = hasAccuracyChange ? "moveUpgrade:description:status:improveChanceCappedVsAccuracy" : "moveUpgrade:description:status:improveChanceCapped";
                            upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, accuracyDelta,
                                i18next.t(descriptionKey, {
                                    chance: currentChance,
                                    newPower: newPower,
                                    newAccuracy: newAccuracy
                                }), currentChance, null, [], [], 0, UpgradeCategory.STATUS_IMPROVE, upgradeTier));
                        } else {
                            const addChanceValue = nextStep.addChance || 0;
                            const newChance = Math.min(50, currentChance + addChanceValue);

                            let descriptionKey = "moveUpgrade:description:status:improveChance";
                            if (hasPowerChange && hasAccuracyChange) {
                                descriptionKey = "moveUpgrade:description:status:improveChanceVsPowerAndAccuracy";
                            } else if (hasPowerChange && !hasAccuracyChange) {
                                descriptionKey = "moveUpgrade:description:status:improveChanceNoAccuracy";
                            } else if (hasAccuracyChange) {
                                descriptionKey = "moveUpgrade:description:status:improveChanceVsAccuracy";
                            }

                            upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, accuracyDelta,
                                i18next.t(descriptionKey, {
                                    chance: newChance,
                                    statusName: getStatusEffectName(currentStatus),
                                    newPower: newPower,
                                    newAccuracy: newAccuracy
                                }), newChance, null, [], [], 0, UpgradeCategory.STATUS_IMPROVE, upgradeTier));
                        }
                    }
                }
            }
        }

        if (shouldOfferUpgradeCategory(UpgradeCategory.STATUS_DUAL) && !isStatusMove && hasSecondaryEffect && hasPower && !isSelfTarget) {
            const upgradeTier = getNextUpgradeTier(UpgradeCategory.STATUS_DUAL);

            if (upgradeTier !== null) {
                const tierIndex = upgradeTier - 1;
                const nextStep = this.STATUS_DUAL_PATH[tierIndex];

                if (nextStep) {
                    let powerDelta = 0;
                    if (nextStep.pSetToRatio !== undefined) {
                        powerDelta += Math.round(baseMovePower * nextStep.pSetToRatio) - baseMovePower;
                    }
                    powerDelta = MoveUpgrade.capPowerBoost(baseMovePower, powerDelta);

                    const rawAccCost = nextStep.accCost || 0;
                    const accuracyDelta = baseMoveAccuracy === -1 ? 0 : -rawAccCost;
                    const currentChance = baseMove.chance || 0;
                    const statusChance = nextStep.chance || currentChance;

                    if (currentStatus) {

                    const existingStatusEffects: StatusEffect[] = [];

                    const singleStatusAttrs = upgradeMove.getAttrs(StatusEffectAttr).filter(attr => !(attr instanceof MultiStatusEffectAttr));
                    existingStatusEffects.push(...singleStatusAttrs.map(attr => (attr as StatusEffectAttr).effect));

                    const multiStatusAttrs = upgradeMove.getAttrs(MultiStatusEffectAttr);
                    if (multiStatusAttrs.length > 0) {
                        const multiAttr = multiStatusAttrs[0] as MultiStatusEffectAttr;
                        existingStatusEffects.push(...multiAttr.effects);
                    }

                    if (existingStatusEffects.length > 0 && existingStatusEffects.length < 4) {
                        const allPossibleStatuses = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.FREEZE];
                        const availableStatuses = allPossibleStatuses.filter(s => !existingStatusEffects.includes(s));

                        if (availableStatuses.length > 0) {
                            const newStatus = Utils.randSeedItem(availableStatuses);
                            const combinedStatuses = [...existingStatusEffects, newStatus];
                            const statusName1 = existingStatusEffects.map(s => getStatusEffectName(s)).join("/");
                            const statusName2 = getStatusEffectName(newStatus);
                            const accuracyCost = nextStep.accCost || 0;
                            const hasPowerChange = powerDelta !== 0;
                            const hasAccuracyChange = accuracyCost > 0 && baseMoveAccuracy !== -1;
                            const newPower = baseMovePower + powerDelta;
                            const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);

                            let descriptionKey = "moveUpgrade:description:status:addSecondEffect";
                            if (hasPowerChange && hasAccuracyChange) {
                                descriptionKey = "moveUpgrade:description:status:addSecondEffectVsPowerAndAccuracy";
                            } else if (hasPowerChange && !hasAccuracyChange) {
                                descriptionKey = "moveUpgrade:description:status:addSecondEffectVsPower";
                            } else if (hasAccuracyChange) {
                                descriptionKey = "moveUpgrade:description:status:addSecondEffectVsAccuracy";
                            }

                            upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, accuracyDelta,
                                i18next.t(descriptionKey, {
                                    chance: statusChance,
                                    statusName1: statusName1,
                                    statusName2: statusName2,
                                    newPower: newPower,
                                    newAccuracy: newAccuracy
                                }), statusChance, null, [new MultiStatusEffectAttr(combinedStatuses)], [], 0, UpgradeCategory.STATUS_DUAL, upgradeTier));
                        }
                    } else if (existingStatusEffects.length > 0) {
                        const statusName = existingStatusEffects.map(s => getStatusEffectName(s)).join("/");
                        const accuracyCost = nextStep.accCost || 0;
                        const hasPowerChange = powerDelta !== 0;
                        const hasAccuracyChange = accuracyCost > 0 && baseMoveAccuracy !== -1;
                        const newPower = baseMovePower + powerDelta;
                        const newAccuracy = baseMoveAccuracy === -1 ? -1 : (baseMoveAccuracy + accuracyDelta);

                        let descriptionKey = "moveUpgrade:description:status:improveChance";
                        if (hasPowerChange && hasAccuracyChange) {
                            descriptionKey = "moveUpgrade:description:status:improveChanceVsPowerAndAccuracy";
                        } else if (hasPowerChange && !hasAccuracyChange) {
                            descriptionKey = "moveUpgrade:description:status:improveChanceNoAccuracy";
                        } else if (hasAccuracyChange) {
                            descriptionKey = "moveUpgrade:description:status:improveChanceVsAccuracy";
                        }

                        upgrades.push(moveGenerator.getType(moveId, powerDelta, null, null, accuracyDelta,
                            i18next.t(descriptionKey, {
                                chance: statusChance,
                                statusName: statusName,
                                newPower: newPower,
                                newAccuracy: newAccuracy
                            }), statusChance, null, [new MultiStatusEffectAttr(existingStatusEffects)], [], 0, UpgradeCategory.STATUS_DUAL, upgradeTier));
                    }
                }
                }
            }
        }

        if (!hasPathlessUpgrade && upgradeStatusAttr && !isStatusMove && upgradeMove.chance >= 5 && !isSelfTarget && isPathlessRare) {
            const otherStatuses = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.FREEZE, StatusEffect.SLEEP, StatusEffect.TOXIC]
                .filter(s => s !== upgradeStatus);
            const newStatus = Utils.randSeedItem(otherStatuses);
            const newStatusName = getStatusEffectName(newStatus);
            const chance = upgradeMove ? upgradeMove.chance || 0 : statusChance;
            upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                i18next.t("moveUpgrade:description:status:changeEffect", {
                    chance: chance,
                    statusName: newStatusName
                }), chance, null, [new StatusEffectAttr(newStatus)], [], 0, undefined));
        }

        if (!hasPathlessUpgrade && !upgradeStatusAttr && !isStatusMove && !isSelfTarget && upgradeMove.chance >= 5 && isPathlessRare) {
            const statusesToAdd = [StatusEffect.PARALYSIS, StatusEffect.BURN, StatusEffect.POISON, StatusEffect.SLEEP, StatusEffect.TOXIC, StatusEffect.FREEZE];
            const status = Utils.randSeedItem(statusesToAdd);
            const statusName = getStatusEffectName(status);
            upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0,
                i18next.t("moveUpgrade:description:status:addStatus", {
                    statusName: statusName,
                    chance: statusChance
                }), statusChance, null, [new StatusEffectAttr(status)], [], 0, undefined));
        }

        if (!hasPathlessUpgrade && isStatusMove && !upgradeStatusAttr && !hasStatBoostSelf && !hasStatLowerTarget && !hasHealAttr && !isSelfTarget && upgradeMove.chance >= 5 && isPathlessVeryRare) {

                const statusesToAdd = [StatusEffect.PARALYSIS, StatusEffect.BURN, StatusEffect.POISON, StatusEffect.SLEEP, StatusEffect.TOXIC];
                const status = Utils.randSeedItem(statusesToAdd);
                const isSevereStatus = [StatusEffect.SLEEP, StatusEffect.TOXIC].includes(status);
                const accuracyPenalty = isSevereStatus ? 15 : 10;
                const currentAccForCalc = baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy;
                const targetAcc = Math.max(50, currentAccForCalc - accuracyPenalty);
                const accuracyDelta = baseMoveAccuracy === -1 ? 0 : (targetAcc - baseMoveAccuracy);
                const statusName = getStatusEffectName(status);

                upgrades.push(moveGenerator.getType(moveId, null, null, null, accuracyDelta,
                    i18next.t("moveUpgrade:description:status:addStatusViaStatusMove", {
                        statusName: statusName, accuracyValue: targetAcc
                    }), null, null, [new StatusEffectAttr(status)], [], 0, undefined));
        }
        if (filterUpgrades && upgrades.length > 0) {
            const toCategories = (paths?: UpgradePath[]): UpgradeCategory[] => {
                if (!paths || paths.length === 0) return [];
                const typeToCategory: Record<string, UpgradeCategory | undefined> = {
                    POWER: UpgradeCategory.POWER,
                    ACCURACY: UpgradeCategory.ACCURACY,
                    HIT_HEAL: UpgradeCategory.HIT_HEAL,
                    EFFECT_CHANCE: UpgradeCategory.EFFECT_CHANCE,
                    CRIT: UpgradeCategory.CRIT,
                    RECOIL_ADD: UpgradeCategory.RECOIL_ADD,
                    RECOIL_DECREASE: UpgradeCategory.RECOIL_DECREASE,
                    SACRIFICIAL: UpgradeCategory.SACRIFICIAL,
                    CHARGE_MOVE: UpgradeCategory.CHARGE_MOVE,
                    MULTI_HIT: UpgradeCategory.MULTI_HIT,
                    POSITIVE: UpgradeCategory.POSITIVE_PRIORITY,
                    NEGATIVE: UpgradeCategory.NEGATIVE_PRIORITY,
                    ITEM_INTERACTION: UpgradeCategory.ITEM_INTERACTION,
                    STATUS: UpgradeCategory.STATUS_IMPROVE,
                    STAT_BOOST_SELF: UpgradeCategory.STAT_BOOST_SELF,
                    STAT_LOWER_TARGET: UpgradeCategory.STAT_LOWER_TARGET,
                };
                const result = new Set<UpgradeCategory>();
                for (const p of paths) {
                    const pathType = UpgradePathUtils.getPathType(p as any);
                    const key = pathType;
                    const cat = typeToCategory[key];
                    if (cat) result.add(cat);
                }
                return Array.from(result);
            };

            const allowedCategories = toCategories(filterUpgrades.moveUpgrades);
            const allowedAttrNames = new Set((filterUpgrades.moveAttributes || []).map(s => s.trim()).filter(Boolean));

            upgrades = upgrades.filter(u => {
                const anyU: any = u;
                let ok = false;
                if (allowedCategories.length > 0 && anyU.upgradeCategory) {
                    ok = allowedCategories.includes(anyU.upgradeCategory);
                }
                if (!ok && allowedAttrNames.size > 0) {
                    const attrs = (anyU.additionalAttrs || []) as any[];
                    ok = Array.isArray(attrs) && attrs.some(a => a?.constructor?.name && allowedAttrNames.has(a.constructor.name));
                }
                return allowedCategories.length === 0 && allowedAttrNames.size === 0 ? true : ok;
            });
        }

        const uniqueUpgrades = Array.from(new Map(upgrades.map(u => [(u).getDescription(scene), u])).values());
        return MoveUpgrade.shuffleArray(uniqueUpgrades);
    }
}