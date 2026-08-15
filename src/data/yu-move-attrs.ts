import Pokemon, { AttackMoveResult, MoveResult, HitResult } from "../field/pokemon";
import { tryMarkGrimMillerEncoreDisablePpZeroFlinch } from "./ability";
import { HitHealAttr, HealAttr, HealStatusEffectAttr, HpSplitAttr, Move, MoveAttr, MoveCategory, MoveEffectAttr, MoveEffectTrigger, MoveTarget, StatusEffectAttr, MultiStatusEffectAttr, VariableMoveTypeMultiplierAttr, VariableMoveTypeAttr, VariablePowerAttr, VariableAccuracyAttr, NativeTripleAccelPowerAttr, CurseAttr, MoveFlags, allMoves, ProtectAttr, ConfuseAttr, FlinchAttr, TrapAttr, StatChangeAttr, MultiHitAttr, MultiHitType, ReducePpMoveAttr, MovePowerMultiplierAttr, ChargeAttr, CounterDamageAttr, HighCritAttr, CritOnlyAttr, AddArenaTagAttr, AddArenaTrapTagAttr, AddBattlerTagAttr, ExposedMoveAttr, IgnoreAccuracyAttr, IgnoreOpponentStatChangesAttr, StealHeldItemChanceAttr, ForceSwitchOutAttr, RemoveHeldItemAttr, SuppressAbilitiesAttr, DisableMoveAttr, MoveConditionFunc, AbilityCopyAttr, ChangeTypeAttr, PartyStatusCureAttr, NeutralDamageAgainstFlyingTypeMultiplierAttr, IncrementMovePriorityAttr, ResetStatsAttr, InvertStatsAttr, DelayedAttackAttr, MatchHpAttr, DestinyBondAttr, FaintCountdownAttr, getMoveTargets } from "./move";
import { ChargeAnim } from "./battle-anims";
import { Type, getTypeDamageMultiplier } from "./type";
import {
  battlerTagTierKey,
  clearSecondaryTiers,
  setSecondaryTier,
  shouldSkipBaseSecondaryTier,
  shouldSkipGatedSecondaryTier,
  statTierKey,
  statusTierKey,
} from "./gated-secondary-tier";
import type { YuGateFunc } from "./yu-gates";
import { abilityContactProcGate, abilityProcGate, below25HpOncePerBattleGate, alwaysTrueGate, firstTurnOnlyGate, foeForGate, foeNotHitUserThisTurnGate, hasSubstituteGate, nightBiomeGate, totalStagesGte3Gate, trappedGate, userDamagedThisTurnGate, userItemlessGate } from "./yu-gates";
import { ArenaTagType } from "#enums/arena-tag-type";
import { ArenaTagSide } from "./arena-tag";
import { BattleStat } from "./battle-stat";
import { Stat } from "./pokemon-stat";
import { StatusEffect, isNonVolatileStatusEffect } from "./status-effect";
import { StatChangePhase } from "../phases/stat-change-phase";
import { WeatherType } from "./weather";
import { TerrainType } from "./terrain";

import { BattlerTagType } from "#enums/battler-tag-type";
import { Command } from "../ui/command-ui-handler";
import * as Utils from "../utils";
import { Abilities } from "#enums/abilities";
import { TimeOfDay } from "#enums/time-of-day";
import { PokemonHealPhase } from "../phases/pokemon-heal-phase";
import { PokemonHeldItemModifier, BerryModifier } from "../modifier/modifier";
import { BerryModifierType } from "#app/modifier/modifier-type";
import { BerryType } from "#enums/berry-type";
import { allAbilities, applyPostTurnAbAttrs, BlockNonDirectDamageAbAttr, PostTurnAbAttr, ReverseDrainAbAttr, triggerMagiciansCoinEffect } from "./ability";
import { SpeciesFormChangeRevertWeatherFormTrigger } from "./pokemon-forms";
import { PostSummonPhase } from "../phases/post-summon-phase";
import { MovePhase } from "../phases/move-phase";
import { BattlerIndex } from "../battle";
import { Moves } from "#enums/moves";
import i18next from "i18next";
import { getPokemonNameWithAffix } from "../messages";

const hasBareConfuseAttr = (move: Move) =>
  move.attrs.some(a => a instanceof ConfuseAttr && !(a instanceof ConditionalConfuseAttr) && !(a instanceof ConfuseOnHitAttr) && !(a instanceof FixedChanceSelfConfuseAttr));

const hasBareFlinchAttr = (move: Move) =>
  move.attrs.some(a => a instanceof FlinchAttr
    && !(a instanceof ConditionalFlinchAttr)
    && !(a instanceof FinalHitFlinchAttr)
    && !(a instanceof ConditionalFinalHitFlinchAttr));

const hasBareFinalHitFlinchAttr = (move: Move) =>
  move.attrs.some(a => a instanceof FinalHitFlinchAttr);

const hasBareTrapAttr = (move: Move) =>
  move.attrs.some(a => a instanceof TrapAttr
    && !(a instanceof ConditionalTrapAttr)
    && !(a instanceof FinalHitTrapAttr)
    && !(a instanceof ConditionalFinalHitTrapAttr));

const hasBareFinalHitTrapAttr = (move: Move) =>
  move.attrs.some(a => a instanceof FinalHitTrapAttr);

const hasBareAddBattlerTagAttrForType = (move: Move, tagType: BattlerTagType) =>
  move.attrs.some(a =>
    a instanceof AddBattlerTagAttr
    && !(a instanceof ConditionalAddBattlerTagAttr)
    && !(a instanceof GatedAddBattlerTagAttr)
    && !(a instanceof FinalHitAddBattlerTagAttr)
    && !(a instanceof GatedFinalHitAddBattlerTagAttr)
    && (a as AddBattlerTagAttr).tagType === tagType,
  );

const hasBareFinalHitAddBattlerTagAttrForType = (move: Move, tagType: BattlerTagType) =>
  move.attrs.some(a => a instanceof FinalHitAddBattlerTagAttr && a.tagType === tagType);

const hasBareStatChangeAttrForStat = (move: Move, stat: BattleStat) =>
  move.attrs.some(a =>
    a instanceof StatChangeAttr
    && !(a instanceof ConditionalStatChangeAttr)
    && !(a instanceof FinalHitStatChangeAttr)
    && !(a instanceof ConditionalFinalHitStatChangeAttr)
    && (a as StatChangeAttr).stats.includes(stat),
  );

const hasBareFinalHitStatChangeAttrForStat = (move: Move, stat: BattleStat) =>
  move.attrs.some(a => a instanceof FinalHitStatChangeAttr && a.stats.includes(stat));

const hasBareStatusEffectAttr = (move: Move) =>
  move.attrs.some(a => a instanceof StatusEffectAttr && !(a instanceof ConditionalStatusEffectAttr));

const hasBareStatusEffectAttrForEffect = (move: Move, effect: StatusEffect) =>
  move.attrs.some(a =>
    a instanceof StatusEffectAttr
    && !(a instanceof ConditionalStatusEffectAttr)
    && !(a instanceof FinalHitStatusEffectAttr)
    && !(a instanceof ConditionalFinalHitStatusEffectAttr)
    && (a as StatusEffectAttr).effect === effect,
  );

const hasBareFinalHitStatusEffectAttrForEffect = (move: Move, effect: StatusEffect) =>
  move.attrs.some(a => a instanceof FinalHitStatusEffectAttr && a.effect === effect);

const markSecondaryFamily = (user: Pokemon, key: string) => {
  if (!user.turnData.secondaryFamilyApplied) {
    user.turnData.secondaryFamilyApplied = {};
  }
  user.turnData.secondaryFamilyApplied[key] = true;
};

export function resolveGatedSecondaryTiers(user: Pokemon, target: Pokemon, move: Move): void {
  clearSecondaryTiers(user);
  for (const attr of move.attrs) {
    if ("resolveSecondaryTier" in attr && typeof (attr as { resolveSecondaryTier?: Function }).resolveSecondaryTier === "function") {
      (attr as { resolveSecondaryTier: (u: Pokemon, t: Pokemon, m: Move) => void }).resolveSecondaryTier(user, target, move);
    }
  }
}

const WEATHER_BY_TOKEN: Record<string, WeatherType> = {
  RAIN: WeatherType.RAIN,
  SUN: WeatherType.SUNNY,
  SAND: WeatherType.SANDSTORM,
  HAIL: WeatherType.HAIL,
  SNOW: WeatherType.SNOW,
};

const TERRAIN_BY_TOKEN: Record<string, TerrainType> = {
  GRASSY: TerrainType.GRASSY,
  ELECTRIC: TerrainType.ELECTRIC,
  PSYCHIC: TerrainType.PSYCHIC,
  MISTY: TerrainType.MISTY,
};

let _partyTagFlags: Record<string, MoveFlags> | null = null;
function getPartyTagFlags(): Record<string, MoveFlags> {
  if (!_partyTagFlags) {
    _partyTagFlags = {
      GADGET: MoveFlags.GADGET_MOVE,
      MAGNET: MoveFlags.MAGNET_MOVE,
      UNION: MoveFlags.UNION_MOVE,
    };
  }
  return _partyTagFlags;
}

const STAT_BY_TOKEN: Record<string, BattleStat> = {
  ATK: BattleStat.ATK,
  DEF: BattleStat.DEF,
  SPATK: BattleStat.SPATK,
  SPDEF: BattleStat.SPDEF,
  SPD: BattleStat.SPD,
  ACC: BattleStat.ACC,
  EVA: BattleStat.EVA,
};

const TYPE_BY_TOKEN: Record<string, Type> = {
  NORMAL: Type.NORMAL,
  FIGHTING: Type.FIGHTING,
  FLYING: Type.FLYING,
  POISON: Type.POISON,
  GROUND: Type.GROUND,
  ROCK: Type.ROCK,
  BUG: Type.BUG,
  GHOST: Type.GHOST,
  STEEL: Type.STEEL,
  FIRE: Type.FIRE,
  WATER: Type.WATER,
  GRASS: Type.GRASS,
  ELECTRIC: Type.ELECTRIC,
  PSYCHIC: Type.PSYCHIC,
  ICE: Type.ICE,
  DRAGON: Type.DRAGON,
  DARK: Type.DARK,
  FAIRY: Type.FAIRY,
};

export const isGatedHitHealAttr = (attr: MoveAttr): attr is GatedHitHealAttr =>
  attr instanceof HitHealAttr && (attr as GatedHitHealAttr).isGatedHitHeal === true;

export const hasBareHitHealAttr = (move: Move) =>
  move.attrs.some(a => a instanceof HitHealAttr && !isConditionalHitHealAttr(a) && !isGatedHitHealAttr(a));
export const hasSelfHpCostOnMove = (move: Move) =>
  move.attrs.some(a => a instanceof SelfHpCostAttr || a instanceof UserHpCostAttr);

export const isConditionalHitHealAttr = (attr: MoveAttr): attr is ConditionalHitHealAttr =>
  attr instanceof HitHealAttr && (attr as ConditionalHitHealAttr).isConditionalHitHeal === true;

export class ConditionalHitHealAttr extends HitHealAttr {
  readonly isConditionalHitHeal = true;
  private gatedRatio: number;
  private gate: YuGateFunc;

  constructor(baseRatio: number, gatedRatio: number, gate: YuGateFunc) {
    super(baseRatio);
    this.gatedRatio = gatedRatio;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (hasBareHitHealAttr(move)) {
      setSecondaryTier(user, "hitHeal", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = hasBareHitHealAttr(move);
    if (hasBareSibling) {
      if (shouldSkipGatedSecondaryTier(user, "hitHeal")) {
        return false;
      }
      if (shouldSkipBaseSecondaryTier(user, "hitHeal")) {
        const prior = this.healRatio;
        this.healRatio = this.gatedRatio;
        const ok = super.apply(user, target, move, args);
        this.healRatio = prior;
        return ok;
      }
      return false;
    }
    const ratio = this.gate(user, target, move) ? this.gatedRatio : this.healRatio;
    if (move.category === MoveCategory.STATUS) {
      return this.applyStatusDrainHeal(user, target, move, ratio);
    }
    const prior = this.healRatio;
    this.healRatio = ratio;
    const ok = super.apply(user, target, move, args);
    this.healRatio = prior;
    return ok;
  }
  private applyStatusDrainHeal(user: Pokemon, target: Pokemon, move: Move, ratio: number): boolean {
    const drainTarget = move.moveTarget === MoveTarget.USER ? user : target;
    let healAmount = Math.max(1, Utils.toDmgValue(drainTarget.getMaxHp() * ratio));
    let message = i18next.t("battle:drainMessage", { pokemonName: getPokemonNameWithAffix(drainTarget) });
    const reverseDrain = drainTarget.hasAbilityWithAttr(ReverseDrainAbAttr, false);
    if (reverseDrain) {
      if (user.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
        healAmount = 0;
        message = "";
      } else {
        user.turnData.damageTaken += healAmount;
        healAmount = healAmount * -1;
        message = "";
      }
    } else if (move.moveTarget !== MoveTarget.USER) {
      drainTarget.damageAndUpdate(healAmount, HitResult.OTHER, false, true, true);
      message = i18next.t("battle:regainHealth", { pokemonName: getPokemonNameWithAffix(user) });
    }
    if (healAmount > 0 && user.getTag(BattlerTagType.HEAL_BLOCKED)) {
      user.scene.queueMessage(i18next.t("battlerTags:healBlockedLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(user) }));
      return true;
    }
    if (healAmount > 0) {
      user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), healAmount, message, move.moveTarget === MoveTarget.USER, true));
    }
    return true;
  }
}

const hasBareHealAttr = (move: Move) =>
  move.attrs.some(a =>
    a instanceof HealAttr
    && !(a instanceof ConditionalSelfHealAttr)
    && !(a instanceof ConditionalHealAttr)
    && !(a instanceof HitHealAttr),
  );

export class ConditionalSelfHealAttr extends HealAttr {
  private normalRatio: number;
  private boostedRatio: number;
  private gate: YuGateFunc;

  constructor(normalRatio: number, boostedRatio: number, gate: YuGateFunc, showAnim?: boolean) {
    super(normalRatio, showAnim, true);
    this.normalRatio = normalRatio;
    this.boostedRatio = boostedRatio;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (hasBareHealAttr(move)) {
      setSecondaryTier(user, "selfHeal", this.gate(user, user, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = hasBareHealAttr(move);
    if (hasBareSibling) {
      if (shouldSkipGatedSecondaryTier(user, "selfHeal")) {
        return false;
      }
      if (shouldSkipBaseSecondaryTier(user, "selfHeal")) {
        this.addHealPhase(user, this.boostedRatio);
        return true;
      }
      return false;
    }
    const ratio = this.gate(user, user, move) ? this.boostedRatio : this.normalRatio;
    if (ratio <= 0) {
      return false;
    }
    this.addHealPhase(user, ratio);
    return true;
  }
}

export class GatedHitHealAttr extends HitHealAttr {
  readonly isGatedHitHeal = true;
  private gate: YuGateFunc;

  constructor(ratio: number, gate: YuGateFunc) {
    super(ratio);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}
export class GatedFinalHitHitHealAttr extends GatedHitHealAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!(user.turnData.hitsLeft === 1 && user.turnData.hitCount > 0)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class RemoveArenaTagAttr extends MoveEffectAttr {
  private tagType: ArenaTagType;
  private selfSideTarget: boolean;

  constructor(tagType: ArenaTagType, selfSideTarget = true) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.tagType = tagType;
    this.selfSideTarget = selfSideTarget;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const side = (this.selfSideTarget ? user : target).isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    user.scene.arena.removeTagOnSide(this.tagType, side);
    return true;
  }
}

export class RemoveArenaTagChanceAttr extends RemoveArenaTagAttr {
  private effectChance: integer;

  constructor(tagType: ArenaTagType, selfSideTarget: boolean, effectChance: integer) {
    super(tagType, selfSideTarget);
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.effectChance < 100 && user.randSeedInt(100) >= this.effectChance) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class AddMovePowerAttr extends VariablePowerAttr {
  private bonus: integer;
  private gate?: YuGateFunc;

  constructor(bonus: integer, gate?: YuGateFunc) {
    super();
    this.bonus = bonus;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return true;
    }
    (args[0] as Utils.NumberHolder).value += this.bonus;
    return true;
  }
}
export class GrantPendingMovePowerBonusAttr extends MoveEffectAttr {
  private bonus: integer;
  private gate?: YuGateFunc;

  constructor(bonus: integer, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.bonus = bonus;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return true;
    }
    user.summonData.pendingMovePowerBonus = this.bonus;
    return true;
  }
}
export class PendingMovePowerBonusAttr extends VariablePowerAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const bonus = user.summonData.pendingMovePowerBonus ?? 0;
    if (bonus <= 0) {
      return false;
    }
    (args[0] as Utils.NumberHolder).value += bonus;
    user.summonData.pendingMovePowerBonus = 0;
    return true;
  }
}

export class ResetTailwindFromStartAttr extends MoveEffectAttr {
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(effectChance: integer = -1, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.effectChance = effectChance;
    this.gate = gate;
  }

  isGatedInstance(): boolean {
    return this.gate !== undefined;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate) {
      setSecondaryTier(user, "resetTailwind", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const hasBareSibling = move.attrs.some(a => a instanceof ResetTailwindFromStartAttr && !a.isGatedInstance());
    if (this.gate && shouldSkipGatedSecondaryTier(user, "resetTailwind") && hasBareSibling) {
      return false;
    }
    if (!this.gate && shouldSkipBaseSecondaryTier(user, "resetTailwind")) {
      return false;
    }
    if (this.gate && !hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    const chance = this.effectChance >= 0 ? this.effectChance : move.chance;
    if (chance >= 0 && chance !== 100 && user.randSeedInt(100) >= chance) {
      return false;
    }
    const side = user.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    user.scene.arena.removeTagOnSide(ArenaTagType.TAILWIND, side);
    user.scene.arena.addTag(ArenaTagType.TAILWIND, 4, move.id, user.id, side);
    return true;
  }
}

export class LowerHighestStatAttr extends MoveEffectAttr {
  private levels: integer;
  private gate?: YuGateFunc;

  constructor(levels: integer, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.levels = levels;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate) {
      setSecondaryTier(user, "stat", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate && shouldSkipBaseSecondaryTier(user, "stat")) {
      return false;
    }
    if (this.gate && shouldSkipGatedSecondaryTier(user, "stat")) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const moveChance = this.getMoveChance(user, target, move, false, true);
    if (moveChance >= 0 && moveChance !== 100 && user.randSeedInt(100) >= moveChance) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    let highestStat = stats[0];
    let highestValue = target.summonData.battleStats[stats[0]];
    for (const stat of stats) {
      if (target.summonData.battleStats[stat] > highestValue) {
        highestValue = target.summonData.battleStats[stat];
        highestStat = stat;
      }
    }
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [highestStat], this.levels, true));
    return true;
  }
}

export class ConditionalStatusEffectAttr extends StatusEffectAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(effect: StatusEffect, gate: YuGateFunc, effectChance: integer) {
    super(effect, false);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, statusTierKey(this.effect), this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const statusKey = statusTierKey(this.effect);
    const hasBareSibling = hasBareStatusEffectAttrForEffect(move, this.effect)
      || hasBareFinalHitStatusEffectAttrForEffect(move, this.effect);
    if (!hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    if (shouldSkipGatedSecondaryTier(user, statusKey) && hasBareSibling) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (user.turnData.secondaryTierResolved?.[statusKey] === "gated"
        || !hasBareStatusEffectAttrForEffect(move, this.effect)) {
        move.chance = this.effectChance;
      }
      const result = super.apply(user, target, move, args);
      if (result) {
        markSecondaryFamily(user, statusKey);
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalMultiStatusEffectAttr extends MultiStatusEffectAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(effects: StatusEffect[], gate: YuGateFunc, effectChance: integer = 100) {
    super(effects);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "multiStatus", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (shouldSkipGatedSecondaryTier(user, "multiStatus")) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    this.effect = Utils.randSeedItem(this.effects);
    const result = super.apply(user, target, move, args);
    if (result) {
      markSecondaryFamily(user, "multiStatus");
    }
    return result;
  }
}

export class UserFaintCurseAttr extends MoveEffectAttr {
  constructor() {
    super(false, MoveEffectTrigger.POST_TARGET);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!user.isFainted()) {
      return false;
    }
    let curseTarget = target;
    if (!curseTarget) {
      curseTarget = user.getOpponent(user.getBattlerIndex());
    }
    if ((!curseTarget || curseTarget.isFainted()) && user.getLastXMoves(1).length) {
      const opponent = user.getOpponent(user.getBattlerIndex());
      if (opponent && !opponent.isFainted()) {
        curseTarget = opponent;
      }
    }
    if (!curseTarget || curseTarget.isFainted()) {
      return false;
    }
    if (curseTarget.getTag(BattlerTagType.CURSED)) {
      user.scene.queueMessage(i18next.t("battle:attackFailed"));
      return false;
    }
    user.scene.queueMessage(
      i18next.t("battlerTags:cursedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(user),
        pokemonName: getPokemonNameWithAffix(curseTarget),
      }),
    );
    curseTarget.addTag(BattlerTagType.CURSED, 0, move.id, user.id);
    return true;
  }
}

export class IgnoreTypeResistancesAttr extends VariableMoveTypeMultiplierAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const multiplier = args[0] as Utils.NumberHolder;
    if (multiplier.value > 0 && multiplier.value < 1) {
      multiplier.value = 1;
      return true;
    }
    return false;
  }
}

const isMoveEffectTriggerArg = (v: unknown): v is MoveEffectTrigger =>
  typeof v === "number"
  && v >= MoveEffectTrigger.PRE_APPLY
  && v <= MoveEffectTrigger.POST_ATTACK;

export class RandomStatBoostAttr extends MoveEffectAttr {
  private levels: integer;
  private effectChance: integer;
  private gate?: YuGateFunc;
  private statCount: integer;

  constructor(
    levelsOrCount: integer,
    effectChanceOrLevels: integer = 100,
    gateOrChance?: YuGateFunc | integer,
    maybeGateOrTrigger?: YuGateFunc | MoveEffectTrigger,
    trigger: MoveEffectTrigger = MoveEffectTrigger.POST_APPLY,
  ) {
    let resolvedTrigger = trigger;
    let resolvedMaybeGate: YuGateFunc | undefined;
    if (isMoveEffectTriggerArg(maybeGateOrTrigger)) {
      resolvedTrigger = maybeGateOrTrigger;
    } else if (typeof maybeGateOrTrigger === "function") {
      resolvedMaybeGate = maybeGateOrTrigger;
    }
    super(true, resolvedTrigger);
    if (typeof gateOrChance === "number" && effectChanceOrLevels <= 6 && levelsOrCount >= 2 && gateOrChance <= 100) {
      this.statCount = levelsOrCount;
      this.levels = effectChanceOrLevels;
      this.effectChance = gateOrChance;
      this.gate = resolvedMaybeGate;
    } else {
      this.levels = levelsOrCount;
      this.effectChance = effectChanceOrLevels;
      this.gate = typeof gateOrChance === "function" ? gateOrChance : resolvedMaybeGate;
      this.statCount = 1;
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const moveChance = this.effectChance;
    if (moveChance >= 0 && moveChance !== 100 && user.randSeedInt(100) >= moveChance) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    for (let i = 0; i < this.statCount; i++) {
      const stat = stats[user.randSeedInt(stats.length)];
      user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [stat], this.levels));
    }
    return true;
  }
}

export class ResetWeatherFromStartAttr extends MoveEffectAttr {
  private weatherType: WeatherType;
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(weatherToken: string, effectChance: integer = 100, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.weatherType = WEATHER_BY_TOKEN[weatherToken.toUpperCase()] ?? WeatherType.NONE;
    this.effectChance = effectChance;
    this.gate = gate;
  }

  isGatedInstance(): boolean {
    return this.gate !== undefined;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate) {
      setSecondaryTier(user, "resetWeather", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = move.attrs.some(a => a instanceof ResetWeatherFromStartAttr && !a.isGatedInstance());
    if (this.gate && shouldSkipGatedSecondaryTier(user, "resetWeather") && hasBareSibling) {
      return false;
    }
    if (!this.gate && shouldSkipBaseSecondaryTier(user, "resetWeather")) {
      return false;
    }
    if (this.gate && !hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    const moveChance = this.effectChance;
    if (moveChance >= 0 && moveChance !== 100 && user.randSeedInt(100) >= moveChance) {
      return false;
    }
    const arena = user.scene.arena;
    if (arena.weather?.weatherType === this.weatherType) {
      arena.trySetWeather(WeatherType.NONE, true);
    }
    return arena.trySetWeather(this.weatherType, true);
  }
}

export class ClimateShiftToggleAttr extends MoveEffectAttr {
  constructor() {
    super(false, MoveEffectTrigger.POST_APPLY);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const arena = user.scene.arena;
    const current = arena.weather?.weatherType ?? WeatherType.NONE;
    let next: WeatherType;
    if (current === WeatherType.RAIN || current === WeatherType.HEAVY_RAIN) {
      next = WeatherType.SUNNY;
    } else if (current === WeatherType.SUNNY || current === WeatherType.HARSH_SUN) {
      next = WeatherType.RAIN;
    } else {
      next = WeatherType.RAIN;
    }
    if (arena.weather?.weatherType === next) {
      arena.trySetWeather(WeatherType.NONE, true);
    }
    return arena.trySetWeather(next, true);
  }
}

export class ResetTerrainFromStartAttr extends MoveEffectAttr {
  private terrainType: TerrainType;
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(terrainToken: string, effectChance: integer = 100, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.terrainType = TERRAIN_BY_TOKEN[terrainToken.toUpperCase()] ?? TerrainType.NONE;
    this.effectChance = effectChance;
    this.gate = gate;
  }

  isGatedInstance(): boolean {
    return this.gate !== undefined;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate) {
      setSecondaryTier(user, "resetTerrain", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = move.attrs.some(a => a instanceof ResetTerrainFromStartAttr && !a.isGatedInstance());
    if (this.gate && shouldSkipGatedSecondaryTier(user, "resetTerrain") && hasBareSibling) {
      return false;
    }
    if (!this.gate && shouldSkipBaseSecondaryTier(user, "resetTerrain")) {
      return false;
    }
    if (this.gate && !hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    const moveChance = this.effectChance;
    if (moveChance >= 0 && moveChance !== 100 && user.randSeedInt(100) >= moveChance) {
      return false;
    }
    const arena = user.scene.arena;
    if (arena.terrain?.terrainType === this.terrainType) {
      arena.trySetTerrain(TerrainType.NONE, true, true);
    }
    return arena.trySetTerrain(this.terrainType, true, true);
  }
}

export class ContactStatDropAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private levels: integer;

  constructor(statToken: string, levels: integer) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.stat = STAT_BY_TOKEN[statToken.toUpperCase()] ?? BattleStat.ATK;
    this.levels = levels;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    return super.apply(user, target, move, args);
  }

  dropStatOnProtectedContact(defender: Pokemon, attacker: Pokemon, foeMove: Move): boolean {
    if (!foeMove.checkFlag(MoveFlags.MAKES_CONTACT, attacker, defender)) {
      return false;
    }
    defender.scene.unshiftPhase(new StatChangePhase(defender.scene, attacker.getBattlerIndex(), false, [this.stat], this.levels));
    return true;
  }
}

export function applyDefenderContactStatDropOnProtect(defender: Pokemon, attacker: Pokemon, foeMove: Move): void {
  const last = defender.getLastXMoves(1)[0];
  if (!last || last.result !== MoveResult.SUCCESS) {
    return;
  }
  const defMove = allMoves[last.move];
  if (!defMove?.hasAttr(ProtectAttr)) {
    return;
  }
  for (const attr of defMove.attrs) {
    if (attr instanceof ContactStatDropAttr) {
      attr.dropStatOnProtectedContact(defender, attacker, foeMove);
    }
  }
}

export class SelfHpCostAttr extends MoveEffectAttr {
  private hpRatio: number;
  private gatedRatio?: number;
  private gate?: YuGateFunc;

  constructor(hpRatio: number, gate?: YuGateFunc, gatedRatio?: number) {
    super(true, MoveEffectTrigger.PRE_APPLY);
    this.hpRatio = hpRatio;
    this.gate = gate;
    this.gatedRatio = gatedRatio;
  }

  isGatedInstance(): boolean {
    return this.gate !== undefined && this.gatedRatio !== undefined;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate && this.gatedRatio !== undefined) {
      setSecondaryTier(user, "hpCost", this.gate(user, target, move));
      return;
    }
    const bare = move.attrs.some(a => a instanceof SelfHpCostAttr && !a.isGatedInstance());
    if (bare && this.gate) {
      setSecondaryTier(user, "hpCost", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && this.gatedRatio === undefined && !this.gate(user, target, move)) {
      return false;
    }
    const hasBareSibling = move.attrs.some(a => a instanceof SelfHpCostAttr && !a.isGatedInstance());
    if (this.isGatedInstance() && shouldSkipGatedSecondaryTier(user, "hpCost") && hasBareSibling) {
      return false;
    }
    if (!this.isGatedInstance() && shouldSkipBaseSecondaryTier(user, "hpCost")) {
      return false;
    }
    if (!this.isGatedInstance() && this.gate && hasBareSibling) {
      if (shouldSkipGatedSecondaryTier(user, "hpCost")) {
        return false;
      }
      if (!shouldSkipBaseSecondaryTier(user, "hpCost")) {
        return false;
      }
    }
    let ratio = this.hpRatio;
    if (this.isGatedInstance() && this.gate!(user, target, move)) {
      ratio = this.gatedRatio!;
    } else if (this.isGatedInstance() && hasBareSibling) {
      return false;
    }
    const hpCost = Utils.toDmgValue(user.getMaxHp() * ratio);
    if (hpCost <= 0 || user.hp <= hpCost) {
      return false;
    }
    user.damageAndUpdate(hpCost, HitResult.OTHER, false, true, true);
    return true;
  }
}

export class GatedSubstituteAttr extends MoveEffectAttr {
  private hpRatio: number;
  private gatedRatio?: number;
  private gate?: YuGateFunc;

  constructor(hpRatio: number = 0.25, gate?: YuGateFunc, gatedRatio?: number) {
    super(true);
    this.hpRatio = hpRatio;
    this.gate = gate;
    this.gatedRatio = gatedRatio;
  }

  isGatedInstance(): boolean {
    return this.gate !== undefined && this.gatedRatio !== undefined;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate && this.gatedRatio !== undefined) {
      setSecondaryTier(user, "hpCost", this.gate(user, target, move));
      return;
    }
    const bare = move.attrs.some(a => a instanceof GatedSubstituteAttr && !a.isGatedInstance());
    if (bare && this.gate) {
      setSecondaryTier(user, "hpCost", this.gate(user, target, move));
    }
  }

  private resolveHpRatio(user: Pokemon, target: Pokemon, move: Move): number | null {
    const hasBareSibling = move.attrs.some(a => a instanceof GatedSubstituteAttr && !a.isGatedInstance());
    if (this.gate && this.gatedRatio === undefined && !this.gate(user, target, move)) {
      return null;
    }
    if (this.isGatedInstance() && shouldSkipGatedSecondaryTier(user, "hpCost") && hasBareSibling) {
      return null;
    }
    if (!this.isGatedInstance() && shouldSkipBaseSecondaryTier(user, "hpCost")) {
      return null;
    }
    if (!this.isGatedInstance() && this.gate && hasBareSibling) {
      if (shouldSkipGatedSecondaryTier(user, "hpCost")) {
        return null;
      }
      if (!shouldSkipBaseSecondaryTier(user, "hpCost")) {
        return null;
      }
    }
    let ratio = this.hpRatio;
    if (this.isGatedInstance() && this.gate!(user, target, move)) {
      ratio = this.gatedRatio!;
    } else if (this.isGatedInstance() && hasBareSibling) {
      return null;
    }
    return ratio;
  }

  private minAffordableRatio(user: Pokemon, target: Pokemon, move: Move): number {
    let ratio = this.hpRatio;
    for (const attr of move.attrs) {
      if (attr instanceof GatedSubstituteAttr && attr.isGatedInstance() && attr.gate!(user, target, move)) {
        ratio = Math.min(ratio, attr.gatedRatio!);
      }
    }
    return ratio;
  }

  getCondition(): MoveConditionFunc {
    return (user, target, move) => {
      if (user.getTag(BattlerTagType.SUBSTITUTE)) {
        return false;
      }
      const ratio = this.minAffordableRatio(user, target ?? user, move);
      const hpCost = Utils.toDmgValue(user.getMaxHp() * ratio);
      return hpCost > 0 && user.hp > hpCost;
    };
  }

  getFailedText(user: Pokemon): string | undefined {
    if (user.getTag(BattlerTagType.SUBSTITUTE)) {
      return i18next.t("moveTriggers:substituteOnOverlap", { pokemonName: getPokemonNameWithAffix(user) });
    }
    return undefined;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const ratio = this.resolveHpRatio(user, target, move);
    if (ratio === null) {
      return false;
    }
    const hpCost = Utils.toDmgValue(user.getMaxHp() * ratio);
    if (hpCost <= 0 || user.hp <= hpCost) {
      return false;
    }
    user.damageAndUpdate(hpCost, HitResult.OTHER, false, true, true);
    user.addTag(BattlerTagType.SUBSTITUTE, 0, move.id, user.id);
    return true;
  }
}

export class HighestStatChangeAttr extends MoveEffectAttr {
  private levels: integer;
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(levels: integer, effectChance: integer = 100, gate?: YuGateFunc, selfTarget: boolean = false) {
    super(selfTarget, MoveEffectTrigger.HIT);
    this.levels = levels;
    this.effectChance = effectChance;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const moveChance = this.effectChance;
    if (moveChance >= 0 && moveChance !== 100 && user.randSeedInt(100) >= moveChance) {
      return false;
    }
    const subject = this.selfTarget ? user : target;
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    let highestStat = stats[0];
    let highestValue = subject.summonData.battleStats[stats[0]];
    for (const stat of stats) {
      if (subject.summonData.battleStats[stat] > highestValue) {
        highestValue = subject.summonData.battleStats[stat];
        highestStat = stat;
      }
    }
    user.scene.unshiftPhase(new StatChangePhase(user.scene, subject.getBattlerIndex(), false, [highestStat], this.levels));
    return true;
  }
}

export class PartyTagCountPowerAttr extends VariablePowerAttr {
  private tagFlag: MoveFlags | null;
  private bpPerAlly: integer;
  private gate?: YuGateFunc;

  constructor(tagToken: string, bpPerAlly: integer, gate?: YuGateFunc) {
    super();
    this.tagFlag = getPartyTagFlags()[tagToken.toUpperCase()] ?? null;
    this.bpPerAlly = bpPerAlly;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const party = user.isPlayer() ? user.scene.getParty() : user.scene.getEnemyParty();
    let count = 0;
    for (const ally of party) {
      if (ally === user || ally.isFainted()) {
        continue;
      }
      if (this.tagFlag && !ally.getMoveset(true).some(m => m?.getMove().hasFlag(this.tagFlag!))) {
        continue;
      }
      count++;
    }
    (args[0] as Utils.NumberHolder).value += count * this.bpPerAlly;
    return true;
  }
}

export class AbilityTriggerCountPowerAttr extends VariablePowerAttr {
  private bpPerProc: integer;

  constructor(bpPerProc: integer) {
    super();
    this.bpPerProc = bpPerProc;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const procs = user.battleData.abilityProcsThisBattle ?? 0;
    (args[0] as Utils.NumberHolder).value += procs * this.bpPerProc;
    return true;
  }
}

export class SpAtkStageCountPowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;

  constructor(bpPerStage: integer = 10) {
    super();
    this.bpPerStage = bpPerStage;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const stages = Math.max(0, user.summonData.battleStats[BattleStat.SPATK]);
    (args[0] as Utils.NumberHolder).value = move.power + stages * this.bpPerStage;
    return true;
  }
}
export class GatedFlatPowerBonusAttr extends VariablePowerAttr {
  private bonus: integer;
  private gate: YuGateFunc;

  constructor(bonus: integer, gate: YuGateFunc) {
    super();
    this.bonus = bonus;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate(user, target, move)) {
      (args[0] as Utils.NumberHolder).value += this.bonus;
    }
    return true;
  }
}

export class FaintedAllyCountPowerAttr extends VariablePowerAttr {
  private bpPerAlly: integer;
  private cap?: integer;
  private gate?: YuGateFunc;

  constructor(bpPerAlly: integer, capOrGate?: integer | YuGateFunc, gate?: YuGateFunc) {
    super();
    this.bpPerAlly = bpPerAlly;
    if (typeof capOrGate === "function") {
      this.gate = capOrGate;
    } else {
      this.cap = capOrGate;
      this.gate = gate;
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const party = user.isPlayer() ? user.scene.getParty() : user.scene.getEnemyParty();
    let fainted = 0;
    for (const ally of party) {
      if (ally !== user && ally.isFainted()) {
        fainted++;
      }
    }
    let bonus = fainted * this.bpPerAlly;
    if (this.cap != null) {
      bonus = Math.min(bonus, this.cap);
    }
    (args[0] as Utils.NumberHolder).value += bonus;
    return true;
  }
}

export class StealHighestStatStageAttr extends MoveEffectAttr {
  private fixedStat?: BattleStat;
  private gate?: YuGateFunc;

  constructor(statOrGate?: string | YuGateFunc, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    if (typeof statOrGate === "function") {
      this.gate = statOrGate;
    } else if (statOrGate && STAT_BY_TOKEN[statOrGate.toUpperCase()]) {
      this.fixedStat = STAT_BY_TOKEN[statOrGate.toUpperCase()];
      this.gate = gate;
    } else {
      this.gate = gate;
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    let highestStat = this.fixedStat ?? stats[0];
    if (!this.fixedStat) {
      let highestValue = 0;
      for (const stat of stats) {
        const stage = target.summonData.battleStats[stat];
        if (stage > 0 && stage > highestValue) {
          highestValue = stage;
          highestStat = stat;
        }
      }
      if (highestValue <= 0) {
        return true;
      }
    } else if (target.summonData.battleStats[highestStat] <= 0) {
      return true;
    }
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [highestStat], -1));
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [highestStat], 1));
    return true;
  }
}

export class StealRandomPositiveStatAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  private effectChance: integer;

  constructor(gateOrChance?: YuGateFunc | integer, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    if (typeof gateOrChance === "number") {
      this.effectChance = gateOrChance;
      this.gate = gate;
    } else {
      this.effectChance = 100;
      this.gate = gateOrChance;
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance < 100 && user.randSeedInt(100) >= this.effectChance) {
      return true;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const positives = stats.filter(s => target.summonData.battleStats[s] > 0);
    if (!positives.length) {
      return true;
    }
    const stat = positives[user.randSeedInt(positives.length)];
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [stat], -1));
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [stat], 1));
    return true;
  }
}

export class SnapshotFoeStatusBeforeMoveAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    user.turnData.foeStatusSnapshot = target.status?.effect;
    return true;
  }
}

export class StatChangeIfFoeGainedStatusThisAttackAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private levels: integer;

  constructor(stat: BattleStat = BattleStat.SPD, levels: integer = -1) {
    super(false, MoveEffectTrigger.POST_TARGET);
    this.stat = stat;
    this.levels = levels;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const prior = user.turnData.foeStatusSnapshot;
    const current = target.status?.effect;
    if (!current || prior === current) {
      return true;
    }
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [this.stat], this.levels));
    return true;
  }
}

export class PostVictoryRandomStatBoostAttr extends MoveEffectAttr {
  private levels: integer;
  private statCount: integer;
  private gate?: YuGateFunc;

  constructor(levels: integer, statCount: integer, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_TARGET);
    this.levels = levels;
    this.statCount = statCount;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!target.isFainted()) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const picks = Math.min(this.statCount, pool.length);
    for (let i = 0; i < picks; i++) {
      const stat = pool.splice(user.randSeedInt(pool.length), 1)[0];
      user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [stat], this.levels));
    }
    return true;
  }
}
export class FixedChanceSelfConfuseAttr extends ConfuseAttr {
  private effectChance: integer;

  constructor(effectChance: integer) {
    super(true);
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.canApply(user, target, move, args)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    return user.addTag(
      BattlerTagType.CONFUSED,
      user.randSeedInt(this.turnCountMax - this.turnCountMin, this.turnCountMin),
      move.id,
      user.id,
    );
  }
}

export class ConditionalConfuseAttr extends ConfuseAttr {
  private gate?: YuGateFunc;
  private effectChance: integer;

  constructor(effectChance: integer, gate?: YuGateFunc) {
    super(false);
    this.effectChance = effectChance;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate) {
      setSecondaryTier(user, "confuse", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !hasBareConfuseAttr(move) && !this.gate(user, target, move)) {
      return false;
    }
    if (this.gate && shouldSkipGatedSecondaryTier(user, "confuse") && hasBareConfuseAttr(move)) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (this.gate && (user.turnData.secondaryTierResolved?.confuse === "gated" || !hasBareConfuseAttr(move))) {
        move.chance = this.effectChance;
      }
      const result = super.apply(user, target, move, args);
      if (result) {
        markSecondaryFamily(user, "confuse");
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalFlinchAttr extends FlinchAttr {
  private gate?: YuGateFunc;
  private effectChance: integer;

  constructor(effectChance: integer, gate?: YuGateFunc) {
    super();
    this.effectChance = effectChance;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate) {
      setSecondaryTier(user, "flinch", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = hasBareFlinchAttr(move) || hasBareFinalHitFlinchAttr(move);
    if (this.gate && !hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    if (this.gate && shouldSkipGatedSecondaryTier(user, "flinch") && hasBareSibling) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (this.gate && (user.turnData.secondaryTierResolved?.flinch === "gated" || !hasBareSibling)) {
        move.chance = this.effectChance;
      }
      const result = super.apply(user, target, move, args);
      if (result) {
        markSecondaryFamily(user, "flinch");
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalAddBattlerTagAttr extends AddBattlerTagAttr {
  private gate: YuGateFunc;
  private tagChance: integer;

  constructor(
    tagType: BattlerTagType,
    selfTarget: boolean,
    failOnOverlap: boolean,
    gate: YuGateFunc,
    tagChance: integer,
  ) {
    super(tagType, selfTarget, failOnOverlap);
    this.gate = gate;
    this.tagChance = tagChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    const tierKey = battlerTagTierKey(this.tagType);
    if (tierKey) {
      setSecondaryTier(user, tierKey, this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const tierKey = battlerTagTierKey(this.tagType);
    if (!hasBareAddBattlerTagAttrForType(move, this.tagType) && !this.gate(user, target, move)) {
      return false;
    }
    if (tierKey && shouldSkipGatedSecondaryTier(user, tierKey) && hasBareAddBattlerTagAttrForType(move, this.tagType)) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (tierKey && (user.turnData.secondaryTierResolved?.[tierKey] === "gated" || !hasBareAddBattlerTagAttrForType(move, this.tagType))) {
        move.chance = this.tagChance;
      }
      const result = super.apply(user, target, move, args);
      if (result && tierKey) {
        markSecondaryFamily(user, tierKey);
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalMultiHitAttr extends MultiHitAttr {
  private baseType: MultiHitType;
  private gatedType: MultiHitType;
  private gate: YuGateFunc;

  constructor(baseType: MultiHitType, gatedType: MultiHitType, gate: YuGateFunc) {
    super(baseType);
    this.baseType = baseType;
    this.gatedType = gatedType;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "multiHit", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBare = move.attrs.some(a => a instanceof MultiHitAttr && !(a instanceof ConditionalMultiHitAttr));
    if (hasBare) {
      if (shouldSkipGatedSecondaryTier(user, "multiHit")) {
        return false;
      }
      if (user.turnData.secondaryTierResolved?.multiHit !== "gated") {
        return false;
      }
      this.setMultiHitType(this.gatedType);
      return super.apply(user, target, move, args);
    }
    if (!this.gate(user, target, move)) {
      if (this.baseType === this.gatedType) {
        (args[0] as Utils.NumberHolder).value = 1;
        return true;
      }
      this.setMultiHitType(this.baseType);
      return super.apply(user, target, move, args);
    }
    this.setMultiHitType(this.gatedType);
    return super.apply(user, target, move, args);
  }
}
export class GatedMultiHitAttr extends MultiHitAttr {
  private gatedHitType: MultiHitType;
  private gate: YuGateFunc;

  constructor(hitType: MultiHitType, gate: YuGateFunc) {
    super(hitType);
    this.gatedHitType = hitType;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      (args[0] as Utils.NumberHolder).value = 1;
      return true;
    }
    this.setMultiHitType(this.gatedHitType);
    return super.apply(user, target, move, args);
  }
}

export class ChanceMultiHitAttr extends MultiHitAttr {
  private chanceHitType: MultiHitType;
  private hitChance: integer;

  constructor(hitType: MultiHitType, hitChance: integer) {
    super(hitType);
    this.chanceHitType = hitType;
    this.hitChance = hitChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (shouldSkipBaseSecondaryTier(user, "multiHit")) {
      return false;
    }
    if (user.randSeedInt(100) >= this.hitChance) {
      (args[0] as Utils.NumberHolder).value = 1;
      return true;
    }
    this.setMultiHitType(this.chanceHitType);
    return super.apply(user, target, move, args);
  }
}

export class BonusHealIfTargetHasTagAttr extends MoveEffectAttr {
  protected tagType: BattlerTagType;
  protected bonusRatio: number;

  constructor(tagType: BattlerTagType, bonusRatio: number) {
    super(false, MoveEffectTrigger.HIT);
    this.tagType = tagType;
    this.bonusRatio = bonusRatio;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!target.getTag(this.tagType)) {
      return true;
    }
    user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * this.bonusRatio), "", true, true));
    return true;
  }
}

export class ConditionalBonusHealIfTargetHasTagAttr extends BonusHealIfTargetHasTagAttr {
  private gate: YuGateFunc;

  constructor(tagType: BattlerTagType, bonusRatio: number, gate: YuGateFunc) {
    super(tagType, bonusRatio);
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "bonusHeal", this.gate(user, target, move) && !!target.getTag(this.tagType));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!MoveEffectAttr.prototype.apply.call(this, user, target, move, args)) {
      return false;
    }
    if (!target.getTag(this.tagType)) {
      return true;
    }
    if (shouldSkipGatedSecondaryTier(user, "bonusHeal")) {
      return true;
    }
    if (!this.gate(user, target, move)) {
      return true;
    }
    user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * this.bonusRatio), "", true, true));
    return true;
  }
}

export class SuperEffectiveTypeMorphAttr extends VariableMoveTypeAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const moveType = args[0];
    if (!(moveType instanceof Utils.NumberHolder)) {
      return false;
    }
    const targetTypes = target.getTypes(true);
    let bestType = move.type;
    let bestMult = 0;
    for (let t = Type.NORMAL; t <= Type.FAIRY; t++) {
      let mult = 1;
      for (const defType of targetTypes) {
        mult *= getTypeDamageMultiplier(t, defType);
      }
      if (mult >= 2 && mult > bestMult) {
        bestMult = mult;
        bestType = t;
      }
    }
    if (bestMult >= 2) {
      moveType.value = bestType;
      return true;
    }
    return false;
  }
}

export class ConditionalTrapAttr extends TrapAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(tagType: BattlerTagType, effectChance: integer, gate: YuGateFunc, trigger?: MoveEffectTrigger) {
    super(tagType);
    const resolvedTrigger = trigger ?? (
      gate === abilityProcGate ? MoveEffectTrigger.POST_ATTACK
        : MoveEffectTrigger.POST_APPLY
    );
    (this as MoveEffectAttr).trigger = resolvedTrigger;
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "trap", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const trapTarget = move.moveTarget === MoveTarget.USER ? foeForGate(user, target) : target;
    const hasBareSibling = hasBareTrapAttr(move) || hasBareFinalHitTrapAttr(move);
    if (!hasBareSibling && !this.gate(user, trapTarget, move)) {
      return false;
    }
    if (shouldSkipGatedSecondaryTier(user, "trap") && hasBareSibling) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (user.turnData.secondaryTierResolved?.trap === "gated" || !hasBareSibling) {
        move.chance = this.effectChance;
      }
      const result = super.apply(user, trapTarget, move, args);
      if (result) {
        markSecondaryFamily(user, "trap");
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalStatChangeAttr extends StatChangeAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(stats: BattleStat | BattleStat[], levels: integer, selfTarget: boolean, gate: YuGateFunc, effectChance: integer) {
    super(stats, levels, selfTarget, null, true);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    const gatePass = this.gate(user, target, move);
    for (const stat of this.stats) {
      setSecondaryTier(user, statTierKey(stat), gatePass);
    }
    const hasOtherBareStatAttrs = move.attrs.some(a => a instanceof StatChangeAttr && !(a instanceof ConditionalStatChangeAttr)
      && !(a instanceof FinalHitStatChangeAttr) && !(a instanceof ConditionalFinalHitStatChangeAttr));
    if (this.stats.every(s => !hasBareStatChangeAttrForStat(move, s) && !hasBareFinalHitStatChangeAttrForStat(move, s))
      && !hasOtherBareStatAttrs) {
      setSecondaryTier(user, "stat", gatePass);
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean | Promise<boolean> {
    const primaryStat = this.stats[0];
    const perStatKey = statTierKey(primaryStat);
    const hasOtherBareStatAttrs = move.attrs.some(a => a instanceof StatChangeAttr && !(a instanceof ConditionalStatChangeAttr)
      && !(a instanceof FinalHitStatChangeAttr) && !(a instanceof ConditionalFinalHitStatChangeAttr));
    const usePerStat = hasBareStatChangeAttrForStat(move, primaryStat)
      || hasBareFinalHitStatChangeAttrForStat(move, primaryStat)
      || (!hasBareStatChangeAttrForStat(move, primaryStat) && !hasBareFinalHitStatChangeAttrForStat(move, primaryStat) && hasOtherBareStatAttrs);
    const hasBareSibling = usePerStat
      ? (hasBareStatChangeAttrForStat(move, primaryStat) || hasBareFinalHitStatChangeAttrForStat(move, primaryStat))
      : move.attrs.some(a => a instanceof StatChangeAttr && !(a instanceof ConditionalStatChangeAttr)
        && !(a instanceof FinalHitStatChangeAttr) && !(a instanceof ConditionalFinalHitStatChangeAttr));
    const tierKey = usePerStat ? perStatKey : "stat";
    if (!hasBareSibling) {
      if (shouldSkipGatedSecondaryTier(user, tierKey)) {
        return false;
      }
    } else {
      if (usePerStat && shouldSkipGatedSecondaryTier(user, perStatKey)) {
        return false;
      }
      if (!usePerStat && shouldSkipGatedSecondaryTier(user, "stat") && move.attrs.some(a => a instanceof StatChangeAttr && !(a instanceof ConditionalStatChangeAttr))) {
        return false;
      }
    }
    const originalChance = move.chance;
    try {
      const tier = user.turnData.secondaryTierResolved?.[tierKey];
      if (!hasBareSibling) {
        if (tier !== "gated") {
          return false;
        }
        move.chance = this.effectChance;
      } else if (tier === "gated") {
        move.chance = this.effectChance;
      }
      const result = super.apply(user, target, move, args);
      if (result) {
        if (usePerStat) {
          markSecondaryFamily(user, perStatKey);
        } else {
          markSecondaryFamily(user, "stat");
        }
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}
export class AlternativeBreathGatedAllStatDropAttr extends MoveEffectAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(gate: YuGateFunc, effectChance: integer = 30) {
    super(false, MoveEffectTrigger.HIT);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    const hasBareSibling = move.attrs.some(
      a => a instanceof StatChangeAttr
        && !(a instanceof ConditionalStatChangeAttr)
        && !(a instanceof FinalHitStatChangeAttr)
        && !(a instanceof ConditionalFinalHitStatChangeAttr),
    );
    if (hasBareSibling) {
      setSecondaryTier(user, "stat", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const hasBareSibling = move.attrs.some(
      a => a instanceof StatChangeAttr
        && !(a instanceof ConditionalStatChangeAttr)
        && !(a instanceof FinalHitStatChangeAttr)
        && !(a instanceof ConditionalFinalHitStatChangeAttr),
    );
    if (shouldSkipGatedSecondaryTier(user, "stat") && hasBareSibling) {
      return false;
    }
    if (!hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    const tier = user.turnData.secondaryTierResolved?.stat;
    if (hasBareSibling && tier !== "gated") {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      markSecondaryFamily(user, "stat");
      return false;
    }
    const stats = [
      BattleStat.ATK,
      BattleStat.DEF,
      BattleStat.SPATK,
      BattleStat.SPDEF,
      BattleStat.SPD,
      BattleStat.ACC,
      BattleStat.EVA,
    ];
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, stats, -1, true));
    markSecondaryFamily(user, "stat");
    return true;
  }
}
export class ConditionalPostAttackStatChangeAttr extends StatChangeAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(stats: BattleStat | BattleStat[], levels: integer, selfTarget: boolean, gate: YuGateFunc, effectChance: integer) {
    super(stats, levels, selfTarget, null, true, false, MoveEffectTrigger.POST_ATTACK);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean | Promise<boolean> {
    if (!MoveEffectAttr.prototype.apply.call(this, user, target, move, args) || !this.gate(user, target, move)) {
      return false;
    }
    const originalChance = move.chance;
    try {
      move.chance = this.effectChance;
      const moveChance = this.getMoveChance(user, target, move, this.selfTarget, true);
      if (moveChance >= 0 && moveChance !== 100 && user.randSeedInt(100) >= moveChance) {
        return false;
      }
      const levels = this.getLevels(user);
      user.scene.unshiftPhase(new StatChangePhase(user.scene, (this.selfTarget ? user : target).getBattlerIndex(), this.selfTarget, this.stats, levels, true));
      markSecondaryFamily(user, "stat");
      return true;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class HealBlockAttr extends MoveEffectAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const foe = foeForGate(user, target);
    if (!this.gate(user, foe, move)) {
      return false;
    }
    return foe.addTag(BattlerTagType.HEAL_BLOCKED, 5, move.id, user.id);
  }
}

export class ItemBlockAttr extends MoveEffectAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    return target.addTag(BattlerTagType.ITEM_BLOCKED, 5, move.id, user.id);
  }
}

export class CritSnapshotAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.HIT);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const received = target.turnData.attacksReceived;
    const hit =
      received.find(r => r.sourceId === user.id && r.move === move.id)
      ?? received[Math.max(0, user.turnData.hitsLeft - 1)]
      ?? received[received.length - 1];
    user.turnData.critApplied = !!(hit?.sourceId === user.id && hit.critical);
    resolveGatedSecondaryTiers(user, target, move);
    return true;
  }
}

export class TripleAccelMultiHitAttr extends MultiHitAttr {
  constructor() {
    super(MultiHitType._3);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    move.setFlag(MoveFlags.CHECK_ALL_HITS, true);
    return super.apply(user, target, move, args);
  }
}

export class TripleAccelPerHitPowerAttr extends NativeTripleAccelPowerAttr {
  private perHitPower: number[];

  constructor(perHitPower: number[] = [40, 65, 100]) {
    super();
    this.perHitPower = perHitPower;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!move.hasAttr(TripleAccelMultiHitAttr) || !(args[0] instanceof Utils.NumberHolder)) {
      return false;
    }
    const hitIndex = Math.max(0, (user.turnData.hitCount ?? 3) - (user.turnData.hitsLeft ?? 3));
    const bp = this.perHitPower[Math.min(hitIndex, this.perHitPower.length - 1)];
    if (bp === undefined) {
      return false;
    }
    (args[0] as Utils.NumberHolder).value = bp;
    return true;
  }
}

export class RandomStatChangeAttr extends MoveEffectAttr {
  private levels: integer;
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(levels: integer, effectChance: integer, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.levels = levels;
    this.effectChance = effectChance;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate && !move.attrs.some(a => a instanceof ConditionalRandomStatChangeAttr)) {
      setSecondaryTier(user, "randomStatDrop", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (shouldSkipBaseSecondaryTier(user, "randomStatDrop")) {
      return false;
    }
    if (this.gate && shouldSkipGatedSecondaryTier(user, "randomStatDrop") && move.attrs.some(a => a instanceof RandomStatChangeAttr && !(a instanceof ConditionalRandomStatChangeAttr))) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
    const stat = stats[user.randSeedInt(stats.length)];
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [stat], this.levels));
    return true;
  }
}

export class ConditionalRandomStatChangeAttr extends MoveEffectAttr {
  private levels: integer;
  private tierGate: YuGateFunc;
  private baseChance: integer;
  private gatedChance: integer;
  private dropCount: integer;

  constructor(levels: integer, baseChance: integer, gatedChance: integer, gate: YuGateFunc, dropCount: integer = 1) {
    super(false, MoveEffectTrigger.HIT);
    this.levels = levels;
    this.tierGate = gate;
    this.baseChance = baseChance;
    this.gatedChance = gatedChance;
    this.dropCount = dropCount;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "randomStatDrop", this.tierGate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const hasBareSibling = move.attrs.some(a => a instanceof RandomStatChangeAttr && !(a instanceof ConditionalRandomStatChangeAttr));
    if (!hasBareSibling) {
      if (shouldSkipGatedSecondaryTier(user, "randomStatDrop")) {
        return false;
      }
      if (this.baseChance >= 0 && this.baseChance !== 100 && user.randSeedInt(100) >= this.baseChance) {
        return false;
      }
      const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
      for (let i = 0; i < this.dropCount; i++) {
        const stat = stats[user.randSeedInt(stats.length)];
        user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [stat], this.levels));
      }
      return true;
    }
    if (shouldSkipGatedSecondaryTier(user, "randomStatDrop")) {
      return false;
    }
    const tier = user.turnData.secondaryTierResolved?.randomStatDrop;
    const chance = tier === "gated" ? this.gatedChance : this.baseChance;
    if (chance >= 0 && chance !== 100 && user.randSeedInt(100) >= chance) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
    const drops = tier === "gated" ? this.dropCount : 1;
    for (let i = 0; i < drops; i++) {
      const stat = stats[user.randSeedInt(stats.length)];
      user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [stat], this.levels));
    }
    return true;
  }
}

export class ResetGravityFromStartAttr extends MoveEffectAttr {
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(effectChance: integer = 100, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.effectChance = effectChance;
    this.gate = gate;
  }

  isGatedInstance(): boolean {
    return this.gate !== undefined;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate) {
      setSecondaryTier(user, "resetGravity", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = move.attrs.some(a => a instanceof ResetGravityFromStartAttr && !a.isGatedInstance());
    if (this.gate && shouldSkipGatedSecondaryTier(user, "resetGravity") && hasBareSibling) {
      return false;
    }
    if (!this.gate && shouldSkipBaseSecondaryTier(user, "resetGravity")) {
      return false;
    }
    if (this.gate && !hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    const arena = user.scene.arena;
    if (arena.getTag(ArenaTagType.GRAVITY)) {
      arena.removeTag(ArenaTagType.GRAVITY);
    }
    arena.addTag(ArenaTagType.GRAVITY, 5, move.id, user.id);
    return true;
  }
}

export class ChangeFoePrimaryTypeAttr extends MoveEffectAttr {
  private morphType: Type;
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(typeToken: string, effectChance: integer = 100, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.morphType = TYPE_BY_TOKEN[typeToken.toUpperCase()] ?? Type.NORMAL;
    this.effectChance = effectChance;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    const foe = foeForGate(user, target);
    const current = foe.getTypes(true);
    foe.summonData.types = current.length > 1
      ? [this.morphType, ...current.slice(1)]
      : [this.morphType];
    foe.updateInfo();
    return true;
  }
}

export class BindingMoveTagAttr extends TrapAttr {
  constructor() {
    super(BattlerTagType.BIND);
  }
}

export class ConsecutiveUsePowerAttr extends VariablePowerAttr {
  private bonus: number;
  private isMultiplier: boolean;

  constructor(bonus: number) {
    super();
    this.bonus = bonus;
    this.isMultiplier = bonus < 10 && bonus !== Math.floor(bonus);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    let count = 0;
    for (const tm of user.getLastXMoves(8)) {
      if (tm.move === move.id && tm.result === MoveResult.SUCCESS) {
        count++;
      } else if (tm.turn < user.scene.currentBattle.turn - 1) {
        break;
      }
    }
    const holder = args[0] as Utils.NumberHolder;
    if (this.isMultiplier) {
      holder.value = Math.floor(holder.value * Math.pow(this.bonus, count));
    } else {
      holder.value += count * this.bonus;
    }
    return true;
  }
}

export class GatedConsecutiveUsePowerAttr extends ConsecutiveUsePowerAttr {
  private gate: YuGateFunc;

  constructor(bonus: number, gate: YuGateFunc) {
    super(bonus);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}
export class ConsecutiveUseCapPowerAttr extends VariablePowerAttr {
  constructor(private bonusPer: integer, private maxStacks: integer) {
    super();
  }

  apply(user: Pokemon, _t: Pokemon, move: Move, args: any[]): boolean {
    let count = 0;
    for (const tm of user.getLastXMoves(this.maxStacks + 2)) {
      if (tm.move === move.id && tm.result === MoveResult.SUCCESS) {
        count++;
      } else {
        break;
      }
    }
    (args[0] as Utils.NumberHolder).value += Math.min(count, this.maxStacks) * this.bonusPer;
    return true;
  }
}

export class TriggerIngrainAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    return user.addTag(BattlerTagType.INGRAIN, 0, move.id, user.id);
  }
}

export class ReduceLastMovePpAttr extends ReducePpMoveAttr {
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(reduction: integer, effectChance: integer = 100, gate?: YuGateFunc) {
    super(reduction);
    this.effectChance = effectChance;
    this.gate = gate;
  }

  private resolvePpTarget(user: Pokemon, target: Pokemon, move: Move): Pokemon {
    return move.moveTarget === MoveTarget.USER ? foeForGate(user, target) : target;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const ppTarget = this.resolvePpTarget(user, target, move);
    if (this.gate && !this.gate(user, ppTarget, move)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    const applied = super.apply(user, ppTarget, move, args);
    if (applied) {
      tryMarkGrimMillerEncoreDisablePpZeroFlinch(ppTarget, user);
    }
    return applied;
  }

  getCondition(): MoveConditionFunc {
    const base = super.getCondition();
    return (user, target, move) => base(user, this.resolvePpTarget(user, target, move), move);
  }
}

export class TransferNegativeStagesAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const foe = foeForGate(user, target);
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
    let transferStat: BattleStat | null = null;
    let lowestStage = 0;
    for (const stat of stats) {
      const stage = user.summonData.battleStats[stat];
      if (stage < lowestStage) {
        lowestStage = stage;
        transferStat = stat;
      }
    }
    if (transferStat !== null) {
      user.summonData.battleStats[transferStat] += 1;
      user.scene.unshiftPhase(new StatChangePhase(user.scene, foe.getBattlerIndex(), false, [transferStat], -1));
      user.updateInfo();
    }
    return true;
  }
}
export class WeakToFoePrimaryTypeAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return true;
    }
    const foePrimary = target.getTypes(true)[0];
    let weakType = Type.NORMAL;
    let bestMult = 0;
    for (let t = Type.NORMAL; t <= Type.FAIRY; t++) {
      const mult = getTypeDamageMultiplier(foePrimary, t);
      if (mult > bestMult) {
        bestMult = mult;
        weakType = t;
      }
    }
    user.summonData.types = [weakType];
    user.updateInfo();
    return true;
  }
}

export class ChargeMoveAttr extends ChargeAttr {
  constructor() {
    super(ChargeAnim.RAZOR_WIND_CHARGING, i18next.t("moveTriggers:whippedUpAWhirlwind", {pokemonName: "{USER}"}));
  }
}

export class PursuitSwitchMultiplierAttr extends MovePowerMultiplierAttr {
  constructor(multiplier: number) {
    super((_user, target) =>
      target.scene.currentBattle.turnCommands[target.getBattlerIndex()]?.command === Command.POKEMON ? multiplier : 1);
  }
}

export class GatedMovePowerMultiplierAttr extends MovePowerMultiplierAttr {
  constructor(gate: YuGateFunc, multiplier: number) {
    super((user, target, move) => gate(user, target, move) ? multiplier : 1);
  }
}
export class DamagedThisTurnMultiplierAttr extends MovePowerMultiplierAttr {
  constructor(multiplier: number = 1.3) {
    super((user, target, move) => userDamagedThisTurnGate(user, target, move) ? multiplier : 1);
  }
}

export class GatedIncrementMovePriorityAttr extends IncrementMovePriorityAttr {
  constructor(gate: YuGateFunc, increaseAmount = 1) {
    super((user, target, move) => gate(user, target, move), increaseAmount);
  }
}

export class GatedNeutralDamageAgainstFlyingTypeMultiplierAttr extends NeutralDamageAgainstFlyingTypeMultiplierAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class NegativeStatStagePowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  private cap?: integer;
  private gate?: YuGateFunc;
  private useTarget: boolean;

  constructor(bpPerStage: integer, gate?: YuGateFunc, cap?: integer, useTarget: boolean = true) {
    super();
    this.bpPerStage = bpPerStage;
    this.gate = gate;
    this.cap = cap;
    this.useTarget = useTarget;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const subject = this.useTarget ? target : user;
    const negativeStages = subject.summonData.battleStats.slice(0, 7).reduce((s, v) => s + (v < 0 ? -v : 0), 0);
    let bonus = negativeStages * this.bpPerStage;
    if (this.cap != null) {
      bonus = Math.min(bonus, this.cap);
    }
    (args[0] as Utils.NumberHolder).value += bonus;
    return true;
  }
}

export class AllyStatChangeAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private levels: integer;
  private gate?: YuGateFunc;

  constructor(stat: BattleStat, levels: integer, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.stat = stat;
    this.levels = levels;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    for (const ally of user.scene.getParty(user.isPlayer())) {
      if (ally === user || ally.isFainted() || !ally.isOnField()) {
        continue;
      }
      user.scene.unshiftPhase(new StatChangePhase(user.scene, ally.getBattlerIndex(), false, [this.stat], this.levels));
    }
    return true;
  }
}

export class DefStagesScaledStatChangeAttr extends MoveEffectAttr {
  private targetStat: BattleStat;
  private sourceStat: BattleStat;
  private stagesPer: integer;
  private baseLevels: integer;

  constructor(targetStat: BattleStat, sourceStat: BattleStat, stagesPer: integer, baseLevels: integer = 0) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.targetStat = targetStat;
    this.sourceStat = sourceStat;
    this.stagesPer = stagesPer;
    this.baseLevels = baseLevels;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const sourceStages = Math.max(0, user.summonData.battleStats[this.sourceStat]);
    const scaled = Math.floor(sourceStages / this.stagesPer);
    const total = this.baseLevels + scaled;
    if (total <= 0) {
      return true;
    }
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [this.targetStat], total));
    return true;
  }
}

export class RandomStatUpDownAttr extends MoveEffectAttr {
  private repeatCount: integer;
  private gate?: YuGateFunc;

  constructor(repeatCount: integer, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.repeatCount = repeatCount;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    for (let i = 0; i < this.repeatCount; i++) {
      const up = stats[user.randSeedInt(stats.length)];
      const downPool = stats.filter(s => s !== up);
      const down = downPool[user.randSeedInt(downPool.length)];
      user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [up], 1));
      user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [down], -1));
    }
    return true;
  }
}

export class DistinctBoostCountPowerAttr extends VariablePowerAttr {
  private bpPerBoost: integer;
  private gate?: YuGateFunc;

  constructor(bpPerBoost: integer, gate?: YuGateFunc) {
    super();
    this.bpPerBoost = bpPerBoost;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const distinct = user.summonData.battleStats.slice(0, 7).filter(v => v > 0).length;
    (args[0] as Utils.NumberHolder).value += distinct * this.bpPerBoost;
    return true;
  }
}

export class ResistPunishPowerAttr extends VariablePowerAttr {
  private multiplier: number;
  private gate?: YuGateFunc;

  constructor(multiplier: number, gate?: YuGateFunc) {
    super();
    this.multiplier = multiplier;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate || this.gate(user, target, move)) {
      if (target.getAttackTypeEffectiveness(move.type, user) < 1) {
        (args[0] as Utils.NumberHolder).value = Math.floor((args[0] as Utils.NumberHolder).value * this.multiplier);
      }
    }
    return true;
  }
}

type MoveFilter = (move: Move) => boolean;

const hasBareCounterDamageAttr = (move: Move) =>
  move.attrs.some(a => a instanceof CounterDamageAttr && !(a instanceof ConditionalCounterDamageAttr));
export class ConditionalCounterDamageAttr extends CounterDamageAttr {
  private filter: MoveFilter;
  private gatedMultiplier: number;
  private gate: YuGateFunc;

  constructor(filter: MoveFilter, baseMultiplier: number, gate: YuGateFunc, gatedMultiplier?: number) {
    super(filter, gatedMultiplier ?? baseMultiplier);
    this.filter = filter;
    this.gatedMultiplier = gatedMultiplier ?? baseMultiplier;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "counter", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBare = hasBareCounterDamageAttr(move);
    if (hasBare) {
      if (shouldSkipGatedSecondaryTier(user, "counter")) {
        return false;
      }
      if (user.turnData.secondaryTierResolved?.counter !== "gated") {
        return false;
      }
    } else if (!this.gate(user, target, move)) {
      return false;
    }
    const damage = user.turnData.attacksReceived
      .filter(ar => this.filter(allMoves[ar.move]))
      .reduce((total: integer, ar: AttackMoveResult) => total + ar.damage, 0);
    (args[0] as Utils.IntegerHolder).value = Utils.toDmgValue(damage * this.gatedMultiplier);
    return true;
  }
}

export class ConfuseOnHitAttr extends ConfuseAttr {
  private gate?: YuGateFunc;
  private effectChance: integer;

  constructor(effectChance: integer, gate?: YuGateFunc) {
    super(false);
    this.effectChance = effectChance;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate && !move.attrs.some(a => a instanceof ConditionalConfuseAttr)) {
      setSecondaryTier(user, "confuse", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && shouldSkipGatedSecondaryTier(user, "confuse") && hasBareConfuseAttr(move)) {
      return false;
    }
    if (shouldSkipBaseSecondaryTier(user, "confuse") && (hasBareConfuseAttr(move) || move.attrs.some(a => a instanceof ConditionalConfuseAttr))) {
      return false;
    }
    if (user.turnData.secondaryFamilyApplied?.confuse) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (this.effectChance >= 0) {
        move.chance = this.effectChance;
      }
      const result = super.apply(user, target, move, args);
      if (!user.turnData.secondaryFamilyApplied) {
        user.turnData.secondaryFamilyApplied = {};
      }
      user.turnData.secondaryFamilyApplied.confuse = true;
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class PostVictoryHealAttr extends HealAttr {
  private gate?: YuGateFunc;

  constructor(ratio: number, gate?: YuGateFunc) {
    super(ratio, true, true);
    this.trigger = MoveEffectTrigger.POST_TARGET;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon | null, move: Move, args: any[]): boolean {
    if (!target?.isFainted()) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class FaintedAllyCountHealAttr extends HealAttr {
  private ratioPerAlly: number;

  constructor(ratioPerAlly: number = 0.125) {
    super(0);
    this.ratioPerAlly = ratioPerAlly;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const fainted = user.scene.getParty(user.isPlayer()).filter(p => p !== user && p.isFainted()).length;
    if (!fainted) {
      return false;
    }
    this.addHealPhase(user, this.ratioPerAlly * fainted);
    return true;
  }
}

export class ConfuseOnReflectedHitAttr extends MoveEffectAttr {
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(effectChance: integer, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_ATTACK);
    this.effectChance = effectChance;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate && !move.attrs.some(a => a instanceof ConditionalConfuseAttr)) {
      setSecondaryTier(user, "confuse", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!hasBareCounterDamageAttr(move)) {
      return false;
    }
    if (this.gate && shouldSkipGatedSecondaryTier(user, "confuse") && hasBareConfuseAttr(move)) {
      return false;
    }
    if (shouldSkipBaseSecondaryTier(user, "confuse") && (hasBareConfuseAttr(move) || move.attrs.some(a => a instanceof ConditionalConfuseAttr))) {
      return false;
    }
    if (user.turnData.secondaryFamilyApplied?.confuse) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    target.addTag(BattlerTagType.CONFUSED, 0, move.id, user.id);
    markSecondaryFamily(user, "confuse");
    return true;
  }
}
export class PreserveConsecutiveChainAttr extends MoveEffectAttr {
  constructor() {
    super(true);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const history = user.getMoveHistory();
    const entry = history.at(-1);
    if (entry && entry.move === move.id) {
      entry.virtual = true;
    }
    return true;
  }
}

export class RandomStatDropAttr extends MoveEffectAttr {
  private stages: integer;
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(stages: integer, effectChance: integer, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.stages = stages;
    this.effectChance = effectChance;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate && !move.attrs.some(a => a instanceof ConditionalRandomStatChangeAttr)) {
      setSecondaryTier(user, "randomStatDrop", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (shouldSkipBaseSecondaryTier(user, "randomStatDrop")) {
      return false;
    }
    if (this.gate && shouldSkipGatedSecondaryTier(user, "randomStatDrop") && move.attrs.some(a => a instanceof RandomStatChangeAttr && !(a instanceof ConditionalRandomStatChangeAttr))) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
    const stat = stats[user.randSeedInt(stats.length)];
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [stat], -this.stages));
    return true;
  }
}
export class SecondHitCritIfFirstCritAttr extends HighCritAttr {
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(effectChance: integer, gate?: YuGateFunc) {
    super();
    this.effectChance = effectChance;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (user.turnData.hitCount - user.turnData.hitsLeft + 1 !== 2) {
      return false;
    }
    const firstHitIdx = Math.max(0, user.turnData.hitCount - user.turnData.hitsLeft - 1);
    const firstHit = target.turnData.attacksReceived[firstHitIdx];
    if (!firstHit || firstHit.sourceId !== user.id || !firstHit.critical) {
      return false;
    }
    if (user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class CritTriggeredLowerHighestStatAttr extends LowerHighestStatAttr {
  private gate?: YuGateFunc;

  constructor(levels: integer, gate?: YuGateFunc) {
    super(levels);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (!user.turnData.critApplied) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class PostVictoryStatDropAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private stages: integer;
  private gate?: YuGateFunc;

  constructor(stat: BattleStat, stages: integer, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_TARGET);
    this.stat = stat;
    this.stages = stages;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!target.isFainted()) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [this.stat], -this.stages));
    return true;
  }
}

export class SnowPowerBoostAttr extends VariablePowerAttr {
  private multiplier: number;
  private gate?: YuGateFunc;

  constructor(multiplier: number, gate?: YuGateFunc) {
    super();
    this.multiplier = multiplier;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    (args[0] as Utils.NumberHolder).value = Math.floor((args[0] as Utils.NumberHolder).value * this.multiplier);
    return true;
  }
}

export class SwitchingPursuitBoostAttr extends VariablePowerAttr {
  private multiplier: number;
  private gate?: YuGateFunc;

  constructor(multiplier: number, gate?: YuGateFunc) {
    super();
    this.multiplier = multiplier;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    (args[0] as Utils.NumberHolder).value = Math.floor((args[0] as Utils.NumberHolder).value * this.multiplier);
    return true;
  }
}

export class ConvertBurnToFreezeAttr extends MoveEffectAttr {
  private effectChance: integer;
  private gate: YuGateFunc;

  constructor(effectChance: integer, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.effectChance = effectChance;
    this.gate = gate ?? ((_u, target) => target.status?.effect === StatusEffect.BURN);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (target.status?.effect !== StatusEffect.BURN) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    target.trySetStatus(StatusEffect.NONE, true, user);
    return target.trySetStatus(StatusEffect.FREEZE, true, user);
  }
}

export class ConvertFreezeToBurnAttr extends MoveEffectAttr {
  private effectChance: integer;
  private gate: YuGateFunc;

  constructor(effectChance: integer, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.effectChance = effectChance;
    this.gate = gate ?? ((_u, target) => target.status?.effect === StatusEffect.FREEZE);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (target.status?.effect !== StatusEffect.FREEZE) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    target.trySetStatus(StatusEffect.NONE, true, user);
    return target.trySetStatus(StatusEffect.BURN, true, user);
  }
}

export class ConditionalHighCritAttr extends HighCritAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(gate: YuGateFunc, effectChance: integer = 100) {
    super();
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "crit", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (shouldSkipGatedSecondaryTier(user, "crit") && move.attrs.some(a => a instanceof HighCritAttr && !(a instanceof ConditionalHighCritAttr))) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}
export class GatedCritOnlyAttr extends CritOnlyAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}
export class GatedConditionalPriorityAttr extends IncrementMovePriorityAttr {
  constructor(gate: YuGateFunc, increaseAmount = 1) {
    super((user, target, move) => gate(user, target, move), increaseAmount);
  }
}
export class ConditionalHealAttr extends HealAttr {
  private gate: YuGateFunc;
  private ratio: number;

  constructor(ratio: number, gate: YuGateFunc, showAnim?: boolean) {
    super(0, showAnim, true);
    this.ratio = ratio;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (hasBareHealAttr(move)) {
      setSecondaryTier(user, "selfHeal", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = hasBareHealAttr(move);
    if (hasBareSibling) {
      if (shouldSkipGatedSecondaryTier(user, "selfHeal")) {
        return false;
      }
      if (shouldSkipBaseSecondaryTier(user, "selfHeal")) {
        this.addHealPhase(user, this.ratio);
        return true;
      }
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    this.addHealPhase(user, this.ratio);
    return true;
  }
}
export class TriggerWishAttr extends MoveEffectAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    const side = user.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    return user.scene.arena.addTag(ArenaTagType.WISH, 2, move.id, user.id, side);
  }
}

export class GatedAddArenaTagAttr extends AddArenaTagAttr {
  private gate: YuGateFunc;
  private tagChance: integer;

  constructor(tagType: ArenaTagType, turnCount: integer, gate: YuGateFunc, tagChance: integer = 100, failOnOverlap: boolean = false, selfSideTarget: boolean = false) {
    super(tagType, turnCount, failOnOverlap, selfSideTarget);
    this.gate = gate;
    this.tagChance = tagChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (this.tagChance >= 0 && this.tagChance !== 100 && user.randSeedInt(100) >= this.tagChance) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class ConditionalAddArenaTagAttr extends AddArenaTagAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(
    tagType: ArenaTagType,
    turnCount: integer,
    gate: YuGateFunc,
    effectChance: integer = 100,
    failOnOverlap: boolean = false,
    selfSideTarget: boolean = false,
  ) {
    super(tagType, turnCount, failOnOverlap, selfSideTarget);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "arenaTag", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = move.attrs.some(
      a => a instanceof AddArenaTagAttr
        && !(a instanceof ConditionalAddArenaTagAttr)
        && !(a instanceof GatedAddArenaTagAttr)
        && (a as AddArenaTagAttr).tagType === this.tagType,
    );
    if (!hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    if (shouldSkipGatedSecondaryTier(user, "arenaTag") && hasBareSibling) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (user.turnData.secondaryTierResolved?.arenaTag === "gated" || !hasBareSibling) {
        move.chance = this.effectChance;
      }
      const result = super.apply(user, target, move, args);
      if (result) {
        markSecondaryFamily(user, "arenaTag");
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class GatedAddArenaTrapTagAttr extends AddArenaTrapTagAttr {
  private gate: YuGateFunc;

  constructor(tagType: ArenaTagType, gate: YuGateFunc) {
    super(tagType);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

const hasBareArenaTrapTagAttrForType = (move: Move, tagType: ArenaTagType) =>
  move.attrs.some(a =>
    a instanceof AddArenaTrapTagAttr
    && !(a instanceof ConditionalAddArenaTrapTagAttr)
    && !(a instanceof GatedAddArenaTrapTagAttr)
    && (a as AddArenaTrapTagAttr).tagType === tagType,
  );
export class ConditionalAddArenaTrapTagAttr extends AddArenaTrapTagAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(tagType: ArenaTagType, effectChance: integer, gate: YuGateFunc) {
    super(tagType);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "arenaTag", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const hasBareSibling = hasBareArenaTrapTagAttrForType(move, this.tagType);
    if (!hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    if (shouldSkipGatedSecondaryTier(user, "arenaTag") && hasBareSibling) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (user.turnData.secondaryTierResolved?.arenaTag === "gated" || !hasBareSibling) {
        move.chance = this.effectChance;
      }
      const result = super.apply(user, target, move, args);
      if (result) {
        markSecondaryFamily(user, "arenaTag");
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class GatedAddBattlerTagAttr extends MoveEffectAttr {
  private tagType: BattlerTagType;
  private gate: YuGateFunc;
  private tagChance: integer;

  constructor(tagType: BattlerTagType, tagChance: integer, gate: YuGateFunc, trigger?: MoveEffectTrigger) {
    const resolvedTrigger = trigger ?? (
      gate === abilityContactProcGate ? MoveEffectTrigger.POST_ATTACK
        : tagType === BattlerTagType.HEAL_BLOCKED ? MoveEffectTrigger.POST_APPLY
          : tagType === BattlerTagType.INFESTATION ? MoveEffectTrigger.POST_APPLY
            : tagType === BattlerTagType.INGRAIN ? MoveEffectTrigger.POST_APPLY
              : MoveEffectTrigger.HIT
    );
    super(false, resolvedTrigger);
    this.tagType = tagType;
    this.gate = gate;
    this.tagChance = tagChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    const tierKey = battlerTagTierKey(this.tagType);
    if (tierKey && this.gate) {
      setSecondaryTier(user, tierKey, this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const tierKey = battlerTagTierKey(this.tagType);
    const hasBareSibling = hasBareAddBattlerTagAttrForType(move, this.tagType);
    if (!hasBareSibling && !this.gate(user, target, move)) {
      return false;
    }
    if (tierKey && shouldSkipGatedSecondaryTier(user, tierKey) && hasBareSibling) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (this.tagChance >= 0) {
        move.chance = this.tagChance;
      }
      const moveChance = this.getMoveChance(user, target, move, false, false);
      if (moveChance >= 0 && moveChance !== 100 && user.randSeedInt(100) >= moveChance) {
        return false;
      }
      const tagTarget = this.selfTarget || this.tagType === BattlerTagType.INGRAIN || this.tagType === BattlerTagType.CRIT_BOOST || this.tagType === BattlerTagType.SUBSTITUTE
        ? user
        : foeForGate(user, target);
      const lapseTurns = this.tagType === BattlerTagType.HEAL_BLOCKED ? 5
        : battlerTagTierKey(this.tagType) === "trap" ? 4
          : 0;
      return tagTarget.addTag(this.tagType, lapseTurns, move.id, user.id);
    } finally {
      move.chance = originalChance;
    }
  }
}

export class GatedIgnoreAccuracyAttr extends IgnoreAccuracyAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}
export class GatedEndureAttr extends ProtectAttr {
  private gate: YuGateFunc;
  constructor(gate: YuGateFunc) {
    super(BattlerTagType.ENDURING);
    this.gate = gate;
  }
  canApply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.canApply(user, target, move, args);
  }
}

export class GatedProtectAttr extends ProtectAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  canApply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.canApply(user, target, move, args);
  }
}

export class RecoilNegateAttr extends MoveEffectAttr {
  private minStages: integer;
  private gate?: YuGateFunc;

  constructor(minStages: integer = 4, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_APPLY);
    this.minStages = minStages;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate) {
      if (this.gate(user, target, move)) {
        move.recoil = [0, 0];
      }
      return true;
    }
    let total = 0;
    for (let i = 0; i < 7; i++) total += Math.max(0, user.summonData.battleStats[i]);
    if (total >= this.minStages) move.recoil = [0, 0];
    return true;
  }
}

export class GatedRecoilNegateAttr extends RecoilNegateAttr {
  constructor(gate: YuGateFunc) {
    super(0, gate);
  }
}

export class AbilityRecoilToHealAttr extends MoveEffectAttr {
  private healRatio: number;
  private gate?: YuGateFunc;
  constructor(healRatio: number = 0.1, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_ATTACK);
    this.healRatio = healRatio;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const abilityRecoil = (user.turnData.abilityRecoilThisTurn ?? 0) > 0;
    if (!abilityRecoil && (!move.recoil || move.recoil[0] === 0)) {
      return false;
    }
    if (move.recoil?.[0]) {
      move.recoil = [0, 0];
    }
    user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * this.healRatio), "", true, true));
    return true;
  }
}

export class AddSecondaryResistTypeAttr extends VariableMoveTypeAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    const foeTypes = target.getTypes(true);
    const primaryType = foeTypes[0];
    let resistType = Type.STEEL;
    let bestResist = 0;
    for (let t = Type.NORMAL; t <= Type.FAIRY; t++) {
      const mult = getTypeDamageMultiplier(primaryType, t);
      if (mult < 1 && (1 / mult) > bestResist) { bestResist = 1 / mult; resistType = t; }
    }
    const current = user.getTypes(true);
    if (!current.includes(resistType)) {
      user.summonData.types = [...current, resistType];
      user.updateInfo();
    }
    return true;
  }
}

export class BerryConsumeCountPowerAttr extends VariablePowerAttr {
  private bpPerBerry: integer;
  private cap: integer;
  private partyWide: boolean;
  constructor(bpPerBerry: integer = 10, cap: integer = 80, partyWide: boolean = false) {
    super();
    this.bpPerBerry = bpPerBerry;
    this.cap = cap;
    this.partyWide = partyWide;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const count = this.partyWide
      ? user.scene.getParty(user.isPlayer()).reduce((n, p) => n + (p.summonData.berriesConsumed ?? 0), 0)
      : (user.summonData.berriesConsumed ?? 0);
    (args[0] as Utils.NumberHolder).value += Math.min(count * this.bpPerBerry, this.cap);
    return true;
  }
}

const BERRY_HELD_TYPE_MAP: Record<BerryType, Type> = {
  [BerryType.SITRUS]: Type.GRASS,
  [BerryType.LUM]: Type.FAIRY,
  [BerryType.ENIGMA]: Type.DARK,
  [BerryType.LIECHI]: Type.FIGHTING,
  [BerryType.GANLON]: Type.STEEL,
  [BerryType.PETAYA]: Type.FIRE,
  [BerryType.APICOT]: Type.BUG,
  [BerryType.SALAC]: Type.GHOST,
  [BerryType.LANSAT]: Type.ICE,
  [BerryType.STARF]: Type.GROUND,
  [BerryType.LEPPA]: Type.PSYCHIC,
};

export class BerryHeldTypeOverrideAttr extends VariableMoveTypeAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const moveType = args[0] as Utils.IntegerHolder;
    const berries = user.getHeldItems().filter(i => i instanceof BerryModifier) as BerryModifier[];
    if (!berries.length) {
      return true;
    }
    const counts = new Map<Type, number>();
    for (const berry of berries) {
      const type = BERRY_HELD_TYPE_MAP[berry.berryType];
      if (type != null) {
        counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
    let bestType: Type | undefined;
    let bestCount = 0;
    const tied: Type[] = [];
    for (const [type, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestType = type;
        tied.length = 0;
        tied.push(type);
      } else if (count === bestCount && count > 0) {
        tied.push(type);
      }
    }
    if (tied.length > 1) {
      bestType = tied[user.randSeedInt(tied.length)];
    }
    if (bestType != null) {
      moveType.value = bestType;
    }
    return true;
  }
}

export class BreakSubstituteAttr extends MoveEffectAttr {
  private breakUserSub: boolean;
  private gate?: YuGateFunc;

  constructor(breakUserSub: boolean = false, gate?: YuGateFunc) {
    super(false, breakUserSub ? MoveEffectTrigger.POST_ATTACK : MoveEffectTrigger.PRE_ATTACK);
    this.breakUserSub = breakUserSub;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const subject = this.breakUserSub ? user : target;
    if (!subject.getTag(BattlerTagType.SUBSTITUTE)) {
      return true;
    }
    if (this.breakUserSub) {
      subject.turnData.subBrokenThisTurn = true;
    }
    subject.removeTag(BattlerTagType.SUBSTITUTE);
    return true;
  }
}

export class BypassAbilityAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    user.turnData.ignoreAbilities = true;
    return true;
  }
}

export class BypassProtectAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    user.turnData.bypassProtect = true;
    return true;
  }
}

export class ChipDamageAttr extends MoveEffectAttr {
  private ratio: number;
  private gate?: YuGateFunc;

  constructor(ratio: number = 0.125, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.ratio = ratio;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (!this.gate && target.getAttackTypeEffectiveness(move.type, user) < 2) {
      return false;
    }
    target.damageAndUpdate(Math.floor(target.getMaxHp() * this.ratio), HitResult.OTHER);
    return true;
  }
}

export class CoinFlipPowerAttr extends VariablePowerAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const holder = args[0] as Utils.NumberHolder;
    if (user.randSeedInt(2) === 0) {
      holder.value = Math.floor(holder.value * 1.5);
    } else {
      holder.value = Math.floor(holder.value * 0.5);
    }
    return true;
  }
}

export class ConsumeBoostsBpAndHealAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  private healRatio: number;
  constructor(bpPerStage: integer = 15, healRatio: number = 0.03) {
    super();
    this.bpPerStage = bpPerStage;
    this.healRatio = healRatio;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    let stages = 0;
    for (let i = 0; i < 7; i++) {
      const v = user.summonData.battleStats[i];
      if (v > 0) stages += v;
    }
    if (stages <= 0) {
      return true;
    }
    (args[0] as Utils.NumberHolder).value += stages * this.bpPerStage;
    user.resetStatStages();
    user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * this.healRatio * stages), "", true, true));
    return true;
  }
}

export class ConsumeBoostsForHazardAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    let total = 0;
    for (let i = 0; i < 7; i++) total += Math.max(0, user.summonData.battleStats[i]);
    if (total < 3) return false;
    user.resetStatStages();
    const side = target.isPlayer() ? ArenaTagSide.ENEMY : ArenaTagSide.PLAYER;
    user.scene.arena.addTag(ArenaTagType.STEALTH_ROCK, 0, move.id, user.id, side);
    user.scene.arena.addTag(ArenaTagType.TOXIC_SPIKES, 0, move.id, user.id, side);
    return true;
  }
}

export class ConsumeUserBerryAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.HIT);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const items = user.getHeldItems().filter(i => i instanceof BerryModifier); if (items.length) items[0].use(user, user.scene);
    return true;
  }
}
export class GatedConsumeUserBerryAttr extends ConsumeUserBerryAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class CopyFoeStatStagesAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    for (let i = 0; i < 7; i++) {
      user.summonData.battleStats[i] = target.summonData.battleStats[i];
    }
    return true;
  }
}

export class CopyFoeTypesAttr extends VariableMoveTypeAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    user.summonData.types = [...target.getTypes(true)];
    user.updateInfo();
    return true;
  }
}

export class CritProtectAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    user.addTag(BattlerTagType.CRIT_PROTECT, 5, move.id, user.id);
    return true;
  }
}

export class CureFoeStatusAttr extends MoveEffectAttr {
  constructor() {
    super(false, MoveEffectTrigger.HIT);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (!target.status?.effect || !isNonVolatileStatusEffect(target.status.effect)) return false;
    target.resetStatus();
    target.updateInfo();
    return true;
  }
}

export class GatedCureFoeStatusAttr extends CureFoeStatusAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class DefSpDefStagePowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  constructor(bpPerStage: integer = 5) {
    super();
    this.bpPerStage = bpPerStage;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const total = Math.max(0, user.summonData.battleStats[BattleStat.DEF]) + Math.max(0, user.summonData.battleStats[BattleStat.SPDEF]);
    (args[0] as Utils.NumberHolder).value += total * this.bpPerStage;
    return true;
  }
}

export class DefStageCountPowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  private cap: integer;
  constructor(bpPerStage: integer = 5, cap: integer = 30) {
    super();
    this.bpPerStage = bpPerStage;
    this.cap = cap;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const stages = Math.max(0, user.summonData.battleStats[BattleStat.DEF]);
    (args[0] as Utils.NumberHolder).value += Math.min(stages * this.bpPerStage, this.cap);
    return true;
  }
}
export class DefenseScaledPowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  private gate?: YuGateFunc;
  constructor(bpPerStage: integer = 5, gate?: YuGateFunc) {
    super();
    this.bpPerStage = bpPerStage;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    const stages = Math.max(0, user.summonData.battleStats[BattleStat.DEF]);
    (args[0] as Utils.NumberHolder).value += stages * this.bpPerStage;
    return true;
  }
}

export class DelayedRepeatAttackAttr extends MoveEffectAttr {
  private delayTurns: integer;
  constructor(delayTurns: integer = 2) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.delayTurns = delayTurns;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    user.summonData.scheduledRepeatMove = { moveId: move.id, targetId: target.id, executeTurn: user.scene.currentBattle.turn + this.delayTurns + 1 };
    return true;
  }
}

export class DelayedTrapAttr extends MoveEffectAttr {
  private delayTurns: integer;
  private gate?: YuGateFunc;
  constructor(delayOrGate?: integer | YuGateFunc, maybeGate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    if (typeof delayOrGate === "function") {
      this.delayTurns = 2;
      this.gate = delayOrGate;
    } else {
      this.delayTurns = delayOrGate ?? 2;
      this.gate = maybeGate;
    }
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    target.summonData.delayedTrap = { executeTurn: user.scene.currentBattle.turn + this.delayTurns + 1, sourceMove: move.id, sourceId: user.id };
    if (this.gate && this.gate(user, target, move)) {
      user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [BattleStat.SPD], -1));
    }
    return true;
  }
}

export class DigChargeAttr extends ChargeAttr {
  constructor() {
    super(ChargeAnim.DIG_CHARGING, i18next.t("moveTriggers:dugAHole", { pokemonName: "{USER}" }), BattlerTagType.UNDERGROUND);
  }
}

export class DistinctBoostHistoryPowerAttr extends VariablePowerAttr {
  private bpPerStat: integer;
  private cap: integer;
  constructor(bpPerStat: integer = 10, cap: integer = 50) {
    super();
    this.bpPerStat = bpPerStat;
    this.cap = cap;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const ever = user.summonData.statsEverBoosted;
    const distinct = ever
      ? ever.slice(0, 7).filter(v => v).length
      : user.summonData.battleStats.slice(0, 7).filter(v => v > 0).length;
    (args[0] as Utils.NumberHolder).value += Math.min(distinct * this.bpPerStat, this.cap);
    return true;
  }
}

export class DoubleStealthRockLayersAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const side = target.isPlayer() ? ArenaTagSide.ENEMY : ArenaTagSide.PLAYER;
    user.scene.arena.addTag(ArenaTagType.STEALTH_ROCK, 0, move.id, user.id, side);
    user.scene.arena.addTag(ArenaTagType.STEALTH_ROCK, 0, move.id, user.id, side);
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [BattleStat.ATK], 1));
    if (this.gate && this.gate(user, target, move) && user.getTag(BattlerTagType.SUBSTITUTE) && user.randSeedInt(100) < 50) {
      user.scene.arena.addTag(ArenaTagType.SPIKES, 0, move.id, user.id, side);
    }
    return true;
  }
}

export class DoubleToxicSpikesLayersAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (!this.gate?.(user, target, move)) {
      return true;
    }
    const foe = foeForGate(user, target);
    const side = foe.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    user.scene.arena.addTag(ArenaTagType.TOXIC_SPIKES, 0, move.id, user.id, side);
    foe.addTag(BattlerTagType.WHIRLPOOL, 4, move.id, user.id);
    return true;
  }
}

export class DualTypeStrikeAttr extends VariableMoveTypeAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    const moveType = args[0];
    if (!(moveType instanceof Utils.NumberHolder)) return false;
    const targetTypes = target.getTypes(true);
    let bestType = move.type;
    let bestMult = 0;
    for (let t = Type.NORMAL; t <= Type.FAIRY; t++) {
      let mult = 1;
      for (const defType of targetTypes) mult *= getTypeDamageMultiplier(t, defType);
      if (mult >= 2 && mult > bestMult) { bestMult = mult; bestType = t; }
    }
    if (bestMult >= 2) { moveType.value = bestType; return true; }
    return false;
  }
}

export class TriTypeSimultaneousStrikeAttr extends VariableMoveTypeMultiplierAttr {
  private types: Type[];

  constructor(types: Type[] = [Type.WATER, Type.GROUND, Type.FIRE]) {
    super();
    this.types = types;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!(args[0] instanceof Utils.NumberHolder)) {
      return false;
    }
    const mult = args[0] as Utils.NumberHolder;
    for (const t of this.types) {
      mult.value *= target.getAttackTypeEffectiveness(t, user);
    }
    return true;
  }
}

export class ConfusedFoeChoseContactMovePowerAttr extends VariablePowerAttr {
  private powerMult: number;

  constructor(powerMult: number = 1.714) {
    super();
    this.powerMult = powerMult;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!target.getTag(BattlerTagType.CONFUSED)) {
      return false;
    }
    const cmd = target.scene.currentBattle.turnCommands[target.getBattlerIndex()];
    const foeMove = cmd?.command === Command.ATTACK ? cmd.move : undefined;
    if (!foeMove || !allMoves[foeMove]?.hasFlag(MoveFlags.MAKES_CONTACT)) {
      return false;
    }
    (args[0] as Utils.NumberHolder).value *= this.powerMult;
    return true;
  }
}

export class ApplyLeechSeedWithMigrationAttr extends MoveEffectAttr {
  constructor() {
    super(false, MoveEffectTrigger.POST_APPLY);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    target.addTag(BattlerTagType.SEEDED, 0, move.id, user.id);
    target.summonData.spawnMigrationSourceId = user.id;
    return true;
  }
}

export class DualTypeMultiHitAttr extends VariableMoveTypeAttr {
  constructor(private typeA: Type, private typeB: Type) {
    super();
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const moveType = args[0];
    if (!(moveType instanceof Utils.NumberHolder)) {
      return false;
    }
    moveType.value = user.turnData.hitCount - user.turnData.hitsLeft + 1 <= 1 ? this.typeA : this.typeB;
    return true;
  }
}

export class UserHpCostAttr extends MoveEffectAttr {
  constructor(private ratio: number) {
    super(true, MoveEffectTrigger.PRE_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    user.damageAndUpdate(Math.max(1, Math.floor(user.getMaxHp() * this.ratio)), HitResult.OTHER);
    return true;
  }
}

export class EruptionStyleHpPowerAttr extends VariablePowerAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    (args[0] as Utils.NumberHolder).value = Utils.toDmgValue(150 * user.getHpRatio());
    return true;
  }
}

export class EscalatingReusePowerAttr extends VariablePowerAttr {
  private baseBp: integer;
  private step: integer;
  private cap: integer;
  constructor(baseBp: integer = 60, step: integer = 20, cap: integer = 160) {
    super();
    this.baseBp = baseBp;
    this.step = step;
    this.cap = cap;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    let count = 0;
    for (const tm of user.getLastXMoves(32)) {
      if (tm.move === move.id && tm.result === MoveResult.SUCCESS) count++;
    }
    const bp = Math.min(this.baseBp + count * this.step, this.cap);
    (args[0] as Utils.NumberHolder).value = bp;
    return true;
  }
}

export class ExtendArenaTagAttr extends MoveEffectAttr {
  private tagType: ArenaTagType;
  private extraTurns: integer;
  constructor(tagType: ArenaTagType = ArenaTagType.GRAVITY, extraTurns: integer = 2) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.tagType = tagType;
    this.extraTurns = extraTurns;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const tag = user.scene.arena.getTag(this.tagType);
    if (tag) tag.turnCount += this.extraTurns;
    return true;
  }
}

export class ExtendTerrainDurationAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const terrain = user.scene.arena.terrain;
    if (terrain?.terrainType) terrain.turnCount += 1;
    return true;
  }
}

export class ExtendWeatherDurationAttr extends MoveEffectAttr {
  private weatherToken?: string;

  constructor(weatherToken?: string) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.weatherToken = weatherToken;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const weather = user.scene.arena.weather;
    if (weather?.weatherType && weather.turnsLeft > 0) {
      weather.turnsLeft += 1;
      return true;
    }
    if (this.weatherToken) {
      return new ResetWeatherFromStartAttr(this.weatherToken).apply(user, target, move, args);
    }
    return super.apply(user, target, move, args);
  }
}

export class FailIfHasTransferableItemsAttr extends MoveAttr {
  getCondition(): MoveConditionFunc {
    return (user, target, move) => userItemlessGate(user, target, move);
  }
}

export class FailUnlessNightBiomeAttr extends MoveAttr {
  getCondition(): MoveConditionFunc {
    return (user, target, move) => nightBiomeGate(user, target, move);
  }
}

export class FailUnlessTotalStagesGte3Attr extends MoveAttr {
  getCondition(): MoveConditionFunc {
    return (user, target, move) => totalStagesGte3Gate(user, target, move);
  }
}

export class FailUnlessHasSubstituteAttr extends MoveAttr {
  getCondition(): MoveConditionFunc {
    return (user, target, move) => hasSubstituteGate(user, target, move);
  }
}

export class FailUnlessFirstTurnOnlyAttr extends MoveAttr {
  getCondition(): MoveConditionFunc {
    return (user, target, move) => firstTurnOnlyGate(user, target, move);
  }
}

export class FinalHitCritAttr extends HighCritAttr {
  private effectChance: integer;
  private gate: YuGateFunc;

  constructor(effectChance: integer = 30, gate: YuGateFunc = trappedGate) {
    super();
    this.effectChance = effectChance;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (user.turnData.hitsLeft !== 1) return true;
    if (!this.gate(user, target, move)) return true;
    if (shouldSkipBaseSecondaryTier(user, "crit")) return true;
    if (user.randSeedInt(100) >= this.effectChance) return true;
    return super.apply(user, target, move, args);
  }
}

const isFinalHit = (user: Pokemon) =>
  user.turnData.hitsLeft === 1 && user.turnData.hitCount > 0;

export class FinalHitAddBattlerTagAttr extends MoveEffectAttr {
  readonly tagType: BattlerTagType;
  private tagChance: integer;

  constructor(tagType: BattlerTagType, tagChance: integer) {
    super(false, MoveEffectTrigger.HIT);
    this.tagType = tagType;
    this.tagChance = tagChance;
  }

  resolveSecondaryTier(user: Pokemon, _target: Pokemon, _move: Move): void {
    const tierKey = battlerTagTierKey(this.tagType);
    if (tierKey) {
      setSecondaryTier(user, tierKey, false);
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return true;
    }
    const tierKey = battlerTagTierKey(this.tagType);
    if (tierKey && shouldSkipBaseSecondaryTier(user, tierKey)) {
      return true;
    }
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const originalChance = move.chance;
    try {
      move.chance = this.tagChance;
      if (user.randSeedInt(100) >= this.tagChance) {
        return false;
      }
      return target.addTag(this.tagType, 0, move.id, user.id);
    } finally {
      move.chance = originalChance;
    }
  }
}

export class GatedFinalHitAddBattlerTagAttr extends MoveEffectAttr {
  readonly tagType: BattlerTagType;
  private gate: YuGateFunc;
  private tagChance: integer;

  constructor(tagType: BattlerTagType, tagChance: integer, gate: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.tagType = tagType;
    this.gate = gate;
    this.tagChance = tagChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    const tierKey = battlerTagTierKey(this.tagType);
    if (tierKey) {
      setSecondaryTier(user, tierKey, this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return true;
    }
    const tierKey = battlerTagTierKey(this.tagType);
    if (tierKey && shouldSkipGatedSecondaryTier(user, tierKey) && hasBareFinalHitAddBattlerTagAttrForType(move, this.tagType)) {
      return true;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const originalChance = move.chance;
    try {
      move.chance = this.tagChance;
      if (user.randSeedInt(100) >= this.tagChance) {
        return false;
      }
      const applied = target.addTag(this.tagType, 0, move.id, user.id);
      if (applied && tierKey) {
        markSecondaryFamily(user, tierKey);
      }
      return applied;
    } finally {
      move.chance = originalChance;
    }
  }
}

export class FinalHitStatusEffectAttr extends StatusEffectAttr {
  private effectChance: integer;

  constructor(effect: StatusEffect, effectChance: integer) {
    super(effect, false);
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, _target: Pokemon, _move: Move): void {
    setSecondaryTier(user, statusTierKey(this.effect), false);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return true;
    }
    const statusKey = statusTierKey(this.effect);
    if (shouldSkipBaseSecondaryTier(user, statusKey)) {
      return true;
    }
    const originalChance = move.chance;
    try {
      move.chance = this.effectChance;
      return super.apply(user, target, move, args);
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalFinalHitStatusEffectAttr extends ConditionalStatusEffectAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class FinalHitStatChangeAttr extends StatChangeAttr {
  private effectChance: integer;

  constructor(stats: BattleStat | BattleStat[], levels: integer, selfTarget: boolean, effectChance: integer) {
    super(stats, levels, selfTarget, null, true);
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, _target: Pokemon, move: Move): void {
    const primaryStat = this.stats[0];
    if (hasBareFinalHitStatChangeAttrForStat(move, primaryStat)) {
      setSecondaryTier(user, statTierKey(primaryStat), false);
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean | Promise<boolean> {
    if (!isFinalHit(user)) {
      return true;
    }
    const perStatKey = statTierKey(this.stats[0]);
    if (shouldSkipBaseSecondaryTier(user, perStatKey)) {
      return true;
    }
    const originalChance = move.chance;
    try {
      move.chance = this.effectChance;
      return super.apply(user, target, move, args);
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalFinalHitStatChangeAttr extends ConditionalStatChangeAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean | Promise<boolean> {
    if (!isFinalHit(user)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class FinalHitFlinchAttr extends FlinchAttr {
  private effectChance: integer;

  constructor(effectChance: integer) {
    super();
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, _target: Pokemon, _move: Move): void {
    setSecondaryTier(user, "flinch", false);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return true;
    }
    if (shouldSkipBaseSecondaryTier(user, "flinch")) {
      return true;
    }
    const originalChance = move.chance;
    try {
      move.chance = this.effectChance;
      return super.apply(user, target, move, args);
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalFinalHitFlinchAttr extends ConditionalFlinchAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class FinalHitTrapAttr extends TrapAttr {
  private effectChance: integer;

  constructor(tagType: BattlerTagType, effectChance: integer) {
    super(tagType);
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, _target: Pokemon, _move: Move): void {
    setSecondaryTier(user, "trap", false);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return true;
    }
    if (shouldSkipBaseSecondaryTier(user, "trap")) {
      return true;
    }
    const originalChance = move.chance;
    try {
      move.chance = this.effectChance;
      return super.apply(user, target, move, args);
    } finally {
      move.chance = originalChance;
    }
  }
}

export class ConditionalFinalHitTrapAttr extends ConditionalTrapAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedResetStatsAttr extends ResetStatsAttr {
  private gate: YuGateFunc;

  constructor(targetAllPokemon: boolean, gate: YuGateFunc) {
    super(targetAllPokemon);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class FlinchOrParalysisAttr extends MoveEffectAttr {
  private chance: integer;
  constructor(chance: integer = 30) {
    super(false, MoveEffectTrigger.HIT);
    this.chance = chance;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (user.randSeedInt(100) >= this.chance) return false;
    if (user.randSeedInt(2) === 0) return target.addTag(BattlerTagType.FLINCHED, 0, move.id, user.id);
    return target.trySetStatus(StatusEffect.PARALYSIS, true, user);
  }
}

export class FlinchOrParalysisPerHitAttr extends MoveEffectAttr {
  private chance: integer;
  private gate?: YuGateFunc;
  constructor(chance: integer = 5, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.chance = chance;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (user.randSeedInt(100) < this.chance) {
      if (user.randSeedInt(2) === 0) target.addTag(BattlerTagType.FLINCHED, 0, move.id, user.id);
      else target.trySetStatus(StatusEffect.PARALYSIS, true, user);
    }
    if (this.gate && isFinalHit(user) && this.gate(user, target, move) && target.status?.effect === StatusEffect.PARALYSIS) {
      user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [BattleStat.SPD], -1));
    }
    return true;
  }
}

export class FoeEvaDropCountPowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  constructor(bpPerStage: integer = 15) {
    super();
    this.bpPerStage = bpPerStage;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const drops = Math.max(0, -target.summonData.battleStats[BattleStat.EVA]);
    (args[0] as Utils.NumberHolder).value += drops * this.bpPerStage;
    return true;
  }
}

export class FreeSubstituteAttr extends MoveEffectAttr {
  private chance: integer;
  private gate?: YuGateFunc;
  constructor(chance: integer = 30, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.chance = chance;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    if (user.randSeedInt(100) >= this.chance) return false;
    return user.addTag(BattlerTagType.SUBSTITUTE, 0, move.id, user.id, 0);
  }
}

export class GenerateRandomBerriesAttr extends MoveEffectAttr {
  private count: integer;
  constructor(count: integer = 3) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.count = count;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const berryTypes = Utils.getEnumValues(BerryType) as BerryType[];
    for (let i = 0; i < this.count; i++) {
      const pick = berryTypes[user.randSeedInt(berryTypes.length)];
      const modType = new BerryModifierType(pick);
      user.scene.addModifier(new BerryModifier(modType, user.id, pick, 1), user.isPlayer());
    }
    return true;
  }
}
export class GravityAccuracyAttr extends VariableAccuracyAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (user.scene.arena.getTag(ArenaTagType.GRAVITY)) {
      (args[0] as Utils.NumberHolder).value = 100;
      return true;
    }
    return false;
  }
}
export class GatedMoveAccuracyAttr extends VariableAccuracyAttr {
  private gate: YuGateFunc;
  private accuracy: integer;

  constructor(gate: YuGateFunc, accuracy: integer = 100) {
    super();
    this.gate = gate;
    this.accuracy = accuracy;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    (args[0] as Utils.NumberHolder).value = this.accuracy;
    return true;
  }
}

export class HealIfNotHitThisTurnAttr extends HealAttr {
  constructor(ratio: number = 0.25) {
    super(ratio, true, true);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!foeNotHitUserThisTurnGate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class HealOnAbilityDoubleHitAttr extends HealAttr {
  private gate?: YuGateFunc;
  constructor(ratio: number = 0.25, gate?: YuGateFunc) {
    super(ratio, true, true);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    if (!this.gate && user.turnData.hitCount - user.turnData.hitsLeft + 1 < 2) return false;
    return super.apply(user, target, move, args);
  }
}

export class HealOnKoAttr extends HealAttr {
  private gate?: YuGateFunc;
  constructor(ratio: number = 0.0, gate?: YuGateFunc) {
    super(ratio, true, true);
    this.trigger = MoveEffectTrigger.POST_TARGET;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon | null, move: Move, args: any[]): boolean {
    if (!target?.isFainted()) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    return super.apply(user, target, move, args);
  }
}

export class HealPerGhostMovePartyAttr extends HealAttr {
  private ratioPerAlly: number;

  constructor(ratioPerAlly: number = 0.05) {
    super(ratioPerAlly, true, true);
    this.ratioPerAlly = ratioPerAlly;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const party = user.scene.getParty(user.isPlayer());
    let ghostCount = 0;
    for (const ally of party) {
      if (ally.isFainted()) continue;
      if (ally.getMoveset(true).some(m => m?.getMove().hasFlag(MoveFlags.GHOST_MOVE))) {
        ghostCount++;
      }
    }
    this.healRatio = ghostCount * this.ratioPerAlly;
    return super.apply(user, target, move, args);
  }
}

const HIGHEST_BOOST_TYPE_STATS = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPD] as const;

const HIGHEST_BOOST_TYPE_MAP: Record<typeof HIGHEST_BOOST_TYPE_STATS[number], Type> = {
  [BattleStat.ATK]: Type.FIGHTING,
  [BattleStat.DEF]: Type.STEEL,
  [BattleStat.SPD]: Type.FLYING,
};

export class HighestBoostTypeAttr extends VariableMoveTypeAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const moveType = args[0] as Utils.NumberHolder;
    let best: (typeof HIGHEST_BOOST_TYPE_STATS)[number] | null = null;
    let bestVal = 0;
    for (const stat of HIGHEST_BOOST_TYPE_STATS) {
      const v = user.summonData.battleStats[stat];
      if (v > 0 && v > bestVal) {
        bestVal = v;
        best = stat;
      }
    }
    if (best != null) {
      moveType.value = HIGHEST_BOOST_TYPE_MAP[best] ?? move.type;
    }
    return true;
  }
}

export class HighestBoostedStatAtkAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    let best = BattleStat.ATK;
    let bestVal = user.summonData.battleStats[best];
    for (const stat of stats) {
      if (user.summonData.battleStats[stat] > bestVal) {
        bestVal = user.summonData.battleStats[stat];
        best = stat;
      }
    }
    user.turnData.attackStat = best;
    return true;
  }
}

export class HighestPositiveStagePowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  private cap: integer;
  private gate?: YuGateFunc;
  constructor(bpPerStage: integer = 10, cap: integer = 60, gate?: YuGateFunc) {
    super();
    this.bpPerStage = bpPerStage;
    this.cap = cap;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    let highest = 0;
    for (let i = 0; i < 7; i++) {
      const v = user.summonData.battleStats[i];
      if (v > highest) {
        highest = v;
      }
    }
    if (highest <= 0) {
      return true;
    }
    (args[0] as Utils.NumberHolder).value += Math.min(highest * this.bpPerStage, this.cap);
    return true;
  }
}

export class HighestStageVariableDamageAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
    let best = BattleStat.ATK;
    let bestVal = user.summonData.battleStats[best];
    for (const s of stats) {
      if (user.summonData.battleStats[s] > bestVal) { bestVal = user.summonData.battleStats[s]; best = s; }
    }
    user.turnData.attackStat = best;
    return true;
  }
}

export class HpLostPercentPowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  private cap: integer;
  private gate?: YuGateFunc;
  constructor(bpPerStage: integer = 5, cap: integer = 50, gate?: YuGateFunc) {
    super();
    this.bpPerStage = bpPerStage;
    this.cap = cap;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    const lostRatio = 1 - user.getHpRatio();
    (args[0] as Utils.NumberHolder).value += Math.min(Math.floor(lostRatio * 10) * this.bpPerStage, this.cap);
    return true;
  }
}

export class HpScaledPowerAttr extends VariablePowerAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    (args[0] as Utils.NumberHolder).value = Utils.toDmgValue(150 * user.getHpRatio());
    return true;
  }
}

export class IgnoreAllDefensesResistAbilitiesAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    user.turnData.ignoreDefenses = true;
    user.turnData.ignoreAbilities = true;
    user.turnData.ignoreTypeResistances = true;
    return true;
  }
}

export class IgnoreDefensesAndResistancesAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    user.turnData.ignoreDefenses = true;
    user.turnData.ignoreAbilities = true;
    user.turnData.ignoreTypeResistances = true;
    return true;
  }
}

export class GatedIgnoreDefensesAndResistancesAttr extends IgnoreDefensesAndResistancesAttr {
  constructor(private gate: YuGateFunc) {
    super();
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedIgnoreOpponentStatChangesAttr extends IgnoreOpponentStatChangesAttr {
  constructor(private gate: YuGateFunc) {
    super();
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class IgnoreDefensiveStagesAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    user.turnData.ignoreDefensiveStages = true;
    return true;
  }
}

export class IgnoreImmunitiesAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    user.turnData.ignoreImmunities = true;
    return true;
  }
}

export class IgnoreSpDefAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    user.turnData.ignoreSpDefOnly = true;

    if (move.category === MoveCategory.PHYSICAL) {
      user.turnData.attackStat = BattleStat.SPATK;
    }
    return true;
  }
}

export class IncomingAllyHealOnEntryAttr extends MoveEffectAttr {
  private ratio: number;
  private gate?: YuGateFunc;
  constructor(ratio: number = 0.2, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.ratio = ratio;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    user.summonData.incomingAllyHealRatio = this.ratio;
    return true;
  }
}
export class IncomingAllyStatusCureOnEntryAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    user.summonData.incomingAllyCureStatus = true;
    return true;
  }
}

export class IncomingAllyStatBoostAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private levels: integer;
  private gate?: YuGateFunc;
  constructor(statToken: string = "SPD", levels: integer = 1, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.stat = STAT_BY_TOKEN[statToken.toUpperCase()] ?? BattleStat.SPD;
    this.levels = levels;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    user.summonData.switchOutAllyStatBoost = { stat: this.stat, levels: this.levels };
    return true;
  }
}

export class IncomingStatBoostTagAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private levels: integer;
  private gate?: YuGateFunc;
  constructor(statToken: string = "ATK", levels: integer = 1, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.stat = STAT_BY_TOKEN[statToken.toUpperCase()] ?? BattleStat.ATK;
    this.levels = levels;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    user.summonData.incomingStatBoostTag = { stat: this.stat, levels: this.levels };
    return true;
  }
}

export class IncomingStatChangeAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private levels: integer;
  constructor(statToken: string = "SPD", levels: integer = -1) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.stat = STAT_BY_TOKEN[statToken.toUpperCase()] ?? BattleStat.SPD;
    this.levels = levels;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    user.summonData.incomingStatBoostTag = { stat: this.stat, levels: this.levels };
    return true;
  }
}

export class InfestOrInfectAttr extends MoveEffectAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    target.summonData.disabledMove = target.getLastXMoves(1)[0]?.move ?? Moves.NONE;
    target.summonData.disabledTurns = 4;
    if (target.status?.effect && isNonVolatileStatusEffect(target.status.effect)) {
      target.addTag(BattlerTagType.INFESTATION, 4, move.id, user.id);
    }
    return true;
  }
}

export class InvertResistToWeakAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    user.summonData.pendingTypeResist = target.getTypes(true)[0];
    return true;
  }
}

export class KnowledgeDrainStatStealAttr extends MoveEffectAttr {
  private chance: integer;
  constructor(chance: integer = 30) {
    super(false, MoveEffectTrigger.HIT);
    this.chance = chance;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (user.randSeedInt(100) >= this.chance) return false;
    const stat = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD][user.randSeedInt(5)];
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [stat], -1));
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [stat], 1));
    return true;
  }
}
export class LastRespectsAttr extends MovePowerMultiplierAttr {
  constructor() {
    super((user) =>
      1 + Math.min(user.isPlayer() ? user.scene.currentBattle.playerFaints : user.scene.currentBattle.enemyFaints, 100),
    );
  }
}
export class BonusRandomMoveAfterAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!user.isActive(true)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const moveset = user.getMoveset();
    const pool = moveset.filter(m => m && m.moveId !== move.id && !m.getMove().hasFlag(MoveFlags.IGNORE_VIRTUAL));
    if (!pool.length) {
      return false;
    }
    const bonus = pool[user.randSeedInt(pool.length)]!;
    const moveIndex = moveset.findIndex(m => m?.moveId === bonus.moveId);
    if (moveIndex < 0) {
      return false;
    }
    const moveTargets = getMoveTargets(user, bonus.moveId);
    if (!moveTargets.targets.length) {
      return false;
    }
    let selectTargets: BattlerIndex[];
    switch (true) {
      case (moveTargets.multiple || moveTargets.targets.length === 1): {
        selectTargets = moveTargets.targets;
        break;
      }
      case (moveTargets.targets.indexOf(target.getBattlerIndex()) > -1): {
        selectTargets = [ target.getBattlerIndex() ];
        break;
      }
      default: {
        const allyIndex = user.getAlly()?.getBattlerIndex();
        if (allyIndex != null) {
          const idx = moveTargets.targets.indexOf(allyIndex);
          if (idx > -1) {
            moveTargets.targets.splice(idx, 1);
          }
        }
        selectTargets = [ moveTargets.targets[user.randSeedInt(moveTargets.targets.length)] ];
        break;
      }
    }
    user.getMoveQueue().push({ move: bonus.moveId, targets: selectTargets, ignorePP: true });
    user.scene.unshiftPhase(new MovePhase(user.scene, user, selectTargets, moveset[moveIndex]!, true, true));
    return true;
  }
}

export class LivingAmmunitionAttr extends MovePowerMultiplierAttr {
  private hpRatio: number;
  private powerMult: number;
  private gate: YuGateFunc;
  constructor(hpRatio: number = 0.2, powerMult: number = 2.5, gate: YuGateFunc = userItemlessGate) {
    super((user, target, move) => {
      if (!this.gate(user, target, move)) {
        return 1;
      }
      user.damageAndUpdate(Math.floor(user.getMaxHp() * this.hpRatio), HitResult.OTHER, false, true, true);
      return this.powerMult;
    });
    this.hpRatio = hpRatio;
    this.powerMult = powerMult;
    this.gate = gate;
  }

  getCondition(): MoveConditionFunc {
    return (user, target, move) => this.gate(user, target, move);
  }
}

export class LowerDefSpDefBoostAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.HIT);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const def = user.getBattleStat(Stat.DEF);
    const spdef = user.getBattleStat(Stat.SPDEF);
    const stat = def <= spdef ? BattleStat.DEF : BattleStat.SPDEF;
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [stat], 2));
    return true;
  }
}

export class MatchFoeHpToUserAttr extends MoveEffectAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const foe = foeForGate(user, target);
    const desiredHp = Math.max(1, Utils.toDmgValue(foe.getMaxHp() * user.getHpRatio()));
    const delta = foe.hp - desiredHp;
    if (delta > 0) foe.damageAndUpdate(delta, HitResult.OTHER, false, true, true);
    else if (delta < 0) foe.heal(-delta);
    user.scene.unshiftPhase(new StatChangePhase(user.scene, foe.getBattlerIndex(), false, [BattleStat.ATK, BattleStat.SPD], -1));
    return true;
  }
}
export class GatedMatchFoeHpToUserAttr extends MoveEffectAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return true;
    }
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const foe = foeForGate(user, target);
    const delta = user.hp - foe.hp;
    if (delta > 0) {
      foe.damageAndUpdate(delta, HitResult.OTHER, false, true, true);
    } else if (delta < 0) {
      foe.heal(-delta);
    }
    return true;
  }
}

export class MirrorStatStagesAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const foe = foeForGate(user, target);
    if (this.gate && !this.gate(user, foe, move)) return false;
    for (let i = 0; i < 7; i++) {
      const userStage = user.summonData.battleStats[i];
      if (userStage > 0) {
        user.scene.unshiftPhase(new StatChangePhase(user.scene, foe.getBattlerIndex(), false, [i], -userStage));
      }
    }
    return true;
  }
}

export class MutualTrapAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.HIT);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const chance = move.chance >= 0 ? move.chance : 100;
    if (chance < 100 && user.randSeedInt(100) >= chance) {
      return false;
    }
    return target.addTag(BattlerTagType.TRAPPED, 1, move.id, user.id)
      && user.addTag(BattlerTagType.TRAPPED, 1, move.id, target.id);
  }
}

export class NoWakeOnHitAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return true;
    }
    user.turnData.noWakeOnHit = true;
    return true;
  }
}

export class OverrideBasePowerAttr extends VariablePowerAttr {
  private base: integer;
  constructor(base: integer = 140) {
    super();
    this.base = base;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    (args[0] as Utils.NumberHolder).value = this.base;
    return true;
  }
}

export class GatedOverrideBasePowerAttr extends VariablePowerAttr {
  private base: integer;
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc, base: integer = 140) {
    super();
    this.gate = gate;
    this.base = base;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    (args[0] as Utils.NumberHolder).value = this.base;
    return true;
  }
}

export class ClearPositiveStatsAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const pokemonToClear = move.moveTarget === MoveTarget.USER ? user.getOpponents() : [target];
    for (const pokemon of pokemonToClear) {
      for (let s = 0; s < pokemon.summonData.battleStats.length; s++) {
        if (pokemon.summonData.battleStats[s] > 0) {
          pokemon.summonData.battleStats[s] = 0;
        }
      }
      pokemon.updateInfo();
    }
    return true;
  }
}

export class GatedClearPositiveStatsAttr extends ClearPositiveStatsAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

const partyDarkMagicAllyCount = (user: Pokemon, includeFainted = false): integer => {
  const party = user.scene.getParty(user.isPlayer());
  let count = 0;
  for (const ally of party) {
    if (ally.id === user.id) continue;
    if (!includeFainted && ally.isFainted()) continue;
    if (ally.getMoveset(true).some(m => m?.getMove().hasFlag(MoveFlags.DARK_MAGIC_MOVE))) count++;
  }
  return count;
};

export class PartyDarkMagicCountPowerAttr extends VariablePowerAttr {
  protected bpPerAlly: integer;
  constructor(bpPerAlly: integer = 10) {
    super();
    this.bpPerAlly = bpPerAlly;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    (args[0] as Utils.NumberHolder).value += partyDarkMagicAllyCount(user) * this.bpPerAlly;
    return true;
  }
}

export class PartyDarkMagicCountBpAttr extends PartyDarkMagicCountPowerAttr {
  constructor(bpPerAlly: integer = 15) {
    super(bpPerAlly);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    (args[0] as Utils.NumberHolder).value += partyDarkMagicAllyCount(user, true) * this.bpPerAlly;
    return true;
  }
}

export class PartyDarkMagicPercentPowerAttr extends MovePowerMultiplierAttr {
  constructor(percentPerAlly: number = 0.1) {
    super((user) => 1 + percentPerAlly * partyDarkMagicAllyCount(user));
  }
}

export class PartyTypeCountPowerAttr extends VariablePowerAttr {
  private bpPerAlly: integer;
  private cap: integer;
  constructor(bpPerAlly: integer = 10, cap: integer = 50) {
    super();
    this.bpPerAlly = bpPerAlly;
    this.cap = cap;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const party = user.scene.getParty(user.isPlayer());
    let count = 0;
    for (const ally of party) {
      if (ally === user || ally.isFainted()) continue;
      const types = ally.getTypes(true);
      if (types.includes(Type.NORMAL) || types.includes(Type.FIGHTING)) count++;
    }
    (args[0] as Utils.NumberHolder).value += Math.min(count * this.bpPerAlly, this.cap);
    return true;
  }
}
export class BranchStatChangeByGateAttr extends MoveEffectAttr {
  private ifGate: YuGateFunc;
  private thenStat: BattleStat;
  private elseStat: BattleStat;
  private levels: integer;

  constructor(ifGate: YuGateFunc, thenStat: BattleStat, elseStat: BattleStat, levels: integer = -1) {
    super(false, MoveEffectTrigger.HIT);
    this.ifGate = ifGate;
    this.thenStat = thenStat;
    this.elseStat = elseStat;
    this.levels = levels;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const stat = this.ifGate(user, target, move) ? this.thenStat : this.elseStat;
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [stat], this.levels));
    return true;
  }
}
export class GatedRemoveHeldItemAttr extends RemoveHeldItemAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc, berriesOnly: boolean = false) {
    super(berriesOnly);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedRemoveHeldItemChanceAttr extends RemoveHeldItemAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(gate: YuGateFunc, effectChance: integer = 100, berriesOnly: boolean = false) {
    super(berriesOnly);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance < 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class PerHitStatChangeAttr extends MoveEffectAttr {
  private chance: integer;
  private stat: BattleStat;
  private levels: integer;
  constructor(chance: integer = 20, stat: BattleStat = BattleStat.SPDEF, levels: integer = -1) {
    super(false, MoveEffectTrigger.HIT);
    this.chance = chance;
    this.stat = stat;
    this.levels = levels;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (user.randSeedInt(100) >= this.chance) return false;
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [this.stat], this.levels));
    return true;
  }
}

export class PermafrostBonusDamageAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    if (target.status?.effect !== StatusEffect.FREEZE) return false;
    target.damageAndUpdate(Math.floor(target.getMaxHp() * 0.25), HitResult.OTHER, false, true, true);
    return true;
  }
}

export class PhoenixBarkAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (user.battleData.phoenixBarkUsed) return false;
    user.battleData.phoenixBarkArmed = true;
    return true;
  }
}

export class PositiveStageCountPowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  private cap: integer;
  private gate?: YuGateFunc;
  constructor(bpPerStage: integer = 10, cap: integer = 60, gate?: YuGateFunc) {
    super();
    this.bpPerStage = bpPerStage;
    this.cap = cap;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const v = user.summonData.battleStats[i];
      if (v > 0) total += v;
    }
    (args[0] as Utils.NumberHolder).value += Math.min(total * this.bpPerStage, this.cap);
    return true;
  }
}

export class PostHitRandomStatUpDownAttr extends MoveEffectAttr {
  constructor() {
    super(false, MoveEffectTrigger.HIT);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const up = stats[user.randSeedInt(stats.length)];
    const downPool = stats.filter(s => s !== up);
    const down = downPool[user.randSeedInt(downPool.length)];
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [up], 1));
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [down], -1));
    return true;
  }
}

export class PostKoHealAttr extends HealAttr {
  private gate?: YuGateFunc;
  constructor(ratio: number = 0.0, gate?: YuGateFunc) {
    super(ratio, true, true);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!target.isFainted()) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    return super.apply(user, target, move, args);
  }
}

export class PostVictoryStatBoostAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_TARGET);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!target.isFainted()) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [BattleStat.ATK, BattleStat.SPD], 1));
    return true;
  }
}

export class ProximityPowerAttr extends VariablePowerAttr {
  private bonus: integer;
  private gate?: YuGateFunc;
  constructor(bonus: integer = 20, gate?: YuGateFunc) {
    super();
    this.bonus = bonus;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    (args[0] as Utils.NumberHolder).value += this.bonus;
    return true;
  }
}
export class CombatDepthStatDropAttr extends MoveEffectAttr {
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(effectChance: integer = 50, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.effectChance = effectChance;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args?: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return true;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    for (const stat of stats) {
      if (user.randSeedInt(100) < this.effectChance) {
        user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [stat], -1));
      }
    }
    return true;
  }
}
export class FoeLowHpPowerAttr extends VariablePowerAttr {
  private maxBonusBp: integer;
  private gate?: YuGateFunc;

  constructor(maxBonusBp: integer, gate?: YuGateFunc) {
    super();
    this.maxBonusBp = maxBonusBp;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return true;
    }
    const bonus = Math.floor(this.maxBonusBp * (1 - target.getHpRatio()));
    (args[0] as Utils.NumberHolder).value += bonus;
    return true;
  }
}

export class GatedMatchHpAttr extends MatchHpAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedHpSplitAttr extends HpSplitAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): Promise<boolean> {
    if (!this.gate(user, target, move)) {
      return Promise.resolve(true);
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedDelayedAttackAttr extends DelayedAttackAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(
    tagType: ArenaTagType,
    chargeAnim: ChargeAnim,
    message: string,
    gate: YuGateFunc,
    effectChance: integer = 100,
  ) {
    super(tagType, chargeAnim, message);
    this.gate = gate;
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): Promise<boolean> {
    if (!this.gate(user, target, move)) {
      return Promise.resolve(true);
    }
    if (this.effectChance < 100 && user.randSeedInt(100) >= this.effectChance) {
      return Promise.resolve(true);
    }
    const foe = foeForGate(user, target);
    return super.apply(user, foe, move, args);
  }
}
export class GatedFutureSightOnHitAttr extends MoveEffectAttr {
  private gate: YuGateFunc;
  private effectChance: integer;
  private message: string;

  constructor(
    gate: YuGateFunc,
    effectChance: integer = 100,
    message: string = i18next.t("moveTriggers:foresawAnAttack", { pokemonName: "{USER}" }),
  ) {
    super(false, MoveEffectTrigger.HIT);
    this.gate = gate;
    this.effectChance = effectChance;
    this.message = message;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "futureSight", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return true;
    }
    if (this.effectChance < 100 && user.randSeedInt(100) >= this.effectChance) {
      return true;
    }
    user.scene.queueMessage(
      this.message
        .replace("{TARGET}", getPokemonNameWithAffix(target))
        .replace("{USER}", getPokemonNameWithAffix(user)),
    );
    user.scene.arena.addTag(
      ArenaTagType.FUTURE_SIGHT,
      3,
      move.id,
      user.id,
      ArenaTagSide.BOTH,
      false,
      target.getBattlerIndex(),
    );
    return true;
  }
}

export class RandomAbilityReplaceAttr extends MoveEffectAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const pool = [Abilities.TRUANT, Abilities.SLOW_START, Abilities.DEFEATIST, Abilities.STALL, Abilities.NORMALIZE];
    const ability = pool[user.randSeedInt(pool.length)];
    target.summonData.ability = ability;
    user.scene.triggerPokemonFormChange(target, SpeciesFormChangeRevertWeatherFormTrigger);
    user.scene.queueMessage(i18next.t("moveTriggers:acquiredAbility", {
      pokemonName: getPokemonNameWithAffix(target),
      abilityName: allAbilities[ability].name,
    }));
    target.updateInfo();
    return true;
  }
}

export class RandomCategoryHigherOffenseAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    move.category = user.randSeedInt(2) === 0 ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;
    user.turnData.attackStat = user.getBattleStat(Stat.ATK) >= user.getBattleStat(Stat.SPATK) ? BattleStat.ATK : BattleStat.SPATK;
    return true;
  }
}

export class RandomSelfFoeStatusAttr extends MoveEffectAttr {
  private chance: integer;
  private gate?: YuGateFunc;
  private selfOnly: boolean;

  constructor(chance: integer = 30, gate?: YuGateFunc, selfOnly = false) {
    super(false, MoveEffectTrigger.HIT);
    this.chance = chance;
    this.gate = gate;
    this.selfOnly = selfOnly;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    if (user.randSeedInt(100) >= this.chance) return false;
    const effects = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC];
    const pick = effects[user.randSeedInt(effects.length)];
    user.trySetStatus(pick, true, user);
    if (!this.selfOnly) {
      target.trySetStatus(pick, true, user);
    }
    return true;
  }
}

const hasBareRandomStatBoostAllAttr = (move: Move) =>
  move.attrs.some(a => a instanceof RandomStatBoostAllAttr && !(a as RandomStatBoostAllAttr).hasGate());

export class RandomStatBoostAllAttr extends MoveEffectAttr {
  private levels: integer;
  private chance: integer;
  private gate?: YuGateFunc;

  hasGate(): boolean {
    return !!this.gate;
  }

  constructor(levels: integer = 1, chance: integer = 10, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.levels = levels;
    this.chance = chance;
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (this.gate) {
      setSecondaryTier(user, "randomStatBoostAll", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    if (this.gate && shouldSkipGatedSecondaryTier(user, "randomStatBoostAll") && hasBareRandomStatBoostAllAttr(move)) {
      return false;
    }
    if (!this.gate && shouldSkipBaseSecondaryTier(user, "randomStatBoostAll")) {
      return false;
    }
    if (user.randSeedInt(100) >= this.chance) return false;
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
    for (const stat of stats) {
      user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [stat], this.levels));
    }
    return true;
  }
}

export class RandomStatDropBothSidesAttr extends MoveEffectAttr {
  private stages: integer;

  constructor(stages: integer = 1) {
    super();
    this.stages = stages;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const userPick = stats[user.randSeedInt(stats.length)];
    const foePick = stats[user.randSeedInt(stats.length)];
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [userPick], -this.stages));
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [foePick], -this.stages));
    return true;
  }
}

export class RandomStatusReplaceAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    const foe = foeForGate(user, target);
    const current = foe.status?.effect;
    if (!current || !isNonVolatileStatusEffect(current)) return false;
    const pool = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.SLEEP, StatusEffect.FREEZE]
      .filter(s => s !== current);
    if (!pool.length) return false;
    const pick = pool[user.randSeedInt(pool.length)];
    foe.resetStatus();
    return foe.trySetStatus(pick, true, user);
  }
}

export class RandomTerrainAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const terrains = [TerrainType.GRASSY, TerrainType.ELECTRIC, TerrainType.PSYCHIC, TerrainType.MISTY];
    const t = terrains[user.randSeedInt(terrains.length)];
    user.scene.arena.setTerrain(t, 5);
    return true;
  }
}

export class RandomTypeResistanceAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    const foe = foeForGate(user, target);
    const foeType = foe.getTypes(true)[0];
    let bestType = Type.NORMAL;
    let bestMult = 2;
    for (let t = Type.NORMAL; t <= Type.FAIRY; t++) {
      const mult = getTypeDamageMultiplier(foeType, t);
      if (mult < bestMult) { bestMult = mult; bestType = t; }
    }
    user.summonData.types = [user.getTypes(true)[0], bestType].filter((v, i, a) => a.indexOf(v) === i);
    user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * 0.25), "", true, true));
    return true;
  }
}

export class RedirectAbilityRecoilAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    let amount: number;
    if ((user.turnData.abilityRecoilThisTurn ?? 0) > 0) {
      amount = Math.max(1, Math.floor(user.getMaxHp() * 0.2));
    } else if (move.recoil?.[0]) {
      amount = Math.floor(user.getMaxHp() * move.recoil[0] / move.recoil[1]);
      move.recoil = [0, 0];
    } else {
      return false;
    }
    target.damageAndUpdate(amount, HitResult.OTHER, false, true, true);
    return true;
  }
}
export class RemoveFlyingTypeAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (!target.isOfType(Type.FLYING)) {
      return false;
    }
    const types = target.getTypes(true).filter(t => t !== Type.FLYING);
    target.summonData.types = types.length ? types : [Type.NORMAL];
    target.updateInfo();
    return true;
  }
}

export class RemoveNegativeStatAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private gate?: YuGateFunc;
  constructor(stat: BattleStat = BattleStat.ATK, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.stat = stat;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    if (target.summonData.battleStats[this.stat] < 0) {
      target.summonData.battleStats[this.stat] = 0;
      target.updateInfo();
    }
    return true;
  }
}

export class ClearAllNegativeStatsAndHealAttr extends MoveEffectAttr {
  private healRatio: number;
  private gate?: YuGateFunc;

  constructor(healRatio: number = 0.25, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.healRatio = healRatio;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
    let anyReset = false;
    for (const stat of stats) {
      if (user.summonData.battleStats[stat] < 0) {
        user.summonData.battleStats[stat] = 0;
        anyReset = true;
      }
    }
    if (anyReset) {
      user.updateInfo();
    }
    user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * this.healRatio), "", true, true));
    return true;
  }
}

export class ResetArenaTagAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    user.scene.arena.removeTag(ArenaTagType.TRICK_ROOM);
    if (this.gate && this.gate(user, target, move)) {
      user.addTag(BattlerTagType.CRIT_BOOST, 5, move.id, user.id);
    }
    return true;
  }
}

export class RetainSubstituteForAllyAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && this.gate(user, target, move) && user.getTag(BattlerTagType.SUBSTITUTE)) {
      user.summonData.retainSubstituteForAlly = true;
    }
    return true;
  }
}

export class RetriggerEntryAbilityAttr extends MoveEffectAttr {
  constructor() {
    super(false, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    user.scene.unshiftPhase(new PostSummonPhase(user.scene, user.getBattlerIndex()));
    return true;
  }
}

export class TriggerDualCoreBootAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    user.summonData.types = [Type.STEEL, Type.FIGHTING];
    if (user.battleSummonData) {
      user.battleSummonData.turnCount = Math.max(user.battleSummonData.turnCount, 2);
    }
    user.updateInfo();
    return true;
  }
}

export class SelfStatusAfterKoAttr extends MoveEffectAttr {
  private effect?: StatusEffect;
  private statusPool?: StatusEffect[];
  private gate?: YuGateFunc;
  constructor(effectOrPool: StatusEffect | StatusEffect[] = StatusEffect.BURN, gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_TARGET);
    if (Array.isArray(effectOrPool)) {
      this.statusPool = effectOrPool;
    } else {
      this.effect = effectOrPool;
    }
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!target.isFainted()) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    const effect = this.statusPool
      ? this.statusPool[user.randSeedInt(this.statusPool.length)]
      : this.effect!;
    return user.trySetStatus(effect, true, user);
  }
}

export class SetBiomeNightAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const wasNight = this.gate ? this.gate(user, target, move) : false;
    if (!user.battleData) { user.resetBattleData(); }
    user.battleData.nightBiomeActive = true;
    if (wasNight) {
      user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [BattleStat.SPATK, BattleStat.SPD], 1));
      const side = user.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
      user.scene.arena.addTag(ArenaTagType.REFLECT, 5, move.id, user.id, side);
    }
    return true;
  }
}

export class ShedTailSubstituteAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const hpCost = Math.floor(user.getMaxHp() * 0.5);
    if (user.hp <= hpCost) return false;
    user.damageAndUpdate(hpCost, HitResult.OTHER, false, true, true);
    return user.addTag(BattlerTagType.SUBSTITUTE, 0, move.id, user.id, hpCost);
  }
}

export class StageScaledPowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;
  private gate?: YuGateFunc;
  constructor(bpPerStage: integer = 10, gate?: YuGateFunc) {
    super();
    this.bpPerStage = bpPerStage;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const v = user.summonData.battleStats[i];
      if (v > 0) total += v;
    }
    (args[0] as Utils.NumberHolder).value += total * this.bpPerStage;
    return true;
  }
}

export class StatChangeBothSideAttr extends MoveEffectAttr {
  private stat: BattleStat;
  private levels: integer;
  constructor(statToken: string = "DEF", levels: integer = -1) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.stat = STAT_BY_TOKEN[statToken.toUpperCase()] ?? BattleStat.DEF;
    this.levels = levels;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [this.stat], this.levels));
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [this.stat], this.levels));
    return true;
  }
}

export class StatCompareTypeAttr extends VariableMoveTypeAttr {
  private typeIfHigher: Type;
  private typeIfLower: Type;
  private statHigh: BattleStat;
  private statLow: BattleStat;
  constructor(typeIfHigher: Type, typeIfLower: Type, statHigh: BattleStat = BattleStat.SPATK, statLow: BattleStat = BattleStat.SPDEF) {
    super();
    this.typeIfHigher = typeIfHigher;
    this.typeIfLower = typeIfLower;
    this.statHigh = statHigh;
    this.statLow = statLow;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const moveType = args[0] as Utils.NumberHolder;
    const highVal = this.statHigh === BattleStat.SPATK && this.statLow === BattleStat.SPDEF
      ? user.getBattleStat(Stat.SPATK)
      : user.summonData.battleStats[this.statHigh];
    const lowVal = this.statHigh === BattleStat.SPATK && this.statLow === BattleStat.SPDEF
      ? user.getBattleStat(Stat.SPDEF)
      : user.summonData.battleStats[this.statLow];
    moveType.value = highVal > lowVal ? this.typeIfHigher : this.typeIfLower;
    return true;
  }
}

export class StatusByMoveTypeAttr extends MoveEffectAttr {
  private iceChance: integer;
  private rockChance: integer;
  constructor(iceChance: integer = 35, rockChance: integer = 35) {
    super(false, MoveEffectTrigger.HIT);
    this.iceChance = iceChance;
    this.rockChance = rockChance;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (move.type === Type.ICE && user.randSeedInt(100) < this.iceChance) {
      return target.trySetStatus(StatusEffect.FREEZE, true, user);
    }
    if (move.type === Type.ROCK && user.randSeedInt(100) < this.rockChance) {
      return target.addTag(BattlerTagType.SALT_CURED, 0, move.id, user.id);
    }
    return true;
  }
}

export class StatusShedTransferAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const userStatus = user.hasAbility(Abilities.COMATOSE) ? StatusEffect.SLEEP : user.status?.effect;
    if (!userStatus || !isNonVolatileStatusEffect(userStatus)) return false;
    const foe = foeForGate(user, target);
    if (foe.status?.effect && isNonVolatileStatusEffect(foe.status.effect)) {
      if (foe.trySetStatus(StatusEffect.TOXIC, true, user)) {
        user.resetStatus();
        user.updateInfo();
        return true;
      }
      return false;
    }
    if (foe.trySetStatus(userStatus, true, user)) {
      user.resetStatus();
      user.updateInfo();
      return true;
    }
    return false;
  }
}

export class StatusTransferToFoeAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const userStatus = user.status?.effect;
    if (!userStatus || !isNonVolatileStatusEffect(userStatus)) return false;
    if (target.trySetStatus(userStatus, true, user)) {
      user.resetStatus();
      user.updateInfo();
      return true;
    }
    return false;
  }
}

export class StealHeldItemAttr extends MoveEffectAttr {
  private chance: integer;
  private gate?: YuGateFunc;
  constructor(chance: integer = 50, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.chance = chance;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): Promise<boolean> {
    if (this.gate && !this.gate(user, target, move)) return Promise.resolve(false);
    return new StealHeldItemChanceAttr(this.chance / 100).apply(user, target, move, args);
  }
}

export class StealHeldItemOnSwitchAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    target.summonData.stealItemOnSwitch = true;
    target.summonData.stealItemOnSwitchBeneficiaryId = user.id;
    return true;
  }
}

export class StealHighestOffenseStageAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    const foe = foeForGate(user, target);
    const atk = foe.summonData.battleStats[BattleStat.ATK];
    const spatk = foe.summonData.battleStats[BattleStat.SPATK];
    const stat = atk >= spatk ? BattleStat.ATK : BattleStat.SPATK;
    if (foe.summonData.battleStats[stat] > 0) {
      user.scene.unshiftPhase(new StatChangePhase(user.scene, foe.getBattlerIndex(), false, [stat], -1));
      user.scene.unshiftPhase(new StatChangePhase(user.scene, user.getBattlerIndex(), true, [stat], 1));
    }
    return true;
  }
}

export class SuperEffectiveVsGrassAttr extends VariableMoveTypeMultiplierAttr {
  private types: Type[];
  constructor(types: Type[] = [Type.GRASS]) {
    super();
    this.types = types;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const mult = args[0] as Utils.NumberHolder;
    for (const t of this.types) {
      if (target.isOfType(t)) { mult.value = 2; return true; }
    }
    return true;
  }
}

export class SuperEffectiveVsGroundAttr extends VariableMoveTypeMultiplierAttr {
  private types: Type[];
  private gate?: YuGateFunc;
  constructor(types: Type[] = [Type.GROUND], gate?: YuGateFunc) {
    super();
    this.types = types;
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return true;
    }
    const mult = args[0] as Utils.NumberHolder;
    for (const t of this.types) {
      if (target.isOfType(t)) { mult.value = 2; return true; }
    }
    return true;
  }
}

export class SuperEffectiveVsTypesAttr extends VariableMoveTypeMultiplierAttr {
  private types: Type[];
  constructor(types: Type[]) {
    super();
    this.types = types;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const mult = args[0] as Utils.NumberHolder;
    for (const t of this.types) {
      if (target.isOfType(t)) { mult.value = 2; return true; }
    }
    return true;
  }
}

export class GatedSuperEffectiveVsTypesAttr extends SuperEffectiveVsTypesAttr {
  private gate: YuGateFunc;

  constructor(types: Type[], gate: YuGateFunc) {
    super(types);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

export class SwitchHealBlockAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && this.gate(user, target, move)) {
      target.addTag(BattlerTagType.HEAL_BLOCKED, 5, move.id, user.id);
    }
    return true;
  }
}

export class TerrainMatchTypeAttr extends VariableMoveTypeAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const moveType = args[0] as Utils.NumberHolder;
    const terrain = user.scene.arena.terrain?.terrainType;
    const map: Partial<Record<TerrainType, Type>> = {
      [TerrainType.ELECTRIC]: Type.ELECTRIC,
      [TerrainType.GRASSY]: Type.GRASS,
      [TerrainType.PSYCHIC]: Type.PSYCHIC,
      [TerrainType.MISTY]: Type.FAIRY,
    };
    if (terrain && map[terrain]) moveType.value = map[terrain]!;
    return true;
  }
}

export class ThawAndDoubleFrozenAttr extends VariableMoveTypeMultiplierAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return true;
    }
    if (target.status?.effect === StatusEffect.FREEZE) {
      target.resetStatus();
      (args[0] as Utils.NumberHolder).value = 2;
    }
    return true;
  }
}

export class ToonImmunityAttr extends MoveEffectAttr {
  private turnCount: integer;

  constructor(turnCount: integer = 3) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.turnCount = turnCount;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    return user.addTag(BattlerTagType.TOON_IMMUNITY, this.turnCount, move.id, user.id);
  }
}

export class TransferStatusToFoeAttr extends MoveEffectAttr {
  private healRatio: number;
  constructor(healRatio: number = 0) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.healRatio = healRatio;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.healRatio > 0) {
      user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * this.healRatio), "", true, true));
    }
    const eff = user.status?.effect;
    if (!eff || !isNonVolatileStatusEffect(eff)) return true;
    const foe = foeForGate(user, target);
    if (foe.trySetStatus(eff, true, user)) {
      user.resetStatus();
      user.updateInfo();
    }
    return true;
  }
}
function resolveTriTypeFieldResetType(user: Pokemon, target: Pokemon, move: Move): Type {
  const declared = move.type as Type;
  if (declared === Type.WATER || declared === Type.ELECTRIC || declared === Type.FLYING) {
    return declared;
  }
  if (declared === Type.NORMAL && user.hasAbility(Abilities.ELEMENTAL_HAVOC)) {
    return user.getMoveType(move, true, target);
  }
  return declared;
}

export class TriTypeFieldResetAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const type = resolveTriTypeFieldResetType(user, target, move);
    if (type === Type.UNKNOWN) {
      new ResetWeatherFromStartAttr("RAIN").apply(user, target, move, args);
      new ResetTerrainFromStartAttr("ELECTRIC").apply(user, target, move, args);
      new ResetTailwindFromStartAttr().apply(user, target, move, args);
    } else if (type === Type.WATER) {
      new ResetWeatherFromStartAttr("RAIN").apply(user, target, move, args);
    } else if (type === Type.ELECTRIC) {
      new ResetTerrainFromStartAttr("ELECTRIC").apply(user, target, move, args);
    } else if (type === Type.FLYING) {
      new ResetTailwindFromStartAttr().apply(user, target, move, args);
    }
    return true;
  }
}

export class TriggerAbilityImmediatelyAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gateOrMinParty: YuGateFunc | integer = 2, maybeGate?: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    if (typeof gateOrMinParty === "function") {
      this.gate = gateOrMinParty;
    } else if (maybeGate) {
      this.gate = maybeGate;
    }
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    applyPostTurnAbAttrs(PostTurnAbAttr, user);
    return true;
  }
}

export class TriggerPartnerAbilityFlipAttr extends MoveEffectAttr {
  constructor() {
    super(false, MoveEffectTrigger.POST_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    return triggerMagiciansCoinEffect(user);
  }
}
export class TriggerReviveAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    user.summonData.triggerRevive = true;
    return true;
  }
}

export class TripleAccelHitHealAttr extends HitHealAttr {
  constructor(ratio: number = 0.4) {
    super(ratio);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (user.turnData.secondaryFamilyApplied) {
      user.turnData.secondaryFamilyApplied.hitHeal = false;
    }
    const ok = super.apply(user, target, move, args);
    if (user.turnData.secondaryFamilyApplied) {
      user.turnData.secondaryFamilyApplied.hitHeal = false;
    }
    return ok;
  }
}

export class TrophyBladePermanentBpAttr extends VariablePowerAttr {
  private bonus: integer;
  constructor(bonus: integer = 20) {
    super();
    this.bonus = bonus;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const faintedDragons = user.scene.getParty(!user.isPlayer()).filter(p =>
      p.isFainted() && (p.getType1() === Type.DRAGON || p.getType2() === Type.DRAGON)).length;
    user.summonData.permanentBpBonus = faintedDragons * this.bonus;
    (args[0] as Utils.NumberHolder).value += user.summonData.permanentBpBonus;
    return true;
  }
}

export class TurnsOnFieldPowerAttr extends VariablePowerAttr {
  private bpPerTurn: integer;
  private cap: integer;
  constructor(bpPerTurn: integer = 10, cap: integer = 50) {
    super();
    this.bpPerTurn = bpPerTurn;
    this.cap = cap;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const turns = user.battleSummonData.turnCount ?? 1;
    (args[0] as Utils.NumberHolder).value += Math.min(Math.max(0, turns - 1) * this.bpPerTurn, this.cap);
    return true;
  }
}

export class TwoTurnMoveAttr extends ChargeAttr {
  constructor(mode: string = "DIVE") {
    super(
      mode === "FLY" ? ChargeAnim.FLY : ChargeAnim.DIVE,
      mode === "FLY" ? BattlerTagType.FLYING : BattlerTagType.UNDERWATER,
      mode === "FLY" ? Type.FLYING : Type.WATER
    );
  }
}

export class TypeBoostVsDarkPsychicAttr extends VariableMoveTypeMultiplierAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super();
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    if (target.isOfType(Type.DARK) || target.isOfType(Type.PSYCHIC)) {
      (args[0] as Utils.NumberHolder).value = 2;
    }
    return true;
  }
}
export class TypeMorphAttr extends VariableMoveTypeAttr {
  private morphType: Type;
  private gate?: YuGateFunc;

  constructor(morphType: Type, gate?: YuGateFunc) {
    super();
    this.morphType = morphType;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!target || (this.gate && !this.gate(user, target, move))) {
      return false;
    }
    const moveType = args[0];
    if (!(moveType instanceof Utils.NumberHolder)) {
      return false;
    }
    moveType.value = this.morphType;
    return true;
  }
}
export class ForceSuperEffectiveAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    user.turnData.forceSuperEffective = true;
    return true;
  }
}

export class TypeOverrideAttr extends VariableMoveTypeAttr {
  private overrideType: Type;
  private gate?: YuGateFunc;
  constructor(overrideTypeOrGate?: Type | YuGateFunc, maybeGate?: YuGateFunc) {
    super();
    if (typeof overrideTypeOrGate === "function") {
      this.overrideType = Type.NORMAL;
      this.gate = overrideTypeOrGate;
    } else {
      this.overrideType = overrideTypeOrGate ?? Type.NORMAL;
      this.gate = maybeGate;
    }
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    const moveType = args[0];
    if (!(moveType instanceof Utils.NumberHolder)) return false;
    moveType.value = this.overrideType;
    return true;
  }
}

export class UseDefenseStatAsAttackAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    user.turnData.useDefenseStat = true;
    return true;
  }
}

export class UseFoeAttackStatAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    user.turnData.useFoeAttackStat = true;
    return true;
  }
}

export class UseFoeHighestStatOffenseAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const statPairs: [Stat, BattleStat][] = [
      [Stat.ATK, BattleStat.ATK],
      [Stat.DEF, BattleStat.DEF],
      [Stat.SPATK, BattleStat.SPATK],
      [Stat.SPDEF, BattleStat.SPDEF],
      [Stat.SPD, BattleStat.SPD],
    ];
    let best = BattleStat.ATK;
    let bestVal = target.getBattleStat(Stat.ATK);
    for (const [stat, battleStat] of statPairs) {
      const val = target.getBattleStat(stat);
      if (val > bestVal) {
        bestVal = val;
        best = battleStat;
      }
    }
    user.turnData.attackStat = best;
    user.turnData.useFoeAttackStat = true;
    return true;
  }
}

export class UseHigherOffenseStatAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;
  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    user.turnData.useHigherOffenseStat = true;
    return true;
  }
}

export class UseHighestStatOffenseAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.PRE_ATTACK);
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const statPairs: [Stat, BattleStat][] = [
      [Stat.ATK, BattleStat.ATK],
      [Stat.DEF, BattleStat.DEF],
      [Stat.SPATK, BattleStat.SPATK],
      [Stat.SPDEF, BattleStat.SPDEF],
      [Stat.SPD, BattleStat.SPD],
    ];
    let best = BattleStat.ATK;
    let bestVal = user.getBattleStat(Stat.ATK);
    for (const [stat, battleStat] of statPairs) {
      const val = user.getBattleStat(stat);
      if (val > bestVal) {
        bestVal = val;
        best = battleStat;
      }
    }
    user.turnData.attackStat = best;
    return true;
  }
}

export class UseLowerDefenseStatAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    user.turnData.useFoeLowerDefense = true;
    return true;
  }
}

export class UserStatusTypeOverrideAttr extends VariableMoveTypeAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const moveType = args[0] as Utils.NumberHolder;
    const eff = user.status?.effect;
    if (eff === StatusEffect.BURN) moveType.value = Type.FIRE;
    else if (eff === StatusEffect.POISON || eff === StatusEffect.TOXIC) moveType.value = Type.POISON;
    else if (eff === StatusEffect.PARALYSIS) moveType.value = Type.ELECTRIC;
    else if (eff === StatusEffect.SLEEP) moveType.value = Type.PSYCHIC;
    return true;
  }
}

export class VariableHighestBoostTypeAttr extends VariableMoveTypeAttr {
  private statTypeMap: Partial<Record<BattleStat, Type>>;
  constructor() {
    super();
    this.statTypeMap = {
      [BattleStat.ATK]: Type.FIGHTING,
      [BattleStat.SPATK]: Type.PSYCHIC,
      [BattleStat.DEF]: Type.STEEL,
      [BattleStat.SPD]: Type.NORMAL,
      [BattleStat.SPDEF]: Type.FAIRY,
      [BattleStat.ACC]: Type.NORMAL,
      [BattleStat.EVA]: Type.GHOST,
    };
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const moveType = args[0] as Utils.NumberHolder;
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA];
    let best: BattleStat | null = null;
    let bestVal = 0;
    for (const s of stats) {
      const v = user.summonData.battleStats[s];
      if (v > 0 && v > bestVal) {
        bestVal = v;
        best = s;
      }
    }
    if (best != null) {
      moveType.value = this.statTypeMap[best] ?? move.type;
    }
    return true;
  }
}

export class WakeAndStatDropAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) {
      return false;
    }
    if (!target.status || target.status.effect !== StatusEffect.SLEEP) return false;
    target.resetStatus();
    user.scene.unshiftPhase(new StatChangePhase(user.scene, target.getBattlerIndex(), false, [BattleStat.ATK, BattleStat.SPATK], -2));
    return true;
  }
}
export class WeaknessTypeOverrideAttr extends VariableMoveTypeAttr {
  private gate?: YuGateFunc;
  private candidateTypes?: Type[];

  constructor(gate?: YuGateFunc, candidateTypes?: Type[]) {
    super();
    this.gate = gate;
    this.candidateTypes = candidateTypes;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    const moveType = args[0];
    if (!(moveType instanceof Utils.NumberHolder)) return false;
    const targetTypes = target.getTypes(true);
    let bestType = move.type;
    let bestMult = 0;
    const scanType = (t: Type) => {
      let mult = 1;
      for (const defType of targetTypes) {
        mult *= getTypeDamageMultiplier(t, defType);
      }
      if (mult > bestMult) {
        bestMult = mult;
        bestType = t;
      }
    };
    if (this.candidateTypes?.length) {
      for (const t of this.candidateTypes) {
        scanType(t);
      }
    } else {
      for (let t = Type.NORMAL; t <= Type.FAIRY; t++) {
        scanType(t);
      }
    }
    const minMult = this.candidateTypes?.length ? 1 : 2;
    if (bestMult >= minMult) {
      moveType.value = bestType;
      return true;
    }
    return false;
  }
}

export class ConsumeBoostsForPowerAttr extends VariablePowerAttr {
  private bpPerStage: integer;

  private maxStagesOrCapBp: integer;

  constructor(bpPerStage: integer, maxStagesOrCapBp = 0) {
    super();
    this.bpPerStage = bpPerStage;
    this.maxStagesOrCapBp = maxStagesOrCapBp;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    let stages = 0;
    for (const stat of [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]) {
      const v = user.summonData.battleStats[stat];
      if (v > 0) {
        stages += v;
      }
    }
    if (this.maxStagesOrCapBp > 0 && this.maxStagesOrCapBp <= 20) {
      stages = Math.min(stages, this.maxStagesOrCapBp);
    }
    if (stages <= 0) {
      return true;
    }
    let bp = stages * this.bpPerStage;
    if (this.maxStagesOrCapBp > 20) {
      bp = Math.min(bp, this.maxStagesOrCapBp);
    }
    (args[0] as Utils.NumberHolder).value += bp;
    user.resetStatStages();
    return true;
  }
}

export class DualModePulseAttr extends VariablePowerAttr {
  private attackBp: integer;
  private healRatio: number;

  constructor(attackBp: integer = 0, healRatio: number = 0.25) {
    super();
    this.attackBp = attackBp;
    this.healRatio = healRatio;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (user.getBattleStat(Stat.SPATK) > user.getBattleStat(Stat.SPDEF)) {
      (args[0] as Utils.NumberHolder).value = this.attackBp > 0 ? this.attackBp : move.power;
      return true;
    }
    user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * this.healRatio), "", true, true));
    (args[0] as Utils.NumberHolder).value = 0;
    return true;
  }
}

export class CoinFlipDamageOrHealAttr extends VariablePowerAttr {
  private damageMult: number;
  private healRatio: number;
  constructor(damageMult: number, healRatio: number) {
    super();
    this.damageMult = damageMult;
    this.healRatio = healRatio;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (user.randSeedInt(2) === 0) {
      (args[0] as Utils.NumberHolder).value *= this.damageMult;
      return true;
    }
    user.scene.unshiftPhase(new PokemonHealPhase(user.scene, user.getBattlerIndex(), Utils.toDmgValue(user.getMaxHp() * this.healRatio), "", true, true));
    (args[0] as Utils.NumberHolder).value = 0;
    return true;
  }
}
export class RemoveOrStealHeldItemAttr extends MoveEffectAttr {
  private stealGate: YuGateFunc;

  constructor(stealGate: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.stealGate = stealGate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean | Promise<boolean> {
    if (this.stealGate(user, target, move)) {
      return new StealHeldItemChanceAttr(1).apply(user, target, move, args);
    }
    return new RemoveHeldItemAttr(false).apply(user, target, move, args);
  }
}

export class GatedAbilityCopyAttr extends AbilityCopyAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc, copyToPartner: boolean = false) {
    super(copyToPartner);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedChangeTypeAttr extends ChangeTypeAttr {
  private gate: YuGateFunc;

  constructor(type: Type, gate: YuGateFunc) {
    super(type);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class ConditionalPartyStatusCureAttr extends MoveEffectAttr {
  private message: string;
  private abilityCondition: Abilities;
  private gate: YuGateFunc;

  constructor(message: string | null, abilityCondition: Abilities, gate: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.message = message!;
    this.abilityCondition = abilityCondition;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    new PartyStatusCureAttr(this.message, this.abilityCondition).addPartyCurePhase(user);
    return true;
  }
}

export class GatedTargetStatusCureAttr extends MoveEffectAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (!target.status?.effect || !isNonVolatileStatusEffect(target.status.effect)) {
      return true;
    }
    target.trySetStatus(StatusEffect.NONE, true, user);
    return true;
  }
}
export class GatedHealStatusEffectAttr extends HealStatusEffectAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc, selfTarget: boolean, ...effects: StatusEffect[]) {
    super(selfTarget, ...effects);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return true;
    }
    return super.apply(user, target, move, args);
  }
}

const hasBareChanceCurseAttr = (move: Move) =>
  move.attrs.some(a => a instanceof ChanceCurseAttr && !(a instanceof GatedCurseAttr));

export class ChanceCurseAttr extends CurseAttr {
  private effectChance: integer;

  constructor(effectChance: integer = 100) {
    super();
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (shouldSkipBaseSecondaryTier(user, "curse")) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedCurseAttr extends ChanceCurseAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc, effectChance: integer = 100) {
    super(effectChance);
    this.gate = gate;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    setSecondaryTier(user, "curse", this.gate(user, target, move));
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (shouldSkipGatedSecondaryTier(user, "curse") && hasBareChanceCurseAttr(move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedForceSwitchOutAttr extends MoveEffectAttr {
  private foeOut: boolean;
  private batonPass: boolean;
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(foeOut: boolean, batonPass: boolean, gate: YuGateFunc, effectChance: integer = 100) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.foeOut = foeOut;
    this.batonPass = batonPass;
    this.gate = gate;
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    const foe = foeForGate(user, target);
    return new ForceSwitchOutAttr(this.foeOut, this.batonPass).apply(user, foe, move, args);
  }
}
export class ConditionalForceSwitchOutAttr extends MoveEffectAttr {
  private foeOut: boolean;
  private batonPass: boolean;
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(foeOut: boolean, batonPass: boolean, gate: YuGateFunc, effectChance: integer = 100) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.foeOut = foeOut;
    this.batonPass = batonPass;
    this.gate = gate;
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    return new ForceSwitchOutAttr(this.foeOut, this.batonPass).apply(user, target, move, args);
  }
}

export class PreApplyStatSwapAttr extends MoveEffectAttr {
  private statA: BattleStat;
  private statB: BattleStat;
  constructor(statA: BattleStat, statB: BattleStat) {
    super(true, MoveEffectTrigger.PRE_ATTACK);
    this.statA = statA;
    this.statB = statB;
  }
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const isSpAtkSpDefPair =
      (this.statA === BattleStat.SPATK && this.statB === BattleStat.SPDEF)
      || (this.statA === BattleStat.SPDEF && this.statB === BattleStat.SPATK);
    if (isSpAtkSpDefPair) {
      const realA = this.statA + 1;
      const realB = this.statB + 1;
      const temp = user.stats[realA];
      user.stats[realA] = user.stats[realB];
      user.stats[realB] = temp;
      user.updateInfo();
      return true;
    }
    const a = user.summonData.battleStats[this.statA];
    const b = user.summonData.battleStats[this.statB];
    user.summonData.battleStats[this.statA] = b;
    user.summonData.battleStats[this.statB] = a;
    if ((this.statA === BattleStat.ATK && this.statB === BattleStat.SPATK)
      || (this.statA === BattleStat.SPATK && this.statB === BattleStat.ATK)) {
      user.summonData.atkSpAtkSwapped = !user.summonData.atkSpAtkSwapped;
    }
    return true;
  }
}

export class RandomPreyTypeAttr extends MoveEffectAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc = alwaysTrueGate) {
    super(false, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    const prey = [Type.WATER, Type.GROUND, Type.FIRE];
    const t = prey[user.randSeedInt(prey.length)];
    target.summonData.types = [t];
    return true;
  }
}

export class GatedSuppressAbilitiesAttr extends SuppressAbilitiesAttr {
  private gate?: YuGateFunc;
  private effectChance: integer;

  private suppressTurns?: integer;

  constructor(gate?: YuGateFunc, effectChance: integer = 100, suppressTurns?: integer) {
    super();
    this.gate = gate;
    this.effectChance = effectChance;
    this.suppressTurns = suppressTurns;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (this.gate && !this.gate(user, target, move)) return false;
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) return false;
    if (!super.apply(user, target, move, args)) return false;
    if (this.suppressTurns !== undefined && this.suppressTurns > 0) {
      target.summonData.abilitySuppressTurns = this.suppressTurns + 1;
    }
    return true;
  }
}
export class ChanceDisableMoveAttr extends DisableMoveAttr {
  private effectChance: integer;

  constructor(effectChance: integer = 100) {
    super();
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.canApply(user, target, move, args)) {
      return false;
    }
    if (shouldSkipBaseSecondaryTier(user, "disable")) {
      return false;
    }

    const originalChance = move.chance;
    try {
      move.chance = this.effectChance;
      const moveChance = this.getMoveChance(user, target, move, this.selfTarget, true);
      if (moveChance >= 0 && moveChance < 100 && user.randSeedInt(100) >= moveChance) {
        if (!user.turnData.secondaryFamilyApplied) {
          user.turnData.secondaryFamilyApplied = {};
        }
        user.turnData.secondaryFamilyApplied.disable = true;
        return false;
      }
      return this.applyDisable(user, target, move);
    } finally {
      move.chance = originalChance;
    }
  }
}
export class ConditionalDisableMoveAttr extends DisableMoveAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(gate: YuGateFunc, effectChance: integer) {
    super();
    this.gate = gate;
    this.effectChance = effectChance;
  }

  resolveSecondaryTier(user: Pokemon, target: Pokemon, move: Move): void {
    if (hasBareDisableMoveAttr(move)) {
      setSecondaryTier(user, "disable", this.gate(user, target, move));
    }
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.canApply(user, target, move, args)) {
      return false;
    }
    if (!hasBareDisableMoveAttr(move) && !this.gate(user, target, move)) {
      return false;
    }
    if (shouldSkipGatedSecondaryTier(user, "disable") && hasBareDisableMoveAttr(move)) {
      return false;
    }
    const originalChance = move.chance;
    try {
      if (user.turnData.secondaryTierResolved?.disable === "gated" || !hasBareDisableMoveAttr(move)) {
        move.chance = this.effectChance;
      }
      const moveChance = this.getMoveChance(user, target, move, this.selfTarget, true);
      if (moveChance >= 0 && moveChance < 100 && user.randSeedInt(100) >= moveChance) {
        if (hasBareDisableMoveAttr(move)) {
          markSecondaryFamily(user, "disable");
        }
        return false;
      }
      const result = this.applyDisable(user, target, move);
      if (result && hasBareDisableMoveAttr(move)) {
        markSecondaryFamily(user, "disable");
      }
      return result;
    } finally {
      move.chance = originalChance;
    }
  }
}

const hasBareDisableMoveAttr = (move: Move) =>
  move.attrs.some(a =>
    (a instanceof DisableMoveAttr || a instanceof ChanceDisableMoveAttr)
    && !(a instanceof ConditionalDisableMoveAttr)
    && !(a instanceof GatedDisableMoveAttr),
  );

export class GatedDisableMoveAttr extends DisableMoveAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (!super.canApply(user, target, move, args)) {
      return false;
    }

    return this.applyDisable(user, target, move);
  }
}

export class FoeDisableMoveAttr extends DisableMoveAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    const foe = foeForGate(user, target);
    return super.apply(user, foe, move, args);
  }

  getCondition(): MoveConditionFunc {
    const base = super.getCondition();
    return (user, target, move) => base(user, foeForGate(user, target), move);
  }
}

export class InvertPositiveStatsAttr extends MoveEffectAttr {
  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }

    let flipped = false;
    for (let s = 0; s < target.summonData.battleStats.length; s++) {
      if (target.summonData.battleStats[s] > 0) {
        target.summonData.battleStats[s] *= -1;
        flipped = true;
      }
    }
    if (!flipped) {
      return false;
    }

    target.updateInfo();
    user.updateInfo();
    target.scene.queueMessage(i18next.t("moveTriggers:invertStats", { pokemonName: getPokemonNameWithAffix(target) }));
    return true;
  }
}

export class GatedInvertPositiveStatsAttr extends InvertPositiveStatsAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedInvertStatsAttr extends InvertStatsAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}
export class ConditionalInvertStatsAttr extends InvertStatsAttr {
  private gate: YuGateFunc;
  private effectChance: integer;

  constructor(gate: YuGateFunc, effectChance: integer = 100) {
    super();
    this.gate = gate;
    this.effectChance = effectChance;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    if (this.effectChance >= 0 && this.effectChance !== 100 && user.randSeedInt(100) >= this.effectChance) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedAlwaysHitAttr extends GatedMoveAccuracyAttr {
  constructor(gate: YuGateFunc) {
    super(gate, 100);
  }
}
export class FinalHitGatedAlwaysHitAttr extends GatedMoveAccuracyAttr {
  constructor(gate: YuGateFunc) {
    super(gate, 100);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!isFinalHit(user)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class EncoreOrDisableAttr extends MoveEffectAttr {
  private effectChance: integer;
  private gate?: YuGateFunc;

  constructor(effectChance: integer = 50, gate?: YuGateFunc) {
    super(false, MoveEffectTrigger.HIT);
    this.effectChance = effectChance;
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    const foe = foeForGate(user, target);
    if (this.gate && !this.gate(user, foe, move)) return false;
    if (user.randSeedInt(100) >= this.effectChance) return false;
    if (user.randSeedInt(2) === 0) {
      return foe.addTag(BattlerTagType.ENCORE, 0, move.id, user.id);
    }
    const disableAttr = new DisableMoveAttr();
    if (!disableAttr.canApply(user, foe, move, args)) {
      return false;
    }
    return disableAttr.applyDisable(user, foe, move);
  }
}

export class ScreenBreakAttr extends MoveEffectAttr {
  private gate?: YuGateFunc;

  constructor(gate?: YuGateFunc) {
    super(true, MoveEffectTrigger.PRE_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) return false;
    if (this.gate && !this.gate(user, target, move)) return false;
    const side = target.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    user.scene.arena.removeTagOnSide(ArenaTagType.REFLECT, side);
    user.scene.arena.removeTagOnSide(ArenaTagType.LIGHT_SCREEN, side);
    user.scene.arena.removeTagOnSide(ArenaTagType.AURORA_VEIL, side);
    return true;
  }
}
export class ForesightAttr extends ExposedMoveAttr {
  constructor() {
    super(BattlerTagType.IGNORE_GHOST);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    return super.apply(user, foeForGate(user, target), move, args);
  }
}

export class ClearHazardsAttr extends MoveEffectAttr {
  constructor() {
    super(true, MoveEffectTrigger.POST_APPLY);
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const side = user.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    for (const tag of [ArenaTagType.SPIKES, ArenaTagType.STEALTH_ROCK, ArenaTagType.TOXIC_SPIKES, ArenaTagType.STICKY_WEB]) {
      user.scene.arena.removeTagOnSide(tag, side);
    }
    return true;
  }
}
export class GatedFaintCountdownAttr extends FaintCountdownAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}
export class GatedAllFaintCountdownAttr extends MoveEffectAttr {
  private static readonly PERISH_TURN_COUNT = 4;

  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super(true, MoveEffectTrigger.POST_APPLY);
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    if (!this.gate(user, target, move)) {
      return false;
    }
    for (const pokemon of user.scene.getField()) {
      if (!pokemon?.isActive(true) || pokemon.getTag(BattlerTagType.PERISH_SONG)) {
        continue;
      }
      if (pokemon.addTag(BattlerTagType.PERISH_SONG, GatedAllFaintCountdownAttr.PERISH_TURN_COUNT, move.id, user.id)) {
        user.scene.queueMessage(i18next.t("moveTriggers:faintCountdown", {
          pokemonName: getPokemonNameWithAffix(pokemon),
          turnCount: GatedAllFaintCountdownAttr.PERISH_TURN_COUNT - 1,
        }));
      }
    }
    return true;
  }
}
export class GatedDestinyBondAttr extends DestinyBondAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export class GatedClearHazardsAttr extends ClearHazardsAttr {
  private gate: YuGateFunc;

  constructor(gate: YuGateFunc) {
    super();
    this.gate = gate;
  }

  apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!this.gate(user, target, move)) {
      return false;
    }
    return super.apply(user, target, move, args);
  }
}

export { AddMovePowerAttr as MovePowerBoostAttr };
export { BreakSubstituteAttr as RemoveSubstituteAttr };
export { SuppressAbilitiesAttr as IgnoreAbilitiesAttr };
export { SuperEffectiveTypeMorphAttr as SuperEffectiveTypeOverrideAttr };