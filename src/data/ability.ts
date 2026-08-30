import Pokemon, { EnemyPokemon, HitResult, MoveResult, PlayerPokemon, PokemonMove } from "../field/pokemon";
import { Type, getTypeDamageMultiplier } from "./type";
import {Constructor, randIntRange, randSeedChance} from "#app/utils";
import * as Utils from "../utils";
import { BattleStat, getBattleStatName } from "./battle-stat";
import { getPokemonNameWithAffix, getPokemonMessage } from "../messages";
import { Weather, WeatherType } from "./weather";
import {
  BattlerTag,
  EncoreTag,
  GroundedTag,
  GulpMissileTag,
  SemiInvulnerableTag
} from "./battler-tags";
import {
  StatusEffect,
  getNonVolatileStatusEffects,
  getStatusEffectDescriptor,
  getStatusEffectHealText,
  isNonVolatileStatusEffect
} from "./status-effect";
import { Gender } from "./gender";
import Move, {
  AttackMove,
  MoveCategory,
  MoveFlags,
  MoveTarget,
  FlinchAttr,
  OneHitKOAttr,
  HitHealAttr,
  allMoves,
  StatusMove,
  SelfStatusMove,
  VariablePowerAttr,
  applyMoveAttrs,
  moveHasSecondaryEffects,
  IncrementMovePriorityAttr,
  VariableMoveTypeAttr,
  RandomMovesetMoveAttr,
  RandomMoveAttr,
  NaturePowerAttr,
  CopyMoveAttr,
  MoveAttr,
  MultiHitAttr,
  NativeTripleAccelPowerAttr,
  ChargeAttr,
  SacrificialAttr,
  SacrificialAttrOnHit,
  NeutralDamageAgainstFlyingTypeMultiplierAttr,
  HealStatusEffectAttr,
  MultiHitType,
  ForceSwitchOutAttr
} from "./move";
import { ArenaTagSide, ArenaTrapTag } from "./arena-tag";
import { Stat, getStatName } from "./pokemon-stat";
import {
  BerryModifier,
  PokemonHeldItemModifier,
  CollectedTypeModifier,
  PermaUseAbilityQuestModifier, PermaPartyAbilityModifier, TrainerBondAbilityModifier, TeraAbilityModifier
} from "../modifier/modifier";
import { TerrainType } from "./terrain";
import { below25HpGate, below50HpGate, foeHasItemGate, foeMoveDisabledGate, gateTriadFullGate, gravityActiveGate, nightBiomeGate, totalStagesGte3Gate, usedSameMoveLastTurnGate, userHasItemGate } from "./yu-gates";
import { SpeciesFormChangeManualTrigger, SpeciesFormChangeRevertWeatherFormTrigger, SpeciesFormChangeWeatherTrigger } from "./pokemon-forms";
import i18next, { t } from "i18next";
import { Localizable } from "#app/interfaces/locales.js";
import { Command } from "../ui/command-ui-handler";
import { BerryModifierType, CollectedTypeModifierType } from "#app/modifier/modifier-type";
import { getPokeballName } from "./pokeball";
import { BattleType, BattlerIndex } from "#app/battle";
import { Abilities } from "#enums/abilities";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { Moves } from "#enums/moves";
import { BerryType } from "#enums/berry-type";
import { Species } from "#enums/species";
import { TimeOfDay } from "#enums/time-of-day";
import { MovePhase } from "#app/phases/move-phase";
import { PokemonHealPhase } from "#app/phases/pokemon-heal-phase";
import { ShowAbilityPhase } from "#app/phases/show-ability-phase";
import { StatChangePhase } from "#app/phases/stat-change-phase";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";
import { SwitchSummonPhase } from "#app/phases/switch-summon-phase";
import { SwitchPhase } from "#app/phases/switch-phase";
import BattleScene from "#app/battle-scene";
import {PermaType} from "#app/modifier/perma-modifiers";

export class Ability implements Localizable {
  public id: Abilities;

  private nameAppend: string;
  public name: string;
  public description: string;
  public generation: integer;
  public isBypassFaint: boolean;
  public isIgnorable: boolean;
  public attrs: AbAttr[];
  public conditions: AbAttrCondition[];

  constructor(id: Abilities, generation: integer) {
    this.id = id;

    this.nameAppend = "";
    this.generation = generation;
    this.attrs = [];
    this.conditions = [];

    this.localize();
  }

  localize(): void {
    const i18nKey = Abilities[this.id].split("_").filter(f => f).map((f, i) => i ? `${f[0]}${f.slice(1).toLowerCase()}` : f.toLowerCase()).join("") as string;

    this.name = this.id ? `${i18next.t(`ability:${i18nKey}.name`) as string}${this.nameAppend}` : "";
    this.description = this.id ? i18next.t(`ability:${i18nKey}.description`) as string : "";
  }
  getAttrs<T extends AbAttr>(attrType: Constructor<T> ): T[] {
    return this.attrs.filter((a): a is T => a instanceof attrType);
  }
  hasAttr<T extends AbAttr>(attrType: Constructor<T>): boolean {
    return this.attrs.some((attr) => attr instanceof attrType);
  }

  attr<T extends Constructor<AbAttr>>(AttrType: T, ...args: ConstructorParameters<T>): Ability {
    const attr = new AttrType(...args);
    this.attrs.push(attr);

    return this;
  }

  conditionalAttr<T extends Constructor<AbAttr>>(condition: AbAttrCondition, AttrType: T, ...args: ConstructorParameters<T>): Ability {
    const attr = new AttrType(...args);
    attr.addCondition(condition);
    this.attrs.push(attr);

    return this;
  }

  bypassFaint(): Ability {
    this.isBypassFaint = true;
    return this;
  }

  ignorable(): Ability {
    this.isIgnorable = true;
    return this;
  }

  condition(condition: AbAttrCondition): Ability {
    this.conditions.push(condition);

    return this;
  }

  partial(): this {
    this.nameAppend += " (P)";
    return this;
  }

  unimplemented(): this {
    this.nameAppend += " (N)";
    return this;
  }
}

type AbAttrApplyFunc<TAttr extends AbAttr> = (attr: TAttr, passive: boolean) => boolean | Promise<boolean>;
type AbAttrCondition = (pokemon: Pokemon) => boolean;

type PokemonAttackCondition = (user: Pokemon | null, target: Pokemon | null, move: Move) => boolean;
type PokemonDefendCondition = (target: Pokemon, user: Pokemon, move: Move) => boolean;
type PokemonStatChangeCondition = (target: Pokemon, statsChanged: BattleStat[], levels: integer) => boolean;

type PokemonFieldCondition = (pokemon: Pokemon, opponent: Pokemon) => boolean;
type PokemonKnockoutCondition = (pokemon: Pokemon, knockedOut: Pokemon) => boolean;
type PokemonFaintCondition = (fainted: Pokemon, attacker: Pokemon) => boolean;
type PokemonPreSwitchCondition = (switcher: Pokemon, opponent: Pokemon) => boolean;
type PokemonVictoryCondition = (pokemon: Pokemon) => boolean;
export interface AbilityActivationResult {
  abilityId: Abilities;
  abilityName: string;
  pokemonName: string;
  isPassive: boolean;
  message: string;
}

export abstract class AbAttr {
  public showAbility: boolean;
  private extraCondition: AbAttrCondition;

  constructor(showAbility: boolean = true) {
    this.showAbility = showAbility;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder | null, args: any[]): boolean | Promise<boolean> {
    return false;
  }

  getTriggerMessage(_pokemon: Pokemon, _abilityName: string, ..._args: any[]): string | null {
    return null;
  }

  getCondition(): AbAttrCondition | null {
    return this.extraCondition || null;
  }

  addCondition(condition: AbAttrCondition): AbAttr {
    this.extraCondition = condition;
    return this;
  }
}

export abstract class OnAbilityLoseAbAttr extends AbAttr {
  applyOnAbilityLose(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    return false;
  }
}

export abstract class OnAbilityGainAbAttr extends AbAttr {
  applyOnAbilityGain(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    return false;
  }
}

export class BlockRecoilDamageAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;

    return true;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]) {
    return i18next.t("abilityTriggers:blockRecoilDamage", {pokemonName: getPokemonNameWithAffix(pokemon), abilityName: abilityName});
  }
}

export class DoubleBattleChanceAbAttr extends AbAttr {
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const doubleChance = (args[0] as Utils.IntegerHolder);
    doubleChance.value = Math.max(doubleChance.value / 2, 1);
    return true;
  }
}

export class PostBattleInitAbAttr extends AbAttr {
  applyPostBattleInit(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class PostBattleInitFormChangeAbAttr extends PostBattleInitAbAttr {
  private formFunc: (p: Pokemon) => integer;

  constructor(formFunc: ((p: Pokemon) => integer)) {
    super(true);

    this.formFunc = formFunc;
  }

  applyPostBattleInit(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const formIndex = this.formFunc(pokemon);
    if (formIndex !== pokemon.formIndex && !simulated) {
      return pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger, false);
    }

    return false;
  }
}

export class PostBattleInitStatChangeAbAttr extends PostBattleInitAbAttr {
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;

  constructor(stats: BattleStat | BattleStat[], levels: integer, selfTarget?: boolean) {
    super();

    this.stats = typeof(stats) === "number"
      ? [ stats as BattleStat ]
      : stats as BattleStat[];
    this.levels = levels;
    this.selfTarget = !!selfTarget;
  }

  applyPostBattleInit(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const statChangePhases: StatChangePhase[] = [];

    if (!simulated) {
    if (this.selfTarget) {
      statChangePhases.push(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, this.stats, this.levels));
    } else {
      for (const opponent of pokemon.getOpponents()) {
        statChangePhases.push(new StatChangePhase(pokemon.scene, opponent.getBattlerIndex(), false, this.stats, this.levels));
      }
    }

    for (const statChangePhase of statChangePhases) {
        if (!this.selfTarget && !statChangePhase.getPokemon()?.summonData) {
        pokemon.scene.pushPhase(statChangePhase);
      } else {
        pokemon.scene.unshiftPhase(statChangePhase);
      }
    }
    }

    return true;
  }
}

type PreDefendAbAttrCondition = (pokemon: Pokemon, attacker: Pokemon, move: Move) => boolean;

export class PreDefendAbAttr extends AbAttr {
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move | null, cancelled: Utils.BooleanHolder | null, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class PreDefendFullHpEndureAbAttr extends PreDefendAbAttr {
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (pokemon.isFullHp()
        && pokemon.getMaxHp() > 1
        && (args[0] as Utils.NumberHolder).value >= pokemon.hp) {
      return simulated || pokemon.addTag(BattlerTagType.STURDY, 1);
    }

      return false;
    }
}

export class BlockItemTheftAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;

    return true;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]) {
    return i18next.t("abilityTriggers:blockItemTheft", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}

export class StabBoostAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if ((args[0] as Utils.NumberHolder).value > 1) {
      (args[0] as Utils.NumberHolder).value += 0.5;
      return true;
    }

    return false;
  }
}

export class ReceivedMoveDamageMultiplierAbAttr extends PreDefendAbAttr {
  protected condition: PokemonDefendCondition;
  protected damageMultiplier: number;

  constructor(condition: PokemonDefendCondition, damageMultiplier: number) {
    super();

    this.condition = condition;
    this.damageMultiplier = damageMultiplier;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.condition(pokemon, attacker, move)) {
      (args[0] as Utils.NumberHolder).value = Utils.toDmgValue((args[0] as Utils.NumberHolder).value * this.damageMultiplier);

      return true;
    }

    return false;
  }
}

export class ReceivedTypeDamageMultiplierAbAttr extends ReceivedMoveDamageMultiplierAbAttr {
  constructor(moveType: Type, damageMultiplier: number) {
    super((user, target, move) => move.type === moveType, damageMultiplier);
  }
}
export class TypeImmunityAbAttr extends PreDefendAbAttr {
  private immuneType: Type | null;
  private condition: AbAttrCondition | null;

  constructor(immuneType: Type | null, condition?: AbAttrCondition) {
    super();

    this.immuneType = immuneType;
    this.condition = condition ?? null;
  }
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {

    if ([ MoveTarget.BOTH_SIDES, MoveTarget.ENEMY_SIDE, MoveTarget.USER_SIDE ].includes(move.moveTarget)) {
      return false;
    }
    if (attacker !== pokemon && attacker.getMoveType(move, true, pokemon) === this.immuneType) {
      (args[0] as Utils.NumberHolder).value = 0;
      return true;
    }

    return false;
  }

  override getCondition(): AbAttrCondition | null {
    const extra = super.getCondition();
    if (extra && this.condition) {
      return (pokemon: Pokemon) => extra(pokemon) && this.condition!(pokemon);
    }
    return extra || this.condition;
  }
}

export class AttackTypeImmunityAbAttr extends TypeImmunityAbAttr {
  constructor(immuneType: Type, condition?: AbAttrCondition) {
    super(immuneType, condition);
  }
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {

    if (move.category !== MoveCategory.STATUS && !move.hasAttr(NeutralDamageAgainstFlyingTypeMultiplierAttr)) {
      return super.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args);
    }
    return false;
  }
}

export class TypeImmunityHealAbAttr extends TypeImmunityAbAttr {
  constructor(immuneType: Type) {
    super(immuneType);
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const ret = super.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args);

    if (ret) {
      if (!pokemon.isFullHp() && !simulated) {
          const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
          pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(),
          Utils.toDmgValue(pokemon.getMaxHp() / 4), i18next.t("abilityTriggers:typeImmunityHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName }), true));
        cancelled.value = true;
      }
      return true;
    }

    return false;
  }
}

class TypeImmunityStatChangeAbAttr extends TypeImmunityAbAttr {
  private stat: BattleStat;
  private levels: integer;

  constructor(immuneType: Type, stat: BattleStat, levels: integer, condition?: AbAttrCondition) {
    super(immuneType, condition);

    this.stat = stat;
    this.levels = levels;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const ret = super.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args);

    if (ret) {
      cancelled.value = true;
      if (!simulated) {
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [ this.stat ], this.levels));
      }
    }

    return ret;
  }
}

class TypeImmunityAddBattlerTagAbAttr extends TypeImmunityAbAttr {
  private tagType: BattlerTagType;
  private turnCount: integer;

  constructor(immuneType: Type, tagType: BattlerTagType, turnCount: integer, condition?: AbAttrCondition) {
    super(immuneType, condition);

    this.tagType = tagType;
    this.turnCount = turnCount;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const ret = super.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args);

    if (ret) {
      cancelled.value = true;
      if (!simulated) {
        pokemon.addTag(this.tagType, this.turnCount, undefined, pokemon.id);
      }
    }

    return ret;
  }
}

export class NonSuperEffectiveImmunityAbAttr extends TypeImmunityAbAttr {
  constructor(condition?: AbAttrCondition) {
    super(null, condition);
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const attackerMoveType = attacker.getMoveType(move, true, pokemon);
    const effAttackerMoveType = pokemon.getAttackTypeEffectiveness(attackerMoveType, attacker);
    if (effAttackerMoveType < 2) {
      cancelled.value = true;
      (args[0] as Utils.NumberHolder).value = 0;
      if (!simulated) {
        pokemon.turnData.abilityProcThisTurn = true;
      }
      return true;
    }
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:nonSuperEffectiveImmunity", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}

export class NotVeryEffectiveImmunityAbAttr extends TypeImmunityAbAttr {
  constructor(condition?: AbAttrCondition) {
    super(null, condition);
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }

    const typeMultiplier = args[0] as Utils.NumberHolder;
    if (!typeMultiplier) {
      return false;
    }
    const ignoreResistance = new Utils.BooleanHolder(false);
    applyPreAttackAbAttrs(IgnoreTypeResistanceAbAttr, attacker, pokemon, move, simulated, ignoreResistance);
    if (ignoreResistance.value && typeMultiplier.value > 0 && typeMultiplier.value < 1) {
      return false;
    }
    if (typeMultiplier.value > 0 && typeMultiplier.value < 1) {
      cancelled.value = true;
      typeMultiplier.value = 0;
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return `${getPokemonNameWithAffix(pokemon)}'s ${abilityName} blocked the attack!`;
  }
}

export class PostDefendAbAttr extends AbAttr {
  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}
export class PostDefendGulpMissileAbAttr extends PostDefendAbAttr {
  constructor() {
    super(true);
  }
  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean | Promise<boolean> {
    const battlerTag = pokemon.getTag(GulpMissileTag);
    if (!battlerTag || move.category === MoveCategory.STATUS || pokemon.getTag(SemiInvulnerableTag)) {
        return false;
      }

    if (simulated) {
      return true;
    }

    const cancelled = new Utils.BooleanHolder(false);
    applyAbAttrs(BlockNonDirectDamageAbAttr, attacker, cancelled);

    if (!cancelled.value) {
      attacker.damageAndUpdate(Math.max(1, Math.floor(attacker.getMaxHp() / 4)), HitResult.OTHER);
}

    if (battlerTag.tagType === BattlerTagType.GULP_MISSILE_ARROKUDA) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, attacker.getBattlerIndex(), false, [ BattleStat.DEF ], -1));
    } else {
      attacker.trySetStatus(StatusEffect.PARALYSIS, true, pokemon);
  }

    pokemon.removeTag(battlerTag.tagType);
      return true;
    }
}

export class FieldPriorityMoveImmunityAbAttr extends PreDefendAbAttr {
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const attackPriority = new Utils.IntegerHolder(move.priority);
    applyMoveAttrs(IncrementMovePriorityAttr,attacker,null,move,attackPriority);
    applyAbAttrs(ChangeMovePriorityAbAttr, attacker, null, simulated, move, attackPriority, pokemon);

    if (move.moveTarget===MoveTarget.USER || move.moveTarget===MoveTarget.NEAR_ALLY) {
      return false;
    }

    if (attackPriority.value > 0 && !move.isMultiTarget()) {
      cancelled.value = true;
      return true;
    }

    return false;
  }
}

export class FieldPreventOpponentStatBoostAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const boosted = args[0] as Pokemon | undefined;
    const levels = args[1] as integer | undefined;
    if (levels !== undefined && levels > 0 && boosted && boosted.isPlayer() !== pokemon.isPlayer()) {
      cancelled.value = true;
      return true;
    }
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string | null {
    const boosted = args[0] as Pokemon | undefined;
    if (!boosted) {
      return null;
    }
    return `${getPokemonNameWithAffix(boosted)}'s stat boosts were prevented by ${getPokemonNameWithAffix(pokemon)}'s ${abilityName}!`;
  }
}

export class FieldPreventOpponentStatusMovesAbAttr extends AbAttr {
  constructor() {
    super(false);
  }
}

export class PostStatChangeAbAttr extends AbAttr {
  applyPostStatChange(pokemon: Pokemon, simulated: boolean, statsChanged: BattleStat[], levelChanged: integer, selfTarget: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class MoveImmunityAbAttr extends PreDefendAbAttr {
  private immuneCondition: PreDefendAbAttrCondition;

  constructor(immuneCondition: PreDefendAbAttrCondition) {
    super(true);

    this.immuneCondition = immuneCondition;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.immuneCondition(pokemon, attacker, move)) {
      cancelled.value = true;
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:moveImmunity", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) });
  }
}

export class ChanceMoveImmunityAbAttr extends PreDefendAbAttr {
  private chance: number;
  private immuneCondition: PreDefendAbAttrCondition;

  constructor(chance: number, immuneCondition: PreDefendAbAttrCondition) {
    super(true);
    this.chance = chance;
    this.immuneCondition = immuneCondition;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    if (!this.immuneCondition(pokemon, attacker, move)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    cancelled.value = true;
    return true;
  }
}

export class PreDefendOncePerBattleNegateAndReflectAbAttr extends MoveImmunityAbAttr {
  private reflectRatio: number;

  constructor(reflectRatio: number = 1 / 8) {
    super((_pokemon, _attacker, move) => move.category !== MoveCategory.STATUS);
    this.reflectRatio = reflectRatio;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (simulated || pokemon === attacker || pokemon.battleData.abilityShieldUsed) {
      return false;
    }
    if (pokemon.isPlayer() === attacker.isPlayer()) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }

    pokemon.battleData.abilityShieldUsed = true;
    cancelled.value = true;

    if (!attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      const dmg = Math.max(1, Utils.toDmgValue(attacker.getMaxHp() * this.reflectRatio));
      attacker.damageAndUpdate(dmg, HitResult.OTHER);
      attacker.turnData.damageTaken += dmg;
    }
    return true;
  }
}

export class PreDefendOncePerBattleNegateAndReflectWhileTaggedAbAttr extends MoveImmunityAbAttr {
  private requiredTag: BattlerTagType;
  private reflectRatio: number;

  constructor(requiredTag: BattlerTagType, reflectRatio: number = 1 / 8) {
    super((_pokemon, _attacker, move) => move.category !== MoveCategory.STATUS);
    this.requiredTag = requiredTag;
    this.reflectRatio = reflectRatio;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (simulated || pokemon === attacker || pokemon.battleData.abilityShieldUsed) {
      return false;
    }
    if (pokemon.isPlayer() === attacker.isPlayer()) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!pokemon.getTag(this.requiredTag)) {
      return false;
    }

    pokemon.battleData.abilityShieldUsed = true;
    pokemon.removeTag(this.requiredTag);
    cancelled.value = true;

    if (!attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      const dmg = Math.max(1, Utils.toDmgValue(attacker.getMaxHp() * this.reflectRatio));
      attacker.damageAndUpdate(dmg, HitResult.OTHER);
      attacker.turnData.damageTaken += dmg;
    }
    return true;
  }
}
export class PreDefendChargedShieldRetaliateOnceAbAttr extends PreDefendAbAttr {
  constructor(
    private requiredTag: BattlerTagType,
    private retaliationRatio: number = 8
  ) {
    super(true);
  }

  applyPreDefend(
    pokemon: Pokemon,
    passive: boolean,
    simulated: boolean,
    attacker: Pokemon,
    move: Move,
    cancelled: Utils.BooleanHolder,
    args: any[]
  ): boolean {
    const damage = args[0] as Utils.NumberHolder | undefined;
    if (simulated || pokemon === attacker || pokemon.battleData.abilityShieldUsed) {
      return false;
    }
    if (pokemon.isPlayer() === attacker.isPlayer()) {
      return false;
    }
    if (!damage || damage.value <= 0) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!pokemon.getTag(this.requiredTag)) {
      return false;
    }

    damage.value = 0;
    cancelled.value = true;
    pokemon.findAndRemoveTags(t => t.tagType === this.requiredTag);
    pokemon.battleData.abilityShieldUsed = true;

    if (!attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      const retaliation = Math.max(1, Utils.toDmgValue(attacker.getMaxHp() * (1 / this.retaliationRatio)));
      attacker.damageAndUpdate(retaliation, HitResult.OTHER);
      attacker.turnData.damageTaken += retaliation;
    }

    return true;
  }
}

export class PreDefendConsumeTagNullifyDamageAbAttr extends PreDefendAbAttr {
  constructor(private requiredTag: BattlerTagType) {
    super(true);
  }

  applyPreDefend(
    pokemon: Pokemon,
    passive: boolean,
    simulated: boolean,
    attacker: Pokemon,
    move: Move,
    cancelled: Utils.BooleanHolder,
    args: any[]
  ): boolean {
    const damage = args[0] as Utils.NumberHolder | undefined;
    if (simulated || pokemon === attacker) {
      return false;
    }
    if (pokemon.isPlayer() === attacker.isPlayer()) {
      return false;
    }
    if (!damage || damage.value <= 0) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!pokemon.getTag(this.requiredTag)) {
      return false;
    }

    damage.value = 0;
    cancelled.value = true;
    pokemon.findAndRemoveTags(t => t.tagType === this.requiredTag);
    return true;
  }
}
export class WonderSkinAbAttr extends PreDefendAbAttr {
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const moveAccuracy = args[0] as Utils.NumberHolder;
    if (move.category === MoveCategory.STATUS && moveAccuracy.value >= 50) {
      moveAccuracy.value = 50;
      return true;
    }

    return false;
  }
}

export class MoveImmunityStatChangeAbAttr extends MoveImmunityAbAttr {
  private stat: BattleStat;
  private levels: integer;

  constructor(immuneCondition: PreDefendAbAttrCondition, stat: BattleStat, levels: integer) {
    super(immuneCondition);
    this.stat = stat;
    this.levels = levels;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const ret = super.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args);
    if (ret && !simulated) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [ this.stat ], this.levels));
    }

    return ret;
  }
}

export class ReverseDrainAbAttr extends PostDefendAbAttr {

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (move.hasAttr(HitHealAttr)) {
      if (!simulated) {
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:reverseDrain", { pokemonNameWithAffix: getPokemonNameWithAffix(attacker) }));
      }
      return true;
    }
    return false;
  }
}

export class PostDefendStatChangeAbAttr extends PostDefendAbAttr {

  private condition: PokemonDefendCondition | boolean | number;
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;
  private allOthers: boolean;
  constructor(condition: PokemonDefendCondition | boolean | number = () => true, stats: BattleStat | BattleStat[], levels: integer, selfTarget: boolean = true, allOthers: boolean = false) {
    super(true);

    this.condition = condition;
    this.stats = Array.isArray(stats) ? stats : [stats];
    this.levels = levels;
    this.selfTarget = selfTarget;
    this.allOthers = allOthers;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {

    if (pokemon != attacker && defendConditionMet(this.condition, pokemon, attacker, move)) {
      if (simulated) {
        return true;
      }
      if (this.allOthers) {
        const otherPokemon = pokemon.getAlly() ? pokemon.getOpponents().concat([ pokemon.getAlly() ]) : pokemon.getOpponents();
        for (const other of otherPokemon) {
          other.scene.unshiftPhase(new StatChangePhase(other.scene, (other).getBattlerIndex(), false, this.stats, this.levels));
        }
        return true;
      }

      const target = this.selfTarget ? pokemon : attacker;
      target.scene.unshiftPhase(new StatChangePhase(target.scene, target.getBattlerIndex(), this.selfTarget, this.stats, this.levels));
      return true;
    }

    return false;
  }
}

export class PostDefendHpGatedStatChangeAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition;
  private hpGate: number;
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;

  constructor(condition: PokemonDefendCondition, hpGate: number, stats: BattleStat[], levels: integer, selfTarget: boolean = true) {
    super(true);

    this.condition = condition;
    this.hpGate = hpGate;
    this.stats = stats;
    this.levels = levels;
    this.selfTarget = selfTarget;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hpGateFlat: integer = Math.ceil(pokemon.getMaxHp() * this.hpGate);
    const lastAttackReceived = pokemon.turnData.attacksReceived[pokemon.turnData.attacksReceived.length - 1];
    const damageReceived = lastAttackReceived?.damage || 0;

    if (defendConditionMet(this.condition, pokemon, attacker, move) && (pokemon.hp <= hpGateFlat && (pokemon.hp + damageReceived) > hpGateFlat)) {
      if (!simulated) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, (this.selfTarget ? pokemon : attacker).getBattlerIndex(), true, this.stats, this.levels));
      }
      return true;
    }

    return false;
  }
}

export class PostDefendApplyArenaTrapTagAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition;
  private tagType: ArenaTagType;

  constructor(condition: PokemonDefendCondition, tagType: ArenaTagType) {
    super(true);

    this.condition = condition;
    this.tagType = tagType;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (this.condition(pokemon, attacker, move)) {
      const tag = pokemon.scene.arena.getTag(this.tagType) as ArenaTrapTag;
      if (!pokemon.scene.arena.getTag(this.tagType) || tag.layers < tag.maxLayers) {
        if (!simulated) {
        pokemon.scene.arena.addTag(this.tagType, 0, undefined, pokemon.id, pokemon.isPlayer() ? ArenaTagSide.ENEMY : ArenaTagSide.PLAYER);
        }
        return true;
      }
    }
    return false;
  }
}

export class PostDefendApplyBattlerTagAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition;
  private tagType: BattlerTagType;
  constructor(condition: PokemonDefendCondition, tagType: BattlerTagType) {
    super(true);

    this.condition = condition;
    this.tagType = tagType;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }
    if (pokemon != attacker && this.condition(pokemon, attacker, move)) {
      if (!pokemon.getTag(this.tagType)  && !simulated) {
        pokemon.addTag(this.tagType, undefined, undefined, pokemon.id);
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:windPowerCharged", { pokemonName: getPokemonNameWithAffix(pokemon), moveName: move.name }));
      }
      return true;
    }
    return false;
  }
}

export class PostDefendApplyAttackerTagAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition;
  private tagType: BattlerTagType;
  private turnCount: integer;

  constructor(condition: PokemonDefendCondition, tagType: BattlerTagType, turnCount: integer = 0) {
    super();
    this.condition = condition;
    this.tagType = tagType;
    this.turnCount = turnCount;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === attacker) {
      return false;
    }

    if (hitResult !== HitResult.SUPER_EFFECTIVE) {
      return false;
    }
    if (!this.condition(pokemon, attacker, move)) {
      return false;
    }

    return attacker.addTag(this.tagType, this.turnCount, move.id, pokemon.id);
  }
}

export class PostDefendTypeChangeAbAttr extends PostDefendAbAttr {
  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (hitResult < HitResult.NO_EFFECT) {
      if (simulated) {
        return true;
      }
      const type = attacker.getMoveType(move, true, pokemon);
      const pokemonTypes = pokemon.getTypes(true);
      if (pokemonTypes.length !== 1 || pokemonTypes[0] !== type) {
        pokemon.summonData.types = [ type ];
        return true;
      }
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postDefendTypeChange", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName,
      typeName: i18next.t(`pokemonInfo:Type.${Type[pokemon.getTypes(true)[0]]}`)
    });
  }
}

export class PostDefendTerrainChangeAbAttr extends PostDefendAbAttr {
  private terrainType: TerrainType;

  constructor(terrainType: TerrainType) {
    super();

    this.terrainType = terrainType;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (hitResult < HitResult.NO_EFFECT) {
      if (simulated) {
        return pokemon.scene.arena.terrain?.terrainType !== (this.terrainType || undefined);
      } else {
      return pokemon.scene.arena.trySetTerrain(this.terrainType, true);
    }
    }

    return false;
  }
}

export class PostDefendContactApplyStatusEffectAbAttr extends PostDefendAbAttr {
  private chance: integer;
  private effects: StatusEffect[];

  constructor(chance: integer, ...effects: StatusEffect[]) {
    super();

    this.chance = chance;
    this.effects = effects;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon) && !attacker.status && (this.chance === -1 || pokemon.randSeedInt(100) < this.chance)) {
      const effect = this.effects.length === 1 ? this.effects[0] : this.effects[pokemon.randSeedInt(this.effects.length)];
      if (simulated) {
        return attacker.canSetStatus(effect, true, false, pokemon);
      } else {
      return attacker.trySetStatus(effect, true, pokemon);
    }
    }

    return false;
  }
}

export class PostDefendDamageApplyStatusEffectAbAttr extends PostDefendAbAttr {
  private chance: integer;
  private effects: StatusEffect[];

  constructor(chance: integer, ...effects: StatusEffect[]) {
    super();

    this.chance = chance;
    this.effects = effects;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (hitResult < HitResult.NO_EFFECT && !attacker.status && (this.chance === -1 || pokemon.randSeedInt(100) < this.chance)) {
      const effect = this.effects.length === 1 ? this.effects[0] : this.effects[pokemon.randSeedInt(this.effects.length)];
      if (simulated) {
        return attacker.canSetStatus(effect, true, false, pokemon);
      } else {
        return attacker.trySetStatus(effect, true, pokemon);
      }
    }

    return false;
  }
}

export class EffectSporeAbAttr extends PostDefendContactApplyStatusEffectAbAttr {
  constructor() {
    super(10, StatusEffect.POISON, StatusEffect.PARALYSIS, StatusEffect.SLEEP);
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (attacker.hasAbility(Abilities.OVERCOAT) || attacker.isOfType(Type.GRASS)) {
      return false;
    }
    return super.applyPostDefend(pokemon, passive, simulated, attacker, move, hitResult, args);
  }
}

export class PostDefendContactApplyTagChanceAbAttr extends PostDefendAbAttr {
  private chance: integer;
  private tagType: BattlerTagType;
  private turnCount: integer | undefined;

  constructor(chance: integer, tagType: BattlerTagType, turnCount?: integer) {
    super();

    this.tagType = tagType;
    this.chance = chance;
    this.turnCount = turnCount;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (
      hitResult < HitResult.NO_EFFECT
      && move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)
      && pokemon.randSeedInt(100) < this.chance
    ) {
      if (simulated) {
        return attacker.canAddTag(this.tagType);
      } else {
        const resolvedTurnCount =
          this.turnCount !== undefined
            ? this.turnCount
            : (this.tagType === BattlerTagType.CONFUSED
              ? pokemon.randSeedIntRange(2, 5)
              : undefined);

        return attacker.addTag(this.tagType, resolvedTurnCount, move.id, pokemon.id);
      }
    }

    return false;
  }
}

export class PostDefendCritStatChangeAbAttr extends PostDefendAbAttr {
  private stat: BattleStat;
  private levels: integer;

  constructor(stat: BattleStat, levels: integer) {
    super();

    this.stat = stat;
    this.levels = levels;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated) {
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [ this.stat ], this.levels));
    }

    return true;
  }

  getCondition(): AbAttrCondition {
    return (pokemon: Pokemon) => pokemon.turnData.attacksReceived.length !== 0 && pokemon.turnData.attacksReceived[pokemon.turnData.attacksReceived.length - 1].critical;
  }
}

export class PostDefendContactDamageAbAttr extends PostDefendAbAttr {
  private damageRatio: integer;

  constructor(damageRatio: integer) {
    super();

    this.damageRatio = damageRatio;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (
      !simulated
      && hitResult < HitResult.NO_EFFECT
      && move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)
      && !attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)
    ) {
      const damage = Utils.toDmgValue(attacker.getMaxHp() * (1 / this.damageRatio));
      attacker.damageAndUpdate(damage, HitResult.OTHER);
      attacker.turnData.damageTaken += damage;
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postDefendContactDamage", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}

export class PostDefendHitDamageRatioAbAttr extends PostDefendAbAttr {
  constructor(
    private ratio: number,
    private condition: PokemonDefendCondition = () => true
  ) {
    super(true);
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER;
    if (simulated || !hit || pokemon === attacker) {
      return false;
    }
    if (!defendConditionMet(this.condition, pokemon, attacker, move)) {
      return false;
    }
    if (attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      return false;
    }
    const dmg = Math.max(1, Math.floor(attacker.getMaxHp() * this.ratio));
    attacker.damageAndUpdate(dmg, HitResult.OTHER);
    attacker.turnData.damageTaken += dmg;
    return true;
  }
}

export class PostDefendHitRandomItemLossHealAndAtkAbAttr extends PostDefendAbAttr {
  constructor(private healRatio: number = 1 / 8) {
    super(true);
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER;
    if (simulated || !hit || pokemon === attacker || pokemon.isFainted()) {
      return false;
    }
    if (pokemon.isPlayer() === attacker.isPlayer()) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }

    const items = pokemon.scene.findModifiers(
      m => m instanceof PokemonHeldItemModifier && (m as PokemonHeldItemModifier).pokemonId === pokemon.id,
      pokemon.isPlayer()
    ) as PokemonHeldItemModifier[];
    if (items.length > 0) {
      const discarded = items[pokemon.randSeedInt(items.length)];
      pokemon.scene.removeModifier(discarded);
    }

    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
    pokemon.scene.unshiftPhase(new PokemonHealPhase(
      pokemon.scene,
      pokemon.getBattlerIndex(),
      healAmount,
      getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHPLittle", { abilityName: pokemon.getAbility().name })),
      true
    ));
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.ATK], 1));
    return true;
  }
}

export class PostDefendChanceStatusAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition;
  private chance: number;
  private statusEffects: StatusEffect[];

  constructor(condition: PokemonDefendCondition, chance: number, statusEffects: StatusEffect[]) {
    super();
    this.condition = condition;
    this.chance = chance;
    this.statusEffects = statusEffects;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === attacker || hitResult >= HitResult.NO_EFFECT || !this.condition(pokemon, attacker, move)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    const status = this.statusEffects[pokemon.randSeedInt(this.statusEffects.length)];
    return attacker.trySetStatus(status, true, pokemon);
  }
}

export class PostDefendContactHighestStatDropAndHealAbAttr extends PostDefendAbAttr {
  private levels: integer;
  private healRatio: number;

  constructor(levels: integer = 1, healRatio: number = 0.10) {
    super();
    this.levels = levels;
    this.healRatio = healRatio;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === attacker || hitResult >= HitResult.NO_EFFECT || !move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) {
      return false;
    }
    if (!attacker.status) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    let highestStat = stats[0];
    let highestValue = attacker.summonData.battleStats[stats[0]];
    for (const stat of stats) {
      if (attacker.summonData.battleStats[stat] > highestValue) {
        highestValue = attacker.summonData.battleStats[stat];
        highestStat = stat;
      }
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, attacker.getBattlerIndex(), false, [highestStat], -this.levels));
    if (!pokemon.isFullHp()) {
      const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
          i18next.t("abilityTriggers:postTurnHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName: (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name }), true));
    }
    return true;
  }
}

export class PostDefendPerishSongAbAttr extends PostDefendAbAttr {
  private turns: integer;

  constructor(turns: integer) {
    super();

    this.turns = turns;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) {
      if (pokemon.getTag(BattlerTagType.PERISH_SONG) || attacker.getTag(BattlerTagType.PERISH_SONG)) {
        return false;
      } else {
        if (!simulated) {
        attacker.addTag(BattlerTagType.PERISH_SONG, this.turns);
        pokemon.addTag(BattlerTagType.PERISH_SONG, this.turns);
        }
        return true;
      }
    }
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:perishBody", {pokemonName: getPokemonNameWithAffix(pokemon), abilityName: abilityName});
  }
}

export class PostDefendWeatherChangeAbAttr extends PostDefendAbAttr {
  private weatherType: WeatherType;
  protected condition: PokemonDefendCondition | null;

  constructor(weatherType: WeatherType, condition?: PokemonDefendCondition) {
    super();

    this.weatherType = weatherType;
    this.condition = condition ?? null;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (this.condition !== null && !this.condition(pokemon, attacker, move)) {
      return false;
    }
    if (!pokemon.scene.arena.weather?.isImmutable()) {
      if (simulated) {
        return pokemon.scene.arena.weather?.weatherType !== this.weatherType;
      }
      return pokemon.scene.arena.trySetWeather(this.weatherType, true);
    }

    return false;
  }
}

export class PostDefendAbilitySwapAbAttr extends PostDefendAbAttr {
  constructor() {
    super();
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon) && !attacker.getAbility().hasAttr(UnswappableAbilityAbAttr)) {
      if (!simulated) {
      const tempAbilityId = attacker.getAbility().id;
      attacker.summonData.ability = pokemon.getAbility().id;
      pokemon.summonData.ability = tempAbilityId;
      }
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postDefendAbilitySwap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) });
  }
}

export class PostDefendAbilityGiveAbAttr extends PostDefendAbAttr {
  private ability: Abilities;

  constructor(ability: Abilities) {
    super();
    this.ability = ability;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon) && !attacker.getAbility().hasAttr(UnsuppressableAbilityAbAttr) && !attacker.getAbility().hasAttr(PostDefendAbilityGiveAbAttr)) {
      if (!simulated) {
      attacker.summonData.ability = this.ability;
      }

      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postDefendAbilityGive", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}

export class PostDefendMoveDisableAbAttr extends PostDefendAbAttr {
  private chance: integer;
  private attacker: Pokemon;
  private move: Move;

  constructor(chance: integer) {
    super();

    this.chance = chance;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!attacker.summonData.disabledMove) {
      if (move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon) && (this.chance === -1 || pokemon.randSeedInt(100) < this.chance) && !attacker.isMax()) {
        if (simulated) {
          return true;
        }

        this.attacker = attacker;
        this.move = move;

        attacker.summonData.disabledMove = move.id;
        attacker.summonData.disabledTurns = 4;
        return true;
      }
    }
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postDefendMoveDisable", {
      pokemonNameWithAffix: getPokemonNameWithAffix(this.attacker),
      moveName: this.move.name,
    });
  }
}

export class PostStatChangeStatChangeAbAttr extends PostStatChangeAbAttr {
  private condition: PokemonStatChangeCondition;
  private statsToChange: BattleStat[];
  private levels: integer;

  constructor(condition: PokemonStatChangeCondition, statsToChange: BattleStat[], levels: integer) {
    super(true);

    this.condition = condition;
    this.statsToChange = statsToChange;
    this.levels = levels;
  }

  applyPostStatChange(pokemon: Pokemon, simulated: boolean, statsChanged: BattleStat[], levelsChanged: integer, selfTarget: boolean, args: any[]): boolean {
    if (this.condition(pokemon, statsChanged, levelsChanged) && !selfTarget) {
      if (!simulated) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, (pokemon).getBattlerIndex(), true, this.statsToChange, this.levels));
      }
      return true;
    }

    return false;
  }
}

export class PreAttackAbAttr extends AbAttr {
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon | null, move: Move, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}
export class MoveEffectChanceMultiplierAbAttr extends AbAttr {
  private chanceMultiplier: number;

  constructor(chanceMultiplier: number) {
    super(true);
    this.chanceMultiplier = chanceMultiplier;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {

    this.showAbility = args[4];
    if ((args[0] as Utils.NumberHolder).value <= 0 || (args[1] as Move).id === Moves.ORDER_UP) {
      return false;
    }

    (args[0] as Utils.NumberHolder).value *= this.chanceMultiplier;
    (args[0] as Utils.NumberHolder).value = Math.min((args[0] as Utils.NumberHolder).value, 100);
    return true;

  }
}
export class IgnoreMoveEffectsAbAttr extends PreDefendAbAttr {

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {

    if ((args[0] as Utils.NumberHolder).value <= 0) {
      return false;
    }

    (args[0] as Utils.NumberHolder).value = 0;
    return true;

  }
}

export class VariableMovePowerAbAttr extends PreAttackAbAttr {
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {

    return false;
  }
}

export class TripleAxelizeMultiHitPowerAbAttr extends VariableMovePowerAbAttr {
  constructor() {
    super(true);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS || !move.hasAttr(MultiHitAttr) || !(args[0] instanceof Utils.NumberHolder)) {
      return false;
    }
    if (move.hasAttr(NativeTripleAccelPowerAttr)) {
      return false;
    }

    const total = pokemon.turnData.hitCount ?? 1;
    const left = pokemon.turnData.hitsLeft ?? total;
    const hitNumber = Math.max(1, Math.min(total, (total - left) + 1));

    (args[0] as Utils.NumberHolder).value *= hitNumber;
    return hitNumber > 1;
  }
}

export class PartyMoveFlagPowerBoostAbAttr extends VariableMovePowerAbAttr {
  constructor(
    private moveFlag: MoveFlags,
    private bpPerAlly: number = 10
  ) {
    super(true);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }

    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const count = party.filter(p => p !== pokemon && !p.isFainted()
      && p.getMoveset(true).some(m => m?.getMove()?.hasFlag(this.moveFlag))
    ).length;

    if (count > 0 && args[0] instanceof Utils.NumberHolder) {
      (args[0] as Utils.NumberHolder).value += this.bpPerAlly * count;
      return true;
    }

    return false;
  }
}

export class FieldPreventExplosiveMovesAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
    cancelled.value = true;
    return true;
  }
}
export class FieldMultiplyBattleStatAbAttr extends AbAttr {
  private stat: Stat;
  private multiplier: number;
  private canStack: boolean;

  constructor(stat: Stat, multiplier: number, canStack: boolean = false) {
    super(false);

    this.stat = stat;
    this.multiplier = multiplier;
    this.canStack = canStack;
  }
  applyFieldBattleStat(pokemon: Pokemon, passive: boolean, simulated: boolean, stat: Stat, statValue: Utils.NumberHolder, checkedPokemon: Pokemon, hasApplied: Utils.BooleanHolder, args: any[]): boolean {
    if (!this.canStack && hasApplied.value) {
      return false;
    }

    if (this.stat === stat && checkedPokemon.getAbilityAttrs(FieldMultiplyBattleStatAbAttr).every(attr => (attr as FieldMultiplyBattleStatAbAttr).stat !== stat)) {
      statValue.value *= this.multiplier;
      hasApplied.value = true;
      return true;
    }
    return false;
  }

}

export class MoveTypeChangeAbAttr extends PreAttackAbAttr {
  constructor(
    protected newType: Type,
    private powerMultiplier: number,
    private condition?: PokemonAttackCondition
  ) {
    super(true);
  }
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.type === Type.NORMAL && move.hasAttr(VariableMoveTypeAttr) && this.newType !== Type.NORMAL) {
      return false;
    }
    if (this.condition && this.condition(pokemon, defender, move)) {
      if (args[0] && args[0] instanceof Utils.NumberHolder) {
        args[0].value = this.newType;
      }
      if (args[1] && args[1] instanceof Utils.NumberHolder) {
        args[1].value *= this.powerMultiplier;
      }
      return true;
    }

    return false;
  }
}

export class VariableMoveTypeMultiplierAbAttr extends PreAttackAbAttr {
  constructor(showAbility: boolean = false) {
    super(showAbility);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    return false;
  }
}
export class AddedTypeEffectivenessMultiplierAbAttr extends VariableMoveTypeMultiplierAbAttr {
  constructor(
    private addedType: Type,
    private condition: PokemonAttackCondition = () => true,
    showAbility: boolean = false
  ) {
    super(showAbility);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }

    if (!this.condition(pokemon, defender, move)) {
      return false;
    }

    const typeMultiplier = args[0] as Utils.NumberHolder;
    if (typeMultiplier.value === 0) {
      return false;
    }
    const extraMultiplier = defender.getAttackTypeEffectiveness(this.addedType, pokemon, false, simulated);
    if (extraMultiplier < 2) {
      return false;
    }

    typeMultiplier.value *= extraMultiplier;
    return true;
  }
}
export class ForceSuperEffectiveAgainstTypeAbAttr extends AbAttr {
  private defenderType: Type;
  private minMultiplier: number;

  constructor(defenderType: Type, minMultiplier: number = 2) {
    super(false);
    this.defenderType = defenderType;
    this.minMultiplier = minMultiplier;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder | null, args: any[]): boolean {
    const defender = args[0] as Pokemon;
    const multiplier = args[2] as Utils.NumberHolder;
    if (!defender || !multiplier) {
      return false;
    }

    if (defender.isOfType(this.defenderType, true, true) && multiplier.value < this.minMultiplier) {
      multiplier.value = this.minMultiplier;
      return true;
    }

    return false;
  }
}
export class PokemonTypeChangeAbAttr extends PreAttackAbAttr {
  private moveType: Type;

  constructor() {
    super(true);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (
      !pokemon.isTerastallized() &&
      move.id !== Moves.STRUGGLE &&

      !move.findAttr((attr) =>
        attr instanceof RandomMovesetMoveAttr ||
        attr instanceof RandomMoveAttr ||
        attr instanceof NaturePowerAttr ||
        attr instanceof CopyMoveAttr
      )
    ) {
      const moveType = pokemon.getMoveType(move);

      if (pokemon.getTypes().some((t) => t !== moveType)) {
        if (!simulated) {
          this.moveType = moveType;
          pokemon.summonData.types = [moveType];
        pokemon.updateInfo();
        }

        return true;
      }
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:pokemonTypeChange", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveType: i18next.t(`pokemonInfo:Type.${Type[this.moveType]}`),
    });
  }
}
export class AddSecondStrikeAbAttr extends PreAttackAbAttr {
  protected damageMultiplier: number;

  constructor(damageMultiplier: number) {
    super(false);

    this.damageMultiplier = damageMultiplier;
  }
  canApplyPreAttack(move: Move, numTargets: integer): boolean {

    const exceptAttrs: Constructor<MoveAttr>[] = [
      MultiHitAttr,
      ChargeAttr,
      SacrificialAttr,
      SacrificialAttrOnHit
    ];
    const exceptMoves: Moves[] = [
      Moves.FLING,
      Moves.UPROAR,
      Moves.ROLLOUT,
      Moves.ICE_BALL,
      Moves.ENDEAVOR
    ];
    return numTargets === 1
      && !exceptAttrs.some(attr => move.hasAttr(attr))
      && !exceptMoves.some(id => move.id === id)
      && move.category !== MoveCategory.STATUS;
  }
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const numTargets = args[0] as integer;
    const hitCount = args[1] as Utils.IntegerHolder;
    const multiplier = args[2] as Utils.NumberHolder;

    if (this.canApplyPreAttack(move, numTargets)) {
      this.showAbility = !!hitCount?.value;
      if (!!hitCount?.value) {
        hitCount.value *= 2;
      }

      if (!!multiplier?.value && pokemon.turnData.hitsLeft % 2 === 1 && pokemon.turnData.hitsLeft !== pokemon.turnData.hitCount) {
        multiplier.value *= this.damageMultiplier;
      }
      return true;
    }
    return false;
  }
}

export class ConditionalAddSecondStrikeAbAttr extends AddSecondStrikeAbAttr {
  private condition: PokemonAttackCondition;

  constructor(damageMultiplier: number, condition: PokemonAttackCondition) {
    super(damageMultiplier);
    this.condition = condition;
  }

  override applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (!this.condition(pokemon, defender, move)) {
      return false;
    }
    return super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
  }
}

export class ChanceSecondStrikeAbAttr extends AddSecondStrikeAbAttr {
  private chance: integer;

  constructor(chance: integer = 30, damageMultiplier: number = 0.5) {
    super(damageMultiplier);
    this.chance = chance;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const numTargets = args[0] as integer;
    if (!this.canApplyPreAttack(move, numTargets)) {
      return false;
    }

    const hitCount = args[1] as Utils.IntegerHolder;
    if (!hitCount?.value) {
      return super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
    }

    const proc = pokemon.randSeedInt(100) < this.chance;
    if (!simulated) {
      pokemon.turnData.coinFlipHeads = proc;
    }
    if (!proc) {
      return false;
    }

    return super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
  }
}

export class ClusterBurstSecondStrikeAbAttr extends AddSecondStrikeAbAttr {
  private chance: number;
  private condition: PokemonAttackCondition;

  constructor(chance: number = 50, condition: PokemonAttackCondition = () => true) {
    super(1);
    this.chance = chance;
    this.condition = condition;
  }

  override applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (!this.condition(pokemon, defender, move)) {
      return false;
    }
    const hitCount = args[1] as Utils.IntegerHolder;
    if (pokemon.turnData.clusterBurstSecondStrikeProc === undefined) {
      if (!hitCount || hitCount.value <= 0) {
        return false;
      }
      pokemon.turnData.clusterBurstSecondStrikeProc = pokemon.randSeedInt(100) < this.chance;
    }
    if (!pokemon.turnData.clusterBurstSecondStrikeProc) {
      return false;
    }

    return super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
  }
}
export class CoinFlipDoubleStrikeOrRecoilAbAttr extends AddSecondStrikeAbAttr {
  private recoilRatio: number;

  constructor(damageMultiplier: number = 0.5, recoilRatio: number = 0.25) {
    super(damageMultiplier);
    this.recoilRatio = recoilRatio;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const numTargets = args[0] as integer;
    if (!this.canApplyPreAttack(move, numTargets)) {
      return false;
    }
    const hitCount = args[1] as Utils.IntegerHolder;
    const multiplier = args[2] as Utils.NumberHolder;

    if (hitCount?.value > 0) {
      const isHeads = pokemon.randSeedInt(2) === 0;
      if (!simulated) {
        pokemon.turnData.coinFlipHeads = isHeads;
      }
      if (isHeads) {
        hitCount.value *= 2;
        this.showAbility = true;
      } else if (!simulated) {
        pokemon.turnData.abilityRecoilThisTurn = (pokemon.turnData.abilityRecoilThisTurn ?? 0) + 1;
      }
      return true;
    }

    if (pokemon.turnData.coinFlipHeads
        && multiplier?.value
        && pokemon.turnData.hitsLeft % 2 === 1
        && pokemon.turnData.hitsLeft !== pokemon.turnData.hitCount) {
      multiplier.value *= this.damageMultiplier;
    }
    return true;
  }
}

export class DamageBoostAbAttr extends PreAttackAbAttr {
  private damageMultiplier: number;
  private condition: PokemonAttackCondition;

  constructor(damageMultiplier: number, condition: PokemonAttackCondition) {
    super(true);
    this.damageMultiplier = damageMultiplier;
    this.condition = condition;
  }
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (this.condition(pokemon, defender, move)) {
      const power = args[0] as Utils.NumberHolder;
      power.value = Math.floor(power.value * this.damageMultiplier);
      return true;
    }

    return false;
  }
}

export class MovePowerBoostAbAttr extends VariableMovePowerAbAttr {

  protected condition: PokemonAttackCondition | boolean | number;
  protected powerMultiplier: number;

  constructor(condition: PokemonAttackCondition | boolean | number = () => true, powerMultiplier: number, showAbility: boolean = true) {
    super(showAbility);
    this.condition = condition;
    this.powerMultiplier = powerMultiplier;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (attackConditionMet(this.condition, pokemon, defender, move)) {
      (args[0] as Utils.NumberHolder).value *= this.powerMultiplier;

      return true;
    }

    return false;
  }
}

export class BaseTypeConvertedMovePowerBoostAbAttr extends VariableMovePowerAbAttr {
  constructor(
    private baseType: Type,
    private convertedTypes: Type[],
    private powerMultiplier: number,
    showAbility: boolean = true
  ) {
    super(showAbility);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }

    if (move.type !== this.baseType) {
      return false;
    }

    const effectiveType = pokemon.getMoveType(move, true, defender);
    if (!this.convertedTypes.includes(effectiveType)) {
      return false;
    }

    (args[0] as Utils.NumberHolder).value *= this.powerMultiplier;
    return true;
  }
}
export class MoveTypePowerBoostAbAttr extends MovePowerBoostAbAttr {
  constructor(boostedType: Type, powerMultiplier?: number) {
    super((pokemon, defender, move) => pokemon.getMoveType(move, true, defender) === boostedType || boostedType == Type.ALL, powerMultiplier || 1.5);
  }
}

export class LowHpMoveTypePowerBoostAbAttr extends MoveTypePowerBoostAbAttr {
  constructor(boostedType: Type) {
    super(boostedType);
  }

  getCondition(): AbAttrCondition {
    return (pokemon) => pokemon.getHpRatio() <= 0.33;
  }
}
export class VariableMovePowerBoostAbAttr extends VariableMovePowerAbAttr {
  private mult: (user: Pokemon, target: Pokemon, move: Move) => number;
  constructor(mult: (user: Pokemon, target: Pokemon, move: Move) => number, showAbility: boolean = true) {
    super(showAbility);
    this.mult = mult;
  }
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move, args: any[]): boolean {
    const multiplier = this.mult(pokemon, defender, move);
    if (multiplier !== 1) {
      (args[0] as Utils.NumberHolder).value *= multiplier;
      return true;
    }

    return false;
  }
}
export class FieldMovePowerBoostAbAttr extends AbAttr {
  private condition: PokemonAttackCondition;
  private powerMultiplier: number;
  constructor(condition: PokemonAttackCondition, powerMultiplier: number) {
    super(false);
    this.condition = condition;
    this.powerMultiplier = powerMultiplier;
  }

  applyPreAttack(pokemon: Pokemon | null, passive: boolean | null, simulated: boolean, defender: Pokemon | null, move: Move, args: any[]): boolean {
    if (this.condition(pokemon, defender, move)) {
      (args[0] as Utils.NumberHolder).value *= this.powerMultiplier;

      return true;
    }

    return false;
  }
}
export class PreAttackFieldMoveTypePowerBoostAbAttr extends FieldMovePowerBoostAbAttr {

  constructor(boostedType: Type, powerMultiplier?: number) {
    super((pokemon, defender, move) => move.type === boostedType, powerMultiplier || 1.5);
  }
}
export class FieldMoveTypePowerBoostAbAttr extends PreAttackFieldMoveTypePowerBoostAbAttr { }
export class UserFieldMoveTypePowerBoostAbAttr extends PreAttackFieldMoveTypePowerBoostAbAttr { }
export class AllyMoveCategoryPowerBoostAbAttr extends FieldMovePowerBoostAbAttr {

  constructor(boostedCategories: MoveCategory[], powerMultiplier: number) {
    super((pokemon, defender, move) => boostedCategories.includes(move.category), powerMultiplier);
  }
}

export class BattleStatMultiplierAbAttr extends AbAttr {
  private battleStat: BattleStat;
  private multiplier: number;
  private condition: PokemonAttackCondition | null;

  constructor(battleStat: BattleStat, multiplier: number, condition?: PokemonAttackCondition) {
    super(false);

    this.battleStat = battleStat;
    this.multiplier = multiplier;
    this.condition = condition ?? null;
  }

  applyBattleStat(pokemon: Pokemon, passive: boolean, simulated: boolean, battleStat: BattleStat, statValue: Utils.NumberHolder, args: any[]): boolean | Promise<boolean> {
    const move = (args[0] as Move);
    if (battleStat === this.battleStat && (!this.condition || this.condition(pokemon, null, move))) {
      statValue.value *= this.multiplier;
      return true;
    }

    return false;
  }
}

export class PartyMoveTagStatMultiplierAbAttr extends BattleStatMultiplierAbAttr {
  private stat: BattleStat;
  private moveFlag: MoveFlags;
  private perAllyBonus: number;

  constructor(battleStat: BattleStat, moveFlag: MoveFlags, perAllyBonus: number = 0.1) {
    super(battleStat, 1.0);
    this.stat = battleStat;
    this.moveFlag = moveFlag;
    this.perAllyBonus = perAllyBonus;
  }

  applyBattleStat(pokemon: Pokemon, passive: boolean, simulated: boolean, battleStat: BattleStat, statValue: Utils.NumberHolder, args: any[]): boolean | Promise<boolean> {
    if (battleStat !== this.stat) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const count = party.filter(p => p !== pokemon && !p.isFainted() &&
      p.getMoveset(true).some(m => m?.getMove() && m.getMove().hasFlag(this.moveFlag))
    ).length;
    if (count > 0) {
      statValue.value *= (1 + this.perAllyBonus * count);
      return true;
    }
    return false;
  }
}

export class FaintedPartyBattleStatMultiplierAbAttr extends BattleStatMultiplierAbAttr {
  constructor(
    private stat: BattleStat,
    private perFaintedBonus: number = 0.1
  ) {
    super(stat, 1.0);
  }

  override applyBattleStat(pokemon: Pokemon, passive: boolean, simulated: boolean, battleStat: BattleStat, statValue: Utils.NumberHolder, args: any[]): boolean {
    if (battleStat !== this.stat) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const faintedCount = party.filter(p => p.isFainted()).length;
    if (faintedCount <= 0) {
      return false;
    }
    statValue.value *= (1 + faintedCount * this.perFaintedBonus);
    return true;
  }
}

export class PostAttackAbAttr extends AbAttr {
  private attackCondition: PokemonAttackCondition;
  constructor(attackCondition: PokemonAttackCondition = (user, target, move) => (move.category !== MoveCategory.STATUS)) {
    super();

    this.attackCondition = attackCondition;
  }
  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    if (this.attackCondition(pokemon, defender, move)) {
      return this.applyPostAttackAfterMoveTypeCheck(pokemon, passive, simulated, defender, move, hitResult, args);
    } else {
    return false;
  }
}
  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

function moveHasAbilityRecoilIntercept(move: Move): boolean {
  return !!move.findAttr((attr) => {
    const name = attr.constructor.name;
    return name === "AbilityRecoilToHealAttr" || name === "RedirectAbilityRecoilAttr";
  });
}

export class CoinFlipRecoilOnTailsAbAttr extends PostAttackAbAttr {
  private recoilRatio: number;

  constructor(recoilRatio: number = 0.25) {
    super();
    this.recoilRatio = recoilRatio;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || pokemon.turnData.coinFlipHeads !== false || (pokemon.turnData.abilityRecoilThisTurn ?? 0) === 0) {
      return false;
    }
    if (moveHasAbilityRecoilIntercept(move)) {
      return false;
    }
    const recoilDamage = Math.max(1, Math.floor(pokemon.getMaxHp() * this.recoilRatio));
    pokemon.damageAndUpdate(recoilDamage, HitResult.OTHER, false, true, true);
    return true;
  }
}
export class PostAttackStealHeldItemAbAttr extends PostAttackAbAttr {
  private stealCondition: PokemonAttackCondition | boolean | number | null;

  constructor(stealCondition: PokemonAttackCondition | boolean | number = () => true) {
    super();

    this.stealCondition = stealCondition ?? null;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const conditionMet = this.stealCondition === null
        ? true
        : (typeof this.stealCondition === "boolean"
          ? this.stealCondition
          : (typeof this.stealCondition === "number"
            ? randSeedChance(this.stealCondition)
            : this.stealCondition(pokemon, defender, move)));

      if (!simulated && pokemon != defender && hitResult < HitResult.NO_EFFECT && conditionMet) {
        const heldItems = this.getTargetHeldItems(defender).filter(i => i.isTransferrable);
        if (heldItems.length) {
          const stolenItem = heldItems[pokemon.randSeedInt(heldItems.length)];
          pokemon.scene.tryTransferHeldItemModifier(stolenItem, pokemon, false).then(success => {
            if (success) {
              pokemon.scene.queueMessage(i18next.t("abilityTriggers:postAttackStealHeldItem", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), defenderName: defender.name, stolenItemType: stolenItem.type.name }));
            }
            resolve(success);
          });
          return;
        }
      }
      resolve(simulated);
    });
  }

  getTargetHeldItems(target: Pokemon): PokemonHeldItemModifier[] {
    return target.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
      && m.pokemonId === target.id, target.isPlayer()) as PokemonHeldItemModifier[];
  }
}

export class PostAttackStealItemAndChipChanceAbAttr extends PostAttackAbAttr {
  constructor(
    private chance: integer,
    private chipRatio: number = 1/8,
  ) {
    super();
  }

  async applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): Promise<boolean> {
    if (simulated || pokemon === defender || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }

    if (!randSeedChance(this.chance)) {
      return false;
    }

    if (!simulated) {
      pokemon.turnData.abilityProcsThisTurn = (pokemon.turnData.abilityProcsThisTurn ?? 0) + 1;
      pokemon.turnData.abilityProcThisTurn = true;
    }
    const chipDamage = Math.max(1, Math.floor(defender.getMaxHp() * this.chipRatio));
    defender.damageAndUpdate(chipDamage, HitResult.OTHER);

    const heldItems = new PostAttackStealHeldItemAbAttr(true)
      .getTargetHeldItems(defender)
      .filter(i => i.isTransferrable);

    if (heldItems.length) {
      const stolenItem = heldItems[pokemon.randSeedInt(heldItems.length)];
      const success = await pokemon.scene.tryTransferHeldItemModifier(stolenItem, pokemon, false);
      if (success) {
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:postAttackStealHeldItem", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          defenderName: defender.name,
          stolenItemType: stolenItem.type.name
        }));
      }
    }

    return true;
  }
}

export class PostAttackApplyStatusEffectAbAttr extends PostAttackAbAttr {
  private contactRequired: boolean;
  private chance: integer;
  private effects: StatusEffect[];

  constructor(contactRequired: boolean, chance: integer, ...effects: StatusEffect[]) {
    super();

    this.contactRequired = contactRequired;
    this.chance = chance;
    this.effects = effects;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {

    if (!attacker.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr) && !simulated && pokemon !== attacker && (!this.contactRequired || move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) && pokemon.randSeedInt(100) < this.chance && !pokemon.status) {
      const effect = this.effects.length === 1 ? this.effects[0] : this.effects[pokemon.randSeedInt(this.effects.length)];
      return attacker.trySetStatus(effect, true, pokemon);
    }

    return simulated;
  }
}

export class PostAttackNoSecondaryEffectsChanceRandomStatusAbAttr extends PostAttackAbAttr {
  private chance: integer;
  private effects: StatusEffect[];

  constructor(chance: integer, ...effects: StatusEffect[]) {
    super();
    this.chance = chance;
    this.effects = effects.length
      ? effects
      : [StatusEffect.BURN, StatusEffect.FREEZE, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.SLEEP];
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === defender || !hitResult || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }

    if (moveHasSecondaryEffects(move)) {
      return false;
    }

    if (defender.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr) || defender.status) {
      return false;
    }

    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    const effect = this.effects.length === 1 ? this.effects[0] : this.effects[pokemon.randSeedInt(this.effects.length)];
    return defender.trySetStatus(effect, true, pokemon);
  }
}

export class PostAttackVoidMagicRandomEffectAbAttr extends PostAttackAbAttr {
  constructor(private chance: integer = 50) {
    super((user, target, move) => move.category !== MoveCategory.STATUS);
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || pokemon === defender) {
      return false;
    }
    if (!hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    const bucket = pokemon.randSeedInt(4);
    switch (bucket) {
      case 0: {
        const statuses = [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.SLEEP, StatusEffect.FREEZE];
        const status = statuses[pokemon.randSeedInt(statuses.length)];
        return defender.trySetStatus(status, true, pokemon);
      }
      case 1: {
        const tempTags = [BattlerTagType.CONFUSED, BattlerTagType.INFATUATED];
        const selectedTag = tempTags[pokemon.randSeedInt(tempTags.length)];
        const turns = pokemon.randSeedInt(4) + 2;
        return defender.addTag(selectedTag, turns, move.id, pokemon.id);
      }
      case 2: {
        const traps = [BattlerTagType.WRAP, BattlerTagType.WHIRLPOOL, BattlerTagType.FIRE_SPIN, BattlerTagType.SAND_TOMB, BattlerTagType.INFESTATION];
        const trap = traps[pokemon.randSeedInt(traps.length)];
        return defender.addTag(trap, 5, move.id, pokemon.id);
      }
      case 3:
      default: {
        const hazards = [ArenaTagType.SPIKES, ArenaTagType.STEALTH_ROCK, ArenaTagType.TOXIC_SPIKES, ArenaTagType.STICKY_WEB];
        const hazard = hazards[pokemon.randSeedInt(hazards.length)];
        const side = defender.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
        pokemon.scene.arena.addTag(hazard, 0, move.id, pokemon.id, side);
        return true;
      }
    }
  }
}

export class PostAttackHitChanceAddArenaTrapTagAbAttr extends PostAttackAbAttr {
  constructor(
    private chance: integer,
    private tagType: ArenaTagType,
    private condition: PokemonAttackCondition = () => true
  ) {
    super();
  }

  override applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || pokemon === defender || move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!hitResult || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }
    if (!attackConditionMet(this.condition, pokemon, defender, move)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    const side = defender.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    const existing = pokemon.scene.arena.getTagOnSide(this.tagType, side) as ArenaTrapTag | undefined;
    if (existing && existing.layers >= existing.maxLayers) {
      return false;
    }

    pokemon.scene.arena.addTag(this.tagType, 0, undefined, pokemon.id, side);
    return true;
  }
}

export class PostAttackMindWarpProcAbAttr extends PostAttackAbAttr {
  constructor(private chance: integer = 30) {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === defender || !hitResult || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }

    const effectiveMoveType = pokemon.getMoveType(move, true, defender);
    if (effectiveMoveType !== Type.DARK && effectiveMoveType !== Type.PSYCHIC) {
      return false;
    }

    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    if (effectiveMoveType === Type.PSYCHIC) {
      const duration = 2 + pokemon.randSeedInt(4);
      return defender.addTag(BattlerTagType.CONFUSED, duration, move.id, pokemon.id);
    }

    if (effectiveMoveType === Type.DARK && !defender.status) {
      return defender.trySetStatus(StatusEffect.PARALYSIS, true, pokemon);
    }

    return false;
  }
}

export class PostAttackHitChanceStatusAndTrapTagAbAttr extends PostAttackAbAttr {
  private chance: integer;
  private status: StatusEffect;
  private tagType: BattlerTagType;
  private sourceMove: Moves;
  private minTurns: integer;
  private maxTurns: integer;

  constructor(
    chance: integer,
    status: StatusEffect,
    tagType: BattlerTagType,
    sourceMove: Moves,
    minTurns: integer,
    maxTurns: integer,
    attackCondition: PokemonAttackCondition = () => true
  ) {
    super(attackCondition);
    this.chance = chance;
    this.status = status;
    this.tagType = tagType;
    this.sourceMove = sourceMove;
    this.minTurns = minTurns;
    this.maxTurns = maxTurns;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === defender || move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.FAIL || hitResult === HitResult.MISS || hitResult === HitResult.IMMUNE) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    defender.trySetStatus(this.status, true, pokemon);
    const turns = this.minTurns === this.maxTurns ? this.minTurns : pokemon.randSeedIntRange(this.minTurns, this.maxTurns);
    defender.addTag(this.tagType, turns, this.sourceMove, pokemon.id);
    return true;
  }
}

export class PostAttackHitChanceApplyBattlerTagWithTurnsAbAttr extends PostAttackAbAttr {
  private chance: integer;
  private tagType: BattlerTagType;
  private sourceMove: Moves;
  private minTurns: integer;
  private maxTurns: integer;

  constructor(
    chance: integer,
    tagType: BattlerTagType,
    sourceMove: Moves,
    minTurns: integer,
    maxTurns: integer,
    attackCondition: PokemonAttackCondition = () => true
  ) {
    super(attackCondition);
    this.chance = chance;
    this.tagType = tagType;
    this.sourceMove = sourceMove;
    this.minTurns = minTurns;
    this.maxTurns = maxTurns;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || pokemon === defender || !hitResult || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    const turns = this.minTurns === this.maxTurns ? this.minTurns : pokemon.randSeedIntRange(this.minTurns, this.maxTurns);
    return defender.addTag(this.tagType, turns, this.sourceMove, pokemon.id);
  }
}

export class PostAttackHitDamageFoeRatioAbAttr extends PostAttackAbAttr {
  private ratio: number;

  constructor(ratio: number, attackCondition: PokemonAttackCondition = (_u, _t, m) => m.category !== MoveCategory.STATUS) {
    super(attackCondition);
    this.ratio = ratio;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || pokemon === defender || defender.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      return false;
    }
    const dmg = Math.max(1, Math.floor(defender.getMaxHp() * this.ratio));
    defender.damageAndUpdate(dmg, HitResult.OTHER, false, true, true);
    defender.turnData.damageTaken += dmg;
    return true;
  }
}

export class PostAttackHitChanceProtectAbAttr extends PostAttackAbAttr {
  private chance: integer;

  constructor(chance: integer = 10, attackCondition: PokemonAttackCondition = () => true) {
    super(attackCondition);
    this.chance = chance;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    return pokemon.addTag(BattlerTagType.PROTECTED, 1, Moves.PROTECT, pokemon.id);
  }
}

export class PostAttackHitPartyMoveFlagChanceAllStatsBoostAbAttr extends PostAttackAbAttr {
  private moveFlag: MoveFlags;
  private perPokemonChance: integer;
  private stats: BattleStat[];

  constructor(
    moveFlag: MoveFlags,
    perPokemonChance: integer = 10,
    stats: BattleStat[] = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD],
    attackCondition: PokemonAttackCondition = () => true,
  ) {
    super(attackCondition);
    this.moveFlag = moveFlag;
    this.perPokemonChance = perPokemonChance;
    this.stats = stats;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || pokemon === defender) {
      return false;
    }
    const count = countPartyWithMoveFlag(pokemon, this.moveFlag);
    if (count <= 0) {
      return false;
    }
    const chance = Math.min(100, this.perPokemonChance * count);
    if (pokemon.randSeedInt(100) >= chance) {
      return false;
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, this.stats, 1));
    return true;
  }
}

export class PostAttackContactApplyStatusEffectAbAttr extends PostAttackApplyStatusEffectAbAttr {
  constructor(chance: integer, ...effects: StatusEffect[]) {
    super(true, chance, ...effects);
  }
}

export class PostAttackApplyBattlerTagAbAttr extends PostAttackAbAttr {
  private contactRequired: boolean;
  private chance: (user: Pokemon, target: Pokemon, move: Move) => integer;
  private effects: BattlerTagType[];
  constructor(contactRequired: boolean, chance: (user: Pokemon, target: Pokemon, move: Move) =>  integer, ...effects: BattlerTagType[]) {
    super();

    this.contactRequired = contactRequired;
    this.chance = chance;
    this.effects = effects;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit) {
      return false;
    }
    if (!defender.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr)
        && pokemon !== defender
        && (!this.contactRequired || move.checkFlag(MoveFlags.MAKES_CONTACT, pokemon, defender))
        && pokemon.randSeedInt(100) < this.chance(pokemon, defender, move)
    ) {
      const effect = this.effects.length === 1 ? this.effects[0] : this.effects[pokemon.randSeedInt(this.effects.length)];
      return defender.addTag(effect);
    }

    return false;
  }
}

export class PostDefendStealHeldItemAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition | null;

  constructor(condition?: PokemonDefendCondition) {
    super();

    this.condition = condition ?? null;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (!simulated && hitResult < HitResult.NO_EFFECT && (!this.condition || defendConditionMet(this.condition, pokemon, attacker, move))) {
        const heldItems = this.getTargetHeldItems(attacker).filter(i => i.isTransferrable);
        if (heldItems.length) {
          const stolenItem = heldItems[pokemon.randSeedInt(heldItems.length)];
          pokemon.scene.tryTransferHeldItemModifier(stolenItem, pokemon, false).then(success => {
            if (success) {
              pokemon.scene.queueMessage(i18next.t("abilityTriggers:postDefendStealHeldItem", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), attackerName: attacker.name, stolenItemType: stolenItem.type.name }));
            }
            resolve(success);
          });
          return;
        }
      }
      resolve(simulated);
    });
  }

  getTargetHeldItems(target: Pokemon): PokemonHeldItemModifier[] {
    return target.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
      && m.pokemonId === target.id, target.isPlayer()) as PokemonHeldItemModifier[];
  }
}

export class PostVictoryAbAttr extends AbAttr {
  applyPostVictory(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

class PostVictoryStatChangeAbAttr extends PostVictoryAbAttr {
  private stat: BattleStat | ((p: Pokemon) => BattleStat);
  private levels: integer;

  constructor(stat: BattleStat | ((p: Pokemon) => BattleStat), levels: integer) {
    super();

    this.stat = stat;
    this.levels = levels;
  }

  applyPostVictory(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    const stat = typeof this.stat === "function"
      ? this.stat(pokemon)
      : this.stat;
    if (!simulated) {
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [ stat ], this.levels));
    }
    return true;
  }
}

export class PostVictoryFormChangeAbAttr extends PostVictoryAbAttr {
  private formFunc: (p: Pokemon) => integer;

  constructor(formFunc: ((p: Pokemon) => integer)) {
    super(true);

    this.formFunc = formFunc;
  }

  applyPostVictory(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    const formIndex = this.formFunc(pokemon);
    if (formIndex !== pokemon.formIndex) {
      if (!simulated) {
      pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger, false);
      }
      return true;
    }

    return false;
  }
}

export class PostKnockOutAbAttr extends AbAttr {
  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class PostKnockOutAddArenaTrapTagAbAttr extends PostKnockOutAbAttr {
  constructor(
    private condition: PokemonKnockoutCondition | boolean | number,
    private tagType: ArenaTagType
  ) {
    super();
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (!knockoutConditionMet(this.condition, knockedOut, pokemon)) {
      return false;
    }
    const side = knockedOut.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    const existing = pokemon.scene.arena.getTagOnSide(this.tagType, side) as ArenaTrapTag | undefined;
    if (!existing || existing.layers < existing.maxLayers) {
      if (!simulated) {
        pokemon.scene.arena.addTag(this.tagType, 0, undefined, pokemon.id, side);
      }
      return true;
    }
    return false;
  }
}

export class PostKnockOutStatChangeAbAttr extends PostKnockOutAbAttr {
  private stats: BattleStat[] | ((p: Pokemon) => BattleStat[]);
  private levels: integer;
  private condition: PokemonKnockoutCondition | boolean | number;

  constructor(stats: BattleStat | ((p: Pokemon) => BattleStat[]) | BattleStat[], levels: integer, condition: PokemonKnockoutCondition | boolean | number = () => true) {
    super();
    this.stats = Array.isArray(stats) ? stats : typeof stats === "function" ? stats : [stats];
    this.levels = levels;
    this.condition = condition;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean | Promise<boolean> {
    if (knockoutConditionMet(this.condition, pokemon, knockedOut)) {
      const statsToChange = typeof this.stats === "function" ? this.stats(pokemon) : this.stats
      if (!simulated) {
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, statsToChange, this.levels));
      }
      return true;
    }
    return false;
  }
}

export class PostKnockOutBoostStrongestAttackAndSpeedAbAttr extends PostKnockOutAbAttr {
  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }

    const atk = pokemon.getBattleStat(Stat.ATK);
    const spAtk = pokemon.getBattleStat(Stat.SPATK);
    const strongest = atk >= spAtk ? BattleStat.ATK : BattleStat.SPATK;

    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [strongest, BattleStat.SPD], 1));
    return true;
  }
}

export class ChaosOrderKoRiderAbAttr extends PostKnockOutAbAttr {
  constructor(private fairyHealRatio: number = 0.25) {
    super();
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }

    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }

    const move = new PokemonMove(lastAttack.move).getMove();
    const effectiveType = pokemon.getMoveType(move, true, knockedOut);

    if (effectiveType === Type.FAIRY) {
      const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.fairyHealRatio));
      pokemon.scene.unshiftPhase(new PokemonHealPhase(
        pokemon.scene,
        pokemon.getBattlerIndex(),
        healAmount,
        getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })),
        true
      ));
      return true;
    }

    if (effectiveType === Type.DARK) {
      const stat = pokemon.randSeedInt(2) === 0 ? BattleStat.ATK : BattleStat.SPD;
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [stat], 1));
      return true;
    }

    return false;
  }
}

export class PostKnockOutCureStatusAbAttr extends PostKnockOutAbAttr {
  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated || !pokemon.status) {
      return false;
    }
    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }
    pokemon.resetStatus();
    pokemon.updateInfo();
    return true;
  }
}

export class PostKnockOutRewardPhaseChanceAbAttr extends PostKnockOutAbAttr {
  private chance: integer;

  constructor(chance: integer = 5) {
    super();
    this.chance = chance;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated || pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }
    if (!randSeedChance(this.chance)) {
      return false;
    }
    pokemon.scene.unshiftPhase(new SelectModifierPhase(pokemon.scene, 0));
    return true;
  }
}

export class PostKnockOutIfKoerHealAndRandStatAbAttr extends PostKnockOutAbAttr {
  private healRatio: number;

  constructor(healRatio: number = 0.25) {
    super();
    this.healRatio = healRatio;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    const koSourceId = knockedOut.turnData?.attacksReceived?.[0]?.sourceId;
    if (simulated || pokemon.isPlayer() === knockedOut.isPlayer() || koSourceId !== pokemon.id) {
      return false;
    }

    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
    pokemon.scene.unshiftPhase(new PokemonHealPhase(
      pokemon.scene,
      pokemon.getBattlerIndex(),
      healAmount,
      getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHPLittle", { abilityName: pokemon.getAbility().name })),
      true
    ));
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.RAND], 1));
    return true;
  }
}

export class PostKnockOutReviveAllyOfTypesOncePerBattleAbAttr extends PostKnockOutAbAttr {
  private hpRatio: number;
  private types: Type[];
  constructor(hpRatio: number, types: Type[]) {
    super();
    this.hpRatio = hpRatio;
    this.types = types;
  }
  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated || pokemon.battleData.abilityReviveUsed) {
      return false;
    }
    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const candidates = party.filter(p => p !== pokemon && p.isFainted() && this.types.some(t => p.isOfType(t)));
    if (!candidates.length) {
      return false;
    }
    const revived = candidates[pokemon.randSeedInt(candidates.length)];
    const healAmount = Math.max(1, Math.floor(revived.getMaxHp() * this.hpRatio));
    revived.hp = healAmount;
    revived.resetStatus();
    revived.battleData.wasRevived = true;
    revived.updateInfo();
    pokemon.battleData.abilityReviveUsed = true;
    pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` revived ` + getPokemonNameWithAffix(revived) + `!`);
    return true;
  }
}

export class PostKnockOutReviveRandomAllyOncePerBattleAbAttr extends PostKnockOutAbAttr {
  constructor(private hpRatio: number = 0.5) {
    super();
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated || pokemon.battleData.abilityReviveUsed) {
      return false;
    }
    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const candidates = party.filter(p => p !== pokemon && p.isFainted());
    if (!candidates.length) {
      return false;
    }
    const revived = candidates[pokemon.randSeedInt(candidates.length)];
    const healAmount = Math.max(1, Math.floor(revived.getMaxHp() * this.hpRatio));
    revived.hp = healAmount;
    revived.resetStatus();
    revived.battleData.wasRevived = true;
    revived.updateInfo();
    pokemon.battleData.abilityReviveUsed = true;
    pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` revived ` + getPokemonNameWithAffix(revived) + `!`);
    return true;
  }
}

export class FlamingOblivionArmOnBurnedKoAbAttr extends PostKnockOutAbAttr {
  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated || pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }
    if (knockedOut.status?.effect !== StatusEffect.BURN) {
      return false;
    }
    pokemon.battleData.flamingOblivionBurnedKoArmed = true;
    return true;
  }
}

export class PrimaryTypeChangeAbAttr extends MoveTypeChangeAbAttr {
  constructor(powerMultiplier: number) {

    super(
        Type.NORMAL,
        powerMultiplier,
        (user, target, move) => {
          if (move.type === Type.NORMAL &&
              !move.hasAttr(VariableMoveTypeAttr) &&
              user?.getTypes().length > 0) {

            this.newType = user.getTypes()[0];
            return true;
          }
          return false;
        }
    );
  }
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (!pokemon?.getTypes().length) {
      return false;
    }
    return super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
  }
}
export class CopyFaintedAllyAbilityAbAttr extends PostKnockOutAbAttr {
  constructor() {
    super();
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean | Promise<boolean> {
    if (pokemon.isPlayer() === knockedOut.isPlayer() && !knockedOut.getAbility().hasAttr(UncopiableAbilityAbAttr)) {
      if (!simulated) {
      pokemon.summonData.ability = knockedOut.getAbility().id;
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:copyFaintedAllyAbility", { pokemonNameWithAffix: getPokemonNameWithAffix(knockedOut), abilityName: allAbilities[knockedOut.getAbility().id].name }));
      }
      return true;
    }

    return false;
  }
}

export class IgnoreOpponentStatChangesAbAttr extends AbAttr {
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]) {
    (args[0] as Utils.IntegerHolder).value = 0;

    return true;
  }
}

export class IgnoreOpponentPositiveDefBoostsOnSlicingMovesAbAttr extends AbAttr {
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder | null, args: any[]): boolean {
    const statLevel = args[0] as Utils.IntegerHolder;
    const move = args[2] as Move;
    const stat = args[3] as Stat;

    if (stat !== Stat.DEF) {
      return false;
    }
    if (!move?.hasFlag?.(MoveFlags.SLICING_MOVE)) {
      return false;
    }
    if (statLevel.value > 0) {
      statLevel.value = 0;
      return true;
    }
    return false;
  }
}

export class IgnoreOpponentPositiveDefBoostsOnContactMovesAbAttr extends AbAttr {
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder | null, args: any[]): boolean {
    const statLevel = args[0] as Utils.IntegerHolder;
    const defender = args[1] as Pokemon;
    const move = args[2] as Move;
    const stat = args[3] as Stat;

    if (stat !== Stat.DEF) {
      return false;
    }
    if (!move?.checkFlag?.(MoveFlags.MAKES_CONTACT, pokemon, defender)) {
      return false;
    }
    if (statLevel.value > 0) {
      statLevel.value = 0;
      return true;
    }
    return false;
  }
}

export class ClearSummonTypesOnAbilityLoseAbAttr extends OnAbilityLoseAbAttr {
  applyOnAbilityLose(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
      pokemon.summonData.types = [];
      pokemon.updateInfo();
    }
    return true;
  }
}

export class AncientDualCoreTypesOnAbilityGainAbAttr extends OnAbilityGainAbAttr {
  applyOnAbilityGain(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) return true;
    const turnCount = pokemon.battleSummonData?.turnCount ?? 1;
    pokemon.summonData.types = turnCount <= 1 ? [Type.NORMAL] : [Type.STEEL, Type.FIGHTING];
    pokemon.updateInfo();
    return true;
  }
}

export class IgnoreOpponentPositiveDefSpDefBoostsOnConditionAbAttr extends AbAttr {
  constructor(private condition: PokemonAttackCondition = () => true) {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder | null, args: any[]): boolean {
    const statLevel = args[0] as Utils.IntegerHolder;
    const defender = args[1] as Pokemon;
    const move = args[2] as Move;
    const stat = args[3] as Stat;

    if (!move || move.category === MoveCategory.STATUS) {
      return false;
    }
    if (stat !== Stat.DEF && stat !== Stat.SPDEF) {
      return false;
    }
    if (!this.condition(pokemon, defender, move)) {
      return false;
    }
    if (statLevel.value > 0) {
      statLevel.value = 0;
      return true;
    }
    return false;
  }
}

export class IgnoreOpponentEvasionAbAttr extends AbAttr {
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]) {
    (args[0] as Utils.IntegerHolder).value = 0;

    return true;
  }
}

export class IntimidateImmunityAbAttr extends AbAttr {
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;
    return true;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:intimidateImmunity", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}

export class PostIntimidateStatChangeAbAttr extends AbAttr {
  private stats: BattleStat[];
  private levels: integer;
  private overwrites: boolean;

  constructor(stats: BattleStat[], levels: integer, overwrites?: boolean) {
    super(true);
    this.stats = stats;
    this.levels = levels;
    this.overwrites = !!overwrites;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (!simulated) {
    pokemon.scene.pushPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), false, this.stats, this.levels));
    }
    cancelled.value = this.overwrites;
    return true;
  }
}
export class PostSummonAbAttr extends AbAttr {

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class PostFoeSummonAbAttr extends PostSummonAbAttr {
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class FlamingOblivionPostFoeSummonChipAbAttr extends PostFoeSummonAbAttr {
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const summoned = args[0] as Pokemon;
    if (simulated || !summoned || !pokemon.battleData.flamingOblivionBurnedKoArmed) {
      return false;
    }
    pokemon.battleData.flamingOblivionBurnedKoArmed = false;
    const dmg = Math.max(1, Math.floor(summoned.getMaxHp() * 0.25));
    summoned.damageAndUpdate(dmg, HitResult.OTHER);
    return true;
  }
}

export class PostFoeSummonStatChangeAbAttr extends PostFoeSummonAbAttr {
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;
  private intimidate: boolean;

  constructor(stats: BattleStat | BattleStat[], levels: integer, selfTarget: boolean = false, intimidate?: boolean) {
    super();
    this.stats = Array.isArray(stats) ? stats : [stats];
    this.levels = levels;
    this.selfTarget = selfTarget;
    this.intimidate = !!intimidate;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (simulated) {
      return true;
    }
    const target = this.selfTarget ? pokemon : (args[0] as Pokemon || pokemon.getOpponents()[0]);
    if (!target || target.isFainted()) {
      return false;
    }
    if (!this.selfTarget && this.intimidate) {
      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(IntimidateImmunityAbAttr, target, cancelled, simulated);
      applyAbAttrs(PostIntimidateStatChangeAbAttr, target, cancelled, simulated);
      if (cancelled.value) {
        return true;
      }
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, target.getBattlerIndex(), this.selfTarget, this.stats, this.levels));
    return true;
  }
}

export class PostSummonRemoveArenaTagAbAttr extends PostSummonAbAttr {
  private arenaTags: ArenaTagType[];
  private targetSide: "both" | "self" | "foe";
  constructor(arenaTags: ArenaTagType[], targetSide: "both" | "self" | "foe" = "both") {
    super(true);

    this.arenaTags = arenaTags;
    this.targetSide = targetSide;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (!simulated) {
      const sides: ArenaTagSide[] =
        this.targetSide === "both"
          ? [ ArenaTagSide.PLAYER, ArenaTagSide.ENEMY ]
          : [ pokemon.isPlayer()
              ? (this.targetSide === "self" ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY)
              : (this.targetSide === "self" ? ArenaTagSide.ENEMY : ArenaTagSide.PLAYER)
            ];

      for (const arenaTag of this.arenaTags) {
        for (const side of sides) {

          while (pokemon.scene.arena.removeTagOnSide(arenaTag, side)) {  }
        }
      }
    }
    return true;
  }
}

export class PostFoeSummonOpponentBattlerTagAbAttr extends PostFoeSummonAbAttr {
  private tagType: BattlerTagType;
  private turnCount: integer;

  constructor(tagType: BattlerTagType, turnCount: integer) {
    super(true);
    this.tagType = tagType;
    this.turnCount = turnCount;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const foe = args[0] as Pokemon | undefined;
    if (!foe || simulated) {
      return !simulated;
    }
    return foe.addTag(this.tagType, this.turnCount, undefined, pokemon.id);
  }
}

export class PostSummonMessageAbAttr extends PostSummonAbAttr {
  private messageFunc: (pokemon: Pokemon) => string;

  constructor(messageFunc: (pokemon: Pokemon) => string) {
    super(true);

    this.messageFunc = messageFunc;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
    pokemon.scene.queueMessage(this.messageFunc(pokemon));
    }

    return true;
  }
}

export class PostSummonUnnamedMessageAbAttr extends PostSummonAbAttr {

  private message: string;

  constructor(message: string) {
    super(true);

    this.message = message;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
    pokemon.scene.queueMessage(this.message);
    }

    return true;
  }
}

export class PostSummonAddBattlerTagAbAttr extends PostSummonAbAttr {
  private tagType: BattlerTagType;
  private turnCount: integer;

  constructor(tagType: BattlerTagType, turnCount: integer, showAbility?: boolean) {
    super(showAbility);

    this.tagType = tagType;
    this.turnCount = turnCount;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return pokemon.canAddTag(this.tagType);
    } else {
    return pokemon.addTag(this.tagType, this.turnCount);
  }
}
}

export class PostSummonAddBattlerTagOncePerBattleAbAttr extends PostSummonAbAttr {
  private tagType: BattlerTagType;
  private turnCount: integer;

  constructor(tagType: BattlerTagType, turnCount: integer, showAbility?: boolean) {
    super(showAbility);
    this.tagType = tagType;
    this.turnCount = turnCount;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.battleData?.abilityChargeGranted) {
      return false;
    }
    if (simulated) {
      return pokemon.canAddTag(this.tagType);
    }
    pokemon.battleData.abilityChargeGranted = true;
    return pokemon.addTag(this.tagType, this.turnCount);
  }
}

export class PostSummonOpponentBattlerTagAbAttr extends PostSummonAbAttr {
  private tagType: BattlerTagType;
  private turnCount: integer;

  constructor(tagType: BattlerTagType, turnCount: integer, showAbility?: boolean) {
    super(showAbility ?? true);
    this.tagType = tagType;
    this.turnCount = turnCount;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const opponents = pokemon.getOpponents();
    if (simulated) {
      return opponents.some(o => o.canAddTag(this.tagType));
    }
    let triggered = false;
    for (const opponent of opponents) {
      if (opponent.addTag(this.tagType, this.turnCount, undefined, pokemon.id)) {
        triggered = true;
      }
    }
    return triggered;
  }
}

export class PostSummonSetTypesAbAttr extends PostSummonAbAttr {
  constructor(private types: Type[]) {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
      pokemon.summonData.types = [...this.types];
      pokemon.updateInfo();
    }
    return true;
  }
}

export class PostSummonPartyTypeCountRandomStatBoostAbAttr extends PostSummonAbAttr {
  private types: Type[];
  constructor(types: Type[]) {
    super(true);
    this.types = types;
  }
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const count = party.filter(p => p !== pokemon && !p.isFainted() && this.types.some(t => p.isOfType(t))).length;
    if (count <= 0) {
      return false;
    }
    if (simulated) {
      return true;
    }
    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    for (let i = 0; i < count; i++) {
      const stat = pool[pokemon.randSeedInt(pool.length)];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [stat], 1));
    }
    return true;
  }
}

export class PostSummonLowHpParalyzeAndTrapAbAttr extends PostSummonAbAttr {
  private hpThreshold: number;

  constructor(hpThreshold: number = 0.5) {
    super(false);
    this.hpThreshold = hpThreshold;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.getHpRatio() >= this.hpThreshold) {
      return false;
    }
    if (simulated) {
      return true;
    }
    let triggered = false;
    for (const opponent of pokemon.getOpponents()) {
      if (opponent.trySetStatus(StatusEffect.PARALYSIS, true, pokemon)) {
        triggered = true;
      }
    }
    if (triggered) {
      pokemon.addTag(BattlerTagType.TRAPPED, -1, undefined, pokemon.id);
    }
    return triggered;
  }
}

export class PostSummonStatChangeAbAttr extends PostSummonAbAttr {
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;
  private intimidate: boolean;

  constructor(stats: BattleStat | BattleStat[], levels: integer, selfTarget?: boolean, intimidate?: boolean) {
    super(false);

    this.stats = typeof(stats) === "number"
      ? [ stats as BattleStat ]
      : stats as BattleStat[];
    this.levels = levels;
    this.selfTarget = !!selfTarget;
    this.intimidate = !!intimidate;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }

    queueShowAbility(pokemon, passive);
    if (this.selfTarget) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, this.stats, this.levels));
      return true;
    }
    for (const opponent of pokemon.getOpponents()) {
      const cancelled = new Utils.BooleanHolder(false);
      if (this.intimidate) {
        applyAbAttrs(IntimidateImmunityAbAttr, opponent, cancelled, simulated);
        applyAbAttrs(PostIntimidateStatChangeAbAttr, opponent, cancelled, simulated);
      }
      if (!cancelled.value) {
        const statChangePhase = new StatChangePhase(pokemon.scene, opponent.getBattlerIndex(), false, this.stats, this.levels);
        pokemon.scene.unshiftPhase(statChangePhase);
      }
    }
    return true;
  }
}

export class PostSummonPartyMoveTagStatBoostAbAttr extends PostSummonAbAttr {
  private moveFlag: MoveFlags;

  constructor(moveFlag: MoveFlags) {
    super(false);
    this.moveFlag = moveFlag;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const count = party.filter(p => p !== pokemon && !p.isFainted() && p.getMoveset(true).some(m => m?.getMove().hasFlag(this.moveFlag))).length;
    if (count <= 0) {
      return false;
    }
    for (let i = 0; i < count; i++) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.RAND], 1));
    }
    return true;
  }
}

export class PostSummonAllyHealAbAttr extends PostSummonAbAttr {
  private healRatio: number;
  private showAnim: boolean;

  constructor(healRatio: number, showAnim: boolean = false) {
    super();

    this.healRatio = healRatio || 4;
    this.showAnim = showAnim;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const target = pokemon.getAlly();
    if (target?.isActive(true)) {
      if (!simulated) {
      target.scene.unshiftPhase(new PokemonHealPhase(target.scene, target.getBattlerIndex(),
          Utils.toDmgValue(pokemon.getMaxHp() / this.healRatio), i18next.t("abilityTriggers:postSummonAllyHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(target), pokemonName: pokemon.name }), true, !this.showAnim));
      }

      return true;
    }

    return false;
  }
}

export class PostSummonHealRatioAbAttr extends PostSummonAbAttr {
  constructor(private healRatio: number = 0.25) {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    if (pokemon.isFullHp()) {
      return false;
    }
    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
    const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
    pokemon.scene.unshiftPhase(new PokemonHealPhase(
      pokemon.scene,
      pokemon.getBattlerIndex(),
      healAmount,
      getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName })),
      true
    ));
    return true;
  }
}
export class PostSummonClearAllyStatsAbAttr extends PostSummonAbAttr {
  constructor() {
    super();
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const target = pokemon.getAlly();
    if (target?.isActive(true)) {
      if (!simulated) {
      for (let s = 0; s < target.summonData.battleStats.length; s++) {
        target.summonData.battleStats[s] = 0;
      }

        target.scene.queueMessage(i18next.t("abilityTriggers:postSummonClearAllyStats", { pokemonNameWithAffix: getPokemonNameWithAffix(target) }));
      }

      return true;
    }

    return false;
  }
}
export class DownloadAbAttr extends PostSummonAbAttr {
  private enemyDef: integer;
  private enemySpDef: integer;
  private enemyCountTally: integer;
  private stats: BattleStat[];
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    this.enemyDef = 0;
    this.enemySpDef = 0;
    this.enemyCountTally = 0;

    for (const opponent of pokemon.getOpponents()) {
        this.enemyCountTally++;
        this.enemyDef += opponent.getBattleStat(Stat.DEF);
        this.enemySpDef += opponent.getBattleStat(Stat.SPDEF);
      }
      this.enemyDef = Math.round(this.enemyDef / this.enemyCountTally);
      this.enemySpDef = Math.round(this.enemySpDef / this.enemyCountTally);

    if (this.enemyDef < this.enemySpDef) {
      this.stats = [BattleStat.ATK];
    } else {
      this.stats = [BattleStat.SPATK];
    }

    if (this.enemyDef > 0 && this.enemySpDef > 0) {
      if (!simulated) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), false, this.stats, 1));
      }
      return true;
    }

    return false;
  }
}

export class PostSummonWeatherChangeAbAttr extends PostSummonAbAttr {
  private weatherType: WeatherType;

  constructor(weatherType: WeatherType) {
    super();

    this.weatherType = weatherType;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if ((this.weatherType === WeatherType.HEAVY_RAIN ||
      this.weatherType === WeatherType.HARSH_SUN ||
      this.weatherType === WeatherType.STRONG_WINDS) || !pokemon.scene.arena.weather?.isImmutable()) {
      if (simulated) {
        return pokemon.scene.arena.weather?.weatherType !== this.weatherType;
      } else {
      return pokemon.scene.arena.trySetWeather(this.weatherType, true);
    }
    }

    return false;
  }
}

export class PostSummonTerrainChangeAbAttr extends PostSummonAbAttr {
  private terrainType: TerrainType;

  constructor(terrainType: TerrainType) {
    super();

    this.terrainType = terrainType;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return pokemon.scene.arena.terrain?.terrainType !== this.terrainType;
    } else {
    return pokemon.scene.arena.trySetTerrain(this.terrainType, true);
  }
}
}

export class PostSummonFormChangeAbAttr extends PostSummonAbAttr {
  private formFunc: (p: Pokemon) => integer;

  constructor(formFunc: ((p: Pokemon) => integer)) {
    super(true);

    this.formFunc = formFunc;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const formIndex = this.formFunc(pokemon);
    if (formIndex !== pokemon.formIndex) {
      return simulated || pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger, false);
    }

    return false;
  }
}
export class PostSummonCopyAbilityAbAttr extends PostSummonAbAttr {
  private target: Pokemon;
  private targetAbilityName: string;

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const targets = pokemon.getOpponents();
    if (!targets.length) {
      return false;
    }

    let target: Pokemon;
    if (targets.length > 1) {
      pokemon.scene.executeWithSeedOffset(() => target = Utils.randSeedItem(targets), pokemon.scene.currentBattle.waveIndex);
    } else {
      target = targets[0];
    }

    if (
      target!.getAbility().hasAttr(UncopiableAbilityAbAttr) &&

      !(pokemon.hasAbility(Abilities.TRACE) && target!.getAbility().id === Abilities.WONDER_GUARD)
    ) {
      return false;
    }

    if (!simulated) {
      this.target = target!;
      this.targetAbilityName = allAbilities[target!.getAbility().id].name;
      pokemon.summonData.ability = target!.getAbility().id;
      setAbilityRevealed(target!);
      pokemon.updateInfo();
    }

    return true;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:trace", {
      pokemonName: getPokemonNameWithAffix(pokemon),
      targetName: getPokemonNameWithAffix(this.target),
      abilityName: this.targetAbilityName,
    });
  }
}
export class PostSummonUserFieldRemoveStatusEffectAbAttr extends PostSummonAbAttr {
  private statusEffect: StatusEffect[];
  constructor(...statusEffect: StatusEffect[]) {
    super(false);

    this.statusEffect = statusEffect;
  }
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    const party = pokemon instanceof PlayerPokemon ? pokemon.scene.getPlayerField() : pokemon.scene.getEnemyField();
    const allowedParty = party.filter(p => p.isAllowedInBattle());

    if (allowedParty.length < 1) {
      return false;
    }

    if (!simulated) {
      for (const pokemon of allowedParty) {
        if (pokemon.status && this.statusEffect.includes(pokemon.status.effect)) {
          pokemon.scene.queueMessage(getStatusEffectHealText(pokemon.status.effect, getPokemonNameWithAffix(pokemon)));
          pokemon.resetStatus(false);
          pokemon.updateInfo();
        }
      }
    }
    return true;
  }
}

export class PostSummonSelfRemoveStatusEffectAbAttr extends PostSummonAbAttr {
  constructor(private effects: StatusEffect[]) {
    super(false);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    if (pokemon.status && this.effects.includes(pokemon.status.effect)) {
      pokemon.scene.queueMessage(getStatusEffectHealText(pokemon.status.effect, getPokemonNameWithAffix(pokemon)));
      pokemon.resetStatus(false);
      pokemon.updateInfo();
      return true;
    }
    return false;
  }
}

export class PostSummonSelfRandomStatusAbAttr extends PostSummonAbAttr {
  private statusPool: StatusEffect[];

  constructor(statusPool: StatusEffect[]) {
    super(false);
    this.statusPool = statusPool;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const status = this.statusPool[pokemon.randSeedInt(this.statusPool.length)];
    return pokemon.trySetStatus(status, true);
  }
}

export class PostSummonCopyAllyStatsAbAttr extends PostSummonAbAttr {
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!pokemon.scene.currentBattle.double) {
      return false;
    }

    const ally = pokemon.getAlly();
    if (!ally || ally.summonData.battleStats.every((change) => change === 0)) {
      return false;
    }

    if (!simulated) {
      pokemon.summonData.battleStats = ally.summonData.battleStats;
      pokemon.updateInfo();
    }

    return true;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:costar", {
      pokemonName: getPokemonNameWithAffix(pokemon),
      allyName: getPokemonNameWithAffix(pokemon.getAlly()),
    });
  }
}

export class PostSummonTransformAbAttr extends PostSummonAbAttr {
  constructor() {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const targets = pokemon.getOpponents();
    if (simulated || !targets.length) {
      return simulated;
    }

    let target: Pokemon;
    if (targets.length > 1) {
      pokemon.scene.executeWithSeedOffset(() => target = Utils.randSeedItem(targets), pokemon.scene.currentBattle.waveIndex);
    } else {
      target = targets[0];
    }

    target = target!;
    pokemon.summonData.speciesForm = target.getSpeciesForm();
    pokemon.summonData.fusionSpeciesForm = target.getFusionSpeciesForm();
    pokemon.summonData.ability = target.getAbility().id;
    pokemon.summonData.gender = target.getGender();
    pokemon.summonData.fusionGender = target.getFusionGender();
    pokemon.summonData.stats = [ pokemon.stats[Stat.HP] ].concat(target.stats.slice(1));
    pokemon.summonData.battleStats = target.summonData.battleStats.slice(0);
    pokemon.summonData.moveset = target.getMoveset().map(m => new PokemonMove(m!.moveId, m!.ppUsed, m!.ppUp));
    pokemon.summonData.types = target.getTypes();

    pokemon.scene.playSound("battle_anims/PRSFX- Transform");

    pokemon.loadAssets(false).then(() => {
      const visualForm = pokemon.summonData.speciesForm;
      if (visualForm && (visualForm.generation === 20 || visualForm.isGlitchOrSmittyForm?.(visualForm.getFormKey?.()))) {
        pokemon.finalizeSummonSpriteLayout();
        const sprite = pokemon.getSprite();
        if (sprite) {
          sprite.pipelineData["ignoreFieldPos"] = true;
          sprite.pipelineData["hasShadow"] = false;
        }
        const tintSprite = pokemon.getTintSprite();
        if (tintSprite) {
          tintSprite.pipelineData["ignoreFieldPos"] = true;
          tintSprite.pipelineData["hasShadow"] = false;
        }
      } else {
        pokemon.updateScale();
      }
      pokemon.playAnim();
    });

    pokemon.scene.queueMessage(i18next.t("abilityTriggers:postSummonTransform", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), targetName: target.name, }));

    return true;
  }
}
export class PostSummonWeatherSuppressedFormChangeAbAttr extends PostSummonAbAttr {

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]) {
    const pokemonToTransform = getPokemonWithWeatherBasedForms(pokemon.scene);

    if (pokemonToTransform.length < 1) {
      return false;
    }

    if (!simulated) {
      pokemon.scene.arena.triggerWeatherBasedFormChangesToNormal();
    }

    return true;
  }
}
export class PostSummonFormChangeByWeatherAbAttr extends PostSummonAbAttr {
  private ability: Abilities;

  constructor(ability: Abilities) {
    super(false);

    this.ability = ability;
  }
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.species.speciesId === Species.CASTFORM && this.ability === Abilities.FORECAST) {
      if (simulated) {
        return simulated;
      }

      pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeWeatherTrigger);
      pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeRevertWeatherFormTrigger);
      queueShowAbility(pokemon, passive);
      return true;
    }
    return false;
  }
}

export class PreSwitchOutAbAttr extends AbAttr {
  constructor() {
    super(true);
  }

  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[], switchedInPokemon?: Pokemon): boolean | Promise<boolean> {
    return false;
  }
}

export class PreSwitchOutResetStatusAbAttr extends PreSwitchOutAbAttr {
  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (pokemon.status) {
      if (!simulated) {
      pokemon.resetStatus();
      pokemon.updateInfo();
      }

      return true;
    }

    return false;
  }
}
export class PreSwitchOutClearWeatherAbAttr extends PreSwitchOutAbAttr {
  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    const weatherType = pokemon.scene.arena.weather?.weatherType;
    let turnOffWeather = false;
    switch (weatherType) {
    case (WeatherType.HARSH_SUN):
      if (pokemon.hasAbility(Abilities.DESOLATE_LAND)
          && pokemon.scene.getField(true).filter(p => p !== pokemon).filter(p => p.hasAbility(Abilities.DESOLATE_LAND)).length === 0) {
        turnOffWeather = true;
      }
      break;
    case (WeatherType.HEAVY_RAIN):
      if (pokemon.hasAbility(Abilities.PRIMORDIAL_SEA)
          && pokemon.scene.getField(true).filter(p => p !== pokemon).filter(p => p.hasAbility(Abilities.PRIMORDIAL_SEA)).length === 0) {
        turnOffWeather = true;
      }
      break;
    case (WeatherType.STRONG_WINDS):
      if (pokemon.hasAbility(Abilities.DELTA_STREAM)
          && pokemon.scene.getField(true).filter(p => p !== pokemon).filter(p => p.hasAbility(Abilities.DELTA_STREAM)).length === 0) {
        turnOffWeather = true;
      }
      break;
    }

    if (simulated) {
      return turnOffWeather;
    }

    if (turnOffWeather) {
      pokemon.scene.arena.trySetWeather(WeatherType.NONE, false);
      return true;
    }

    return false;
  }
}

export class PreSwitchOutHealAbAttr extends PreSwitchOutAbAttr {
  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (!pokemon.isFullHp()) {
      if (!simulated) {
        const healAmount = Utils.toDmgValue(pokemon.getMaxHp() * 0.33);
      pokemon.heal(healAmount);
      pokemon.updateInfo();
      }

      return true;
    }

    return false;
  }
}
export class PreSwitchOutFormChangeAbAttr extends PreSwitchOutAbAttr {
  private formFunc: (p: Pokemon) => integer;

  constructor(formFunc: ((p: Pokemon) => integer)) {
    super();

    this.formFunc = formFunc;
  }
  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    const formIndex = this.formFunc(pokemon);
    if (formIndex !== pokemon.formIndex) {
      if (!simulated) {
      pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger, false);
      }
      return true;
    }

    return false;
  }

}

export class PreStatChangeAbAttr extends AbAttr {
  applyPreStatChange(pokemon: Pokemon | null, passive: boolean, simulated: boolean, stat: BattleStat, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class ProtectStatAbAttr extends PreStatChangeAbAttr {
  private protectedStat?: BattleStat;

  constructor(protectedStat?: BattleStat) {
    super();

    this.protectedStat = protectedStat;
  }

  applyPreStatChange(pokemon: Pokemon, passive: boolean, simulated: boolean, stat: BattleStat, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (Utils.isNullOrUndefined(this.protectedStat) || stat === this.protectedStat) {
      cancelled.value = true;
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:protectStat", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName,
      statName: this.protectedStat ? getBattleStatName(this.protectedStat) : i18next.t("battle:stats")
    });
  }
}
export class ConfusionOnStatusEffectAbAttr extends PostAttackAbAttr {

  private effects: StatusEffect[];

  constructor(...effects: StatusEffect[]) {

    super((user, target, move) => true);
    this.effects = effects;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (this.effects.indexOf(args[0]) > -1 && !defender.isFainted()) {
      if (simulated) {
        return defender.canAddTag(BattlerTagType.CONFUSED);
      } else {
      return defender.addTag(BattlerTagType.CONFUSED, pokemon.randSeedInt(3,2), move.id, defender.id);
    }
    }
    return false;
  }
}

export class PreSetStatusAbAttr extends AbAttr {
  applyPreSetStatus(pokemon: Pokemon, passive: boolean, simulated: boolean, effect: StatusEffect | undefined, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}
export class PreSetStatusEffectImmunityAbAttr extends PreSetStatusAbAttr {
  private immuneEffects: StatusEffect[];
  constructor(...immuneEffects: StatusEffect[]) {
    super();

    this.immuneEffects = immuneEffects;
  }
  applyPreSetStatus(pokemon: Pokemon, passive: boolean, simulated: boolean, effect: StatusEffect, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.immuneEffects.length < 1 || this.immuneEffects.includes(effect)) {
      cancelled.value = true;
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return this.immuneEffects.length ?
      i18next.t("abilityTriggers:statusEffectImmunityWithName", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        abilityName,
        statusEffectName: getStatusEffectDescriptor(args[0] as StatusEffect)
      }) :
      i18next.t("abilityTriggers:statusEffectImmunity", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        abilityName
      });
  }
}
export class StatusEffectImmunityAbAttr extends PreSetStatusEffectImmunityAbAttr { }
export class UserFieldStatusEffectImmunityAbAttr extends PreSetStatusEffectImmunityAbAttr { }

export class PreApplyBattlerTagAbAttr extends AbAttr {
  applyPreApplyBattlerTag(pokemon: Pokemon, passive: boolean, simulated: boolean, tag: BattlerTag, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}
export class PreApplyBattlerTagImmunityAbAttr extends PreApplyBattlerTagAbAttr {
  private immuneTagType: BattlerTagType;
  private battlerTag: BattlerTag;

  constructor(immuneTagType: BattlerTagType) {
    super();

    this.immuneTagType = immuneTagType;
  }

  applyPreApplyBattlerTag(pokemon: Pokemon, passive: boolean, simulated: boolean, tag: BattlerTag, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (tag.tagType === this.immuneTagType) {
      cancelled.value = true;
      if (!simulated) {
        this.battlerTag = tag;
      }
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:battlerTagImmunity", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName,
      battlerTagName: this.battlerTag.getDescriptor()
    });
  }
}
export class BattlerTagImmunityAbAttr extends PreApplyBattlerTagImmunityAbAttr { }
export class UserFieldBattlerTagImmunityAbAttr extends PreApplyBattlerTagImmunityAbAttr { }

export class BlockCritAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Utils.BooleanHolder).value = true;
    return true;
  }
}

export class BonusCritAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Utils.BooleanHolder).value = true;
    return true;
  }
}

export class ConditionalBonusCritAbAttr extends BonusCritAbAttr {
  private condition: PokemonAttackCondition;

  constructor(condition: PokemonAttackCondition) {
    super();
    this.condition = condition;
  }

  override apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const target = args[1] as Pokemon;
    const move = args[2] as Move;
    if (!target || !move) {
      return false;
    }
    if (!attackConditionMet(this.condition, pokemon, target, move)) {
      return false;
    }
    (args[0] as Utils.BooleanHolder).value = true;
    return true;
  }
}

export class MultCritAbAttr extends AbAttr {
  public multAmount: number;

  constructor(multAmount: number) {
    super(true);

    this.multAmount = multAmount;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const critMult = args[0] as Utils.NumberHolder;
    if (critMult.value > 1) {
      critMult.value *= this.multAmount;
      return true;
    }

    return false;
  }
}
export class ConditionalCritAbAttr extends AbAttr {
  private condition: PokemonAttackCondition;

  constructor(condition: PokemonAttackCondition, checkUser?: Boolean) {
    super();

    this.condition = condition;
  }
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const target = (args[1] as Pokemon);
    const move = (args[2] as Move);
    if (!attackConditionMet(this.condition, pokemon, target, move)) {
      return false;
    }

    (args[0] as Utils.BooleanHolder).value = true;
    return true;
  }
}

export class CritLevelBoostAbAttr extends AbAttr {
  private amount: integer;
  private condition: PokemonAttackCondition;

  constructor(amount: integer = 1, condition: PokemonAttackCondition = () => true) {
    super(false);
    this.amount = amount;
    this.condition = condition;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const critLevel = args[0] as Utils.IntegerHolder;
    const target = args[1] as Pokemon;
    const move = args[2] as Move;
    if (!attackConditionMet(this.condition, pokemon, target, move)) {
      return false;
    }
    critLevel.value += this.amount;
    return true;
  }
}

export class BlockNonDirectDamageAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;
    return true;
  }
}
export class BlockStatusDamageAbAttr extends AbAttr {
  private effects: StatusEffect[];
  constructor(...effects: StatusEffect[]) {
    super(false);

    this.effects = effects;
  }
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (pokemon.status && this.effects.includes(pokemon.status.effect)) {
      cancelled.value = true;
      return true;
    }
    return false;
  }
}

export class BlockOneHitKOAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;
    return true;
  }
}

export class BlockSwitchCommandAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;
    return true;
  }
}

export class BlockAllHealingAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;
    return true;
  }
}

export class ChangeMovePriorityAbAttr extends AbAttr {
  private moveFunc: (pokemon: Pokemon, move: Move, simulated?: boolean) => boolean;
  private changeAmount: number;
  constructor(moveFunc: (pokemon: Pokemon, move: Move, simulated?: boolean) => boolean, changeAmount: number) {
    super(true);

    this.moveFunc = moveFunc;
    this.changeAmount = changeAmount;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const move = args[0] as Move;
    const defender = args[2] instanceof Pokemon ? args[2] as Pokemon : null;
    const baseMoveType = move.type;
    const effectiveMoveType = pokemon.getMoveType(move, true, defender);
    const shouldOverrideType = effectiveMoveType !== baseMoveType;
    try {
      if (shouldOverrideType) {
        move.type = effectiveMoveType;
      }
      if (!this.moveFunc(pokemon, move, simulated)) {
        return false;
      }
    } finally {
      if (shouldOverrideType) {
        move.type = baseMoveType;
      }
    }

    (args[1] as Utils.IntegerHolder).value += this.changeAmount;
    return true;
  }
}

export class IgnoreContactAbAttr extends AbAttr { }

export class PreWeatherEffectAbAttr extends AbAttr {
  applyPreWeatherEffect(pokemon: Pokemon, passive: Boolean, simulated: boolean, weather: Weather | null, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class PreWeatherDamageAbAttr extends PreWeatherEffectAbAttr { }

export class BlockWeatherDamageAttr extends PreWeatherDamageAbAttr {
  private weatherTypes: WeatherType[];

  constructor(...weatherTypes: WeatherType[]) {
    super();

    this.weatherTypes = weatherTypes;
  }

  applyPreWeatherEffect(pokemon: Pokemon, passive: boolean, simulated: boolean, weather: Weather, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (!this.weatherTypes.length || this.weatherTypes.indexOf(weather?.weatherType) > -1) {
      cancelled.value = true;
    }

    return true;
  }
}

export class SuppressWeatherEffectAbAttr extends PreWeatherEffectAbAttr {
  public affectsImmutable: boolean;

  constructor(affectsImmutable?: boolean) {
    super();

    this.affectsImmutable = !!affectsImmutable;
  }

  applyPreWeatherEffect(pokemon: Pokemon, passive: boolean, simulated: boolean, weather: Weather, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.affectsImmutable || weather.isImmutable()) {
      cancelled.value = true;
      return true;
    }

    return false;
  }
}
function getSheerForceHitDisableAbCondition(): AbAttrCondition {
return (pokemon: Pokemon) => {
    if (!pokemon.turnData) {
      return true;
    }

    const lastReceivedAttack = pokemon.turnData.attacksReceived[0];
    if (!lastReceivedAttack) {
      return true;
    }

    const lastAttacker = pokemon.getOpponents().find(p => p.id === lastReceivedAttack.sourceId);
    if (!lastAttacker) {
      return true;
    }
    const receivedMove = allMoves[lastReceivedAttack.move];
    if (!receivedMove) {
      return true;
    }
    const SheerForceAffected = receivedMove.chance >= 0 && lastAttacker.hasAbility(Abilities.SHEER_FORCE);

    return !SheerForceAffected;
  };
}

function getWeatherCondition(...weatherTypes: WeatherType[]): AbAttrCondition {
  return (pokemon: Pokemon) => {
    if (!pokemon.scene?.arena) {
      return false;
    }
    if (pokemon.scene.arena.weather?.isEffectSuppressed(pokemon.scene)) {
      return false;
    }
    const weatherType = pokemon.scene.arena.weather?.weatherType;
    return !!weatherType && weatherTypes.indexOf(weatherType) > -1;
  };
}

function getAnticipationCondition(): AbAttrCondition {
  return (pokemon: Pokemon) => {
    for (const opponent of pokemon.getOpponents()) {
      for (const move of opponent.moveset) {

        if (!move) {
          continue;
        }

        if (move.getMove() instanceof AttackMove && pokemon.getAttackTypeEffectiveness(move.getMove().type, opponent, true) >= 2) {
          return true;
        }

        if (move.getMove().hasAttr(OneHitKOAttr)) {
          return true;
        }

        if (move.getMove().id === Moves.HIDDEN_POWER) {
          const iv_val = Math.floor(((opponent.ivs[Stat.HP] & 1)
              +(opponent.ivs[Stat.ATK] & 1) * 2
              +(opponent.ivs[Stat.DEF] & 1) * 4
              +(opponent.ivs[Stat.SPD] & 1) * 8
              +(opponent.ivs[Stat.SPATK] & 1) * 16
              +(opponent.ivs[Stat.SPDEF] & 1) * 32) * 15/63);

          const type = [
            Type.FIGHTING, Type.FLYING, Type.POISON, Type.GROUND,
            Type.ROCK, Type.BUG, Type.GHOST, Type.STEEL,
            Type.FIRE, Type.WATER, Type.GRASS, Type.ELECTRIC,
            Type.PSYCHIC, Type.ICE, Type.DRAGON, Type.DARK][iv_val];

          if (pokemon.getAttackTypeEffectiveness(type, opponent) >= 2) {
            return true;
          }
        }
      }
    }
    return false;
  };
}
function getOncePerBattleCondition(ability: Abilities): AbAttrCondition {
  return (pokemon: Pokemon) => {
    return !pokemon.battleData?.abilitiesApplied.includes(ability);
  };
}

export class ForewarnAbAttr extends PostSummonAbAttr {
  constructor() {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    let maxPowerSeen = 0;
    let maxMove = "";
    let movePower = 0;
    for (const opponent of pokemon.getOpponents()) {
      for (const move of opponent.moveset) {
        if (move?.getMove() instanceof StatusMove) {
          movePower = 1;
        } else if (move?.getMove().hasAttr(OneHitKOAttr)) {
          movePower = 150;
        } else if (move?.getMove().id === Moves.COUNTER || move?.getMove().id === Moves.MIRROR_COAT || move?.getMove().id === Moves.METAL_BURST) {
          movePower = 120;
        } else if (move?.getMove().power === -1) {
          movePower = 80;
        } else {
          movePower = move!.getMove().power;
        }

        if (movePower > maxPowerSeen) {
          maxPowerSeen = movePower;
          maxMove = move!.getName();
        }
      }
    }
    if (!simulated) {
      pokemon.scene.queueMessage(i18next.t("abilityTriggers:forewarn", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), moveName: maxMove }));
    }
    return true;
  }
}

export class FriskAbAttr extends PostSummonAbAttr {
  constructor() {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
    for (const opponent of pokemon.getOpponents()) {
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:frisk", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), opponentName: opponent.name, opponentAbilityName: opponent.getAbility().name }));
      setAbilityRevealed(opponent);
    }
    }
    return true;
  }
}

export class PostWeatherChangeAbAttr extends AbAttr {
  applyPostWeatherChange(pokemon: Pokemon, passive: boolean, simulated: boolean, weather: WeatherType, args: any[]): boolean {
    return false;
  }
}
export class PostWeatherChangeFormChangeAbAttr extends PostWeatherChangeAbAttr {
  private ability: Abilities;

  constructor(ability: Abilities) {
    super(false);

    this.ability = ability;
  }
  applyPostWeatherChange(pokemon: Pokemon, passive: boolean, simulated: boolean, weather: WeatherType, args: any[]): boolean {
    if (pokemon.species.speciesId === Species.CASTFORM && this.ability === Abilities.FORECAST) {
      if (simulated) {
        return simulated;
      }

      const formRevertingWeathers: WeatherType[] = [ WeatherType.NONE, WeatherType.SANDSTORM, WeatherType.STRONG_WINDS, WeatherType.FOG ];
      const weatherType = pokemon.scene.arena.weather?.weatherType;

      if (weatherType && formRevertingWeathers.includes(weatherType)) {
        pokemon.scene.arena.triggerWeatherBasedFormChangesToNormal();
      } else {
        pokemon.scene.arena.triggerWeatherBasedFormChanges();
      }
      return true;
    }
    return false;
  }
}

export class PostWeatherChangeAddBattlerTagAttr extends PostWeatherChangeAbAttr {
  private tagType: BattlerTagType;
  private turnCount: integer;
  private weatherTypes: WeatherType[];

  constructor(tagType: BattlerTagType, turnCount: integer, ...weatherTypes: WeatherType[]) {
    super();

    this.tagType = tagType;
    this.turnCount = turnCount;
    this.weatherTypes = weatherTypes;
  }

  applyPostWeatherChange(pokemon: Pokemon, passive: boolean, simulated: boolean, weather: WeatherType, args: any[]): boolean {
    console.log(this.weatherTypes.find(w => weather === w), WeatherType[weather]);
    if (!this.weatherTypes.find(w => weather === w)) {
      return false;
    }

    if (simulated) {
      return pokemon.canAddTag(this.tagType);
    } else {
    return pokemon.addTag(this.tagType, this.turnCount);
  }
}
}

export class PostWeatherLapseAbAttr extends AbAttr {
  protected weatherTypes: WeatherType[];

  constructor(...weatherTypes: WeatherType[]) {
    super();

    this.weatherTypes = weatherTypes;
  }

  applyPostWeatherLapse(pokemon: Pokemon, passive: boolean, simulated: boolean, weather: Weather | null, args: any[]): boolean | Promise<boolean> {
    return false;
  }

  getCondition(): AbAttrCondition {
    return getWeatherCondition(...this.weatherTypes);
  }
}

export class PostWeatherLapseHealAbAttr extends PostWeatherLapseAbAttr {
  private healFactor: integer;

  constructor(healFactor: integer, ...weatherTypes: WeatherType[]) {
    super(...weatherTypes);

    this.healFactor = healFactor;
  }

  applyPostWeatherLapse(pokemon: Pokemon, passive: boolean, simulated: boolean, weather: Weather, args: any[]): boolean {
    if (!pokemon.isFullHp()) {
      const scene = pokemon.scene;
      const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
      if (!simulated) {
      scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
          Utils.toDmgValue(pokemon.getMaxHp() / (16 / this.healFactor)), i18next.t("abilityTriggers:postWeatherLapseHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName }), true));
      }
      return true;
    }

    return false;
  }
}

export class PostWeatherLapseDamageAbAttr extends PostWeatherLapseAbAttr {
  private damageFactor: integer;

  constructor(damageFactor: integer, ...weatherTypes: WeatherType[]) {
    super(...weatherTypes);

    this.damageFactor = damageFactor;
  }

  applyPostWeatherLapse(pokemon: Pokemon, passive: boolean, simulated: boolean, weather: Weather, args: any[]): boolean {
      const scene = pokemon.scene;
    if (pokemon.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      return false;
    }

    if (!simulated) {
      const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
      scene.queueMessage(i18next.t("abilityTriggers:postWeatherLapseDamage", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName }));
      pokemon.damageAndUpdate(Utils.toDmgValue(pokemon.getMaxHp() / (16 / this.damageFactor)), HitResult.OTHER);
    }

      return true;
    }
}

export class PostTerrainChangeAbAttr extends AbAttr {
  applyPostTerrainChange(pokemon: Pokemon, passive: boolean, simulated: boolean, terrain: TerrainType, args: any[]): boolean {
    return false;
  }
}

export class PostTerrainChangeAddBattlerTagAttr extends PostTerrainChangeAbAttr {
  private tagType: BattlerTagType;
  private turnCount: integer;
  private terrainTypes: TerrainType[];

  constructor(tagType: BattlerTagType, turnCount: integer, ...terrainTypes: TerrainType[]) {
    super();

    this.tagType = tagType;
    this.turnCount = turnCount;
    this.terrainTypes = terrainTypes;
  }

  applyPostTerrainChange(pokemon: Pokemon, passive: boolean, simulated: boolean, terrain: TerrainType, args: any[]): boolean {
    if (!this.terrainTypes.find(t => t === terrain)) {
      return false;
    }

    if (simulated) {
      return pokemon.canAddTag(this.tagType);
    } else {
    return pokemon.addTag(this.tagType, this.turnCount);
  }
}
}

function getTerrainCondition(...terrainTypes: TerrainType[]): AbAttrCondition {
  return (pokemon: Pokemon) => {
    const terrainType = pokemon.scene.arena.terrain?.terrainType;
    return !!terrainType && terrainTypes.indexOf(terrainType) > -1;
  };
}

export class PostTurnAbAttr extends AbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

function isLeviathansDomainRainActive(pokemon: Pokemon): boolean {
  const w = pokemon.scene.arena.weather?.weatherType;
  return w === WeatherType.RAIN || w === WeatherType.HEAVY_RAIN;
}

function isLeviathansDomainWaterOrDragonMove(user: Pokemon, target: Pokemon, move: Move): boolean {
  const moveType = user.getMoveType(move, true, target);
  return moveType === Type.WATER || moveType === Type.DRAGON;
}

export class LeviathansDomainRainOnHitAbAttr extends PostAttackAbAttr {
  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    if (!isLeviathansDomainWaterOrDragonMove(pokemon, defender, move)) {
      return false;
    }
    if (pokemon.scene.arena.weather?.isImmutable()) {
      return false;
    }
    const arena = pokemon.scene.arena;
    if (arena.weather?.weatherType === WeatherType.RAIN) {
      arena.trySetWeather(WeatherType.NONE, true);
    }
    return arena.trySetWeather(WeatherType.RAIN, true);
  }
}

export class LeviathansDomainRainStreakPostTurnAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    if (!isLeviathansDomainRainActive(pokemon)) {
      pokemon.battleSummonData.consecutiveRainTurns = 0;
      return false;
    }
    const current = pokemon.battleSummonData.consecutiveRainTurns ?? 0;
    pokemon.battleSummonData.consecutiveRainTurns = Math.min(current + 1, 5);
    return true;
  }
}

export class LeviathansDomainRainPowerBoostAbAttr extends VariableMovePowerAbAttr {
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const hitsLeft = pokemon.turnData.hitsLeft ?? 1;
    const hitCount = pokemon.turnData.hitCount ?? 1;
    if (hitsLeft !== hitCount) {
      return false;
    }
    if (!isLeviathansDomainRainActive(pokemon)) {
      return false;
    }
    if (!isLeviathansDomainWaterOrDragonMove(pokemon, defender, move)) {
      return false;
    }
    const streak = pokemon.battleSummonData.consecutiveRainTurns ?? 0;
    const bonus = Math.min((streak + 1) * 10, 50);
    if (bonus > 0 && args[0] instanceof Utils.NumberHolder) {
      args[0].value += bonus;
      return true;
    }
    return false;
  }
}

export class PostTurnDamageOpponentsIfStatusAbAttr extends PostTurnAbAttr {
  constructor(private status: StatusEffect, private ratio: number) {
    super(true);
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    let did = false;
    for (const opp of pokemon.getOpponents()) {
      if (opp?.status?.effect === this.status) {
        const damage = Math.max(1, Math.floor(opp.getMaxHp() * this.ratio));
        opp.damageAndUpdate(damage, HitResult.OTHER);
        did = true;
      }
    }
    return did;
  }
}

export class PostTurnSetTypesOnTurnCountAbAttr extends PostTurnAbAttr {
  constructor(private requiredTurnCount: integer, private types: Type[]) {
    super(true);
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.battleSummonData.turnCount !== this.requiredTurnCount) {
      return false;
    }
    if (!simulated) {
      pokemon.summonData.types = [...this.types];
      pokemon.updateInfo();
    }
    return true;
  }
}

export class PostTurnSetTypesIfHpBelowAbAttr extends PostTurnAbAttr {
  constructor(private hpThreshold: number, private types: Type[]) {
    super(true);
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.getHpRatio() > this.hpThreshold) {
      return false;
    }
    if (pokemon.isTerastallized()) {
      return false;
    }
    const currentTypes = pokemon.getTypes();
    if (currentTypes.length === this.types.length && currentTypes.every((t, i) => t === this.types[i])) {
      return false;
    }
    if (!simulated) {
      pokemon.summonData.types = [...this.types];
      pokemon.updateInfo();
    }
    return true;
  }
}
export class PostTurnStatusHealAbAttr extends PostTurnAbAttr {
  private effects: StatusEffect[];
  constructor(...effects: StatusEffect[]) {
    super(false);

    this.effects = effects;
  }
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (pokemon.status && this.effects.includes(pokemon.status.effect)) {
      if (!pokemon.isFullHp()) {
        if (!simulated) {
        const scene = pokemon.scene;
        const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
        scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
            Utils.toDmgValue(pokemon.getMaxHp() / 8), i18next.t("abilityTriggers:poisonHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName }), true));
        }
        return true;
      }
    }
    return false;
  }
}

export class PostTurnRandomTypeChangeAndHealAbAttr extends PostTurnAbAttr {
  constructor(private healFraction: number = 1 / 8) {
    super(true);
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return !pokemon.isFullHp();
    }

    const scene = pokemon.scene;

    const newType = pokemon.randSeedInt(Type.FAIRY + 1) as Type;
    pokemon.summonData.types = [newType];
    pokemon.updateInfo();

    if (!pokemon.isFullHp()) {
      const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
      scene.unshiftPhase(new PokemonHealPhase(
        scene,
        pokemon.getBattlerIndex(),
        Math.max(1, Utils.toDmgValue(pokemon.getMaxHp() * this.healFraction)),
        getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName })),
        true
      ));
    }

    return true;
  }
}
export class PostTurnResetStatusAbAttr extends PostTurnAbAttr {
  private allyTarget: boolean;
  private target: Pokemon;

  constructor(allyTarget: boolean = false) {
    super(true);
    this.allyTarget = allyTarget;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (this.allyTarget) {
      this.target = pokemon.getAlly();
    } else {
      this.target = pokemon;
    }
    if (this.target?.status) {
      if (!simulated) {
        this.target.scene.queueMessage(getStatusEffectHealText(this.target.status?.effect, getPokemonNameWithAffix(this.target)));
      this.target.resetStatus(false);
      this.target.updateInfo();
      }

      return true;
    }

    return false;
  }
}
export class PostTurnLootAbAttr extends PostTurnAbAttr {

  constructor(

    private itemType: "EATEN_BERRIES" | "HELD_BERRIES",
    private procChance: (pokemon: Pokemon) => number
  ) {
    super();
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const chance = Math.max(Math.min(this.procChance(pokemon), 1), 0);
    if (pokemon.randSeedInt(100) >= chance * 100) {
      return false;
    }

    if (this.itemType === "EATEN_BERRIES") {
      return this.createEatenBerry(pokemon, simulated);
    } else {
      return false;
    }
  }
  createEatenBerry(pokemon: Pokemon, simulated: boolean): boolean {
    const berriesEaten = pokemon.battleData.berriesEaten;

    if (!berriesEaten.length) {
      return false;
    }

    if (simulated) {
      return true;
    }

    const randomIdx = Utils.randSeedInt(berriesEaten.length);
    const chosenBerryType = berriesEaten[randomIdx];
    const chosenBerry = new BerryModifierType(chosenBerryType);
    berriesEaten.splice(randomIdx, 1);

    const berryModifier = pokemon.scene.findModifier(
      (m) => m instanceof BerryModifier && m.pokemonId === pokemon.id && m.berryType === chosenBerryType,
      pokemon.isPlayer()
    ) as BerryModifier | undefined;

    if (!berryModifier) {
      const newBerry = new BerryModifier(chosenBerry, pokemon.id, chosenBerryType, 1);
      if (pokemon.isPlayer()) {
        pokemon.scene.addModifier(newBerry);
      } else {
        pokemon.scene.addEnemyModifier(newBerry);
      }
    } else if (berryModifier.stackCount < berryModifier.getMaxHeldItemCount(pokemon)) {
      berryModifier.stackCount++;
    }

    pokemon.scene.queueMessage(i18next.t("abilityTriggers:postTurnLootCreateEatenBerry", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), berryName: chosenBerry.name }));
    pokemon.scene.updateModifiers(pokemon.isPlayer());

    return true;
  }
}
export class MoodyAbAttr extends PostTurnAbAttr {
  constructor() {
    super(true);
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const selectableStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const increaseStatArray = selectableStats.filter(s => pokemon.summonData.battleStats[s] < 6);
    let decreaseStatArray = selectableStats.filter(s => pokemon.summonData.battleStats[s] > -6);

    if (!simulated && increaseStatArray.length > 0) {
      const increaseStat = increaseStatArray[Utils.randInt(increaseStatArray.length)];
      decreaseStatArray = decreaseStatArray.filter(s => s !== increaseStat);
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [increaseStat], 2));
    }
    if (!simulated && decreaseStatArray.length > 0) {
      const decreaseStat = decreaseStatArray[Utils.randInt(decreaseStatArray.length)];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [decreaseStat], -1));
    }
    return true;
  }
}

export class PostTurnForScienceAbAttr extends PostTurnAbAttr {
  constructor() {
    super(true);
  }

  private applyMoodyLike(target: Pokemon, rngSource: Pokemon, upLevels: integer, downLevels: integer, selfTarget: boolean = true): void {
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const upPool = stats.filter(s => target.summonData.battleStats[s] < 6);
    const downPool = stats.filter(s => target.summonData.battleStats[s] > -6);

    if (upPool.length) {
      const up = upPool[rngSource.randSeedInt(upPool.length)];
      target.scene.unshiftPhase(new StatChangePhase(target.scene, target.getBattlerIndex(), selfTarget, [up], upLevels));

      const filteredDown = downPool.filter(s => s !== up);
      if (filteredDown.length) {
        const down = filteredDown[rngSource.randSeedInt(filteredDown.length)];
        target.scene.unshiftPhase(new StatChangePhase(target.scene, target.getBattlerIndex(), selfTarget, [down], downLevels));
      }
      return;
    }

    if (downPool.length) {
      const down = downPool[rngSource.randSeedInt(downPool.length)];
      target.scene.unshiftPhase(new StatChangePhase(target.scene, target.getBattlerIndex(), selfTarget, [down], downLevels));
    }
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    this.applyMoodyLike(pokemon, pokemon, 2, -1, true);
    const foe = pokemon.getOpponents()[0];
    if (foe) {
      this.applyMoodyLike(foe, pokemon, 1, -1, false);
    }
    return true;
  }
}
export class PostTurnStatChangeAbAttr extends PostTurnAbAttr {
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;
  private condition: PokemonFieldCondition | boolean | number;

  constructor(stats: BattleStat | BattleStat[], levels: integer, selfTarget: boolean = true, condition: PokemonFieldCondition | boolean | number = () => true) {
    super(true);

    this.stats = Array.isArray(stats)
      ? stats
      : [ stats ];
    this.levels = levels;
    this.selfTarget = selfTarget;
    this.condition = condition;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    let conditionMet = true;
    if (typeof this.condition === "function") {
      const opponents = pokemon.getOpponents();
      const opponent = opponents.length > 0 ? opponents[0] : undefined;
      conditionMet = (this.condition as PokemonFieldCondition)(pokemon, opponent);
    } else if (typeof this.condition === "boolean") {
      conditionMet = this.condition;
    } else if (typeof this.condition === "number") {
      conditionMet = !!this.condition;
    }
    if (!conditionMet) {
      return false;
    }
    const opponents = pokemon.getOpponents();
    if (simulated) {
      return this.selfTarget || opponents.length > 0;
    }
    if (this.selfTarget) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, this.stats, this.levels));
      return true;
    }
    if (!opponents.length) {
      return false;
    }
    for (const foe of opponents) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, foe.getBattlerIndex(), false, this.stats, this.levels));
    }
    return true;
  }
}

export class PostTurnWeatherRandomOppStatDropAbAttr extends PostTurnAbAttr {
  private weatherTypes: WeatherType[];

  constructor(...weatherTypes: WeatherType[]) {
    super(true);
    this.weatherTypes = weatherTypes;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const w = pokemon.scene.arena.weather?.weatherType;
    if (!w || !this.weatherTypes.includes(w)) {
      return false;
    }
    const opponents = pokemon.getOpponents();
    if (!opponents.length) {
      return false;
    }
    if (simulated) {
      return true;
    }

    const foe = opponents[pokemon.randSeedInt(opponents.length)];
    const choice = pokemon.randSeedInt(3);
    let stat: BattleStat = BattleStat.SPD;
    if (choice === 1) {
      const def = foe.getBattleStat(Stat.DEF);
      const spDef = foe.getBattleStat(Stat.SPDEF);
      stat = def >= spDef ? BattleStat.DEF : BattleStat.SPDEF;
    } else if (choice === 2) {
      const atk = foe.getBattleStat(Stat.ATK);
      const spAtk = foe.getBattleStat(Stat.SPATK);
      stat = atk >= spAtk ? BattleStat.ATK : BattleStat.SPATK;
    }

    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, foe.getBattlerIndex(), false, [stat], -1));
    return true;
  }
}

export class PostTurnPartyMoveFlagConditionalRandFoeStatDropsAbAttr extends PostTurnAbAttr {
  constructor(
    private moveFlag: MoveFlags,
    private requiredOtherCount: integer,
    private stats: BattleStat[],
    private levels: integer
  ) {
    super(true);
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const foe = pokemon.getOpponents()[0];
    if (!foe) {
      return false;
    }

    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const otherCount = party.filter(p => p !== pokemon && !p.isFainted()
      && p.getMoveset(true).some(m => m?.getMove().hasFlag(this.moveFlag))).length;
    const dropCount = otherCount >= this.requiredOtherCount ? 2 : 1;

    if (simulated) {
      return true;
    }

    const pool = [...this.stats];
    for (let i = 0; i < dropCount && pool.length; i++) {
      const stat = pool.splice(pokemon.randSeedInt(pool.length), 1)[0];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, foe.getBattlerIndex(), false, [stat], this.levels));
    }
    return true;
  }
}

export class PostTurnEnsureOpponentsTormentedAndMirrorRandStatAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const opponents = pokemon.getOpponents();
    if (!opponents.length) {
      return false;
    }
    if (simulated) {
      return true;
    }
    for (const opp of opponents) {
      if (!opp.getTag(BattlerTagType.TORMENT)) {
        opp.addTag(BattlerTagType.TORMENT, 0, Moves.NONE, pokemon.id);
      }
    }

    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const stat = pool[pokemon.randSeedInt(pool.length)];
    const foe = opponents[0];
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, foe.getBattlerIndex(), false, [stat], -1));
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [stat], 1));
    return true;
  }
}

export class PostTurnRandomStatChangesAbAttr extends PostTurnAbAttr {
  private count: number;

  constructor(count: number = 3) {
    super(true);
    this.count = count;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const chosen: BattleStat[] = [];
    for (let i = 0; i < this.count && pool.length > 0; i++) {
      const idx = pokemon.randSeedInt(pool.length);
      chosen.push(pool.splice(idx, 1)[0]);
    }
    for (const stat of chosen) {
      const direction = pokemon.randSeedInt(2) === 0 ? 1 : -1;
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [stat], direction));
    }
    return true;
  }
}

export class PostTurnRandStatFromPoolAbAttr extends PostTurnAbAttr {
  private pool: BattleStat[];
  private levels: integer;

  constructor(pool: BattleStat[], levels: integer = 1) {
    super(true);
    this.pool = pool;
    this.levels = levels;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const chosen = this.pool[pokemon.randSeedInt(this.pool.length)];
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [chosen], this.levels));
    return true;
  }
}

export class PostTurnConsumeRandomBerryStatBoostAbAttr extends PostTurnAbAttr {
  private stat: BattleStat;
  private levels: integer;

  constructor(stat: BattleStat, levels: integer = 1) {
    super(true);
    this.stat = stat;
    this.levels = levels;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const berryModifiers = pokemon.scene.findModifiers(
      (m) => m instanceof BerryModifier && m.pokemonId === pokemon.id
    ) as BerryModifier[];
    if (!berryModifiers.length) {
      return false;
    }
    if (simulated) {
      return true;
    }
    const randomBerry = berryModifiers[pokemon.randSeedInt(berryModifiers.length)];
    randomBerry.stackCount--;
    if (randomBerry.stackCount <= 0) {
      pokemon.scene.removeModifier(randomBerry);
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [this.stat], this.levels));
    return true;
  }
}

export class PostTurnStatThresholdResetAndHealAbAttr extends PostTurnAbAttr {
  private stat: BattleStat;
  private threshold: integer;
  private healRatio: number;

  constructor(stat: BattleStat, threshold: integer, healRatio: number) {
    super(true);
    this.stat = stat;
    this.threshold = threshold;
    this.healRatio = healRatio;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.summonData.battleStats[this.stat] >= this.threshold) {
      if (!simulated) {
        pokemon.summonData.battleStats[this.stat] = 0;
        pokemon.updateInfo();
        const scene = pokemon.scene;
        const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
        scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
          Math.max(Math.floor(pokemon.getMaxHp() * this.healRatio), 1),
          getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHPLittle", { abilityName: abilityName })), true));
      }
      return true;
    }
    return false;
  }
}

export class PostTurnCoinFlipUniqueStatBoostAbAttr extends PostTurnAbAttr {
  private chance: number;
  private count: number;
  private levels: integer;

  constructor(chance: number, count: number, levels: integer = 1) {
    super(true);
    this.chance = chance;
    this.count = count;
    this.levels = levels;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated || !randSeedChance(this.chance)) {
      return false;
    }
    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const chosen: BattleStat[] = [];
    for (let i = 0; i < this.count && pool.length > 0; i++) {
      const idx = pokemon.randSeedInt(pool.length);
      chosen.push(pool.splice(idx, 1)[0]);
    }
    if (chosen.length > 0) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, chosen, this.levels));
    }
    return true;
  }
}

export class PostTurnHealAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!pokemon.isFullHp()) {
      if (!simulated) {
      const scene = pokemon.scene;
      const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
      scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
          Utils.toDmgValue(pokemon.getMaxHp() / 16), i18next.t("abilityTriggers:postTurnHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName }), true));
      }

      return true;
    }

    return false;
  }
}

export class PostTurnHealRatioAbAttr extends PostTurnAbAttr {
  private ratio: number;

  constructor(ratio: number = 1/16) {
    super(true);
    this.ratio = ratio;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!pokemon.isFullHp()) {
      if (!simulated) {
        const scene = pokemon.scene;
        const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
        scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
            Utils.toDmgValue(pokemon.getMaxHp() * this.ratio), i18next.t("abilityTriggers:postTurnHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName }), true));
      }
      return true;
    }
    return false;
  }
}

export class PostTurnChanceHealRatioAbAttr extends PostTurnAbAttr {
  private chance: number;
  private ratio: number;

  constructor(chance: number, ratio: number) {
    super(true);
    this.chance = chance;
    this.ratio = ratio;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated || pokemon.isFullHp() || pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.ratio));
    pokemon.scene.unshiftPhase(new PokemonHealPhase(
      pokemon.scene,
      pokemon.getBattlerIndex(),
      healAmount,
      getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })),
      true
    ));
    return true;
  }
}

export class PostTurnFormChangeAbAttr extends PostTurnAbAttr {
  private formFunc: (p: Pokemon) => integer;

  constructor(formFunc: ((p: Pokemon) => integer)) {
    super(true);

    this.formFunc = formFunc;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const formIndex = this.formFunc(pokemon);
    if (formIndex !== pokemon.formIndex) {
      if (!simulated) {
      pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger, false);
      }

      return true;
    }

    return false;
  }
}
export class PostTurnHurtIfSleepingAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    let hadEffect: boolean = false;
    for (const opp of pokemon.getOpponents()) {
      if ((opp.status?.effect === StatusEffect.SLEEP || opp.hasAbility(Abilities.COMATOSE)) && !opp.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
        if (!simulated) {
          opp.damageAndUpdate(Utils.toDmgValue(opp.getMaxHp() / 8), HitResult.OTHER);
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:badDreams", {pokemonName: getPokemonNameWithAffix(opp)}));
        }
        hadEffect = true;
      }

    }
    return hadEffect;
  }
}

export class PostTurnHurtIfSleepingQuarterAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    let hadEffect: boolean = false;
    for (const opp of pokemon.getOpponents()) {
      if ((opp.status?.effect === StatusEffect.SLEEP || opp.hasAbility(Abilities.COMATOSE)) && !opp.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
        if (!simulated) {
          opp.damageAndUpdate(Utils.toDmgValue(opp.getMaxHp() / 4), HitResult.OTHER);
          pokemon.scene.queueMessage(i18next.t("abilityTriggers:badDreams", { pokemonName: getPokemonNameWithAffix(opp) }));
        }
        hadEffect = true;
      }
    }
    return hadEffect;
  }
}

export class FetchBallAbAttr extends PostTurnAbAttr {
  constructor() {
    super();
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    const lastUsed = pokemon.scene.currentBattle.lastUsedPokeball;
    if (lastUsed !== null && !!pokemon.isPlayer) {
      pokemon.scene.pokeballCounts[lastUsed]++;
      pokemon.scene.currentBattle.lastUsedPokeball = null;
      pokemon.scene.queueMessage(i18next.t("abilityTriggers:fetchBall", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), pokeballName: getPokeballName(lastUsed) }));
      return true;
    }
    return false;
  }
}

export class PostBiomeChangeAbAttr extends AbAttr { }

export class PostBiomeChangeWeatherChangeAbAttr extends PostBiomeChangeAbAttr {
  private weatherType: WeatherType;

  constructor(weatherType: WeatherType) {
    super();

    this.weatherType = weatherType;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (!pokemon.scene.arena.weather?.isImmutable()) {
      if (simulated) {
        return pokemon.scene.arena.weather?.weatherType !== this.weatherType;
      } else {
      return pokemon.scene.arena.trySetWeather(this.weatherType, true);
    }
    }

    return false;
  }
}

export class PostBiomeChangeTerrainChangeAbAttr extends PostBiomeChangeAbAttr {
  private terrainType: TerrainType;

  constructor(terrainType: TerrainType) {
    super();

    this.terrainType = terrainType;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (simulated) {
      return pokemon.scene.arena.terrain?.terrainType !== this.terrainType;
    } else {
    return pokemon.scene.arena.trySetTerrain(this.terrainType, true);
  }
}
}
export class PostMoveUsedAbAttr extends AbAttr {
  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}
export class PostAnyMoveUsedAbAttr extends PostMoveUsedAbAttr {
  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class PostDeferredMoveUsedAbAttr extends PostAnyMoveUsedAbAttr {
  private static _deferredContext: boolean = false;

  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (!PostDeferredMoveUsedAbAttr._deferredContext) {
      return false;
    }
    return this.applyDeferredPostMoveUsed(pokemon, move, source, targets, simulated, args);
  }

  applyDeferredPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }

  static enterDeferredContext(): void {
    PostDeferredMoveUsedAbAttr._deferredContext = true;
  }

  static exitDeferredContext(): void {
    PostDeferredMoveUsedAbAttr._deferredContext = false;
  }
}

export class PostAnyFoeSpecialMoveUsedChanceRandomStatusAbAttr extends PostDeferredMoveUsedAbAttr {
  constructor(private chance: integer = 30) {
    super();
  }

  applyDeferredPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean {
    if (simulated || !source || source === pokemon || source.isPlayer() === pokemon.isPlayer() || source.isFainted()) {
      return false;
    }
    const last = source.getMoveHistory().at(-1);
    const currentTurn = source.scene.currentBattle?.turn;
    if (last && last.turn === currentTurn && last.move === move.moveId && last.result !== MoveResult.SUCCESS) {
      return false;
    }
    const usedMove = move.getMove(source.isPlayer());
    if (usedMove.category !== MoveCategory.SPECIAL || source.status) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    const pool = getNonVolatileStatusEffects();
    const effect = pool[pokemon.randSeedInt(pool.length)];
    return source.trySetStatus(effect, true, pokemon);
  }
}

export class PostAnyFoeStatusMoveUsedChipDamageAbAttr extends PostDeferredMoveUsedAbAttr {
  constructor(private damageRatio: number = 1 / 8) {
    super();
  }

  applyDeferredPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean {
    if (simulated || !source || source === pokemon || source.isPlayer() === pokemon.isPlayer() || source.isFainted()) {
      return false;
    }
    const last = source.getMoveHistory().at(-1);
    const currentTurn = source.scene.currentBattle?.turn;
    if (last && last.turn === currentTurn && last.move === move.moveId && last.result !== MoveResult.SUCCESS) {
      return false;
    }
    const usedMove = move.getMove(source.isPlayer());
    if (usedMove.category !== MoveCategory.STATUS) {
      return false;
    }
    const cancelled = new Utils.BooleanHolder(false);
    applyAbAttrs(BlockNonDirectDamageAbAttr, source, cancelled);
    if (cancelled.value) {
      return false;
    }
    const damage = Utils.toDmgValue(source.getMaxHp() * this.damageRatio);
    source.damageAndUpdate(damage, HitResult.OTHER);
    if (source.turnData) {
      source.turnData.damageTaken += damage;
    }
    return true;
  }
}

export class PostStatusMoveUsedAbAttr extends PostMoveUsedAbAttr {
  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class PostStatusMoveUsedStatChangeAbAttr extends PostStatusMoveUsedAbAttr {
  private stat: BattleStat;
  private levels: integer;
  private triggerOnAnySource: boolean;

  constructor(stat: BattleStat, levels: integer, triggerOnAnySource: boolean = false) {
    super();
    this.stat = stat;
    this.levels = levels;
    this.triggerOnAnySource = triggerOnAnySource;
  }

  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (simulated || (!this.triggerOnAnySource && source !== pokemon) || pokemon.isFainted()) {
      return false;
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [this.stat], this.levels));
    return true;
  }
}

export class PostStatusMoveUsedRandBoostAndDropDistinctAbAttr extends PostStatusMoveUsedAbAttr {
  constructor(private levels: integer = 1) {
    super();
  }

  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean {
    if (simulated || source !== pokemon || pokemon.isFainted()) {
      return false;
    }

    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const up = pool[pokemon.randSeedInt(pool.length)];
    const downPool = pool.filter(s => s !== up);
    const down = downPool[pokemon.randSeedInt(downPool.length)];

    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [up], this.levels));
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [down], -this.levels));
    return true;
  }
}

export class PostStatusMoveUsedHealAbAttr extends PostStatusMoveUsedAbAttr {
  private healRatio: number;
  private triggerOnAnySource: boolean;

  constructor(healRatio: number = 0.125, triggerOnAnySource: boolean = false) {
    super();
    this.healRatio = healRatio;
    this.triggerOnAnySource = triggerOnAnySource;
  }

  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (simulated || (!this.triggerOnAnySource && source !== pokemon) || pokemon.isFainted() || pokemon.isFullHp()) {
      return false;
    }
    const healAmount = Utils.toDmgValue(pokemon.getMaxHp() * this.healRatio);
    pokemon.heal(healAmount);
    pokemon.updateInfo();
    return true;
  }
}
export function triggerMagiciansCoinEffect(
  pokemon: Pokemon,
  stat: BattleStat = BattleStat.SPATK,
  levels: integer = 1,
  healRatio: number = 1 / 8,
): boolean {
  if (pokemon.isFainted()) {
    return false;
  }
  pokemon.battleData.abilityProcsThisBattle = (pokemon.battleData.abilityProcsThisBattle ?? 0) + 1;
  pokemon.turnData.abilityProcsThisTurn = (pokemon.turnData.abilityProcsThisTurn ?? 0) + 1;
  pokemon.turnData.abilityProcThisTurn = true;
  if (pokemon.randSeedInt(2) === 0) {
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [stat], levels));
    return true;
  }
  if (!pokemon.isFullHp()) {
    const healAmount = Utils.toDmgValue(pokemon.getMaxHp() * healRatio);
    pokemon.heal(healAmount);
    pokemon.updateInfo();
    return true;
  }
  return false;
}

export class PostStatusMoveUsedCoinFlipStatOrHealAbAttr extends PostStatusMoveUsedAbAttr {
  private stat: BattleStat;
  private levels: integer;
  private healRatio: number;

  constructor(stat: BattleStat, levels: integer, healRatio: number) {
    super();
    this.stat = stat;
    this.levels = levels;
    this.healRatio = healRatio;
  }

  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (simulated || pokemon.isFainted()) {
      return false;
    }
    return triggerMagiciansCoinEffect(pokemon, this.stat, this.levels, this.healRatio);
  }
}

export class PostMoveStatusMoveStatSwapAbAttr extends PostStatusMoveUsedAbAttr {
  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (simulated || source !== pokemon || pokemon.isFainted()) {
      return false;
    }
    const opponents = pokemon.getOpponents();
    if (!opponents.length) {
      return false;
    }
    const foe = opponents[pokemon.randSeedInt(opponents.length)];
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const idxA = pokemon.randSeedInt(stats.length);
    let idxB = pokemon.randSeedInt(stats.length - 1);
    if (idxB >= idxA) {
      idxB++;
    }
    const temp = foe.summonData.battleStats[stats[idxA]];
    foe.summonData.battleStats[stats[idxA]] = foe.summonData.battleStats[stats[idxB]];
    foe.summonData.battleStats[stats[idxB]] = temp;
    foe.updateInfo();
    return true;
  }
}

export class PostDancingMoveAbAttr extends PostMoveUsedAbAttr {

  applyPostMoveUsed(dancer: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {

    const forbiddenTags = [BattlerTagType.FLYING, BattlerTagType.UNDERWATER,
      BattlerTagType.UNDERGROUND, BattlerTagType.HIDDEN];

    if (source.getBattlerIndex() !== dancer.getBattlerIndex()
        && !dancer.summonData.tags.some(tag => forbiddenTags.includes(tag.tagType))) {
      if (!simulated) {

      if (move.getMove() instanceof AttackMove || move.getMove() instanceof StatusMove) {
        const target = this.getTarget(dancer, source, targets);
        dancer.scene.unshiftPhase(new MovePhase(dancer.scene, dancer, target, move, true));
      } else if (move.getMove() instanceof SelfStatusMove) {

        dancer.scene.unshiftPhase(new MovePhase(dancer.scene, dancer, [dancer.getBattlerIndex()], move, true));
      }
      }
    return true;
  }
    return false;
  }
  getTarget(dancer: Pokemon, source: Pokemon, targets: BattlerIndex[]) : BattlerIndex[] {
    if (dancer.isPlayer()) {
      return source.isPlayer() ? targets : [source.getBattlerIndex()];
    }
    return source.isPlayer() ? [source.getBattlerIndex()] : targets;
  }
}

export class StatChangeMultiplierAbAttr extends AbAttr {
  private multiplier: integer;

  constructor(multiplier: integer) {
    super(true);

    this.multiplier = multiplier;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Utils.IntegerHolder).value *= this.multiplier;

    return true;
  }
}

export class StatChangeCopyAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
    if (!simulated) {
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, (args[0] as BattleStat[]), (args[1] as integer), true, false, false));
    }
    return true;
  }
}

export class BypassBurnDamageReductionAbAttr extends AbAttr {
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;

    return true;
  }
}
export class ReduceBurnDamageAbAttr extends AbAttr {
  constructor(protected multiplier: number) {
    super(false);
  }
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Utils.NumberHolder).value = Utils.toDmgValue((args[0] as Utils.NumberHolder).value * this.multiplier);

    return true;
  }
}

export class DoubleBerryEffectAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Utils.NumberHolder).value *= 2;

    return true;
  }
}

export class PreventBerryUseAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;

    return true;
  }
}
export class HealFromBerryUseAbAttr extends AbAttr {

  private healPercent: number;

  constructor(healPercent: number) {
    super();
    this.healPercent = Math.max(Math.min(healPercent, 1), 0);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, ...args: [Utils.BooleanHolder, any[]]): boolean {
    const { name: abilityName } = passive ? pokemon.getPassiveAbility() : pokemon.getAbility();
    if (!simulated) {
    pokemon.scene.unshiftPhase(
      new PokemonHealPhase(
        pokemon.scene,
        pokemon.getBattlerIndex(),
          Utils.toDmgValue(pokemon.getMaxHp() * this.healPercent),
          i18next.t("abilityTriggers:healFromBerryUse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName }),
        true
      )
    );
    }
    return true;
  }
}

export class RunSuccessAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Utils.IntegerHolder).value = 256;

    return true;
  }
}

type ArenaTrapCondition = (user: Pokemon, target: Pokemon) => boolean;
export class CheckTrappedAbAttr extends AbAttr {
  protected arenaTrapCondition: ArenaTrapCondition;
  constructor(condition: ArenaTrapCondition) {
    super(false);
    this.arenaTrapCondition = condition;
  }

  applyCheckTrapped(pokemon: Pokemon, passive: boolean, simulated: boolean, trapped: Utils.BooleanHolder, otherPokemon: Pokemon, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}
export class ArenaTrapAbAttr extends CheckTrappedAbAttr {

  applyCheckTrapped(pokemon: Pokemon, passive: boolean, simulated: boolean, trapped: Utils.BooleanHolder, otherPokemon: Pokemon, args: any[]): boolean {
    if (this.arenaTrapCondition(pokemon, otherPokemon)) {
      if (otherPokemon.getTypes(true).includes(Type.GHOST) || (otherPokemon.getTypes(true).includes(Type.STELLAR) && otherPokemon.getTypes().includes(Type.GHOST))) {
        trapped.value = false;
        return false;
      } else if (otherPokemon.hasAbility(Abilities.RUN_AWAY)) {
        trapped.value = false;
        return false;
      }
    trapped.value = true;
    return true;
  }
    trapped.value = false;
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:arenaTrap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName });
  }
}

export class FrozenTrapAbAttr extends CheckTrappedAbAttr {
  applyCheckTrapped(pokemon: Pokemon, passive: boolean, simulated: boolean, trapped: Utils.BooleanHolder, otherPokemon: Pokemon, args: any[]): boolean {
    if (otherPokemon?.status?.effect === StatusEffect.FREEZE) {
      trapped.value = true;
      return true;
    }
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return `${getPokemonNameWithAffix(pokemon)}'s ${abilityName} prevented switching!`;
  }
}

export class MaxMultiHitAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Utils.IntegerHolder).value = 0;

    return true;
  }
}

export class PostBattleAbAttr extends AbAttr {
  constructor() {
    super(true);
  }

  applyPostBattle(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    return false;
  }
}
export class PostBattleLootAbAttr extends PostBattleAbAttr {
  private condition: PokemonVictoryCondition | boolean | number;

  constructor(condition: PokemonVictoryCondition | boolean | number = () => true) {
    super();
    this.condition = condition;
  }

  applyPostBattle(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const postBattleLoot = pokemon.scene.currentBattle.postBattleLoot;
    if (!simulated && postBattleLoot.length && victoryConditionMet(this.condition, pokemon)) {
      const randItem = Utils.randSeedItem(postBattleLoot);

      if (pokemon.scene.tryTransferHeldItemModifier(randItem, pokemon, true, 1, true)) {
        postBattleLoot.splice(postBattleLoot.indexOf(randItem), 1);
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:postBattleLoot", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), itemName: randItem.type.name }));
        return true;
      }
    }

    return false;
  }
}

export class PostBattleGenerateRandomBerryAbAttr extends PostBattleAbAttr {
  constructor(private chance: number = 0.5) {
    super();
  }

  applyPostBattle(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }

    if (pokemon.randSeedInt(100) >= this.chance * 100) {
      return false;
    }

    const berryTypes = Utils.getEnumValues(BerryType);
    const rand = pokemon.randSeedInt(12);
    let berryType: BerryType;
    if (rand < 2) {
      berryType = BerryType.SITRUS;
    } else if (rand < 4) {
      berryType = BerryType.LUM;
    } else if (rand < 6) {
      berryType = BerryType.LEPPA;
    } else {

      berryType = berryTypes[pokemon.randSeedInt(berryTypes.length - 3) + 2];
    }

    const type = new BerryModifierType(berryType);
    const existing = pokemon.scene.findModifier(
      (m) => m instanceof BerryModifier && m.pokemonId === pokemon.id && m.berryType === berryType,
      pokemon.isPlayer()
    ) as BerryModifier | undefined;

    if (!existing) {
      const mod = new BerryModifier(type, pokemon.id, berryType, 1);
      if (pokemon.isPlayer()) {
        pokemon.scene.addModifier(mod);
      } else {
        pokemon.scene.addEnemyModifier(mod);
      }
    } else if (existing.stackCount < existing.getMaxHeldItemCount(pokemon)) {
      existing.stackCount++;
    } else {
      return false;
    }

    pokemon.scene.updateModifiers(pokemon.isPlayer());
    pokemon.scene.queueMessage(i18next.t("abilityTriggers:postTurnLootCreateEatenBerry", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      berryName: type.name
    }));
    return true;
  }
}

function hasDirectKoCredit(pokemon: Pokemon): boolean {
  return !!pokemon.turnData?.attacksReceived?.length;
}

export class PostFaintAbAttr extends AbAttr {
  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    return false;
  }
}

export class PostFaintReplacementAbAttr extends AbAttr {
  applyPostFaintReplacement(fainted: Pokemon, passive: boolean, simulated: boolean, replacement: Pokemon, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

export class PostFaintUnsuppressedWeatherFormChangeAbAttr extends PostFaintAbAttr {

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const pokemonToTransform = getPokemonWithWeatherBasedForms(pokemon.scene);

    if (pokemonToTransform.length < 1) {
    return false;
  }

    if (!simulated) {
      pokemon.scene.arena.triggerWeatherBasedFormChanges();
    }

    return true;
  }
}
export class PostFaintClearWeatherAbAttr extends PostFaintAbAttr {
  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const weatherType = pokemon.scene.arena.weather?.weatherType;
    let turnOffWeather = false;
    switch (weatherType) {
    case (WeatherType.HARSH_SUN):
      if (pokemon.hasAbility(Abilities.DESOLATE_LAND)
          && pokemon.scene.getField(true).filter(p => p.hasAbility(Abilities.DESOLATE_LAND)).length === 0) {
        turnOffWeather = true;
      }
      break;
    case (WeatherType.HEAVY_RAIN):
      if (pokemon.hasAbility(Abilities.PRIMORDIAL_SEA)
          && pokemon.scene.getField(true).filter(p => p.hasAbility(Abilities.PRIMORDIAL_SEA)).length === 0) {
        turnOffWeather = true;
      }
      break;
    case (WeatherType.STRONG_WINDS):
      if (pokemon.hasAbility(Abilities.DELTA_STREAM)
          && pokemon.scene.getField(true).filter(p => p.hasAbility(Abilities.DELTA_STREAM)).length === 0) {
        turnOffWeather = true;
      }
      break;
    }

    if (simulated) {
      return turnOffWeather;
    }

    if (turnOffWeather) {
      pokemon.scene.arena.trySetWeather(WeatherType.NONE, false);
      return true;
    }

    return false;
  }
}

export class PostFaintContactDamageAbAttr extends PostFaintAbAttr {
  private damageRatio: integer;

  constructor(damageRatio: integer) {
    super();

    this.damageRatio = damageRatio;
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!hasDirectKoCredit(pokemon)) {
      return false;
    }
    if (move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) {
      const cancelled = new Utils.BooleanHolder(false);
      pokemon.scene.getField(true).map(p => applyAbAttrs(FieldPreventExplosiveMovesAbAttr, p, cancelled, simulated));
      if (cancelled.value || attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
        return false;
      }
      if (!simulated) {
        attacker.damageAndUpdate(Utils.toDmgValue(attacker.getMaxHp() * (1 / this.damageRatio)), HitResult.OTHER);
        attacker.turnData.damageTaken += Utils.toDmgValue(attacker.getMaxHp() * (1 / this.damageRatio));
      }
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postFaintContactDamage", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName });
  }
}
export class PostFaintHPDamageAbAttr extends PostFaintAbAttr {
  constructor() {
    super ();
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const lastAttack = pokemon.turnData?.attacksReceived?.[0];
    if (!lastAttack) {
      return false;
    }
    if (!simulated) {
      attacker.damageAndUpdate(lastAttack.damage, HitResult.OTHER);
      attacker.turnData.damageTaken += lastAttack.damage;
    }
    return true;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postFaintHpDamage", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName });
  }
}

export class RedirectMoveAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.canRedirect(args[0] as Moves)) {
      const target = args[1] as Utils.IntegerHolder;
      const newTarget = pokemon.getBattlerIndex();
      if (target.value !== newTarget) {
        target.value = newTarget;
        return true;
      }
    }

    return false;
  }

  canRedirect(moveId: Moves): boolean {
    const move = allMoves[moveId];
    if (!move) {
      return false;
    }
    return [ MoveTarget.NEAR_OTHER, MoveTarget.OTHER ].includes(move.moveTarget);
  }
}

export class RedirectTypeMoveAbAttr extends RedirectMoveAbAttr {
  public type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  canRedirect(moveId: Moves): boolean {
    const move = allMoves[moveId];
    if (!move) {
      return false;
    }
    return super.canRedirect(moveId) && move.type === this.type;
  }
}

export class BlockRedirectAbAttr extends AbAttr { }

export class ReduceStatusEffectDurationAbAttr extends AbAttr {
  private statusEffect: StatusEffect;

  constructor(statusEffect: StatusEffect) {
    super(true);

    this.statusEffect = statusEffect;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (args[0] === this.statusEffect) {
      (args[1] as Utils.IntegerHolder).value = Utils.toDmgValue((args[1] as Utils.IntegerHolder).value / 2);
      return true;
    }

    return false;
  }
}

export class FlinchEffectAbAttr extends AbAttr {
  constructor() {
    super(true);
  }
}

export class FlinchStatChangeAbAttr extends FlinchEffectAbAttr {
  private stats: BattleStat[];
  private levels: integer;

  constructor(stats: BattleStat | BattleStat[], levels: integer) {
    super();

    this.stats = Array.isArray(stats)
      ? stats
      : [ stats ];
    this.levels = levels;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (!simulated) {
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, this.stats, this.levels));
    }
    return true;
  }
}

export class IncreasePpAbAttr extends AbAttr { }

export class ForceSwitchOutImmunityAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;
    return true;
  }
}

export class ReduceBerryUseThresholdAbAttr extends AbAttr {
  constructor() {
    super();
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const hpRatio = pokemon.getHpRatio();

    if (args[0].value < hpRatio) {
      args[0].value *= 2;
      return args[0].value >= hpRatio;
    }

    return false;
  }
}

export class WeightMultiplierAbAttr extends AbAttr {
  private multiplier: integer;

  constructor(multiplier: integer) {
    super();

    this.multiplier = multiplier;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Utils.NumberHolder).value *= this.multiplier;

    return true;
  }
}

export class SyncEncounterNatureAbAttr extends AbAttr {
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    (args[0] as Pokemon).setNature(pokemon.getNature());

    return true;
  }
}

export class MoveAbilityBypassAbAttr extends AbAttr {
  private moveIgnoreFunc: (pokemon: Pokemon, move: Move) => boolean;

  constructor(moveIgnoreFunc?: (pokemon: Pokemon, move: Move) => boolean) {
    super(false);

    this.moveIgnoreFunc = moveIgnoreFunc || ((pokemon, move) => true);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.moveIgnoreFunc(pokemon, (args[0] as Move))) {
      cancelled.value = true;
      return true;
    }
    return false;
  }
}

export class SuppressFieldAbilitiesAbAttr extends AbAttr {
  constructor(private suppressAllies: boolean = true) {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const ability = (args[0] as Ability);
    const suppressor = (args[1] as Pokemon | undefined);
    if (!this.suppressAllies && suppressor && suppressor.isPlayer() === pokemon.isPlayer()) {
      return false;
    }
    if (!ability.hasAttr(UnsuppressableAbilityAbAttr) && !ability.hasAttr(SuppressFieldAbilitiesAbAttr)) {
      cancelled.value = true;
      return true;
    }
    return false;
  }
}
export class AlwaysHitAbAttr extends AbAttr { }
export class IgnoreProtectOnContactAbAttr extends AbAttr { }
export class PiercingProtectOnContactAbAttr extends AbAttr {
  public damageMultiplier: number;

  constructor(damageMultiplier: number = 0.25) {
    super(false);
    this.damageMultiplier = damageMultiplier;
  }
}

export class UncopiableAbilityAbAttr extends AbAttr {
  constructor() {
    super(false);
  }
}

export class UnsuppressableAbilityAbAttr extends AbAttr {
  constructor() {
    super(false);
  }
}

export class UnswappableAbilityAbAttr extends AbAttr {
  constructor() {
    super(false);
  }
}

export class NoTransformAbilityAbAttr extends AbAttr {
  constructor() {
    super(false);
  }
}

export class NoFusionAbilityAbAttr extends AbAttr {
  constructor() {
    super(false);
  }
}

export class IgnoreTypeImmunityAbAttr extends AbAttr {
  private defenderType: Type;
  private allowedMoveTypes: Type[];

  constructor(defenderType: Type, allowedMoveTypes: Type[]) {
    super(true);
    this.defenderType = defenderType;
    this.allowedMoveTypes = allowedMoveTypes;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.defenderType === (args[1] as Type) && this.allowedMoveTypes.includes(args[0] as Type)) {
      cancelled.value = true;
      return true;
    }
    return false;
  }
}
export class IgnoreTypeStatusEffectImmunityAbAttr extends AbAttr {
  private statusEffect: StatusEffect[];
  private defenderType: Type[];

  constructor(statusEffect: StatusEffect[], defenderType: Type[]) {
    super(true);

    this.statusEffect = statusEffect;
    this.defenderType = defenderType;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.statusEffect.includes(args[0] as StatusEffect) && this.defenderType.includes(args[1] as Type)) {
      cancelled.value = true;
      return true;
    }

    return false;
  }
}
export class MoneyAbAttr extends PostBattleAbAttr {
  constructor() {
    super();
  }
  applyPostBattle(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
    pokemon.scene.currentBattle.moneyScattered += pokemon.scene.getWaveMoneyAmount(0.2);
    }
    return true;
  }
}
export class PostSummonStatChangeOnArenaAbAttr extends PostSummonStatChangeAbAttr {

  private tagType: ArenaTagType;
  constructor(tagType: ArenaTagType) {
    super([BattleStat.ATK], 1, true, false);
    this.tagType = tagType;
  }
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const side = pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

    if (pokemon.scene.arena.getTagOnSide(this.tagType, side)) {
      return super.applyPostSummon(pokemon, passive, simulated, args);
    }
    return false;
  }
}
export class FormBlockDamageAbAttr extends ReceivedMoveDamageMultiplierAbAttr {
  private multiplier: number;
  private tagType: BattlerTagType;
  private recoilDamageFunc: ((pokemon: Pokemon) => number) | undefined;
  private triggerMessageFunc: (pokemon: Pokemon, abilityName: string) => string;

  constructor(condition: PokemonDefendCondition, multiplier: number, tagType: BattlerTagType, triggerMessageFunc: (pokemon: Pokemon, abilityName: string) => string, recoilDamageFunc?: (pokemon: Pokemon) => number) {
    super(condition, multiplier);

    this.multiplier = multiplier;
    this.tagType = tagType;
    this.recoilDamageFunc = recoilDamageFunc;
    this.triggerMessageFunc = triggerMessageFunc;
  }
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (this.condition(pokemon, attacker, move)) {
      if (!simulated) {
      (args[0] as Utils.NumberHolder).value = this.multiplier;
        pokemon.removeTag(this.tagType);
        if (this.recoilDamageFunc) {
          pokemon.damageAndUpdate(this.recoilDamageFunc(pokemon), HitResult.OTHER, false, false, true, true);
        }
      }
      return true;
    }

    return false;
  }
  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return this.triggerMessageFunc(pokemon, abilityName);
  }
}
export class BypassSpeedChanceAbAttr extends AbAttr {
  public chance: integer;
  constructor(chance: integer) {
    super(true);
    this.chance = chance;
  }
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    const bypassSpeed = args[0] as Utils.BooleanHolder;

    if (!bypassSpeed.value && pokemon.randSeedInt(100) < this.chance) {
      const turnCommand =
        pokemon.scene.currentBattle.turnCommands[pokemon.getBattlerIndex()];
      const isCommandFight = turnCommand?.command === Command.FIGHT;
      const move = turnCommand?.move?.move ?allMoves[turnCommand.move.move] : null;
      const isDamageMove = move?.category === MoveCategory.PHYSICAL || move?.category === MoveCategory.SPECIAL;

      if (isCommandFight && isDamageMove) {
        bypassSpeed.value = true;
      return true;
    }
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:quickDraw", {pokemonName: getPokemonNameWithAffix(pokemon)});
  }
}
export class PreventBypassSpeedChanceAbAttr extends AbAttr {
  private condition: ((pokemon: Pokemon, move: Move) => boolean);
  constructor(condition: (pokemon: Pokemon, move: Move) => boolean) {
    super(true);
    this.condition = condition;
    }
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const bypassSpeed = args[0] as Utils.BooleanHolder;
    const canCheckHeldItems = args[1] as Utils.BooleanHolder;

    const turnCommand = pokemon.scene.currentBattle.turnCommands[pokemon.getBattlerIndex()];
    const isCommandFight = turnCommand?.command === Command.FIGHT;
    const move = turnCommand?.move?.move ? allMoves[turnCommand.move.move] : null;
    if (move && this.condition(pokemon, move) && isCommandFight) {
      bypassSpeed.value = false;
      canCheckHeldItems.value = false;
      return false;
    }
    return true;
      }
      }

function isNativeOnlyAbAttr(attr: AbAttr): boolean {
  return attr instanceof PreSwitchOutNativeHealAbAttr;
}

async function applyAbAttrsInternal<TAttr extends AbAttr>(
  attrType: Constructor<TAttr>,
  pokemon: Pokemon | null,
  applyFunc: AbAttrApplyFunc<TAttr>,
  args: any[],
  showAbilityInstant: boolean = false,
  simulated: boolean = false,
  messages: string[] = [],
) {
  const scene = pokemon?.scene || (args[0] instanceof BattleScene ? args[0] : null);
  if (!scene) {
    console.error("Unable to determine BattleScene in applyAbAttrsInternal");
    return;
  }

  const abilitiesToCheck = [
    { ability: pokemon?.getAbility(), passive: false, modifier: null },
    { ability: pokemon?.getPassiveAbility(), passive: true, modifier: null }
  ];
  if(pokemon && pokemon instanceof PlayerPokemon) {
    if (!scene.gameData.tutorialOnboardActive) {
      const partyAbilityModifiers = scene.gameData.getPermaModifiersByType(PermaType.PERMA_PARTY_ABILITY) as PermaPartyAbilityModifier[];
      abilitiesToCheck.push(...partyAbilityModifiers.map(mod => ({ability: mod.ability, passive: true, modifier: mod})));
      const trainerBondModifiers = scene.findModifiers((m: any) => m instanceof TrainerBondAbilityModifier) as TrainerBondAbilityModifier[];
      for (const bond of trainerBondModifiers) {
        if (bond.apply([pokemon])) {
          const bondAbility = allAbilities[bond.ability] as any;
          if (bondAbility) {
            abilitiesToCheck.push({ ability: bondAbility, passive: true, modifier: bond });
          }
        }
      }

      const teraAbilityModifiers = scene.findModifiers((m: any) => m instanceof TeraAbilityModifier) as TeraAbilityModifier[];
      for (const teraAbilityMod of teraAbilityModifiers) {
        if (teraAbilityMod.apply([pokemon])) {
          const teraAbility = allAbilities[teraAbilityMod.abilityId] as any;
          if (teraAbility) {
            abilitiesToCheck.push({ ability: teraAbility, passive: true, modifier: teraAbilityMod });
          }
        }
      }
    }
  }

  for (const { ability, passive, modifier } of abilitiesToCheck) {
    if (!ability || (pokemon && !pokemon.canApplyAbility(modifier ? false : passive, modifier ? ability : undefined))) {
      continue;
    }

    for (const attr of ability.getAttrs(attrType)) {
      const condition = attr.getCondition();
      if (condition) {
        try {
          if (!condition(pokemon)) {
            continue;
          }
        } catch (err) {
          console.error(`[ABILITY ERROR] condition ${ability?.id} ${attr?.constructor?.name}:`, err);
          continue;
        }
      }

      pokemon.partyAbility = ability;
      scene.setPhaseQueueSplice();

      let result: boolean | Promise<boolean> = false;
      try {
        result = applyFunc(attr, passive);
        if (result instanceof Promise) {
          result = await result;
        }
      } catch (err) {
        console.error(`[ABILITY ERROR] ${ability?.id} ${attr?.constructor?.name}:`, err);
        result = false;
      }
      if (result) {
        if (pokemon?.summonData && !pokemon.summonData.abilitiesApplied.includes(ability.id)) {
          pokemon.summonData.abilitiesApplied.push(ability.id);
        }
        if (pokemon?.battleData && !simulated && !pokemon.battleData.abilitiesApplied.includes(ability.id)) {
          pokemon.battleData.abilitiesApplied.push(ability.id);
        }
        if (attr.showAbility && !simulated) {
          if (showAbilityInstant) {
            scene.abilityBar.showAbility(pokemon, passive, ability);
          } else {
            queueShowAbility(pokemon, passive, ability);
          }
        }

        if (pokemon instanceof PlayerPokemon) {
          scene.gameData.permaModifiers
              .findModifiers(m => m instanceof PermaUseAbilityQuestModifier)
              .forEach(questModifier => questModifier.apply([scene, pokemon, ability]));
          scene.findModifiers(m => m instanceof PermaUseAbilityQuestModifier)
              .forEach(questModifier => questModifier.apply([scene, pokemon, ability]));
        }

        let message: string | null = null;
        try {
          message = attr.getTriggerMessage(pokemon, ability.name, args);
        } catch (err) {
          console.error(`[ABILITY ERROR] triggerMessage ${ability?.id} ${attr?.constructor?.name}:`, err);
          message = null;
        }
        if (message) {
          if (!simulated) {
            scene.queueMessage(message);
                  }
                }
        messages.push(message!);
              }
                }
    scene.clearPhaseQueueSplice();
              }

  if (pokemon?.summonData?.ability) {
    const nativeAbility = pokemon.getAbility(true);
    const activeAbility = pokemon.getAbility();

    if (nativeAbility.id !== activeAbility.id && pokemon.canApplyAbility(false, nativeAbility)) {
      for (const attr of nativeAbility.getAttrs(attrType)) {
        if (!isNativeOnlyAbAttr(attr)) {
          continue;
        }
        const condition = attr.getCondition();
        if (condition) {
          try {
            if (!condition(pokemon)) {
              continue;
            }
          } catch (err) {
            console.error(`[ABILITY ERROR] condition native ${nativeAbility?.id} ${attr?.constructor?.name}:`, err);
            continue;
          }
        }

        pokemon.partyAbility = nativeAbility;
        scene.setPhaseQueueSplice();

        let result: boolean | Promise<boolean> = false;
        try {
          result = applyFunc(attr as TAttr, false);
          if (result instanceof Promise) {
            result = await result;
          }
        } catch (err) {
          console.error(`[ABILITY ERROR] native ${nativeAbility?.id} ${attr?.constructor?.name}:`, err);
          result = false;
        }
        if (result) {
          if (pokemon.summonData && !pokemon.summonData.abilitiesApplied.includes(nativeAbility.id)) {
            pokemon.summonData.abilitiesApplied.push(nativeAbility.id);
          }
          if (pokemon.battleData && !simulated && !pokemon.battleData.abilitiesApplied.includes(nativeAbility.id)) {
            pokemon.battleData.abilitiesApplied.push(nativeAbility.id);
          }
          if (attr.showAbility && !simulated) {
            if (showAbilityInstant) {
              scene.abilityBar.showAbility(pokemon, false, nativeAbility);
            } else {
              queueShowAbility(pokemon, false, nativeAbility);
            }
          }

          if (pokemon instanceof PlayerPokemon) {
            scene.gameData.permaModifiers
                .findModifiers(m => m instanceof PermaUseAbilityQuestModifier)
                .forEach(questModifier => questModifier.apply([scene, pokemon, nativeAbility]));
            scene.findModifiers(m => m instanceof PermaUseAbilityQuestModifier)
                .forEach(questModifier => questModifier.apply([scene, pokemon, nativeAbility]));
          }

          let message: string | null = null;
          try {
            message = attr.getTriggerMessage(pokemon, nativeAbility.name, args);
          } catch (err) {
            console.error(`[ABILITY ERROR] triggerMessage native ${nativeAbility?.id} ${attr?.constructor?.name}:`, err);
            message = null;
          }
          if (message) {
            if (!simulated) {
              scene.queueMessage(message);
            }
            messages.push(message);
          }
        }
        scene.clearPhaseQueueSplice();
      }
    }
  }
}

export function applyAbAttrs(attrType: Constructor<AbAttr>, pokemon: Pokemon, cancelled: Utils.BooleanHolder | null, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<AbAttr>(attrType, pokemon, (attr, passive) => attr.apply(pokemon, passive, simulated, cancelled, args), args, false, simulated);
}

export function handleAbilityLost(pokemon: Pokemon, lostAbilityId: Abilities, simulated = false): void {
  const ability = allAbilities[lostAbilityId];
  if (!ability) return;
  for (const attr of ability.getAttrs(OnAbilityLoseAbAttr)) {
    try {
      (attr as OnAbilityLoseAbAttr).applyOnAbilityLose(pokemon, false, simulated, []);
    } catch (err) {
      console.error(`[ABILITY LOSE ERROR] ${lostAbilityId} ${attr?.constructor?.name}:`, err);
    }
  }
}

export function handleAbilityGained(pokemon: Pokemon, simulated = false): void {
  const ability = allAbilities[pokemon.getAbility().id];
  if (!ability) return;
  for (const attr of ability.getAttrs(OnAbilityGainAbAttr)) {
    try {
      (attr as OnAbilityGainAbAttr).applyOnAbilityGain(pokemon, false, simulated, []);
    } catch (err) {
      console.error(`[ABILITY GAIN ERROR] ${pokemon.getAbility().id} ${attr?.constructor?.name}:`, err);
    }
  }
}

export function applyPostBattleInitAbAttrs(attrType: Constructor<PostBattleInitAbAttr>,
  pokemon: Pokemon, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostBattleInitAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostBattleInit(pokemon, passive, simulated, args), args, false, simulated);
}

export function applyPreDefendAbAttrs(attrType: Constructor<PreDefendAbAttr>,
  pokemon: Pokemon, attacker: Pokemon, move: Move | null, cancelled: Utils.BooleanHolder | null, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PreDefendAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args), args, false, simulated);
}

export function applyPostDefendAbAttrs(attrType: Constructor<PostDefendAbAttr>,
  pokemon: Pokemon, attacker: Pokemon, move: Move, hitResult: HitResult | null, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostDefendAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostDefend(pokemon, passive, simulated, attacker, move, hitResult, args), args, false, simulated);
}

export function applyPostMoveUsedAbAttrs(attrType: Constructor<PostMoveUsedAbAttr>,
  pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostMoveUsedAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostMoveUsed(pokemon, move, source, targets, simulated, args), args, false, simulated);
}

export function applyDeferredPostMoveUsedAbAttrs(
  pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean = false, ...args: any[]): Promise<void> {
  PostDeferredMoveUsedAbAttr.enterDeferredContext();
  const promise = applyAbAttrsInternal<PostDeferredMoveUsedAbAttr>(PostDeferredMoveUsedAbAttr, pokemon, (attr, passive) => {
    return attr.applyPostMoveUsed(pokemon, move, source, targets, simulated, args);
  }, args, false, simulated);
  return promise.then(() => {
    PostDeferredMoveUsedAbAttr.exitDeferredContext();
  });
}

export function applyBattleStatMultiplierAbAttrs(attrType: Constructor<BattleStatMultiplierAbAttr>,
  pokemon: Pokemon, battleStat: BattleStat, statValue: Utils.NumberHolder, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<BattleStatMultiplierAbAttr>(attrType, pokemon, (attr, passive) => attr.applyBattleStat(pokemon, passive, simulated, battleStat, statValue, args), args, false, simulated);
}
export function applyFieldBattleStatMultiplierAbAttrs(attrType: Constructor<FieldMultiplyBattleStatAbAttr>,
  pokemon: Pokemon, stat: Stat, statValue: Utils.NumberHolder, checkedPokemon: Pokemon, hasApplied: Utils.BooleanHolder, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<FieldMultiplyBattleStatAbAttr>(attrType, pokemon, (attr, passive) => attr.applyFieldBattleStat(pokemon, passive, simulated, stat, statValue, checkedPokemon, hasApplied, args), args, false, simulated);
}

export function applyPreAttackAbAttrs(attrType: Constructor<PreAttackAbAttr>,
  pokemon: Pokemon, defender: Pokemon | null, move: Move, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PreAttackAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPreAttack(pokemon, passive, simulated, defender, move, args), args, false, simulated);
}

export function applyPostAttackAbAttrs(attrType: Constructor<PostAttackAbAttr>,
  pokemon: Pokemon, defender: Pokemon, move: Move, hitResult: HitResult | null, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostAttackAbAttr>(attrType, pokemon, async (attr, passive) => {
    let result = attr.applyPostAttack(pokemon, passive, simulated, defender, move, hitResult, args);
    if (result instanceof Promise) {
      result = await result;
    }
    if (result && !simulated && pokemon.turnData) {
      pokemon.turnData.abilityProcsThisTurn = (pokemon.turnData.abilityProcsThisTurn ?? 0) + 1;
      pokemon.turnData.abilityProcThisTurn = true;
      if (move instanceof AttackMove && move.hasFlag(MoveFlags.MAKES_CONTACT)) {
        pokemon.turnData.abilityContactProcsThisTurn = (pokemon.turnData.abilityContactProcsThisTurn ?? 0) + 1;
      }
    }
    return result;
  }, args, false, simulated);
}

export function clearAbilityAddedMoveFlags(pokemon: Pokemon, move: Move): void {
  const added = pokemon.turnData?.abilityAddedFlags ?? 0;
  if (!added) {
    return;
  }
  let flag = 1;
  while (flag <= added) {
    if (added & flag) {
      move.abilitySetFlag(flag as MoveFlags, false);
    }
    flag <<= 1;
  }
  if (pokemon.turnData) {
    pokemon.turnData.abilityAddedFlags = 0;
  }
}

export function applyPostKnockOutAbAttrs(attrType: Constructor<PostKnockOutAbAttr>,
  pokemon: Pokemon, knockedOut: Pokemon, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostKnockOutAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostKnockOut(pokemon, passive, simulated, knockedOut, args), args, false, simulated);
}

export function applyPostVictoryAbAttrs(attrType: Constructor<PostVictoryAbAttr>,
  pokemon: Pokemon, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostVictoryAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostVictory(pokemon, passive, simulated, args), args, false, simulated);
}

export function applyPostSummonAbAttrs(attrType: Constructor<PostSummonAbAttr>,
  pokemon: Pokemon, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostSummonAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostSummon(pokemon, passive, simulated, args), args, false, simulated);
}

export function applyPreSwitchOutAbAttrs(attrType: Constructor<PreSwitchOutAbAttr>,
  pokemon: Pokemon, simulated: boolean = false, ...args: any[]): Promise<void> {
  const switchedIn = args.length > 0 ? args[0] : undefined;
  return applyAbAttrsInternal<PreSwitchOutAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPreSwitchOut(pokemon, passive, simulated, args, switchedIn), args, true, simulated);
}

export function applyPreStatChangeAbAttrs(attrType: Constructor<PreStatChangeAbAttr>,
  pokemon: Pokemon | null, stat: BattleStat, cancelled: Utils.BooleanHolder, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PreStatChangeAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPreStatChange(pokemon, passive, simulated, stat, cancelled, args), args, false, simulated);
}

export function applyPostStatChangeAbAttrs(attrType: Constructor<PostStatChangeAbAttr>,
  pokemon: Pokemon, stats: BattleStat[], levels: integer, selfTarget: boolean, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostStatChangeAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostStatChange(pokemon, simulated, stats, levels, selfTarget, args), args, false, simulated);
}

export function applyPreSetStatusAbAttrs(attrType: Constructor<PreSetStatusAbAttr>,
  pokemon: Pokemon, effect: StatusEffect | undefined, cancelled: Utils.BooleanHolder, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PreSetStatusAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPreSetStatus(pokemon, passive, simulated, effect, cancelled, args), args, false, simulated);
}

export function applyPreApplyBattlerTagAbAttrs(attrType: Constructor<PreApplyBattlerTagAbAttr>,
  pokemon: Pokemon, tag: BattlerTag, cancelled: Utils.BooleanHolder, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PreApplyBattlerTagAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPreApplyBattlerTag(pokemon, passive, simulated, tag, cancelled, args), args, false, simulated);
}

export function applyPreWeatherEffectAbAttrs(attrType: Constructor<PreWeatherEffectAbAttr>,
  pokemon: Pokemon, weather: Weather | null, cancelled: Utils.BooleanHolder, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PreWeatherDamageAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPreWeatherEffect(pokemon, passive, simulated, weather, cancelled, args), args, true, simulated);
}

export function applyPostTurnAbAttrs(attrType: Constructor<PostTurnAbAttr>,
  pokemon: Pokemon, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostTurnAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostTurn(pokemon, passive, simulated, args), args, false, simulated);
}

export function applyPostWeatherChangeAbAttrs(attrType: Constructor<PostWeatherChangeAbAttr>,
  pokemon: Pokemon, weather: WeatherType, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostWeatherChangeAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostWeatherChange(pokemon, passive, simulated, weather, args), args, false, simulated);
}

export function applyPostWeatherLapseAbAttrs(attrType: Constructor<PostWeatherLapseAbAttr>,
  pokemon: Pokemon, weather: Weather | null, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostWeatherLapseAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostWeatherLapse(pokemon, passive, simulated, weather, args), args, false, simulated);
}

export function applyPostTerrainChangeAbAttrs(attrType: Constructor<PostTerrainChangeAbAttr>,
  pokemon: Pokemon, terrain: TerrainType, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostTerrainChangeAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostTerrainChange(pokemon, passive, simulated, terrain, args), args, false, simulated);
}

export function applyCheckTrappedAbAttrs(attrType: Constructor<CheckTrappedAbAttr>,
  pokemon: Pokemon, trapped: Utils.BooleanHolder, otherPokemon: Pokemon, messages: string[], simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<CheckTrappedAbAttr>(attrType, pokemon, (attr, passive) => attr.applyCheckTrapped(pokemon, passive, simulated, trapped, otherPokemon, args), args, false, simulated, messages);
}

export function applyPostBattleAbAttrs(attrType: Constructor<PostBattleAbAttr>,
  pokemon: Pokemon, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostBattleAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostBattle(pokemon, passive, simulated, args), args, false, simulated);
}

export function applyPostFaintAbAttrs(attrType: Constructor<PostFaintAbAttr>,
  pokemon: Pokemon, attacker: Pokemon, move: Move, hitResult: HitResult, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<PostFaintAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostFaint(pokemon, passive, simulated, attacker, move, hitResult, args), args, false, simulated);
}

export function applyPostFaintReplacementAbAttrs(
  attrType: Constructor<PostFaintReplacementAbAttr>,
  fainted: Pokemon,
  replacement: Pokemon,
  simulated: boolean = false,
  ...args: any[]
): Promise<void> {
  return applyAbAttrsInternal<PostFaintReplacementAbAttr>(
    attrType,
    fainted,
    (attr, passive) => attr.applyPostFaintReplacement(fainted, passive, simulated, replacement, args),
    args,
    false,
    simulated
  );
}

function canApplyAttr(pokemon: Pokemon, attr: AbAttr): boolean {
  const condition = attr.getCondition();
  return !condition || condition(pokemon);
}

function queueShowAbility(pokemon: Pokemon, passive: boolean, ability?: Ability): void {
  pokemon.scene.unshiftPhase(new ShowAbilityPhase(pokemon.scene, pokemon.id, passive, ability || pokemon.partyAbility));
  pokemon.scene.clearPhaseQueueSplice();
}
function setAbilityRevealed(pokemon: Pokemon): void {
  if (pokemon.battleData) {
    pokemon.battleData.abilityRevealed = true;
  }
}
function getPokemonWithWeatherBasedForms(scene: BattleScene) {
  return scene.getField(true).filter(p =>
      p.hasAbility(Abilities.FORECAST) && p.species.speciesId === Species.CASTFORM
  )
}
export function addTagToPokemonWithAbility(
  pokemon: Pokemon,
  tag: BattlerTagType,
  abilityUser: integer,
  moveId: Moves = Moves.NONE,
  turnCount?: integer
): void {
  const resolvedTurnCount = turnCount === undefined
    ? pokemon.randSeedIntRange(2, 5)
    : turnCount;
  pokemon.addTag(tag, resolvedTurnCount, moveId, abilityUser);
}

function countPartyWithMoveFlag(pokemon: Pokemon, flag: MoveFlags, includeSelf: boolean = true): number {
  const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
  return party.filter(p => (includeSelf || p.id !== pokemon.id) && !p.isFainted()
    && p.getMoveset(true).some(m => m?.getMove().hasFlag(flag))).length;
}

function sumPartyMoveFlagSlots(pokemon: Pokemon, flag: MoveFlags, includeSelf: boolean = true): number {
  const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
  return party
    .filter(p => (includeSelf || p.id !== pokemon.id) && !p.isFainted())
    .reduce((total, p) => {
      return total + p.getMoveset(true).filter(m => m?.getMove().hasFlag(flag)).length;
    }, 0);
}
function partyMagnetGate2Met(pokemon: Pokemon): boolean {
  return countPartyWithMoveFlag(pokemon, MoveFlags.MAGNET_MOVE, false) >= 2;
}
function countPartyWithMoveFlagIncludingFainted(pokemon: Pokemon, flag: MoveFlags): number {
  return pokemon.scene.getParty(pokemon.isPlayer())
    .filter(p => p.getMoveset(true).some(m => m?.getMove().hasFlag(flag))).length;
}

export function defendConditionMet(condition: PokemonDefendCondition | boolean | number, pokemon: Pokemon, attacker: Pokemon, move: Move): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  } else if (typeof condition === 'number') {
    return randSeedChance(condition);
  } else {
    const baseMoveType = move.type;
    const effectiveMoveType = attacker.getMoveType(move, true, pokemon);
    const shouldOverrideType = effectiveMoveType !== baseMoveType;
    try {
      if (shouldOverrideType) {
        move.type = effectiveMoveType;
      }
      return condition(pokemon, attacker, move);
    } finally {
      if (shouldOverrideType) {
        move.type = baseMoveType;
      }
    }
  }
}
export function attackConditionMet(condition: PokemonAttackCondition | boolean | number, user: Pokemon, target: Pokemon, move: Move): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  } else if (typeof condition === 'number') {
    return randSeedChance(condition);
  } else {
    const baseMoveType = move.type;
    const effectiveMoveType = user.getMoveType(move, true, target);
    const shouldOverrideType = effectiveMoveType !== baseMoveType;
    try {
      if (shouldOverrideType) {
        move.type = effectiveMoveType;
      }
      return condition(user, target, move);
    } finally {
      if (shouldOverrideType) {
        move.type = baseMoveType;
      }
    }
  }
}
export function faintConditionMet(condition: PokemonFaintCondition | boolean | number, fainted: Pokemon, attacker: Pokemon | null): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  } else if (typeof condition === 'number') {
    return randSeedChance(condition);
  } else if (attacker != null) {
    return condition(fainted, attacker);
  }
  return false;
}
export function knockoutConditionMet(condition: PokemonKnockoutCondition | boolean | number, knockedOut: Pokemon, attacker: Pokemon): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  } else if (typeof condition === 'number') {
    return randSeedChance(condition);
  } else {
    return condition(knockedOut, attacker);
  }
}
export function fieldConditionMet(condition: PokemonFieldCondition | boolean | number, pokemon: Pokemon, opponent: Pokemon): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  } else if (typeof condition === 'number') {
    return randSeedChance(condition);
  } else {
    return condition(pokemon, opponent);
  }
}
export function victoryConditionMet(condition: PokemonVictoryCondition | boolean | number, pokemon: Pokemon): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  } else if (typeof condition === 'number') {
    return randSeedChance(condition);
  } else {
    return condition(pokemon);
  }
}
export class SharedWeaknessPowerBoostAbAttr extends MovePowerBoostAbAttr {
  private type1: Type;
  private type2: Type;
  private oneSidedSharing: boolean;

  constructor(type1: Type, type2: Type, powerMultiplier: number, oneSidedSharing: boolean = false) {
    super((user, target, move) => this.checkWeakness(user!, target!, move), powerMultiplier);
    this.type1 = type1;
    this.type2 = type2;
    this.oneSidedSharing = oneSidedSharing;
  }

  private checkTypeWeakness(moveType: Type, targetType: Type[]): boolean {
    let productMultiplier = 1;
    for (const defType of targetType) {
    const multiplier = getTypeDamageMultiplier(moveType, defType);
    if (multiplier === 0) {
      return false;
    }
    productMultiplier *= multiplier;
    }
    return productMultiplier >= 2;
  }

  private checkWeakness(user: Pokemon, target: Pokemon, move: Move): boolean {
    const effectiveMoveType = user.getMoveType(move, true, target);
    if (this.oneSidedSharing) {
      return effectiveMoveType === this.type1 && this.checkTypeWeakness(this.type2, target.getTypes(true, true));
    } else {
      return (effectiveMoveType === this.type1 && this.checkTypeWeakness(this.type2, target.getTypes(true, true))) ||
          (effectiveMoveType === this.type2 && this.checkTypeWeakness(this.type1, target.getTypes(true, true)));
    }
  }
}

export class SharedWeaknessOrPartnerBoostAbAttr extends MovePowerBoostAbAttr {
  private moveType: Type;
  private partnerTypes: Type[];

  constructor(moveType: Type, partnerTypes: Type[], powerMultiplier: number) {
    super((user, target, move) => this.checkWeakness(user!, target!, move), powerMultiplier);
    this.moveType = moveType;
    this.partnerTypes = partnerTypes;
  }

  private checkTypeWeakness(checkType: Type, targetTypes: Type[]): boolean {
    let productMultiplier = 1;
    for (const defType of targetTypes) {
      const multiplier = getTypeDamageMultiplier(checkType, defType);
      if (multiplier === 0) {
        return false;
      }
      productMultiplier *= multiplier;
    }
    return productMultiplier >= 2;
  }

  private checkWeakness(user: Pokemon, target: Pokemon, move: Move): boolean {
    const effectiveMoveType = user.getMoveType(move, true, target);
    if (effectiveMoveType !== this.moveType) {
      return false;
    }
    const targetTypes = target.getTypes(true, true);
    return this.partnerTypes.some(pt => this.checkTypeWeakness(pt, targetTypes));
  }
}

export class HpGatedTypeChangeAbAttr extends MoveTypeChangeAbAttr {

  constructor(newType: Type,
              powerMultiplier: number,
              private hpThreshold: number,
              condition?: PokemonAttackCondition
              ) {
    super(newType, powerMultiplier, condition);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (simulated || pokemon.getHpRatio() > this.hpThreshold) {
      return false;
    }
    return super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
  }
}

class TypeImmunityStatsChangeAbAttr extends TypeImmunityAbAttr {
  private stats: BattleStat[];
  private levels: integer;

  constructor(immuneType: Type, stats: BattleStat[], levels: integer, condition?: AbAttrCondition) {
    super(immuneType, condition);

    this.stats = stats;
    this.levels = levels;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated:boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if(simulated) {
      return false;
    }

    const ret = super.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args);

    if (ret) {
      cancelled.value = true;
      const simulated = args.length > 1 && args[1];
      if (!simulated) {
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, this.stats, this.levels));
      }
    }

    return ret;
  }
}

export class OppDownloadAbAttr extends PostSummonAbAttr {
  private enemyAtk: integer;
  private enemySpAtk: integer;
  private enemySpd: integer;
  private enemySpDef: integer;
  private stats: BattleStat[];

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    this.enemyAtk = 0;
    this.enemySpAtk = 0;
    this.enemySpd = 0;
    this.enemySpDef = 0;

    for (const opponent of pokemon.getOpponents()) {
      this.enemyAtk += opponent.stats[BattleStat.ATK];
      this.enemySpAtk += opponent.stats[BattleStat.SPATK];
      this.enemySpd += opponent.stats[BattleStat.SPD];
      this.enemySpDef += opponent.stats[BattleStat.SPDEF];
    }

    const highestStat = Math.max(this.enemyAtk, this.enemySpAtk, this.enemySpd, this.enemySpDef);
    let raiselevel = 1;
    if (highestStat === this.enemyAtk) {
      this.stats = [BattleStat.DEF];
    } else if (highestStat === this.enemySpAtk) {
      this.stats = [BattleStat.SPDEF];
    } else if (highestStat === this.enemySpd) {
      this.stats = [BattleStat.SPD];
      raiselevel = 2;
    } else if (highestStat === this.enemySpDef) {
      this.stats = [BattleStat.SPATK];
    }

    if (!simulated && highestStat > 0) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), false, this.stats, raiselevel));
      return true;
    }

    return false;
  }
}

export class MovePowerNeutralAbAttr extends MovePowerBoostAbAttr {
  constructor(condition: PokemonAttackCondition) {
    super(condition, 1);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const effectiveness = defender.getAttackTypeEffectiveness(move.type, pokemon);
    if (!simulated && effectiveness >= 2 || effectiveness < 1) {
      this.powerMultiplier = 1 / effectiveness;
      if(effectiveness < 1) {
        this.powerMultiplier = 1;
      }
      return super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
    }
    return false;
  }
}

export class ReceivedMoveDamageNeutralAbAttr extends ReceivedMoveDamageMultiplierAbAttr {
  constructor(condition: PokemonDefendCondition) {
    super(condition, 1);
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const effectiveness = pokemon.getAttackTypeEffectiveness(move.type, attacker);
    if (!simulated && effectiveness >= 2) {
      this.damageMultiplier = 1 / effectiveness;
      return super.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args);
    }
    return false;
  }
}

export class NeutralizeIncomingSuperEffectiveAbAttr extends ReceivedMoveDamageMultiplierAbAttr {
  constructor() {
    super((target, user, move) => true, 1);
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const effectiveness = pokemon.getAttackTypeEffectiveness(move.type, attacker);
    if (!simulated && effectiveness !== 1) {
      this.damageMultiplier = 1 / effectiveness;
      return super.applyPreDefend(pokemon, passive, simulated, attacker, move, cancelled, args);
    }
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:neutralizeIncomingEffectiveness", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}
export class AllConsumingAbAttr extends PostDefendAbAttr {
  private damageRatio: number;
  private healFraction: number;

  constructor(damageRatio: number, healFraction: number) {
    super();
    this.damageRatio = damageRatio;
    this.healFraction = healFraction;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) {

      const damage = Math.ceil(attacker.getMaxHp() * this.damageRatio);
      attacker.damageAndUpdate(damage, HitResult.OTHER);
      attacker.turnData.damageTaken += damage;
      if (pokemon.getHpRatio() < 1) {
        const healAmount = Math.max(Math.floor(pokemon.getMaxHp() * this.healFraction), 1);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:toreAttacker", { abilityName: pokemon.getAbility().name })), true));
      }

      return true;
    }

    return false;
  }
}
export class PostAttackApplyTagAbAttr extends PostAttackAbAttr {
  private contactRequired: boolean;
  private chance: PokemonAttackCondition | boolean | number;
  private tags: BattlerTagType[];
  private turnCount: integer;

  constructor(contactRequired: boolean, chance: PokemonAttackCondition | boolean | number = () => true, tags: BattlerTagType[], turnCount: integer) {
    super();
    this.contactRequired = contactRequired;
    this.chance = chance;
    this.tags = tags;
    this.turnCount = turnCount == 1 ? 5 : turnCount;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, target: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated
      && hitResult < HitResult.NO_EFFECT
      && pokemon !== target
      && attackConditionMet(this.chance, pokemon, target, move)
      && (!this.contactRequired || move.checkFlag(MoveFlags.MAKES_CONTACT, pokemon, target))
    ) {
      const selectedTag = this.tags[pokemon.randSeedInt(this.tags.length)];
      if (target.getTag(selectedTag)) {
        return false;
      }
      addTagToPokemonWithAbility(target, selectedTag, pokemon.id, move.id, this.turnCount);
      return true;
    }
    return false;
  }
}
export class PostAttackTypeStatChangeAbAttr extends PostAttackAbAttr {
  private statsReduction: BattleStat[];
  private typeTrigger: Type;
  private chance: number;

  constructor(statsReduction: BattleStat[], typeTrigger: Type, chance: number) {
    super();
    this.statsReduction = statsReduction;
    this.typeTrigger = typeTrigger;
    this.chance = chance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, target: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const effectiveMoveType = pokemon.getMoveType(move, true, target);
    if (!simulated && target != pokemon && (this.typeTrigger == Type.ALL || effectiveMoveType === this.typeTrigger) && Utils.randSeedInt(100, 1) <= this.chance) {
      target.scene.unshiftPhase(new StatChangePhase(target.scene, target.getBattlerIndex(), false, this.statsReduction, -1));
      return true;
    }
    return false;
  }
}

export class PostFaintTagAbAttr extends PostFaintAbAttr {
  private tags: BattlerTagType[];
  private turnCount: integer;
  private condition: PokemonFaintCondition;

  constructor(tags: BattlerTagType | BattlerTagType[], turnCount: integer, condition: PokemonFaintCondition = () => true) {
    super();
    this.tags = Array.isArray(tags) ? tags : [tags];
    this.turnCount = turnCount;
    this.condition = condition;
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!attacker || attacker.id === pokemon.id) {
      return false;
    }
    if (!hasDirectKoCredit(pokemon)) {
      return false;
    }
    if (!simulated && this.condition(pokemon, attacker)) {
      const tag = this.tags[pokemon.randSeedInt(this.tags.length)];
      addTagToPokemonWithAbility(attacker, tag, pokemon.id, move.id, this.turnCount);
      return true;
  }
    return false;
  }
}
export class PostDefendTypeEffectAbAttr extends PostDefendAbAttr {
  constructor() {
    super();
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const moveType = attacker.getMoveType(move, true, pokemon);
    if(simulated) {
      return false;
    }

    switch (moveType) {
    case Type.ELECTRIC:
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.SPD], 1));
      break;
    case Type.GRASS:
      if (pokemon.getHpRatio() < 1) {
        const healAmount = Math.max(Math.floor(pokemon.getMaxHp() / 4), 1);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:ateGrass", { abilityName: pokemon.getAbility().name })), true));
      }
      break;
    case Type.DARK:
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.DEF], 1));
      break;
    case Type.FAIRY:
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.ATK], 1));
      break;
    case Type.PSYCHIC:
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.SPDEF], 1));
      break;
    case Type.ICE:
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.SPATK], 1));
      break;
    default:
      return false;
    }
    return true;
  }
}
export class HpBasedContactStatusEffectAbAttr extends PostDefendAbAttr {
  private highHpChance: number;
  private lowHpChance: number;

  constructor(highHpChance: number, lowHpChance: number) {
    super();
    this.highHpChance = highHpChance;
    this.lowHpChance = lowHpChance;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) {
      const chance = pokemon.getHpRatio() > 0.5 ? this.highHpChance : this.lowHpChance;
      const statusEffect = pokemon.getHpRatio() > 0.5 ? StatusEffect.BURN : StatusEffect.SLEEP;

      if (pokemon.randSeedInt(100) < chance) {
        return attacker.trySetStatus(statusEffect, true);
      }
    }
    return false;
  }
}
export class SturdySpeedDropAbAttr extends PreDefendAbAttr {
  constructor() {
    super();
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const damageHolder = args[0] as Utils.NumberHolder;

    if (pokemon.isFullHp()
        && pokemon.getMaxHp() > 1
        && damageHolder.value >= pokemon.hp) {
      if (simulated) {
        return true;
      }

      damageHolder.value = pokemon.hp - 1;
      cancelled.value = true;

      pokemon.scene.unshiftPhase(new StatChangePhase(attacker.scene, attacker.getBattlerIndex(), false, [BattleStat.SPD], -1));
      return pokemon.addTag(BattlerTagType.STURDY, 1);
    }

    return false;
  }
}
export class PostSummonStatBoostAbAttr extends PostSummonAbAttr {
  private levels: number;

  constructor(levels: number) {
    super();
    this.levels = levels;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if(simulated) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, stats, this.levels));
    return true;
  }
}

export class HealAfterHitAbAttr extends PostDefendAbAttr {
  constructor() {
    super();
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated) {
      const sturdyTag = pokemon.getTag(BattlerTagType.STURDY);
      if (sturdyTag && sturdyTag.turnCount === 1) {
        const healAmount = Math.floor(pokemon.getMaxHp() / 2);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })), true));
        return true;
      }
    }
    return false;
  }
}

export class PostDefendTypeChangePlusAbAttr extends PostDefendTypeChangeAbAttr {
  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const originalTypes = pokemon.getTypes(true);
    if(simulated) {
      return false;
    }
    const effectiveMoveType = attacker.getMoveType(move, true, pokemon);
    if (originalTypes.every(type => type !== effectiveMoveType)) {
        const healAmount = Math.floor(pokemon.getMaxHp() / 8);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })), true));
      }
    return super.applyPostDefend(pokemon, passive, simulated, attacker, move, hitResult, args);
  }
}

export class PostAttackStatChangeAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;

  constructor(condition: PokemonAttackCondition, levels: integer, stats: BattleStat | BattleStat[], selfTarget:boolean = false) {
    super();
    this.condition = condition;
    this.levels = levels;
    this.stats = Array.isArray(stats) ? stats : [stats];
    this.selfTarget = selfTarget;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean | Promise<boolean> {
    if (simulated || hitResult >= HitResult.NO_EFFECT || defender === pokemon) {
      return false;
    }
    if (!this.selfTarget && defender.isFainted()) {
      return false;
    }
    if (attackConditionMet(this.condition, pokemon, defender, move)) {
      const target = this.selfTarget ? pokemon : defender;
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, target.getBattlerIndex(), this.selfTarget, this.stats, this.levels));
      return true;
    }
    return false;
  }
}
export class PreAttackBlowbackRouletteProcAbAttr extends PreAttackAbAttr {
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon | null, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const effType = pokemon.getMoveType(move, true, defender ?? undefined);
    if (![Type.DARK, Type.STEEL].includes(effType)) {
      return false;
    }
    const proc = randSeedChance(30);
    if (!simulated) {
      pokemon.turnData.blowbackRouletteProcThisAttack = proc;
      if (proc) {
        pokemon.turnData.abilityProcsThisTurn = (pokemon.turnData.abilityProcsThisTurn ?? 0) + 1;
        pokemon.turnData.abilityProcThisTurn = true;
      }
    }
    return proc;
  }
}
export class PostAttackBlowbackRouletteStatDropAbAttr extends PostAttackAbAttr {
  private count: number;
  private levels: integer;

  constructor(count: number, levels: integer = -1) {
    super();
    this.count = count;
    this.levels = levels;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult >= HitResult.NO_EFFECT || pokemon === defender) {
      return false;
    }
    const effType = pokemon.getMoveType(move, true, defender);
    if (move.category === MoveCategory.STATUS || ![Type.DARK, Type.STEEL].includes(effType)) {
      return false;
    }
    if (!pokemon.turnData.blowbackRouletteProcThisAttack) {
      return false;
    }
    if (!simulated) {
      pokemon.turnData.blowbackRouletteProcThisAttack = false;
    }
    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const chosen: BattleStat[] = [];
    for (let i = 0; i < this.count && pool.length > 0; i++) {
      const idx = pokemon.randSeedInt(pool.length);
      chosen.push(pool.splice(idx, 1)[0]);
    }
    if (chosen.length > 0) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, defender.getBattlerIndex(), false, chosen, this.levels));
    }
    return chosen.length > 0;
  }
}

export class PostAttackUniqueRandomStatDropAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private count: number;
  private levels: integer;

  constructor(condition: PokemonAttackCondition, count: number, levels: integer = -1) {
    super();
    this.condition = condition;
    this.count = count;
    this.levels = levels;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult >= HitResult.NO_EFFECT || pokemon === defender || !attackConditionMet(this.condition, pokemon, defender, move)) {
      return false;
    }
    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const chosen: BattleStat[] = [];
    for (let i = 0; i < this.count && pool.length > 0; i++) {
      const idx = pokemon.randSeedInt(pool.length);
      chosen.push(pool.splice(idx, 1)[0]);
    }
    if (chosen.length > 0) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, defender.getBattlerIndex(), false, chosen, this.levels));
    }
    return true;
  }
}

export class PostMoveStatChangeAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;

  constructor(condition: PokemonAttackCondition, levels: integer, stats: BattleStat | BattleStat[], selfTarget:boolean = false) {
    super();
    this.condition = condition;
    this.levels = levels;
    this.stats = Array.isArray(stats) ? stats : [stats];
    this.selfTarget = selfTarget;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean | Promise<boolean> {
    if (!simulated && attackConditionMet(this.condition, pokemon, defender, move)) {
      const target = this.selfTarget ? pokemon : defender;
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, target.getBattlerIndex(), this.selfTarget, this.stats, this.levels));
      return true;
    }
    return false;
  }
}

export class PostAttackTypeStatusAndDamageAbAttr extends PostAttackAbAttr {
  private moveType: Type;
  private statusEffect: StatusEffect;
  private chance: number;
  private damageFraction: number;

  constructor(moveType: Type, statusEffect: StatusEffect, chance: number, damageFraction: number) {
    super();
    this.moveType = moveType;
    this.statusEffect = statusEffect;
    this.chance = chance;
    this.damageFraction = damageFraction;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean | Promise<boolean> {
    const effectiveMoveType = pokemon.getMoveType(move, true, defender);
    if (!simulated && defender != pokemon && effectiveMoveType === this.moveType) {
      if (pokemon.randSeedInt(100) < this.chance) {
        defender.trySetStatus(this.statusEffect);
      }
      const additionalDamage = Math.ceil(defender.getMaxHp() * this.damageFraction);
      defender.damageAndUpdate(additionalDamage, HitResult.OTHER);
      return true;
    }
    return false;
  }
}

export class PostDefendSpiritualBondAbAttr extends PostDefendAbAttr {
  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if(!simulated && pokemon != attacker) {
      const damageDealt = pokemon.turnData.damageTaken;
      const damageToAttacker = Math.ceil(damageDealt / 2);
      attacker.damageAndUpdate(damageToAttacker, HitResult.OTHER);
      return true;
    }
    return false;
  }
}

export class PreDefendSurviveAbAttr extends PreDefendAbAttr {
  private survivalChance: number;

  constructor(survivalChance: number) {
    super();
    this.survivalChance = survivalChance;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const damageHolder = args[0] as Utils.NumberHolder;
    if (!simulated && pokemon != attacker && damageHolder.value >= pokemon.hp) {
      if (randSeedChance(this.survivalChance)) {
        damageHolder.value = 1;
        cancelled.value = true;
        this.onSuccess(pokemon, attacker, move, args);
        return true;
      }
    }
    return false;
  }

  protected onSuccess(pokemon: Pokemon, attacker: Pokemon, move: Move, args: any[]): void {

  }
}

export class PreDefendSurviveAndDamageAbAttr extends PreDefendSurviveAbAttr {
  private damageRatio: number;

  constructor(survivalChance: number, damageRatio: number) {
    super(survivalChance);
    this.damageRatio = damageRatio;
  }

  protected onSuccess(pokemon: Pokemon, attacker: Pokemon, move: Move, args: any[]): void {
    const damage = Math.floor(attacker.getMaxHp() * this.damageRatio);
    attacker.damageAndUpdate(damage, HitResult.OTHER);
  }
}

export class BestOfThreeTypeChangeAbAttr extends PreDefendAbAttr {
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const moveType = attacker.getMoveType(move, true, pokemon);
    const allTypes = [Type.NORMAL, Type.FIRE, Type.WATER, Type.ELECTRIC, Type.GRASS, Type.ICE,
      Type.FIGHTING, Type.POISON, Type.GROUND, Type.FLYING, Type.PSYCHIC, Type.BUG,
      Type.ROCK, Type.GHOST, Type.DRAGON, Type.DARK, Type.STEEL, Type.FAIRY];
    let bestType = pokemon.getTypes()[0] || Type.NORMAL;
    let bestMult = getTypeDamageMultiplier(moveType, bestType);
    for (let i = 0; i < 3; i++) {
      const randType = allTypes[pokemon.randSeedInt(allTypes.length)];
      const mult = getTypeDamageMultiplier(moveType, randType);
      if (mult < bestMult) {
        bestMult = mult;
        bestType = randType;
      }
    }
    if (bestType !== (pokemon.getTypes()[0] || Type.NORMAL)) {
      if (!simulated) {
        pokemon.summonData.types = [bestType];
        pokemon.updateInfo();
      }
      return true;
    }
    return false;
  }
}

export class PostAttackDebuffAndRandStatusAbAttr extends PostAttackAbAttr {
  private statusEffects: StatusEffect[];
  private statusChance: number;
  private stat: BattleStat;
  private statReductionChance: number;

  constructor(statusEffects: StatusEffect[], statusChance: number, stat: BattleStat, statReductionChance: number) {
    super();
    this.statusEffects = statusEffects;
    this.statusChance = statusChance;
    this.stat = stat;
    this.statReductionChance = statReductionChance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean | Promise<boolean> {
    if (!simulated && move.hasFlag(MoveFlags.MAKES_CONTACT)) {
      if (pokemon.randSeedInt(100) < this.statusChance) {
        const randomStatus = this.statusEffects[pokemon.randSeedInt(this.statusEffects.length)];
        defender.trySetStatus(randomStatus);
      }
      if (pokemon.randSeedInt(100) < this.statReductionChance) {
        defender.scene.unshiftPhase(new StatChangePhase(defender.scene, defender.getBattlerIndex(), false, [this.stat], -1));
      }
      return true;
    }
    return false;
  }
}

export class PostAttackContactDamageAbAttr extends PostAttackAbAttr {
  private damage: number;

  constructor(damage: number) {
    super();
    this.damage = damage;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && move.checkFlag(MoveFlags.MAKES_CONTACT, pokemon, defender)) {
      defender.damageAndUpdate(this.damage, HitResult.OTHER);
    }
    return true;
  }
}

export class PostDefendStatusDamageAbAttr extends PostDefendAbAttr {
  private statusEffect: StatusEffect;
  private damageRatio: number;

  constructor(statusEffect: StatusEffect, damageRatio: number) {
    super();
    this.statusEffect = statusEffect;
    this.damageRatio = damageRatio;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && pokemon != attacker && attacker.status?.effect === this.statusEffect) {
      const damage = Math.floor(attacker.getMaxHp() * this.damageRatio);
      attacker.damageAndUpdate(damage, HitResult.OTHER);
      return true
    }
    return false;
  }
}

export class PostAttackChanceStatusAbAttr extends PostAttackAbAttr {
  private statusEffects: StatusEffect[];
  private condition: PokemonAttackCondition | boolean | number;
  private selfTarget: boolean;

  constructor(statusEffects: StatusEffect | StatusEffect[], condition: PokemonAttackCondition | boolean | number = () => true, selfTarget: boolean = false) {
    super();
    this.statusEffects = Array.isArray(statusEffects) ? statusEffects : [statusEffects];
    this.condition = condition;
    this.selfTarget = selfTarget;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult >= HitResult.NO_EFFECT || pokemon === defender) {
      return false;
    }
    if (attackConditionMet(this.condition, pokemon, defender, move)) {
      const target = this.selfTarget ? pokemon : defender;
      const statusEffect = this.statusEffects[pokemon.randSeedInt(this.statusEffects.length)];
      return target.trySetStatus(statusEffect, true, pokemon);
    }
    return false;
  }
}

export class PostAttackChanceBurnAndSpeedDropAbAttr extends PostAttackAbAttr {
  constructor(
    private chance: integer,
    private allowedTypes: Type[]
  ) {
    super((user, target, move) => move.category !== MoveCategory.STATUS);
  }

  applyPostAttackAfterMoveTypeCheck(
    pokemon: Pokemon,
    passive: boolean,
    simulated: boolean,
    defender: Pokemon,
    move: Move,
    hitResult: HitResult | null,
    args: any[]
  ): boolean {
    if (simulated || pokemon === defender) {
      return false;
    }
    if (!hitResult || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }
    const effType = pokemon.getMoveType(move, true, defender);
    if (!this.allowedTypes.includes(effType)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    defender.trySetStatus(StatusEffect.BURN, true, pokemon);
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, defender.getBattlerIndex(), false, [BattleStat.SPD], -1));
    return true;
  }
}

export class PostAttackChanceSleepConfuseOrFlinchAbAttr extends PostAttackAbAttr {
  constructor(private chance: number = 10) {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || pokemon === defender) {
      return false;
    }
    if (!hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }

    if (!move.hasFlag(MoveFlags.SOUND_BASED)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    const outcome = pokemon.randSeedInt(3);
    switch (outcome) {
      case 0:
        return defender.trySetStatus(StatusEffect.SLEEP, true, pokemon);
      case 1: {
        const turns = pokemon.randSeedInt(4) + 2;
        return defender.addTag(BattlerTagType.CONFUSED, turns, move.id, pokemon.id);
      }
      case 2:
      default:
        return defender.addTag(BattlerTagType.FLINCHED, 0, move.id, pokemon.id);
    }
  }
}

export class PostAttackChanceSelfBurnAndFireSpinAbAttr extends PostAttackAbAttr {
  constructor(
    private chance: number = 10,
    private turnCount: integer = 5,
  ) {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === defender || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }

    const effectiveType = pokemon.getMoveType(move, true, defender);
    if (effectiveType !== Type.FIRE) {
      return false;
    }

    if (!randSeedChance(this.chance)) {
      return false;
    }

    let didAnything = false;
    if (!pokemon.status) {
      didAnything = pokemon.trySetStatus(StatusEffect.BURN) || didAnything;
    }
    if (!pokemon.getTag(BattlerTagType.FIRE_SPIN)) {
      didAnything = pokemon.addTag(BattlerTagType.FIRE_SPIN, this.turnCount, Moves.FIRE_SPIN, pokemon.id) || didAnything;
    }
    return didAnything;
  }
}

export class PostDefendChanceHealAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition | boolean | number;
  private healRatio: number;
  private selfTarget: boolean;

  constructor(condition: PokemonDefendCondition | boolean | number = () => true, healRatio: number, selfTarget: boolean = true) {
    super();
    this.condition = condition;
    this.healRatio = healRatio;
    this.selfTarget = selfTarget;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean | Promise<boolean> {
    if (!simulated && pokemon != attacker && defendConditionMet(this.condition, pokemon, attacker, move)) {
      const target = this.selfTarget ? pokemon : attacker;
      const healAmount = Math.max(Math.floor(target.getMaxHp() * this.healRatio), 1);
      target.scene.unshiftPhase(new PokemonHealPhase(target.scene, target.getBattlerIndex(), healAmount, `'s ${pokemon.getAbility().name}\nhealed HP!`, true));
      return true;
    }
    return false;
  }
}

export class PostAttackChanceHealAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private healRatio: number;

  constructor(condition: PokemonAttackCondition, healRatio: number) {
    super();
    this.condition = condition;
    this.healRatio = healRatio;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && pokemon != defender && attackConditionMet(this.condition, pokemon, defender, move)) {
      const healAmount = Math.floor(pokemon.getMaxHp() * this.healRatio);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })), true));
      return true;
    }
    return false;
  }
}

export class PreAttackChangeMoveCategoryAbAttr extends PreAttackAbAttr {
    constructor() {
        super(true);
    }

    applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
        if (simulated || pokemon == defender || move.category == MoveCategory.STATUS) {
            return false;
        }

        const def = defender.getBattleStat(Stat.DEF, pokemon, move);
        const spDef = defender.getBattleStat(Stat.SPDEF, pokemon, move);
        const effectiveCategory = def < spDef ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;
        args.push({ effectiveCategory });

        return true;
    }
}

export class PreAttackBoostIfCollectedTypeMatchAbAttr extends PreAttackAbAttr {
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const collectedModifiers = pokemon.scene.findModifiers(m => m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id) as CollectedTypeModifier[];
    if (simulated || collectedModifiers.length === 0 || pokemon == defender) {
      return false;
    }

    let totalBoost = 0;

    collectedModifiers.forEach(mod => {
      defender.getTypes().forEach(defenderType => {
        const typeCount = mod.getTypeCount(defenderType);
        if (typeCount > 0) {
          totalBoost += 0.1 * typeCount;
        }
      });
    });

    if (totalBoost > 0) {
      (args[0] as Utils.NumberHolder).value *= (1 + totalBoost);
      return true;
    }

    return false;
  }
}

export class PostAttackHealIfCollectedTypeMatchAbAttr extends PostAttackAbAttr {
  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const collectedModifiers = pokemon.scene.findModifiers(m => m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id) as CollectedTypeModifier[];
    if (simulated || collectedModifiers.length === 0 || pokemon == defender) {
      return false;
    }
    let matchingTypes = 0;

    collectedModifiers.forEach(mod => {
      defender.getTypes().forEach(defenderType => {
        matchingTypes += mod.getTypeCount(defenderType);
      });
    });

    if (matchingTypes > 0) {
      const healFraction = Math.min(1 / (11 - matchingTypes), 1 / 4);
      const healAmount = Math.floor(pokemon.getMaxHp() * healFraction);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:devouredSoul", { abilityName: pokemon.getAbility().name })), true));
      return true;
    }

    return false;
  }
}

export class PostAttackCollectTypeMatchAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition | boolean | number;

  constructor(condition: PokemonAttackCondition | boolean | number = () => true) {
    super();
    this.condition = condition;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && pokemon !== defender && attackConditionMet(this.condition, pokemon, defender, move)) {
    const randomType = Utils.randItem(defender.getTypes());
    const modifierType = new CollectedTypeModifierType(randomType);
    const newModifier = new CollectedTypeModifier(modifierType, pokemon.id, randomType);
    pokemon.scene.addModifier(newModifier);
    return true;
  }
    return false;
  }
}

export class PostAttackStatChangeIfCollectedTypeMatchAbAttr extends PostAttackAbAttr {
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;

  constructor(stats: BattleStat | BattleStat[], levels: integer, selfTarget: boolean = false) {
    super();
    this.stats = Array.isArray(stats) ? stats : [stats];
    this.levels = levels;
    this.selfTarget = selfTarget;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const collectedModifiers = pokemon.scene.findModifiers(m => m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id) as CollectedTypeModifier[];
    if (simulated || (pokemon !== defender && collectedModifiers.length === 0)) {
      return false;
    }
    let matchingTypes = 0;

    collectedModifiers.forEach(mod => {
      defender.getTypes().forEach(defenderType => {
        matchingTypes += mod.getTypeCount(defenderType);
      });
    });

    if (matchingTypes > 0) {
      const chance = Math.min(matchingTypes * 0.05, 0.5);
      if (randSeedChance(chance * 100)) {
        const target = this.selfTarget ? pokemon : defender;
        target.scene.unshiftPhase(new StatChangePhase(target.scene, target.getBattlerIndex(), this.selfTarget, this.stats, this.levels));
        return true;
      }
    }

    return false;
  }
}

export class PostKnockOutCollectAbAttr extends PostKnockOutAbAttr {
  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean | Promise<boolean> {
    if (simulated) {
      return false;
    }
    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }
    const randomType = Utils.randItem(knockedOut.getTypes());
    if (randomType === undefined || randomType === null) {
      return false;
    }
    const modifierType = new CollectedTypeModifierType(randomType);
    const newModifier = new CollectedTypeModifier(modifierType, pokemon.id, randomType);
    pokemon.scene.addModifier(newModifier);
    return true;
  }
}

export class PostFaintLoseCollectedTypeAbAttr extends PostFaintAbAttr {
  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if(simulated) {
      return false;
    }
    const collectedTypeModifiers = pokemon.scene.findModifiers(m => m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id);
    collectedTypeModifiers.forEach(mod => {
      pokemon.scene.removeModifier(mod);
    });
    return true;
  }
}

export class PostStatChangeSyncHighestStatAbAttr extends StatChangeCopyAbAttr {
    apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
      if(simulated) {
        return false;
      }
      const highestStat = this.getHighestStat(pokemon);
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [highestStat], 1));
      return true;
    }

  private getHighestStat(pokemon: Pokemon): BattleStat {
    const stats = pokemon.stats;
    let highestStat: BattleStat = BattleStat.ATK;
    let maxValue = stats[BattleStat.ATK];

    for (const stat of Object.values(BattleStat)) {
      if (typeof stat === 'number' && stat !== BattleStat.RAND && stats[stat] > maxValue) {
        highestStat = stat;
        maxValue = stats[stat];
      }
    }
    return highestStat;
  }

}

export class PostAttackAbilityGiveOrTagAbAttr extends PostAttackAbAttr {
  private ability: Abilities;
  private abilityChance: integer;
  private tag: BattlerTagType;
  private tagChance: integer;

  constructor(ability: Abilities, abilityChance: integer, tag: BattlerTagType, tagChance: integer) {
    super();
    this.ability = ability;
    this.abilityChance = abilityChance;
    this.tag = tag;
    this.tagChance = tagChance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    let success = false;
    if(!simulated && pokemon != defender) {
      if (!defender.getAbility().hasAttr(UnsuppressableAbilityAbAttr)) {
        if (!defender.getAbility().hasAttr(PostAttackAbilityGiveOrTagAbAttr)) {
          if (Utils.randSeedInt(100) < this.abilityChance) {
            defender.summonData.ability = this.ability;
            success = true;
          }
        }
      }
      else if (defender.getAbility().hasAttr(PostAttackAbilityGiveOrTagAbAttr) && randSeedChance(this.tagChance)) {
        addTagToPokemonWithAbility(defender, this.tag, pokemon.id,  move.id);
        success = true;
      }
    }
    return success;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return getPokemonMessage(pokemon, i18next.t("abilityTriggers:gaveTarget", { abilityName: this.ability }));
  }
}

export class PostKnockOutTypeStatsChangeAbAttr extends PostKnockOutAbAttr {
  private stats: BattleStat[] | ((p: Pokemon) => BattleStat[]);
  private levels: integer;
  private type: Type;

  constructor(type: Type, stats: BattleStat | ((p: Pokemon) => BattleStat) | BattleStat[], levels: integer) {
    super();
    this.type = type;
    if (typeof stats === "function") {
      this.stats = (p: Pokemon) => [stats(p)];
    } else if (Array.isArray(stats)) {
      this.stats = stats;
    } else {
      this.stats = [stats];
    }
    this.levels = levels;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean | Promise<boolean> {
    if (simulated || !knockedOut.getTypes().includes(this.type)) {
      return false;
    }
    const statsToChange = typeof this.stats === "function" ? this.stats(pokemon) : this.stats;
      if (statsToChange.length === 0) {
        return false;
      }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, statsToChange, this.levels));
    return true;
  }
}

export class ReceivedMoveDamageAltDisguiseAbAttr extends ReceivedMoveDamageMultiplierAbAttr {
  protected condition: PokemonDefendCondition;
  protected powerValue: number;
  protected chargedTag: BattlerTagType;

  constructor(condition: PokemonDefendCondition, powerValue: number, chargedTag: BattlerTagType) {
    super(condition, powerValue);
    this.condition = condition;
    this.powerValue = powerValue;
    this.chargedTag = chargedTag;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (!simulated && this.condition(pokemon, attacker, move)) {
      (args[0] as Utils.NumberHolder).value = 1;
      pokemon.findAndRemoveTags(tag => tag.tagType === this.chargedTag);
      return true;
    }
    return false;
  }
}

export class PostAttackTypeStatusAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private statusEffect: StatusEffect;

  constructor(condition: PokemonAttackCondition, statusEffect: StatusEffect) {
    super();
    this.condition = condition;
    this.statusEffect = statusEffect;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && attackConditionMet(this.condition, pokemon, defender, move)) {
      defender.trySetStatus(this.statusEffect);
      return true;
    }
    return false;
  }
}

export class PostDefendDamageAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition;
  private damageRatio: integer;
  private selfTarget: boolean;

  constructor(condition: PokemonDefendCondition, damageRatio: integer, selfTarget: boolean = false) {
    super();
    this.condition = condition;
    this.damageRatio = damageRatio;
    this.selfTarget = selfTarget;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && pokemon != attacker && defendConditionMet(this.condition, pokemon, attacker, move)) {
      const target = this.selfTarget ? pokemon : attacker;
      const damage = Math.ceil(target.getMaxHp() * (1 * this.damageRatio));
      target.damageAndUpdate(damage, HitResult.OTHER);
      target.turnData.damageTaken += damage;
      return true;
    }
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postDefendContactDamage", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}

export class PokemonTypeChangeHealAbAttr extends PokemonTypeChangeAbAttr {
  private healChance: number;
  private healRatio: number;

  constructor(healChance: number, healRatio: number) {
    super();
    this.healChance = healChance;
    this.healRatio = healRatio;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const changedType = super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
    if (!changedType) {
      return false;
    }

    if (!simulated && randSeedChance(this.healChance)) {
      const healAmount = Math.floor(pokemon.getMaxHp() * this.healRatio);
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })), true));
    }

    return true;
  }
}

export class PostTurnHealPlusAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated && pokemon.getHpRatio() < 1) {
      const scene = pokemon.scene;
      const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
      scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
          Math.max(Math.floor(pokemon.getMaxHp() / 8), 1), getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHPLittle", { abilityName: abilityName })), true));
      return true;
    }

    return false;
  }
}

export class MovePowerInverseAbAttr extends MovePowerBoostAbAttr {
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (!simulated && attackConditionMet(this.condition, pokemon, defender, move)) {
      const effectiveness = defender.getAttackTypeEffectiveness(move.type, pokemon);
      let inverseMultiplier: number;
      switch (effectiveness) {
        case 8:
          inverseMultiplier = 0.125;
          break;
        case 4:
          inverseMultiplier = 0.125;
          break;
        case 2:
          inverseMultiplier = 0.25;
          break;
        case 1:
          inverseMultiplier = 0.5;
          break;
        case 0.5:
          inverseMultiplier = 1;
          break;
        case 0.25:
          inverseMultiplier = 2;
          break;
        case 0.125:
          inverseMultiplier = 4;
          break;
        case 0:
          inverseMultiplier = 8;
          break;
        default:
          inverseMultiplier = 1;
          break;
      }
      this.powerMultiplier *= inverseMultiplier;
      return super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
    }
    return false;
  }
}

export class PostVictoryTopStatChangeAbAttr extends PostVictoryAbAttr {
  private levels: integer;
  private condition: PokemonVictoryCondition | boolean | number;

  constructor(levels: integer, condition: PokemonVictoryCondition | boolean | number = () => true) {
    super();
    this.levels = levels;
    this.condition = condition;
  }

  applyPostVictory(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (!simulated && victoryConditionMet(this.condition, pokemon)) {
      const battleStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
      let highestBattleStat = BattleStat.ATK;
      let highestValue = pokemon.getStat(Stat.ATK);
      battleStats.forEach((bs: BattleStat) => {
        const stat = pokemon.getStat(bs + 1 as Stat);
        if (stat > highestValue) {
          highestBattleStat = bs;
          highestValue = stat;
        }
      });
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [highestBattleStat], this.levels));
      return true;
    }
    return false;
  }
}

export class PostKnockoutTopStatChangeAbAttr extends PostKnockOutAbAttr {
  private levels: integer;
  private condition: PokemonKnockoutCondition | boolean | number;

  constructor(levels: integer, condition: PokemonKnockoutCondition | boolean | number = () => true) {
    super();
    this.levels = levels;
    this.condition = condition;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean | Promise<boolean> {
    if (!simulated && knockoutConditionMet(this.condition, pokemon, knockedOut)) {
      const battleStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
      let highestBattleStat = BattleStat.ATK;
      let highestValue = pokemon.getStat(Stat.ATK);
      battleStats.forEach((bs: BattleStat) => {
        const stat = pokemon.getStat(bs + 1 as Stat);
        if (stat > highestValue) {
          highestBattleStat = bs;
          highestValue = stat;
        }
      });
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [highestBattleStat], this.levels));
      return true;
    }
    return false;
  }
}

export class PostVictoryStatsChangeAbAttr extends PostVictoryAbAttr {
  private stats: BattleStat[];
  private levels: integer;

  constructor(levels: integer, ...stats: BattleStat[]) {
    super();
    this.stats = stats;
    this.levels = levels;
  }

  applyPostVictory(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if(simulated) {
      return false;
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, this.stats, this.levels));
    return true;
  }
}

export class PostAttackChanceDamageAbAttr extends PostAttackAbAttr {
  private chance: PokemonAttackCondition | boolean | number;
  private damageRatio: number;

  constructor(damageRatio: number = 1/8, chance: PokemonAttackCondition | boolean | number = () => true) {
    super();
    this.chance = chance;
    this.damageRatio = damageRatio;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && pokemon != defender && attackConditionMet(this.chance, pokemon, defender, move)) {
      defender.damageAndUpdate(Math.floor(defender.getMaxHp() * this.damageRatio), HitResult.OTHER);
      return true;
    }
    return false;
  }
}

export class PostAttackHealAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private healRatio: number;

  constructor(condition: PokemonAttackCondition, healRatio: number) {
    super();
    this.condition = condition;
    this.healRatio = healRatio;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && (pokemon != defender || move.id === Moves.SHELL_SMASH) && attackConditionMet(this.condition, pokemon, defender, move)) {
      const healAmount = Math.floor(pokemon.getMaxHp() * this.healRatio);
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })), true));
      return true;
    }
    return false;
  }
}

export class PostAttackTypeTagAndDamageAbAttr extends PostAttackAbAttr {
  private moveType: Type;
  private statusEffect: BattlerTagType;
  private chance: number;
  private damageFraction: number;

  constructor(moveType: Type, statusEffect: BattlerTagType, chance: number, damageFraction: number) {
    super();
    this.moveType = moveType;
    this.statusEffect = statusEffect;
    this.chance = chance;
    this.damageFraction = damageFraction;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean | Promise<boolean> {
    const effectiveMoveType = pokemon.getMoveType(move, true, defender);
    if (!simulated && effectiveMoveType === this.moveType) {
      if (pokemon.randSeedInt(100) < this.chance) {
        defender.addTag(this.statusEffect);
      }
      const additionalDamage = Math.ceil(defender.getMaxHp() * this.damageFraction);
      defender.damageAndUpdate(additionalDamage, HitResult.OTHER);
      return true;
    }
    return false;
  }
}

export class PostTurnChanceStatusAbAttr extends PostTurnAbAttr {
  private condition: (pokemon: Pokemon) => boolean;
  private statuses: StatusEffect[];
  private selfTarget: boolean;

  constructor(condition: (pokemon: Pokemon) => boolean, statuses: StatusEffect[], selfTarget: boolean = false) {
    super();
    this.condition = condition;
    this.statuses = statuses;
    this.selfTarget = selfTarget;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated && this.condition(pokemon)) {
        const status = this.statuses[pokemon.randSeedInt(this.statuses.length)];
        const target = this.selfTarget ? pokemon : pokemon.getOpponents()[0];
        target.trySetStatus(status, true);
        return true;
    }
    return false;
  }
}

export class PostAttackChanceStatusRemoveAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private selfTarget: boolean;

  constructor(condition: PokemonAttackCondition, selfTarget: boolean) {
    super();
    this.condition = condition;
    this.selfTarget = selfTarget;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && pokemon != defender && attackConditionMet(this.condition, pokemon, defender, move)) {
        const target = this.selfTarget ? pokemon : defender;
        if(target.status != undefined) {
          target.scene.queueMessage(getPokemonMessage(target, getStatusEffectHealText(target.status?.effect, getPokemonNameWithAffix(target))));
          target.resetStatus(false);
          target.updateInfo();
          return true;
        }
    }
    return false;
  }
}

export class PostAttackTagOrStatusAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private tags: BattlerTagType[];
  private tagChance: number;
  private tagTurns: number;
  private statuses: StatusEffect[];
  private statusChance: number;

  constructor(condition: PokemonAttackCondition, tags: BattlerTagType[], tagChance: number, tagTurns: number, statuses: StatusEffect[], statusChance: number) {
    super();
    this.condition = condition;
    this.tags = tags;
    this.tagChance = tagChance;
    this.tagTurns = tagTurns;
    this.statuses = statuses;
    this.statusChance = statusChance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && pokemon != defender && attackConditionMet(this.condition, pokemon, defender, move)) {
      if (randSeedChance(this.tagChance)) {
        const tag = this.tags[pokemon.randSeedInt(this.tags.length)];
        addTagToPokemonWithAbility(defender, tag, pokemon.id, move.id)
      }
      if (randSeedChance(this.statusChance)) {
        const status = this.statuses[pokemon.randSeedInt(this.statuses.length)];
        defender.trySetStatus(status);
      }
      return true;
    }
    return false;
  }
}
export class PostFaintStatChangeAbAttr extends PostFaintAbAttr {
  private stats: BattleStat[];
  private levels: integer;
  private condition: PokemonFaintCondition;

  constructor(stats: BattleStat | BattleStat[], levels: integer, condition: PokemonFaintCondition) {
    super();
    this.stats = Array.isArray(stats) ? stats : [stats];
    this.levels = levels;
    this.condition = condition;
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!hasDirectKoCredit(pokemon)) {
      return false;
    }
    if (!simulated && this.condition(pokemon, attacker)) {
      attacker.scene.unshiftPhase(new StatChangePhase(attacker.scene, attacker.getBattlerIndex(), false, this.stats, this.levels));
      return true;
    }
    return false;
  }
}

export class PostKnockOutHealAbAttr extends PostKnockOutAbAttr {
  private condition: PokemonKnockoutCondition;
  private healRatio: number;

  constructor(condition: PokemonKnockoutCondition, healRatio: number) {
    super();
    this.condition = condition;
    this.healRatio = healRatio;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated:boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (!simulated && this.condition(pokemon, knockedOut)) {
      const healAmount = Math.floor(pokemon.getMaxHp() * this.healRatio);
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })), true));
      return true;
    }
    return false;
  }
}

export class PostTurnHealConditionAbAttr extends PostTurnAbAttr {
  private condition: PokemonFieldCondition;
  private hpRatio: number;
  private selfTarget: boolean;

  constructor(condition: PokemonFieldCondition, hpRatio: number, selfTarget: boolean = true) {
    super(true);
    this.condition = condition;
    this.hpRatio = hpRatio;
    this.selfTarget = selfTarget;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const target = this.selfTarget ? pokemon : pokemon.getOpponents()[0];
    if (!simulated && target.getHpRatio() < 1 && this.condition(pokemon, pokemon.getOpponents()[0])) {
      const scene = target.scene;
      const abilityName = (!passive ? target.getAbility() : target.getPassiveAbility()).name;
      scene.unshiftPhase(new PokemonHealPhase(scene, target.getBattlerIndex(),
          Math.max(Math.floor(target.getMaxHp() * this.hpRatio), 1), getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHPLittle", { abilityName: abilityName })), true));
      return true;
    }

    return false;
  }
}

export class PostSummonStatusEffectAbAttr extends PostSummonAbAttr {
  private condition: PokemonFieldCondition;
  private statusEffects: StatusEffect[];
  private selfTarget: boolean;

  constructor(condition: PokemonFieldCondition, statusEffects: StatusEffect | StatusEffect[], selfTarget: boolean = false) {
    super();
    this.condition = condition;
    this.statusEffects = Array.isArray(statusEffects) ? statusEffects : [statusEffects];
    this.selfTarget = selfTarget;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const target = this.selfTarget ? pokemon : pokemon.getOpponents()[0];
    if (!simulated && this.condition(pokemon, pokemon.getOpponents()[0])) {
      const status = this.statusEffects[pokemon.randSeedInt(this.statusEffects.length)];
      target.trySetStatus(status);
      return true;
    }
    return false;
  }
}

export class PostFaintDamageAbAttr extends PostFaintAbAttr {
  private condition: PokemonFaintCondition;
  private damageRatio: integer;

  constructor(condition: PokemonFaintCondition, damageRatio: integer) {
    super();
    this.condition = condition;
    this.damageRatio = damageRatio;
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!hasDirectKoCredit(pokemon)) {
      return false;
    }
    if (!simulated && this.condition(pokemon, attacker)) {
      attacker.damageAndUpdate(Math.ceil(attacker.getMaxHp() * (1 / this.damageRatio)), HitResult.OTHER);
      attacker.turnData.damageTaken += Math.ceil(attacker.getMaxHp() * (1 / this.damageRatio));
      return true;
    }

    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postDefendContactDamage", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}

export class PreSwitchOutHealConditionAbAttr extends PreSwitchOutAbAttr {
  private condition: PokemonPreSwitchCondition;
  private hpRatio: number;

  constructor(condition: PokemonPreSwitchCondition, hpRatio: number) {
    super();
    this.condition = condition;
    this.hpRatio = hpRatio;
  }

  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const opponents = pokemon.getOpponents();
    const opponent = opponents.length > 0 ? opponents[0] : undefined;
    if (pokemon.getHpRatio() < 1 && this.condition(pokemon, opponent)) {
      if (!simulated) {
        pokemon.heal(Math.floor(pokemon.getMaxHp() * this.hpRatio));
        pokemon.updateInfo();
      }
      return true;
    }
    return false;
  }
}

export class PreSwitchOutNativeHealAbAttr extends PreSwitchOutAbAttr {
  private nativeAbilityId: Abilities;
  private hpRatio: number;

  constructor(nativeAbilityId: Abilities, hpRatio: number) {
    super();
    this.nativeAbilityId = nativeAbilityId;
    this.hpRatio = hpRatio;
  }

  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.getAbility(true).id !== this.nativeAbilityId) {
      return false;
    }
    if (pokemon.getHpRatio() >= 1) {
      return false;
    }
    if (!simulated) {
      pokemon.heal(Math.floor(pokemon.getMaxHp() * this.hpRatio));
      pokemon.updateInfo();
    }
    return true;
  }
}

export class PreSwitchOutHealOutgoingAndIncomingAbAttr extends PreSwitchOutAbAttr {
  constructor(private ratio: number = 0.2) {
    super();
  }

  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[], switchedInPokemon?: Pokemon): boolean {
    if (simulated) {
      return true;
    }

    let healed = false;
    if (pokemon.getHpRatio() < 1) {
      const healOut = Math.max(1, Math.floor(pokemon.getMaxHp() * this.ratio));
      healed = pokemon.heal(healOut) > 0 || healed;
      pokemon.updateInfo();
    }
    if (switchedInPokemon && switchedInPokemon.getHpRatio() < 1) {
      const healIn = Math.max(1, Math.floor(switchedInPokemon.getMaxHp() * this.ratio));
      healed = switchedInPokemon.heal(healIn) > 0 || healed;
      switchedInPokemon.updateInfo();
    }

    return healed;
  }
}

export class PostSummonAbilityGiveAbAttr extends PostSummonAbAttr {
  private condition: PokemonFieldCondition;
  private ability: Abilities;

  constructor(condition: PokemonFieldCondition, ability: Abilities) {
    super();
    this.condition = condition;
    this.ability = ability;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated && this.condition(pokemon, pokemon.getOpponents()[0])) {
      pokemon.getOpponents()[0].summonData.ability = this.ability;
      return true;
    }
    return false;
  }

  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return i18next.t("abilityTriggers:postDefendAbilityGive", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      abilityName
    });
  }
}

export class PostTurnWeatherChangeAbAttr extends PostTurnAbAttr {
  private weatherType: WeatherType;
  private condition: PokemonFieldCondition | boolean | number;

  constructor(weatherType: WeatherType, condition: PokemonFieldCondition | boolean | number = () => true) {
    super();
    this.weatherType = weatherType;
    this.condition = condition;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated && fieldConditionMet(this.condition, pokemon, pokemon.getOpponents()[0])) {
      pokemon.scene.arena.trySetWeather(this.weatherType, true);
      return true;
    }
    return false;
  }
}

export class PostDefendApplyArenaTrapTagsAbAttr extends PostDefendAbAttr {
  private tags: { type: ArenaTagType, chance: number }[];
  private condition: PokemonDefendCondition;

  constructor(tags: { type: ArenaTagType, chance: number }[], condition: PokemonDefendCondition) {
    super();
    this.tags = tags;
    this.condition = condition;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && pokemon != attacker && defendConditionMet(this.condition, pokemon, attacker, move)) {
      const totalChance = this.tags.reduce((sum, tag) => sum + tag.chance, 0);
      const randomValue = pokemon.randSeedInt(totalChance);
      let accumulatedChance = 0;
      for (const tag of this.tags) {
        accumulatedChance += tag.chance;
        if (randomValue < accumulatedChance) {
          pokemon.scene.arena.addTag(tag.type, 0, undefined, pokemon.id, pokemon.isPlayer() ? ArenaTagSide.ENEMY : ArenaTagSide.PLAYER);
          return true;
          }
        }
      }
    return false;
  }
}

export class IncreasePpTwoAbAttr extends AbAttr { }

export class IgnoreTypeResistanceAbAttr extends PreAttackAbAttr {
  private condition?: PokemonAttackCondition;

  constructor(condition?: PokemonAttackCondition) {
    super(false);
    this.condition = condition;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (!this.condition || this.condition(pokemon, defender, move)) {
      if (args[0] instanceof Utils.BooleanHolder) {
        args[0].value = true;
        return true;
      }
    }
    return false;
  }
}

export class MoveFlagChangeAttr extends PreAttackAbAttr {
  constructor(
      private newFlag: MoveFlags,
      private powerMultiplier: number,
      private condition?: PokemonAttackCondition
  ) {
    super(true);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!simulated && (!this.condition || this.condition(pokemon, defender, move))) {
      if (!move.hasFlag(this.newFlag)) {
        move.abilitySetFlag(this.newFlag, true);
        if (pokemon.turnData) {
          pokemon.turnData.abilityAddedFlags = (pokemon.turnData.abilityAddedFlags ?? 0) | this.newFlag;
        }
      }
      if (args[0] && args[0] instanceof Utils.NumberHolder) {
        args[0].value *= this.powerMultiplier;
      }
      return true;
    }

    return false;
  }
}

export class BestTypeChangeAbAttr extends PreAttackAbAttr {
  constructor() {
    super(true);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon | null, move: Move, args: any[]): boolean {
    if (!defender || move.category === MoveCategory.STATUS) {
      return false;
    }
    const defenderTypes = defender.getTypes(true, true);
    const moveTypeHolder = args[0] instanceof Utils.NumberHolder ? (args[0] as Utils.NumberHolder) : null;
    const currentType = (moveTypeHolder ? moveTypeHolder.value : move.type) as Type;
    let bestType = currentType;
    let bestMultiplier = 1;
    for (const type of [Type.NORMAL, Type.FIRE, Type.WATER, Type.ELECTRIC, Type.GRASS, Type.ICE,
      Type.FIGHTING, Type.POISON, Type.GROUND, Type.FLYING, Type.PSYCHIC, Type.BUG,
      Type.ROCK, Type.GHOST, Type.DRAGON, Type.DARK, Type.STEEL, Type.FAIRY]) {
      let mult = 1;
      for (const dt of defenderTypes) {
        mult *= getTypeDamageMultiplier(type, dt);
      }
      if (mult > bestMultiplier) {
        bestMultiplier = mult;
        bestType = type;
      }
    }
    if (bestType !== currentType) {
      if (moveTypeHolder) {
        moveTypeHolder.value = bestType;
      } else {
        move.type = bestType;
      }
      return true;
    }
    return false;
  }
}

export class CandidateRestrictedBestTypeChangeAbAttr extends PreAttackAbAttr {
  private sourceType: Type;
  private candidates: Type[];
  private condition: PokemonAttackCondition;

  constructor(sourceType: Type, candidates: Type[], condition: PokemonAttackCondition = () => true) {
    super(true);
    this.sourceType = sourceType;
    this.candidates = candidates;
    this.condition = condition;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon | null, move: Move, args: any[]): boolean {
    if (!defender || move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!this.condition(pokemon, defender, move)) {
      return false;
    }
    if (this.sourceType === Type.NORMAL && move.type === Type.NORMAL && move.hasAttr(VariableMoveTypeAttr)) {
      return false;
    }
    const moveTypeHolder = args[0] instanceof Utils.NumberHolder ? args[0] as Utils.NumberHolder : null;
    const currentType = (moveTypeHolder ? moveTypeHolder.value : move.type) as Type;
    if (this.sourceType !== Type.UNKNOWN && currentType !== this.sourceType) {
      return false;
    }
    const defenderTypes = defender.getTypes(true, true);
    let bestMult = 0;
    const tied: Type[] = [];

    for (const candidate of this.candidates) {
      let mult = 1;
      for (const dt of defenderTypes) {
        mult *= getTypeDamageMultiplier(candidate, dt);
      }
      if (mult > bestMult) {
        bestMult = mult;
        tied.length = 0;
        tied.push(candidate);
      } else if (mult === bestMult) {
        tied.push(candidate);
      }
    }

    const chosen = tied.length > 0
      ? tied[pokemon.randSeedInt(tied.length)]
      : this.candidates[pokemon.randSeedInt(this.candidates.length)];

    if (moveTypeHolder) {
      moveTypeHolder.value = chosen;
    } else {
      move.type = chosen;
    }
    return true;
  }
}

export class TurnCountTypeChangeAbAttr extends PreAttackAbAttr {
  private typeSequence: Type[];

  constructor(typeSequence: Type[]) {
    super(true);
    this.typeSequence = typeSequence;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS || this.typeSequence.length === 0) {
      return false;
    }
    const turnIndex = (pokemon.scene.currentBattle?.turnCount ?? 1) - 1;
    const newType = this.typeSequence[turnIndex % this.typeSequence.length];
    if (newType !== move.type) {
      move.type = newType;
      return true;
    }
    return false;
  }
}

export class PostSummonSubstituteAbAttr extends PostSummonAbAttr {
  private hpRatio: number;

  constructor(hpRatio: number = 0.25) {
    super(true);
    this.hpRatio = hpRatio;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    if (!pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpRatio));
      if (pokemon.hp > hpCost) {
        pokemon.damageAndUpdate(hpCost, HitResult.OTHER);
        pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
        pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` created a substitute!`);
        return true;
      }
    }
    return false;
  }
}

export class PostSummonDisableRandomFoeMoveAbAttr extends PostSummonAbAttr {
  constructor(private disabledTurns: integer = 4) {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const opponents = pokemon.getOpponents();
    if (!opponents.length) {
      return false;
    }
    if (simulated) {
      return opponents.some(foe => foe.getMoveset().filter(m => m && m.moveId !== Moves.NONE).length > 0);
    }
    let triggered = false;
    for (const foe of opponents) {
      const moves = foe.getMoveset()
        .filter(m => m && m.moveId !== Moves.NONE)
        .map(m => m!.moveId);
      if (!moves.length) {
        continue;
      }
      const chosen = moves[pokemon.randSeedInt(moves.length)];
      foe.summonData.disabledMove = chosen;
      foe.summonData.disabledTurns = this.disabledTurns;
      triggered = true;
    }
    return triggered;
  }
}

export class PostDefendSubstituteAbAttr extends PostDefendAbAttr {
  private hpRatio: number;

  constructor(hpRatio: number = 0.25) {
    super(true);
    this.hpRatio = hpRatio;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    if (!pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpRatio));
      if (pokemon.hp > hpCost) {
        pokemon.damageAndUpdate(hpCost, HitResult.OTHER);
        pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
        pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` created a substitute!`);
        return true;
      }
    }
    return false;
  }
}

export class PostDefendMissSubstituteAbAttr extends PostDefendAbAttr {
  private hpRatio: number;
  private chance: integer;

  constructor(hpRatio: number = 0.25, chance: integer = 100) {
    super(true);
    this.hpRatio = hpRatio;
    this.chance = chance;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || hitResult !== HitResult.MISS) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    if (!pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpRatio));
      if (pokemon.hp > hpCost) {
        pokemon.damageAndUpdate(hpCost, HitResult.OTHER);
        pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
        pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` dodged and created a substitute!`);
        return true;
      }
    }
    return false;
  }
}

export class PostDefendMissApplyBattlerTagAbAttr extends PostDefendAbAttr {
  constructor(private tagType: BattlerTagType) {
    super(true);
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || hitResult !== HitResult.MISS || pokemon === attacker) {
      return false;
    }
    if (pokemon.getTag(this.tagType)) {
      return false;
    }
    pokemon.addTag(this.tagType, -1, move.id, pokemon.id);
    pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` became wind charged!`);
    return true;
  }
}

export class PostDefendMissResetEvaAndBoostRandomStatAbAttr extends PostDefendAbAttr {
  constructor() {
    super(true);
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || hitResult !== HitResult.MISS) {
      return false;
    }
    if (pokemon.summonData.battleStats[BattleStat.EVA] <= 1) {
      return false;
    }

    pokemon.summonData.battleStats[BattleStat.EVA] = 0;

    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const stat = pool[pokemon.randSeedInt(pool.length)];
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [stat], 1));
    pokemon.updateInfo();
    return true;
  }
}

export class PostAttackConsumeTagForceSwitchAbAttr extends PostAttackAbAttr {
  constructor(private tagType: BattlerTagType, private allowedTypes: Type[]) {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || pokemon === defender || pokemon.isPlayer() === defender.isPlayer()) {
      return false;
    }
    if (!pokemon.getTag(this.tagType)) {
      return false;
    }
    const effectiveType = pokemon.getMoveType(move, true, defender);
    if (!this.allowedTypes.includes(effectiveType)) {
      return false;
    }

    pokemon.removeTag(this.tagType);
    return new ForceSwitchOutAttr(false, false).apply(pokemon, defender, move, []);
  }
}

export class PostAttackHitChanceForceSwitchAndHealAbAttr extends PostAttackAbAttr {
  private chance: number;
  private healRatio: number;

  constructor(chance: number, healRatio: number, condition: PokemonAttackCondition) {
    super(condition);
    this.chance = chance;
    this.healRatio = healRatio;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || pokemon === defender || pokemon.isPlayer() === defender.isPlayer()) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    return new ForceSwitchOutAttr(false, false).apply(pokemon, defender, move, []).then((switched) => {
      if (!switched) {
        return false;
      }
      const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
        getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHPLittle", { abilityName: pokemon.getAbility().name })), true));
      return true;
    });
  }
}

export class PostDefendSubstituteHpThresholdAbAttr extends PostDefendAbAttr {
  private hpThreshold: number;
  private hpCostRatio: number;

  constructor(hpThreshold: number = 0.5, hpCostRatio: number = 0.25) {
    super(true);
    this.hpThreshold = hpThreshold;
    this.hpCostRatio = hpCostRatio;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    if (pokemon.getHpRatio() <= this.hpThreshold && !pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpCostRatio));
      if (pokemon.hp > hpCost) {
        pokemon.damageAndUpdate(hpCost, HitResult.OTHER);
        pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
        pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` created a substitute in desperation!`);
        return true;
      }
    }
    return false;
  }
}

export class PostDefendSubstituteDamageThresholdAbAttr extends PostDefendAbAttr {
  constructor(private damageRatioThreshold: number = 0.7, private hpCostRatio: number = 0.25) {
    super(true);
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || pokemon.isFainted()) {
      return false;
    }
    if (pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      return false;
    }

    const last = pokemon.turnData.attacksReceived?.[0];
    if (!last || last.damage <= 0) {
      return false;
    }
    if (last.damage < pokemon.getMaxHp() * this.damageRatioThreshold) {
      return false;
    }

    const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpCostRatio));
    if (pokemon.hp <= hpCost) {
      return false;
    }

    pokemon.damageAndUpdate(hpCost, HitResult.OTHER);
    pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
    pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` created a substitute in desperation!`);
    return true;
  }
}

export class PostTurnSubstituteAbAttr extends PostTurnAbAttr {
  private hpRatio: number;
  private chance: integer;

  constructor(hpRatio: number = 0.25, chance: integer = 100) {
    super(true);
    this.hpRatio = hpRatio;
    this.chance = chance;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    if (!pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      if (this.hpRatio <= 0) {
        pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
        pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` created a substitute!`);
        return true;
      }
      const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpRatio));
      if (pokemon.hp > hpCost) {
        pokemon.damageAndUpdate(hpCost, HitResult.OTHER);
        pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
        pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` created a substitute!`);
        return true;
      }
    }
    return false;
  }
}

export class PostDefendStatusMoveSubstituteAbAttr extends PostDefendAbAttr {
  private hpRatio: number;
  private chance: integer;

  constructor(hpRatio: number = 0.25, chance: integer = 100) {
    super(true);
    this.hpRatio = hpRatio;
    this.chance = chance;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || move.category !== MoveCategory.STATUS) {
      return false;
    }
    if (pokemon.isPlayer() === attacker.isPlayer()) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    if (!pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpRatio));
      if (pokemon.hp > hpCost) {
        pokemon.damageAndUpdate(hpCost, HitResult.OTHER);
        pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
        pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` created a substitute!`);
        return true;
      }
    }
    return false;
  }
}

export class PostKnockOutSubstituteAbAttr extends PostKnockOutAbAttr {
  private hpRatio: number;

  constructor(hpRatio: number = 0.25) {
    super();
    this.hpRatio = hpRatio;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    const koSourceId = knockedOut.turnData?.attacksReceived?.[0]?.sourceId;
    if (simulated || pokemon.isPlayer() === knockedOut.isPlayer() || koSourceId !== pokemon.id) {
      return false;
    }
    if (!pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpRatio));
      if (pokemon.hp > hpCost) {
        pokemon.damageAndUpdate(hpCost, HitResult.OTHER);
        pokemon.addTag(BattlerTagType.SUBSTITUTE, -1, undefined, pokemon.id);
        pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` created a substitute!`);
        return true;
      }
    }
    return false;
  }
}

export class PostAttackHealDamageDealtAbAttr extends PostAttackAbAttr {
  private healRatio: number;

  constructor(healRatio: number = 1.0, attackCondition?: PokemonAttackCondition) {
    super(attackCondition);
    this.healRatio = healRatio;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    const damageDealt = pokemon.turnData.currDamageDealt;
    if (damageDealt > 0) {
      const healAmount = Math.max(1, Math.floor(damageDealt * this.healRatio));
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
        getPokemonNameWithAffix(pokemon) + ` drained health!`, true));
      return true;
    }
    return false;
  }
}

export class PostAttackDrainOrSubstituteAtFullHpAbAttr extends PostAttackAbAttr {
  constructor(
    condition: PokemonAttackCondition,
    private drainRatio: number = 0.5,
    private substituteHpRatio: number = 0.25
  ) {
    super(condition);
  }

  applyPostAttackAfterMoveTypeCheck(
    pokemon: Pokemon,
    passive: boolean,
    simulated: boolean,
    defender: Pokemon,
    move: Move,
    hitResult: HitResult | null,
    args: any[]
  ): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || pokemon === defender) {
      return false;
    }

    if (pokemon.isFullHp()) {
      if (pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
        return false;
      }

      const hpCost = Math.max(1, Math.floor(pokemon.getMaxHp() * this.substituteHpRatio));
      if (pokemon.hp <= hpCost) {
        return false;
      }

      pokemon.damageAndUpdate(hpCost, HitResult.OTHER, false, true, true);
      pokemon.addTag(BattlerTagType.SUBSTITUTE, 0, Moves.SUBSTITUTE, pokemon.id);
      return true;
    }

    const damageDealt = pokemon.turnData.currDamageDealt;
    if (damageDealt > 0) {
      const healAmount = Math.max(1, Math.floor(damageDealt * this.drainRatio));
      pokemon.scene.unshiftPhase(new PokemonHealPhase(
        pokemon.scene,
        pokemon.getBattlerIndex(),
        healAmount,
        getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: pokemon.getAbility().name })),
        true
      ));
      return true;
    }

    return false;
  }
}

export class PostAttackHealDamageDealtPerFaintedTypeAbAttr extends PostAttackAbAttr {
  constructor(private moveType: Type, private perFaintedRatio: number, private faintedType: Type) {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }

    const effectiveType = pokemon.getMoveType(move, true, defender);
    if (effectiveType !== this.moveType) {
      return false;
    }

    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const faintedCount = party.filter(p => p.isFainted() && p.getTypes(true).includes(this.faintedType)).length;
    if (faintedCount <= 0) {
      return false;
    }

    const damageDealt = pokemon.turnData.currDamageDealt;
    if (damageDealt <= 0) {
      return false;
    }

    const healAmount = Math.max(1, Math.floor(damageDealt * (this.perFaintedRatio * faintedCount)));
    pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
      getPokemonNameWithAffix(pokemon) + ` drained health!`, true));
    return true;
  }
}

export class PostAttackCureStatusAbAttr extends PostAttackAbAttr {
  private chance: number;

  constructor(chance: number = 100) {
    super();
    this.chance = chance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }

    if (pokemon.turnData.hitsLeft !== 1) {
      return false;
    }
    if (this.chance >= 100 || pokemon.randSeedInt(100) < this.chance) {
      if (pokemon.status) {
        pokemon.resetStatus();
        pokemon.updateInfo();
        return true;
      }
    }
    return false;
  }
}

export class PostAttackCureStatusIfSecondStrikeProcAbAttr extends PostAttackAbAttr {
  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || pokemon.turnData.coinFlipHeads !== true) {
      return false;
    }
    if (!hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (pokemon.turnData.hitsLeft !== 1) {
      return false;
    }
    if (pokemon.status) {
      pokemon.resetStatus();
      pokemon.updateInfo();
      return true;
    }
    return false;
  }
}

export class PostAttackChanceFlinchIfTargetAfflictedAbAttr extends PostAttackAbAttr {
  constructor(private chance: integer = 10) {
    super();
  }

  private targetIsAfflicted(target: Pokemon): boolean {
    if (target.status) {
      return true;
    }
    return [
      BattlerTagType.CONFUSED,
      BattlerTagType.INFATUATED,
      BattlerTagType.CURSED,
      BattlerTagType.DROWSY,
      BattlerTagType.NIGHTMARE,
      BattlerTagType.SEEDED,
      BattlerTagType.SALT_CURED,
      BattlerTagType.TRAPPED,
      BattlerTagType.WRAP,
      BattlerTagType.BIND,
      BattlerTagType.FIRE_SPIN,
      BattlerTagType.WHIRLPOOL,
      BattlerTagType.SAND_TOMB,
      BattlerTagType.MAGMA_STORM,
      BattlerTagType.SNAP_TRAP,
      BattlerTagType.THUNDER_CAGE,
      BattlerTagType.INFESTATION
    ].some(t => !!target.getTag(t));
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    if (pokemon.turnData.hitsLeft !== 1) {
      return false;
    }
    if (!this.targetIsAfflicted(defender)) {
      return false;
    }
    if (move.getAttrs(FlinchAttr).length > 0) {
      return false;
    }
    if (defender.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    return defender.addTag(BattlerTagType.FLINCHED, 0, move.id, pokemon.id);
  }
}

export class PostAttackClearAbilityFlagAttr extends PostAttackAbAttr {
  private flagToClear: MoveFlags;
  private condition?: PokemonAttackCondition;

  constructor(flagToClear: MoveFlags, condition?: PokemonAttackCondition) {
    super(() => true);
    this.flagToClear = flagToClear;
    this.condition = condition;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    const isFinalStrike = pokemon.turnData.hitsLeft === 1 || !defender.isActive();
    if (!isFinalStrike) {
      return false;
    }
    if (this.condition && !this.condition(pokemon, defender, move)) {
      return false;
    }
    if (!((pokemon.turnData?.abilityAddedFlags ?? 0) & this.flagToClear)) {
      return false;
    }
    if (move.hasFlag(this.flagToClear)) {
      move.abilitySetFlag(this.flagToClear, false);
    }
    if (pokemon.turnData) {
      pokemon.turnData.abilityAddedFlags = (pokemon.turnData.abilityAddedFlags ?? 0) & ~this.flagToClear;
    }
    return true;
  }
}

export class PostAttackStatusMoveChipAbAttr extends PostAttackAbAttr {
  private damageRatio: number;

  constructor(damageRatio: number) {
    super();
    this.damageRatio = damageRatio;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || !defender || pokemon === defender || pokemon.isPlayer() === defender.isPlayer()) {
      return false;
    }
    if (move.category !== MoveCategory.STATUS) {
      return false;
    }

    if (hitResult !== HitResult.STATUS) {
      return false;
    }

    const damage = Math.max(1, Math.floor(defender.getMaxHp() * this.damageRatio));
    defender.damageAndUpdate(damage, HitResult.OTHER, false, true, true);
    defender.turnData.damageTaken += damage;
    return true;
  }
}

export class PostAttackSwapFoeStatsAbAttr extends PostAttackAbAttr {
  private stats: BattleStat[];
  private chance: number;

  constructor(stats: BattleStat[], chance: number = 100) {
    super();
    this.stats = stats;
    this.chance = chance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    for (const stat of this.stats) {
      const temp = pokemon.summonData.battleStats[stat];
      pokemon.summonData.battleStats[stat] = defender.summonData.battleStats[stat];
      defender.summonData.battleStats[stat] = temp;
    }
    pokemon.updateInfo();
    defender.updateInfo();
    return true;
  }
}

export class PostAttackSwapFoeStatPairsAbAttr extends PostAttackAbAttr {
  constructor(
    private stat1: BattleStat,
    private stat2: BattleStat,
    private chance: integer = 100,
    private condition: PokemonAttackCondition | boolean | number = () => true
  ) {
    super();
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER;
    if (simulated || !hit) {
      return false;
    }
    if (defender.isFainted()) {
      return false;
    }
    const isFinalStrike = pokemon.turnData.hitsLeft === 1 || !defender.isActive();
    if (!isFinalStrike) {
      return false;
    }
    if (!attackConditionMet(this.condition, pokemon, defender, move)) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    const temp = defender.summonData.battleStats[this.stat1];
    defender.summonData.battleStats[this.stat1] = defender.summonData.battleStats[this.stat2];
    defender.summonData.battleStats[this.stat2] = temp;
    if ((this.stat1 === BattleStat.ATK && this.stat2 === BattleStat.SPATK)
      || (this.stat1 === BattleStat.SPATK && this.stat2 === BattleStat.ATK)) {
      if (temp !== defender.summonData.battleStats[this.stat1]) {
        defender.summonData.atkSpAtkSwapped = !defender.summonData.atkSpAtkSwapped;
      }
    }
    defender.updateInfo();
    return true;
  }
}

export class PostAttackOjamaMagicAbAttr extends PostAttackAbAttr {
  constructor(private chance: integer = 30) {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit) {
      return false;
    }
    if (pokemon.turnData.hitsLeft !== 1) {
      return false;
    }

    const effType = pokemon.getMoveType(move, true, defender);
    if (effType !== Type.NORMAL && !move.hasFlag(MoveFlags.OJAMA_MOVE)) {
      return false;
    }
    if (defender.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr)) {
      return false;
    }

    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    defender.addTag(BattlerTagType.TAUNTED, 3, move.id, pokemon.id);
    defender.addTag(BattlerTagType.TORMENT, 0, move.id, pokemon.id);
    defender.addTag(BattlerTagType.CONFUSED, pokemon.randSeedInt(4) + 2, move.id, pokemon.id);
    return true;
  }
}

export class PostAttackPPDrainAbAttr extends PostAttackAbAttr {
  private ppAmount: number;

  constructor(ppAmount: number = 1) {
    super();
    this.ppAmount = ppAmount;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    const defenderMoves = defender.getMoveset();
    const usableMove = defenderMoves.find(m => m && m.ppUsed < m.getMovePp());
    if (usableMove) {
      usableMove.ppUsed = Math.min(usableMove.ppUsed + this.ppAmount, usableMove.getMovePp());
      return true;
    }
    return false;
  }
}

function getEncoreOrDisableLockedMove(defender: Pokemon): PokemonMove | null {
  const encoreTag = defender.getTag(EncoreTag);
  if (encoreTag?.moveId) {
    return defender.getMoveset().find(m => m && m.moveId === encoreTag.moveId) ?? null;
  }
  if (defender.summonData.disabledTurns > 0 && defender.summonData.disabledMove !== Moves.NONE) {
    return defender.getMoveset().find(m => m && m.moveId === defender.summonData.disabledMove) ?? null;
  }
  return null;
}
export function tryMarkGrimMillerEncoreDisablePpZeroFlinch(defender: Pokemon, source: Pokemon): void {
  if (!source.hasAbility(Abilities.THE_GRIM_MILLER)) {
    return;
  }
  if (!defender.getTag(BattlerTagType.ENCORE) && defender.summonData.disabledTurns <= 0) {
    return;
  }
  const lockedMove = getEncoreOrDisableLockedMove(defender);
  if (!lockedMove || lockedMove.ppUsed < lockedMove.getMovePp()) {
    return;
  }
  defender.summonData.grimMillerFlinchPending = true;
}

export class PostAttackDrainFoeLastMovePPAbAttr extends PostAttackAbAttr {
  constructor(
    private ppAmount: integer,
    private condition: PokemonAttackCondition
  ) {
    super();
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER;
    if (simulated || !hit || pokemon === defender) {
      return false;
    }
    const isFinalStrike = pokemon.turnData.hitsLeft === 1 || !defender.isActive();
    if (!isFinalStrike) {
      return false;
    }
    if (!attackConditionMet(this.condition, pokemon, defender, move)) {
      return false;
    }

    const lastMoves = defender.getLastXMoves(1);
    if (!lastMoves.length || lastMoves[0].move === Moves.NONE) {
      return false;
    }

    const targetMove = defender.getMoveset().find(m => m && m.moveId === lastMoves[0].move);
    if (!targetMove) {
      return false;
    }
    targetMove.ppUsed = Math.min(targetMove.ppUsed + this.ppAmount, targetMove.getMovePp());
    tryMarkGrimMillerEncoreDisablePpZeroFlinch(defender, pokemon);
    return true;
  }
}

export class PostTurnGrimMillerEncoreDisablePpZeroFlinchAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    let applied = false;
    for (const opp of pokemon.getOpponents()) {
      if (!opp.summonData.grimMillerFlinchPending) {
        continue;
      }
      opp.summonData.grimMillerFlinchPending = false;
      opp.addTag(BattlerTagType.FLINCHED, 0, Moves.NONE, pokemon.id);
      applied = true;
    }
    return applied;
  }
}

export class PostAttackClearTerrainStatAndStatusAbAttr extends PostAttackAbAttr {
  constructor() {
    super();
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    if (pokemon.scene.arena.terrain) {
      pokemon.scene.arena.trySetTerrain(TerrainType.NONE, true);
    }
    for (const stat of [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD]) {
      pokemon.summonData.battleStats[stat] = 0;
      defender.summonData.battleStats[stat] = 0;
    }
    pokemon.updateInfo();
    defender.updateInfo();
    if (pokemon.status) {
      pokemon.resetStatus();
      pokemon.updateInfo();
    }
    if (defender.status) {
      defender.resetStatus();
      defender.updateInfo();
    }
    return true;
  }
}

export class PostAttackTerrainClearAndEffectsAbAttr extends PostAttackAbAttr {
  private chance: number;

  constructor(chance: number) {
    super();
    this.chance = chance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult >= HitResult.NO_EFFECT || pokemon === defender) {
      return false;
    }

    if (pokemon.turnData.hitsLeft !== 1) {
      return false;
    }

    if (!pokemon.scene.arena.terrain) {
      return false;
    }
    if (!randSeedChance(this.chance)) {
      return false;
    }

    pokemon.scene.arena.trySetTerrain(TerrainType.NONE, false);
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.SPD], 1));
    defender.trySetStatus(StatusEffect.BURN);
    return true;
  }
}

export class PostAttackForceSwitchAbAttr extends PostAttackAbAttr {
  private chance: number;

  constructor(chance: number = 100, attackCondition: PokemonAttackCondition = () => true) {
    super(attackCondition);
    this.chance = chance;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    if (pokemon === defender || pokemon.isPlayer() === defender.isPlayer()) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    return new ForceSwitchOutAttr(false, false).apply(pokemon, defender, move, []);
  }
}

export class PostAttackHitChanceParalyzeOrFlinchAbAttr extends PostAttackAbAttr {
  private chance: number;

  constructor(chance: number = 30, attackCondition: PokemonAttackCondition = () => true) {
    super(attackCondition);
    this.chance = chance;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || defender.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    if (pokemon.randSeedInt(2) === 0) {
      return defender.trySetStatus(StatusEffect.PARALYSIS, true, pokemon);
    }
    return defender.addTag(BattlerTagType.FLINCHED, undefined, move.id, pokemon.id);
  }
}

export class PostAttackHitChanceDefenderStatChangeAbAttr extends PostAttackAbAttr {
  private chance: number;
  private stats: BattleStat[];
  private levels: integer;

  constructor(chance: number, stats: BattleStat | BattleStat[], levels: integer, attackCondition: PokemonAttackCondition) {
    super(attackCondition);
    this.chance = chance;
    this.stats = Array.isArray(stats) ? stats : [stats];
    this.levels = levels;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || defender.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, defender.getBattlerIndex(), false, this.stats, this.levels));
    return true;
  }
}

export class PostAttackDisableFoeLastMoveAbAttr extends PostAttackAbAttr {
  private chance: number;

  constructor(chance: number = 100, attackCondition: PokemonAttackCondition = (user, target, move) => move.category !== MoveCategory.STATUS) {
    super(attackCondition);
    this.chance = chance;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || pokemon === defender) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    const lastMoves = defender.getLastXMoves(1);
    if (lastMoves.length > 0 && lastMoves[0].move !== Moves.NONE) {
      const disabledMove = allMoves[lastMoves[0].move];
      if (!disabledMove) {
        return false;
      }
      defender.summonData.disabledMove = lastMoves[0].move;
      defender.summonData.disabledTurns = 4;
      pokemon.scene.queueMessage(getPokemonNameWithAffix(defender) + `'s ${disabledMove.name} was disabled!`);
      return true;
    }
    return false;
  }
}

export class PostAttackInvertFoeStatsAbAttr extends PostAttackAbAttr {
  private chance: number;

  constructor(chance: number = 100) {
    super();
    this.chance = chance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    for (const stat of [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD]) {
      defender.summonData.battleStats[stat] *= -1;
    }
    defender.updateInfo();
    return true;
  }
}

export class PostAttackConditionalInvertFoeStatsAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private chance: number;

  constructor(condition: PokemonAttackCondition, chance: number) {
    super();
    this.condition = condition;
    this.chance = chance;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult >= HitResult.NO_EFFECT || pokemon === defender) {
      return false;
    }
    if (!attackConditionMet(this.condition, pokemon, defender, move)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    for (const stat of [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD]) {
      defender.summonData.battleStats[stat] *= -1;
    }
    defender.updateInfo();
    return true;
  }
}

export class LowBpOhkoChanceAbAttr extends VariableMovePowerAbAttr {
  private bpThreshold: number;
  private ohkoChance: number;

  constructor(bpThreshold: number, ohkoChance: number) {
    super(true);
    this.bpThreshold = bpThreshold;
    this.ohkoChance = ohkoChance;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.power <= this.bpThreshold && move.category !== MoveCategory.STATUS && defender) {
      if (!simulated) {
        pokemon.turnData.chainsOhkoThisHit = false;
      }
      if (pokemon.randSeedInt(100) < this.ohkoChance) {
        if (!simulated) {
          pokemon.turnData.chainsOhkoThisHit = true;
        }
        return true;
      }
    }
    return false;
  }
}

export class PostFaintAllyHealAndBoostAbAttr extends PostFaintAbAttr {
  private healRatio: number;
  private highestStatLevels: integer;
  private randomStatLevels: integer;

  constructor(healRatio: number, highestStatLevels: integer = 1, randomStatLevels: integer = 1) {
    super();
    this.healRatio = healRatio;
    this.highestStatLevels = highestStatLevels;
    this.randomStatLevels = randomStatLevels;
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const replacement = party.find(p => p !== pokemon && !p.isFainted());
    if (!replacement) {
      return false;
    }
    const healAmount = Math.max(1, Math.floor(replacement.getMaxHp() * this.healRatio));
    replacement.heal(healAmount);
    replacement.updateInfo();

    const battleStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    let highestStat = BattleStat.ATK;
    let highestValue = replacement.getStat(Stat.ATK);
    for (const bs of battleStats) {
      const val = replacement.getStat(bs + 1 as Stat);
      if (val > highestValue) {
        highestStat = bs;
        highestValue = val;
      }
    }
    replacement.scene.unshiftPhase(new StatChangePhase(replacement.scene, replacement.getBattlerIndex(), true, [highestStat], this.highestStatLevels));

    if (!this.randomStatLevels) {
      return true;
    }
    const randomStat = battleStats[pokemon.randSeedInt(battleStats.length)];
    replacement.scene.unshiftPhase(new StatChangePhase(replacement.scene, replacement.getBattlerIndex(), true, [randomStat], this.randomStatLevels));
    return true;
  }
}

export class PostFaintReplacementHealAndBoostAbAttr extends PostFaintReplacementAbAttr {
  constructor(
    private healRatio: number,
    private highestStatLevels: integer = 1,
    private randomStatLevels: integer = 1
  ) {
    super();
  }

  applyPostFaintReplacement(fainted: Pokemon, passive: boolean, simulated: boolean, replacement: Pokemon, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const healAmount = Math.max(1, Math.floor(replacement.getMaxHp() * this.healRatio));
    replacement.heal(healAmount);
    replacement.updateInfo();

    const battleStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    let highestStat = BattleStat.ATK;
    let highestValue = replacement.getStat(Stat.ATK);
    for (const bs of battleStats) {
      const val = replacement.getStat(bs + 1 as Stat);
      if (val > highestValue) {
        highestStat = bs;
        highestValue = val;
      }
    }
    replacement.scene.unshiftPhase(new StatChangePhase(replacement.scene, replacement.getBattlerIndex(), true, [highestStat], this.highestStatLevels));

    if (!this.randomStatLevels) {
      return true;
    }
    const randomStat = battleStats[fainted.randSeedInt(battleStats.length)];
    replacement.scene.unshiftPhase(new StatChangePhase(replacement.scene, replacement.getBattlerIndex(), true, [randomStat], this.randomStatLevels));
    return true;
  }
}

export class PostSummonRaiseLowerStatsAbAttr extends PostSummonAbAttr {
  private count: integer;

  constructor(count: integer = 2) {
    super(true);
    this.count = count;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const opponents = pokemon.getOpponents();
    if (!opponents.length) {
      return false;
    }
    const foe = opponents[0];
    const comparableStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const lowerStats = comparableStats.filter(s => pokemon.getStat(s + 1 as Stat) < foe.getStat(s + 1 as Stat));
    if (lowerStats.length === 0) {
      return false;
    }
    if (simulated) {
      return true;
    }
    const pool = lowerStats.slice();
    const toRaise: BattleStat[] = [];
    while (toRaise.length < this.count && pool.length) {
      const idx = pokemon.randSeedInt(pool.length);
      toRaise.push(pool[idx]);
      pool.splice(idx, 1);
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, toRaise, 1));
    return true;
  }
}

export class PostAttackWishAbAttr extends PostAttackAbAttr {
  private chance: integer;

  constructor(chance: integer = 100, attackCondition?: PokemonAttackCondition) {
    super(attackCondition);
    this.chance = chance;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    pokemon.scene.arena.addTag(ArenaTagType.WISH, 2, Moves.NONE, pokemon.id,
      pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY);
    return true;
  }
}

export class PostAttackSoundSleepChanceAbAttr extends PostAttackAbAttr {
  constructor(private chance: integer = 10) {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    const isFinalStrike = (pokemon.turnData.hitsLeft ?? 1) <= 1;
    if (!isFinalStrike) {
      return false;
    }
    if (!move.hasFlag(MoveFlags.SOUND_BASED) || pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    return defender.trySetStatus(StatusEffect.SLEEP);
  }
}

export class PostTurnEvaThresholdAllBoostAbAttr extends PostTurnAbAttr {
  private evaThreshold: integer;
  private boostLevels: integer;

  constructor(evaThreshold: integer = 6, boostLevels: integer = 1) {
    super(true);
    this.evaThreshold = evaThreshold;
    this.boostLevels = boostLevels;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.summonData.battleStats[BattleStat.EVA] >= this.evaThreshold) {
      if (simulated) {
        return true;
      }
      const allStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, allStats, this.boostLevels));
      return true;
    }
    return false;
  }
}

export class PostTurnEvaThresholdResetAndAllBoostAbAttr extends PostTurnAbAttr {
  private evaThreshold: integer;
  private boostLevels: integer;

  constructor(evaThreshold: integer = 3, boostLevels: integer = 1) {
    super(true);
    this.evaThreshold = evaThreshold;
    this.boostLevels = boostLevels;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (pokemon.summonData.battleStats[BattleStat.EVA] < this.evaThreshold) {
      return false;
    }
    if (simulated) {
      return true;
    }

    pokemon.summonData.battleStats[BattleStat.EVA] = 0;
    const allStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, allStats, this.boostLevels));
    pokemon.updateInfo();
    return true;
  }
}

export class PostTurnEvaCapIncrementAndThresholdResetAbAttr extends PostTurnAbAttr {
  private evaThreshold: integer;
  private boostLevels: integer;

  constructor(evaThreshold: integer = 3, boostLevels: integer = 1) {
    super(true);
    this.evaThreshold = evaThreshold;
    this.boostLevels = boostLevels;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const currentEva = pokemon.summonData.battleStats[BattleStat.EVA];
    if (currentEva >= this.evaThreshold || currentEva + 1 >= this.evaThreshold) {
      if (simulated) {
        return true;
      }
      pokemon.summonData.battleStats[BattleStat.EVA] = 0;
      const allStats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, allStats, this.boostLevels));
      pokemon.updateInfo();
      return true;
    }
    if (simulated) {
      return true;
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.EVA], 1));
    return true;
  }
}

export class PartyTypePowerBoostAbAttr extends VariableMovePowerAbAttr {
  private type: Type;
  private bpPerAlly: number;

  constructor(type: Type, bpPerAlly: number = 10) {
    super(true);
    this.type = type;
    this.bpPerAlly = bpPerAlly;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const effectiveMoveType = pokemon.getMoveType(move, true, defender);
    if (effectiveMoveType !== this.type || move.category === MoveCategory.STATUS) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const typeCount = party.filter(p => p !== pokemon && !p.isFainted() && p.isOfType(this.type)).length;
    if (typeCount > 0 && args[0] instanceof Utils.NumberHolder) {
      args[0].value += this.bpPerAlly * typeCount;
      return true;
    }
    return false;
  }
}

export class PartyTypeAllMovesPowerBoostAbAttr extends VariableMovePowerAbAttr {
  private type: Type;
  private bpPerAlly: number;

  constructor(type: Type, bpPerAlly: number = 15) {
    super(true);
    this.type = type;
    this.bpPerAlly = bpPerAlly;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const typeCount = party.filter(p => p !== pokemon && !p.isFainted() && p.isOfType(this.type)).length;
    if (typeCount > 0 && args[0] instanceof Utils.NumberHolder) {
      args[0].value += this.bpPerAlly * typeCount;
      return true;
    }
    return false;
  }
}

export class DefenseAsAttackAbAttr extends PreAttackAbAttr {
  constructor() {
    super(true);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (args[0] instanceof Utils.IntegerHolder) {
      const isCritical = pokemon.turnData?.critApplied ?? false;
      const defStat = move.category === MoveCategory.PHYSICAL
        ? pokemon.getBattleStat(Stat.DEF, defender, move, isCritical, true)
        : pokemon.getBattleStat(Stat.SPDEF, defender, move, isCritical, true);
      args[0].value = defStat;
      return true;
    }
    return false;
  }
}

export class MoveTypeDefenseAsAttackAbAttr extends DefenseAsAttackAbAttr {
  constructor(private types: Type[]) {
    super();
  }

  override applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const t = pokemon.getMoveType(move, true, defender);
    if (!this.types.includes(t)) {
      return false;
    }
    if (args[0] instanceof Utils.IntegerHolder) {
      const isCritical = pokemon.turnData?.critApplied ?? false;
      args[0].value = pokemon.getBattleStat(Stat.DEF, defender, move, isCritical, true);
      return true;
    }
    return false;
  }
}

export class OverrideTargetDefAbAttr extends PreAttackAbAttr {
  private condition: PokemonAttackCondition;

  constructor(condition: PokemonAttackCondition = (user, target, move) => move.category !== MoveCategory.STATUS) {
    super(true);
    this.condition = condition;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (pokemon.turnData?.ignoreDefenses) {
      return false;
    }
    if (!defender || !attackConditionMet(this.condition, pokemon, defender, move)) {
      return false;
    }

    if (args[0] instanceof Utils.IntegerHolder) {
      const isCritical = pokemon.turnData?.critApplied ?? false;
      args[0].value = defender.getBattleStat(Stat.SPD, pokemon, move, isCritical);
      return true;
    }
    return false;
  }
}

export class OverrideTargetDefUseWeakerDefOnConditionAbAttr extends OverrideTargetDefAbAttr {
  private weakerDefCondition: PokemonAttackCondition;

  constructor(condition: PokemonAttackCondition) {
    super(condition);
    this.weakerDefCondition = condition;
  }

  override applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (pokemon.turnData?.ignoreDefenses) {
      return false;
    }
    if (!defender || move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!attackConditionMet(this.weakerDefCondition, pokemon, defender, move)) {
      return false;
    }
    if (args[0] instanceof Utils.IntegerHolder) {
      const isCritical = pokemon.turnData?.critApplied ?? false;
      const defStat = defender.getBattleStat(Stat.DEF, pokemon, move, isCritical);
      const spDefStat = defender.getBattleStat(Stat.SPDEF, pokemon, move, isCritical);
      args[0].value = Math.min(defStat, spDefStat);
      return true;
    }
    return false;
  }
}

export class ChargeMoveDamageAbAttr extends VariableMovePowerAbAttr {
  private damageFraction: number;

  constructor(damageFraction: number = 0.5) {
    super(true);
    this.damageFraction = damageFraction;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (simulated) { return false; }
    if (!move.hasAttr(ChargeAttr)) { return false; }
    if (pokemon.getTag(BattlerTagType.CHARGING) && args[0] instanceof Utils.NumberHolder) {
      args[0].value = Math.floor(args[0].value * this.damageFraction);
      return true;
    }
    return false;
  }
}

export class TimeRouletteCoinFlipAbAttr extends VariableMovePowerAbAttr {
  private headsMultiplier: number;
  private recoilRatio: number;

  constructor(headsMultiplier: number = 3.0, recoilRatio: number = 0.5) {
    super(true);
    this.headsMultiplier = headsMultiplier;
    this.recoilRatio = recoilRatio;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS || simulated) {
      return false;
    }
    const isHeads = pokemon.randSeedInt(2) === 0;
    pokemon.turnData.coinFlipHeads = isHeads;
    if (isHeads && args[0] instanceof Utils.NumberHolder) {
      args[0].value *= this.headsMultiplier;
    }
    return true;
  }
}

export class CoinFlipRecoilPostAttackAbAttr extends PostAttackAbAttr {
  private recoilRatio: number;

  constructor(recoilRatio: number = 0.5) {
    super();
    this.recoilRatio = recoilRatio;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit || pokemon.turnData.coinFlipHeads !== false || move.category === MoveCategory.STATUS) {
      return false;
    }
    const damageDealt = pokemon.turnData.currDamageDealt;
    if (damageDealt <= 0) {
      return false;
    }
    const recoilDamage = Math.max(1, Math.floor(damageDealt * this.recoilRatio));
    pokemon.damageAndUpdate(recoilDamage, HitResult.OTHER, false, true, true);
    return true;
  }
}

export class PostAttackCritBurnAbAttr extends PostAttackAbAttr {
  constructor(attackCondition: PokemonAttackCondition = () => true) {
    super(attackCondition);
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    const lastAttack = defender.turnData.attacksReceived?.[0];
    if (lastAttack?.critical && lastAttack.sourceId === pokemon.id && lastAttack.move === move.id && !defender.status) {
      defender.trySetStatus(StatusEffect.BURN, true, pokemon);
      return true;
    }
    return false;
  }
}

export class PostAttackClearWeatherOnCritAbAttr extends PostAttackAbAttr {
  constructor() {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS) {
      return false;
    }
    const isFinalStrike = (pokemon.turnData.hitsLeft ?? 1) <= 1;
    if (!isFinalStrike) {
      return false;
    }
    const hadCrit = defender.turnData.attacksReceived?.some(
      a => a.move === move.id && a.sourceId === pokemon.id && a.critical
    );
    if (hadCrit) {
      pokemon.scene.arena.trySetWeather(WeatherType.NONE, true);
      return true;
    }
    return false;
  }
}

export class PreDefendUseStrongerDefAbAttr extends PreDefendAbAttr {
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const defStat = pokemon.getBattleStat(Stat.DEF, attacker, move);
    const spDefStat = pokemon.getBattleStat(Stat.SPDEF, attacker, move);
    const stronger = Math.max(defStat, spDefStat);
    (args[0] as Utils.IntegerHolder).value = stronger;
    return true;
  }
}

export class PreDefendUseWeakerDefWhenMoveTypeAbAttr extends PreDefendUseStrongerDefAbAttr {
  private condition: PokemonDefendCondition;

  constructor(condition: PokemonDefendCondition) {
    super();
    this.condition = condition;
  }

  override applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (!this.condition(pokemon, attacker, move)) {
      return false;
    }
    const defStat = pokemon.getBattleStat(Stat.DEF, attacker, move);
    const spDefStat = pokemon.getBattleStat(Stat.SPDEF, attacker, move);
    (args[0] as Utils.IntegerHolder).value = Math.min(defStat, spDefStat);
    return true;
  }
}

export class PostStatusMoveBerryDamageAbAttr extends PostAttackAbAttr {
  private damageRatio: number;

  constructor(damageRatio: number = 0.2) {
    super((user, target, move) => move.category === MoveCategory.STATUS);
    this.damageRatio = damageRatio;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === defender || defender.isFainted()) {
      return false;
    }
    const berries = pokemon.scene.findModifiers(m => m instanceof BerryModifier && m.pokemonId === pokemon.id, pokemon.isPlayer()) as BerryModifier[];
    if (berries.length === 0) {
      return false;
    }
    const selectedBerry = berries[pokemon.randSeedInt(berries.length)];
    pokemon.scene.removeModifier(selectedBerry);
    pokemon.summonData.berriesConsumed = (pokemon.summonData.berriesConsumed ?? 0) + 1;
    pokemon.turnData.berryConsumedThisTurn = true;
    const damage = Math.max(Math.floor(defender.getMaxHp() * this.damageRatio), 1);
    defender.damageAndUpdate(damage, HitResult.OTHER, false, false, true, true);
    pokemon.scene.queueMessage(i18next.t("abilityTriggers:windboltDiscard", {
      pokemonName: getPokemonNameWithAffix(pokemon),
      targetName: getPokemonNameWithAffix(defender)
    }));
    return true;
  }
}

export class PostAttackSubstituteChanceAbAttr extends PostAttackAbAttr {
  private moveType: Type;
  private chance: number;
  private hpCostRatio: number;

  constructor(moveType: Type, chance: number, hpCostRatio: number) {
    super();
    this.moveType = moveType;
    this.chance = chance;
    this.hpCostRatio = hpCostRatio;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const effectiveMoveType = pokemon.getMoveType(move, true, defender);
    if (simulated || pokemon === defender || effectiveMoveType !== this.moveType) {
      return false;
    }
    if (pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    const hpCost = Math.max(Math.floor(pokemon.getMaxHp() * this.hpCostRatio), 1);
    if (pokemon.hp <= hpCost) {
      return false;
    }
    pokemon.damageAndUpdate(hpCost, HitResult.OTHER, false, true, true);
    pokemon.addTag(BattlerTagType.SUBSTITUTE, 0, Moves.SUBSTITUTE, pokemon.id);
    return true;
  }
}

export class PostAttackMultiplyProcAbAttr extends PostAttackAbAttr {
  constructor(private chance: integer = 30, private substituteHpCostRatio: number = 0.25) {
    super();
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const effectiveMoveType = pokemon.getMoveType(move, true, defender);
    if (simulated || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE || hitResult === HitResult.MISS || effectiveMoveType !== Type.NORMAL) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    if (!pokemon.getTag(BattlerTagType.SUBSTITUTE)) {
      const hpCost = Math.max(Math.floor(pokemon.getMaxHp() * this.substituteHpCostRatio), 1);
      if (pokemon.hp > hpCost) {
        pokemon.damageAndUpdate(hpCost, HitResult.OTHER, false, true, true);
        pokemon.addTag(BattlerTagType.SUBSTITUTE, 0, Moves.SUBSTITUTE, pokemon.id);
      }
    }

    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const chosen: BattleStat[] = [];
    while (chosen.length < 2 && pool.length) {
      const idx = pokemon.randSeedInt(pool.length);
      chosen.push(pool[idx]);
      pool.splice(idx, 1);
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, chosen, 1));
    return true;
  }
}

export class PostAttackTerrainChangeChanceAbAttr extends PostAttackAbAttr {
  private terrainType: TerrainType;
  private chance: number;

  constructor(terrainType: TerrainType, chance: number = 30, attackCondition: PokemonAttackCondition = () => true) {
    super(attackCondition);
    this.terrainType = terrainType;
    this.chance = chance;
  }

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || !hitResult || hitResult >= HitResult.NO_EFFECT) {
      return false;
    }
    if (pokemon.randSeedInt(100) < this.chance) {
      pokemon.scene.arena.trySetTerrain(this.terrainType, true);
      return true;
    }
    return false;
  }
}

export class PostAttackSelfDamageAbAttr extends PostAttackAbAttr {
  private ratio: number;

  constructor(ratio: number = 0.1) {
    super();
    this.ratio = ratio;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER;
    if (simulated || !hit || pokemon.hp <= 0) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const damage = Math.max(1, Math.floor(pokemon.getMaxHp() * this.ratio));
    pokemon.damageAndUpdate(damage, HitResult.OTHER);
    return true;
  }
}

export class PostDefendHighestStatChangeAbAttr extends PostDefendAbAttr {
  private levels: integer;

  constructor(levels: integer = -1) {
    super(true);
    this.levels = levels;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    let highestStat = stats[0];
    let highestValue = attacker.summonData.battleStats[stats[0]];
    for (const s of stats) {
      if (attacker.summonData.battleStats[s] > highestValue) {
        highestValue = attacker.summonData.battleStats[s];
        highestStat = s;
      }
    }
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, attacker.getBattlerIndex(), false, [highestStat], this.levels));
    return true;
  }
}

export class PostDefendContactReflectDamageAbAttr extends PostDefendAbAttr {
  private ratio: number;

  constructor(ratio: number = 0.125) {
    super(true);
    this.ratio = ratio;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || !hitResult || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    if (move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) {
      const damage = Math.max(1, Math.floor(attacker.getMaxHp() * this.ratio));
      attacker.damageAndUpdate(damage, HitResult.OTHER);
      return true;
    }
    return false;
  }
}

export class PostDefendInfatuatedReflectDamageAbAttr extends PostDefendAbAttr {
  private chance: number;
  private reflectRatio: number;

  constructor(chance: number = 50, reflectRatio: number = 0.5) {
    super();
    this.chance = chance;
    this.reflectRatio = reflectRatio;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon === attacker || hitResult === HitResult.NO_EFFECT || hitResult === HitResult.IMMUNE) {
      return false;
    }
    if (!attacker.getTag(BattlerTagType.INFATUATED)) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    const lastAttack = pokemon.turnData.attacksReceived[0];
    if (!lastAttack || lastAttack.damage <= 0) {
      return false;
    }
    const reflectDamage = Math.max(1, Math.floor(lastAttack.damage * this.reflectRatio));
    attacker.damageAndUpdate(reflectDamage, HitResult.OTHER);
    return true;
  }
}

export class PostDefendContactReflectTakenDamageAbAttr extends PostDefendAbAttr {
  constructor(private ratio: number = 0.5) {
    super(true);
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    const hit = !!hitResult && (hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER);
    if (simulated || !hit) {
      return false;
    }
    if (!move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) {
      return false;
    }
    if (attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      return false;
    }
    const lastAttack = pokemon.turnData.attacksReceived[0];
    const damageTaken = lastAttack?.damage ?? 0;
    if (damageTaken <= 0) {
      return false;
    }

    const reflect = Math.max(1, Math.ceil(damageTaken * this.ratio));
    attacker.damageAndUpdate(reflect, HitResult.OTHER);
    attacker.turnData.damageTaken += reflect;
    return true;
  }
}

export class PreDefendStatusMoveNegateAbAttr extends MoveImmunityAbAttr {
  constructor() {
    super((_pokemon, _attacker, move) => move.category === MoveCategory.STATUS);
  }
}

export class PreDefendChanceStatusNegateHealAndBoostAbAttr extends MoveImmunityAbAttr {
  private chance: number;
  private healRatio: number;

  constructor(chance: number = 30, healRatio: number = 0.15) {

    super(() => false);
    this.chance = chance;
    this.healRatio = healRatio;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {

    if (pokemon === attacker || pokemon.isPlayer() === attacker.isPlayer()) {
      return false;
    }
    if (move.category !== MoveCategory.STATUS) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    cancelled.value = true;
    if (!simulated) {
      if (!pokemon.isFullHp()) {
        const healAmount = Utils.toDmgValue(pokemon.getMaxHp() * this.healRatio);
        const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
            i18next.t("abilityTriggers:postTurnHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName }), true));
      }
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.RAND], 1));
    }
    return true;
  }
}

export class PostTurnStatSwapAbAttr extends PostTurnAbAttr {
  private stat1: BattleStat;
  private stat2: BattleStat;

  constructor(stat1: BattleStat, stat2: BattleStat) {
    super(true);
    this.stat1 = stat1;
    this.stat2 = stat2;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const realStat1 = this.stat1 + 1;
    const realStat2 = this.stat2 + 1;
    const temp = pokemon.stats[realStat1];
    pokemon.stats[realStat1] = pokemon.stats[realStat2];
    pokemon.stats[realStat2] = temp;
    pokemon.updateInfo();
    return true;
  }
}

export class PostTurnResetNegativeStatsAbAttr extends PostTurnAbAttr {
  constructor() {
    super(true);
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    let anyReset = false;
    for (const stat of [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD]) {
      if (pokemon.summonData.battleStats[stat] < 0) {
        pokemon.summonData.battleStats[stat] = 0;
        anyReset = true;
      }
    }
    if (anyReset) {
      pokemon.updateInfo();
    }
    return anyReset;
  }
}

export class PostDefendHandResetAbAttr extends PostDefendAbAttr {
  constructor(private hpThreshold: number = 0.5) {
    super();
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER;
    if (!hit) {
      return false;
    }
    const maxHp = pokemon.getMaxHp();
    if (maxHp <= 0) {
      return false;
    }
    const lastAttack = pokemon.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== attacker.id || lastAttack.move !== move.id) {
      return false;
    }
    const prevHp = pokemon.hp + lastAttack.damage;
    const prevRatio = prevHp / maxHp;
    const nowRatio = pokemon.hp / maxHp;
    if (prevRatio < this.hpThreshold || nowRatio >= this.hpThreshold) {
      return false;
    }
    if (simulated) {
      return true;
    }

    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    for (const p of party) {
      if (p.status) {
        p.resetStatus();
        p.updateInfo();
      }
    }

    for (const stat of [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]) {
      pokemon.summonData.battleStats[stat] = 0;
      attacker.summonData.battleStats[stat] = 0;
    }
    pokemon.updateInfo();
    attacker.updateInfo();

    return true;
  }
}

export class PostDefendGoldenRadianceAbAttr extends PostDefendAbAttr {
  constructor(private hpThreshold: number = 0.1) {
    super();
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const hit = hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER;
    if (simulated || !hit) {
      return false;
    }
    if (pokemon.battleData.goldenRadianceUsed) {
      return false;
    }
    const maxHp = pokemon.getMaxHp();
    if (maxHp <= 0) {
      return false;
    }
    const lastAttack = pokemon.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== attacker.id || lastAttack.move !== move.id) {
      return false;
    }
    const prevHp = pokemon.hp + lastAttack.damage;
    const prevRatio = prevHp / maxHp;
    const nowRatio = pokemon.hp / maxHp;

    if (prevRatio < this.hpThreshold || nowRatio >= this.hpThreshold) {
      return false;
    }

    pokemon.battleData.goldenRadianceUsed = true;
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true,
      [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD], 1));
    return true;
  }
}

export class PostTurnDarkworldTacticsAbAttr extends PostTurnAbAttr {
  constructor() {
    super(true);
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    let hadNegatives = false;
    for (const stat of [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD, BattleStat.ACC, BattleStat.EVA]) {
      if (pokemon.summonData.battleStats[stat] < 0) {
        pokemon.summonData.battleStats[stat] = 0;
        hadNegatives = true;
      }
    }
    if (hadNegatives) {
      pokemon.updateInfo();
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.RAND], 1));
      if (!pokemon.isFullHp()) {
        const healAmount = Math.max(Math.floor(pokemon.getMaxHp() / 6), 1);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
            i18next.t("abilityTriggers:postTurnHeal", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName: (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name }), true));
      }
    }
    return hadNegatives;
  }
}

export class PostTurnBerryConsumeStatAbAttr extends PostTurnAbAttr {
  private stat: BattleStat;
  private levels: integer;
  private resetThreshold: integer;
  private resetHealRatio: number;

  constructor(stat: BattleStat, levels: integer, resetThreshold: integer, resetHealRatio: number) {
    super(true);
    this.stat = stat;
    this.levels = levels;
    this.resetThreshold = resetThreshold;
    this.resetHealRatio = resetHealRatio;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    if (pokemon.summonData.battleStats[this.stat] >= this.resetThreshold) {
      pokemon.summonData.battleStats[this.stat] = 0;
      pokemon.updateInfo();
      const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.resetHealRatio));
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
        getPokemonNameWithAffix(pokemon) + `'s power was reset and it recovered!`, true));
      return true;
    }
    const berries = pokemon.scene.findModifiers(m => m instanceof BerryModifier && m.pokemonId === pokemon.id, pokemon.isPlayer()) as BerryModifier[];
    if (berries.length > 0) {
      const selectedBerry = berries[pokemon.randSeedInt(berries.length)];
      if (pokemon.battleData) {
        pokemon.battleData.berriesEaten.push(selectedBerry.berryType);
      }
      if (selectedBerry.stackCount <= 1) {
        pokemon.scene.removeModifier(selectedBerry, !pokemon.isPlayer());
      } else {
        selectedBerry.stackCount--;
      }
      pokemon.scene.updateModifiers(pokemon.isPlayer());
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [this.stat], this.levels));
      return true;
    }
    return false;
  }
}

export class PreDefendChanceStatusNegateDamageAndBoostAbAttr extends MoveImmunityAbAttr {
  constructor(
    private chance: number = 30,
    private chipRatio: number = 1 / 16
  ) {

    super(() => false);
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    if (pokemon.isPlayer() === attacker.isPlayer()) {
      return false;
    }
    if (move.category !== MoveCategory.STATUS) {
      return false;
    }
    if (pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }

    cancelled.value = true;

    if (!attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      const dmg = Math.max(1, Utils.toDmgValue(attacker.getMaxHp() * this.chipRatio));
      attacker.damageAndUpdate(dmg, HitResult.OTHER);
      attacker.turnData.damageTaken += dmg;
    }

    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.RAND], 1));
    return true;
  }
}

export class PostTurnStatThresholdResetAndTagAbAttr extends PostTurnAbAttr {
  private stats: BattleStat[];
  private threshold: integer;
  private tagType: BattlerTagType;

  constructor(stats: BattleStat[], threshold: integer, tagType: BattlerTagType) {
    super(true);
    this.stats = stats;
    this.threshold = threshold;
    this.tagType = tagType;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const total = this.stats.reduce((sum, s) => sum + Math.max(0, pokemon.summonData.battleStats[s]), 0);
    if (total >= this.threshold) {
      if (!simulated) {
        for (const s of this.stats) {
          pokemon.summonData.battleStats[s] = 0;
        }
        pokemon.updateInfo();
        for (const opponent of pokemon.getOpponents()) {
          opponent.addTag(this.tagType, 0, undefined, pokemon.id);
        }
      }
      return true;
    }
    return false;
  }
}
export class PostTurnRandPoolThenThresholdResetAndTagAbAttr extends PostTurnAbAttr {
  private boostPool: BattleStat[];
  private boostLevels: integer;
  private thresholdStats: BattleStat[];
  private threshold: integer;
  private tagType: BattlerTagType;

  constructor(boostPool: BattleStat[], boostLevels: integer, thresholdStats: BattleStat[], threshold: integer, tagType: BattlerTagType) {
    super(true);
    this.boostPool = boostPool;
    this.boostLevels = boostLevels;
    this.thresholdStats = thresholdStats;
    this.threshold = threshold;
    this.tagType = tagType;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }

    const chosen = this.boostPool[pokemon.randSeedInt(this.boostPool.length)];

    const projectedTotal = this.thresholdStats.reduce((sum, s) => {
      const stage = s === chosen
        ? Math.max(Math.min(pokemon.summonData.battleStats[s] + this.boostLevels, 6), -6)
        : pokemon.summonData.battleStats[s];
      return sum + Math.max(0, stage);
    }, 0);

    if (projectedTotal >= this.threshold) {
      for (const s of this.thresholdStats) {
        pokemon.summonData.battleStats[s] = 0;
      }
      pokemon.updateInfo();
      for (const opponent of pokemon.getOpponents()) {
        opponent.addTag(this.tagType, 0, undefined, pokemon.id);
      }
    } else {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [chosen], this.boostLevels));
    }
    return true;
  }
}

export class PostSummonConditionalAllStatChangeAbAttr extends PostSummonAbAttr {
  private condition: (pokemon: Pokemon) => boolean;
  private levels: integer;

  constructor(condition: (pokemon: Pokemon) => boolean, levels: integer) {
    super(true);
    this.condition = condition;
    this.levels = levels;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!this.condition(pokemon)) {
      return false;
    }
    if (!simulated) {
      const stats = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, stats, this.levels));
    }
    return true;
  }
}

export class PostSummonForceSwitchAbAttr extends PostSummonAbAttr {
  private condition: (pokemon: Pokemon) => boolean;
  private chipDamageCondition: ((pokemon: Pokemon, foe: Pokemon) => boolean) | null;
  private chipRatio: number;

  constructor(condition: (pokemon: Pokemon) => boolean, chipDamageCondition?: (pokemon: Pokemon, foe: Pokemon) => boolean, chipRatio: number = 0) {
    super(true);
    this.condition = condition;
    this.chipDamageCondition = chipDamageCondition ?? null;
    this.chipRatio = chipRatio;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!this.condition(pokemon)) {
      return false;
    }
    if (simulated) {
      return true;
    }
    for (const opponent of pokemon.getOpponents()) {
      if (this.chipDamageCondition && this.chipDamageCondition(pokemon, opponent) && this.chipRatio > 0) {
        const chipDamage = Math.max(1, Math.floor(opponent.getMaxHp() * this.chipRatio));
        opponent.damageAndUpdate(chipDamage, HitResult.OTHER);
      }

      const party = opponent.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
      const hasBench = party.some(p => p.isAllowedInBattle() && !p.isFainted() && !p.isActive(true));
      if (!hasBench) {
        continue;
      }

      if (opponent instanceof PlayerPokemon) {
        opponent.leaveField(false);
        if (opponent.hp > 0) {
          pokemon.scene.unshiftPhase(new SwitchPhase(pokemon.scene, opponent.getFieldIndex(), true, true));
        }
        continue;
      }

      if (pokemon.scene.currentBattle.battleType !== BattleType.WILD) {
        const nextIndex = pokemon.scene.currentBattle.trainer
          ? pokemon.scene.currentBattle.trainer.getNextSummonIndex((opponent as EnemyPokemon).trainerSlot)
          : 0;
        if (nextIndex >= 0) {
          opponent.leaveField(false);
          if (opponent.hp > 0) {
            pokemon.scene.unshiftPhase(new SwitchSummonPhase(pokemon.scene, opponent.getFieldIndex(), nextIndex, false, false, false));
          }
        }
      }
    }
    return true;
  }
}

export class PostSummonAddArenaTagAbAttr extends PostSummonAbAttr {
  private arenaTagType: ArenaTagType;
  private turns: integer;
  private side: ArenaTagSide;

  constructor(arenaTagType: ArenaTagType, turns: integer, side: ArenaTagSide = ArenaTagSide.BOTH) {
    super(true);
    this.arenaTagType = arenaTagType;
    this.turns = turns;
    this.side = side;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
      pokemon.scene.arena.addTag(this.arenaTagType, this.turns, undefined, pokemon.id, this.side);
    }
    return true;
  }
}

export class PostSummonAddArenaTagOnSelfSideAbAttr extends PostSummonAbAttr {
  constructor(private arenaTagType: ArenaTagType, private turns: integer) {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
      const side = pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
      pokemon.scene.arena.addTag(this.arenaTagType, this.turns, undefined, pokemon.id, side);
    }
    return true;
  }
}

export class PostSummonClearFoeBoostsAbAttr extends PostSummonAbAttr {
  constructor() {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    for (const opponent of pokemon.getOpponents()) {
      for (const stat of [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD]) {
        if (opponent.summonData.battleStats[stat] > 0) {
          opponent.summonData.battleStats[stat] = 0;
        }
      }
      opponent.updateInfo();
    }
    return true;
  }
}

export class PostSummonSwapFoeStatsAbAttr extends PostSummonAbAttr {
  private stats: BattleStat[];

  constructor(stats: BattleStat[]) {
    super(true);
    this.stats = stats;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    for (const opponent of pokemon.getOpponents()) {
      if (this.stats.length !== 2) {
        continue;
      }
      const [a, b] = this.stats;
      const valA = opponent.summonData.battleStats[a];
      const valB = opponent.summonData.battleStats[b];
      opponent.summonData.battleStats[a] = valB;
      opponent.summonData.battleStats[b] = valA;
      if ((a === BattleStat.ATK && b === BattleStat.SPATK) || (a === BattleStat.SPATK && b === BattleStat.ATK)) {
        if (valA !== valB) {
          opponent.summonData.atkSpAtkSwapped = !opponent.summonData.atkSpAtkSwapped;
        }
      }
      opponent.updateInfo();
    }
    return true;
  }
}

export class PostSummonChargedShieldAbAttr extends PostSummonAbAttr {
  private chargeTag: BattlerTagType;
  private defStat: BattleStat;
  private defLevels: integer;

  constructor(chargeTag: BattlerTagType, defStat: BattleStat = BattleStat.DEF, defLevels: integer = 1) {
    super(true);
    this.chargeTag = chargeTag;
    this.defStat = defStat;
    this.defLevels = defLevels;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
      pokemon.addTag(this.chargeTag, -1, undefined, pokemon.id);
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [this.defStat], this.defLevels));
    }
    return true;
  }
}

export class PostSummonAuroraVeilAbAttr extends PostSummonAbAttr {
  constructor() {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
      const side = pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
      pokemon.scene.arena.addTag(ArenaTagType.AURORA_VEIL, 5, undefined, pokemon.id, side);
    }
    return true;
  }
}

export class PostSummonAuroraVeilWithSelfDamageOncePerBattleAbAttr extends PostSummonAbAttr {
  private veilTurns: integer;
  private selfDamageRatio: number;

  constructor(veilTurns: integer = 5, selfDamageRatio: number = 0.25) {
    super(true);
    this.veilTurns = veilTurns;
    this.selfDamageRatio = selfDamageRatio;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated || pokemon.battleData.abominableProtectionUsed) {
      return false;
    }
    const side = pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    pokemon.scene.arena.addTag(ArenaTagType.AURORA_VEIL, this.veilTurns, undefined, pokemon.id, side);

    const dmg = Math.max(1, Math.floor(pokemon.getMaxHp() * this.selfDamageRatio));
    pokemon.damageAndUpdate(dmg, HitResult.OTHER);

    pokemon.battleData.abominableProtectionUsed = true;
    return true;
  }
}

export class PostSummonCopyFaintedAllyAbilityAbAttr extends PostSummonAbAttr {
  constructor() {
    super(true);
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const faintedAlly = party.find(p => p !== pokemon && p.isFainted() && p.getAbility().id !== Abilities.NONE);
    if (faintedAlly && !simulated) {
      const faintedAbility = faintedAlly.getAbility().id;
      pokemon.summonData.ability = faintedAbility;
      pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` inherited ${faintedAlly.getAbility().name}!`);
      return true;
    }
    return false;
  }
}

export class PostSummonCopyRandomFaintedAllyAbilityAndHealAbAttr extends PostSummonAbAttr {
  private healRatio: number;

  constructor(healRatio: number = 1 / 8) {
    super(true);
    this.healRatio = healRatio;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const candidates = party.filter(p => p !== pokemon && p.isFainted() && p.getAbility().id !== Abilities.NONE);
    if (candidates.length === 0) {
      return false;
    }
    if (simulated) {
      return true;
    }
    const faintedAlly = candidates[pokemon.randSeedInt(candidates.length)];
    pokemon.summonData.ability = faintedAlly.getAbility().id;
    pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` inherited ${faintedAlly.getAbility().name}!`);

    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
    pokemon.scene.unshiftPhase(new PokemonHealPhase(
      pokemon.scene,
      pokemon.getBattlerIndex(),
      healAmount,
      getPokemonMessage(pokemon, i18next.t("abilityTriggers:restoredHPLittle", { abilityName: pokemon.getAbility().name })),
      true
    ));
    return true;
  }
}

export class PostFaintReviveAllyAbAttr extends PostFaintAbAttr {
  private hpRatio: number;
  private typeFilter: Type | null;

  constructor(hpRatio: number = 0.5, typeFilter: Type | null = null) {
    super();
    this.hpRatio = hpRatio;
    this.typeFilter = typeFilter;
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon.battleData.abilityReviveUsed) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    let candidates = party.filter(p => p !== pokemon && p.isFainted() && p.species.speciesId !== pokemon.species.speciesId);
    if (this.typeFilter !== null) {
      candidates = candidates.filter(p => p.getTypes().includes(this.typeFilter!));
    }
    if (candidates.length === 0) {
      return false;
    }
    const faintedAlly = candidates[pokemon.randSeedInt(candidates.length)];
    const healAmount = Math.max(1, Math.floor(faintedAlly.getMaxHp() * this.hpRatio));
    faintedAlly.hp = healAmount;
    faintedAlly.resetStatus();
    faintedAlly.battleData.wasRevived = true;
    faintedAlly.updateInfo();
    pokemon.battleData.abilityReviveUsed = true;
    pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` revived ` + getPokemonNameWithAffix(faintedAlly) + `!`);
    return true;
  }
}

export class PostFaintSelfReviveAbAttr extends PostFaintAbAttr {
  private hpRatio: number;

  constructor(hpRatio: number = 0.5) {
    super();
    this.hpRatio = hpRatio;
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon.battleData.abilityReviveUsed) {
      return false;
    }
    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpRatio));
    pokemon.hp = healAmount;
    pokemon.resetStatus();
    pokemon.battleData.wasRevived = true;
    pokemon.updateInfo();
    pokemon.battleData.abilityReviveUsed = true;
    pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` revived itself!`);
    return true;
  }
}

export class PostFaintUndeadKingAbAttr extends PostFaintAbAttr {
  constructor(private hpRatio: number = 0.5) {
    super();
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated || pokemon.battleData.abilityReviveUsed) {
      return false;
    }

    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const candidates = party.filter(p =>
      p !== pokemon
      && !p.isFainted()
      && p.getMoveset(true).some(m => m?.getMove().hasFlag(MoveFlags.SERVANT_MOVE))
    );

    if (candidates.length) {
      const sacrifice = candidates[pokemon.randSeedInt(candidates.length)];
      if (sacrifice.isOnField()) {
        sacrifice.damageAndUpdate(Math.max(1, sacrifice.hp), HitResult.OTHER, false, false, true);
      } else {
        sacrifice.hp = 0;
        sacrifice.updateInfo();
      }
    }

    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.hpRatio));
    pokemon.hp = healAmount;
    pokemon.resetStatus();
    pokemon.battleData.wasRevived = true;
    pokemon.updateInfo();
    pokemon.battleData.abilityReviveUsed = true;

    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const chosen: BattleStat[] = [];
    while (chosen.length < 2 && pool.length) {
      const idx = pokemon.randSeedInt(pool.length);
      chosen.push(pool[idx]);
      pool.splice(idx, 1);
    }
    if (chosen.length) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, chosen, 1));
    }

    pokemon.scene.queueMessage(getPokemonNameWithAffix(pokemon) + ` revived itself!`);
    return true;
  }
}

export class PostKnockOutIncomingDamageAbAttr extends PostKnockOutAbAttr {
  private damageRatio: number;

  constructor(damageRatio: number) {
    super();
    this.damageRatio = damageRatio;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }

    const party = knockedOut.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const nextPokemon = party.find(p => p !== knockedOut && !p.isFainted());
    if (!nextPokemon) {
      return false;
    }
    const damage = Math.max(1, Math.floor(nextPokemon.getMaxHp() * this.damageRatio));
    nextPokemon.damageAndUpdate(damage, HitResult.OTHER);
    return true;
  }
}

export class FistOfFateArmOnKoAbAttr extends PostKnockOutAbAttr {
  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated || pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }
    pokemon.battleData.fistOfFateKoChipArmed = true;
    return true;
  }
}

export class FistOfFatePostFoeSummonChipAbAttr extends PostFoeSummonAbAttr {
  private damageRatio: number;

  constructor(damageRatio: number) {
    super();
    this.damageRatio = damageRatio;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const summoned = args[0] as Pokemon;
    if (simulated || !summoned || !pokemon.battleData.fistOfFateKoChipArmed) {
      return false;
    }
    pokemon.battleData.fistOfFateKoChipArmed = false;
    const cancelled = new Utils.BooleanHolder(false);
    applyAbAttrs(BlockNonDirectDamageAbAttr, summoned, cancelled);
    if (cancelled.value) {
      return false;
    }
    const damage = Math.max(1, Math.floor(summoned.getMaxHp() * this.damageRatio));
    summoned.damageAndUpdate(damage, HitResult.OTHER);
    return true;
  }
}

export class PostKnockOutRandomPartyHealAbAttr extends PostKnockOutAbAttr {
  constructor(private healRatio: number = 0.25) {
    super();
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated) {
      return true;
    }

    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }

    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const candidates = party.filter(p => !p.isFainted());
    if (!candidates.length) {
      return false;
    }

    const chosen = candidates[pokemon.randSeedInt(candidates.length)];
    const healAmount = Math.max(1, Math.floor(chosen.getMaxHp() * this.healRatio));
    if (chosen.isOnField() && chosen.isActive()) {
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, chosen.getBattlerIndex(), healAmount,
        getPokemonNameWithAffix(chosen) + ` recovered health!`, true));
    } else {
      chosen.heal(healAmount);
      chosen.updateInfo();
    }
    return true;
  }
}

export class PostKnockOutHealAndCopyFoeAbilityAsPassiveAbAttr extends PostKnockOutAbAttr {
  constructor(private healRatio: number = 0.25) {
    super();
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    if (pokemon.isPlayer() === knockedOut.isPlayer()) {
      return false;
    }
    const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
    if (!lastAttack || lastAttack.sourceId !== pokemon.id) {
      return false;
    }
    if (knockedOut.getAbility().hasAttr(UncopiableAbilityAbAttr)) {
      return false;
    }

    pokemon.battleData.passiveAbilityOverride = knockedOut.getAbility().id;
    pokemon.updateInfo();

    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
    pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
      getPokemonNameWithAffix(pokemon) + ` recovered health!`, true));
    return true;
  }
}

export class PostKnockOutAllyHealAbAttr extends PostKnockOutAbAttr {
  private healRatio: number;

  constructor(healRatio: number = 0.25) {
    super();
    this.healRatio = healRatio;
  }

  applyPostKnockOut(pokemon: Pokemon, passive: boolean, simulated: boolean, knockedOut: Pokemon, args: any[]): boolean {
    if (!simulated) {
      const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
        getPokemonNameWithAffix(pokemon) + ` recovered health!`, true));
      return true;
    }
    return false;
  }
}

export class PreSwitchOutAllyStatChangeAbAttr extends PreSwitchOutAbAttr {
  private stat: BattleStat;
  private levels: integer;

  constructor(stat: BattleStat, levels: integer) {
    super();
    this.stat = stat;
    this.levels = levels;
  }

  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[], switchedInPokemon?: Pokemon): boolean {
    if (simulated || !switchedInPokemon) {
      return false;
    }
    pokemon.scene.unshiftPhase(
      new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [this.stat], this.levels)
    );
    return true;
  }
}

export class PreSwitchOutChargedBurnAndBoostAbAttr extends PreSwitchOutAbAttr {
  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[], switchedInPokemon?: Pokemon): boolean {
    if (!pokemon.getTag(BattlerTagType.CHARGED)) {
      return false;
    }
    if (simulated) {
      return true;
    }
    pokemon.removeTag(BattlerTagType.CHARGED);
    for (const opponent of pokemon.getOpponents()) {
      opponent.trySetStatus(StatusEffect.BURN, true, pokemon);
    }
    if (switchedInPokemon) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.SPD], 1));
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.RAND], 1));
    }
    return true;
  }
}

export class PreSwitchOutAllyHealAbAttr extends PreSwitchOutAbAttr {
  private healRatio: number;

  constructor(healRatio: number = 0.25) {
    super();
    this.healRatio = healRatio;
  }

  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[], switchedInPokemon?: Pokemon): boolean | Promise<boolean> {
    if (simulated || !switchedInPokemon || switchedInPokemon.isFullHp()) {
      return false;
    }
    const healAmount = Utils.toDmgValue(switchedInPokemon.getMaxHp() * this.healRatio);
    switchedInPokemon.heal(healAmount);
    switchedInPokemon.updateInfo();
    return true;
  }
}

export class PreSwitchOutStatusAbAttr extends PreSwitchOutAbAttr {
  private statusEffect: StatusEffect;
  private chance: number;

  constructor(statusEffect: StatusEffect, chance: number = 100) {
    super();
    this.statusEffect = statusEffect;
    this.chance = chance;
  }

  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[], switchedInPokemon?: Pokemon): boolean {
    if (simulated) {
      return false;
    }
    if (this.chance < 100 && pokemon.randSeedInt(100) >= this.chance) {
      return false;
    }
    for (const opponent of pokemon.getOpponents()) {
      if (!opponent.status) {
        opponent.trySetStatus(this.statusEffect, true, pokemon);
      }
    }
    return true;
  }
}

export class IgnoreTypeResistanceOnConditionAbAttr extends IgnoreTypeResistanceAbAttr {
  constructor(condition: PokemonAttackCondition) {
    super(condition);
  }
}

export class MultiStrikeAbAttr extends PreAttackAbAttr {
  private minHits: integer;
  private maxHits: integer;

  constructor(minHits: integer = 2, maxHits: integer = 5) {
    super(true);
    this.minHits = minHits;
    this.maxHits = maxHits;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (move.hasAttr(MultiHitAttr)) {
      return false;
    }
    const hitCount = args[1] as Utils.IntegerHolder;
    if (hitCount) {
      hitCount.value = this.minHits + pokemon.randSeedInt(this.maxHits - this.minHits + 1);
      return true;
    }
    return false;
  }
}

export class ConditionalMultiStrikeAbAttr extends MultiStrikeAbAttr {
  constructor(
    minHits: integer,
    maxHits: integer,
    private condition: (user: Pokemon, move: Move) => boolean
  ) {
    super(minHits, maxHits);
  }

  override applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon | null, move: Move, args: any[]): boolean {
    if (!this.condition(pokemon, move)) {
      return false;
    }
    return super.applyPreAttack(pokemon, passive, simulated, defender as unknown as Pokemon, move, args);
  }
}

export class ClampMultiHitToThreeAbAttr extends MultiStrikeAbAttr {
  constructor() {
    super(3, 3);
  }

  override applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS || !move.hasAttr(MultiHitAttr)) {
      return false;
    }
    if (!move.hasFlag(MoveFlags.CHECK_ALL_HITS)) {
      move.abilitySetFlag(MoveFlags.CHECK_ALL_HITS, true);
      if (pokemon.turnData) {
        pokemon.turnData.abilityAddedFlags = (pokemon.turnData.abilityAddedFlags ?? 0) | MoveFlags.CHECK_ALL_HITS;
      }
    }
    const hitCount = args[1] as Utils.IntegerHolder;
    if (hitCount && hitCount.value !== 3) {
      hitCount.value = 3;
    }
    return true;
  }
}

export class MeteorShowerRandomFireRockTypeAbAttr extends MoveTypeChangeAbAttr {
  constructor() {
    super(Type.FIRE, 1, () => true);
  }

  override applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon | null, move: Move, args: any[]): boolean {
    const moveTypeHolder = args[0] instanceof Utils.NumberHolder ? args[0] as Utils.NumberHolder : null;
    if (!moveTypeHolder) {
      return false;
    }
    const currentType = moveTypeHolder.value as Type;
    if (move.category === MoveCategory.STATUS || ![Type.NORMAL, Type.FIRE, Type.ROCK].includes(currentType)) {
      return false;
    }
    moveTypeHolder.value = pokemon.randSeedInt(2) === 0 ? Type.FIRE : Type.ROCK;
    return true;
  }
}

export class DynamicSecondStrikeAbAttr extends AddSecondStrikeAbAttr {
  private dynamicMultiplier: (pokemon: Pokemon, defender: Pokemon) => number;

  constructor(dynamicMultiplier: (pokemon: Pokemon, defender: Pokemon) => number) {
    super(0.5);
    this.dynamicMultiplier = dynamicMultiplier;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const numTargets = args[0] as integer;
    const hitCount = args[1] as Utils.IntegerHolder;
    const multiplier = args[2] as Utils.NumberHolder;

    if (this.canApplyPreAttack(move, numTargets)) {
      this.showAbility = !!hitCount?.value;
      if (!!hitCount?.value) {
        hitCount.value *= 2;
      }
      if (!!multiplier?.value && pokemon.turnData.hitsLeft % 2 === 1 && pokemon.turnData.hitsLeft !== pokemon.turnData.hitCount) {
        multiplier.value *= this.dynamicMultiplier(pokemon, defender);
      }
      return true;
    }
    return false;
  }
}

export class CoinFlipAbAttr extends PostTurnAbAttr {
  private headsStat: BattleStat;
  private tailsStat: BattleStat;
  private levels: integer;

  constructor(headsStat: BattleStat, tailsStat: BattleStat, levels: integer = 1) {
    super(true);
    this.headsStat = headsStat;
    this.tailsStat = tailsStat;
    this.levels = levels;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const isHeads = !!pokemon.randSeedInt(2);
    pokemon.turnData.coinFlipHeads = isHeads;
    const stat = isHeads ? this.headsStat : this.tailsStat;
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [stat], this.levels));
    return true;
  }
}

export class PostMoveConsumeHeldBerryAbAttr extends PostAttackAbAttr {
  private stat: BattleStat;
  private levels: integer;

  constructor(stat: BattleStat, levels: integer = 1) {
    super();
    this.stat = stat;
    this.levels = levels;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (simulated) {
      return false;
    }
    const berries = pokemon.scene.findModifiers(m => m instanceof BerryModifier && m.pokemonId === pokemon.id, pokemon.isPlayer()) as BerryModifier[];
    if (berries.length > 0) {
      const selectedBerry = berries[pokemon.randSeedInt(berries.length)];
      pokemon.scene.removeModifier(selectedBerry);
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [this.stat], this.levels));
      return true;
    }
    return false;
  }
}

export class PreAttackDiscardItemPowerBoostAbAttr extends VariableMovePowerAbAttr {
  private powerMultiplier: number;

  constructor(powerMultiplier: number = 1.5) {
    super(true);
    this.powerMultiplier = powerMultiplier;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (!(args[0] instanceof Utils.NumberHolder)) {
      return false;
    }
    const alreadyDiscarded = !!pokemon.turnData.discardedItemForPowerBoost;
    const items = pokemon.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.pokemonId === pokemon.id, pokemon.isPlayer()) as PokemonHeldItemModifier[];
    if (!alreadyDiscarded) {
      if (items.length === 0) {
        return false;
      }
      if (!simulated) {
        const discardedItem = items[pokemon.randSeedInt(items.length)];
        pokemon.scene.removeModifier(discardedItem);
        pokemon.turnData.discardedItemForPowerBoost = true;
        pokemon.turnData.abilityProcsThisTurn = (pokemon.turnData.abilityProcsThisTurn ?? 0) + 1;
        pokemon.turnData.abilityProcThisTurn = true;
      }
    }

    if (alreadyDiscarded || items.length > 0) {
      args[0].value = Math.floor(args[0].value * this.powerMultiplier);
      if (!simulated && pokemon.turnData.discardedItemForPowerBoost) {
        pokemon.turnData.abilityProcThisTurn = true;
      }
      return true;
    }
    return false;
  }
}

export class PostBattlerTagLostAbAttr extends AbAttr {
  private watchedTag: BattlerTagType;
  private applyTag: BattlerTagType;

  constructor(watchedTag: BattlerTagType, applyTag: BattlerTagType) {
    super(true);
    this.watchedTag = watchedTag;
    this.applyTag = applyTag;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const removedTag = args[0] as BattlerTagType;
    if (removedTag === this.watchedTag) {
      if (!simulated) {
        pokemon.addTag(this.applyTag, -1, undefined, pokemon.id);
      }
      return true;
    }
    return false;
  }
}

export class FaintedPartyPowerBoostAbAttr extends VariableMovePowerAbAttr {
  private boostPerFainted: number;

  constructor(boostPerFainted: number = 0.1) {
    super(false);
    this.boostPerFainted = boostPerFainted;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const faintedCount = party.filter(p => p.isFainted()).length;
    if (faintedCount > 0 && args[0] instanceof Utils.NumberHolder) {
      args[0].value *= (1 + faintedCount * this.boostPerFainted);
      return true;
    }
    return false;
  }
}

export class FaintedPartyFlatPowerBoostAbAttr extends VariableMovePowerAbAttr {
  constructor(private bpPerFainted: integer = 5) {
    super(false);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const faintedCount = party.filter(p => p.isFainted()).length;
    if (faintedCount > 0 && args[0] instanceof Utils.NumberHolder) {
      args[0].value += this.bpPerFainted * faintedCount;
      return true;
    }
    return false;
  }
}

export class FaintedPartyTypeBpBoostAbAttr extends VariableMovePowerAbAttr {
  constructor(private faintedType: Type, private bpPerFainted: integer = 10) {
    super(false);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const faintedCount = party.filter(p => p.isFainted() && p.getTypes(true).includes(this.faintedType)).length;
    if (faintedCount > 0 && args[0] instanceof Utils.NumberHolder) {
      args[0].value += this.bpPerFainted * faintedCount;
      return true;
    }
    return false;
  }
}

export class FaintedPartyStatMultiplierAbAttr extends PreAttackAbAttr {
  private stat: BattleStat;
  private multiplierPerFainted: number;

  constructor(stat: BattleStat, multiplierPerFainted: number = 0.1) {
    super(false);
    this.stat = stat;
    this.multiplierPerFainted = multiplierPerFainted;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
    const faintedCount = party.filter(p => p.isFainted()).length;
    if (faintedCount > 0 && args[0] instanceof Utils.NumberHolder) {
      args[0].value *= (1 + faintedCount * this.multiplierPerFainted);
      return true;
    }
    return false;
  }
}

export class TurnsOnFieldPowerBoostAbAttr extends VariableMovePowerAbAttr {
  private bpPerTurn: integer;
  private maxBonusBp: integer;

  constructor(bpPerTurn: integer = 10, maxBonusBp: integer = 50) {
    super(false);
    this.bpPerTurn = bpPerTurn;
    this.maxBonusBp = maxBonusBp;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const hitsLeft = pokemon.turnData.hitsLeft ?? 1;
    const hitCount = pokemon.turnData.hitCount ?? 1;
    if (hitsLeft !== hitCount) {
      return false;
    }
    const turnsOnField = pokemon.battleSummonData.turnCount ?? 1;
    const bonus = Math.min((turnsOnField - 1) * this.bpPerTurn, this.maxBonusBp);
    if (bonus > 0 && args[0] instanceof Utils.NumberHolder) {
      args[0].value += bonus;
      return true;
    }
    return false;
  }
}

export class ConsecutiveAttackPowerBoostAbAttr extends VariableMovePowerAbAttr {
  private boostPerConsecutive: number;
  private maxBoost: number;

  constructor(boostPerConsecutive: number = 0.2, maxBoost: number = 3.0) {
    super(false);
    this.boostPerConsecutive = boostPerConsecutive;
    this.maxBoost = maxBoost;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const lastMoves = pokemon.getLastXMoves(5);
    let consecutiveCount = 0;
    for (const m of lastMoves) {
      if (m.move === move.id && m.result === MoveResult.SUCCESS) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    if (consecutiveCount > 0 && args[0] instanceof Utils.NumberHolder) {
      const boost = Math.min(1 + consecutiveCount * this.boostPerConsecutive, this.maxBoost);
      args[0].value *= boost;
      return true;
    }
    return false;
  }
}

export class ConsecutiveAttackPowerBoostWithRecoilAbAttr extends ConsecutiveAttackPowerBoostAbAttr {
  private recoilRatio: number;

  constructor(boostPerConsecutive: number = 0.4, maxBoost: number = 3.0, recoilRatio: number = 0.33) {
    super(boostPerConsecutive, maxBoost);
    this.recoilRatio = recoilRatio;
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    const boosted = super.applyPreAttack(pokemon, passive, simulated, defender, move, args);
    if (boosted) {
      pokemon.turnData.consecutiveBoostActive = true;
    }
    return boosted;
  }
}

export class ConsecutiveAttackFlatBpBoostAbAttr extends VariableMovePowerAbAttr {
  constructor(private bpPerAttack: number = 20) {
    super(false);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (!(args[0] instanceof Utils.NumberHolder) || move.category === MoveCategory.STATUS) {
      return false;
    }

    const hitsLeft = pokemon.turnData.hitsLeft ?? 1;
    const hitCount = pokemon.turnData.hitCount ?? 1;
    if (hitsLeft !== hitCount) {
      return false;
    }

    const history = pokemon.getMoveHistory();
    let consecutive = 0;
    for (let i = history.length - 2; i >= 0; i--) {
      const h = history[i];
      if (h.virtual) {
        continue;
      }
      if (h.result !== MoveResult.SUCCESS) {
        break;
      }
      const histMove = allMoves[h.move];
      if (!histMove || histMove.category === MoveCategory.STATUS) {
        break;
      }
      consecutive++;
    }

    if (consecutive <= 0) {
      return false;
    }

    args[0].value += consecutive * this.bpPerAttack;
    return true;
  }
}

export class FieldProtectFoeStatAbAttr extends PreStatChangeAbAttr {
  private protectedStat: BattleStat;

  constructor(stat: BattleStat) {
    super();
    this.protectedStat = stat;
  }

  applyPreStatChange(pokemon: Pokemon, passive: boolean, simulated: boolean, stat: BattleStat, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (stat === this.protectedStat) {
      cancelled.value = true;
      return true;
    }
    return false;
  }
}

export class ReverseTypeConversionAbAttr extends PreAttackAbAttr {
  constructor() {
    super(false);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    const defenderTypes = defender.getTypes(true, true);
    let bestType = move.type;
    let bestMultiplier = 0;
    for (const type of [Type.NORMAL, Type.FIRE, Type.WATER, Type.ELECTRIC, Type.GRASS, Type.ICE,
      Type.FIGHTING, Type.POISON, Type.GROUND, Type.FLYING, Type.PSYCHIC, Type.BUG,
      Type.ROCK, Type.GHOST, Type.DRAGON, Type.DARK, Type.STEEL, Type.FAIRY]) {
      let mult = 1;
      for (const dt of defenderTypes) {
        mult *= getTypeDamageMultiplier(type, dt);
      }
      if (mult > bestMultiplier) {
        bestMultiplier = mult;
        bestType = type;
      }
    }
    if (bestType !== move.type) {
      move.type = bestType;
      return true;
    }
    return false;
  }
}

export class SuppressAbilitiesWhileConditionAbAttr extends AbAttr {
  private condition: (pokemon: Pokemon) => boolean;

  constructor(condition: (pokemon: Pokemon) => boolean) {
    super(false);
    this.condition = condition;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const ability = args[0] as Ability | undefined;
    if (!ability) {
      return false;
    }
    if (this.condition(pokemon) && !ability.hasAttr(UnsuppressableAbilityAbAttr)) {
      cancelled.value = true;
      return true;
    }
    return false;
  }
}
export class SuppressSecondaryEffectsWhileConditionAbAttr extends AbAttr {
  private condition: (pokemon: Pokemon) => boolean;

  constructor(condition: (pokemon: Pokemon) => boolean) {
    super(false);
    this.condition = condition;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder | null, args: any[]): boolean {
    const moveChance = args[0] as Utils.NumberHolder | undefined;
    const move = args[1] as Move | undefined;
    if (!moveChance || !move) {
      return false;
    }
    if (moveChance.value <= 0 || move.id === Moves.ORDER_UP) {
      return false;
    }
    if (this.condition(pokemon)) {
      moveChance.value = 0;
      return true;
    }
    return false;
  }
}

export class PostMissStatAndHealAbAttr extends PostAttackAbAttr {
  private stat: BattleStat;
  private levels: integer;
  private healRatio: number;

  constructor(stat: BattleStat, levels: integer = 1, healRatio: number = 0.25) {
    super((user, target, move) => move.category !== MoveCategory.STATUS);
    this.stat = stat;
    this.levels = levels;
    this.healRatio = healRatio;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean {
    if (simulated || hitResult !== HitResult.MISS) {
      return false;
    }
    if (move.category === MoveCategory.STATUS) {
      return false;
    }
    if (pokemon.turnData.fogBodyMissProcdThisMove) {
      return false;
    }
    const acc = move.accuracy ?? 100;
    if (acc > 0 && acc < 50) {
      return false;
    }
    pokemon.turnData.fogBodyMissProcdThisMove = true;
    pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [this.stat], this.levels));
    const healAmount = Math.max(1, Math.floor(pokemon.getMaxHp() * this.healRatio));
    pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount,
      getPokemonNameWithAffix(pokemon) + ` missed and regrouped!`, true));
    return true;
  }
}

export class PostTurnDamageAllMatchingOpponentsAbAttr extends PostTurnAbAttr {
  constructor(
    private ratio: number,
    private condition: (pokemon: Pokemon, opponent: Pokemon) => boolean
  ) {
    super();
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) return false;
    let applied = false;
    for (const opponent of pokemon.getOpponents()) {
      if (!this.condition(pokemon, opponent)) continue;
      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, opponent, cancelled);
      if (cancelled.value) continue;
      const damage = Math.max(1, Utils.toDmgValue(opponent.getMaxHp() * this.ratio));
      opponent.damageAndUpdate(damage, HitResult.OTHER);
      applied = true;
    }
    return applied;
  }
}

export class PostTurnDamageAbAttr extends PostTurnAbAttr {
  constructor(
      private ratio: number,
      private condition: PokemonFieldCondition = () => true,
      private selfTarget: boolean = false
  ) {
    super();
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const opponent = pokemon.getOpponents()[0];
    const conditionOpponent = opponent ?? pokemon;
    if (!simulated && this.condition(pokemon, conditionOpponent)) {
      const target = this.selfTarget ? pokemon : opponent;
      if (!target) {
        return false;
      }
      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, target, cancelled);
      if (cancelled.value) {
        return false;
      }
      const damage = Math.max(1, Utils.toDmgValue(target.getMaxHp() * this.ratio));
      target.damageAndUpdate(damage, HitResult.OTHER);
      return true;
    }
    return false;
  }
}

export class PostDefendHealAbAttr extends PostDefendAbAttr {
  private condition: PokemonDefendCondition | boolean | number;
  private healRatio: number;
  private selfTarget: boolean;

  constructor(condition: PokemonDefendCondition | boolean | number = () => true, healRatio: number = 1/8, selfTarget: boolean = true) {
    super();
    this.condition = condition;
    this.healRatio = healRatio;
    this.selfTarget = selfTarget;
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && defendConditionMet(this.condition, pokemon, attacker, move)) {
      const targetPokemon = this.selfTarget ? pokemon : attacker;
      const healAmount = Math.floor(targetPokemon.getMaxHp() * this.healRatio);
      targetPokemon.scene.unshiftPhase(new PokemonHealPhase(targetPokemon.scene, targetPokemon.getBattlerIndex(), healAmount, getPokemonMessage(targetPokemon, i18next.t("abilityTriggers:restoredHP", { abilityName: targetPokemon.getAbility().name })), true));
      return true;
    }
    return false;
  }
}

export class PostAttackStealAndStatChangeAbAttr extends PostAttackAbAttr {
  private stealCondition: PokemonAttackCondition | boolean | number;
  private statCondition: PokemonAttackCondition | boolean | number;
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;

  constructor(
      stealCondition: PokemonAttackCondition | boolean | number = true,
      statCondition: PokemonAttackCondition | boolean | number = true,
      stats: BattleStat | BattleStat[],
      levels: integer,
      selfTarget: boolean = true
  ) {
    super();
    this.stealCondition = stealCondition;
    this.statCondition = statCondition;
    this.stats = Array.isArray(stats) ? stats : [stats];
    this.levels = levels;
    this.selfTarget = selfTarget;
  }

  async applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): Promise<boolean> {
      let stealSuccess = false;
      if (!simulated && pokemon != defender && attackConditionMet(this.stealCondition, pokemon, defender, move)) {
      const heldItems = this.getTargetHeldItems(defender).filter(i => i.isTransferrable);
        if (heldItems.length) {
          const stolenItem = heldItems[pokemon.randSeedInt(heldItems.length)];
          stealSuccess = await pokemon.scene.tryTransferHeldItemModifier(stolenItem, pokemon, false);
          if (stealSuccess) {
              pokemon.scene.queueMessage(i18next.t("abilityTriggers:postAttackStealHeldItem", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), defenderName: defender.name, stolenItemType: stolenItem.type.name }));
          }
        }
      }

      if (stealSuccess && attackConditionMet(this.statCondition, pokemon, defender, move)) {
        const target = this.selfTarget ? pokemon : defender;
      await new Promise<void>((resolve) => {
        target.scene.unshiftPhase(new StatChangePhase(target.scene, target.getBattlerIndex(), this.selfTarget, this.stats, this.levels));
        resolve();
      });
      }

    return stealSuccess;
  }

  getTargetHeldItems(target: Pokemon): PokemonHeldItemModifier[] {
    return target.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
        && (m as PokemonHeldItemModifier).pokemonId === target.id, target.isPlayer()) as PokemonHeldItemModifier[];
  }
}

export class OctoHitMinMaxAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if(simulated) {
      return false;
    }
    if ((args[0] as Utils.IntegerHolder).value !== MultiHitType._2_TO_5) {
      return false;
    }
    (args[0] as Utils.IntegerHolder).value = MultiHitType._4_TO_8;
    return true;
  }
}

export class PostTurnRandStatChangeAbAttr extends PostTurnAbAttr {
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;
  private condition: PokemonFieldCondition | boolean | number;

  constructor(stats: BattleStat[], levels: integer, condition: PokemonFieldCondition | boolean | number = () => true, selfTarget: boolean = true) {
    super(true);

    this.stats = stats;
    this.levels = levels;
    this.selfTarget = selfTarget;
    this.condition = condition;
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated && fieldConditionMet(this.condition, pokemon, pokemon.getOpponents()[0])) {
      const randomStat = this.stats[pokemon.randSeedInt(this.stats.length)];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), this.selfTarget, [randomStat], this.levels));
      return true;
    }
    return false;
  }
}

export class PostTurnCursedPotentialRollAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (simulated) {
      return true;
    }
    const doHpLoss = pokemon.randSeedInt(2) === 0;
    if (doHpLoss) {
      const dmg = Math.max(1, Math.floor(pokemon.getMaxHp() * 1/4));
      pokemon.damageAndUpdate(dmg, HitResult.OTHER, false, true, true);
      pokemon.turnData.damageTaken += dmg;
      return true;
    }
    const pool = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD];
    const count = 2 + pokemon.randSeedInt(2);
    for (let i = 0; i < count && pool.length; i++) {
      const stat = pool.splice(pokemon.randSeedInt(pool.length), 1)[0];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [stat], -1));
    }
    return true;
  }
}

export class PostAttackRandStatChangeAbAttr extends PostAttackAbAttr {
  private condition: PokemonAttackCondition;
  private stats: BattleStat[];
  private levels: integer;
  private selfTarget: boolean;

  constructor(condition: PokemonAttackCondition, levels: integer, stats: BattleStat[], selfTarget: boolean = false) {
    super();
    this.condition = condition;
    this.levels = levels;
    this.stats = stats;
    this.selfTarget = selfTarget;
  }

  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean | Promise<boolean> {
    const hit = hitResult < HitResult.NO_EFFECT || hitResult === HitResult.OTHER;
    if (simulated || !hit) {
      return false;
    }
    if (pokemon != defender && attackConditionMet(this.condition, pokemon, defender, move)) {
      const randomStat = this.stats[pokemon.randSeedInt(this.stats.length)];
      const target = this.selfTarget ? pokemon : defender;
       pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, target.getBattlerIndex(), this.selfTarget, [randomStat], this.levels));
      return true;
    }
    return false;
  }
}

export class ReceivedMoveDamageRandMultiplierAbAttr extends PreDefendAbAttr {
  protected condition: PokemonDefendCondition;
  protected powerMultiplierMin: number;
  protected powerMultiplierMax: number;

  constructor(condition: PokemonDefendCondition, powerMultiplierMin: number, powerMultiplierMax: number) {
    super();

    this.condition = condition;
    this.powerMultiplierMin = powerMultiplierMin;
    this.powerMultiplierMax = powerMultiplierMax;
  }

  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (!simulated && this.condition(pokemon, attacker, move)) {
      const powerMultiplier = Utils.randIntRange(this.powerMultiplierMin * 100, this.powerMultiplierMax * 100) / 100;
      (args[0] as Utils.NumberHolder).value *= powerMultiplier;
      return true;
    }

    return false;
  }
}
export const allAbilities = [ new Ability(Abilities.NONE, 3) ];

export function resolveAbility(id: Abilities): Ability {
  return allAbilities[id] ?? allAbilities[Abilities.NONE];
}

export function initAbilities() {
  allAbilities.push(
    new Ability(Abilities.STENCH, 3)
      .attr(PostAttackApplyBattlerTagAbAttr, false, (user, target, move) => !move.hasAttr(FlinchAttr) ? 10 : 0, BattlerTagType.FLINCHED),
    new Ability(Abilities.DRIZZLE, 3)
      .attr(PostSummonWeatherChangeAbAttr, WeatherType.RAIN)
      .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.RAIN),
    new Ability(Abilities.SPEED_BOOST, 3)
      .attr(PostTurnStatChangeAbAttr, BattleStat.SPD, 1),
    new Ability(Abilities.BATTLE_ARMOR, 3)
      .attr(BlockCritAbAttr)
      .ignorable(),
    new Ability(Abilities.STURDY, 3)
      .attr(PreDefendFullHpEndureAbAttr)
      .attr(BlockOneHitKOAbAttr)
      .ignorable(),
    new Ability(Abilities.DAMP, 3)
      .attr(FieldPreventExplosiveMovesAbAttr)
      .ignorable(),
    new Ability(Abilities.LIMBER, 3)
      .attr(StatusEffectImmunityAbAttr, StatusEffect.PARALYSIS)
      .ignorable(),
    new Ability(Abilities.SAND_VEIL, 3)
      .attr(BattleStatMultiplierAbAttr, BattleStat.EVA, 1.2)
      .attr(BlockWeatherDamageAttr, WeatherType.SANDSTORM)
      .condition(getWeatherCondition(WeatherType.SANDSTORM))
      .ignorable(),
    new Ability(Abilities.STATIC, 3)
      .attr(PostDefendContactApplyStatusEffectAbAttr, 30, StatusEffect.PARALYSIS)
      .bypassFaint(),
    new Ability(Abilities.VOLT_ABSORB, 3)
      .attr(TypeImmunityHealAbAttr, Type.ELECTRIC)
      .partial()
      .ignorable(),
    new Ability(Abilities.WATER_ABSORB, 3)
      .attr(TypeImmunityHealAbAttr, Type.WATER)
      .partial()
      .ignorable(),
    new Ability(Abilities.OBLIVIOUS, 3)
      .attr(BattlerTagImmunityAbAttr, BattlerTagType.INFATUATED)
      .attr(IntimidateImmunityAbAttr)
      .ignorable(),
    new Ability(Abilities.CLOUD_NINE, 3)
      .attr(SuppressWeatherEffectAbAttr, true)
      .attr(PostSummonUnnamedMessageAbAttr, i18next.t("abilityTriggers:weatherEffectDisappeared"))
      .attr(PostSummonWeatherSuppressedFormChangeAbAttr)
      .attr(PostFaintUnsuppressedWeatherFormChangeAbAttr)
      .bypassFaint(),
    new Ability(Abilities.COMPOUND_EYES, 3)
      .attr(BattleStatMultiplierAbAttr, BattleStat.ACC, 1.3),
    new Ability(Abilities.INSOMNIA, 3)
      .attr(StatusEffectImmunityAbAttr, StatusEffect.SLEEP)
      .attr(BattlerTagImmunityAbAttr, BattlerTagType.DROWSY)
      .ignorable(),
    new Ability(Abilities.COLOR_CHANGE, 3)
      .attr(PostDefendTypeChangeAbAttr)
      .condition(getSheerForceHitDisableAbCondition()),
    new Ability(Abilities.IMMUNITY, 3)
      .attr(StatusEffectImmunityAbAttr, StatusEffect.POISON, StatusEffect.TOXIC)
      .ignorable(),
    new Ability(Abilities.FLASH_FIRE, 3)
      .attr(TypeImmunityAddBattlerTagAbAttr, Type.FIRE, BattlerTagType.FIRE_BOOST, 1)
      .ignorable(),
    new Ability(Abilities.SHIELD_DUST, 3)
      .attr(IgnoreMoveEffectsAbAttr)
      .partial(),
    new Ability(Abilities.OWN_TEMPO, 3)
      .attr(BattlerTagImmunityAbAttr, BattlerTagType.CONFUSED)
      .attr(IntimidateImmunityAbAttr)
      .ignorable(),
    new Ability(Abilities.SUCTION_CUPS, 3)
      .attr(ForceSwitchOutImmunityAbAttr)
      .ignorable(),
    new Ability(Abilities.INTIMIDATE, 3)
      .attr(PostSummonStatChangeAbAttr, BattleStat.ATK, -1, false, true),
    new Ability(Abilities.SHADOW_TAG, 3)
      .attr(ArenaTrapAbAttr, (user, target) => {
        if (target.hasAbility(Abilities.SHADOW_TAG)) {
          return false;
        }
        return true;
      }),
    new Ability(Abilities.ROUGH_SKIN, 3)
      .attr(PostDefendContactDamageAbAttr, 8)
      .bypassFaint(),
    new Ability(Abilities.WONDER_GUARD, 3)
      .attr(NonSuperEffectiveImmunityAbAttr)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .ignorable(),
    new Ability(Abilities.LEVITATE, 3)
      .attr(AttackTypeImmunityAbAttr, Type.GROUND, (pokemon: Pokemon) => !pokemon.getTag(GroundedTag) && !pokemon.scene.arena.getTag(ArenaTagType.GRAVITY))
      .ignorable(),
    new Ability(Abilities.EFFECT_SPORE, 3)
      .attr(EffectSporeAbAttr),
    new Ability(Abilities.SYNCHRONIZE, 3)
      .attr(SyncEncounterNatureAbAttr)
      .unimplemented(),
    new Ability(Abilities.CLEAR_BODY, 3)
      .attr(ProtectStatAbAttr)
      .ignorable(),
    new Ability(Abilities.NATURAL_CURE, 3)
      .attr(PreSwitchOutResetStatusAbAttr),
    new Ability(Abilities.LIGHTNING_ROD, 3)
      .attr(RedirectTypeMoveAbAttr, Type.ELECTRIC)
      .attr(TypeImmunityStatChangeAbAttr, Type.ELECTRIC, BattleStat.SPATK, 1)
      .ignorable(),
    new Ability(Abilities.SERENE_GRACE, 3)
      .attr(MoveEffectChanceMultiplierAbAttr, 2)
      .partial(),
    new Ability(Abilities.SWIFT_SWIM, 3)
      .attr(BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
      .condition(getWeatherCondition(WeatherType.RAIN, WeatherType.HEAVY_RAIN)),
    new Ability(Abilities.CHLOROPHYLL, 3)
      .attr(BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
      .condition(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN)),
    new Ability(Abilities.ILLUMINATE, 3)
      .attr(ProtectStatAbAttr, BattleStat.ACC)
      .attr(DoubleBattleChanceAbAttr)
      .ignorable(),
    new Ability(Abilities.TRACE, 3)
      .attr(PostSummonCopyAbilityAbAttr)
      .attr(UncopiableAbilityAbAttr),
    new Ability(Abilities.HUGE_POWER, 3)
      .attr(BattleStatMultiplierAbAttr, BattleStat.ATK, 2),
    new Ability(Abilities.POISON_POINT, 3)
      .attr(PostDefendContactApplyStatusEffectAbAttr, 30, StatusEffect.POISON)
      .bypassFaint(),
    new Ability(Abilities.INNER_FOCUS, 3)
      .attr(BattlerTagImmunityAbAttr, BattlerTagType.FLINCHED)
      .attr(IntimidateImmunityAbAttr)
      .ignorable(),
    new Ability(Abilities.MAGMA_ARMOR, 3)
      .attr(StatusEffectImmunityAbAttr, StatusEffect.FREEZE)
      .ignorable(),
    new Ability(Abilities.WATER_VEIL, 3)
      .attr(StatusEffectImmunityAbAttr, StatusEffect.BURN)
      .ignorable(),
    new Ability(Abilities.MAGNET_PULL, 3)
      .attr(ArenaTrapAbAttr, (user, target) => {
        if (target.getTypes(true).includes(Type.STEEL) || (target.getTypes(true).includes(Type.STELLAR) && target.getTypes().includes(Type.STEEL))) {
          return true;
        }
        return false;
      }),
    new Ability(Abilities.SOUNDPROOF, 3)
      .attr(MoveImmunityAbAttr, (pokemon, attacker, move) => pokemon !== attacker && move.hasFlag(MoveFlags.SOUND_BASED))
      .ignorable(),
    new Ability(Abilities.RAIN_DISH, 3)
      .attr(PostWeatherLapseHealAbAttr, 1, WeatherType.RAIN, WeatherType.HEAVY_RAIN)
      .partial(),
    new Ability(Abilities.SAND_STREAM, 3)
      .attr(PostSummonWeatherChangeAbAttr, WeatherType.SANDSTORM)
      .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.SANDSTORM),
    new Ability(Abilities.PRESSURE, 3)
      .attr(IncreasePpAbAttr)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonPressure", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) })),
    new Ability(Abilities.THICK_FAT, 3)
      .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIRE, 0.5)
      .attr(ReceivedTypeDamageMultiplierAbAttr, Type.ICE, 0.5)
      .ignorable(),
    new Ability(Abilities.EARLY_BIRD, 3)
      .attr(ReduceStatusEffectDurationAbAttr, StatusEffect.SLEEP),
    new Ability(Abilities.FLAME_BODY, 3)
      .attr(PostDefendContactApplyStatusEffectAbAttr, 30, StatusEffect.BURN)
      .bypassFaint(),
    new Ability(Abilities.RUN_AWAY, 3)
      .attr(RunSuccessAbAttr),
    new Ability(Abilities.KEEN_EYE, 3)
      .attr(ProtectStatAbAttr, BattleStat.ACC)
      .ignorable(),
    new Ability(Abilities.HYPER_CUTTER, 3)
      .attr(ProtectStatAbAttr, BattleStat.ATK)
      .ignorable(),
    new Ability(Abilities.PICKUP, 3)
      .attr(PostBattleLootAbAttr),
    new Ability(Abilities.TRUANT, 3)
      .attr(PostSummonAddBattlerTagAbAttr, BattlerTagType.TRUANT, 1, false),
    new Ability(Abilities.HUSTLE, 3)
      .attr(BattleStatMultiplierAbAttr, BattleStat.ATK, 1.5)
      .attr(BattleStatMultiplierAbAttr, BattleStat.ACC, 0.8, (user, target, move) => move.category === MoveCategory.PHYSICAL),
    new Ability(Abilities.CUTE_CHARM, 3)
      .attr(PostDefendContactApplyTagChanceAbAttr, 30, BattlerTagType.INFATUATED),
    new Ability(Abilities.PLUS, 3)
      .conditionalAttr(p => p.scene.currentBattle.double && [Abilities.PLUS, Abilities.MINUS].some(a => p.getAlly().hasAbility(a)), BattleStatMultiplierAbAttr, BattleStat.SPATK, 1.5)
      .ignorable(),
    new Ability(Abilities.MINUS, 3)
      .conditionalAttr(p => p.scene.currentBattle.double && [Abilities.PLUS, Abilities.MINUS].some(a => p.getAlly().hasAbility(a)), BattleStatMultiplierAbAttr, BattleStat.SPATK, 1.5)
      .ignorable(),
    new Ability(Abilities.FORECAST, 3)
      .attr(UncopiableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .attr(PostSummonFormChangeByWeatherAbAttr, Abilities.FORECAST)
      .attr(PostWeatherChangeFormChangeAbAttr, Abilities.FORECAST),
    new Ability(Abilities.STICKY_HOLD, 3)
      .attr(BlockItemTheftAbAttr)
      .bypassFaint()
      .ignorable(),
    new Ability(Abilities.SHED_SKIN, 3)
      .conditionalAttr(pokemon => !Utils.randSeedInt(3), PostTurnResetStatusAbAttr),
    new Ability(Abilities.GUTS, 3)
      .attr(BypassBurnDamageReductionAbAttr)
      .conditionalAttr(pokemon => !!pokemon.status || pokemon.hasAbility(Abilities.COMATOSE), BattleStatMultiplierAbAttr, BattleStat.ATK, 1.5),
    new Ability(Abilities.MARVEL_SCALE, 3)
      .conditionalAttr(pokemon => !!pokemon.status || pokemon.hasAbility(Abilities.COMATOSE), BattleStatMultiplierAbAttr, BattleStat.DEF, 1.5)
      .ignorable(),
    new Ability(Abilities.LIQUID_OOZE, 3)
      .attr(ReverseDrainAbAttr),
    new Ability(Abilities.OVERGROW, 3)
      .attr(LowHpMoveTypePowerBoostAbAttr, Type.GRASS),
    new Ability(Abilities.BLAZE, 3)
      .attr(LowHpMoveTypePowerBoostAbAttr, Type.FIRE),
    new Ability(Abilities.TORRENT, 3)
      .attr(LowHpMoveTypePowerBoostAbAttr, Type.WATER),
    new Ability(Abilities.SWARM, 3)
      .attr(LowHpMoveTypePowerBoostAbAttr, Type.BUG),
    new Ability(Abilities.ROCK_HEAD, 3)
      .attr(BlockRecoilDamageAttr),
    new Ability(Abilities.DROUGHT, 3)
      .attr(PostSummonWeatherChangeAbAttr, WeatherType.SUNNY)
      .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.SUNNY),
    new Ability(Abilities.ARENA_TRAP, 3)
      .attr(ArenaTrapAbAttr, (user, target) => {
        if (target.isGrounded()) {
          return true;
        }
        return false;
      })
      .attr(DoubleBattleChanceAbAttr),
    new Ability(Abilities.VITAL_SPIRIT, 3)
      .attr(StatusEffectImmunityAbAttr, StatusEffect.SLEEP)
      .attr(BattlerTagImmunityAbAttr, BattlerTagType.DROWSY)
      .ignorable(),
    new Ability(Abilities.WHITE_SMOKE, 3)
      .attr(ProtectStatAbAttr)
      .ignorable(),
    new Ability(Abilities.PURE_POWER, 3)
      .attr(BattleStatMultiplierAbAttr, BattleStat.ATK, 2),
    new Ability(Abilities.SHELL_ARMOR, 3)
      .attr(BlockCritAbAttr)
      .ignorable(),
    new Ability(Abilities.AIR_LOCK, 3)
      .attr(SuppressWeatherEffectAbAttr, true)
      .attr(PostSummonUnnamedMessageAbAttr, i18next.t("abilityTriggers:weatherEffectDisappeared"))
      .attr(PostSummonWeatherSuppressedFormChangeAbAttr)
      .attr(PostFaintUnsuppressedWeatherFormChangeAbAttr)
      .bypassFaint(),
    new Ability(Abilities.TANGLED_FEET, 4)
      .conditionalAttr(pokemon => !!pokemon.getTag(BattlerTagType.CONFUSED), BattleStatMultiplierAbAttr, BattleStat.EVA, 2)
      .ignorable(),
    new Ability(Abilities.MOTOR_DRIVE, 4)
      .attr(TypeImmunityStatChangeAbAttr, Type.ELECTRIC, BattleStat.SPD, 1)
      .ignorable(),
    new Ability(Abilities.RIVALRY, 4)
      .attr(MovePowerBoostAbAttr, (user, target, move) => user?.gender !== Gender.GENDERLESS && target?.gender !== Gender.GENDERLESS && user?.gender === target?.gender, 1.25, true)
      .attr(MovePowerBoostAbAttr, (user, target, move) => user?.gender !== Gender.GENDERLESS && target?.gender !== Gender.GENDERLESS && user?.gender !== target?.gender, 0.75),
    new Ability(Abilities.STEADFAST, 4)
      .attr(FlinchStatChangeAbAttr, BattleStat.SPD, 1),
    new Ability(Abilities.SNOW_CLOAK, 4)
      .attr(BattleStatMultiplierAbAttr, BattleStat.EVA, 1.2)
      .attr(BlockWeatherDamageAttr, WeatherType.HAIL)
      .condition(getWeatherCondition(WeatherType.HAIL, WeatherType.SNOW))
      .ignorable(),
    new Ability(Abilities.GLUTTONY, 4)
      .attr(ReduceBerryUseThresholdAbAttr),
    new Ability(Abilities.ANGER_POINT, 4)
      .attr(PostDefendCritStatChangeAbAttr, BattleStat.ATK, 6),
    new Ability(Abilities.UNBURDEN, 4)
      .unimplemented(),
    new Ability(Abilities.HEATPROOF, 4)
      .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIRE, 0.5)
      .attr(ReduceBurnDamageAbAttr, 0.5)
      .ignorable(),
    new Ability(Abilities.SIMPLE, 4)
      .attr(StatChangeMultiplierAbAttr, 2)
      .ignorable(),
    new Ability(Abilities.DRY_SKIN, 4)
      .attr(PostWeatherLapseDamageAbAttr, 2, WeatherType.SUNNY, WeatherType.HARSH_SUN)
      .attr(PostWeatherLapseHealAbAttr, 2, WeatherType.RAIN, WeatherType.HEAVY_RAIN)
      .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIRE, 1.25)
      .attr(TypeImmunityHealAbAttr, Type.WATER)
      .partial()
      .ignorable(),
    new Ability(Abilities.DOWNLOAD, 4)
      .attr(DownloadAbAttr),
    new Ability(Abilities.IRON_FIST, 4)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.PUNCHING_MOVE), 1.2),
    new Ability(Abilities.POISON_HEAL, 4)
      .attr(PostTurnStatusHealAbAttr, StatusEffect.TOXIC, StatusEffect.POISON)
      .attr(BlockStatusDamageAbAttr, StatusEffect.TOXIC, StatusEffect.POISON),
    new Ability(Abilities.ADAPTABILITY, 4)
      .attr(StabBoostAbAttr),
    new Ability(Abilities.SKILL_LINK, 4)
      .attr(MaxMultiHitAbAttr),
    new Ability(Abilities.HYDRATION, 4)
      .attr(PostTurnResetStatusAbAttr)
      .condition(getWeatherCondition(WeatherType.RAIN, WeatherType.HEAVY_RAIN)),
    new Ability(Abilities.SOLAR_POWER, 4)
      .attr(PostWeatherLapseDamageAbAttr, 2, WeatherType.SUNNY, WeatherType.HARSH_SUN)
      .attr(BattleStatMultiplierAbAttr, BattleStat.SPATK, 1.5)
      .condition(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN)),
    new Ability(Abilities.QUICK_FEET, 4)
      .conditionalAttr(pokemon => pokemon.status ? pokemon.status.effect === StatusEffect.PARALYSIS : false, BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
      .conditionalAttr(pokemon => !!pokemon.status || pokemon.hasAbility(Abilities.COMATOSE), BattleStatMultiplierAbAttr, BattleStat.SPD, 1.5),
    new Ability(Abilities.NORMALIZE, 4)
      .attr(MoveTypeChangeAbAttr, Type.NORMAL, 1.2, (user, target, move) => {
        return ![Moves.HIDDEN_POWER, Moves.WEATHER_BALL, Moves.NATURAL_GIFT, Moves.JUDGMENT, Moves.TECHNO_BLAST].includes(move.id);
      }),
    new Ability(Abilities.SNIPER, 4)
      .attr(MultCritAbAttr, 1.5),
    new Ability(Abilities.MAGIC_GUARD, 4)
      .attr(BlockNonDirectDamageAbAttr),
    new Ability(Abilities.NO_GUARD, 4)
      .attr(AlwaysHitAbAttr)
      .attr(DoubleBattleChanceAbAttr),
    new Ability(Abilities.STALL, 4)
      .attr(ChangeMovePriorityAbAttr, (pokemon, move: Move) => true, -0.5),
    new Ability(Abilities.TECHNICIAN, 4)
      .attr(MovePowerBoostAbAttr, (user, target, move) => {
        const power = new Utils.NumberHolder(move.power);
        applyMoveAttrs(VariablePowerAttr, user, target, move, power);
        return power.value <= 60;
      }, 1.5),
    new Ability(Abilities.LEAF_GUARD, 4)
      .attr(StatusEffectImmunityAbAttr)
      .condition(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN))
      .ignorable(),
    new Ability(Abilities.KLUTZ, 4)
      .unimplemented(),
    new Ability(Abilities.MOLD_BREAKER, 4)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonMoldBreaker", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }))
      .attr(MoveAbilityBypassAbAttr),
    new Ability(Abilities.SUPER_LUCK, 4)
      .attr(BonusCritAbAttr)
      .partial(),
    new Ability(Abilities.AFTERMATH, 4)
      .attr(PostFaintContactDamageAbAttr,4)
      .bypassFaint(),
    new Ability(Abilities.ANTICIPATION, 4)
      .conditionalAttr(getAnticipationCondition(), PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonAnticipation", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) })),
    new Ability(Abilities.FOREWARN, 4)
      .attr(ForewarnAbAttr),
    new Ability(Abilities.UNAWARE, 4)
      .attr(IgnoreOpponentStatChangesAbAttr)
      .ignorable(),
    new Ability(Abilities.TINTED_LENS, 4)

      .attr(DamageBoostAbAttr, 2, (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) <= 0.5),
    new Ability(Abilities.FILTER, 4)
      .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.75)
      .ignorable(),
    new Ability(Abilities.SLOW_START, 4)
      .attr(PostSummonAddBattlerTagAbAttr, BattlerTagType.SLOW_START, 5),
    new Ability(Abilities.SCRAPPY, 4)
      .attr(IgnoreTypeImmunityAbAttr, Type.GHOST, [Type.NORMAL, Type.FIGHTING])
      .attr(IntimidateImmunityAbAttr),
    new Ability(Abilities.STORM_DRAIN, 4)
      .attr(RedirectTypeMoveAbAttr, Type.WATER)
      .attr(TypeImmunityStatChangeAbAttr, Type.WATER, BattleStat.SPATK, 1)
      .ignorable(),
    new Ability(Abilities.ICE_BODY, 4)
      .attr(BlockWeatherDamageAttr, WeatherType.HAIL)
      .attr(PostWeatherLapseHealAbAttr, 1, WeatherType.HAIL, WeatherType.SNOW)
      .partial(),
    new Ability(Abilities.SOLID_ROCK, 4)
      .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.75)
      .ignorable(),
    new Ability(Abilities.SNOW_WARNING, 4)
      .attr(PostSummonWeatherChangeAbAttr, WeatherType.SNOW)
      .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.SNOW),
    new Ability(Abilities.HONEY_GATHER, 4)
      .attr(MoneyAbAttr),
    new Ability(Abilities.FRISK, 4)
      .attr(FriskAbAttr),
    new Ability(Abilities.RECKLESS, 4)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.RECKLESS_MOVE), 1.2),
    new Ability(Abilities.MULTITYPE, 4)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr),
    new Ability(Abilities.FLOWER_GIFT, 4)
      .conditionalAttr(getWeatherCondition(WeatherType.SUNNY || WeatherType.HARSH_SUN), BattleStatMultiplierAbAttr, BattleStat.ATK, 1.5)
      .conditionalAttr(getWeatherCondition(WeatherType.SUNNY || WeatherType.HARSH_SUN), BattleStatMultiplierAbAttr, BattleStat.SPDEF, 1.5)
      .attr(UncopiableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .ignorable()
      .partial(),
    new Ability(Abilities.BAD_DREAMS, 4)
      .attr(PostTurnHurtIfSleepingAbAttr),
    new Ability(Abilities.PICKPOCKET, 5)
      .attr(PostDefendStealHeldItemAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT))
      .condition(getSheerForceHitDisableAbCondition()),
    new Ability(Abilities.SHEER_FORCE, 5)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.chance >= 1, 5461/4096)
      .attr(MoveEffectChanceMultiplierAbAttr, 0)
      .partial(),
    new Ability(Abilities.CONTRARY, 5)
      .attr(StatChangeMultiplierAbAttr, -1)
      .ignorable(),
    new Ability(Abilities.UNNERVE, 5)
      .attr(PreventBerryUseAbAttr),
    new Ability(Abilities.DEFIANT, 5)
      .attr(PostStatChangeStatChangeAbAttr, (target, statsChanged, levels) => levels < 0, [BattleStat.ATK], 2),
    new Ability(Abilities.DEFEATIST, 5)
      .attr(BattleStatMultiplierAbAttr, BattleStat.ATK, 0.5)
      .attr(BattleStatMultiplierAbAttr, BattleStat.SPATK, 0.5)
      .condition((pokemon) => pokemon.getHpRatio() <= 0.5),
    new Ability(Abilities.CURSED_BODY, 5)
      .attr(PostDefendMoveDisableAbAttr, 30)
      .bypassFaint(),
    new Ability(Abilities.HEALER, 5)
      .conditionalAttr(pokemon => pokemon.getAlly() && Utils.randSeedInt(10) < 3, PostTurnResetStatusAbAttr, true),
    new Ability(Abilities.FRIEND_GUARD, 5)
      .ignorable()
      .unimplemented(),
    new Ability(Abilities.WEAK_ARMOR, 5)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, BattleStat.DEF, -1)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, BattleStat.SPD, 2),
    new Ability(Abilities.HEAVY_METAL, 5)
      .attr(WeightMultiplierAbAttr, 2)
      .ignorable(),
    new Ability(Abilities.LIGHT_METAL, 5)
      .attr(WeightMultiplierAbAttr, 0.5)
      .ignorable(),
    new Ability(Abilities.MULTISCALE, 5)
      .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => target.isFullHp(), 0.5)
      .ignorable(),
    new Ability(Abilities.TOXIC_BOOST, 5)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.category === MoveCategory.PHYSICAL && (user?.status?.effect === StatusEffect.POISON || user?.status?.effect === StatusEffect.TOXIC), 1.5),
    new Ability(Abilities.FLARE_BOOST, 5)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.category === MoveCategory.SPECIAL && user?.status?.effect === StatusEffect.BURN, 1.5),
    new Ability(Abilities.HARVEST, 5)
      .attr(
        PostTurnLootAbAttr,
        "EATEN_BERRIES",

        (pokemon) => 0.5 * (getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN)(pokemon) ? 2 : 1)
      )
      .partial(),
    new Ability(Abilities.TELEPATHY, 5)
      .attr(MoveImmunityAbAttr, (pokemon, attacker, move) => pokemon.getAlly() === attacker && move instanceof AttackMove)
      .ignorable(),
    new Ability(Abilities.MOODY, 5)
      .attr(MoodyAbAttr),
    new Ability(Abilities.OVERCOAT, 5)
      .attr(BlockWeatherDamageAttr)
      .attr(MoveImmunityAbAttr, (pokemon, attacker, move) => pokemon !== attacker && move.hasFlag(MoveFlags.POWDER_MOVE))
      .ignorable(),
    new Ability(Abilities.POISON_TOUCH, 5)
      .attr(PostAttackContactApplyStatusEffectAbAttr, 30, StatusEffect.POISON),
    new Ability(Abilities.REGENERATOR, 5)
      .attr(PreSwitchOutHealAbAttr),
    new Ability(Abilities.BIG_PECKS, 5)
      .attr(ProtectStatAbAttr, BattleStat.DEF)
      .ignorable(),
    new Ability(Abilities.SAND_RUSH, 5)
      .attr(BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
      .attr(BlockWeatherDamageAttr, WeatherType.SANDSTORM)
      .condition(getWeatherCondition(WeatherType.SANDSTORM)),
    new Ability(Abilities.WONDER_SKIN, 5)
      .attr(WonderSkinAbAttr)
      .ignorable(),
    new Ability(Abilities.ANALYTIC, 5)

      .attr(MovePowerBoostAbAttr, (user, target, move) => !!target?.getLastXMoves(1).find(m => m.turn === target?.scene.currentBattle.turn) || user.scene.currentBattle.turnCommands[target.getBattlerIndex()].command !== Command.FIGHT, 1.3),
    new Ability(Abilities.ILLUSION, 5)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .unimplemented(),
    new Ability(Abilities.IMPOSTER, 5)
      .attr(PostSummonTransformAbAttr)
      .attr(UncopiableAbilityAbAttr),
    new Ability(Abilities.INFILTRATOR, 5)
      .unimplemented(),
    new Ability(Abilities.MUMMY, 5)
      .attr(PostDefendAbilityGiveAbAttr, Abilities.MUMMY)
      .bypassFaint(),
    new Ability(Abilities.MOXIE, 5)
      .attr(PostVictoryStatChangeAbAttr, BattleStat.ATK, 1),
    new Ability(Abilities.JUSTIFIED, 5)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.type === Type.DARK && move.category !== MoveCategory.STATUS, BattleStat.ATK, 1),
    new Ability(Abilities.RATTLED, 5)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS && (move.type === Type.DARK || move.type === Type.BUG ||
        move.type === Type.GHOST), BattleStat.SPD, 1)
      .attr(PostIntimidateStatChangeAbAttr, [BattleStat.SPD], 1),
    new Ability(Abilities.MAGIC_BOUNCE, 5)
      .ignorable()
      .unimplemented(),
    new Ability(Abilities.SAP_SIPPER, 5)
      .attr(TypeImmunityStatChangeAbAttr, Type.GRASS, BattleStat.ATK, 1)
      .ignorable(),
    new Ability(Abilities.PRANKSTER, 5)
      .attr(ChangeMovePriorityAbAttr, (pokemon, move: Move) => move.category === MoveCategory.STATUS, 1),
    new Ability(Abilities.SAND_FORCE, 5)
      .attr(MoveTypePowerBoostAbAttr, Type.ROCK, 1.3)
      .attr(MoveTypePowerBoostAbAttr, Type.GROUND, 1.3)
      .attr(MoveTypePowerBoostAbAttr, Type.STEEL, 1.3)
      .attr(BlockWeatherDamageAttr, WeatherType.SANDSTORM)
      .condition(getWeatherCondition(WeatherType.SANDSTORM)),
    new Ability(Abilities.IRON_BARBS, 5)
      .attr(PostDefendContactDamageAbAttr, 8)
      .bypassFaint(),
    new Ability(Abilities.ZEN_MODE, 5)
      .attr(PostBattleInitFormChangeAbAttr, () => 0)
      .attr(PostSummonFormChangeAbAttr, p => p.getHpRatio() <= 0.5 ? 1 : 0)
      .attr(PostTurnFormChangeAbAttr, p => p.getHpRatio() <= 0.5 ? 1 : 0)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .bypassFaint(),
    new Ability(Abilities.VICTORY_STAR, 5)
      .attr(BattleStatMultiplierAbAttr, BattleStat.ACC, 1.1)
      .partial(),
    new Ability(Abilities.TURBOBLAZE, 5)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonTurboblaze", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }))
      .attr(MoveAbilityBypassAbAttr),
    new Ability(Abilities.TERAVOLT, 5)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonTeravolt", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }))
      .attr(MoveAbilityBypassAbAttr),
    new Ability(Abilities.AROMA_VEIL, 6)
      .ignorable()
      .unimplemented(),
    new Ability(Abilities.FLOWER_VEIL, 6)
      .ignorable()
      .unimplemented(),
    new Ability(Abilities.CHEEK_POUCH, 6)
      .attr(HealFromBerryUseAbAttr, 1/3)
      .partial(),
    new Ability(Abilities.PROTEAN, 6)
      .attr(PokemonTypeChangeAbAttr),

    new Ability(Abilities.FUR_COAT, 6)
      .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, 0.5)
      .ignorable(),
    new Ability(Abilities.MAGICIAN, 6)
      .attr(PostAttackStealHeldItemAbAttr),
    new Ability(Abilities.BULLETPROOF, 6)
      .attr(MoveImmunityAbAttr, (pokemon, attacker, move) => pokemon !== attacker && move.hasFlag(MoveFlags.BALLBOMB_MOVE))
      .ignorable(),
    new Ability(Abilities.COMPETITIVE, 6)
      .attr(PostStatChangeStatChangeAbAttr, (target, statsChanged, levels) => levels < 0, [BattleStat.SPATK], 2),
    new Ability(Abilities.STRONG_JAW, 6)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.BITING_MOVE), 1.5),
    new Ability(Abilities.REFRIGERATE, 6)
      .attr(MoveTypeChangeAbAttr, Type.ICE, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr)),
    new Ability(Abilities.SWEET_VEIL, 6)
      .attr(UserFieldStatusEffectImmunityAbAttr, StatusEffect.SLEEP)
      .attr(UserFieldBattlerTagImmunityAbAttr, BattlerTagType.DROWSY)
      .ignorable()
      .partial(),
    new Ability(Abilities.STANCE_CHANGE, 6)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr),
    new Ability(Abilities.GALE_WINGS, 6)
      .attr(ChangeMovePriorityAbAttr, (pokemon, move) => pokemon.isFullHp() && move.type === Type.FLYING, 1),
    new Ability(Abilities.MEGA_LAUNCHER, 6)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.PULSE_MOVE), 1.5),
    new Ability(Abilities.GRASS_PELT, 6)
      .conditionalAttr(getTerrainCondition(TerrainType.GRASSY), BattleStatMultiplierAbAttr, BattleStat.DEF, 1.5)
      .ignorable(),
    new Ability(Abilities.SYMBIOSIS, 6)
      .unimplemented(),
    new Ability(Abilities.TOUGH_CLAWS, 6)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 1.3),
    new Ability(Abilities.PIXILATE, 6)
      .attr(MoveTypeChangeAbAttr, Type.FAIRY, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr)),
    new Ability(Abilities.GOOEY, 6)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), BattleStat.SPD, -1, false),
    new Ability(Abilities.AERILATE, 6)
      .attr(MoveTypeChangeAbAttr, Type.FLYING, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr)),
    new Ability(Abilities.PARENTAL_BOND, 6)
      .attr(AddSecondStrikeAbAttr, 0.25),
    new Ability(Abilities.DARK_AURA, 6)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonDarkAura", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }))
      .attr(FieldMoveTypePowerBoostAbAttr, Type.DARK, 4 / 3),
    new Ability(Abilities.FAIRY_AURA, 6)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonFairyAura", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }))
      .attr(FieldMoveTypePowerBoostAbAttr, Type.FAIRY, 4 / 3),
    new Ability(Abilities.AURA_BREAK, 6)
      .ignorable()
      .conditionalAttr(target => target.hasAbility(Abilities.DARK_AURA), FieldMoveTypePowerBoostAbAttr, Type.DARK, 9 / 16)
      .conditionalAttr(target => target.hasAbility(Abilities.FAIRY_AURA), FieldMoveTypePowerBoostAbAttr, Type.FAIRY, 9 / 16),
    new Ability(Abilities.PRIMORDIAL_SEA, 6)
      .attr(PostSummonWeatherChangeAbAttr, WeatherType.HEAVY_RAIN)
      .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.HEAVY_RAIN)
      .attr(PreSwitchOutClearWeatherAbAttr)
      .attr(PostFaintClearWeatherAbAttr)
      .bypassFaint(),
    new Ability(Abilities.DESOLATE_LAND, 6)
      .attr(PostSummonWeatherChangeAbAttr, WeatherType.HARSH_SUN)
      .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.HARSH_SUN)
      .attr(PreSwitchOutClearWeatherAbAttr)
      .attr(PostFaintClearWeatherAbAttr)
      .bypassFaint(),
    new Ability(Abilities.DELTA_STREAM, 6)
      .attr(PostSummonWeatherChangeAbAttr, WeatherType.STRONG_WINDS)
      .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.STRONG_WINDS)
      .attr(PreSwitchOutClearWeatherAbAttr)
      .attr(PostFaintClearWeatherAbAttr)
      .bypassFaint(),
    new Ability(Abilities.STAMINA, 7)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS, BattleStat.DEF, 1),
    new Ability(Abilities.WIMP_OUT, 7)
      .condition(getSheerForceHitDisableAbCondition())
      .unimplemented(),
    new Ability(Abilities.EMERGENCY_EXIT, 7)
      .condition(getSheerForceHitDisableAbCondition())
      .unimplemented(),
    new Ability(Abilities.WATER_COMPACTION, 7)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.type === Type.WATER && move.category !== MoveCategory.STATUS, BattleStat.DEF, 2),
    new Ability(Abilities.MERCILESS, 7)
      .attr(ConditionalCritAbAttr, (user, target, move) => target?.status?.effect === StatusEffect.TOXIC || target?.status?.effect === StatusEffect.POISON),
    new Ability(Abilities.SHIELDS_DOWN, 7)
      .attr(PostBattleInitFormChangeAbAttr, () => 0)
      .attr(PostSummonFormChangeAbAttr, p => p.formIndex % 7 + (p.getHpRatio() <= 0.5 ? 7 : 0))
      .attr(PostTurnFormChangeAbAttr, p => p.formIndex % 7 + (p.getHpRatio() <= 0.5 ? 7 : 0))
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .bypassFaint()
      .partial(),
    new Ability(Abilities.STAKEOUT, 7)

      .attr(MovePowerBoostAbAttr, (user, target, move) => user.scene.currentBattle.turnCommands[target.getBattlerIndex()].command === Command.POKEMON, 2),
    new Ability(Abilities.WATER_BUBBLE, 7)
      .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIRE, 0.5)
      .attr(MoveTypePowerBoostAbAttr, Type.WATER, 2)
      .attr(StatusEffectImmunityAbAttr, StatusEffect.BURN)
      .ignorable(),
    new Ability(Abilities.STEELWORKER, 7)
      .attr(MoveTypePowerBoostAbAttr, Type.STEEL),
    new Ability(Abilities.BERSERK, 7)
      .attr(PostDefendHpGatedStatChangeAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS, 0.5, [BattleStat.SPATK], 1)
      .condition(getSheerForceHitDisableAbCondition()),
    new Ability(Abilities.SLUSH_RUSH, 7)
      .attr(BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
      .condition(getWeatherCondition(WeatherType.HAIL, WeatherType.SNOW)),
    new Ability(Abilities.LONG_REACH, 7)
      .attr(IgnoreContactAbAttr),
    new Ability(Abilities.LIQUID_VOICE, 7)
      .attr(MoveTypeChangeAbAttr, Type.WATER, 1, (user, target, move) => move.hasFlag(MoveFlags.SOUND_BASED)),
    new Ability(Abilities.TRIAGE, 7)
      .attr(ChangeMovePriorityAbAttr, (pokemon, move) => move.hasFlag(MoveFlags.TRIAGE_MOVE), 3),
    new Ability(Abilities.GALVANIZE, 7)
      .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr)),
    new Ability(Abilities.SURGE_SURFER, 7)
      .conditionalAttr(getTerrainCondition(TerrainType.ELECTRIC), BattleStatMultiplierAbAttr, BattleStat.SPD, 2),
    new Ability(Abilities.SCHOOLING, 7)
      .attr(PostBattleInitFormChangeAbAttr, () => 0)
      .attr(PostSummonFormChangeAbAttr, p => p.level < 20 || p.getHpRatio() <= 0.25 ? 0 : 1)
      .attr(PostTurnFormChangeAbAttr, p => p.level < 20 || p.getHpRatio() <= 0.25 ? 0 : 1)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .bypassFaint(),
    new Ability(Abilities.DISGUISE, 7)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)

      .conditionalAttr(pokemon => pokemon.formIndex === 0, PostSummonAddBattlerTagAbAttr, BattlerTagType.DISGUISE, 0, false)
      .attr(FormBlockDamageAbAttr, (target, user, move) => !!target.getTag(BattlerTagType.DISGUISE) && target.getAttackTypeEffectiveness(move.type, user) > 0, 0, BattlerTagType.DISGUISE,
        (pokemon, abilityName) => i18next.t("abilityTriggers:disguiseAvoidedDamage", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName: abilityName }),
        (pokemon) => Utils.toDmgValue(pokemon.getMaxHp() / 8))
      .attr(PostBattleInitFormChangeAbAttr, () => 0)
      .bypassFaint()
      .ignorable(),
    new Ability(Abilities.BATTLE_BOND, 7)
      .attr(PostVictoryFormChangeAbAttr, () => 2)
      .attr(PostBattleInitFormChangeAbAttr, () => 1)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .bypassFaint(),
    new Ability(Abilities.POWER_CONSTRUCT, 7)
      .attr(PostBattleInitFormChangeAbAttr, () => 2)
      .attr(PostSummonFormChangeAbAttr, p => p.getHpRatio() <= 0.5 || p.getFormKey() === "complete" ? 4 : 2)
      .attr(PostTurnFormChangeAbAttr, p => p.getHpRatio() <= 0.5 || p.getFormKey() === "complete" ? 4 : 2)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .bypassFaint()
      .partial(),
    new Ability(Abilities.CORROSION, 7)
      .attr(IgnoreTypeStatusEffectImmunityAbAttr, [StatusEffect.POISON, StatusEffect.TOXIC], [Type.STEEL, Type.POISON])
      .partial(),
    new Ability(Abilities.COMATOSE, 7)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(StatusEffectImmunityAbAttr, ...getNonVolatileStatusEffects())
      .attr(BattlerTagImmunityAbAttr, BattlerTagType.DROWSY),
    new Ability(Abilities.QUEENLY_MAJESTY, 7)
      .attr(FieldPriorityMoveImmunityAbAttr)
      .ignorable(),
    new Ability(Abilities.INNARDS_OUT, 7)
      .attr(PostFaintHPDamageAbAttr)
      .bypassFaint(),
    new Ability(Abilities.DANCER, 7)
      .attr(PostDancingMoveAbAttr),
    new Ability(Abilities.BATTERY, 7)
      .attr(AllyMoveCategoryPowerBoostAbAttr, [MoveCategory.SPECIAL], 1.3),
    new Ability(Abilities.FLUFFY, 7)
      .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 0.5)
      .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.type === Type.FIRE, 2)
      .ignorable(),
    new Ability(Abilities.DAZZLING, 7)
      .attr(FieldPriorityMoveImmunityAbAttr)
      .ignorable(),
    new Ability(Abilities.SOUL_HEART, 7)
      .attr(PostKnockOutStatChangeAbAttr, BattleStat.SPATK, 1),
    new Ability(Abilities.TANGLING_HAIR, 7)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), BattleStat.SPD, -1, false),
    new Ability(Abilities.RECEIVER, 7)
      .attr(CopyFaintedAllyAbilityAbAttr)
      .attr(UncopiableAbilityAbAttr),
    new Ability(Abilities.POWER_OF_ALCHEMY, 7)
      .attr(CopyFaintedAllyAbilityAbAttr)
      .attr(UncopiableAbilityAbAttr),
    new Ability(Abilities.BEAST_BOOST, 7)
      .attr(PostVictoryStatChangeAbAttr, p => {
        const battleStats = Utils.getEnumValues(BattleStat).slice(0, -3).map(s => s as BattleStat);
        let highestBattleStat = 0;
        let highestBattleStatIndex = 0;
        battleStats.map((bs: BattleStat, i: integer) => {
          const stat = p.getStat(bs + 1);
          if (stat > highestBattleStat) {
            highestBattleStatIndex = i;
            highestBattleStat = stat;
          }
        });
        return highestBattleStatIndex;
      }, 1),
    new Ability(Abilities.RKS_SYSTEM, 7)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr),
    new Ability(Abilities.ELECTRIC_SURGE, 7)
      .attr(PostSummonTerrainChangeAbAttr, TerrainType.ELECTRIC)
      .attr(PostBiomeChangeTerrainChangeAbAttr, TerrainType.ELECTRIC),
    new Ability(Abilities.PSYCHIC_SURGE, 7)
      .attr(PostSummonTerrainChangeAbAttr, TerrainType.PSYCHIC)
      .attr(PostBiomeChangeTerrainChangeAbAttr, TerrainType.PSYCHIC),
    new Ability(Abilities.MISTY_SURGE, 7)
      .attr(PostSummonTerrainChangeAbAttr, TerrainType.MISTY)
      .attr(PostBiomeChangeTerrainChangeAbAttr, TerrainType.MISTY),
    new Ability(Abilities.GRASSY_SURGE, 7)
      .attr(PostSummonTerrainChangeAbAttr, TerrainType.GRASSY)
      .attr(PostBiomeChangeTerrainChangeAbAttr, TerrainType.GRASSY),
    new Ability(Abilities.FULL_METAL_BODY, 7)
      .attr(ProtectStatAbAttr),
    new Ability(Abilities.SHADOW_SHIELD, 7)
      .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => target.isFullHp(), 0.5),
    new Ability(Abilities.PRISM_ARMOR, 7)
      .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.75),
    new Ability(Abilities.NEUROFORCE, 7)

      .attr(MovePowerBoostAbAttr, (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 1.25),
    new Ability(Abilities.INTREPID_SWORD, 8)
      .attr(PostSummonStatChangeAbAttr, BattleStat.ATK, 1, true)
      .condition(getOncePerBattleCondition(Abilities.INTREPID_SWORD)),
    new Ability(Abilities.DAUNTLESS_SHIELD, 8)
      .attr(PostSummonStatChangeAbAttr, BattleStat.DEF, 1, true)
      .condition(getOncePerBattleCondition(Abilities.DAUNTLESS_SHIELD)),
    new Ability(Abilities.LIBERO, 8)
      .attr(PokemonTypeChangeAbAttr),

    new Ability(Abilities.BALL_FETCH, 8)
      .attr(FetchBallAbAttr)
      .condition(getOncePerBattleCondition(Abilities.BALL_FETCH)),
    new Ability(Abilities.COTTON_DOWN, 8)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS, BattleStat.SPD, -1, false, true)
      .bypassFaint(),
    new Ability(Abilities.PROPELLER_TAIL, 8)
      .attr(BlockRedirectAbAttr),
    new Ability(Abilities.MIRROR_ARMOR, 8)
      .ignorable()
      .unimplemented(),
    new Ability(Abilities.GULP_MISSILE, 8)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(PostDefendGulpMissileAbAttr),
    new Ability(Abilities.STALWART, 8)
      .attr(BlockRedirectAbAttr),
    new Ability(Abilities.STEAM_ENGINE, 8)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => (move.type === Type.FIRE || move.type === Type.WATER) && move.category !== MoveCategory.STATUS, BattleStat.SPD, 6),
    new Ability(Abilities.PUNK_ROCK, 8)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SOUND_BASED), 1.3)
      .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.hasFlag(MoveFlags.SOUND_BASED), 0.5)
      .ignorable(),
    new Ability(Abilities.SAND_SPIT, 8)
      .attr(PostDefendWeatherChangeAbAttr, WeatherType.SANDSTORM, (target, user, move) => move.category !== MoveCategory.STATUS),
    new Ability(Abilities.ICE_SCALES, 8)
      .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.SPECIAL, 0.5)
      .ignorable(),
    new Ability(Abilities.RIPEN, 8)
      .attr(DoubleBerryEffectAbAttr),
    new Ability(Abilities.ICE_FACE, 8)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)

      .conditionalAttr(pokemon => pokemon.formIndex === 0, PostSummonAddBattlerTagAbAttr, BattlerTagType.ICE_FACE, 0, false)

      .conditionalAttr(getWeatherCondition(WeatherType.HAIL, WeatherType.SNOW), PostSummonAddBattlerTagAbAttr, BattlerTagType.ICE_FACE, 0)

      .attr(PostWeatherChangeAddBattlerTagAttr, BattlerTagType.ICE_FACE, 0, WeatherType.HAIL, WeatherType.SNOW)
      .attr(FormBlockDamageAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL && !!target.getTag(BattlerTagType.ICE_FACE), 0, BattlerTagType.ICE_FACE,
        (pokemon, abilityName) => i18next.t("abilityTriggers:iceFaceAvoidedDamage", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName: abilityName }))
      .attr(PostBattleInitFormChangeAbAttr, () => 0)
      .bypassFaint()
      .ignorable(),
    new Ability(Abilities.POWER_SPOT, 8)
      .attr(AllyMoveCategoryPowerBoostAbAttr, [MoveCategory.SPECIAL, MoveCategory.PHYSICAL], 1.3),
    new Ability(Abilities.MIMICRY, 8)
      .unimplemented(),
    new Ability(Abilities.SCREEN_CLEANER, 8)
      .attr(PostSummonRemoveArenaTagAbAttr, [ArenaTagType.AURORA_VEIL, ArenaTagType.LIGHT_SCREEN, ArenaTagType.REFLECT]),
    new Ability(Abilities.STEELY_SPIRIT, 8)
      .attr(UserFieldMoveTypePowerBoostAbAttr, Type.STEEL),
    new Ability(Abilities.PERISH_BODY, 8)
      .attr(PostDefendPerishSongAbAttr, 4),
    new Ability(Abilities.WANDERING_SPIRIT, 8)
      .attr(PostDefendAbilitySwapAbAttr)
      .bypassFaint()
      .partial(),
    new Ability(Abilities.GORILLA_TACTICS, 8)
      .unimplemented(),
    new Ability(Abilities.NEUTRALIZING_GAS, 8)
      .attr(SuppressFieldAbilitiesAbAttr)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonNeutralizingGas", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }))
      .partial(),
    new Ability(Abilities.PASTEL_VEIL, 8)
      .attr(PostSummonUserFieldRemoveStatusEffectAbAttr, StatusEffect.POISON, StatusEffect.TOXIC)
      .attr(UserFieldStatusEffectImmunityAbAttr, StatusEffect.POISON, StatusEffect.TOXIC)
      .ignorable(),
    new Ability(Abilities.HUNGER_SWITCH, 8)

      .attr(PostTurnFormChangeAbAttr, p => p.getFormKey ? 0 : 1)

      .attr(PostTurnFormChangeAbAttr, p => p.getFormKey ? 1 : 0)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .condition((pokemon) => !pokemon.isTerastallized()),
    new Ability(Abilities.QUICK_DRAW, 8)
      .attr(BypassSpeedChanceAbAttr, 30),
    new Ability(Abilities.UNSEEN_FIST, 8)
      .attr(IgnoreProtectOnContactAbAttr),
    new Ability(Abilities.CURIOUS_MEDICINE, 8)
      .attr(PostSummonClearAllyStatsAbAttr),
    new Ability(Abilities.TRANSISTOR, 8)
      .attr(MoveTypePowerBoostAbAttr, Type.ELECTRIC),
    new Ability(Abilities.DRAGONS_MAW, 8)
      .attr(MoveTypePowerBoostAbAttr, Type.DRAGON),
    new Ability(Abilities.CHILLING_NEIGH, 8)
      .attr(PostVictoryStatChangeAbAttr, BattleStat.ATK, 1),
    new Ability(Abilities.GRIM_NEIGH, 8)
      .attr(PostVictoryStatChangeAbAttr, BattleStat.SPATK, 1),
    new Ability(Abilities.AS_ONE_GLASTRIER, 8)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonAsOneGlastrier", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }))
      .attr(PreventBerryUseAbAttr)
      .attr(PostVictoryStatChangeAbAttr, BattleStat.ATK, 1)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr),
    new Ability(Abilities.AS_ONE_SPECTRIER, 8)
      .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => i18next.t("abilityTriggers:postSummonAsOneSpectrier", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }))
      .attr(PreventBerryUseAbAttr)
      .attr(PostVictoryStatChangeAbAttr, BattleStat.SPATK, 1)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr),
    new Ability(Abilities.LINGERING_AROMA, 9)
      .attr(PostDefendAbilityGiveAbAttr, Abilities.LINGERING_AROMA)
      .bypassFaint(),
    new Ability(Abilities.SEED_SOWER, 9)
      .attr(PostDefendTerrainChangeAbAttr, TerrainType.GRASSY),
    new Ability(Abilities.THERMAL_EXCHANGE, 9)
      .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.type === Type.FIRE && move.category !== MoveCategory.STATUS, BattleStat.ATK, 1)
      .attr(StatusEffectImmunityAbAttr, StatusEffect.BURN)
      .ignorable(),
    new Ability(Abilities.ANGER_SHELL, 9)
      .attr(PostDefendHpGatedStatChangeAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS, 0.5, [ BattleStat.ATK, BattleStat.SPATK, BattleStat.SPD ], 1)
      .attr(PostDefendHpGatedStatChangeAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS, 0.5, [ BattleStat.DEF, BattleStat.SPDEF ], -1)
      .condition(getSheerForceHitDisableAbCondition()),
    new Ability(Abilities.PURIFYING_SALT, 9)
      .attr(StatusEffectImmunityAbAttr)
      .attr(ReceivedTypeDamageMultiplierAbAttr, Type.GHOST, 0.5)
      .ignorable(),
    new Ability(Abilities.WELL_BAKED_BODY, 9)
      .attr(TypeImmunityStatChangeAbAttr, Type.FIRE, BattleStat.DEF, 2)
      .ignorable(),
    new Ability(Abilities.WIND_RIDER, 9)
      .attr(MoveImmunityStatChangeAbAttr, (pokemon, attacker, move) => pokemon !== attacker && move.hasFlag(MoveFlags.WIND_MOVE) && move.category !== MoveCategory.STATUS, BattleStat.ATK, 1)
      .attr(PostSummonStatChangeOnArenaAbAttr, ArenaTagType.TAILWIND)
      .ignorable(),
    new Ability(Abilities.GUARD_DOG, 9)
      .attr(PostIntimidateStatChangeAbAttr, [BattleStat.ATK], 1, true)
      .attr(ForceSwitchOutImmunityAbAttr)
      .ignorable(),
    new Ability(Abilities.ROCKY_PAYLOAD, 9)
      .attr(MoveTypePowerBoostAbAttr, Type.ROCK),
    new Ability(Abilities.WIND_POWER, 9)
      .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.hasFlag(MoveFlags.WIND_MOVE), BattlerTagType.CHARGED),
    new Ability(Abilities.ZERO_TO_HERO, 9)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .attr(PostBattleInitFormChangeAbAttr, () => 0)
      .attr(PreSwitchOutFormChangeAbAttr, (pokemon) => !pokemon.isFainted() ? 1 : pokemon.formIndex)
      .bypassFaint(),
    new Ability(Abilities.COMMANDER, 9)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .unimplemented(),
    new Ability(Abilities.ELECTROMORPHOSIS, 9)
      .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS, BattlerTagType.CHARGED),
    new Ability(Abilities.PROTOSYNTHESIS, 9)
      .conditionalAttr(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN), PostSummonAddBattlerTagAbAttr, BattlerTagType.PROTOSYNTHESIS, 0, true)
      .attr(PostWeatherChangeAddBattlerTagAttr, BattlerTagType.PROTOSYNTHESIS, 0, WeatherType.SUNNY, WeatherType.HARSH_SUN)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .partial(),
    new Ability(Abilities.QUARK_DRIVE, 9)
      .conditionalAttr(getTerrainCondition(TerrainType.ELECTRIC), PostSummonAddBattlerTagAbAttr, BattlerTagType.QUARK_DRIVE, 0, true)
      .attr(PostTerrainChangeAddBattlerTagAttr, BattlerTagType.QUARK_DRIVE, 0, TerrainType.ELECTRIC)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .partial(),
    new Ability(Abilities.GOOD_AS_GOLD, 9)
      .attr(MoveImmunityAbAttr, (pokemon, attacker, move) => pokemon !== attacker && move.category === MoveCategory.STATUS)
      .ignorable()
      .partial(),
    new Ability(Abilities.VESSEL_OF_RUIN, 9)
      .attr(FieldMultiplyBattleStatAbAttr, Stat.SPATK, 0.75)
      .attr(PostSummonMessageAbAttr, (user) => i18next.t("abilityTriggers:postSummonVesselOfRuin", { pokemonNameWithAffix: getPokemonNameWithAffix(user), statName: getStatName(Stat.SPATK) }))
      .ignorable(),
    new Ability(Abilities.SWORD_OF_RUIN, 9)
      .attr(FieldMultiplyBattleStatAbAttr, Stat.DEF, 0.75)
      .attr(PostSummonMessageAbAttr, (user) => i18next.t("abilityTriggers:postSummonSwordOfRuin", { pokemonNameWithAffix: getPokemonNameWithAffix(user), statName: getStatName(Stat.DEF) }))
      .ignorable(),
    new Ability(Abilities.TABLETS_OF_RUIN, 9)
      .attr(FieldMultiplyBattleStatAbAttr, Stat.ATK, 0.75)
      .attr(PostSummonMessageAbAttr, (user) => i18next.t("abilityTriggers:postSummonTabletsOfRuin", { pokemonNameWithAffix: getPokemonNameWithAffix(user), statName: getStatName(Stat.ATK) }))
      .ignorable(),
    new Ability(Abilities.BEADS_OF_RUIN, 9)
      .attr(FieldMultiplyBattleStatAbAttr, Stat.SPDEF, 0.75)
      .attr(PostSummonMessageAbAttr, (user) => i18next.t("abilityTriggers:postSummonBeadsOfRuin", { pokemonNameWithAffix: getPokemonNameWithAffix(user), statName: getStatName(Stat.SPDEF) }))
      .ignorable(),
    new Ability(Abilities.ORICHALCUM_PULSE, 9)
      .attr(PostSummonWeatherChangeAbAttr, WeatherType.SUNNY)
      .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.SUNNY)
      .conditionalAttr(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN), BattleStatMultiplierAbAttr, BattleStat.ATK, 4 / 3),
    new Ability(Abilities.HADRON_ENGINE, 9)
      .attr(PostSummonTerrainChangeAbAttr, TerrainType.ELECTRIC)
      .attr(PostBiomeChangeTerrainChangeAbAttr, TerrainType.ELECTRIC)
      .conditionalAttr(getTerrainCondition(TerrainType.ELECTRIC), BattleStatMultiplierAbAttr, BattleStat.SPATK, 4 / 3),
    new Ability(Abilities.OPPORTUNIST, 9)
      .attr(StatChangeCopyAbAttr),
    new Ability(Abilities.CUD_CHEW, 9)
      .unimplemented(),
    new Ability(Abilities.SHARPNESS, 9)
      .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE), 1.5),
    new Ability(Abilities.SUPREME_OVERLORD, 9)
      .attr(VariableMovePowerBoostAbAttr, (user, target, move) => 1 + 0.1 * Math.min(user.isPlayer() ? user.scene.currentBattle.playerFaints : user.scene.currentBattle.enemyFaints, 5))
      .partial(),
    new Ability(Abilities.COSTAR, 9)
      .attr(PostSummonCopyAllyStatsAbAttr),
    new Ability(Abilities.TOXIC_DEBRIS, 9)
      .attr(PostDefendApplyArenaTrapTagAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, ArenaTagType.TOXIC_SPIKES)
      .bypassFaint(),
    new Ability(Abilities.ARMOR_TAIL, 9)
      .attr(FieldPriorityMoveImmunityAbAttr)
      .ignorable(),
    new Ability(Abilities.EARTH_EATER, 9)
      .attr(TypeImmunityHealAbAttr, Type.GROUND)
      .partial()
      .ignorable(),
    new Ability(Abilities.MYCELIUM_MIGHT, 9)
      .attr(ChangeMovePriorityAbAttr, (pokemon, move) => move.category === MoveCategory.STATUS, -0.5)
      .attr(PreventBypassSpeedChanceAbAttr, (pokemon, move) => move.category === MoveCategory.STATUS)
      .attr(MoveAbilityBypassAbAttr, (pokemon, move: Move) => move.category === MoveCategory.STATUS),
    new Ability(Abilities.MINDS_EYE, 9)
      .attr(IgnoreTypeImmunityAbAttr, Type.GHOST, [Type.NORMAL, Type.FIGHTING])
      .attr(ProtectStatAbAttr, BattleStat.ACC)
      .attr(IgnoreOpponentEvasionAbAttr)
      .ignorable(),
    new Ability(Abilities.SUPERSWEET_SYRUP, 9)
      .attr(PostSummonStatChangeAbAttr, BattleStat.EVA, -1)
      .condition(getOncePerBattleCondition(Abilities.SUPERSWEET_SYRUP)),
    new Ability(Abilities.HOSPITALITY, 9)
      .attr(PostSummonAllyHealAbAttr, 4, true)
      .partial(),
    new Ability(Abilities.TOXIC_CHAIN, 9)
      .attr(PostAttackApplyStatusEffectAbAttr, false, 30, StatusEffect.TOXIC),
    new Ability(Abilities.EMBODY_ASPECT_TEAL, 9)
      .attr(PostBattleInitStatChangeAbAttr, BattleStat.SPD, 1, true)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .partial(),
    new Ability(Abilities.EMBODY_ASPECT_WELLSPRING, 9)
      .attr(PostBattleInitStatChangeAbAttr, BattleStat.SPDEF, 1, true)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .partial(),
    new Ability(Abilities.EMBODY_ASPECT_HEARTHFLAME, 9)
      .attr(PostBattleInitStatChangeAbAttr, BattleStat.ATK, 1, true)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .partial(),
    new Ability(Abilities.EMBODY_ASPECT_CORNERSTONE, 9)
      .attr(PostBattleInitStatChangeAbAttr, BattleStat.DEF, 1, true)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .partial(),
    new Ability(Abilities.TERA_SHIFT, 9)
      .attr(PostSummonFormChangeAbAttr, p => p.getFormKey() ? 0 : 1)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr),
    new Ability(Abilities.TERA_SHELL, 9)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .ignorable()
      .unimplemented(),
    new Ability(Abilities.TERAFORM_ZERO, 9)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .unimplemented(),
    new Ability(Abilities.POISON_PUPPETEER, 9)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
        .conditionalAttr(pokemon => pokemon.species.speciesId===Species.PECHARUNT, ConfusionOnStatusEffectAbAttr, StatusEffect.POISON, StatusEffect.TOXIC),

      new Ability(Abilities.UNLEASHED, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.ALL),
      new Ability(Abilities.HELL_FLAME, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE),
      new Ability(Abilities.PSYCHO_LEAF, 9)
          .attr(MoveTypeChangeAbAttr, Type.PSYCHIC, 1.2, (user, target, move) => move.type === Type.GRASS),
      new Ability(Abilities.GROUND_FLAME, 9)
          .attr(MoveTypeChangeAbAttr, Type.GROUND, 1.2, (user, target, move) => move.type === Type.FIRE),
      new Ability(Abilities.MAGICAL_WATER, 9)
          .attr(MoveTypeChangeAbAttr, Type.FAIRY, 1.2, (user, target, move) => move.type === Type.WATER),
      new Ability(Abilities.NUCLEAR_ENERGY, 9)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1.2, (user, target, move) => move.type === Type.POISON),
      new Ability(Abilities.POISON_KING, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.POISON, 1.6),
      new Ability(Abilities.SOLID_KONG, 4)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.5)
          .ignorable(),
      new Ability(Abilities.SCREEPY, 4)
          .attr(IgnoreTypeImmunityAbAttr, Type.NORMAL, [Type.GHOST])
          .attr(MoveTypePowerBoostAbAttr, Type.GHOST,1.3)
          .attr(IntimidateImmunityAbAttr),
      new Ability(Abilities.GOD_FIST, 4)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.PUNCHING_MOVE), 1.5),
      new Ability(Abilities.PARENTAL_HAUNTING, 9)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.2, (user, target, move) => move.type !== Type.NORMAL),

      new Ability(Abilities.NIGHTMARATE, 4)
          .attr(PrimaryTypeChangeAbAttr, 1.2),
      new Ability(Abilities.TERRIFY, 3)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.ATK, BattleStat.SPATK], -1, false, true),
      new Ability(Abilities.THUNDER_AND_FIRE, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.ELECTRIC, 2),
      new Ability(Abilities.ELECTAFIRE_ABSORB, 9)
          .attr(TypeImmunityHealAbAttr, Type.FIRE)
          .attr(TypeImmunityHealAbAttr, Type.ELECTRIC),
      new Ability(Abilities.DIRT_THICK, 9)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.WATER, 0.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.GROUND, 0.5),
      new Ability(Abilities.ARCTIC_BLAZE, 9)
          .attr(HpGatedTypeChangeAbAttr, Type.FIRE, 1.35, 0.65, (user, target, move) => move.type === Type.ICE, )
          .attr(HpGatedTypeChangeAbAttr, Type.ICE, 1.35, 0.65, (user, target, move) => move.type === Type.FIRE,),
      new Ability(Abilities.STEAMIFY, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1.2, (user, target, move) => move.type === Type.WATER),
      new Ability(Abilities.PREHISTORIC_HUNT, 9)
          .attr(PostTurnWeatherChangeAbAttr, WeatherType.RAIN, (pokemon) => randSeedChance(30))
          .conditionalAttr(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN, WeatherType.HEAVY_RAIN, WeatherType.RAIN, WeatherType.HAIL, WeatherType.SNOW), BattleStatMultiplierAbAttr, BattleStat.SPD, 2),
      new Ability(Abilities.POP_UP, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.DEF], -1, false)
          .attr(PostSummonStatChangeAbAttr, BattleStat.SPD, 1, true),
      new Ability(Abilities.EARTH_SPEEDER, 9)
          .attr(TypeImmunityStatChangeAbAttr, Type.GROUND, BattleStat.SPD, 1),

      new Ability(Abilities.KNOCKOUT, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => user!.getHpRatio() <= 0.5 && randSeedChance(35)),
      new Ability(Abilities.FINAL_ROUND, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.FIGHTING),
      new Ability(Abilities.KICK_PUNCH, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("kick") || move.hasFlag(MoveFlags.PUNCHING_MOVE), 1.3),
      new Ability(Abilities.STAB_NORMAL, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.NORMAL, 1.3),
      new Ability(Abilities.ADAPTIVE_AI, 9)
          .attr(OppDownloadAbAttr),
      new Ability(Abilities.ELECTRIC, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ELECTRIC, 1.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.WATER, 2)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1.2, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.EXISTENCE, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ALL, 1.2)
          .attr(ReceivedMoveDamageNeutralAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2)
          .attr(MovePowerNeutralAbAttr, (target, user, move) => target!.getAttackTypeEffectiveness(move.type, user!) >= 2),
      new Ability(Abilities.ALL_CONSUMING, 9)
          .attr(AllConsumingAbAttr, 1/8, 1/8),
      new Ability(Abilities.CORRUPT, 9)
          .attr(PostAttackApplyStatusEffectAbAttr, false, 70, StatusEffect.TOXIC),
      new Ability(Abilities.DRAGON_KING, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.DRAGON, 1.6),
      new Ability(Abilities.SAND_CORRUPTION, 9)
          .attr(PostDefendContactDamageAbAttr, 8)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), BattleStat.SPD, -1, false)
          .bypassFaint(),
      new Ability(Abilities.ORGANIC_TWIST, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GRASS, Type.ROCK, 2),
      new Ability(Abilities.HEALTHY_SOAK, 9)
          .attr(TypeImmunityStatsChangeAbAttr, Type.WATER, [BattleStat.SPD, BattleStat.ATK], 1),
      new Ability(Abilities.INK_BLINDNESS, 9)
          .attr(PostAttackApplyTagAbAttr, false, 35, [BattlerTagType.CONFUSED], 1),
      new Ability(Abilities.INK_FRY, 9)
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.SPD, BattleStat.SPDEF], Type.WATER, 100),
      new Ability(Abilities.MOO_TIME, 9)
          .attr(BattleStatMultiplierAbAttr, BattleStat.DEF, 1.5, (pokemon) => pokemon!.getHpRatio() < 0.5 )
          .attr(BattleStatMultiplierAbAttr, BattleStat.SPD, 1.5, (pokemon) => pokemon!.getHpRatio() < 0.5 ),
      new Ability(Abilities.FUEL_EXCHANGE, 9)
          .attr(PostDefendTypeEffectAbAttr),
      new Ability(Abilities.SUN_AND_MOON, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.ROCK, 1.2),
      new Ability(Abilities.NIGHT_AND_DAY, 9)
          .attr(HpBasedContactStatusEffectAbAttr, 40, 35),
      new Ability(Abilities.TWO_HALVES, 9)
          .attr(SturdySpeedDropAbAttr)
          .attr(HealAfterHitAbAttr),
      new Ability(Abilities.ALIEN_ROCK, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.PSYCHIC, Type.ROCK, 2),
      new Ability(Abilities.ROBOT, 9)
          .attr(PostSummonStatBoostAbAttr, 1)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -1),
      new Ability(Abilities.GOLEM_PLUS, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ROCK, 1.3)
          .attr(BattleStatMultiplierAbAttr, BattleStat.DEF, 1.3),
      new Ability(Abilities.NIGHTMARE_FUEL, 9)
          .attr(PrimaryTypeChangeAbAttr, 1.2),
      new Ability(Abilities.SMITTYXTV_VIRUS, 9)
          .attr(PostVictoryTopStatChangeAbAttr, 1)
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.RAND], Type.ALL, 50),
      new Ability(Abilities.STATIC_CHARGE, 9)
          .attr(PostDefendContactApplyTagChanceAbAttr, 100, BattlerTagType.CHARGED)
          .attr(PostDefendContactApplyStatusEffectAbAttr, 30, StatusEffect.PARALYSIS)
          .ignorable(),
      new Ability(Abilities.DARK_STAMPEDE, 9)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => move.type === Type.DARK, 1, BattleStat.RAND),
      new Ability(Abilities.COLOR_CHANGE_DEFENSE, 9)
          .attr(PostDefendTypeChangePlusAbAttr),

      new Ability(Abilities.COLOR_CHANGE_STEAL, 9)
          .attr(PostDefendTypeChangeAbAttr)
          .attr(PostAttackStealHeldItemAbAttr, (user, target, move) => user!.getTypes(true).includes(target!.getTypes(true)[0])),
      new Ability(Abilities.HAUNTING_ECHO, 9)
          .attr(PostAttackTypeStatusAndDamageAbAttr, Type.GHOST, StatusEffect.PARALYSIS, 30, 1/16),
      new Ability(Abilities.MATERNAL_SHADE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => user.randSeedInt(100) <= 50, 0.25)
          .ignorable(),
      new Ability(Abilities.SPIRITUAL_BOND, 9)
          .attr(PostDefendSpiritualBondAbAttr),
      new Ability(Abilities.GRAVE_POWER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => user!.getHpRatio() <= .40, 2.5)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => randSeedChance(30)),
      new Ability(Abilities.UNDEAD, 9)
          .attr(PreDefendSurviveAbAttr, 70),
      new Ability(Abilities.SCALE_ARMOR, 9)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.WATER, 0.75)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.ELECTRIC, 0.75)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIRE, 0.75)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.GRASS, 0.75),
      new Ability(Abilities.PIXELATED_TONGUE, 9)
          .attr(PostAttackDebuffAndRandStatusAbAttr, [StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.PARALYSIS, StatusEffect.BURN], 30, BattleStat.RAND, 30),
      new Ability(Abilities.STATIC_TASTE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target?.status?.effect === StatusEffect.PARALYSIS, 1.5)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS, 35),
      new Ability(Abilities.ROCKY_HORROR_SHOW, 9)
          .attr(ArenaTrapAbAttr, (user, target) => { return true})
          .attr(PostSummonStatChangeAbAttr, [BattleStat.RAND, BattleStat.RAND], 1, true),
      new Ability(Abilities.HAUNTING_BROADCAST, 9)
          .attr(PostFaintTagAbAttr, BattlerTagType.CURSED, 1, (fainted, target) => true)
          .bypassFaint(),
      new Ability(Abilities.ECTOPLASMIC_TOUCH, 9)
          .attr(PostAttackContactDamageAbAttr, 12)
          .attr(PostDefendContactDamageAbAttr, 12),
      new Ability(Abilities.TOXIC_COMBUSTION, 9)
          .attr(PostDefendStatusDamageAbAttr, StatusEffect.TOXIC, 1/8)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => randSeedChance(30)),
      new Ability(Abilities.FLAMING_EMISSION, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.POISON, 2),
      new Ability(Abilities.BURNING_DISEASE, 9)
          .attr(PostDefendStatusDamageAbAttr, StatusEffect.BURN, 1/8)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => randSeedChance(30)),
      new Ability(Abilities.STEADY_STANCE, 9)
          .attr(BattleStatMultiplierAbAttr, BattleStat.DEF, 1.2)
          .attr(BattleStatMultiplierAbAttr, BattleStat.ATK, 1.2)
          .attr(BattleStatMultiplierAbAttr, BattleStat.SPDEF, 1.2)
          .attr(BattleStatMultiplierAbAttr, BattleStat.SPATK, 1.2),
      new Ability(Abilities.BALANCED_KICK, 9)
          .attr(AlwaysHitAbAttr)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("kick"), 1.2),
      new Ability(Abilities.PHANTOM_POUCH, 9)
          .attr(PostDefendChanceHealAbAttr, (target, user, move) => randSeedChance(30),  1/8)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(30), 1/8)
          .attr(PostBattleLootAbAttr),
      new Ability(Abilities.HAUNTING_SCYTHE, 9)
          .attr(PreAttackChangeMoveCategoryAbAttr),
      new Ability(Abilities.SOUL_COLLECTOR, 9)
          .attr(PreAttackBoostIfCollectedTypeMatchAbAttr)
          .attr(PostKnockOutCollectAbAttr)
          .attr(PostFaintLoseCollectedTypeAbAttr)
          .bypassFaint(),
      new Ability(Abilities.SHADOW_SYNC, 9)
          .attr(PostStatChangeSyncHighestStatAbAttr)
          .attr(MoveTypePowerBoostAbAttr, Type.ALL, 1.2),
      new Ability(Abilities.FRIGHTFUL_CUTE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => Utils.randSeedInt(3,1) == 1, 1.5)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => Utils.randSeedInt(3,1) == 1, 0.5),
      new Ability(Abilities.GHOSTIFY, 9)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.4, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.FOREVER_PARTNER, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ALL, 1.3)
          .attr(PreDefendSurviveAbAttr, 40),
      new Ability(Abilities.NEW_ADAPTION, 9)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIRE, 0.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.GROUND, 0.5)
          .attr(MovePowerBoostAbAttr, (user, target, move) => (target!.getTypes().includes(Type.FIRE) || target!.getTypes().includes(Type.POISON) || target!.getTypes().includes(Type.WATER)) && move.type === Type.STEEL, 2),
      new Ability(Abilities.STEEL_STEALER, 9)
          .attr(TypeImmunityStatChangeAbAttr, Type.STEEL, BattleStat.ATK, 1),
      new Ability(Abilities.TERA_FORCE, 9)
          .attr(IgnoreTypeImmunityAbAttr, Type.FLYING, [Type.GROUND])
          .attr(MoveTypePowerBoostAbAttr, Type.GROUND,1.3)
          .attr(IntimidateImmunityAbAttr),
      new Ability(Abilities.MUDIATE, 9)
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.ACC], Type.ALL, 30)
          .attr(MoveTypeChangeAbAttr, Type.GROUND, 1.2, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.GOTTA_GO_FAST, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => user!.scene.currentBattle.turnCommands[target!.getBattlerIndex()]!.command === Command.FIGHT && !target?.getLastXMoves(1).find(m => m.turn === target?.scene.currentBattle.turn), 2)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (user, target, move) => !!target.getLastXMoves(1).find(m => m.turn === target.scene.currentBattle.turn) || user.scene.currentBattle.turnCommands[target.getBattlerIndex()]!.command !== Command.FIGHT, 2),
      new Ability(Abilities.IM_BLUE, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.WATER)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIRE, 0.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.WATER, 0.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.STEEL, 0.5)
          .attr(MovePowerBoostAbAttr, (user, target, move) => (target!.getTypes().includes(Type.FIRE) || target!.getTypes().includes(Type.GROUND) || target!.getTypes().includes(Type.ROCK)), 1.5),
      new Ability(Abilities.NOT_SHADOW, 9)
          .attr(RedirectTypeMoveAbAttr, Type.DARK)
          .attr(TypeImmunityStatChangeAbAttr, Type.DARK, BattleStat.ATK, 1)
          .attr(RedirectTypeMoveAbAttr, Type.STEEL)
          .attr(TypeImmunityStatChangeAbAttr, Type.STEEL, BattleStat.DEF, 1)
          .attr(RedirectTypeMoveAbAttr, Type.GHOST)
          .attr(TypeImmunityStatChangeAbAttr, Type.GHOST, BattleStat.SPD, 1),
      new Ability(Abilities.ANIMIFIED, 9)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.NORMAL, 0.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIGHTING, 0.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.POISON, 2)
          .attr(MoveTypeChangeAbAttr, Type.FAIRY, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PreDefendSurviveAbAttr, 30),
      new Ability(Abilities.LONG_FORGOTTEN, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.DEF, BattleStat.SPDEF], -1, false),
      new Ability(Abilities.WAAAA, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => randSeedChance(25))
          .attr(PostAttackApplyStatusEffectAbAttr, true, 10, StatusEffect.TOXIC),
      new Ability(Abilities.TOO_LATE, 9)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move: Move) => true, -2)
          .attr(PostAttackApplyTagAbAttr, false, 35, [BattlerTagType.CONFUSED, BattlerTagType.DROWSY, BattlerTagType.INFESTATION, BattlerTagType.CURSED], 1),
      new Ability(Abilities.MEMORIES_OF_TENNIS, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("ball") || move.name.toLowerCase().includes("sphere") || move.name.toLowerCase().includes("orb") || move.name.toLowerCase().includes("circle") || move.name.toLowerCase().includes("bounce") || move.name.toLowerCase().includes("yellow"), 1.5)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.name.toLowerCase().includes("ball") || move.name.toLowerCase().includes("sphere") || move.name.toLowerCase().includes("orb") || move.name.toLowerCase().includes("circle") || move.name.toLowerCase().includes("bounce") || move.name.toLowerCase().includes("yellow") && randSeedChance(10), [BattlerTagType.FLINCHED], 0),
      new Ability(Abilities.FIRE_RAF_RAF, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE, 1.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.WATER, 2)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1.2, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.POSITIVITY, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ELECTRIC, 1.2)
          .attr(PreDefendSurviveAbAttr, 30)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(33), 0.5),
      new Ability(Abilities.UNFAZED, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.5)
              .ignorable(),
      new Ability(Abilities.NIGHTMARE_SAUCE, 9)
          .attr(PostAttackAbilityGiveOrTagAbAttr, Abilities.COMATOSE, 50, BattlerTagType.NIGHTMARE, 30),
      new Ability(Abilities.HASH_SLINGING_SLASHER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE), 2),
      new Ability(Abilities.LIFE_ADVICE, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, 1, true)
          .attr(PostDefendChanceHealAbAttr, (target, user, move) => randSeedChance(40),  1/8),
      new Ability(Abilities.WOOD_CUTTER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target!.getTypes().includes(Type.GRASS), 2.5)
          .attr(PostKnockOutTypeStatsChangeAbAttr, Type.GRASS, [BattleStat.ATK, BattleStat.SPD], 1),
      new Ability(Abilities.AXE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE), 1.5)
          .attr(MoveTypePowerBoostAbAttr, Type.STEEL, 1.3),
      new Ability(Abilities.RUBBER_MAN, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL || move.type == Type.STEEL, 0.5)
          .attr(RedirectTypeMoveAbAttr, Type.ELECTRIC)
          .attr(TypeImmunityStatChangeAbAttr, Type.ELECTRIC, BattleStat.ATK, 1)
          .ignorable()
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.WATER, 2)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.type == Type.NORMAL || move.type == Type.FIGHTING || move.type == Type.FLYING, 1.5),
      new Ability(Abilities.CONQUEROR_HAKI, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(20) , 2)
          .attr(PostAttackContactApplyStatusEffectAbAttr, 10, StatusEffect.SLEEP, StatusEffect.PARALYSIS)
          .attr(PostDefendContactApplyStatusEffectAbAttr, 10, StatusEffect.SLEEP, StatusEffect.PARALYSIS),
      new Ability(Abilities.STRETCHY, 9)
          .attr(PostAttackApplyTagAbAttr, true, 50, [BattlerTagType.WRAP], 1),
      new Ability(Abilities.DEMON_SWORDSMAN, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE), 1.5)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.STEEL, Type.GHOST, 2, true)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.STEEL, Type.DARK, 2, true),
      new Ability(Abilities.CURSED_BLADES, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE), 1.5)
          .attr(PostAttackApplyTagAbAttr, true, 20, [BattlerTagType.CURSED], 1),
      new Ability(Abilities.STRAWHAT, 9)
          .attr(PreDefendSurviveAbAttr, 15)
          .attr(VariableMovePowerBoostAbAttr, (user, target, move) => 1 + 0.2 * Math.min(user.isPlayer() ? user.scene.currentBattle.playerFaints : user.scene.currentBattle.enemyFaints, 5)),
      new Ability(Abilities.FAIRY_FEAR, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FAIRY, 1.2)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 1),
      new Ability(Abilities.SHADOW_CHARM, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.ATK], -1, false)
          .attr(ArenaTrapAbAttr, (user, target) => { return true}),
      new Ability(Abilities.YIN_YANG, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GHOST, Type.FAIRY, 2),
      new Ability(Abilities.STUBBORN_STANCE, 9)
          .attr(PreDefendSurviveAbAttr, 70),
      new Ability(Abilities.MISERY_TOUCH, 9)
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.RAND], Type.ALL, 100),
      new Ability(Abilities.JUST_A_JERK, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.DEF], -1, false)
          .attr(MoveTypePowerBoostAbAttr, Type.DARK, 1.2),
      new Ability(Abilities.BUGABUGABUGA, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.DEF, BattleStat.ATK, BattleStat.SPDEF, BattleStat.SPATK, BattleStat.SPD], -1, false)
          .attr(ArenaTrapAbAttr, (user, target) => { return true })
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => true, 1.2)
          .ignorable(),
      new Ability(Abilities.JUST_A_MASKED_JERK, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.DEF, BattleStat.RAND], -1, false)
          .attr(MoveTypePowerBoostAbAttr, Type.ALL, 1.2),
      new Ability(Abilities.FLAME_SPIRIT, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => randSeedChance(10))
          .attr(RedirectTypeMoveAbAttr, Type.FIRE)
          .attr(TypeImmunityStatsChangeAbAttr, Type.FIRE, [BattleStat.RAND, BattleStat.RAND], 1),
      new Ability(Abilities.SOUL_BURN, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => randSeedChance(30))
          .attr(PostDefendStatusDamageAbAttr, StatusEffect.BURN, 1/8),
      new Ability(Abilities.FALSE_SAFETY, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.SPDEF], -1, false)
          .attr(PostDefendContactApplyStatusEffectAbAttr, 10, StatusEffect.BURN, StatusEffect.SLEEP, StatusEffect.PARALYSIS)
        .bypassFaint(),
      new Ability(Abilities.FOREST_FURY, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.type == Type.GRASS && user!.getHpRatio() <= 0.5, 2.5),
      new Ability(Abilities.VINE_FIST, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.PUNCHING_MOVE), 1.3)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.hasFlag(MoveFlags.PUNCHING_MOVE) && randSeedChance(30), [BattlerTagType.SEEDED, BattlerTagType.BIND], 1),
      new Ability(Abilities.ENLIGHTENED, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.PSYCHIC, 1.2)
          .attr(MovePowerNeutralAbAttr, (target, user, move) => target!.getAttackTypeEffectiveness(move.type, user!) < 1),
      new Ability(Abilities.THE_AVATAR, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.WATER, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.FLYING, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.GROUND, 1.2),
      new Ability(Abilities.HAPPY_LITTLE_ACCIDENTS, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => {
            const power = new Utils.NumberHolder(move.power);
            applyMoveAttrs(VariablePowerAttr, user, target, move, power);
            return power.value >= 65 && power.value <= 85;
          }, 1.5)
          .attr(MovePowerBoostAbAttr, (user, target, move) => {
            const power = new Utils.NumberHolder(move.power);
            applyMoveAttrs(VariablePowerAttr, user, target, move, power);
            return power.value <= 60;
          }, 1.75),
      new Ability(Abilities.ORIGINAL_ASMR, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.SLEEP, (user, target, move) => randSeedChance(20))
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => true, 0.8)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SOUND_BASED), 1.3)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.hasFlag(MoveFlags.SOUND_BASED), 0.5),
      new Ability(Abilities.AFROPOWER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(30), 3),
      new Ability(Abilities.INSECT_INFUSION, 9)
          .attr(PostAttackApplyTagAbAttr, true, 50, [BattlerTagType.INFESTATION], 5),
      new Ability(Abilities.SENTIENT_ANT, 9)
          .attr(OppDownloadAbAttr),
      new Ability(Abilities.ANT_REGEN, 9)
          .attr(PostTurnHealPlusAbAttr),
      new Ability(Abilities.V8_ENGINE, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.SPD, 1),
      new Ability(Abilities.SELF_DRIVING, 9)
          .attr(MoveTypeChangeAbAttr, Type.PSYCHIC, 1.5, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.LIMITED_EDITION, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.RAND, BattleStat.RAND], 1, true)
          .attr(MovePowerBoostAbAttr, (user, target, move) => Utils.randSeedInt(3,1) === 1, 1.2),
      new Ability(Abilities.FIERY_DISGUISE, 9)
          .attr(ReceivedMoveDamageAltDisguiseAbAttr,(target, user, move) => target.getHpRatio() === 1 || target.findTag(tag => tag.tagType === BattlerTagType.FIRE_CHARGED) !== null && target.findTag(tag => tag.tagType === BattlerTagType.FIRE_CHARGED) !== undefined, 1, BattlerTagType.FIRE_CHARGED)
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.type === Type.FIRE, BattlerTagType.FIRE_CHARGED),
      new Ability(Abilities.PLAYFUL_BLAZE, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.FIRE)
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.ATK], Type.FIRE, 30)
          .attr(PostAttackTypeStatusAbAttr, (user, target, move) => move.type === Type.FAIRY && Utils.randSeedInt(100) < 10, StatusEffect.BURN),
      new Ability(Abilities.AQUA_DISGUISE, 9)
          .attr(ReceivedMoveDamageAltDisguiseAbAttr, (target, user, move) => target.getHpRatio() === 1 || target.findTag(tag => tag.tagType === BattlerTagType.WATER_CHARGED) !== null && target.findTag(tag => tag.tagType === BattlerTagType.WATER_CHARGED) !== undefined, 1, BattlerTagType.WATER_CHARGED)
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.type === Type.WATER, BattlerTagType.WATER_CHARGED),
      new Ability(Abilities.PHANTOM_TORRENT, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.WATER)
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.SPATK], Type.WATER, 30)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.FAIRY && randSeedChance(10), [BattlerTagType.WHIRLPOOL], 1),
      new Ability(Abilities.SILLY_PRESSURE, 9)
          .attr(IncreasePpAbAttr)
          .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => getPokemonMessage(pokemon, i18next.t("abilityTriggers:sillyPressure")))
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.ATK], Type.PSYCHIC, 30)
          .attr(PostAttackApplyTagAbAttr, false,(user, target, move) => move.type === Type.FAIRY && randSeedChance(10), [BattlerTagType.ENCORE], 1),
      new Ability(Abilities.TELEKINETIC_DISGUISE, 9)
          .attr(ReceivedMoveDamageAltDisguiseAbAttr, (target, user, move) => target.getHpRatio() === 1 || target.findTag(tag => tag.tagType === BattlerTagType.PSYCHIC_CHARGED) !== null && target.findTag(tag => tag.tagType === BattlerTagType.PSYCHIC_CHARGED) !== undefined, 1, BattlerTagType.PSYCHIC_CHARGED)
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.type === Type.PSYCHIC, BattlerTagType.PSYCHIC_CHARGED),
      new Ability(Abilities.ELECTRIC_DISGUISE, 9)
          .attr(ReceivedMoveDamageAltDisguiseAbAttr, (target, user, move) => target.getHpRatio() === 1 || target.findTag(tag => tag.tagType === BattlerTagType.CHARGED) !== null && target.findTag(tag => tag.tagType === BattlerTagType.CHARGED) !== undefined, 1, BattlerTagType.CHARGED)
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.type === Type.ELECTRIC, BattlerTagType.CHARGED),
      new Ability(Abilities.LOVELY_STATIC, 9)
          .attr(PostDefendContactApplyStatusEffectAbAttr, 30, StatusEffect.PARALYSIS)
          .bypassFaint()
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.SPATK], Type.ELECTRIC, 30)
          .attr(PostAttackApplyTagAbAttr, false,(user, target, move) => move.type === Type.FAIRY && randSeedChance(20) && user?.gender != target?.gender, [BattlerTagType.INFATUATED], 1),
      new Ability(Abilities.ANCIENT_DISGUISE, 9)
          .attr(ReceivedMoveDamageAltDisguiseAbAttr, (target, user, move) => target.getHpRatio() === 1 || target.findTag(tag => tag.tagType === BattlerTagType.ROCK_CHARGED) !== null && target.findTag(tag => tag.tagType === BattlerTagType.ROCK_CHARGED) !== undefined, 1, BattlerTagType.ROCK_CHARGED)
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.type === Type.ROCK, BattlerTagType.ROCK_CHARGED),
      new Ability(Abilities.MADE_TO_LAST, 9)
          .attr(PreDefendSurviveAbAttr, 40)
          .attr(PostAttackTypeStatChangeAbAttr, [BattleStat.SPD], Type.ROCK, 30)
          .attr(PostAttackApplyTagAbAttr, false,(user, target, move) => move.type === Type.FAIRY && randSeedChance(10), [BattlerTagType.TRAPPED], 1),
      new Ability(Abilities.MULTI_PIECE, 9)
          .attr(SturdySpeedDropAbAttr)
          .attr(HealAfterHitAbAttr),
      new Ability(Abilities.ALIEN_TYPE, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ICE, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.ELECTRIC, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.GRASS, 1.2),
      new Ability(Abilities.WATER_POWERED, 9)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1.2, (user, target, move) => move.type !== Type.PSYCHIC && move.type !== Type.GROUND)
          .attr(RedirectTypeMoveAbAttr, Type.WATER)
          .attr(TypeImmunityStatsChangeAbAttr, Type.WATER, [BattleStat.RAND], 1),
      new Ability(Abilities.MADE_OF_ICE, 9)
          .attr(PostDefendContactApplyStatusEffectAbAttr, 10, StatusEffect.FREEZE)
          .attr(MoveTypePowerBoostAbAttr, Type.ICE, 1.3)
          .bypassFaint(),
      new Ability(Abilities.SHREDDED, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(33), 2)
          .attr(MoveTypeChangeAbAttr, Type.FIGHTING, 1.2, (user, target, move) => move.type === Type.WATER || move.type === Type.NORMAL),
      new Ability(Abilities.SCULPTED_ICE, 9)
          .attr(PostTurnRandStatChangeAbAttr, [BattleStat.SPD,BattleStat.DEF,BattleStat.ATK], 1),
      new Ability(Abilities.QUAKER, 9)
          .attr(IgnoreTypeImmunityAbAttr, Type.FLYING, [Type.GROUND])
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("quake") || move.name.toLowerCase().includes("magnitude"), 1.5),
      new Ability(Abilities.ROCK_FORTRESS, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.5)
          .ignorable(),
      new Ability(Abilities.ROCK_CONTROL, 9)
          .attr(PostDefendApplyArenaTrapTagAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, ArenaTagType.STEALTH_ROCK)
          .bypassFaint()
          .attr(MoveTypePowerBoostAbAttr, Type.ROCK, 1.3),
      new Ability(Abilities.UNSTOPPABLE_POISON, 9)
          .attr(IgnoreTypeImmunityAbAttr, Type.STEEL, [Type.POISON])
          .attr(MoveTypePowerBoostAbAttr, Type.POISON, 1.2)
          .attr(PostAttackApplyStatusEffectAbAttr, true, 30, StatusEffect.TOXIC),
      new Ability(Abilities.SWIFT_CLAWS, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 1.3)
          .attr(PostAttackRandStatChangeAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT) && randSeedChance(30), 1, [BattleStat.ACC, BattleStat.ATK, BattleStat.SPD]),
      new Ability(Abilities.TRIPLE_THREAT, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => randSeedChance(10))
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 1)
          .attr(PostAttackContactApplyStatusEffectAbAttr, 10, StatusEffect.FREEZE, StatusEffect.PARALYSIS, StatusEffect.BURN),
      new Ability(Abilities.DRAGON_WRATH, 9)
          .attr(PostDefendDamageAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT) && randSeedChance(50), 1/6)
          .bypassFaint(),
      new Ability(Abilities.HYDRA_RESILIENCE, 9)
          .attr(PreDefendFullHpEndureAbAttr)
          .attr(BlockOneHitKOAbAttr)
          .attr(PreDefendSurviveAbAttr, 25),
      new Ability(Abilities.TOXIC_OVERLOAD, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => randSeedChance(15))
          .attr(MovePowerBoostAbAttr, (user, target, move) => target?.status?.effect === StatusEffect.TOXIC || target?.status?.effect === StatusEffect.POISON, 1.75),
      new Ability(Abilities.RECYCLE_ENERGY, 9)
          .attr(PostDefendChanceHealAbAttr, (target, user, move) => randSeedChance(50),  1/8)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(50), 1/8),
      new Ability(Abilities.NEET_PRODUCED, 9)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.WATER, 2)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.NORMAL, 2)
          .attr(PostBattleLootAbAttr)
          .attr(MovePowerBoostAbAttr, (user, target, move) => (target!.getTypes().includes(Type.NORMAL) || target!.getTypes().includes(Type.FAIRY) || target!.getTypes().includes(Type.FIGHTING)), 2),
      new Ability(Abilities.ANCIENT_AUTOMATON, 9)
          .attr(PostTurnRandStatChangeAbAttr, [BattleStat.SPD,BattleStat.DEF,BattleStat.ATK], 1),
      new Ability(Abilities.SHADOW_OF_COLOSSUS, 9)
          .attr(PreDefendSurviveAbAttr, 10)
          .attr(MoveTypePowerBoostAbAttr, Type.GHOST, 1.3)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => true, 0.85)
          .ignorable(),
      new Ability(Abilities.TRUE_FEAR, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -1, false),
      new Ability(Abilities.SUMO_MASTER, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIGHTING, 1.3)
          .attr(MoveTypeChangeAbAttr, Type.GROUND, 1.3, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.STEADFAST_BULK, 9)
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => randSeedChance(10), BattlerTagType.FLINCHED)
          .attr(FlinchStatChangeAbAttr, BattleStat.SPD, 2)
          .attr(FlinchStatChangeAbAttr, [BattleStat.ATK, BattleStat.DEF], 1),
      new Ability(Abilities.BIG_GUTS, 9)
          .attr(BypassBurnDamageReductionAbAttr)
          .conditionalAttr(pokemon => !!pokemon.status || pokemon.hasAbility(Abilities.COMATOSE), BattleStatMultiplierAbAttr, BattleStat.ATK, 2),
      new Ability(Abilities.LUCHADORS_SPIRIT, 9)
          .attr(MoveTypeChangeAbAttr, Type.FLYING, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostVictoryTopStatChangeAbAttr, 1),
      new Ability(Abilities.MASKED_MIGHT, 9)
          .attr(BattleStatMultiplierAbAttr, BattleStat.ATK, 2)
          .attr(BattleStatMultiplierAbAttr, BattleStat.SPATK, 2)
          .condition((pokemon) => pokemon.getHpRatio() > 0.5),
      new Ability(Abilities.NACHO_LIBRE, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIGHTING, 1.6),
      new Ability(Abilities.PSEUDO_SCALE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => target.getHpRatio() === 1, 0.5)
          .attr(PostDefendContactDamageAbAttr, 8)
          .bypassFaint(),
      new Ability(Abilities.DRACO_FORM, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.DRAGON, 1.2)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.DRAGON, Type.NORMAL, 2),
      new Ability(Abilities.DITTO_TYPE, 9)
          .attr(PostDefendTypeChangePlusAbAttr),
      new Ability(Abilities.MORPHING_BLAZE, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.FIRE)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1.2, (user, target, move) => user!.getHpRatio() <= 0.5 && target!.getTypes().includes(Type.WATER) && move.type === Type.FIRE)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1.2, (user, target, move) => user!.getHpRatio() <= 0.5 && target!.getTypes().includes(Type.GROUND) && move.type === Type.FIRE),
      new Ability(Abilities.FLAME_FORM, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE, 1.2)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.NORMAL, 1.75),
      new Ability(Abilities.ULTIMATE_ADAPTATION, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ALL, 1.2)
          .attr(ReceivedMoveDamageNeutralAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2),
      new Ability(Abilities.PSEUDO_PERFECTION, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => randSeedChance(10))
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => randSeedChance(10), 0.5)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(10), 2)
          .attr(PostDefendChanceHealAbAttr, (target, user, move) => randSeedChance(10),  1/8)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(10), 1/8),
      new Ability(Abilities.DNA_CHANGE, 9)
          .attr(PokemonTypeChangeHealAbAttr, 50, 1/8),
      new Ability(Abilities.REALISTIC_STATIC, 3)
          .attr(PostDefendContactApplyStatusEffectAbAttr, 50, StatusEffect.PARALYSIS)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), BattleStat.RAND, -1, false)
          .attr(PostDefendContactDamageAbAttr, 8)
          .bypassFaint(),
      new Ability(Abilities.MASCOT_FORM, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ELECTRIC, 1.2)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.ELECTRIC, Type.NORMAL, 1.75),
      new Ability(Abilities.COPY_GUARD, 9)
          .attr(AlwaysHitAbAttr)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.75),
      new Ability(Abilities.MUSCLE_FORM, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIGHTING, 1.2)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIGHTING, Type.NORMAL, 1.75),
      new Ability(Abilities.UNREAL_PRESSURE, 9)
          .attr(IncreasePpAbAttr)
          .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => getPokemonMessage(pokemon, i18next.t("abilityTriggers:questionPressure")))
          .attr(PostSummonStatChangeAbAttr, [BattleStat.RAND, BattleStat.ACC], -1, false),
      new Ability(Abilities.PSYCHO_FORM, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.PSYCHIC, 1.2)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.PSYCHIC, Type.NORMAL, 1.75),
      new Ability(Abilities.CLUB_CLOBBER, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ROCK, 1.2)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 1.4),
      new Ability(Abilities.YABA_DABA_DOO, 9)
          .attr(PostSummonStatBoostAbAttr, 1)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -1),
      new Ability(Abilities.METEOR_PROOF, 9)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.WATER, 0.75)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.ROCK, 0.75)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FIRE, 0.75)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.ICE, 0.75),
      new Ability(Abilities.SHARK_SHRED, 9)
          .attr(PostAttackContactDamageAbAttr, 8)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 1/8),
      new Ability(Abilities.ATTACK_BOOST, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.ATK, 1),
      new Ability(Abilities.REVERSED_PSYCHOLOGY, 9)
          .attr(StatChangeMultiplierAbAttr, -1)
          .attr(MovePowerInverseAbAttr, (user, target, move) => true, 1),
      new Ability(Abilities.TAIL_COMMAND, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("tail"), 1.75),
      new Ability(Abilities.ABYSSAL_AQUA, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.WATER, Type.GHOST, 2, true)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.WATER, Type.DARK, 2, true)
          .attr(PostAttackApplyTagAbAttr, false, 30, [BattlerTagType.WHIRLPOOL], 1),
      new Ability(Abilities.OMNISCALE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => randSeedChance(30), 0.5)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => randSeedChance(30), BattleStat.RAND, 1),
      new Ability(Abilities.BOUNCE_BACK, 9)
          .attr(PreDefendSurviveAndDamageAbAttr, 30, 1/8),
      new Ability(Abilities.COUNTER_COAT, 9)
          .attr(PostAttackContactDamageAbAttr, 6)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => true, 0.85),
      new Ability(Abilities.SHINY_SCALE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => randSeedChance(10), 0),
      new Ability(Abilities.GOLDEN_LUCK, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => randSeedChance(30)),
      new Ability(Abilities.ONE_IN_A_MILLION, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(5), 5),
      new Ability(Abilities.APEX_PREDATOR, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.DEF], -1, false)
          .attr(PostVictoryTopStatChangeAbAttr,1),
      new Ability(Abilities.TERROR_TUNNEL, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("dig"), 2),
      new Ability(Abilities.LOOSE_THREADS, 9)
          .attr(PostAttackApplyTagAbAttr, false, 30, [BattlerTagType.WRAP], 1)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("bind") || move.name.toLowerCase().includes("wrap"), 5),
      new Ability(Abilities.STREET_SMART, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.STEEL, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.DARK, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.NORMAL, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.FIGHTING, 1.2),
      new Ability(Abilities.BOOSHE_FUR_COAT, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, 0.5)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.SPECIAL && randSeedChance(40), 0.75),
      new Ability(Abilities.CHAMPION, 9)
          .attr(PostVictoryStatsChangeAbAttr, 1, BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => true, true),
      new Ability(Abilities.SNAKE_SCALE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(50), 0.75)
          .attr(PostDefendContactApplyStatusEffectAbAttr, 30, StatusEffect.TOXIC),
      new Ability(Abilities.DEATH_CLAWS, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 1.5)
          .attr(MovePowerNeutralAbAttr, (target, user, move) => target!.getAttackTypeEffectiveness(move.type, user!) < 1),
      new Ability(Abilities.INDUSTRIAL_POWER, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ELECTRIC, 1.3)
          .attr(MoveTypePowerBoostAbAttr, Type.STEEL, 1.3)
          .attr(MoveTypePowerBoostAbAttr, Type.POISON, 1.3),
      new Ability(Abilities.COG_OVERLOAD, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("gear"), 1.5)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("spin"), 1.5),
      new Ability(Abilities.MULTI_GEAR, 9)
          .attr(PostMoveStatChangeAbAttr, (user, target, move) => move.id === Moves.SHIFT_GEAR, 1, [BattleStat.SPD, BattleStat.RAND]),
      new Ability(Abilities.SUGAR_RUSH, 9)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => pokemon.getHpRatio() > 0.5, 1)
          .attr(MovePowerBoostAbAttr, (user, target, move) => user!.getHpRatio() > 0.5, 1.2),
      new Ability(Abilities.LIVING_DELICACY, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.RAND, BattleStat.RAND], 1, true)
          .attr(MovePowerBoostAbAttr, (user, target, move) => Utils.randSeedInt(3,1) === 1, 1.5)
          .attr(PostDefendChanceHealAbAttr, (target, user, move) => randSeedChance(30), 1/8, false),
      new Ability(Abilities.ABANDONED, 9)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => true, [BattleStat.ATK, BattleStat.SPD], 1),
      new Ability(Abilities.LAZY_MIGHT, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.ALL),
      new Ability(Abilities.LASAGNA, 9)
          .attr(PostDefendChanceHealAbAttr, (target, user, move) => target.getHpRatio() <= 0.5,  1/2)
          .condition(getOncePerBattleCondition(Abilities.LASAGNA)),
      new Ability(Abilities.ALIEN_CAT, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.PSYCHIC, 1.2)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => (
              target!.species.name.toLowerCase().includes("meowth") ||
              target!.species.name.toLowerCase().includes("persian") ||
              target!.species.name.toLowerCase().includes("skitty") ||
              target!.species.name.toLowerCase().includes("delcatty") ||
              target!.species.name.toLowerCase().includes("glameow") ||
              target!.species.name.toLowerCase().includes("purugly") ||
              target!.species.name.toLowerCase().includes("purrloin") ||
              target!.species.name.toLowerCase().includes("liepard") ||
              target!.species.name.toLowerCase().includes("espurr") ||
              target!.species.name.toLowerCase().includes("meowstic") ||
              target!.species.name.toLowerCase().includes("litten") ||
              target!.species.name.toLowerCase().includes("torracat") ||
              target!.species.name.toLowerCase().includes("incineroar") ||
              target!.species.name.toLowerCase().includes("sprigatito") ||
              target!.species.name.toLowerCase().includes("floragato") ||
              target!.species.name.toLowerCase().includes("meowscarada") ||
              target!.species.name.toLowerCase().includes("shinx") ||
              target!.species.name.toLowerCase().includes("luxio") ||
              target!.species.name.toLowerCase().includes("luxray") ||
              target!.species.name.toLowerCase().includes("litleo") ||
              target!.species.name.toLowerCase().includes("pyroar") ||
              target!.species.name.toLowerCase().includes("solgaleo") ||
              target!.species.name.toLowerCase().includes("zeraora")
          ) && target?.gender != user?.gender, [BattlerTagType.INFATUATED], 1)
          .attr(TypeImmunityAbAttr, Type.GROUND),
      new Ability(Abilities.PHASER, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 0),
      new Ability(Abilities.VIRTUAL_TACOS, 9)
          .attr(PostTurnHealConditionAbAttr, (pokemon, opponent) => true, 1/8),
      new Ability(Abilities.HEY_LOOK_AT_ME, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.RAND, BattleStat.RAND], -1, false)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, 1, true),
      new Ability(Abilities.LIMITED_TIME, 9)

          .attr(PostSummonStatusEffectAbAttr, (pokemon, opponent) => true, StatusEffect.TOXIC, true)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(30), 3)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.RAND, 1),
      new Ability(Abilities.BOX_BORN, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("ball") || move.name.toLowerCase().includes("sphere") || move.name.toLowerCase().includes("orb"), 0.25)
          .attr(MoveTypePowerBoostAbAttr, Type.STEEL, 1.2),
      new Ability(Abilities.IM_A_PICKLE, 9)
          .attr(TypeImmunityHealAbAttr, Type.WATER)
          .attr(TypeImmunityStatChangeAbAttr, Type.GRASS, BattleStat.SPD, 1)
          .attr(TypeImmunityStatChangeAbAttr, Type.STEEL, BattleStat.ATK, 1)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 1),
      new Ability(Abilities.RESOURCEFUL, 9)
          .attr(PostAttackStealAndStatChangeAbAttr, 30, 30, BattleStat.ATK, 1, true)
          .attr(PostBattleLootAbAttr, 30),
      new Ability(Abilities.DEADLY_BRINE, 9)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(MoveTypePowerBoostAbAttr, Type.WATER, 1.3)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.WATER, Type.POISON, 2)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => randSeedChance(10)),
      new Ability(Abilities.THICC, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(30), 0.75),
      new Ability(Abilities.ENFORCER, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.DARK, Type.STEEL, 2)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.ATK, 1),
      new Ability(Abilities.SPOOKY_SENSE, 9)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.GHOST, 0.75)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.DARK, 0.75)
          .conditionalAttr(getAnticipationCondition(), PostSummonStatChangeAbAttr, [BattleStat.ATK, BattleStat.SPD], 1, true),
      new Ability(Abilities.UNYIELDING_COURAGE, 9)
          .attr(PreDefendFullHpEndureAbAttr)
          .attr(BlockOneHitKOAbAttr)
          .attr(PreDefendSurviveAbAttr, 25),
      new Ability(Abilities.LOVE_POWER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(50), 2)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => target?.gender != user?.gender && randSeedChance(30), [BattlerTagType.INFATUATED], 1),
      new Ability(Abilities.SPIRIT_WINDS, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GHOST, Type.GRASS, 2)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.2, (user, target, move) => move.type === Type.DARK)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.2, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.LEAF_DANCER, 9)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => move.type === Type.DARK, 1, BattleStat.RAND)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.type === Type.GRASS, BattleStat.RAND, 1, true),
      new Ability(Abilities.SLAYER_SENSEI, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target!.getTypes().some(t => t === Type.GHOST || t === Type.DARK), 3)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.RAND, 1),
      new Ability(Abilities.BALANCED, 9)
          .attr(BattlerTagImmunityAbAttr, BattlerTagType.CONFUSED)
          .attr(AlwaysHitAbAttr)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(50), 0.75),
      new Ability(Abilities.ENHANCED_FOCUS, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => randSeedChance(25)),
      new Ability(Abilities.LUCKY_SEVEN, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.power === 70 && randSeedChance(70), 1.7)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => randSeedChance(70), 1, BattleStat.RAND),
      new Ability(Abilities.LAST_LAUGH, 9)

          .attr(PostFaintDamageAbAttr, (fainted, attacker) => true,1/4)
          .bypassFaint(),
      new Ability(Abilities.FOX_WISDOM, 9)
          .attr(MoveTypeChangeAbAttr, Type.PSYCHIC, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(MoveTypePowerBoostAbAttr, Type.PSYCHIC, 1.3)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.PSYCHIC, 2),
      new Ability(Abilities.ETERNAL_YOUTH, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FAIRY, 1.3)
          .attr(MoveTypeChangeAbAttr, Type.FAIRY, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PreDefendSurviveAbAttr, 10),
      new Ability(Abilities.FLAMING_CHAKRA, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1, (user, target, move) => move.type !== Type.PSYCHIC)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE, 1.5)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => randSeedChance(10)),
      new Ability(Abilities.ADAPTABUGILITY, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.BUG, 3),
      new Ability(Abilities.SHELL_REPAIR, 9)

          .attr(PostAttackHealAbAttr, (user, target, move) => move.id === Moves.SHELL_SMASH, 1/4)
          .attr(PostMoveStatChangeAbAttr, (user, target, move) => move.id === Moves.SHELL_SMASH, 1, [BattleStat.DEF, BattleStat.SPDEF], true)
          .condition(getOncePerBattleCondition(Abilities.SHELL_REPAIR)),
      new Ability(Abilities.SQUEEZER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.id === Moves.WRAP, 5)
          .attr(PostAttackApplyTagAbAttr, false, 30, [BattlerTagType.WRAP], 1),
      new Ability(Abilities.GREEN_SPAGHETTI_MONSTER, 9)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.GRASS && randSeedChance(15), [BattlerTagType.WRAP], 1)
          .attr(MoveTypePowerBoostAbAttr, Type.GRASS, 1.2)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => move.type === Type.GRASS && randSeedChance(10), -1, BattleStat.SPD),
      new Ability(Abilities.LEECH_VINES, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.id === Moves.VINE_WHIP, 2)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.id === Moves.VINE_WHIP && randSeedChance(30), [BattlerTagType.SEEDED, BattlerTagType.WRAP], 1),
      new Ability(Abilities.REGENERATOR_PLUS, 9)

          .attr(PreSwitchOutHealConditionAbAttr, (switcher, opponent) => true, 45),
      new Ability(Abilities.PLAGUE_PSYCHE, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.POISON, Type.PSYCHIC, 2)
          .attr(MoveTypeChangeAbAttr, Type.POISON, 1, (user, target, move) => move.type === Type.NORMAL)

          .attr(PostAttackTagOrStatusAbAttr, (user, target, move) => true, [BattlerTagType.CONFUSED], 10, 1, [StatusEffect.POISON, StatusEffect.TOXIC], 10),
      new Ability(Abilities.TOXIC_TRANCE, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => randSeedChance(30))
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.SLEEP, (user, target, move) => randSeedChance(30))
          .attr(MovePowerBoostAbAttr, (user, target, move) => user?.status !== null, 1.5),
      new Ability(Abilities.PERMAFROST_ARMOR, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => [Type.FIRE, Type.ICE, Type.ROCK].includes(move.type), 0.5),
      new Ability(Abilities.GLACIAL_PACE, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.SPD, -2, false)
          .attr(MoveTypePowerBoostAbAttr, Type.ICE, 1.2),
      new Ability(Abilities.ICE_KING, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ICE, 1.5)
          .attr(MoveTypeChangeAbAttr, Type.ICE, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.FREEZE, (user, target, move) => randSeedChance(5)),
      new Ability(Abilities.DESPAIR, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -1, false)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, 1, true),
      new Ability(Abilities.OHAYOGOSUMASU, 9)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD], -1, false),
      new Ability(Abilities.ABILITY_TEXT_HERE, 9)
          .attr(PostSummonAbilityGiveAbAttr, (pokemon, opponent) => true, Abilities.ABILITY_TEXT_HERE)
          .attr(PostSummonStatChangeAbAttr, [BattleStat.RAND, BattleStat.RAND], 1, true),
      new Ability(Abilities.EXCEPTION_CAUGHT, 9)
          .attr(SturdySpeedDropAbAttr)
          .attr(HealAfterHitAbAttr),
      new Ability(Abilities.FOUR_O_FOUR, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => randSeedChance(10), 0),
      new Ability(Abilities.SHADOW_SLAYER, 9)
          .attr(PostAttackChanceStatusAbAttr, [StatusEffect.BURN, StatusEffect.POISON, StatusEffect.PARALYSIS, StatusEffect.TOXIC], (user, target, move) => move.type === Type.GHOST || move.type === Type.STEEL && randSeedChance(30)),
      new Ability(Abilities.NIGHTMARE_EMERALD, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ROCK, 1.3)
          .attr(MoveTypePowerBoostAbAttr, Type.DARK, 1.3)
          .attr(PostAttackAbilityGiveOrTagAbAttr, Abilities.COMATOSE, 50, BattlerTagType.NIGHTMARE, 50),
      new Ability(Abilities.IMAGINARY, 9)
          .attr(MoveTypeChangeAbAttr, Type.FAIRY, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL && randSeedChance(30), 0.5),
      new Ability(Abilities.SPLINTER_SKIN, 9)
          .attr(PostDefendContactDamageAbAttr, 1/12)
          .attr(PostAttackContactDamageAbAttr, 1/12),
      new Ability(Abilities.JUJUTSU_SORCERER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => user?.status !== undefined || target?.status !== undefined, 2.5)
          .attr(PostAttackChanceStatusRemoveAbAttr, (pokemon, defender, move) => randSeedChance(20), true)
          .attr(PostAttackChanceStatusRemoveAbAttr, (pokemon, defender, move) => randSeedChance(20), false)
          .attr(PostAttackChanceStatusAbAttr, [StatusEffect.BURN, StatusEffect.POISON, StatusEffect.PARALYSIS, StatusEffect.TOXIC], 30)
          .attr(BypassBurnDamageReductionAbAttr)
            .attr(PostTurnChanceStatusAbAttr, (pokemon) => pokemon.status === undefined && randSeedChance(50), [StatusEffect.BURN, StatusEffect.POISON, StatusEffect.PARALYSIS, StatusEffect.TOXIC], true),
      new Ability(Abilities.TOXIC_KING, 9)
          .attr(PostAttackApplyStatusEffectAbAttr, true, 100, StatusEffect.TOXIC),
      new Ability(Abilities.SWAMP_KING, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.POISON, (user, target, move) => randSeedChance(30))
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.WATER, Type.POISON, 2),
      new Ability(Abilities.RAGE_SOUL, 9)
          .attr(VariableMovePowerBoostAbAttr, (user, target, move) => 1 + 0.3 * Math.min(user.isPlayer() ? user.scene.currentBattle.playerFaints : user.scene.currentBattle.enemyFaints, 5)),
      new Ability(Abilities.DARK_SIDE, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.DARK, 2),
      new Ability(Abilities.PUPPET_MASTER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target?.species.speciesId === Species.MIMIKYU || target?.species.speciesId === Species.SHUPPET || target?.species.speciesId === Species.BANETTE || target?.species.speciesId === Species.GOTHITA || target?.species.speciesId === Species.GOTHORITA || target?.species.speciesId === Species.GOTHITELLE || target?.species.speciesId === Species.HATENNA || target?.species.speciesId === Species.HATTREM || target?.species.speciesId === Species.HATTERENE, 3)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => target!.getTypes().some(t => t === Type.NORMAL || t === Type.FIGHTING) && randSeedChance(20), [BattlerTagType.CURSED, BattlerTagType.BIND], 1)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(10), 0.5),
      new Ability(Abilities.BLACK_AND_RED, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.DARK, Type.FIRE, 2)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => randSeedChance(15))
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.ZOMBIE_EXPERIENCE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target!.getTypes().some(t => t === Type.DARK || t === Type.GHOST || t === Type.GROUND), 2)
          .attr(PostKnockOutStatChangeAbAttr, [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD], 1, (user, target) => target.getTypes().some(t => t === Type.DARK || t === Type.GHOST || t === Type.GROUND)),
      new Ability(Abilities.LAST_HOPE, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.ALL),
      new Ability(Abilities.UGLY, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, -1, true)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -1, false)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 1),
      new Ability(Abilities.BLAND_CARDBOARD_EATER, 9)
          .attr(TypeImmunityStatChangeAbAttr, Type.GRASS, BattleStat.ATK, 1)
          .attr(PostAttackHealAbAttr, (user, target, move) => move.type === Type.GRASS, 1/8),
      new Ability(Abilities.BORING, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, -1, true)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -1, false)
          .attr(MoveTypePowerBoostAbAttr, Type.NORMAL, 1.3),
      new Ability(Abilities.MOLDY_TOUCH, 9)

          .attr(PostAttackTagOrStatusAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), [BattlerTagType.INFESTATION], 10, 1, [StatusEffect.TOXIC, StatusEffect.PARALYSIS], 10)
          .attr(MoveTypePowerBoostAbAttr, Type.POISON, 1.2)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => user.getAbility().id === Abilities.MOLD_BREAKER, 2),
      new Ability(Abilities.ETERNAL_GIGGLE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => user.getAbility().id === Abilities.MOLD_BREAKER, 2)
          .attr(PostFaintTagAbAttr, [BattlerTagType.CONFUSED, BattlerTagType.FLINCHED], 1)
          .bypassFaint(),
      new Ability(Abilities.RED_MENACE, 9)
          .attr(PostAttackTagOrStatusAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), [BattlerTagType.CURSED], 5, 3, [StatusEffect.BURN], 10)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE, 1.2)
          .attr(TypeImmunityStatChangeAbAttr, Type.FIRE, BattleStat.SPD, 1)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => user.getAbility().id === Abilities.MOLD_BREAKER, 2),
      new Ability(Abilities.GHOSTLY_MOLD, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT) && randSeedChance(10))
          .attr(SharedWeaknessPowerBoostAbAttr, Type.POISON, Type.GHOST, 2)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => user.getAbility().id === Abilities.MOLD_BREAKER, 2),
      new Ability(Abilities.PAC_FUNGUS, 9)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT) && randSeedChance(30), [BattlerTagType.INFESTATION], 1)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => target?.findTag(tag => tag.tagType === BattlerTagType.INFESTATION) !== null, 1, [BattleStat.SPD, BattleStat.ATK])
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => user.getAbility().id === Abilities.MOLD_BREAKER, 2),
      new Ability(Abilities.SECRET_SAUCE, 9)
          .attr(PostAttackChanceStatusAbAttr, [StatusEffect.PARALYSIS, StatusEffect.BURN, StatusEffect.POISON, StatusEffect.TOXIC], (user, target, move) => randSeedChance(10))
          .attr(PostAttackChanceDamageAbAttr,  1/8, 10)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.ENCORE, BattlerTagType.DROWSY, BattlerTagType.TRAPPED, BattlerTagType.BIND, BattlerTagType.INFESTATION, BattlerTagType.CURSED, BattlerTagType.CONFUSED], 1)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(10), 1/8),
      new Ability(Abilities.MCPUZZLE, 9)
          .attr(PostAttackApplyTagAbAttr, false, 20, [BattlerTagType.CONFUSED], 1)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 1)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(20), 2.5)
          .attr(PostFaintStatChangeAbAttr, BattleStat.RAND, 1, (pokemon, attacker) => true)
          .bypassFaint(),
      new Ability(Abilities.MAY_I_TAKE_YOUR_ORDER, 9)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => true, 1),
      new Ability(Abilities.STEALTH_SHIPPING, 9)
          .attr(PostDefendApplyArenaTrapTagsAbAttr, [
            { type: ArenaTagType.SPIKES, chance: 50 },
            { type: ArenaTagType.STEALTH_ROCK, chance: 20 },
            { type: ArenaTagType.TOXIC_SPIKES, chance: 20 },
            { type: ArenaTagType.STICKY_WEB, chance: 10 }
          ], (pokemon, attacker, move) => move.hasFlag(MoveFlags.MAKES_CONTACT) && randSeedChance(50))
          .bypassFaint(),
      new Ability(Abilities.CARDBOARD_EMPIRE, 9)
          .attr(PostKnockOutStatChangeAbAttr, [BattleStat.RAND, BattleStat.RAND], 1)
          .attr(PostKnockOutHealAbAttr, (pokemon, knockedOut) => true, 1/8),
      new Ability(Abilities.A_WINNER, 9)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.RAND, 1),
      new Ability(Abilities.SMUG_AURA, 9)
          .attr(MoveTypeChangeAbAttr, Type.POISON, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.PSYCHIC, Type.POISON, 2)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.POISON, 10),
      new Ability(Abilities.DEEP_THOUGHTS, 9)
          .attr(PostAttackApplyTagAbAttr, false, 30, [BattlerTagType.CONFUSED], 1),
      new Ability(Abilities.INTELLY_LECT_ALLY, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.SPATK, 1),
      new Ability(Abilities.INSOMNIA_INK, 9)
          .attr(PostAttackAbilityGiveOrTagAbAttr, Abilities.COMATOSE, 50, BattlerTagType.NIGHTMARE, 50),
      new Ability(Abilities.NIGHTMARE_CLARINET, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.SOUND_BASED, 1.2, (user, target, move) => true)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SOUND_BASED), 1.5)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.CURSED], 1)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.SOUND_BASED, (user, target, move) => true),
      new Ability(Abilities.JELLYFISH_FEVER, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => move.category === MoveCategory.SPECIAL && randSeedChance(10))
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => move.category === MoveCategory.PHYSICAL && randSeedChance(10))
          .attr(SharedWeaknessPowerBoostAbAttr, Type.POISON, Type.FIRE,2),
      new Ability(Abilities.DEEP_SEA_VIRUS, 9)
          .attr(PostDefendStatusDamageAbAttr, StatusEffect.TOXIC, 1/8)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => randSeedChance(30)),
      new Ability(Abilities.BUBBLING_BRAINS, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.WATER, 1.5)
          .attr(PostAttackHealAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 1/8),
      new Ability(Abilities.CLOAK_OF_SHADOWS, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.GHOST, 1.2)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.75),
      new Ability(Abilities.ACID_WATER, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.POISON, Type.WATER, 2)
          .attr(MoveTypeChangeAbAttr, Type.POISON, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(MovePowerBoostAbAttr, (user, target, move) => (target?.getTypes().includes(Type.NORMAL) || target?.getTypes().includes(Type.STEEL) || target?.getTypes().includes(Type.FIGHTING)) && move.type === Type.WATER || move.type === Type.POISON, 2),
      new Ability(Abilities.EIGHT_BIT_BLAZE, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.FIRE)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FIRE_SPIN], 1)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (target, user, move) => randSeedChance(10)),
      new Ability(Abilities.CHARRED_MEMORY, 9)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => move.type === Type.FIRE, -1, BattleStat.SPDEF, false)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.PSYCHIC, 2)
          .attr(MoveTypeChangeAbAttr, Type.PSYCHIC, 1.2, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.BLACK_AND_WHITE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.type !== Type.NORMAL && move.type !== Type.DARK, 0),
      new Ability(Abilities.EIGHT_BIT_TERROR, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("nightmare"), 1.2)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.CURSED, BattlerTagType.FLINCHED], 1)
          .attr(PostAttackChanceDamageAbAttr, 1/8, 10),
      new Ability(Abilities.CORRUPTION_BLAZE, 9)
          .attr(LowHpMoveTypePowerBoostAbAttr, Type.FIRE)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.DARK, Type.FIRE, 2)
          .attr(PostDefendMoveDisableAbAttr, 30)
          .bypassFaint(),
      new Ability(Abilities.OAKS_MISTAKE, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, -1, false)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.SEEDED, BattlerTagType.WHIRLPOOL], 1)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (target, user, move) => randSeedChance(10))
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(30), 1/8),
      new Ability(Abilities.SHELL_SHOCK, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.WATER, Type.ELECTRIC, 2)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.WATER || move.type === Type.NORMAL && randSeedChance(10), [BattlerTagType.FLINCHED], 1)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS, (target, user, move) => randSeedChance(10) && move.type === Type.WATER || move.type === Type.NORMAL),
      new Ability(Abilities.DARK_SEED, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GRASS, Type.DARK, 2)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.GRASS || move.type === Type.NORMAL && randSeedChance(10), [BattlerTagType.FLINCHED, BattlerTagType.SEEDED], 1),
      new Ability(Abilities.CURSED_SHELL, 9)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.CURSED], 1)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, 0.75),
      new Ability(Abilities.GOTHAMS_NIGHTMARE, 9)
          .attr(ArenaTrapAbAttr, (user, target) => true)
          .attr(ConditionalCritAbAttr, (user, target, move) => randSeedChance(20)),
      new Ability(Abilities.DOOM_GADGETS, 9)
          .attr(MoveTypeChangeAbAttr, Type.STEEL, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(MoveTypePowerBoostAbAttr, Type.STEEL, 1.2)
          .attr(PostAttackChanceStatusAbAttr, [StatusEffect.PARALYSIS, StatusEffect.BURN, StatusEffect.POISON, StatusEffect.TOXIC], (user, target, move) => randSeedChance(10)),
          new Ability(Abilities.MEME_ARMOR, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(50), 0.5)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => true, BattleStat.RAND, 1, true)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => true, BattleStat.RAND, -1, true),
      new Ability(Abilities.MEMEIFIED, 9)
          .attr(PreDefendSurviveAbAttr, 10)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.category === MoveCategory.SPECIAL && randSeedChance(20), 2),
      new Ability(Abilities.HUNGRY_TROLL, 9)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(50), 1/8)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => randSeedChance(50), 1, BattleStat.RAND),
      new Ability(Abilities.MONOTONE_MOOD, 9)
          .attr(MoveTypeChangeAbAttr, Type.NORMAL, 1, (user, target, move) => true)
          .attr(MoveTypePowerBoostAbAttr, Type.NORMAL, 1.2)
          .attr(IgnoreTypeImmunityAbAttr, Type.GHOST, [Type.NORMAL])
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.DROWSY], 1),
      new Ability(Abilities.BOREDOM_AURA, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -2, false),
      new Ability(Abilities.SQUIDLY_STEP, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SOUND_BASED) || move.name.toLowerCase().includes('kick'), 1.3)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.type === Type.GROUND || move.type === Type.WATER, BattleStat.SPD, 1),
      new Ability(Abilities.NIGHTMARE_INK, 9)
          .attr(PostAttackAbilityGiveOrTagAbAttr, Abilities.COMATOSE, 90, BattlerTagType.NIGHTMARE, 90),
      new Ability(Abilities.ABYSSAL_MELODY, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.SOUND_BASED, 1.2, (user, target, move) => true)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SOUND_BASED), 1.5)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.CURSED], 1)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.SOUND_BASED, (user, target, move) => true),
      new Ability(Abilities.CHARMING_MIST, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GHOST, Type.FAIRY, 2)
          .attr(MoveTypeChangeAbAttr, Type.FAIRY, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.FAIRY || move.type === Type.GHOST && randSeedChance(20) && user?.gender != target?.gender, [BattlerTagType.INFATUATED], 1),
      new Ability(Abilities.ECTOPLASMIC_CHARM, 9)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.GHOST && randSeedChance(20) && user?.gender != target?.gender, [BattlerTagType.INFATUATED], 1)
          .attr(PostAttackChanceDamageAbAttr, 1/8, 50),
      new Ability(Abilities.SUPER_HUNGRY, 9)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(50), 1/8)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => randSeedChance(50), 1, BattleStat.RAND),
      new Ability(Abilities.FOOLS_GOLD, 9)
          .attr(MoveImmunityAbAttr, (pokemon, attacker, move) => pokemon !== attacker && move.category === MoveCategory.STATUS)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.DARK, Type.STEEL, 2),
      new Ability(Abilities.SHOW_AND_TELL, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => {
            const lastMoves = user?.getLastXMoves(2);
            return lastMoves != undefined && lastMoves.length >= 2 && lastMoves[1].move !== move.id;
          }, 2),
      new Ability(Abilities.KNIGHTS_SHOVEL, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GROUND, Type.STEEL,2)
          .attr(TypeImmunityAbAttr, Type.GROUND),
      new Ability(Abilities.HEROIC_LEAP, 9)
          .attr(TypeImmunityAbAttr, Type.GROUND)
          .attr(PostSummonStatChangeAbAttr, BattleStat.ATK, 1, true)
          .attr(MoveTypeChangeAbAttr, Type.FLYING, 1.2, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.DIG_CHAMPION, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("dig"), 2),
      new Ability(Abilities.EIGHT_BIT_HUNGER, 9)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(50), 1/8)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 1),
      new Ability(Abilities.ROCK_SOLID_MEME, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.NORMAL, Type.ROCK, 2)
          .attr(ReceivedMoveDamageMultiplierAbAttr,(target, user, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 0.75),
      new Ability(Abilities.ROCK_ROLL, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.ROCK, 1.2)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.name.toLowerCase().includes("roll") || move.name.toLowerCase().includes("spin"), 1.75)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => randSeedChance(20) && move.name.toLowerCase().includes("roll") || move.name.toLowerCase().includes("spin"), [BattlerTagType.FLINCHED], 1),
      new Ability(Abilities.STATIC_SHOCK, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS, (user, target, move) => randSeedChance(30))
          .attr(MovePowerBoostAbAttr, (user, target, move) => target?.status?.effect === StatusEffect.PARALYSIS, 1.5),
      new Ability(Abilities.HORROR_SHOW, 9)
          .attr(ArenaTrapAbAttr, (user, target) => true)
          .attr(PostVictoryTopStatChangeAbAttr, 1),
      new Ability(Abilities.SUNBATHER, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.WATER, 2)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostTurnHealConditionAbAttr, (pokemon) => pokemon.scene.arena.weather?.weatherType === WeatherType.SUNNY, 1/8)
          .attr(PostTurnWeatherChangeAbAttr, WeatherType.SUNNY, (pokemon) => randSeedChance(30)),
      new Ability(Abilities.SEED_EATER, 9)
          .attr(TypeImmunityHealAbAttr, Type.GRASS)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target!.getTypes().includes(Type.GRASS), 2)
          .attr(PostAttackHealAbAttr, (user, target, move) => target!.getTypes().includes(Type.GRASS), 1/8)
          .attr(PostDefendChanceHealAbAttr, (target, user, move) => move.name.toLowerCase().includes("seed"), 1/2),
      new Ability(Abilities.VACAY_SOUL, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => true, 3)
          .attr(PostSummonAddBattlerTagAbAttr, BattlerTagType.TRUANT, 1, false),
      new Ability(Abilities.SCREEN_SWIM, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.STEEL, Type.WATER, 2)
          .attr(PostTurnHealConditionAbAttr, (pokemon) => pokemon.scene.arena.weather?.weatherType === WeatherType.RAIN, 1/8)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 1)
          .attr(PostTurnWeatherChangeAbAttr, WeatherType.RAIN, (pokemon) => randSeedChance(30)),
      new Ability(Abilities.DARK_WATERS, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.DARK, Type.WATER, 2)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.WATER || move.type === Type.DARK && randSeedChance(10), [BattlerTagType.WHIRLPOOL], 1)
          .attr(PostAttackChanceDamageAbAttr,  1/8, (user, target, move) => move.type === Type.WATER || move.type === Type.DARK && randSeedChance(10)),
      new Ability(Abilities.EXPERIMENT_ERROR, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, -1, false)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.SEEDED, BattlerTagType.WHIRLPOOL], 1)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => randSeedChance(10))
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(30), 1/8),
      new Ability(Abilities.ROUNDING_ERROR, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.power % 5 === 0 && move.power % 10 !== 0, 0.5)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.power % 5 === 0 || move.power % 10 !== 0, 1.5),
      new Ability(Abilities.IDEAL_FORM, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => randSeedChance(10))
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(10), 0.5)
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(10), 2)
          .attr(PostDefendChanceHealAbAttr, (target, user, move) => randSeedChance(10), 1/8)
          .attr(PostAttackChanceHealAbAttr, (user, target, move) => randSeedChance(10), 1/8),
      new Ability(Abilities.ELITE_STATIC, 9)
          .attr(PostDefendContactApplyStatusEffectAbAttr, 50, StatusEffect.PARALYSIS)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), BattleStat.RAND, -1, false)
          .attr(PostDefendContactDamageAbAttr, 8)
          .bypassFaint(),
      new Ability(Abilities.COCKADOODLE_YES, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, 1, true)
          .attr(PostVictoryTopStatChangeAbAttr, 1)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 1.3),
      new Ability(Abilities.CARNIVORE, 9)
          .attr(PostAttackHealAbAttr, (user, target, move) => [Type.NORMAL, Type.FIGHTING, Type.FLYING, Type.BUG, Type.PSYCHIC, Type.DRAGON, Type.DARK, Type.FAIRY].some(type => target?.getTypes().includes(type)), 1/8)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.ATK, 1)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.SPD, 1),
      new Ability(Abilities.NIGHT_SHOW, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -2, false),
      new Ability(Abilities.NIGHTMARE_HOST, 9)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => randSeedChance(50), 1)
          .attr(PostAttackChanceStatusAbAttr, [StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.BURN], (user, target, move) => randSeedChance(10)),
      new Ability(Abilities.PRESSURE_PLAY, 9)
          .attr(IncreasePpTwoAbAttr)
          .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => getPokemonMessage(pokemon, i18next.t("abilityTriggers:allOrNothingPressure")))
          .attr(PostSummonStatChangeAbAttr, BattleStat.ATK, -1, false),
      new Ability(Abilities.A_B_C_OR_D, 9)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => randSeedChance(10), 1, BattleStat.ATK)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => randSeedChance(10))
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => randSeedChance(10), [BattlerTagType.CONFUSED], 1)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => randSeedChance(10), [BattlerTagType.DROWSY], 1),
      new Ability(Abilities.MIDNIGHT_COOKIES, 9)
          .attr(PostTurnHealConditionAbAttr, (pokemon, opponent) => randSeedChance(30), 1/8)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, 1, false, 30),
      new Ability(Abilities.HORRIBLE_CARDBOARD, 9)
          .attr(MoveTypeChangeAbAttr, Type.NORMAL, 1.2, (user, target, move) => true)
          .attr(IgnoreTypeImmunityAbAttr, Type.GHOST, [Type.NORMAL])
          .attr(PostAttackChanceDamageAbAttr,  1/8, 30),
      new Ability(Abilities.THE_ELDER_SHADOWS, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GHOST, Type.DARK, 2)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostTurnDamageAbAttr, 1/16, (pokemon, opponent) => randSeedChance(30))
          .attr(MovePowerBoostAbAttr, (user, target, move) => randSeedChance(30), 2)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.RAND, 1),
      new Ability(Abilities.HORRIBLE_GHOST_CARDBOARD, 9)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(IgnoreTypeImmunityAbAttr, Type.NORMAL, [Type.GHOST])
          .attr(PostAttackChanceDamageAbAttr,  1/8, 30),
      new Ability(Abilities.MIDNIGHT_COOKIES_OF_DEATH, 9)
          .attr(PostTurnDamageAbAttr,  1/8, (pokemon, opponent) => randSeedChance(30), false)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, 1, false, (pokemon) => randSeedChance(30)),
      new Ability(Abilities.INFOMERCIAL_FAME, 9)
          .attr(PostSummonStatBoostAbAttr, 1)
          .attr(PostTurnDamageAbAttr, 1/8, (pokemon, opponent) => randSeedChance(30), true),
      new Ability(Abilities.WINNERS_GRIN, 9)
          .attr(PostVictoryTopStatChangeAbAttr, 1)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.RAND, 1),
      new Ability(Abilities.FANCY_CARDBOARD, 9)
          .attr(MoveTypeChangeAbAttr, Type.NORMAL, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(IgnoreTypeImmunityAbAttr, Type.GHOST, [Type.NORMAL])
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.power <= 60, 1.5),
      new Ability(Abilities.ABYSSAL_STANCE, 9)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => randSeedChance(30), BattleStat.RAND, 1)
          .attr(PostDefendDamageAbAttr, (target, user, move) => randSeedChance(30), 1/8, false)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => randSeedChance(10), -1, BattleStat.RAND)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL),
      new Ability(Abilities.UNJUSTIFIED, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.NORMAL, Type.DARK, 2, true)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIGHTING, Type.DARK, 2, true)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.type === Type.FAIRY, 0.5)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.type === Type.FAIRY, BattleStat.ATK, 1),
      new Ability(Abilities.LEAFY_LURE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) > 1 && randSeedChance(50), 0.5)
          .attr(PostDefendDamageAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) > 1 && randSeedChance(50), 1/4, false)
          .attr(PostDefendHealAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) > 1 && randSeedChance(50), 1/6),
      new Ability(Abilities.VORACIOUS_VEGETATION, 9)
          .attr(PostAttackHealAbAttr, (user, target, move) => [Type.NORMAL, Type.FIGHTING, Type.FLYING, Type.BUG, Type.PSYCHIC, Type.DRAGON, Type.DARK, Type.FAIRY].some(type => target?.getTypes().includes(type)), 1/8)
          .attr(PostKnockOutStatChangeAbAttr, [BattleStat.ATK, BattleStat.SPD], 1, true),
      new Ability(Abilities.SOLAR_POWER_PLUS, 9)
          .attr(BattleStatMultiplierAbAttr, BattleStat.SPATK, 2)
          .attr(PostTurnWeatherChangeAbAttr, WeatherType.SUNNY, 30),
      new Ability(Abilities.TREASURE_GUARD, 9)
          .attr(ReceivedMoveDamageRandMultiplierAbAttr, (target, user, move) => true, 0.5, 0.75)
          .attr(PostDefendChanceHealAbAttr, 30, 1/8, false),
      new Ability(Abilities.GOLDEN_SKILL_LINK, 9)
          .attr(MaxMultiHitAbAttr)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => randSeedChance(5), 1, BattleStat.RAND, true),
      new Ability(Abilities.TREASURE_PRODUCER, 9)
          .attr(PostAttackStealHeldItemAbAttr, 50)
          .attr(PostBattleLootAbAttr)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => true, -2),
      new Ability(Abilities.MULTI_MIND, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.PSYCHIC, 2)
          .attr(MoveTypeChangeAbAttr, Type.PSYCHIC, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackChanceDamageAbAttr, 10, 1/8),
      new Ability(Abilities.WAKA_FLOCKA_FLAME, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FLYING, Type.FIRE, 2)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, 10)
          .attr(TypeImmunityAbAttr, Type.FIRE)
          .attr(TypeImmunityHealAbAttr, Type.FIRE),
      new Ability(Abilities.EERIE_LIGHT, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.ELECTRIC, Type.DARK, 2)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.WATER)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.CONFUSED], 1)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS, 10),
      new Ability(Abilities.ABYSSAL_LURE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) > 1 && randSeedChance(50), 0.5)
          .attr(PostDefendDamageAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) > 1 && randSeedChance(50), 1/4, false)
          .attr(PostDefendHealAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) > 1 && randSeedChance(50), 1/6),
      new Ability(Abilities.NEMO_EATER, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target!.getTypes().includes(Type.WATER), 2)
          .attr(PostKnockOutHealAbAttr, (user, target) => target.getTypes().includes(Type.WATER), 1/8)
          .attr(PostKnockoutTopStatChangeAbAttr, 1, (user, target) => target.getTypes().includes(Type.WATER)),
      new Ability(Abilities.WOODEN_LIE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => [Type.FIRE, Type.GRASS, Type.BUG, Type.POISON, Type.DRAGON, Type.FLYING, Type.STEEL].some(t => target?.getTypes().includes(t)), 2)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => target.getAttackTypeEffectiveness(move.type, user) > 1, 0.75),
      new Ability(Abilities.IM_A_REAL_BOY, 9)
          .attr(MoveTypeChangeAbAttr, Type.NORMAL, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(MoveTypeChangeAbAttr, Type.NORMAL, 1.3, (user, target, move) => move.type !== Type.FAIRY && move.type !== Type.GRASS)
          .attr(PostSummonStatChangeAbAttr, BattleStat.ATK, -1, false)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, -1, false),
      new Ability(Abilities.LIER_LYER, 9)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FAIRY, Type.DARK, 2)
          .attr(PreDefendSurviveAbAttr, 10),
      new Ability(Abilities.COPYCAT_NINJA, 9)
          .attr(PostDefendTypeChangePlusAbAttr),
      new Ability(Abilities.HOKAGE, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.WATER, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.FLYING, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.GROUND, 1.2),
      new Ability(Abilities.SHARINGAN_ACTIVATED, 9)
          .attr(PokemonTypeChangeAbAttr),
      new Ability(Abilities.CROW_CLONE, 9)
          .attr(MoveTypeChangeAbAttr, Type.FLYING, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.DARK, Type.FLYING, 2, true)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.FLYING, 2, true)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(30), 0.5)
          .attr(PostDefendHealAbAttr, (target, user, move) => randSeedChance(30), 1/8),
      new Ability(Abilities.SHARINGAN_MASTERY, 9)
          .attr(PostAttackChanceDamageAbAttr, 15, 1/8)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => randSeedChance(5), 0.25)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => randSeedChance(15), 1, BattleStat.RAND, true),
      new Ability(Abilities.FOREHEAD_TAP, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.power <= 60, 1.5)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.power <= 60 && randSeedChance(10), [BattlerTagType.FLINCHED], 1)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS, (user, target, move) => move.power <= 60 && randSeedChance(10)),
      new Ability(Abilities.EIGHT_TAILS, 9)
          .attr(OctoHitMinMaxAbAttr),
      new Ability(Abilities.RAPPING_RAMPAGE, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.SOUND_BASED, 1.2, (user, target, move) => true)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SOUND_BASED), 1.5)
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 0)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.SOUND_BASED, (user, target, move) => true),
      new Ability(Abilities.BEAST_MODE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => user!.getHpRatio() <= .40, 2),
      new Ability(Abilities.NIGHTMARE_SAND, 9)
          .attr(PostTurnDamageAbAttr, 1/8, (pokemon, opponent) => pokemon.scene.arena.weather?.weatherType === WeatherType.SANDSTORM)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, -1, false, (pokemon, opponent) => pokemon.scene.arena.weather?.weatherType === WeatherType.SANDSTORM && randSeedChance(30))
          .attr(PostTurnWeatherChangeAbAttr, WeatherType.SANDSTORM, 30),
      new Ability(Abilities.SOUL_EATER, 9)
          .attr(PostAttackHealIfCollectedTypeMatchAbAttr)
          .attr(PostKnockOutCollectAbAttr)
          .attr(PostFaintLoseCollectedTypeAbAttr)
          .bypassFaint(),
      new Ability(Abilities.SOUL_DRAIN, 9)
          .attr(PostAttackCollectTypeMatchAbAttr, 10)
          .attr(PostAttackStatChangeIfCollectedTypeMatchAbAttr, BattleStat.RAND, -2)
          .attr(PostFaintLoseCollectedTypeAbAttr)
          .bypassFaint(),
      new Ability(Abilities.MEGA_SOL, 9),
      new Ability(Abilities.DRAGONIZE, 9)
          .attr(MoveTypeChangeAbAttr, Type.DRAGON, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr)),
      new Ability(Abilities.NIGHTMARES, 9)
          .attr(PostTurnHurtIfSleepingQuarterAbAttr),
      new Ability(Abilities.PIERCING_DRILL, 9)
          .attr(IgnoreProtectOnContactAbAttr)
          .attr(PiercingProtectOnContactAbAttr, 0.25),
      new Ability(Abilities.SPICY_SPRAY, 9)
          .attr(PostDefendDamageApplyStatusEffectAbAttr, 100, StatusEffect.BURN)
          .bypassFaint(),

      new Ability(Abilities.A_PARASITIC_OFFSPRING, 9)
          .attr(PostAttackChanceStatusAbAttr, [StatusEffect.POISON, StatusEffect.PARALYSIS, StatusEffect.BURN, StatusEffect.SLEEP], (user, target, move) => move.category === MoveCategory.PHYSICAL && randSeedChance(30))
          .conditionalAttr((pokemon) => pokemon.getOpponents().some(o => !!o.status), PostDefendContactApplyTagChanceAbAttr, 30, BattlerTagType.SEEDED)
          .conditionalAttr((pokemon) => pokemon.getOpponents().some(o => !!o.status), PostDefendContactApplyTagChanceAbAttr, 30, BattlerTagType.CONFUSED),

      new Ability(Abilities.ELEMENTAL_BYPASS, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target?.getTypes().some(t => [Type.WATER, Type.GROUND, Type.FIRE].includes(t)), 1.5),

      new Ability(Abilities.ANCIENT_SUPPLIES, 9)
          .attr(PreSwitchOutAllyHealAbAttr, 0.25)
          .attr(PreSwitchOutAllyStatChangeAbAttr, BattleStat.DEF, 1),

      new Ability(Abilities.DEEP_ROOTS, 9)
          .attr(PostTurnHealAbAttr)
          .attr(PostTurnStatSwapAbAttr, BattleStat.SPATK, BattleStat.SPDEF),

      new Ability(Abilities.MAGICIANS_COIN, 9)
          .attr(PostStatusMoveUsedCoinFlipStatOrHealAbAttr, BattleStat.SPATK, 1, 1/8),

      new Ability(Abilities.POLARIZE_ALPHA, 9)
          .attr(MoveTypeChangeAbAttr, Type.ROCK, 1.2, (user, target, move) => move.type === Type.ELECTRIC)
          .conditionalAttr(partyMagnetGate2Met, PreSwitchOutAllyStatChangeAbAttr, BattleStat.DEF, 1)
          .conditionalAttr(partyMagnetGate2Met, PreSwitchOutAllyStatChangeAbAttr, BattleStat.SPDEF, 1),

      new Ability(Abilities.ANCIENT_SUMMON, 9)
          .attr(PostSummonPartyMoveTagStatBoostAbAttr, MoveFlags.GADGET_MOVE),

      new Ability(Abilities.ANCIENT_DRILL, 9)
          .attr(PostAttackStealItemAndChipChanceAbAttr, 50, 1/8),

      new Ability(Abilities.ANCIENT_BEHEMOTH, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT), 1.3)
          .attr(IgnoreTypeResistanceOnConditionAbAttr, (user, target, move) => move.hasFlag(MoveFlags.MAKES_CONTACT)),

      new Ability(Abilities.ANCIENT_DUAL_CORE, 9)
          .attr(PostSummonSetTypesAbAttr, [Type.NORMAL])
          .attr(PostTurnSetTypesOnTurnCountAbAttr, 1, [Type.STEEL, Type.FIGHTING])
          .attr(ClearSummonTypesOnAbilityLoseAbAttr)
          .attr(AncientDualCoreTypesOnAbilityGainAbAttr)
          .conditionalAttr((pokemon) => pokemon.battleSummonData.turnCount >= 2, MoveTypeChangeAbAttr, Type.STEEL, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .conditionalAttr((pokemon) => pokemon.battleSummonData.turnCount >= 2, AddedTypeEffectivenessMultiplierAbAttr, Type.FIGHTING, (user, target, move) => move.type === Type.NORMAL),

      new Ability(Abilities.EMPERORS_COIN, 9)
          .attr(PostTurnCoinFlipUniqueStatBoostAbAttr, 50, 2, 1),

      new Ability(Abilities.MOONS_COIN, 9)
          .attr(PostSummonAddArenaTagAbAttr, ArenaTagType.GRAVITY, 5)
          .conditionalAttr(
            (pokemon) => gravityActiveGate(pokemon, pokemon, null!),
            PostAttackChanceStatusAbAttr, StatusEffect.SLEEP,
            (user, target, move) => move.category !== MoveCategory.STATUS
              && user.getMoveType(move, true, target) === Type.DARK && randSeedChance(50))
          .conditionalAttr(
            (pokemon) => gravityActiveGate(pokemon, pokemon, null!),
            PostAttackSubstituteChanceAbAttr, Type.PSYCHIC, 50, 0.25),

      new Ability(Abilities.LOVERS_COIN, 9)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => randSeedChance(50) && user?.gender !== target?.gender && target?.gender !== Gender.GENDERLESS, [BattlerTagType.INFATUATED], 1)
          .attr(PostDefendInfatuatedReflectDamageAbAttr, 50, 0.5),

      new Ability(Abilities.TYRANTS_COIN, 9)
          .attr(CoinFlipDoubleStrikeOrRecoilAbAttr, 0.5, 0.2)
          .attr(CoinFlipRecoilOnTailsAbAttr, 0.2),

      new Ability(Abilities.FOOLS_COIN, 9)
          .conditionalAttr((pokemon) => randSeedChance(50), NonSuperEffectiveImmunityAbAttr),

      new Ability(Abilities.UNDEAD_ARCHFIEND, 9)
          .attr(MoveImmunityAbAttr, (pokemon, attacker, move) => pokemon !== attacker && move.category === MoveCategory.STATUS)
          .attr(IgnoreMoveEffectsAbAttr)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.2, (user, target, move) => move.type === Type.NORMAL),

      new Ability(Abilities.EXPERIENCE_BOOST, 9)
          .attr(PostTurnRandStatFromPoolAbAttr, [BattleStat.DEF, BattleStat.ATK, BattleStat.SPD], 1),

      new Ability(Abilities.WINDBOLT_DISCARD, 9)
          .attr(PostStatusMoveBerryDamageAbAttr, 0.2),

      new Ability(Abilities.WINDSTORM_DISCARD, 9)
          .conditionalAttr((pokemon) => randSeedChance(30), PreAttackDiscardItemPowerBoostAbAttr, 2.5),

      new Ability(Abilities.DRAW_THREE, 9)
          .attr(PostTurnRandomStatChangesAbAttr, 3),

      new Ability(Abilities.RAGING_AXE, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIGHTING, 1.5, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE))
          .attr(IgnoreOpponentPositiveDefBoostsOnContactMovesAbAttr)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE) && randSeedChance(30), [BattlerTagType.FLINCHED], 0),

      new Ability(Abilities.TIME_WIZARDS_BLESSING, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.RAND, 1)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            return party.filter(p => p !== pokemon && !p.isFainted() && p.getMoveset(true).some(m => m?.getMove().hasFlag(MoveFlags.TIME_MOVE))).length >= 2;
          }, PostTurnHealRatioAbAttr, 1/8)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            return party.filter(p => p !== pokemon && !p.isFainted() && p.getMoveset(true).some(m => m?.getMove().hasFlag(MoveFlags.TIME_MOVE))).length >= 2;
          }, PostTurnStatChangeAbAttr, BattleStat.RAND, 1),

      new Ability(Abilities.QUICK_HARVEST, 9)
          .attr(PostTurnLootAbAttr, "EATEN_BERRIES", (pokemon) => 0.3)
          .attr(PostBattleGenerateRandomBerryAbAttr, 0.5),

      new Ability(Abilities.DAM_BUILDER, 9)
          .attr(PostSummonSubstituteAbAttr, 0.25)
          .attr(PostBattlerTagLostAbAttr, BattlerTagType.SUBSTITUTE, BattlerTagType.AQUA_RING),

      new Ability(Abilities.KINGS_ROAR, 9)
          .conditionalAttr((p) => !p.battleSummonData.enteredFromKnockOut, PostSummonStatChangeAbAttr, [BattleStat.ATK, BattleStat.SPD], -1, false, true)
          .conditionalAttr((p) => p.battleSummonData.enteredFromKnockOut, PostSummonStatChangeAbAttr, [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD], -1, false, true),

      new Ability(Abilities.DARKWORLD_TACTICS, 9)
          .attr(PostTurnDarkworldTacticsAbAttr),

      new Ability(Abilities.CURSED_FLAMES_YU, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackChanceSelfBurnAndFireSpinAbAttr, 10, 5),

      new Ability(Abilities.BULL_RUSH, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIGHTING, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => move.type === Type.FIGHTING || move.type === Type.NORMAL, 1),

      new Ability(Abilities.FATED_REVIVAL, 9)
          .attr(PostFaintReviveAllyAbAttr, 0.5, Type.FAIRY)
          .bypassFaint(),

      new Ability(Abilities.TRAVEL_BUDDIES_RED, 9)
          .attr(MoveTypeChangeAbAttr, Type.FLYING, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => move.type === Type.FLYING || move.type === Type.NORMAL, 1)
          .conditionalAttr(
            (pokemon) => countPartyWithMoveFlag(pokemon, MoveFlags.UNION_MOVE, false) >= 2,
            MovePowerBoostAbAttr, (user, target, move) => true, 1.5),

      new Ability(Abilities.A_COUNTER_INFECTOR, 9)
          .attr(PostDefendChanceStatusAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, 30, [StatusEffect.POISON, StatusEffect.PARALYSIS, StatusEffect.BURN, StatusEffect.SLEEP])
          .conditionalAttr(
            (pokemon) => pokemon.getOpponents().some(o => !!o.status),
            PostDefendContactHighestStatDropAndHealAbAttr, 1, 0.10),

      new Ability(Abilities.A_SUPPRESSION, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) =>
            !!target?.status?.effect && isNonVolatileStatusEffect(target.status.effect), 1.3)
          .attr(SuppressAbilitiesWhileConditionAbAttr, (target) =>
            !!target.status?.effect && isNonVolatileStatusEffect(target.status.effect)),

      new Ability(Abilities.MAGNETIZE_BETA, 9)
          .attr(PostAttackHealDamageDealtAbAttr, 0.25, (user, target, move) => move.type === Type.ELECTRIC)
          .attr(MoveTypePowerBoostAbAttr, Type.STEEL, 1.2)
          .conditionalAttr(partyMagnetGate2Met, PreSwitchOutAllyStatChangeAbAttr, BattleStat.ATK, 1)
          .conditionalAttr(partyMagnetGate2Met, PreSwitchOutAllyStatChangeAbAttr, BattleStat.SPATK, 1),

      new Ability(Abilities.CREEPY_SURPRISE, 9)
          .attr(PostSummonLowHpParalyzeAndTrapAbAttr, 0.5)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.GHOST, 0.8)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.FAIRY, 0.8)
          .attr(ReceivedTypeDamageMultiplierAbAttr, Type.DARK, 0.8),

      new Ability(Abilities.IRON_JAWS, 9)
          .attr(PostAttackHealDamageDealtAbAttr, 0.5, (user, target, move) => move.hasFlag(MoveFlags.BITING_MOVE))
          .attr(AddedTypeEffectivenessMultiplierAbAttr, Type.STEEL, (user, target, move) => move.hasFlag(MoveFlags.BITING_MOVE)),

      new Ability(Abilities.CARNIVOROUS_VINES, 9)
          .attr(PostAttackApplyTagAbAttr, true, (user, target, move) => randSeedChance(50), [BattlerTagType.WRAP], 3),

      new Ability(Abilities.BLACK_FLAME_SPARK, 9)
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS, BattlerTagType.CHARGED)
          .attr(PreSwitchOutChargedBurnAndBoostAbAttr),

      new Ability(Abilities.CHAOS_WARRIOR, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.DARK, Type.FAIRY])
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.SLEEP, (user, target, move) => user.getMoveType(move, true, target) === Type.DARK && randSeedChance(30))
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => user.getMoveType(move, true, target) === Type.FAIRY && randSeedChance(30), -1, [BattleStat.ATK, BattleStat.SPATK]),

      new Ability(Abilities.LUSTER_GENESIS, 9)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            return party.some(p => p !== pokemon && p.isFainted() && p.getTypes().includes(Type.DARK));
          }, AddSecondStrikeAbAttr, 0.5)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            return party.some(p => p !== pokemon && p.isFainted() && p.getTypes().includes(Type.FAIRY));
          }, MovePowerBoostAbAttr, (user, target, move) => move.power <= 60, 1.5)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            const fainted = party.filter(p => p !== pokemon && p.isFainted());
            const hasDark = fainted.some(p => p.getTypes().includes(Type.DARK) && !p.getTypes().includes(Type.FAIRY));
            const hasFairy = fainted.some(p => p.getTypes().includes(Type.FAIRY) && !p.getTypes().includes(Type.DARK));
            const hasDual = fainted.some(p => p.getTypes().includes(Type.DARK) && p.getTypes().includes(Type.FAIRY));
            return hasDark && hasFairy && hasDual;
          }, PostAttackChanceStatusAbAttr, [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.SLEEP, StatusEffect.TOXIC], (user, target, move) => randSeedChance(30)),

      new Ability(Abilities.CHAOS_SORCERER, 9)
          .attr(MoodyAbAttr)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.category === MoveCategory.SPECIAL && randSeedChance(30), [BattlerTagType.CONFUSED], 3),

      new Ability(Abilities.ROSE_GARDEN, 9)
          .attr(PostSummonRemoveArenaTagAbAttr, [ArenaTagType.SPIKES, ArenaTagType.STEALTH_ROCK, ArenaTagType.TOXIC_SPIKES, ArenaTagType.STICKY_WEB, ArenaTagType.REFLECT, ArenaTagType.LIGHT_SCREEN, ArenaTagType.AURORA_VEIL], "foe")
          .attr(PostSummonTerrainChangeAbAttr, TerrainType.GRASSY)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => user.turnData.hitsLeft === 1 && user.getMoveType(move, true, target) === Type.GRASS && randSeedChance(30), -1, [BattleStat.ATK, BattleStat.SPATK]),

      new Ability(Abilities.CRITICAL_PREDATOR, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => {
              if (move.category !== MoveCategory.PHYSICAL || !target) return false;
              return target.getStat(Stat.DEF) >= target.getStat(Stat.ATK);
          }, 2.5),

      new Ability(Abilities.FINAL_BLADE, 9)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => {
            if (move.hasAttr(FlinchAttr)) { return false; }
            if (target.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr)) { return false; }
            const party = user.isPlayer() ? user.scene.getParty() : user.scene.getEnemyParty();
            const faintedCount = party.filter(p => p !== user && p.isFainted()).length;
            return faintedCount > 0 && randSeedChance(faintedCount * 10);
          }, [BattlerTagType.FLINCHED], 1),

      new Ability(Abilities.BLAZING_TIMBER, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1.3, (user, target, move) => move.type === Type.NORMAL || move.type === Type.GRASS)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.FIRE && randSeedChance(30)),

      new Ability(Abilities.ABSOLUTE_ZERO, 9)
          .attr(MoveTypeChangeAbAttr, Type.ICE, 1.2, (user, target, move) =>
            [WeatherType.HAIL, WeatherType.SNOW].includes(user.scene.arena.weather?.weatherType) &&
            [Type.NORMAL, Type.FLYING, Type.DRAGON].includes(move.type))
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.FREEZE, (user, target, move) =>
            [WeatherType.HAIL, WeatherType.SNOW].includes(user.scene.arena.weather?.weatherType) &&
            user.getMoveType(move, true, target) === Type.ICE && randSeedChance(10))
          .attr(FrozenTrapAbAttr, (u, t) => true)
          .attr(PostTurnDamageOpponentsIfStatusAbAttr, StatusEffect.FREEZE, 1/8),

      new Ability(Abilities.BLOWBACK_ROULETTE, 9)
          .attr(PreAttackBlowbackRouletteProcAbAttr)
          .attr(PostAttackBlowbackRouletteStatDropAbAttr, 3, -1),

      new Ability(Abilities.ALTERNATIVE_BURST, 9)
          .attr(PostAttackStatusMoveChipAbAttr, 1/8)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS, (user, target, move) => {
            const effType = user.getMoveType(move, true, target);
            return [Type.ELECTRIC, Type.DRAGON].includes(effType) && randSeedChance(30);
          }),

      new Ability(Abilities.MAX_DESTRUCTION, 9)
          .attr(PostSummonSelfRemoveStatusEffectAbAttr, [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.SLEEP, StatusEffect.FREEZE])
          .attr(DynamicSecondStrikeAbAttr, (user, defender) =>
            defender.getBattleStat(Stat.DEF, user) > defender.getBattleStat(Stat.ATK, user) ? 1 : 0.5
          ),

      new Ability(Abilities.LOONEY_DRAGON, 9)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.DRAGON && randSeedChance(30), [BattlerTagType.CONFUSED], 3)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.FAIRY && randSeedChance(30), -1, BattleStat.RAND)
          .attr(PostSummonStatChangeAbAttr, BattleStat.EVA, 1, true),

      new Ability(Abilities.TRIPLE_BURST, 9)
          .attr(MultiStrikeAbAttr, 3, 3)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.category !== MoveCategory.STATUS && !move.hasAttr(MultiHitAttr), 0.55),

      new Ability(Abilities.WHITE_LIGHTNING, 9)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(CritLevelBoostAbAttr, 1, (user, target, move) => user.getMoveType(move, true, target) === Type.DRAGON)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS, (user, target, move) => {
            const effType = user.getMoveType(move, true, target);
            return [Type.ELECTRIC, Type.DRAGON].includes(effType) && randSeedChance(30);
          }),

      new Ability(Abilities.ANCIENT_KNOWLEDGE, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.PSYCHIC, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.FAIRY, 1.2)
          .attr(AddedTypeEffectivenessMultiplierAbAttr, Type.FAIRY, (user, target, move) => move.type === Type.PSYCHIC)
          .attr(AddedTypeEffectivenessMultiplierAbAttr, Type.PSYCHIC, (user, target, move) => move.type === Type.FAIRY),

      new Ability(Abilities.SPELLBREAKER_BLADE, 9)
          .attr(PostSummonSelfRandomStatusAbAttr, [StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.POISON, StatusEffect.TOXIC])
          .attr(ConditionalCritAbAttr, (user, target, move) => !!user?.status)
          .attr(PostAttackCureStatusAbAttr),

      new Ability(Abilities.DRAGONBANE_SWORD, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE) && target?.isOfType(Type.DRAGON), 2.5)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => target.isFainted() && target.isOfType(Type.DRAGON), 1, BattleStat.SPD, true)
          .attr(PostAttackHealAbAttr, (user, target, move) => target.isFainted() && target.isOfType(Type.DRAGON), 1/8),

      new Ability(Abilities.VOID_BANISHMENT, 9)
          .attr(PostSummonForceSwitchAbAttr,
            (pokemon) => pokemon.battleSummonData.enteredFromKnockOut,
            (pokemon, foe) => foe.isOfType(Type.DARK),
            1/6)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackStealHeldItemAbAttr, (user, target, move) => move.type === Type.NORMAL && randSeedChance(20)),

      new Ability(Abilities.MILL_ENGINE, 9)
          .attr(PostTurnBerryConsumeStatAbAttr, BattleStat.ATK, 1, 3, 0.3),

      new Ability(Abilities.CRIPPLING_ILLUSIONS, 9)
          .attr(PostTurnRandPoolThenThresholdResetAndTagAbAttr, [BattleStat.DEF, BattleStat.SPDEF], 1, [BattleStat.DEF, BattleStat.SPDEF], 6, BattlerTagType.CURSED),

      new Ability(Abilities.FOREST_GUARDIAN, 9)
          .conditionalAttr((pokemon) => pokemon.scene.arena.terrain?.terrainType === TerrainType.GRASSY, MovePowerBoostAbAttr, (user, target, move) => move.category === MoveCategory.PHYSICAL, 1.2)
          .conditionalAttr((pokemon) => pokemon.scene.arena.terrain?.terrainType === TerrainType.GRASSY, BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
          .attr(CritLevelBoostAbAttr, 1, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE)),

      new Ability(Abilities.CHAOS_END, 9)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            return party.some(p => p !== pokemon && p.isFainted() && p.getTypes(true).includes(Type.DARK));
          }, PostKnockOutAddArenaTrapTagAbAttr, (knockedOut, attacker) =>
            attacker.isPlayer() !== knockedOut.isPlayer()
            && knockedOut.turnData?.attacksReceived?.some(a => a.sourceId === attacker.id), ArenaTagType.CHAOS_END_MARK)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            return party.some(p => p !== pokemon && p.isFainted() && p.getTypes(true).includes(Type.FAIRY));
          }, MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostFaintDamageAbAttr, (pokemon, attacker) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            const fainted = party.filter(p => p !== pokemon && p.isFainted());
            const hasDarkOnly = fainted.some(p => p.getTypes(true).includes(Type.DARK) && !p.getTypes(true).includes(Type.FAIRY));
            const hasFairyOnly = fainted.some(p => p.getTypes(true).includes(Type.FAIRY) && !p.getTypes(true).includes(Type.DARK));
            const hasDual = fainted.some(p => p.getTypes(true).includes(Type.DARK) && p.getTypes(true).includes(Type.FAIRY));
            return hasDarkOnly && hasFairyOnly && hasDual;
          }, 2)
          .bypassFaint(),

      new Ability(Abilities.SHADOW_REACH, 9),

      new Ability(Abilities.CURSED_FLAMES_V2, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FIRE, Type.GHOST])
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.FIRE && randSeedChance(30)
          )
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.GHOST && randSeedChance(5),
            [BattlerTagType.CURSED], 3),

      new Ability(Abilities.SCORCHED_EARTH, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => !!user?.scene.arena.terrain, 1.5)
          .attr(PostAttackTerrainClearAndEffectsAbAttr, 30),

      new Ability(Abilities.CYBERNETIC_PREDATOR, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) =>
            move.category !== MoveCategory.STATUS && !!target && target.battleSummonData.turnCount <= 1, 2.0)
          .attr(PostFoeSummonStatChangeAbAttr, BattleStat.SPD, 1, true),

      new Ability(Abilities.SYSTEM_HACK, 9)
          .conditionalAttr((pokemon) => {
            return pokemon.getOpponents().some(opp => opp.summonData.battleStats.some(s => s > 0));
          }, PostSummonStatChangeAbAttr, [BattleStat.SPD, BattleStat.SPATK], 1, true)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            if (party.filter(p => p !== pokemon && !p.isFainted()).length > 0) { return false; }
            if (pokemon.turnData.systemHackPriorityRolled === undefined) {
              pokemon.turnData.systemHackPriorityRolled = randSeedChance(50);
            }
            return pokemon.turnData.systemHackPriorityRolled;
          }, ChangeMovePriorityAbAttr, (pokemon, move) => move.type === Type.ELECTRIC || move.type === Type.STEEL, 1),

      new Ability(Abilities.PARALLEL_PROCESSOR, 9)
          .attr(AddSecondStrikeAbAttr, 0.3)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS, (user, target, move) =>
            move.category !== MoveCategory.STATUS && user.turnData.hitsLeft === 1 && randSeedChance(30)),

      new Ability(Abilities.TRIPLE_CORE_ENGINE, 9)
          .conditionalAttr((pokemon) => true, MovePowerBoostAbAttr, (user, target, move) => !move.hasAttr(MultiHitAttr), 1.2)
          .attr(ClampMultiHitToThreeAbAttr)
          .attr(TripleAxelizeMultiHitPowerAbAttr)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.CHECK_ALL_HITS, (user, target, move) => move.hasAttr(MultiHitAttr)),

      new Ability(Abilities.CYBERNETIC_DISCARD, 9)
          .attr(PreAttackDiscardItemPowerBoostAbAttr, 1.2)
          .attr(PostAttackHealDamageDealtAbAttr, 0.25, (user, target, move) => !!user.turnData.discardedItemForPowerBoost),

      new Ability(Abilities.LASER_BUSTER_CANNON, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.PULSE_MOVE) || move.hasFlag(MoveFlags.AURA_MOVE), 1.3)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => move.hasFlag(MoveFlags.PULSE_MOVE) || move.hasFlag(MoveFlags.AURA_MOVE), 1),

      new Ability(Abilities.ORIGINAL_SKY_KING, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.BITING_MOVE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(
            CandidateRestrictedBestTypeChangeAbAttr,
            Type.UNKNOWN,
            [Type.STEEL, Type.FLYING],
            (user, target, move) => move.hasFlag(MoveFlags.BITING_MOVE) || move.hasFlag(MoveFlags.SLICING_MOVE)
          )
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.BITING_MOVE) || move.hasFlag(MoveFlags.SLICING_MOVE), 1.2)
          .attr(PostAttackHealDamageDealtAbAttr, 0.2, (user, target, move) => move.hasFlag(MoveFlags.BITING_MOVE) || move.hasFlag(MoveFlags.SLICING_MOVE))
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.BITING_MOVE, (user, target, move) => move.type === Type.NORMAL),

      new Ability(Abilities.TWIN_CORE_BURST, 9)
          .conditionalAttr((pokemon) => !!pokemon.status, ChanceSecondStrikeAbAttr, 30, 0.5)
          .attr(PostAttackCureStatusIfSecondStrikeProcAbAttr),

      new Ability(Abilities.PORTAL_BEAST, 9)
          .attr(PostFoeSummonStatChangeAbAttr, BattleStat.RAND, 1, true)
          .attr(PostFoeSummonStatChangeAbAttr, BattleStat.RAND, 1, true)
          .attr(PreSwitchOutHealConditionAbAttr, (pokemon, opponent) => true, 0.25),

      new Ability(Abilities.PARALLEL_WORLD, 9)
          .attr(PostSummonSwapFoeStatsAbAttr, [BattleStat.ATK, BattleStat.SPATK]),

      new Ability(Abilities.DIMENSION_SLASH, 9)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE))
          .attr(PostAttackForceSwitchAbAttr, 10, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE)),

      new Ability(Abilities.COTTON_TOKENS, 9)
          .attr(PostDefendSubstituteDamageThresholdAbAttr, 0.7, 0.25),

      new Ability(Abilities.DANGER_DISCARD, 9)
          .attr(PostStatusMoveUsedRandBoostAndDropDistinctAbAttr, 1),

      new Ability(Abilities.ERADICATORS_DOMAIN, 9)
          .attr(PostAnyFoeSpecialMoveUsedChanceRandomStatusAbAttr, 30)
          .attr(PostAnyFoeStatusMoveUsedChipDamageAbAttr, 1 / 8),

      new Ability(Abilities.MIND_TRANCE, 9)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) =>
            pokemon.getOpponents().some(opp => !!opp.status || [
              BattlerTagType.CONFUSED,
              BattlerTagType.INFATUATED,
              BattlerTagType.CURSED,
              BattlerTagType.DROWSY,
              BattlerTagType.NIGHTMARE,
              BattlerTagType.SEEDED,
              BattlerTagType.SALT_CURED,
              BattlerTagType.TRAPPED,
              BattlerTagType.WRAP,
              BattlerTagType.BIND,
              BattlerTagType.FIRE_SPIN,
              BattlerTagType.WHIRLPOOL,
              BattlerTagType.SAND_TOMB,
              BattlerTagType.MAGMA_STORM,
              BattlerTagType.SNAP_TRAP,
              BattlerTagType.THUNDER_CAGE,
              BattlerTagType.INFESTATION
            ].some(t => !!opp.getTag(t))), 1)
          .attr(PostAttackChanceFlinchIfTargetAfflictedAbAttr, 10),

      new Ability(Abilities.MASTER_OF_ILLUSIONS, 9)
          .attr(PostTurnSubstituteAbAttr, 0, 20),

      new Ability(Abilities.MASTER_OF_THE_DARK_ARTS, 9)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.0, (user, target, move) =>
            move.type === Type.NORMAL && !!target && target.getAttackTypeEffectiveness(Type.DARK, user) >= 2)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.DARK && user.randSeedInt(100) < 30, [BattlerTagType.WRAP], 5),

      new Ability(Abilities.MAGICAL_INHERITANCE, 9)
          .attr(PartyMoveTagStatMultiplierAbAttr, BattleStat.SPATK, MoveFlags.DARK_MAGIC_MOVE, 0.1)
          .attr(PostAttackHealDamageDealtPerFaintedTypeAbAttr, Type.FAIRY, 0.1, Type.FAIRY),

      new Ability(Abilities.CURSED_POSSESSION, 9)
          .attr(PostDefendApplyAttackerTagAbAttr, (pokemon, attacker, move) => {
            const effType = attacker.getMoveType(move, true, pokemon);
            return pokemon.getAttackTypeEffectiveness(effType, attacker) >= 2;
          }, BattlerTagType.CURSED)
          .bypassFaint(),

      new Ability(Abilities.SPELL_DRAIN, 9)
          .attr(PreDefendChanceStatusNegateHealAndBoostAbAttr, 30, 0.15),

      new Ability(Abilities.DARK_SOUNDWAVE, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.SOUND_BASED, 1, (user, target, move) => move.type === Type.NORMAL || move.type === Type.DARK)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.1, (user, target, move) => move.hasFlag(MoveFlags.SOUND_BASED))
          .attr(PostAttackChanceSleepConfuseOrFlinchAbAttr, 10)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.SOUND_BASED, (user, target, move) => move.type === Type.NORMAL || move.type === Type.DARK),

      new Ability(Abilities.MOONLIT_MISCHIEF, 9)
          .conditionalAttr((pokemon) => nightBiomeGate(pokemon, pokemon), PostSummonStatBoostAbAttr, 1),

      new Ability(Abilities.SOUL_TAX, 9)
          .attr(PostTurnDamageAbAttr, 1/16, (pokemon, opponent) => true),

      new Ability(Abilities.TIMELINE_MAGIC, 9)
          .attr(PreAttackChangeMoveCategoryAbAttr)
          .attr(PreDefendUseStrongerDefAbAttr),

      new Ability(Abilities.UNDERWORLD_THICKET, 9)
          .attr(PostDefendContactDamageAbAttr, 8)
          .attr(PostDefendContactApplyTagChanceAbAttr, 10, BattlerTagType.WRAP, 5)
          .bypassFaint(),

      new Ability(Abilities.SHADOW_FLAME, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.DARK, 2)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL),

      new Ability(Abilities.ZOMBIE_COLOSSUS, 9)
          .attr(PostFaintSelfReviveAbAttr, 0.5)
          .bypassFaint(),

      new Ability(Abilities.ULTIMATE_DEFENSE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (defender, attacker, move) => true, 0.5)
          .ignorable(),

      new Ability(Abilities.PLASMAS_DOMAIN, 9)
          .attr(SuppressFieldAbilitiesAbAttr, false)
          .attr(IgnoreMoveEffectsAbAttr)
          .attr(PostSummonRaiseLowerStatsAbAttr, 2),

      new Ability(Abilities.DRAGONBANE_WRATH, 9)
          .attr(PostTurnDamageAllMatchingOpponentsAbAttr, 1/8, (pokemon, opponent) => opponent?.isOfType(Type.DRAGON) ?? false)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (defender, attacker, move) =>
            attacker.getMoveType(move, true, defender) === Type.DRAGON, 0.5)
          .ignorable(),

      new Ability(Abilities.ETHEREAL_LIGHT, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.ATK, -1, false, true)
          .attr(PostSummonRemoveArenaTagAbAttr, [ArenaTagType.SPIKES, ArenaTagType.STEALTH_ROCK, ArenaTagType.TOXIC_SPIKES, ArenaTagType.STICKY_WEB], "self")
          .attr(PostSummonClearFoeBoostsAbAttr),

      new Ability(Abilities.PLAGUE_BREATHE, 9)

          .conditionalAttr((pokemon) => pokemon.getHpRatio() < 0.7, PreSwitchOutStatusAbAttr, StatusEffect.TOXIC, 30)
          .conditionalAttr((pokemon) => pokemon.getHpRatio() < 0.7, PreSwitchOutStatusAbAttr, StatusEffect.POISON),

      new Ability(Abilities.HEAVEN_PIERCER, 9)
          .attr(MoveTypeChangeAbAttr, Type.STEEL, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(MovePowerBoostAbAttr, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.STEEL &&
            target !== null &&
            (target.isOfType(Type.GROUND) || target.isOfType(Type.ROCK)), 2.0),

      new Ability(Abilities.CLIMATE_CHANGE, 9)

          .conditionalAttr(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN), MoveTypeChangeAbAttr, Type.FIRE, 1,
            (user, target, move) => move.type === Type.NORMAL || move.type === Type.WATER)
          .conditionalAttr(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN), PostAttackChanceStatusAbAttr, StatusEffect.BURN,
            (user, target, move) =>
              move.category !== MoveCategory.STATUS &&
              user.getMoveType(move, true, target) === Type.FIRE &&
              user.randSeedInt(100) < 30)

          .conditionalAttr(getWeatherCondition(WeatherType.RAIN, WeatherType.HEAVY_RAIN), MoveTypeChangeAbAttr, Type.WATER, 1,
            (user, target, move) => move.type === Type.NORMAL || move.type === Type.FIRE)
          .conditionalAttr(getWeatherCondition(WeatherType.RAIN, WeatherType.HEAVY_RAIN), PostAttackApplyTagAbAttr, false,
            (user, target, move) =>
              move.category !== MoveCategory.STATUS &&
              user.getMoveType(move, true, target) === Type.WATER &&
              user.randSeedInt(100) < 10,
            [BattlerTagType.WHIRLPOOL], 5),

      new Ability(Abilities.EARTHBOUND_CURSE, 9)
          .conditionalAttr(getWeatherCondition(WeatherType.RAIN, WeatherType.HEAVY_RAIN),
            CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.WATER, Type.GROUND])
          .conditionalAttr(getWeatherCondition(WeatherType.RAIN, WeatherType.HEAVY_RAIN),
            PostAttackChanceBurnAndSpeedDropAbAttr, 30, [Type.WATER, Type.GROUND]),

      new Ability(Abilities.IMMORTAL_SLIME, 9)
          .attr(StatusEffectImmunityAbAttr, StatusEffect.POISON, StatusEffect.TOXIC, StatusEffect.BURN, StatusEffect.PARALYSIS, StatusEffect.SLEEP, StatusEffect.FREEZE)
          .attr(BlockCritAbAttr)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, 0.5)
          .ignorable(),

      new Ability(Abilities.GOLDEN_CLUTCH, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.SLICING_MOVE, 1, (user, target, move) => move.type === Type.NORMAL || move.type === Type.FIGHTING)
          .attr(IgnoreTypeResistanceOnConditionAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE))
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => (move.type === Type.NORMAL || move.type === Type.FIGHTING || move.hasFlag(MoveFlags.SLICING_MOVE)) && !move.hasAttr(FlinchAttr), 1)
          .attr(CritLevelBoostAbAttr, 1, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE) && !move.hasAttr(FlinchAttr))
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.SLICING_MOVE, (user, target, move) => move.type === Type.NORMAL || move.type === Type.FIGHTING),

      new Ability(Abilities.SCORCHING_BURSTER, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) =>
            move.category !== MoveCategory.STATUS &&
            user.getMoveType(move, true, target) === Type.FIRE &&
            user.randSeedInt(100) < 30)
          .attr(CritLevelBoostAbAttr, 1, (user, target, move) => user.getMoveType(move, true, target) === Type.FIRE)
          .attr(TypeImmunityAbAttr, Type.WATER)
          .attr(TypeImmunityAbAttr, Type.ICE)
          .ignorable(),

      new Ability(Abilities.CLAY_COLOSSUS, 9)
          .attr(NotVeryEffectiveImmunityAbAttr)
          .attr(MoveTypeChangeAbAttr, Type.GROUND, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) =>
            move.category !== MoveCategory.STATUS &&
            user.getMoveType(move, true, target) === Type.GROUND &&
            user.randSeedInt(100) < 30, -1, BattleStat.SPD)
          .ignorable(),

      new Ability(Abilities.SCORCHING_JUSTICE, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, 30)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target.status?.effect === StatusEffect.BURN, 1.5),

      new Ability(Abilities.SHADOW_MARTYR, 9)
          .attr(PostFaintReplacementHealAndBoostAbAttr, 0.33, 1, 1)
          .bypassFaint(),

      new Ability(Abilities.ALMIGHTY_GALAXY, 9)
          .attr(PostTurnRandomTypeChangeAndHealAbAttr, 1 / 8)
          .attr(PostAttackNoSecondaryEffectsChanceRandomStatusAbAttr, 30),

      new Ability(Abilities.GALACTIC_AWAKENING, 9)
          .attr(PostTurnSetTypesIfHpBelowAbAttr, 0.5, [Type.STELLAR])
          .conditionalAttr((pokemon) => pokemon.getHpRatio() <= 0.5, PostTurnStatChangeAbAttr, BattleStat.RAND, 1, true),

      new Ability(Abilities.STATIC_SHOCK_V2, 9)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => move.type === Type.ELECTRIC, 1),

      new Ability(Abilities.CYCLONE_FIST, 9)
          .attr(PostSummonAddArenaTagOnSelfSideAbAttr, ArenaTagType.TAILWIND, 4)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIGHTING, Type.FLYING, 2),

      new Ability(Abilities.BLIND_RAGE, 9)
          .conditionalAttr((pokemon) => pokemon.getTag(BattlerTagType.CONFUSED) !== null, MovePowerBoostAbAttr, (user, target, move) => move.category !== MoveCategory.STATUS, 2.0)
          .conditionalAttr((pokemon) => pokemon.getTag(BattlerTagType.CONFUSED) !== null, CritLevelBoostAbAttr, 1, (user, target, move) => move.category !== MoveCategory.STATUS)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.NORMAL, Type.FIGHTING, 2, true),

      new Ability(Abilities.VILE_OVERGROWTH, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GRASS, Type.DARK, 2)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.GRASS && randSeedChance(30), [BattlerTagType.SEEDED], 0)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.SLEEP, (user, target, move) =>
            move.category !== MoveCategory.STATUS &&
            user.getMoveType(move, true, target) === Type.DARK &&
            user.randSeedInt(100) < 10),

      new Ability(Abilities.NECRO_SURGE, 9)
          .attr(FaintedPartyFlatPowerBoostAbAttr, 5),

      new Ability(Abilities.UNCONTROLLABLE_POWER, 9)
          .attr(PreDefendFullHpEndureAbAttr)
          .attr(BlockOneHitKOAbAttr)
          .conditionalAttr((pokemon) => pokemon.hp === 1, ChangeMovePriorityAbAttr, (pokemon, move) => true, 3)
          .conditionalAttr((pokemon) => pokemon.hp === 1, MovePowerBoostAbAttr, (user, target, move) => true, 2.0)
          .conditionalAttr((pokemon) => pokemon.hp === 1, PostAttackHealDamageDealtAbAttr, 0.5)
          .ignorable(),

      new Ability(Abilities.ABSOLUTE_VOID_MAGIC, 9)
          .attr(PostAttackVoidMagicRandomEffectAbAttr, 50)
          .attr(PostTurnDamageAbAttr, 1/6, () => true, true),

      new Ability(Abilities.CHAINS_OF_INFINITY, 9)
          .attr(LowBpOhkoChanceAbAttr, 60, 1),

      new Ability(Abilities.FORBIDDEN_POWER, 9)
          .attr(ConsecutiveAttackFlatBpBoostAbAttr, 20),

      new Ability(Abilities.BEAST_OF_RAGNAROK, 9)
          .conditionalAttr(getWeatherCondition(WeatherType.HAIL, WeatherType.SNOW), BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.FREEZE, (user, target, move) =>
            move.hasFlag(MoveFlags.BITING_MOVE) && user.randSeedInt(100) < 10)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) =>
            move.hasFlag(MoveFlags.BITING_MOVE) && user.randSeedInt(100) < 10, [BattlerTagType.FLINCHED], 0),

      new Ability(Abilities.NIGHT_STALKER, 9)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => nightBiomeGate(pokemon, pokemon, move), 1),

      new Ability(Abilities.ABYSSAL_GRASP, 9)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.WATER && user.randSeedInt(100) < 30, [BattlerTagType.WHIRLPOOL], 5),

      new Ability(Abilities.DEMONIC_EDGE, 9)
          .attr(MoveTypeChangeAbAttr, Type.STEEL, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(MultCritAbAttr, 5/3),

      new Ability(Abilities.FOSSIL_BARRIER, 9)
          .attr(FieldPriorityMoveImmunityAbAttr)
          .attr(MoveTypeChangeAbAttr, Type.ROCK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(FieldPreventOpponentStatBoostAbAttr)
          .attr(PostSummonClearFoeBoostsAbAttr),

      new Ability(Abilities.DUAL_BONE_BLADE, 9)
          .attr(AddSecondStrikeAbAttr, 0.5)
          .attr(PreAttackChangeMoveCategoryAbAttr),

      new Ability(Abilities.MIND_WARP, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.DARK, Type.PSYCHIC])
          .attr(PostAttackMindWarpProcAbAttr, 30),

      new Ability(Abilities.CYBERNETIC_CONTROL, 9)
          .attr(SuppressFieldAbilitiesAbAttr, false)
          .attr(FieldPreventOpponentStatusMovesAbAttr),

      new Ability(Abilities.JUNK_TO_TREASURE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.power > 0 && move.power <= 45 && !move.hasAttr(MultiHitAttr), 3.0),

      new Ability(Abilities.CYCLONE_WRATH, 9)
          .conditionalAttr((p) => !p.battleData.abilityShieldUsed, PostSummonAddBattlerTagAbAttr, BattlerTagType.YU_ONE_HIT_SHIELD, -1, true)
          .attr(PreDefendChargedShieldRetaliateOnceAbAttr, BattlerTagType.YU_ONE_HIT_SHIELD, 8)
          .attr(MoveTypeChangeAbAttr, Type.FLYING, 1.2, (user, target, move) => move.type === Type.NORMAL),

      new Ability(Abilities.THE_UNDEAD_KING, 9)
          .attr(PostFaintUndeadKingAbAttr, 0.5)
          .bypassFaint(),

      new Ability(Abilities.TRAVEL_BUDDIES_BLUE, 9)
          .attr(MoveTypeChangeAbAttr, Type.FLYING, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => move.type === Type.FLYING, 1)
          .conditionalAttr(
            (pokemon) => countPartyWithMoveFlag(pokemon, MoveFlags.UNION_MOVE, false) >= 2,
            PostAttackHealDamageDealtAbAttr, 0.5, (user, target, move) =>
            move.category !== MoveCategory.STATUS && !!user && !!target && user.getMoveType(move, true, target) === Type.FLYING),

      new Ability(Abilities.FOR_SCIENCE, 9)
          .attr(PostTurnForScienceAbAttr),

      new Ability(Abilities.MULTIPLY, 9)
          .attr(PostAttackMultiplyProcAbAttr, 30, 0.25),

      new Ability(Abilities.GENIE_MAGIC, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FIRE, Type.DARK])
          .attr(PostAttackWishAbAttr, 30, (user, target, move) => {
            if (!user || !target || move.category === MoveCategory.STATUS) {
              return false;
            }
            const t = user.getMoveType(move, true, target);
            return t === Type.FIRE || t === Type.DARK;
          }),

      new Ability(Abilities.MOLTEN_SHACKLES, 9)
          .attr(ArenaTrapAbAttr, (user, target) => true)
          .attr(PostSummonOpponentBattlerTagAbAttr, BattlerTagType.TRAPPED, -1)
          .attr(PostFoeSummonOpponentBattlerTagAbAttr, BattlerTagType.TRAPPED, -1)
          .attr(PostTurnDamageAbAttr, 1/8, (pokemon, opponent) => true),

      new Ability(Abilities.MASTERS_BLADE, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.SLICING_MOVE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE), 1.5)
          .attr(CritLevelBoostAbAttr, 1, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE))
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.SLICING_MOVE, (user, target, move) => move.type === Type.NORMAL),

      new Ability(Abilities.LEVIATHANS_WRATH, 9)
          .conditionalAttr((pokemon) => { const w = pokemon.scene.arena.weather?.weatherType; return w === WeatherType.RAIN || w === WeatherType.HEAVY_RAIN; }, ConditionalCritAbAttr, (user, target, move) => move.type === Type.WATER)
          .attr(PostAttackClearWeatherOnCritAbAttr),

      new Ability(Abilities.DRACONIC_FLUTE, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.SOUND_BASED, 1.2, (user, target, move) => move.type === Type.NORMAL || move.type === Type.DRAGON)
          .attr(PostAttackSoundSleepChanceAbAttr, 10)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.SOUND_BASED, (user, target, move) => move.type === Type.NORMAL || move.type === Type.DRAGON),

      new Ability(Abilities.ILLUSION_WEAVER, 9)
          .attr(PostDefendStatusMoveSubstituteAbAttr, 0.25, 10),

      new Ability(Abilities.SPELLCASTERS_FLUFF, 9)
          .attr(PostSummonAddBattlerTagAbAttr, BattlerTagType.YU_ONE_HIT_SHIELD, -1, true)
          .attr(PreDefendConsumeTagNullifyDamageAbAttr, BattlerTagType.YU_ONE_HIT_SHIELD),

      new Ability(Abilities.MASK_OF_REMNANTS, 9)
          .attr(PostFaintTagAbAttr, BattlerTagType.YU_TRAPPED, -1)
          .attr(PostFaintTagAbAttr, BattlerTagType.CURSED, 1)
          .bypassFaint(),

      new Ability(Abilities.HEAVYWEIGHT_HOPPER, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FLYING, Type.FIGHTING])

          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.FLYING && user.randSeedInt(100) < 30, [BattlerTagType.FLINCHED], 0)

          .attr(ConditionalCritAbAttr, (user, target, move) => move.type === Type.FIGHTING && user.randSeedInt(100) < 5),

      new Ability(Abilities.METEOR_SHOWER, 9)
          .attr(ConditionalMultiStrikeAbAttr, 3, 3, (_user, move) => [Type.NORMAL, Type.FIRE, Type.ROCK].includes(move.type))
          .attr(MeteorShowerRandomFireRockTypeAbAttr)
          .attr(MovePowerBoostAbAttr, (user, target, move) =>
            move.category !== MoveCategory.STATUS &&
            [Type.NORMAL, Type.FIRE, Type.ROCK].includes(move.type), 0.4),

      new Ability(Abilities.MILLENNIUM_STALKER, 9)
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.ATK, 1, (user, knockedOut) => {
            if (user.isPlayer() === knockedOut.isPlayer()) {
              return false;
            }
            const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
            return !!lastAttack && lastAttack.sourceId === user.id;
          })
          .attr(PostKnockOutStatChangeAbAttr, BattleStat.RAND, 1, (user, knockedOut) => {
            if (user.isPlayer() === knockedOut.isPlayer()) {
              return false;
            }
            const lastAttack = knockedOut.turnData?.attacksReceived?.[0];
            return !!lastAttack && lastAttack.sourceId === user.id;
          })
          .attr(PostKnockOutCureStatusAbAttr),

      new Ability(Abilities.MILLENNIAL_WEAPON, 9)
          .attr(BattleStatMultiplierAbAttr, BattleStat.DEF, 1.5)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FAIRY, Type.ROCK])
          .attr(MoveTypeDefenseAsAttackAbAttr, [Type.FAIRY, Type.ROCK]),

      new Ability(Abilities.HAND_RESET, 9)
          .attr(PostDefendHandResetAbAttr, 0.5)
          .bypassFaint(),

      new Ability(Abilities.EXPANDING_MASS, 9)
          .attr(TurnsOnFieldPowerBoostAbAttr, 10, 50)
          .attr(PostTurnDamageAbAttr, 1/8, () => true, true),

      new Ability(Abilities.SMASH_22, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FIGHTING, Type.GHOST])
          .attr(PostAttackSwapFoeStatPairsAbAttr, BattleStat.DEF, BattleStat.SPDEF, 10, (user, target, move) =>
            user.isPlayer() !== target.isPlayer() && user.getMoveType(move, true, target) === Type.FIGHTING)
          .attr(PostAttackSwapFoeStatPairsAbAttr, BattleStat.ATK, BattleStat.SPATK, 10, (user, target, move) =>
            user.isPlayer() !== target.isPlayer() && user.getMoveType(move, true, target) === Type.GHOST),

      new Ability(Abilities.FIST_OF_FATE, 9)
          .attr(IgnoreTypeResistanceOnConditionAbAttr, (user, target, move) => move.checkFlag(MoveFlags.MAKES_CONTACT, user, target))
          .attr(MoveAbilityBypassAbAttr, (pokemon, move: Move) => move.checkFlag(MoveFlags.MAKES_CONTACT, pokemon, null))
          .attr(FistOfFateArmOnKoAbAttr)
          .attr(FistOfFatePostFoeSummonChipAbAttr, 0.25),

      new Ability(Abilities.LEVIATHANS_DOMAIN, 9)
          .attr(LeviathansDomainRainOnHitAbAttr)
          .attr(LeviathansDomainRainStreakPostTurnAbAttr)
          .attr(LeviathansDomainRainPowerBoostAbAttr),

      new Ability(Abilities.OJAMA_MAGIC, 9)
          .conditionalAttr(
            (pokemon) => countPartyWithMoveFlagIncludingFainted(pokemon, MoveFlags.OJAMA_MOVE) >= 3,
            PostAttackOjamaMagicAbAttr,
            30
          ),

      new Ability(Abilities.OJAMA_LOCKDOWN, 9)
          .attr(ArenaTrapAbAttr, (user, target) => true)
          .attr(FieldPreventOpponentStatusMovesAbAttr)
          .conditionalAttr(
            (pokemon) => countPartyWithMoveFlagIncludingFainted(pokemon, MoveFlags.OJAMA_MOVE) >= 3,
            PostTurnStatChangeAbAttr,
            BattleStat.RAND, -2, false
          ),

      new Ability(Abilities.OJAMA_SOLIDARITY, 9)
          .attr(PostSummonDisableRandomFoeMoveAbAttr, 4)
          .conditionalAttr(
            (pokemon) => countPartyWithMoveFlagIncludingFainted(pokemon, MoveFlags.OJAMA_MOVE) >= 3,
            ChangeMovePriorityAbAttr,
            (_pokemon, move) => move.type === Type.NORMAL || move.hasFlag(MoveFlags.OJAMA_MOVE),
            1
          )
          .conditionalAttr(
            (pokemon) => countPartyWithMoveFlagIncludingFainted(pokemon, MoveFlags.OJAMA_MOVE) >= 3,
            ConditionalBonusCritAbAttr,
            (user, target, move) => user.getMoveType(move, true, target) === Type.NORMAL || move.hasFlag(MoveFlags.OJAMA_MOVE)
          ),

      new Ability(Abilities.EVOLUTION_PILL, 9)
          .attr(PostFaintReplacementHealAndBoostAbAttr, 0.33, 1, 0)
          .bypassFaint(),

      new Ability(Abilities.EXPLOSIVE_AIR, 9)
          .attr(MoveTypeChangeAbAttr, Type.FLYING, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(ConditionalCritAbAttr, (user, target, move) => user.getMoveType(move, true, target) === Type.FLYING && target.isOfType(Type.FIRE)),

      new Ability(Abilities.NECRO_DRAIN, 9)
          .attr(PostKnockOutRandomPartyHealAbAttr, 0.25),

      new Ability(Abilities.DRACO_LANCE, 9)
          .attr(MoveTypeChangeAbAttr, Type.DRAGON, 1, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr))
          .attr(MovePowerBoostAbAttr, (user, target, move) => user.getMoveType(move, true, target) === Type.DRAGON && target.getBattleStat(Stat.DEF) > target.getBattleStat(Stat.ATK), 1.5),

      new Ability(Abilities.BEASTSTAR, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => true, 1.5)
          .attr(PostAttackApplyBattlerTagAbAttr, false, (user, target, move) => !move.hasAttr(FlinchAttr) ? 30 : 0, BattlerTagType.FLINCHED)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => {
            if (user.turnData.hitsLeft !== 1) { return false; }
            if (user.turnData.postAttackSelfStatChangeApplied) { return false; }
            user.turnData.postAttackSelfStatChangeApplied = true;
            return true;
          }, -1, [BattleStat.DEF, BattleStat.SPDEF], true),

      new Ability(Abilities.RAPID_FIRE, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.STEEL, Type.FIRE])
          .attr(BaseTypeConvertedMovePowerBoostAbAttr, Type.NORMAL, [Type.STEEL, Type.FIRE], 1.2)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move, simulated) => {
            const t = move.type;
            if (t !== Type.STEEL && t !== Type.FIRE && !(t === Type.NORMAL && move.category !== MoveCategory.STATUS)) {
              return false;
            }
            if (pokemon.turnData.rapidFirePriorityProc !== undefined) {
              return pokemon.turnData.rapidFirePriorityProc;
            }
            const roll = randSeedChance(30);
            if (!simulated) {
              pokemon.turnData.rapidFirePriorityProc = roll;
            }
            return roll;
          }, 1),

      new Ability(Abilities.CORNFIELD_GUARDIAN, 9)
          .conditionalAttr((pokemon) => pokemon.scene.arena.getTerrainType() === TerrainType.GRASSY, PostTurnStatChangeAbAttr, BattleStat.ATK, 1, true)
          .conditionalAttr((pokemon) => pokemon.scene.arena.getTerrainType() === TerrainType.GRASSY, PostTurnResetStatusAbAttr),

      new Ability(Abilities.CONTAGION, 9)
          .attr(MoveTypeChangeAbAttr, Type.POISON, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => move.type === Type.POISON),

      new Ability(Abilities.QUICK_DRAW_V2, 9)
          .attr(ChangeMovePriorityAbAttr, (_pokemon, move) =>
            move.hasFlag(MoveFlags.PULSE_MOVE) || move.hasFlag(MoveFlags.BALLBOMB_MOVE) || move.hasFlag(MoveFlags.AURA_MOVE), 1)
          .attr(MovePowerBoostAbAttr, (user, target, move) =>
            move.hasFlag(MoveFlags.PULSE_MOVE) || move.hasFlag(MoveFlags.BALLBOMB_MOVE) || move.hasFlag(MoveFlags.AURA_MOVE), 1.2),

      new Ability(Abilities.GOLDEN_RADIANCE, 9)
          .attr(PostDefendGoldenRadianceAbAttr, 0.1)
          .bypassFaint(),

      new Ability(Abilities.CRIMSON_GEAR, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.STEEL, 2)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr))
          .conditionalAttr(
            (pokemon) => {
              const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
              return party.filter(p => p !== pokemon && !p.isFainted()
                && p.getMoveset(true).some(m => m?.getMove()?.hasFlag(MoveFlags.GADGET_MOVE))
              ).length >= 2;
            },
            SharedWeaknessOrPartnerBoostAbAttr,
            Type.ELECTRIC, [Type.FIRE, Type.STEEL], 2
          ),

      new Ability(Abilities.ABYSSAL_FLAME, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.DARK, 2)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return (t === Type.FIRE || t === Type.DARK) && user.randSeedInt(100) < 30;
          }),

      new Ability(Abilities.DRACO_NEGATION, 9)
          .attr(PreDefendChanceStatusNegateDamageAndBoostAbAttr, 30, 1 / 16),

      new Ability(Abilities.MILLENNIUM_ABSORPTION, 9)
          .attr(PostDefendContactReflectTakenDamageAbAttr, 0.5)
          .attr(PostKnockOutHealAndCopyFoeAbilityAsPassiveAbAttr, 0.25)
          .bypassFaint(),

      new Ability(Abilities.UNDEAD_AVENGER, 9)
          .attr(FaintedPartyBattleStatMultiplierAbAttr, BattleStat.ATK, 0.1)
          .attr(FaintedPartyBattleStatMultiplierAbAttr, BattleStat.SPD, 0.1),

      new Ability(Abilities.DEBILITATING_ROCKET, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.STEEL, Type.FLYING])
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return (t === Type.STEEL || t === Type.FLYING) && user.randSeedInt(100) < 30;
          }, -2, BattleStat.ATK),

      new Ability(Abilities.LAST_SAMUFROG, 9)
          .attr(MoveFlagChangeAttr, MoveFlags.SLICING_MOVE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ConditionalBonusCritAbAttr, (user, target, move) => move.hasFlag(MoveFlags.SLICING_MOVE))
          .attr(PreDefendFullHpEndureAbAttr)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.SLICING_MOVE, (user, target, move) => move.type === Type.NORMAL)
          .ignorable(),

      new Ability(Abilities.PHANTOM_ARSENAL, 9)

          .attr(PostAttackHitChanceAddArenaTrapTagAbAttr, 10, ArenaTagType.SPIKES, (user, target, move) => user.getMoveType(move, true, target) === Type.DARK)

          .attr(PostAttackHitChanceAddArenaTrapTagAbAttr, 10, ArenaTagType.STEALTH_ROCK, (user, target, move) => user.getMoveType(move, true, target) === Type.ROCK)

          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => user.getMoveType(move, true, target) === Type.GHOST && user.randSeedInt(100) < 5, [BattlerTagType.CURSED], 0),

      new Ability(Abilities.ABSOLUTE_LIGHTNING, 9)
          .attr(PreDefendOncePerBattleNegateAndReflectAbAttr, 1 / 8)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr)),

      new Ability(Abilities.SILENT_BLADE, 9)
          .attr(OverrideTargetDefAbAttr, (user, target, move) => move.category !== MoveCategory.STATUS),

      new Ability(Abilities.PRIDE_OF_WEAK, 9)
          .attr(PostKnockOutBoostStrongestAttackAndSpeedAbAttr)
          .attr(MovePowerBoostAbAttr, (user, target, move) => {
            const power = new Utils.NumberHolder(move.power);
            applyMoveAttrs(VariablePowerAttr, user, target, move, power);
            return power.value > 0 && power.value <= 60;
          }, 1.5),

      new Ability(Abilities.HEAVENS_JUDGMENT, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.ATK, -1, false, true)
          .attr(PostFoeSummonStatChangeAbAttr, BattleStat.ATK, -1, false, true)
          .attr(PartyMoveFlagPowerBoostAbAttr, MoveFlags.SERVANT_MOVE, 10),

      new Ability(Abilities.FROSTY_ABOMINATION, 9)
          .attr(MoveTypeChangeAbAttr, Type.ICE, 1, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr))
          .attr(MoveTypePowerBoostAbAttr, Type.ICE, 1.2)
          .attr(MoveFlagChangeAttr, MoveFlags.BITING_MOVE, 1, (user, target, move) => user.getMoveType(move, true, target) === Type.ICE)
          .attr(
            PostDefendDamageAbAttr,
            (target, attacker, move) => {
              const last = target.turnData?.attacksReceived?.[0];
              if (!last || last.sourceId !== attacker.id || last.move !== move.id || !last.damage) {
                return false;
              }
              const gate = Math.ceil(target.getMaxHp() * 0.5);
              return target.hp <= gate && (target.hp + last.damage) > gate;
            },
            1 / 8
          )
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.FREEZE, (user, target, move) => user.getMoveType(move, true, target) === Type.ICE && user.randSeedInt(100) < 10)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.BITING_MOVE, (user, target, move) => user.getMoveType(move, true, target) === Type.ICE)
          .bypassFaint(),

      new Ability(Abilities.CHAOS_ORDER, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, attacker, move) => attacker.getSpeciesForm().baseTotal >= 600, 0.5)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FAIRY, Type.DARK])
          .attr(ChaosOrderKoRiderAbAttr),

      new Ability(Abilities.MACH_SPEED, 9)
          .conditionalAttr((pokemon) => (pokemon.battleSummonData?.turnCount ?? 1) === 1, BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
          .conditionalAttr((pokemon) => (pokemon.battleSummonData?.turnCount ?? 1) === 1, BattleStatMultiplierAbAttr, BattleStat.ATK, 2),

      new Ability(Abilities.IRON_GIANT, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.STEEL, 1.3)
          .attr(MoveTypePowerBoostAbAttr, Type.FIGHTING, 1.3)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return (t === Type.STEEL || t === Type.FIGHTING) && user.randSeedInt(100) < 30;
          }, -1, BattleStat.DEF),

      new Ability(Abilities.TORRENTIAL_TRIBUTE, 9)
          .attr(PostSummonAddBattlerTagOncePerBattleAbAttr, BattlerTagType.YU_ONE_HIT_SHIELD, -1, true)
          .attr(PreDefendOncePerBattleNegateAndReflectWhileTaggedAbAttr, BattlerTagType.YU_ONE_HIT_SHIELD, 1 / 8)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1.2, (user, target, move) => move.type === Type.NORMAL),

      new Ability(Abilities.GOLDEN_GEAR, 9)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr))
          .attr(SharedWeaknessPowerBoostAbAttr, Type.ELECTRIC, Type.STEEL, 2)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            const count = party.filter(p => p !== pokemon && !p.isFainted()
              && p.getMoveset(true).some(m => m?.getMove()?.hasFlag(MoveFlags.GADGET_MOVE))).length;
            return count >= 2;
          }, SharedWeaknessPowerBoostAbAttr, Type.GRASS, Type.ELECTRIC, 2)
          .conditionalAttr((pokemon) => {
            const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
            const count = party.filter(p => p !== pokemon && !p.isFainted()
              && p.getMoveset(true).some(m => m?.getMove()?.hasFlag(MoveFlags.GADGET_MOVE))).length;
            return count >= 2;
          }, SharedWeaknessPowerBoostAbAttr, Type.GRASS, Type.STEEL, 2),

      new Ability(Abilities.SUPER_CONDUCTOR, 9)
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => move.category !== MoveCategory.STATUS, BattlerTagType.SUPER_CONDUCTOR_CHARGED)
          .conditionalAttr((pokemon) => pokemon.getTag(BattlerTagType.SUPER_CONDUCTOR_CHARGED) !== null, BattleStatMultiplierAbAttr, BattleStat.SPD, 2)
          .bypassFaint(),

      new Ability(Abilities.RUIN, 9)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ConditionalCritAbAttr, (user, target, move) => user.getMoveType(move, true, target) === Type.DARK && user.randSeedInt(100) < 10)
          .attr(PostAttackConditionalInvertFoeStatsAbAttr, (user, target, move) => user.getMoveType(move, true, target) === Type.DARK, 30),

      new Ability(Abilities.BLESSINGS_OF_LANDSTAR, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => move.power > 0 && move.power <= 60)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move, simulated) => {
            if (!(move.power > 0 && move.power <= 60)) {
              return false;
            }
            if (pokemon.turnData.landstarPriorityProc !== undefined) {
              return pokemon.turnData.landstarPriorityProc;
            }
            const roll = randSeedChance(50);
            if (!simulated) {
              pokemon.turnData.landstarPriorityProc = roll;
            }
            return roll;
          }, 1),

      new Ability(Abilities.CYCLONIC_SHIFT, 9)
          .attr(PostAttackSwapFoeStatPairsAbAttr, BattleStat.DEF, BattleStat.ATK)
          .attr(PostAttackSwapFoeStatPairsAbAttr, BattleStat.SPATK, BattleStat.SPDEF),

      new Ability(Abilities.SPECTRAL_MIST, 9)
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.type === Type.GHOST && randSeedChance(30), [BattlerTagType.CURSED], 0)
          .attr(PostTurnChanceHealRatioAbAttr, 25, 1/8),

      new Ability(Abilities.FOG_BODY, 9)
          .attr(PostMissStatAndHealAbAttr, BattleStat.ATK, 1, 1/8),

      new Ability(Abilities.SILENT_ASSASSIN, 9)
          .attr(PostTurnEvaCapIncrementAndThresholdResetAbAttr, 3, 1),

      new Ability(Abilities.FOG_BREATH, 9)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1.3, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => move.type === Type.NORMAL && user.getMoveType(move, true, target) === Type.WATER && user.randSeedInt(100) < 30, -1, BattleStat.EVA),

      new Ability(Abilities.UNDYING_SOUL, 9)
          .attr(PostSummonPartyTypeCountRandomStatBoostAbAttr, [Type.NORMAL, Type.FIGHTING])
          .attr(PostKnockOutReviveAllyOfTypesOncePerBattleAbAttr, 0.5, [Type.NORMAL, Type.FIGHTING]),

      new Ability(Abilities.MIRROR_KING, 9)
          .attr(PostSummonCopyAbilityAbAttr)
          .attr(PreSwitchOutNativeHealAbAttr, Abilities.MIRROR_KING, 0.33),

      new Ability(Abilities.AQUATIC_RITUAL, 9)
          .conditionalAttr(getWeatherCondition(WeatherType.RAIN, WeatherType.HEAVY_RAIN), PostTurnStatChangeAbAttr, BattleStat.RAND, 1, true)
          .conditionalAttr(getWeatherCondition(WeatherType.RAIN, WeatherType.HEAVY_RAIN), PostTurnStatChangeAbAttr, BattleStat.RAND, 1, true),

      new Ability(Abilities.GEMSTONE_TRAMPLE, 9)
          .attr(MoveTypeChangeAbAttr, Type.GROUND, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr))
          .attr(IgnoreOpponentPositiveDefSpDefBoostsOnConditionAbAttr, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr)),

      new Ability(Abilities.EMERALD_STANCE, 9)
          .attr(DefenseAsAttackAbAttr),

      new Ability(Abilities.GEM_SIPHON, 9)
          .attr(PostAttackDrainOrSubstituteAtFullHpAbAttr, (user, target, move) => user.getMoveType(move, true, target) === Type.FAIRY, 0.5, 0.25),

      new Ability(Abilities.TOPAZ_LIFEORB, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.category !== MoveCategory.STATUS, 1.3)
          .attr(PostAttackSelfDamageAbAttr, 0.15)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => user.randSeedInt(100) < 10, 1, BattleStat.ATK, true)
          .bypassFaint(),

      new Ability(Abilities.FIRE_AND_ICE, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FIRE, Type.ICE])
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.FREEZE, (user, target, move) => move.category !== MoveCategory.STATUS && user.getMoveType(move, true, target) === Type.FIRE && user.randSeedInt(100) < 10)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => move.category !== MoveCategory.STATUS && user.getMoveType(move, true, target) === Type.ICE && user.randSeedInt(100) < 30),

      new Ability(Abilities.ICE_AGE, 9)
          .attr(PostSummonWeatherChangeAbAttr, WeatherType.SNOW)
          .attr(PostTurnWeatherRandomOppStatDropAbAttr, WeatherType.HAIL, WeatherType.SNOW),

      new Ability(Abilities.SCALES_OF_JUSTICE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => target !== null && target.isOfType(Type.DARK), 2.5),

      new Ability(Abilities.PIERCING_SPIRAL, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.DRAGON, Type.FIGHTING])
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => {
            const isFinalStrike = user.turnData.hitsLeft === 1 || !target.isActive();
            if (!isFinalStrike) { return false; }
            const t = user.getMoveType(move, true, target);
            return (t === Type.DRAGON || t === Type.FIGHTING) && move.category !== MoveCategory.STATUS && randSeedChance(30);
          }, -1, BattleStat.DEF),

      new Ability(Abilities.CHARGE_CHAMPION, 9)
          .attr(ChargeMoveDamageAbAttr, 0.5)
          .conditionalAttr((pokemon) => pokemon.getTag(BattlerTagType.CHARGING) !== null, PostTurnStatChangeAbAttr, BattleStat.RAND, 1, true)
          .conditionalAttr((pokemon) => pokemon.getTag(BattlerTagType.CHARGING) !== null, PostTurnStatChangeAbAttr, BattleStat.RAND, 1, true),

      new Ability(Abilities.RADIATING_GAMMA, 9)
          .attr(MoveTypeChangeAbAttr, Type.STEEL, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(DefenseAsAttackAbAttr)
          .attr(PostTurnDamageAbAttr, 1/8, (pokemon) => partyMagnetGate2Met(pokemon)),

      new Ability(Abilities.PHANTOM_BEAST, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.EVA, 1, true)
          .conditionalAttr((p) => p.summonData.battleStats[BattleStat.EVA] > 1, ChangeMovePriorityAbAttr, (pokemon, move) => true, 1)
          .attr(PostDefendMissResetEvaAndBoostRandomStatAbAttr),

      new Ability(Abilities.TWIN_BLESSINGS, 9)
          .attr(MoveEffectChanceMultiplierAbAttr, 2)
          .attr(MoveTypeChangeAbAttr, Type.FAIRY, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackHealDamageDealtAbAttr, 0.5, (user, target, move) =>
            move.category !== MoveCategory.STATUS
            && user.getMoveType(move, true, target) === Type.FAIRY
            && randSeedChance(30)),

      new Ability(Abilities.BLAZING_CITRINE, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FIRE, Type.ROCK])
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.BURN, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return (t === Type.FIRE || t === Type.ROCK) && randSeedChance(30);
          })
          .attr(SuppressAbilitiesWhileConditionAbAttr, (pokemon) => pokemon.status?.effect === StatusEffect.BURN)
          .attr(SuppressSecondaryEffectsWhileConditionAbAttr, (pokemon) => pokemon.status?.effect === StatusEffect.BURN),

      new Ability(Abilities.INFINITY_STONES, 9)
          .attr(MoveTypeChangeAbAttr, Type.ROCK, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ConditionalCritAbAttr, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.ROCK && randSeedChance(10))
          .attr(PostAttackChanceStatusAbAttr, [StatusEffect.POISON, StatusEffect.SLEEP, StatusEffect.BURN, StatusEffect.PARALYSIS],
            (user, target, move) => user.getMoveType(move, true, target) === Type.ROCK && randSeedChance(10))
          .attr(PostAttackHealDamageDealtAbAttr, 0.25, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.ROCK),

      new Ability(Abilities.ROUND_TRIP, 9)
          .attr(PreSwitchOutHealOutgoingAndIncomingAbAttr, 0.2),

      new Ability(Abilities.CORPSE_PARTY, 9)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PartyTypePowerBoostAbAttr, Type.GHOST, 5),

      new Ability(Abilities.S_AND_MUMMY, 9)
          .attr(PostDefendContactApplyTagChanceAbAttr, 30, BattlerTagType.WRAP, 5)
          .attr(PostTurnHealAbAttr),

      new Ability(Abilities.THE_GRIM_MILLER, 9)
          .attr(MoveTypeChangeAbAttr, Type.GHOST, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackDrainFoeLastMovePPAbAttr, 2, (user, target, move) => user.getMoveType(move, true, target) === Type.GHOST)
          .attr(PostTurnGrimMillerEncoreDisablePpZeroFlinchAbAttr),

      new Ability(Abilities.ELECTRO_BOOGEY, 9)
          .attr(MoveTypeChangeAbAttr, Type.ELECTRIC, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(MovePowerBoostAbAttr, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            if (t !== Type.ELECTRIC) {
              return false;
            }
            if (user.turnData.electroBoogeyPowerProc === undefined) {
              user.turnData.electroBoogeyPowerProc = randSeedChance(30);
            }
            return user.turnData.electroBoogeyPowerProc;
          }, 2.5)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.PARALYSIS,
            (user, target, move) => user.getMoveType(move, true, target) === Type.ELECTRIC && randSeedChance(10)),

      new Ability(Abilities.ABOMINABLE_PROTECTION, 9)
          .attr(PostSummonAuroraVeilWithSelfDamageOncePerBattleAbAttr, 5, 0.25),

      new Ability(Abilities.CORRUPTED_POWER, 9)
          .attr(ConsecutiveAttackPowerBoostWithRecoilAbAttr, 0.4, 3.0, 0.33)
          .conditionalAttr((pokemon) => !!pokemon.turnData.consecutiveBoostActive, PostAttackSelfDamageAbAttr, 0.33),

      new Ability(Abilities.ELEMENTAL_HAVOC, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, attacker, move) => {
            if (target.isPlayer() === attacker.isPlayer()) {
              return false;
            }
            const t = attacker.getMoveType(move, true, target);
            return t === Type.WATER || t === Type.ELECTRIC || t === Type.FLYING;
          }, 0.5)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.WATER, Type.ELECTRIC, Type.FLYING])
          .attr(MovePowerBoostAbAttr, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return move.category !== MoveCategory.STATUS
              && (t === Type.WATER || t === Type.ELECTRIC || t === Type.FLYING);
          }, 1.2)
          .ignorable(),

      new Ability(Abilities.ADVENTURE_START, 9)
          .attr(CritLevelBoostAbAttr, 1)
          .attr(ChangeMovePriorityAbAttr, (pokemon, _move, simulated) => {
            if (pokemon.turnData.adventureStartPriorityProc !== undefined) {
              return pokemon.turnData.adventureStartPriorityProc;
            }
            const roll = randSeedChance(50);
            if (!simulated) {
              pokemon.turnData.adventureStartPriorityProc = roll;
            }
            return roll;
          }, 1),

      new Ability(Abilities.MINDLESS_RAMPAGE, 9)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.chance >= 1, 5461/4096)
          .attr(MoveEffectChanceMultiplierAbAttr, 0)
          .attr(PostAttackRandStatChangeAbAttr, (_user, _target, _move) => true, 1, [BattleStat.ATK, BattleStat.SPD], true)
          .attr(PostTurnDamageAbAttr, 1/8, () => true, true),

      new Ability(Abilities.GOLDEN_GAZE, 9)
          .attr(MoveTypeChangeAbAttr, Type.PSYCHIC, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackDisableFoeLastMoveAbAttr, 30, (user, target, move) => user.getMoveType(move, true, target) === Type.PSYCHIC)
          .attr(MovePowerBoostAbAttr, (user, target, move) => user.getMoveType(move, true, target) === Type.PSYCHIC && foeMoveDisabledGate(user, target, move), 1.3),

      new Ability(Abilities.TOMB_RAIDER, 9)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(MovePowerBoostAbAttr, (user, target, move) =>
            userHasItemGate(user, target, move) && user.getMoveType(move, true, target) === Type.DARK, 1.3)
          .conditionalAttr((pokemon) => userHasItemGate(pokemon), PostSummonStatChangeAbAttr, BattleStat.SPD, 1, true)
          .attr(PostAttackStealHeldItemAbAttr, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.DARK && foeHasItemGate(user, target, move) && randSeedChance(30)),

      new Ability(Abilities.POWDER_KING, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.BUG, Type.POISON])
          .attr(BaseTypeConvertedMovePowerBoostAbAttr, Type.NORMAL, [Type.BUG, Type.POISON], 1.2)
          .attr(PostAttackChanceStatusAbAttr, [StatusEffect.POISON, StatusEffect.SLEEP, StatusEffect.BURN, StatusEffect.PARALYSIS],
            (user, target, move) => {
              const t = user.getMoveType(move, true, target);
              return (t === Type.BUG || t === Type.POISON) && randSeedChance(50);
            }),

      new Ability(Abilities.BLOOD_SCENT, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => target !== null && target.getHpRatio() < 0.4),

      new Ability(Abilities.UNITED_JUNGLE, 9)
          .conditionalAttr((p) => p.battleSummonData.enteredFromKnockOut, PostSummonHealRatioAbAttr, 0.25)
          .attr(FaintedPartyTypeBpBoostAbAttr, Type.GRASS, 10),

      new Ability(Abilities.EMERALD_GEAR, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.GRASS, Type.STEEL, 2)
          .attr(MoveTypeChangeAbAttr, Type.GRASS, 1.2, (user, target, move) => move.type === Type.NORMAL && !move.hasAttr(VariableMoveTypeAttr))
          .conditionalAttr(
            (pokemon) => {
              const party = pokemon.isPlayer() ? pokemon.scene.getParty() : pokemon.scene.getEnemyParty();
              return party.filter(p => p !== pokemon && !p.isFainted()
                && p.getMoveset(true).some(m => m?.getMove()?.hasFlag(MoveFlags.GADGET_MOVE))
              ).length >= 2;
            },
            SharedWeaknessOrPartnerBoostAbAttr,
            Type.FIRE, [Type.GRASS, Type.STEEL], 2
          ),

      new Ability(Abilities.DEFLECTION_HIDE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => true, 0.7)
          .attr(PostDefendHitDamageRatioAbAttr, 1/16, (target, user, move) => move.checkFlag(MoveFlags.MAKES_CONTACT, user, target))
          .ignorable(),

      new Ability(Abilities.GRAVITY_AXE, 9)
          .attr(ArenaTrapAbAttr, (user, target) => true)
          .attr(PostSummonAddArenaTagAbAttr, ArenaTagType.GRAVITY, 5)
          .attr(MoodyAbAttr),

      new Ability(Abilities.REBOUNDING_HURRICANE, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.EVA, 1, true)
          .attr(PostDefendMissApplyBattlerTagAbAttr, BattlerTagType.WIND_CHARGED)
          .attr(PostAttackConsumeTagForceSwitchAbAttr, BattlerTagType.WIND_CHARGED, [Type.NORMAL, Type.FLYING]),

      new Ability(Abilities.WHIRLWIND_AXE, 9)
          .attr(MoveTypeChangeAbAttr, Type.FLYING, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackHitChanceForceSwitchAndHealAbAttr, 30, 1/8, (user, target, move) => user.getMoveType(move, true, target) === Type.FLYING),

      new Ability(Abilities.HARPIE_BOOST, 9)
          .attr(PartyTypeAllMovesPowerBoostAbAttr, Type.FLYING, 15),

      new Ability(Abilities.PHANTOM_ARMOR, 9)
          .attr(MoveImmunityAbAttr, (target, user, move) => move.checkFlag(MoveFlags.MAKES_CONTACT, user, target))
          .ignorable(),

      new Ability(Abilities.GIANT_IMPACT, 9)
          .attr(MoveTypeChangeAbAttr, Type.NORMAL, 1, (user, target, move) =>
            [Type.FIRE, Type.GRASS, Type.WATER, Type.ELECTRIC].includes(move.type))
          .attr(MovePowerBoostAbAttr, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.NORMAL && move.category !== MoveCategory.STATUS, 1.3)
          .attr(PostAttackHitChanceParalyzeOrFlinchAbAttr, 30, (user, target, move) => user.getMoveType(move, true, target) === Type.NORMAL),

      new Ability(Abilities.SLIME_ABSORB, 9)
          .attr(PostKnockOutIfKoerHealAndRandStatAbAttr, 0.25),

      new Ability(Abilities.THOUSAND_SOULS, 9)
          .attr(PostSummonCopyRandomFaintedAllyAbilityAndHealAbAttr, 1/8),

      new Ability(Abilities.FAST_FOOD, 9)
          .attr(PostTurnStatChangeAbAttr, BattleStat.SPD, 1)
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.hasFlag(MoveFlags.BITING_MOVE), 1.2),

      new Ability(Abilities.HYDRO_CLONE, 9)
          .attr(PostKnockOutSubstituteAbAttr, 0.25),

      new Ability(Abilities.CRYSTAL_LUSTER, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.ICE, Type.ROCK])
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.DRAGON, [Type.ICE, Type.ROCK])
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.FREEZE,
            (user, target, move) => user.getMoveType(move, true, target) === Type.ICE && randSeedChance(10))
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => user.getMoveType(move, true, target) === Type.ROCK && randSeedChance(10), [BattlerTagType.SALT_CURED], 0),

      new Ability(Abilities.HAMMER_KNOCKBACK, 9)
          .attr(PostAttackForceSwitchAbAttr, 30, (user, target, move) => move.checkFlag(MoveFlags.MAKES_CONTACT, user, target)),

      new Ability(Abilities.LIFE_EXCHANGE, 9)
          .attr(PostKnockOutReviveRandomAllyOncePerBattleAbAttr, 0.5),

      new Ability(Abilities.THREE_HEADED_BITE, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.DARK, Type.FIRE])
          .attr(MoveFlagChangeAttr, MoveFlags.BITING_MOVE, 0.4, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return t === Type.DARK || t === Type.FIRE;
          })
          .attr(ConditionalMultiStrikeAbAttr, 3, 3, (_user, move) => [Type.NORMAL, Type.DARK, Type.FIRE].includes(move.type))
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.BITING_MOVE, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return t === Type.DARK || t === Type.FIRE;
          }),

      new Ability(Abilities.CORRUPT_ELEPHANT, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FAIRY, Type.DARK])
          .attr(PostDefendHitRandomItemLossHealAndAtkAbAttr, 1/8),

      new Ability(Abilities.ILLUSIONIST, 9)
          .attr(ChanceMoveImmunityAbAttr, 30, (target, user, move) => move.category === MoveCategory.PHYSICAL && target.isPlayer() !== user.isPlayer()),

      new Ability(Abilities.MASKED_GOD, 9)
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 1,
            CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.DARK, Type.GHOST, Type.PSYCHIC])
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 2,
            PostAttackHealDamageDealtAbAttr, 0.25, (user, target, move) => {
              const t = user.getMoveType(move, true, target);
              return t === Type.DARK || t === Type.GHOST || t === Type.PSYCHIC;
            })
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 3,
            ReceivedMoveDamageMultiplierAbAttr, (_target, _user, _move) => true, 0.75)
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 5,
            PostAttackChanceStatusAbAttr, StatusEffect.SLEEP,
            (user, target, move) => user.getMoveType(move, true, target) === Type.DARK && randSeedChance(10))
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 5,
            PostAttackApplyTagAbAttr, false,
            (user, target, move) => user.getMoveType(move, true, target) === Type.GHOST && randSeedChance(5),
            [BattlerTagType.CURSED], 0)
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 5,
            PostAttackHitChanceDefenderStatChangeAbAttr, 10, [BattleStat.SPDEF, BattleStat.DEF], -1,
            (user, target, move) => user.getMoveType(move, true, target) === Type.PSYCHIC)
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 10,
            SharedWeaknessPowerBoostAbAttr, Type.DARK, Type.GHOST, 2)
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 10,
            SharedWeaknessPowerBoostAbAttr, Type.DARK, Type.PSYCHIC, 2)
          .conditionalAttr(p => sumPartyMoveFlagSlots(p, MoveFlags.MASK_MOVE) >= 10,
            SharedWeaknessPowerBoostAbAttr, Type.GHOST, Type.PSYCHIC, 2),

      new Ability(Abilities.THOUSAND_YEARS, 9)
          .attr(PostTurnPartyMoveFlagConditionalRandFoeStatDropsAbAttr, MoveFlags.TIME_MOVE, 2,
            [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD], -1),

      new Ability(Abilities.THOUSAND_EYES_LOCK, 9)
          .attr(ArenaTrapAbAttr, (user, target) => true)
          .attr(PostTurnEnsureOpponentsTormentedAndMirrorRandStatAbAttr),

      new Ability(Abilities.TIME_ROULETTE, 9)
          .attr(TimeRouletteCoinFlipAbAttr, 3.0, 0.5)
          .attr(CoinFlipRecoilPostAttackAbAttr, 0.5),

      new Ability(Abilities.SPIKED_SHELL, 9)
          .attr(PostDefendContactDamageAbAttr, 6)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.category === MoveCategory.PHYSICAL, 0.5)
          .bypassFaint(),

      new Ability(Abilities.TWISTED_LOVE, 9)
          .attr(NonSuperEffectiveImmunityAbAttr)
          .attr(BlockAllHealingAbAttr)
          .attr(PostAttackHitDamageFoeRatioAbAttr, 1/8)
          .attr(PostTurnDamageAbAttr, 1/4, (pokemon, opponent) => true, true)
          .attr(UncopiableAbilityAbAttr)
          .attr(UnswappableAbilityAbAttr)
          .ignorable(),

      new Ability(Abilities.CURSED_POTENTIAL, 9)
          .attr(PostSummonStatBoostAbAttr, 1)
          .attr(PostSummonStatChangeAbAttr, BattleStat.RAND, 1, true)
          .attr(PostTurnCursedPotentialRollAbAttr)
          .attr(BlockSwitchCommandAbAttr),

      new Ability(Abilities.FOREST_TRICKERY, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.GRASS, Type.FAIRY])
          .attr(BaseTypeConvertedMovePowerBoostAbAttr, Type.NORMAL, [Type.GRASS, Type.FAIRY], 1.2)
          .attr(PostAttackTerrainChangeChanceAbAttr, TerrainType.GRASSY, 30, (user, target, move) => user.getMoveType(move, true, target) === Type.GRASS)
          .attr(PostAttackTerrainChangeChanceAbAttr, TerrainType.MISTY, 30, (user, target, move) => user.getMoveType(move, true, target) === Type.FAIRY),

      new Ability(Abilities.HYDRO_SURGE, 9)
          .attr(ForceSuperEffectiveAgainstTypeAbAttr, Type.FIRE, 2),

      new Ability(Abilities.CLUSTER_BURST, 9)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1, (user, target, move) => move.type === Type.NORMAL)
          .conditionalAttr(
            (pokemon) => {
              const w = pokemon.scene.arena.weather?.weatherType;
              return w === WeatherType.RAIN || w === WeatherType.HEAVY_RAIN;
            },
            ClusterBurstSecondStrikeAbAttr,
            50,
            (user, target, move) => user.getMoveType(move, true, target) === Type.WATER
          ),

      new Ability(Abilities.PYRO_BULLET, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move) => move.type === Type.FIRE, 1),

      new Ability(Abilities.ZANY_SPLASHER, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FAIRY, Type.WATER])
          .attr(PostSummonStatChangeAbAttr, BattleStat.EVA, 1, true)
          .attr(ConditionalCritAbAttr, (user, target, move) =>
            user.getMoveType(move, true, target) === Type.FAIRY && randSeedChance(5)
          )
          .attr(PostAttackHitChanceApplyBattlerTagWithTurnsAbAttr, 5, BattlerTagType.WHIRLPOOL, Moves.WHIRLPOOL, 4, 5,
            (user, target, move) => user.getMoveType(move, true, target) === Type.WATER
          ),

      new Ability(Abilities.TOON_POUNDING, 9)
          .attr(OverrideTargetDefUseWeakerDefOnConditionAbAttr, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return t === Type.STEEL || t === Type.FAIRY;
          }),

      new Ability(Abilities.TOON_GUNSLINGER, 9)
          .attr(ConditionalCritAbAttr, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return (t === Type.NORMAL || t === Type.DRAGON || t === Type.DARK || t === Type.FAIRY) && randSeedChance(10);
          })
          .attr(ChangeMovePriorityAbAttr, (pokemon, move, simulated) => {
            const t = move.type;
            if (!(t === Type.NORMAL || t === Type.DRAGON || t === Type.DARK || t === Type.FAIRY)) {
              return false;
            }
            if (pokemon.turnData.toonGunslingerPriorityProc !== undefined) {
              return pokemon.turnData.toonGunslingerPriorityProc;
            }
            const roll = randSeedChance(50);
            if (!simulated) {
              pokemon.turnData.toonGunslingerPriorityProc = roll;
            }
            return roll;
          }, 1),

      new Ability(Abilities.TOON_CHAOS, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.FAIRY, Type.DARK])
          .attr(MoveTypePowerBoostAbAttr, Type.FAIRY, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.DARK, 1.2)
          .attr(PostAttackForceSwitchAbAttr, 30, (user, target, move) => {
            const t = user.getMoveType(move, true, target);
            return t === Type.FAIRY || t === Type.DARK;
          }),

      new Ability(Abilities.TOON_ILLUSION, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.EVA, 1, true)
          .attr(PostDefendMissSubstituteAbAttr, 0.25, 30),

      new Ability(Abilities.TOON_SYNERGY, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.PSYCHIC, Type.FAIRY])
          .attr(PostAttackHitPartyMoveFlagChanceAllStatsBoostAbAttr, MoveFlags.TOON_MOVE, 10,
            [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.SPD],
            (user, target, move) => {
              const t = user.getMoveType(move, true, target);
              return t === Type.PSYCHIC || t === Type.FAIRY;
            }
          ),

      new Ability(Abilities.DRAW_TIME, 9)
          .attr(PostKnockOutRewardPhaseChanceAbAttr, 5),

      new Ability(Abilities.TOON_PLOT_ARMOR, 9)
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackHitChanceProtectAbAttr, 10, (user, target, move) => user?.getMoveType(move, true, target) === Type.WATER),

      new Ability(Abilities.TOON_ELECTRIC_ARCHFIEND, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.ELECTRIC, Type.DARK])
          .attr(ChangeMovePriorityAbAttr, (pokemon, move, simulated) => {
            if (move.type !== Type.ELECTRIC) {
              return false;
            }
            if (pokemon.turnData.toonElectricArchfiendPriorityProc !== undefined) {
              return pokemon.turnData.toonElectricArchfiendPriorityProc;
            }
            const roll = randSeedChance(30);
            if (!simulated) {
              pokemon.turnData.toonElectricArchfiendPriorityProc = roll;
            }
            return roll;
          }, 1)
          .attr(ConditionalCritAbAttr, (user, target, move) => user?.getMoveType(move, true, target) === Type.DARK && randSeedChance(10)),

      new Ability(Abilities.JURASSIC_JAWS, 9)
          .attr(MoveTypeChangeAbAttr, Type.GROUND, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(MoveFlagChangeAttr, MoveFlags.BITING_MOVE, 1, (user, target, move) => user?.getMoveType(move, true, target) === Type.GROUND)
          .attr(ConditionalAddSecondStrikeAbAttr, 0.8, (user, target, move) =>
            move.hasFlag(MoveFlags.BITING_MOVE) || user?.getMoveType(move, true, target) === Type.GROUND)
          .attr(PostAttackClearAbilityFlagAttr, MoveFlags.BITING_MOVE, (user, target, move) => user?.getMoveType(move, true, target) === Type.GROUND),

      new Ability(Abilities.UNSTOPPABLE_TITAN, 9)
          .attr(IgnoreTypeResistanceOnConditionAbAttr, (user, target, move) => move.checkFlag(MoveFlags.MAKES_CONTACT, user, target))
          .attr(MovePowerBoostAbAttr, (user, target, move) => move.checkFlag(MoveFlags.MAKES_CONTACT, user, target), 1.2)
          .attr(OverrideTargetDefUseWeakerDefOnConditionAbAttr, (user, target, move) => move.checkFlag(MoveFlags.MAKES_CONTACT, user, target)),

      new Ability(Abilities.ELECTROMAGNETIC_MASTER, 9)
          .attr(CandidateRestrictedBestTypeChangeAbAttr, Type.NORMAL, [Type.ELECTRIC, Type.ROCK, Type.STEEL])
          .attr(SharedWeaknessPowerBoostAbAttr, Type.ELECTRIC, Type.ROCK, 2)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.ELECTRIC, Type.STEEL, 2)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.ROCK, Type.STEEL, 2)
          .attr(ChangeMovePriorityAbAttr, (pokemon, move, simulated) => {
            if (move.type !== Type.ELECTRIC) {
              return false;
            }
            if (pokemon.turnData.electromagneticMasterPriorityProc !== undefined) {
              return pokemon.turnData.electromagneticMasterPriorityProc;
            }
            const roll = randSeedChance(10);
            if (!simulated) {
              pokemon.turnData.electromagneticMasterPriorityProc = roll;
            }
            return roll;
          }, 1)
          .attr(PostAttackHitChanceApplyBattlerTagWithTurnsAbAttr, 5, BattlerTagType.SALT_CURED, Moves.SALT_CURE, 1, 1,
            (user, target, move) => user?.getMoveType(move, true, target) === Type.ROCK
          )
          .attr(ConditionalCritAbAttr, (user, target, move) => user?.getMoveType(move, true, target) === Type.STEEL && randSeedChance(10)),

      new Ability(Abilities.FLAMING_OBLIVION, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(IgnoreTypeResistanceOnConditionAbAttr, (user, target, move) => user?.getMoveType(move, true, target) === Type.FIRE)
          .attr(PostAttackHitChanceStatusAndTrapTagAbAttr, 30, StatusEffect.BURN, BattlerTagType.FIRE_SPIN, Moves.FIRE_SPIN, 4, 5,
            (user, target, move) => user?.getMoveType(move, true, target) === Type.FIRE
          )
          .attr(FlamingOblivionArmOnBurnedKoAbAttr)
          .attr(FlamingOblivionPostFoeSummonChipAbAttr),

      new Ability(Abilities.ROCKET_IMPACT, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1, (user, target, move) => move.type === Type.NORMAL)
          .attr(ConditionalBonusCritAbAttr, (user, target, move) => user?.getMoveType(move, true, target) === Type.FIRE)
          .attr(PostAttackCritBurnAbAttr, (user, target, move) => user?.getMoveType(move, true, target) === Type.FIRE),

      new Ability(Abilities.VOLCANIC_CORE, 9)
          .attr(MoveTypeChangeAbAttr, Type.FIRE, 1.2, (user, target, move) => move.type === Type.NORMAL)
          .attr(PostAttackStatusMoveChipAbAttr, 1/8),

      new Ability(Abilities.ACID_RAIN, 9)
          .attr(PostSummonWeatherChangeAbAttr, WeatherType.RAIN)
          .attr(PostBiomeChangeWeatherChangeAbAttr, WeatherType.RAIN)
          .attr(MovePowerBoostAbAttr, (user, target, move) => {
            const w = user?.scene.arena.weather?.weatherType;
            return (w === WeatherType.RAIN || w === WeatherType.HEAVY_RAIN) && user?.getMoveType(move, true, target) === Type.POISON;
          }, 1.3)
          .attr(MoveTypeChangeAbAttr, Type.POISON, 1, (user, target, move) => {
            const w = user?.scene.arena.weather?.weatherType;
            return (w === WeatherType.RAIN || w === WeatherType.HEAVY_RAIN) && move.type === Type.NORMAL;
          })
          .attr(MoveTypeChangeAbAttr, Type.WATER, 1, (user, target, move) => {
            const w = user?.scene.arena.weather?.weatherType;
            return (w !== WeatherType.RAIN && w !== WeatherType.HEAVY_RAIN) && move.type === Type.NORMAL;
          }),

      new Ability(Abilities.LEFTOVERS_POWER, 9)
          .attr(PostTurnHealPlusAbAttr)
  );
}