import { BattleStat, getBattleStatName } from "../data/battle-stat";
import { MoveCategory, MoveFlags, allMoves, MoveAttr, RecoilAttr, SacrificialAttr, FlinchAttr, ProtectAttr, MultiHitAttr, ChargeAttr, HighCritAttr, CritOnlyAttr, HealAttr, HitHealAttr, StatChangeAttr, StatusEffectAttr, ConfuseAttr, VariablePowerAttr, FixedDamageAttr, LevelDamageAttr, RandomLevelDamageAttr, AnyTypeMultiplierAttr, TypelessAttr, PlantHealAttr, SandHealAttr, AddBattlerTagAttr, MultiStatusEffectAttr, IgnoreOpponentStatChangesAttr, ConditionalPriorityAttr, FirstTurnPriorityAttr, TerrainMovePriorityAttr, DefDefAttr, TrapAttr, RemoveBattlerTagAttr, SurviveDamageAttr, TargetHalfHpDamageAttr, WeightPowerAttr, CompareWeightPowerAttr, GyroBallPowerAttr, ElectroBallPowerAttr, HpPowerAttr, LowHpPowerAttr, ForceSwitchOutAttr, StealHeldItemChanceAttr, RemoveHeldItemAttr, WeatherPowerBoostAttr, TerrainPowerBoostAttr, ConsecutiveUseDoublePowerAttr, TurnDamagedDoublePowerAttr, AddArenaTagAttr, WeatherChangeAttr, TerrainChangeAttr, ClearWeatherAttr, ClearTerrainAttr, RemoveScreensAttr, HealStatusEffectAttr, MatchUserTypeAttr, WeatherBallTypeAttr, TerrainPulseTypeAttr, HiddenPowerTypeAttr, AnyTypeSuperEffectTypeMultiplierAttr, HalfSacrificialAttr, SacrificialAttrOnHit, AddArenaTrapTagAttr, ChangeMultiHitTypeAttr, FirstMoveCondition, MultiHitType } from "../data/move";
import { ChargeAnim } from "../data/battle-anims";
import { Moves } from "../enums/moves";
import { StatusEffect, getStatusEffectMessageKey } from "../data/status-effect";
import { Type } from "../data/type";
import { WeatherType } from "../data/weather";
import { TerrainType } from "../data/terrain";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "../enums/battler-tag-type";
import * as Utils from "../utils";
import BattleScene from "../battle-scene";
import { ModifierType, MoveUpgradeModifierType, MoveUpgradeModifierTypeGenerator } from "../modifier/modifier-type";
import i18next, { ParseKeys } from "i18next";

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
    static shuffleArray(array: any[]): any[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    static generateMoveUpgradeOptions(moveId: Moves, scene: BattleScene): ModifierType[] {
        const baseMove = scene.getUpgradedMove(allMoves[moveId]);
        const moveGenerator = new MoveUpgradeModifierTypeGenerator();
        let upgrades: ModifierType[] = [];

        const POWER_PATH = [
            { boost: 10, accCost: 0 }, { boost: 15, accCost: 5 }, { boost: 20, accCost: 5 }, { boost: 25, accCost: 10 },
            { boost: 30, accCost: 10 }, { boost: 35, accCost: 15 }, { boost: 40, accCost: 15 }, { boost: 50, accCost: 20 }
        ];
        const ACCURACY_PATH = [
            { boost: 5, pCost: 0 }, { boost: 10, pCost: 5 }, { boost: 15, pCost: 10 }, { boost: 20, pCost: 15 },
            { boost: 25, pCost: 20 }, { boost: 30, pCost: 25 }, { boost: 101, pCost: 35 }
        ];
        const HIT_HEAL_PATH = [
            { ratio: 1/16, pCost: 15 }, { ratio: 1/12, pCost: 20 }, { ratio: 1/8, pCost: 25 }, { ratio: 1/6, pCost: 30 },
            { ratio: 1/4, pCost: 40 }, { ratio: 1/3, pCost: 50 }, { ratio: 1/2, pCost: 60 }, { ratio: 3/4, pCost: 75 }
        ];
        const EFFECT_CHANCE_PATH = [
            { chance: 10, pCost: 10 }, { chance: 20, pCost: 15 }, { chance: 30, pCost: 20 }, { chance: 40, pCost: 25 },
            { chance: 50, pCost: 30 }, { chance: 60, pCost: 35 }, { chance: 75, pCost: 40 }, { chance: 100, pCost: 50 }
        ];
        const STAT_CHANGE_PATH = [
            { level: 1, chance: 30, pCost: 15 }, { level: 1, chance: 50, pCost: 20 }, { level: 1, chance: 100, pCost: 25 }, { level: 2, chance: 30, pCost: 30 },
            { level: 2, chance: 50, pCost: 35 }, { level: 2, chance: 100, pCost: 40 }, { level: 3, chance: 50, pCost: 45 }, { level: 3, chance: 100, pCost: 50 }
        ];
        const CRIT_PATH = [
            { stage: 1, pCost: 15 }, { stage: 2, pCost: 25 }, { stage: 3, pCost: 35 }, { stage: 4, pCost: 45, accCost: 5 }
        ];
        const RECOIL_ADD_PATH = [
            { ratio: 1/8, pBoost: 10 }, { ratio: 1/6, pBoost: 15 }, { ratio: 1/4, pBoost: 20 }, { ratio: 1/3, pBoost: 30 },
            { ratio: 1/2, pBoost: 40 }, { ratio: 3/4, pBoost: 55 }, { ratio: 1, pBoost: 70 }
        ];
        const RECOIL_DECREASE_PATH = [ { ratio: 0.15, pCost: 15 }, { ratio: 0.10, pCost: 25 }, { ratio: 0, pCost: 40 } ];
        const SACRIFICIAL_PATH = [
            { attr: HalfSacrificialAttr, pSet: 150, desc: "moveUpgrade:description:sacrificial:addHalf" },
            { attr: SacrificialAttrOnHit, pSet: 180, desc: "moveUpgrade:description:sacrificial:upgradeOnHit" },
            { attr: SacrificialAttr, pSet: 220, desc: "moveUpgrade:description:sacrificial:upgradeFull" }
        ];
        const CHARGE_MOVE_PATH = [
            { pBoost: 40, desc: "moveUpgrade:description:misc:addChargeTurn" },
            { pBoost: 30, addBoost: true, desc: "moveUpgrade:description:misc:addChargeTurnWithBoost" }
        ];
        const MULTI_HIT_PATH = [
            { type: MultiHitType._2, pSet: 35 }, { type: MultiHitType._2_TO_5, pSet: 25 }, { type: MultiHitType._3, pSet: 30 },
            { type: MultiHitType._4_TO_8, pSet: 15 }, { type: MultiHitType._2, pSet: 20, checkAll: true, accCost: 10 }
        ];
        const POSITIVE_PRIORITY_PATH = [
            { prio: 1, pCost: 30 }, { prio: 2, pCost: 50 }, { prio: 3, pCost: 70 }
        ];
        const NEGATIVE_PRIORITY_PATH = [
            { prio: -1, pBoost: 15 }, { prio: -3, pBoost: 25 }, { prio: -5, pBoost: 35 }
        ];
        const ITEM_INTERACTION_PATH = [
            { type: 'remove', pBoost: 15 }, { type: 'steal', chance: 0.3, pCost: 0 }, { type: 'steal', chance: 1.0, pCost: 40 }
        ];
        const STATUS_CHANGE_PATH = [
            { type: 'add', chance: 15, pCost: 5, accCost: 0 }, { type: 'add', chance: 25, pCost: 10, accCost: 0 },
            { type: 'improve', chance: 25, pCost: 10, accCost: 0 },
            { type: 'change', chance: 30, pCost: 0, accCost: 0 }, { type: 'dual', chance: 20, pCost: 15, accCost: 5 },
            { type: 'guarantee', chance: 100, pCost: 40, accCost: 15 }
        ];
        const STAT_BOOST_SELF_PATH = [
            { stats: 1, level: 1, chance: 20, pCost: 0 }, { stats: 1, level: 2, chance: 30, pCost: 5 },

            { stats: 2, level: 1, chance: 25, pCost: 10 }, { stats: 2, level: 2, chance: 40, pCost: 15 },
            { stats: 3, level: 1, chance: 30, pCost: 20 }, { stats: 1, level: 3, chance: 100, pCost: 25 }
        ];
        const STAT_LOWER_TARGET_PATH = [
            { stats: 1, level: 1, chance: 100, pCost: 15, accCost: 5 }, { stats: 1, level: 2, chance: 30, pCost: 30, accCost: 15 },
            { stats: 2, level: 1, chance: 100, pCost: 20, accCost: 30 }, { stats: 1, level: 2, chance: 100, pCost: 45, accCost: 30 },
            { stats: 2, level: 2, chance: 50, pCost: 50, accCost: 40 }, { stats: 1, level: 3, chance: 100, pCost: 60, accCost: 50 }
        ];
        const GROUNDING_PATH = [
            { effect: 'basic', pBoost: 0, desc: "moveUpgrade:description:misc:addGrounding" },
            { effect: 'enhanced', pBoost: 5, desc: "moveUpgrade:description:misc:addEnhancedGrounding" }
        ];

        const isPhysicalMove = baseMove.category === MoveCategory.PHYSICAL;
        const isSpecialMove = baseMove.category === MoveCategory.SPECIAL;
        const isStatusMove = baseMove.category === MoveCategory.STATUS;
        const hasPower = baseMove.power > 0;
        const baseMovePower = baseMove.power;
        const hasAccuracy = typeof baseMove.accuracy === 'number' && baseMove.accuracy > 0 && baseMove.accuracy < 101;
        const baseMoveAccuracy = typeof baseMove.accuracy === 'number' ? baseMove.accuracy : -1;
        const baseMoveChance = baseMove.chance > 0 ? baseMove.chance : 0;
        const hasContact = baseMove.hasFlag(MoveFlags.MAKES_CONTACT);
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
        const selfBoostAttr = baseMove.getAttrs(StatChangeAttr).find((a: StatChangeAttr) => a.selfTarget && a.levels > 0);
        const targetLowerAttr = baseMove.getAttrs(StatChangeAttr).find((a: StatChangeAttr) => !a.selfTarget && a.levels < 0);
        const statusEffectAttrs = baseMove.getAttrs(StatusEffectAttr);
        const hasFlinch = baseMove.hasAttr(FlinchAttr);
        const hasConfuse = baseMove.hasAttr(ConfuseAttr);
        const battlerTagAttrs = baseMove.getAttrs(AddBattlerTagAttr);
        const hasLeechSeed = battlerTagAttrs.some((a: any) => a.tagType === BattlerTagType.SEEDED);
        const hasEncore = battlerTagAttrs.some((a: any) => a.tagType === BattlerTagType.ENCORE);
        const hasCurse = battlerTagAttrs.some((a: any) => a.tagType === BattlerTagType.CURSED);
        const hasSecondaryEffect = !!(targetLowerAttr || statusEffectAttrs.length > 0 || hasFlinch || hasConfuse || hasLeechSeed || hasEncore || hasCurse);
        const hasAnySecondaryEffect = hasSecondaryEffect && baseMoveChance > 0;
        const hasStatBoostSelf = selfBoostAttr !== undefined;
        const hasStatLowerTarget = targetLowerAttr !== undefined;
        const hasHealAttr = healAttr !== undefined;
        const selfBoostAttrs = baseMove.getAttrs(StatChangeAttr).filter((a: StatChangeAttr) => a.selfTarget && a.levels > 0);
        const targetLowerAttrs = baseMove.getAttrs(StatChangeAttr).filter((a: StatChangeAttr) => !a.selfTarget && a.levels < 0);

        const findTier = (path: any[], value: any, key: string) => path.findIndex(t => t[key] === value);

        if (!isStatusMove) {
            if (baseMove.priority <= 0) {
                const currentTier = baseMove.priority === 0 ? -1 : baseMove.priority + 5;
                const nextStep = POSITIVE_PRIORITY_PATH[currentTier + 1];
                if (nextStep) {
                    const priorityDelta = nextStep.prio - baseMove.priority;
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, 0, i18next.t("moveUpgrade:description:priority:increase", { value: nextStep.prio, powerValue: nextStep.pCost }), null, null, [new ConditionalPriorityAttr(priorityDelta)]));
                }
            }

            if (baseMove.priority >= 0) {
                const currentTier = baseMove.priority > 0 ? -1 : 0;
                const nextStep = NEGATIVE_PRIORITY_PATH[currentTier + 1];
                if (nextStep) {
                    const priorityDelta = nextStep.prio - baseMove.priority;
                    upgrades.push(moveGenerator.getType(moveId, nextStep.pBoost, null, null, 0, i18next.t("moveUpgrade:description:priority:decrease", { value: nextStep.prio, powerValue: nextStep.pBoost }), null, null, [new ConditionalPriorityAttr(priorityDelta)]));
                }
            }
        }

        if (!isStatusMove && hasPower) {
            const currentCritStage = isCritOnly ? 4 : (highCritAttr ? 1 : 0);
            const nextStep = CRIT_PATH[currentCritStage];
            if (nextStep) {
                if (nextStep.stage === 4) {
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, -nextStep.accCost, i18next.t("moveUpgrade:description:crit:upgradeToCritOnly", { powerValue: nextStep.pCost, accuracyValue: nextStep.accCost }), null, null, [new CritOnlyAttr()]));
                } else {
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, 0, i18next.t("moveUpgrade:description:crit:increaseStage", { stage: nextStep.stage, powerValue: nextStep.pCost }), null, null, [new HighCritAttr()]));
                }
            }
        }

        if (hasStatBoostSelf) {
            const currentAttr = selfBoostAttrs[0] as StatChangeAttr;
            const currentLevels = currentAttr.levels;
            const currentStats = Array.isArray(currentAttr.stats) ? currentAttr.stats : [currentAttr.stats];
            const statCount = currentStats.length;

            let currentTier = -1;
            for (let i = 0; i < STAT_BOOST_SELF_PATH.length; i++) {
                const step = STAT_BOOST_SELF_PATH[i];
                if (step.stats === statCount && step.level === currentLevels) {
                    currentTier = i;
                    break;
                }
            }

            const nextStep = STAT_BOOST_SELF_PATH[currentTier + 1];
            if (nextStep) {
                const currentStatNames = currentStats.map(s => getBattleStatName(s)).join(" & ");
                const chance = isStatusMove ? 100 : nextStep.chance;

                if (nextStep.stats === statCount && nextStep.level > currentLevels) {
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, 0, i18next.t("moveUpgrade:description:stat:increaseRaiseSelf", { statName: currentStatNames, stages: nextStep.level, powerValue: nextStep.pCost }), chance, null, [new StatChangeAttr(currentAttr.stats, nextStep.level, true)]));
                } else if (nextStep.stats > statCount) {
                    const potentialNewStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA].filter(s => !currentStats.includes(s));
                    const newStat = Utils.randSeedItem(potentialNewStats);
                    const newStatName = getBattleStatName(newStat);
                    const allStats = [...currentStats, newStat];
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, 0, i18next.t("moveUpgrade:description:stat:addAnotherRaiseSelf", { existingStats: currentStatNames, newStatName: newStatName, stages: nextStep.level, powerValue: nextStep.pCost }), chance, null, [new StatChangeAttr(allStats, nextStep.level, true)]));
                }
            }
        } else if (!hasStatBoostSelf) {
            const nextStep = STAT_BOOST_SELF_PATH[0];
            const stat = Utils.randSeedItem([BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]);
            const statName = getBattleStatName(stat);
            const chance = isStatusMove ? 100 : nextStep.chance;
            upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, 0, i18next.t("moveUpgrade:description:stat:addRaiseSelfSingle", { statName: statName, stages: nextStep.level, chance: chance, powerValue: nextStep.pCost }), chance, null, [new StatChangeAttr(stat, nextStep.level, true)]));
        }

        if (hasStatLowerTarget) {
            const lowerAttr = targetLowerAttrs[0] as StatChangeAttr;
            const currentLevels = Math.abs(lowerAttr.levels);
            const currentStats = Array.isArray(lowerAttr.stats) ? lowerAttr.stats : [lowerAttr.stats];
            const statCount = currentStats.length;

            let currentTier = -1;
            for (let i = 0; i < STAT_LOWER_TARGET_PATH.length; i++) {
                const step = STAT_LOWER_TARGET_PATH[i];
                if (step.stats === statCount && step.level === currentLevels) {
                    currentTier = i;
                    break;
                }
            }

            const nextStep = STAT_LOWER_TARGET_PATH[currentTier + 1];
            if (nextStep) {
                const currentStatNames = currentStats.map(s => getBattleStatName(s)).join(" & ");
                const powerPenalty = isStatusMove ? 0 : -nextStep.pCost;
                const accPenalty = isStatusMove ? -nextStep.accCost : 0;
                const targetAcc = Math.max(50, (baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy) + accPenalty);

                if (nextStep.stats === statCount && nextStep.level > currentLevels) {
                    upgrades.push(moveGenerator.getType(moveId, powerPenalty, null, null, accPenalty, i18next.t("moveUpgrade:description:stat:increaseLowerTarget", { statName: currentStatNames, stages: nextStep.level, accuracy: targetAcc, powerValue: Math.abs(powerPenalty) }), nextStep.chance, null, [new StatChangeAttr(lowerAttr.stats, -nextStep.level, false)]));
                } else if (nextStep.stats > statCount) {
                    const potentialNewStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA].filter(s => !currentStats.includes(s));
                    const newStat = Utils.randSeedItem(potentialNewStats);
                    const newStatName = getBattleStatName(newStat);
                    const allStats = [...currentStats, newStat];
                    upgrades.push(moveGenerator.getType(moveId, powerPenalty, null, null, accPenalty, i18next.t("moveUpgrade:description:stat:addAnotherLowerTarget", { existingStats: currentStatNames, newStatName: newStatName, stages: nextStep.level, powerValue: Math.abs(powerPenalty) }), nextStep.chance, null, [new StatChangeAttr(allStats, -nextStep.level, false)]));
                }
            }
        } else if (!hasStatLowerTarget) {
            const nextStep = STAT_LOWER_TARGET_PATH[0];
            const stat = Utils.randSeedItem([BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]);
            const statName = getBattleStatName(stat);
            const powerPenalty = isStatusMove ? 0 : -nextStep.pCost;
            const accPenalty = isStatusMove ? -nextStep.accCost : 0;
            const targetAcc = Math.max(50, (baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy) + accPenalty);
            upgrades.push(moveGenerator.getType(moveId, powerPenalty, null, null, accPenalty, i18next.t("moveUpgrade:description:stat:addLowerTargetSingle", { statName: statName, stages: nextStep.level, accuracy: targetAcc, powerValue: Math.abs(powerPenalty) }), nextStep.chance, null, [new StatChangeAttr(stat, -nextStep.level, false)]));
        }

        if (!isStatusMove && baseMove.type !== Type.GROUND && !baseMove.getAttrs(AddBattlerTagAttr).some((a: any) => a.tagType === BattlerTagType.IGNORE_FLYING)) {
            const nextStep = GROUNDING_PATH[0];
            upgrades.push(moveGenerator.getType(moveId, nextStep.pBoost, null, null, 0, i18next.t(nextStep.desc), null, null, [new AddBattlerTagAttr(BattlerTagType.IGNORE_FLYING), new RemoveBattlerTagAttr([BattlerTagType.FLYING, BattlerTagType.MAGNET_RISEN])]));
        }

        if (isStatusMove) {
            if (!baseMove.hasAttr(WeatherChangeAttr) && !baseMove.hasAttr(ClearWeatherAttr)) {
                const weather = Utils.randSeedItem([WeatherType.SUNNY, WeatherType.RAIN, WeatherType.SANDSTORM, WeatherType.SNOW]);
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:setWeather", { weather: getWeatherName(weather) }), null, null, [new WeatherChangeAttr(weather)]));
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:clearWeather"), null, null, [new ClearWeatherAttr(WeatherType.NONE)]));
            }
            if (!baseMove.hasAttr(TerrainChangeAttr) && !baseMove.hasAttr(ClearTerrainAttr)) {
                const terrain = Utils.randSeedItem([TerrainType.ELECTRIC, TerrainType.GRASSY, TerrainType.MISTY, TerrainType.PSYCHIC]);
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:setTerrain", { terrain: getTerrainName(terrain) }), null, null, [new TerrainChangeAttr(terrain)]));
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:statusSpecific:clearTerrain"), null, null, [new ClearTerrainAttr()]));
            }
            if (!baseMove.hasAttr(AddArenaTrapTagAttr)) {
                const hazard = Utils.randSeedItem([ArenaTagType.STEALTH_ROCK, ArenaTagType.SPIKES, ArenaTagType.TOXIC_SPIKES, ArenaTagType.STICKY_WEB]);
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, -10, i18next.t("moveUpgrade:description:statusSpecific:addArenaTrap", { trapName: getHazardName(hazard) }), null, null, [new AddArenaTrapTagAttr(hazard)]));
            }
        }

        if (hasPower && !isStatusMove) {
            const currentTier = Math.floor((baseMove.power - allMoves[moveId].power) / 5) -1;
            const nextStep = POWER_PATH[currentTier + 1];
            if (nextStep) {
                upgrades.push(moveGenerator.getType(moveId, nextStep.boost, null, null, -nextStep.accCost, i18next.t("moveUpgrade:description:power:increaseVsAccuracy", { powerValue: nextStep.boost, accuracyValue: nextStep.accCost })));
            }
        }

        if (hasAccuracy && baseMoveAccuracy < 100) {
            const currentTier = ACCURACY_PATH.findIndex(t => baseMoveAccuracy < t.boost) - 1;
            const nextStep = ACCURACY_PATH[currentTier + 1];
            if (nextStep) {
                const accDelta = nextStep.boost === 101 ? (101 - baseMoveAccuracy) : nextStep.boost;
                const descKey = nextStep.boost === 101 ? "moveUpgrade:description:accuracy:perfectAccuracy" : "moveUpgrade:description:accuracy:increaseVsPower";
                upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, accDelta, i18next.t(descKey, { accuracyValue: nextStep.boost, powerValue: nextStep.pCost })));
            }
        }

        if (!isStatusMove && hasPower) {
            if (!hasRecoil) {
                const nextStep = RECOIL_ADD_PATH[0];
                upgrades.push(moveGenerator.getType(moveId, nextStep.pBoost, null, null, 0, i18next.t("moveUpgrade:description:recoil:addVsPower", { percent: Math.round(nextStep.ratio * 100), powerValue: nextStep.pBoost }), null, null, [new RecoilAttr(false, nextStep.ratio)]));
            } else if (recoilAttr) {
                const currentRatio = recoilAttr.damageRatio;
                const currentAddTier = findTier(RECOIL_ADD_PATH, currentRatio, 'ratio');
                const nextAddStep = RECOIL_ADD_PATH[currentAddTier + 1];
                if (nextAddStep) {
                    upgrades.push(moveGenerator.getType(moveId, nextAddStep.pBoost, null, null, 0, i18next.t("moveUpgrade:description:recoil:increaseVsPower", { percent: Math.round(nextAddStep.ratio * 100), powerValue: nextAddStep.pBoost }), null, null, [new RecoilAttr(false, nextAddStep.ratio)]));
                }
                const currentDecreaseTier = RECOIL_DECREASE_PATH.findIndex(t => t.ratio >= currentRatio) - 1;
                const nextDecreaseStep = RECOIL_DECREASE_PATH[currentDecreaseTier + 1];
                if (nextDecreaseStep) {
                    const descKey = nextDecreaseStep.ratio === 0 ? "moveUpgrade:description:recoil:removeVsPower" : "moveUpgrade:description:recoil:decreaseVsPower";
                    upgrades.push(moveGenerator.getType(moveId, -nextDecreaseStep.pCost, null, null, 0, i18next.t(descKey, { percent: Math.round(nextDecreaseStep.ratio * 100), powerValue: nextDecreaseStep.pCost }), null, null, [new RecoilAttr(false, nextDecreaseStep.ratio)]));
                }
            }
        }

        if (!isStatusMove && hasPower) {
            const currentRatio = hitHealAttr?.healRatio || 0;
            const currentTier = findTier(HIT_HEAL_PATH, currentRatio, 'ratio');
            const nextStep = HIT_HEAL_PATH[currentTier + 1];
            if (nextStep) {
                const descKey = currentRatio === 0 ? "moveUpgrade:description:heal:addHitHealVsPower" : "moveUpgrade:description:heal:increaseHitHealVsPower";
                upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, 0, i18next.t(descKey, { percent: Math.round(nextStep.ratio * 100), powerValue: nextStep.pCost }), null, null, [new HitHealAttr(nextStep.ratio)]));
            }
        }

        if (hasPower && !isStatusMove && !hasSecondaryEffect) {
            const { chance, pCost } = EFFECT_CHANCE_PATH[0];
            const status = Utils.randSeedItem([StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON]);
            const addables = [
                { attr: [new FlinchAttr()], desc: "moveUpgrade:description:flinch:addChanceVsPower" },
                { attr: [new ConfuseAttr()], desc: "moveUpgrade:description:confusion:addChanceVsPower" },
                { attr: [new AddBattlerTagAttr(BattlerTagType.SEEDED)], desc: "moveUpgrade:description:status:addLeechSeedVsPower" },
                { attr: [new AddBattlerTagAttr(BattlerTagType.CURSED)], desc: "moveUpgrade:description:curse:addChanceVsPower" },
                { attr: [new StatusEffectAttr(status)], desc: "moveUpgrade:description:status:addChanceVsPower" }
            ];
            const chosen = Utils.randSeedItem(addables);
            upgrades.push(moveGenerator.getType(moveId, -pCost, null, null, 0, i18next.t(chosen.desc, { chance, powerValue: pCost, statusName: getStatusEffectName(status) }), chance, null, chosen.attr));
        }

        if (hasSecondaryEffect && baseMoveChance < 100) {
            const currentTier = findTier(EFFECT_CHANCE_PATH, baseMoveChance, 'chance');
            const nextStep = EFFECT_CHANCE_PATH[currentTier + 1];
            if (nextStep) {
                upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, 0, i18next.t("moveUpgrade:description:effectChance:increaseToValueVsPower", { value: nextStep.chance, powerValue: nextStep.pCost }), nextStep.chance));
            }
        }

        if (!isStatusMove && baseMovePower > 20) {
            const currentType = multiHitAttr?.getMultiHitType;
            const currentTier = currentType !== undefined ? findTier(MULTI_HIT_PATH, currentType, 'type') : -1;
            const nextStep = currentTier !== -1 ? MULTI_HIT_PATH[currentTier + 1] : MULTI_HIT_PATH[0];
            if (nextStep && baseMovePower > nextStep.pSet) {
                const powerChange = -baseMovePower + nextStep.pSet;
                const flags = nextStep.checkAll ? [MoveFlags.CHECK_ALL_HITS] : [];
                const descKey = currentTier === -1 ? "moveUpgrade:description:multiHit:add" : "moveUpgrade:description:multiHit:change";
                upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, -(nextStep.accCost || 0), i18next.t(descKey, { hits: nextStep.type, powerValue: nextStep.pSet }), 1, null, [new MultiHitAttr(nextStep.type)], [], ...flags));
            }
        }

        if (isPhysicalMove && !isStatusMove) {
            const hasRemove = baseMove.hasAttr(RemoveHeldItemAttr);
            const hasSteal = baseMove.hasAttr(StealHeldItemChanceAttr);
            const currentTier = hasSteal ? 1 : (hasRemove ? 0 : -1);
            const nextStep = ITEM_INTERACTION_PATH[currentTier + 1];
            if (nextStep) {
                if(nextStep.type === 'remove') {
                    upgrades.push(moveGenerator.getType(moveId, nextStep.pBoost, null, null, 0, i18next.t("moveUpgrade:description:misc:addRemoveItem", { powerValue: nextStep.pBoost }), null, null, [new RemoveHeldItemAttr(false)]));
                } else if (nextStep.type === 'steal') {
                    const descKey = nextStep.chance === 1.0 ? "moveUpgrade:description:misc:addStealItemGuaranteed" : "moveUpgrade:description:misc:addStealItemChance";
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, 0, i18next.t(descKey, { chance: Math.round(nextStep.chance * 100), powerValue: nextStep.pCost }), null, null, [new StealHeldItemChanceAttr(nextStep.chance)]));
                }
            }
        }

        if (!isStatusMove && hasPower && baseMove.id !== Moves.STRUGGLE) {
            const currentTier = hasSacrificial ? 2 : (hasSacrificialOnHit ? 1 : (hasHalfSacrificial ? 0 : -1));
            const nextStep = SACRIFICIAL_PATH[currentTier + 1];
            if (nextStep && baseMovePower < nextStep.pSet) {
                const powerChange = nextStep.pSet - baseMovePower;
                upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, 0, i18next.t(nextStep.desc, { power: nextStep.pSet }), null, null, [new nextStep.attr()]));
            }
        }

        if (!isStatusMove && hasPower && baseMovePower <= 100) {
            const hasChargeWithStat = chargeAttr && baseMove.getAttrs(StatChangeAttr).some((attr: StatChangeAttr) => attr.selfTarget);
            const currentTier = !chargeAttr ? -1 : (hasChargeWithStat ? 1 : 0);
            const nextStep = CHARGE_MOVE_PATH[currentTier + 1];
            if (nextStep) {
                const chargeAnim = isPhysicalMove ? ChargeAnim.SKULL_BASH_CHARGING : ChargeAnim.SOLAR_BEAM_CHARGING;
                const chargeTextKey = isPhysicalMove ? "moveUpgrade:moveTriggers:loweredItsHead" : "moveUpgrade:moveTriggers:tookInSunlight";
                const chargeText = i18next.t(chargeTextKey, { pokemonName: "{USER}" });
                let attrs: MoveAttr[] = [new ChargeAttr(chargeAnim, chargeText, null, !!nextStep.addBoost)];
                if (nextStep.addBoost) {
                    attrs.push(new StatChangeAttr(BattleStat.DEF, 1, true));
                }
                const powerChange = nextStep.addBoost ? -10 : nextStep.pBoost;
                upgrades.push(moveGenerator.getType(moveId, powerChange, null, null, 0, i18next.t(nextStep.desc, { powerValue: nextStep.pBoost, statName: getBattleStatName(BattleStat.DEF), stages: 1 }), null, null, attrs));
            }
        }


        if (isPhysicalMove) {
            upgrades.push(moveGenerator.getType(moveId, 0, null, MoveCategory.SPECIAL, 0, i18next.t("moveUpgrade:description:category:changeToSpecial")));
        } else if (isSpecialMove) {
            upgrades.push(moveGenerator.getType(moveId, 0, null, MoveCategory.PHYSICAL, 0, i18next.t("moveUpgrade:description:category:changeToPhysical")));
        }

        if (!isStatusMove) {
            if (!baseMove.hasAttr(MatchUserTypeAttr) && !baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(TerrainPulseTypeAttr) && !baseMove.hasAttr(HiddenPowerTypeAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:matchUserType"), null, null, [new MatchUserTypeAttr()]));
            }
            if (!baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(MatchUserTypeAttr) && !baseMove.hasAttr(TerrainPulseTypeAttr) && !baseMove.hasAttr(HiddenPowerTypeAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:weatherBall"), null, null, [new WeatherBallTypeAttr()]));
            }
            if (!baseMove.hasAttr(TerrainPulseTypeAttr) && !baseMove.hasAttr(MatchUserTypeAttr) && !baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(HiddenPowerTypeAttr) && baseMove.type !== Type.NORMAL) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:terrainPulse"), null, null, [new TerrainPulseTypeAttr()]));
            }
            if (!baseMove.hasAttr(HiddenPowerTypeAttr) && !baseMove.hasAttr(MatchUserTypeAttr) && !baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(TerrainPulseTypeAttr) && baseMove.type !== Type.NORMAL) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:hiddenPower"), null, null, [new HiddenPowerTypeAttr()]));
            }
            if (!baseMove.hasAttr(TypelessAttr) && !baseMove.hasAttr(MatchUserTypeAttr) && !baseMove.hasAttr(WeatherBallTypeAttr) && !baseMove.hasAttr(TerrainPulseTypeAttr) && !baseMove.hasAttr(HiddenPowerTypeAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0, i18next.t("moveUpgrade:description:type:becomeTypeless", { powerValue: 10 }), null, null, [new TypelessAttr()]));
            }

            if (!baseMove.hasAttr(AnyTypeSuperEffectTypeMultiplierAttr)) {
                const targetType = Utils.randSeedItem(Object.values(Type).filter(t => typeof t === "number" && t > Type.UNKNOWN && t < Type.STELLAR) as Type[]);
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:type:superEffectiveVsType", { targetTypeName: getTypeName(targetType) }), null, null, [new AnyTypeSuperEffectTypeMultiplierAttr(targetType)]));
            }
        }

        if (!isStatusMove && !hitHealAttr) {
            const healOverTime = Utils.randSeedItem([BattlerTagType.AQUA_RING, BattlerTagType.INGRAIN]);
            upgrades.push(moveGenerator.getType(moveId, -25, null, null, 0, i18next.t(`moveUpgrade:description:heal:add${healOverTime}VsPower`, { powerValue: 25 }), null, null, [new AddBattlerTagAttr(healOverTime, true, true)]));
        }

        if (isStatusMove && !healAttr && !hitHealAttr) {
            const passiveHeal = Utils.randSeedItem([{attr: new PlantHealAttr(), desc: "moveUpgrade:description:heal:addPlantHeal"}, {attr: new SandHealAttr(), desc: "moveUpgrade:description:heal:addSandHeal"}]);
            upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t(passiveHeal.desc), null, null, [passiveHeal.attr]));
        }

        if (hasPower && !isStatusMove && baseMovePower <= 95) {
            if (!baseMove.hasAttr(GyroBallPowerAttr) && !baseMove.hasAttr(ElectroBallPowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addSpeedPowerSlower"), null, null, [new GyroBallPowerAttr()]));
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addSpeedPowerFaster"), null, null, [new ElectroBallPowerAttr()]));
            }
            if (!baseMove.hasAttr(WeightPowerAttr) && !baseMove.hasAttr(CompareWeightPowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addWeightPowerTarget"), null, null, [new WeightPowerAttr()]));
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addWeightPowerCompare"), null, null, [new CompareWeightPowerAttr()]));
            }
            if (baseMovePower <= 80 && !baseMove.hasAttr(HpPowerAttr) && !baseMove.hasAttr(LowHpPowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addHpPowerHighHp"), null, null, [new HpPowerAttr()]));
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:addHpPowerLowHp"), null, null, [new LowHpPowerAttr()]));
            }
            if (baseMovePower <= 60 && !baseMove.hasAttr(ConsecutiveUseDoublePowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:powerBoostConsecutive"), null, null, [new ConsecutiveUseDoublePowerAttr(2, true)]));
            }
            if (baseMovePower <= 80 && !baseMove.hasAttr(TurnDamagedDoublePowerAttr)) {
                upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:powerBoostTurnDamaged"), null, null, [new TurnDamagedDoublePowerAttr()]));
            }
        }

        if (!isStatusMove && baseMovePower <= 60 && !baseMove.hasAttr(WeatherPowerBoostAttr)) {
            const weather = Utils.randSeedItem([WeatherType.SUNNY, WeatherType.RAIN, WeatherType.SANDSTORM, WeatherType.SNOW]);
            const weatherName = getWeatherName(weather);
            upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:powerBoostWeather", { weatherName }), null, null, [new WeatherPowerBoostAttr(weather)]));
        }
        if (!isStatusMove && baseMovePower <= 60 && !baseMove.hasAttr(TerrainPowerBoostAttr)) {
            const terrain = Utils.randSeedItem([TerrainType.ELECTRIC, TerrainType.GRASSY, TerrainType.MISTY, TerrainType.PSYCHIC]);
            const terrainName = getTerrainName(terrain);
            upgrades.push(moveGenerator.getType(moveId, 0, null, null, 0, i18next.t("moveUpgrade:description:misc:powerBoostTerrain", { terrainName }), null, null, [new TerrainPowerBoostAttr(terrain)]));
        }

        if (baseMove.priority <= 0 && !isStatusMove && !baseMove.hasAttr(TerrainMovePriorityAttr) && !baseMove.hasAttr(FirstTurnPriorityAttr)) {
            const terrain = Utils.randSeedItem([TerrainType.GRASSY, TerrainType.ELECTRIC]);
            upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0, i18next.t("moveUpgrade:description:priority:conditionalTerrain", { terrain: getTerrainName(terrain), value: 1, powerValue: 10 }), null, null, [new TerrainMovePriorityAttr(terrain, 1)]));
            upgrades.push(moveGenerator.getType(moveId, 20, null, null, 0, i18next.t("moveUpgrade:description:priority:conditionalFirstTurn", { value: 2, powerValue: 20 }), null, null, [new FirstTurnPriorityAttr(2)], [new FirstMoveCondition()]));
        }

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
        if (!isStatusMove) {
            for (const util of allFlags) {
                if ((util.req === undefined || util.req) && !baseMove.hasFlag(util.flag)) {
                    upgrades.push(moveGenerator.getType(moveId, util.pBoost, null, null, 0, i18next.t(util.desc, { powerValue: util.pBoost }), null, null, [], [], util.flag));
                }
            }
        }

        if (!isStatusMove) {
            if (!baseMove.hasFlag(MoveFlags.IGNORE_PROTECT)) upgrades.push(moveGenerator.getType(moveId, -5, null, null, 0, i18next.t("moveUpgrade:description:flags:ignoreProtect", { powerValue: 5 }), null, null, [], [], MoveFlags.IGNORE_PROTECT));
            if (hasContact) {
                upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0, i18next.t("moveUpgrade:description:flags:disableContact", { powerValue: 10 }), null, null, [], [], MoveFlags.MAKES_CONTACT));
            } else {
                upgrades.push(moveGenerator.getType(moveId, -10, null, null, 0, i18next.t("moveUpgrade:description:flags:enableContact", { powerValue: 10 }), null, null, [], [], MoveFlags.MAKES_CONTACT));
            }
            if (!baseMove.hasAttr(IgnoreOpponentStatChangesAttr)) upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0, i18next.t("moveUpgrade:description:flags:ignoreStatChanges", { powerValue: 10 }), null, null, [new IgnoreOpponentStatChangesAttr()]));
            if (!baseMove.hasAttr(RemoveScreensAttr)) upgrades.push(moveGenerator.getType(moveId, 10, null, null, 0, i18next.t("moveUpgrade:description:flags:removeScreens", { powerValue: 10 }), null, null, [new RemoveScreensAttr(false)]));
            if (!baseMove.hasAttr(ForceSwitchOutAttr)) upgrades.push(moveGenerator.getType(moveId, -25, null, null, 0, i18next.t("moveUpgrade:description:misc:addSwitchOut", { powerValue: 25 }), null, null, [new ForceSwitchOutAttr(true)]));
            if (!baseMove.hasAttr(SurviveDamageAttr) && hasPower) upgrades.push(moveGenerator.getType(moveId, 25, null, null, 0, i18next.t("moveUpgrade:description:misc:addSurviveDamage", { powerValue: 25 }), null, null, [new SurviveDamageAttr()]));
            if (!baseMove.hasAttr(TrapAttr)) {
                const trapType = Utils.randSeedItem([BattlerTagType.BIND, BattlerTagType.WRAP, BattlerTagType.FIRE_SPIN, BattlerTagType.WHIRLPOOL]);
                upgrades.push(moveGenerator.getType(moveId, -25, null, null, 0, i18next.t("moveUpgrade:description:misc:addTrap", { trapName: getTrapName(trapType), powerValue: 25 }), null, null, [new TrapAttr(trapType)]));
            }
            if (!baseMove.hasAttr(FixedDamageAttr) && !baseMove.hasAttr(LevelDamageAttr) && !baseMove.hasAttr(TargetHalfHpDamageAttr) && !baseMove.hasAttr(RandomLevelDamageAttr)) {
                upgrades.push(moveGenerator.getType(moveId, -baseMovePower + 40, null, null, 0, i18next.t("moveUpgrade:description:misc:fixedDamageValue", { value: 40 }), null, null, [new FixedDamageAttr(40)]));
                upgrades.push(moveGenerator.getType(moveId, -baseMovePower, null, null, 0, i18next.t("moveUpgrade:description:misc:fixedDamageLevel"), null, null, [new LevelDamageAttr()]));
                upgrades.push(moveGenerator.getType(moveId, -baseMovePower, null, null, 0, i18next.t("moveUpgrade:description:misc:fixedDamageTargetHalfHp"), null, null, [new TargetHalfHpDamageAttr()]));
            }
        }


        if (!isStatusMove && hasSecondaryEffect) {
            const currentStatusAttr = statusEffectAttrs[0] as StatusEffectAttr | undefined;
            const currentStatus = currentStatusAttr?.effect;
            const hasMultiStatus = baseMove.hasAttr(MultiStatusEffectAttr);

            let currentTier = -1;
            if (currentStatus && !hasMultiStatus) currentTier = 1;
            else if (currentStatus && hasMultiStatus) currentTier = 2;
            else if (baseMoveChance === 100) currentTier = 3;
            const nextStep = STATUS_CHANGE_PATH[currentTier + 1];
            if (nextStep && currentStatus) {
                if (nextStep.type === 'change') {
                    const otherStatuses = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.FREEZE, StatusEffect.SLEEP, StatusEffect.TOXIC]
                        .filter(s => s !== currentStatus);
                    const newStatus = Utils.randSeedItem(otherStatuses);
                    const newStatusName = getStatusEffectName(newStatus);
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, -nextStep.accCost, i18next.t("moveUpgrade:description:status:changeEffect", { chance: nextStep.chance, statusName: newStatusName }), nextStep.chance, null, [new StatusEffectAttr(newStatus)]));
                } else if (nextStep.type === 'dual' && !hasMultiStatus) {
                    const possibleNewStatuses = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.FREEZE].filter(s => s !== currentStatus);
                    const newStatus = Utils.randSeedItem(possibleNewStatuses);
                    const combinedStatuses = [currentStatus, newStatus];
                    const statusName1 = getStatusEffectName(currentStatus);
                    const statusName2 = getStatusEffectName(newStatus);
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, -nextStep.accCost, i18next.t("moveUpgrade:description:status:addSecondEffect", { chance: nextStep.chance, statusName1: statusName1, statusName2: statusName2, powerValue: nextStep.pCost }), nextStep.chance, null, [new MultiStatusEffectAttr(combinedStatuses)]));
                } else if (nextStep.type === 'guarantee') {
                    upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, -nextStep.accCost, i18next.t("moveUpgrade:description:status:guaranteeEffect", { powerValue: nextStep.pCost, accuracyValue: nextStep.accCost }), nextStep.chance, null, []));
                }
            }
        }

        const hasStatusEffect = statusEffectAttrs.length > 0;
        if (isStatusMove && !hasStatusEffect && !hasStatBoostSelf && !hasStatLowerTarget && !hasHealAttr) {
            const nextStep = STATUS_CHANGE_PATH[0];
            const statusesToAdd = [StatusEffect.PARALYSIS, StatusEffect.BURN, StatusEffect.POISON, StatusEffect.SLEEP, StatusEffect.TOXIC];
            const status = Utils.randSeedItem(statusesToAdd);
            const isSevereStatus = [StatusEffect.SLEEP, StatusEffect.TOXIC].includes(status);
            const accuracyPenalty = isSevereStatus ? 15 : 10;
            const currentAccForCalc = baseMoveAccuracy === -1 ? 100 : baseMoveAccuracy;
            const targetAcc = Math.max(50, currentAccForCalc - accuracyPenalty);
            const accuracyDelta = targetAcc - currentAccForCalc;
            const statusName = getStatusEffectName(status);
            upgrades.push(moveGenerator.getType(moveId, -nextStep.pCost, null, null, accuracyDelta, i18next.t("moveUpgrade:description:status:addStatusViaStatusMove", { statusName: statusName, accuracyValue: targetAcc }), 100, null, [new StatusEffectAttr(status)]));
        }

        const uniqueUpgrades = Array.from(new Map(upgrades.map(u => [(u).getDescription(scene), u])).values());
        return MoveUpgrade.shuffleArray(uniqueUpgrades);
    }
}