import Pokemon, { HitResult, PlayerPokemon, PokemonMove } from "../field/pokemon";
import { Type, getTypeDamageMultiplier } from "./type";
import {Constructor, randIntRange, randSeedChance} from "#app/utils";
import * as Utils from "../utils";
import { BattleStat, getBattleStatName } from "./battle-stat";
import { getPokemonNameWithAffix, getPokemonMessage } from "../messages";
import { Weather, WeatherType } from "./weather";
import {
  BattlerTag,
  GroundedTag,
  GulpMissileTag,
  SemiInvulnerableTag
} from "./battler-tags";
import {
  StatusEffect,
  getNonVolatileStatusEffects,
  getStatusEffectDescriptor,
  getStatusEffectHealText
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
  IncrementMovePriorityAttr,
  VariableMoveTypeAttr,
  RandomMovesetMoveAttr,
  RandomMoveAttr,
  NaturePowerAttr,
  CopyMoveAttr,
  MoveAttr,
  MultiHitAttr,
  ChargeAttr,
  SacrificialAttr,
  SacrificialAttrOnHit,
  NeutralDamageAgainstFlyingTypeMultiplierAttr,
  HealStatusEffectAttr,
  MultiHitType
} from "./move";
import { ArenaTagSide, ArenaTrapTag } from "./arena-tag";
import { Stat, getStatName } from "./pokemon-stat";
import {
  BerryModifier,
  PokemonHeldItemModifier,
  CollectedTypeModifier,
  PermaUseAbilityQuestModifier, PermaPartyAbilityModifier
} from "../modifier/modifier";
import { TerrainType } from "./terrain";
import { SpeciesFormChangeManualTrigger, SpeciesFormChangeRevertWeatherFormTrigger, SpeciesFormChangeWeatherTrigger } from "./pokemon-forms";
import i18next, { t } from "i18next";
import { Localizable } from "#app/interfaces/locales.js";
import { Command } from "../ui/command-ui-handler";
import { BerryModifierType, CollectedTypeModifierType } from "#app/modifier/modifier-type";
import { getPokeballName } from "./pokeball";
import { BattlerIndex } from "#app/battle";
import { Abilities } from "#enums/abilities";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import { MovePhase } from "#app/phases/move-phase";
import { PokemonHealPhase } from "#app/phases/pokemon-heal-phase";
import { ShowAbilityPhase } from "#app/phases/show-ability-phase";
import { StatChangePhase } from "#app/phases/stat-change-phase";
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

  /**
   * Get all ability attributes that match `attrType`
   * @param attrType any attribute that extends {@linkcode AbAttr}
   * @returns Array of attributes that match `attrType`, Empty Array if none match.
   */
  getAttrs<T extends AbAttr>(attrType: Constructor<T> ): T[] {
    return this.attrs.filter((a): a is T => a instanceof attrType);
  }

  /**
   * Check if an ability has an attribute that matches `attrType`
   * @param attrType any attribute that extends {@linkcode AbAttr}
   * @returns true if the ability has attribute `attrType`
   */
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
      } else { // TODO: This causes the ability bar to be shown at the wrong time
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
        && pokemon.getMaxHp() > 1 //Checks if pokemon has wonder_guard (which forces 1hp)
        && (args[0] as Utils.NumberHolder).value >= pokemon.hp) { //Damage >= hp
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

/**
 * Determines whether a Pokemon is immune to a move because of an ability.
 * @extends PreDefendAbAttr
 * @see {@linkcode applyPreDefend}
 * @see {@linkcode getCondition}
 */
export class TypeImmunityAbAttr extends PreDefendAbAttr {
  private immuneType: Type | null;
  private condition: AbAttrCondition | null;

  constructor(immuneType: Type | null, condition?: AbAttrCondition) {
    super();

    this.immuneType = immuneType;
    this.condition = condition ?? null;
  }

  /**
   * Applies immunity if this ability grants immunity to the type of the given move.
   * @param pokemon {@linkcode Pokemon} The defending Pokemon.
   * @param passive - Whether the ability is passive.
   * @param attacker {@linkcode Pokemon} The attacking Pokemon.
   * @param move {@linkcode Move} The attacking move.
   * @param cancelled {@linkcode Utils.BooleanHolder} - A holder for a boolean value indicating if the move was cancelled.
   * @param args [0] {@linkcode Utils.NumberHolder} gets set to 0 if move is immuned by an ability.
   * @param args [1] - Whether the move is simulated.
   */
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    // Field moves should ignore immunity
    if ([ MoveTarget.BOTH_SIDES, MoveTarget.ENEMY_SIDE, MoveTarget.USER_SIDE ].includes(move.moveTarget)) {
      return false;
    }
    if (attacker !== pokemon && attacker.getMoveType(move) === this.immuneType) {
      (args[0] as Utils.NumberHolder).value = 0;
      return true;
    }

    return false;
  }

  override getCondition(): AbAttrCondition | null {
    return this.condition;
  }
}

export class AttackTypeImmunityAbAttr extends TypeImmunityAbAttr {
  constructor(immuneType: Type, condition?: AbAttrCondition) {
    super(immuneType, condition);
  }

  /**
   * Applies immunity if the move used is not a status move.
   * Type immunity abilities that do not give additional benefits (HP recovery, stat boosts, etc) are not immune to status moves of the type
   * Example: Levitate
   */
  applyPreDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    // this is a hacky way to fix the Levitate/Thousand Arrows interaction, but it works for now...
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
        cancelled.value = true; // Suppresses "No Effect" message
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
      cancelled.value = true; // Suppresses "No Effect" message
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
      cancelled.value = true; // Suppresses "No Effect" message
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
    if (move instanceof AttackMove && pokemon.getAttackTypeEffectiveness(pokemon.getMoveType(move), attacker) < 2) {
      cancelled.value = true; // Suppresses "No Effect" message
      (args[0] as Utils.NumberHolder).value = 0;
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

export class PostDefendAbAttr extends AbAttr {
  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

/**
 * Applies the effects of Gulp Missile when the user is hit by an attack.
 * @extends PostDefendAbAttr
 */
export class PostDefendGulpMissileAbAttr extends PostDefendAbAttr {
  constructor() {
    super(true);
  }

  /**
   * Damages the attacker and triggers the secondary effect based on the form or the BattlerTagType.
   * @param {Pokemon} pokemon - The defending Pokemon.
   * @param passive - n/a
   * @param {Pokemon} attacker - The attacking Pokemon.
   * @param {Move} move - The move being used.
   * @param {HitResult} hitResult - n/a
   * @param {any[]} args - n/a
   * @returns Whether the effects of the ability are applied.
   */
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
    applyAbAttrs(ChangeMovePriorityAbAttr, attacker, null, simulated, move, attackPriority);

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

/**
 * Reduces the accuracy of status moves used against the Pokémon with this ability to 50%.
 * Used by Wonder Skin.
 *
 * @extends PreDefendAbAttr
 */
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
/**
 * Class for abilities that make drain moves deal damage to user instead of healing them.
 * @extends PostDefendAbAttr
 * @see {@linkcode applyPostDefend}
 */
export class ReverseDrainAbAttr extends PostDefendAbAttr {
  /**
   * Determines if a damage and draining move was used to check if this ability should stop the healing.
   * Examples include: Absorb, Draining Kiss, Bitter Blade, etc.
   * Also displays a message to show this ability was activated.
   * @param pokemon {@linkcode Pokemon} with this ability
   * @param passive N/A
   * @param attacker {@linkcode Pokemon} that is attacking this Pokemon
   * @param move {@linkcode PokemonMove} that is being used
   * @param hitResult N/A
   * @args N/A
   * @returns true if healing should be reversed on a healing move, false otherwise.
   */
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

    if (this.condition(pokemon, attacker, move) && (pokemon.hp <= hpGateFlat && (pokemon.hp + damageReceived) > hpGateFlat)) {
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

export class PostDefendTypeChangeAbAttr extends PostDefendAbAttr {
  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (hitResult < HitResult.NO_EFFECT) {
      if (simulated) {
        return true;
      }
      const type = attacker.getMoveType(move);
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
    if (move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon) && pokemon.randSeedInt(100) < this.chance) {
      if (simulated) {
        return attacker.canAddTag(this.tagType);
      } else {
      return attacker.addTag(this.tagType, this.turnCount, move.id, attacker.id);
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
    if (!simulated && move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon) && !attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
      attacker.damageAndUpdate(Utils.toDmgValue(attacker.getMaxHp() * (1 / this.damageRatio)), HitResult.OTHER);
      attacker.turnData.damageTaken += Utils.toDmgValue(attacker.getMaxHp() * (1 / this.damageRatio));
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
/**
 * @description: This ability applies the Perish Song tag to the attacking pokemon
 * and the defending pokemon if the move makes physical contact and neither pokemon
 * already has the Perish Song tag.
 * @class PostDefendPerishSongAbAttr
 * @extends {PostDefendAbAttr}
 */
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

/**
 * Modifies moves additional effects with multipliers, ie. Sheer Force, Serene Grace.
 * @extends AbAttr
 * @see {@linkcode apply}
 */
export class MoveEffectChanceMultiplierAbAttr extends AbAttr {
  private chanceMultiplier: number;

  constructor(chanceMultiplier: number) {
    super(true);
    this.chanceMultiplier = chanceMultiplier;
  }
  /**
   * @param args [0]: {@linkcode Utils.NumberHolder} Move additional effect chance. Has to be higher than or equal to 0.
   *             [1]: {@linkcode Moves } Move used by the ability user.
   */
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    // Disable showAbility during getTargetBenefitScore
    this.showAbility = args[4];
    if ((args[0] as Utils.NumberHolder).value <= 0 || (args[1] as Move).id === Moves.ORDER_UP) {
      return false;
    }

    (args[0] as Utils.NumberHolder).value *= this.chanceMultiplier;
    (args[0] as Utils.NumberHolder).value = Math.min((args[0] as Utils.NumberHolder).value, 100);
    return true;

  }
}

/**
 * Sets incoming moves additional effect chance to zero, ignoring all effects from moves. ie. Shield Dust.
 * @extends PreDefendAbAttr
 * @see {@linkcode applyPreDefend}
 */
export class IgnoreMoveEffectsAbAttr extends PreDefendAbAttr {
  /**
   * @param args [0]: {@linkcode Utils.NumberHolder} Move additional effect chance.
   */
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
    //const power = args[0] as Utils.NumberHolder;
    return false;
  }
}

export class FieldPreventExplosiveMovesAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
    cancelled.value = true;
    return true;
  }
}

/**
 * Multiplies a BattleStat if the checked Pokemon lacks this ability.
 * If this ability cannot stack, a BooleanHolder can be used to prevent this from stacking.
 * @see {@link applyFieldBattleStatMultiplierAbAttrs}
 * @see {@link applyFieldBattleStat}
 * @see {@link Utils.BooleanHolder}
 */
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

  /**
   * applyFieldBattleStat: Tries to multiply a Pokemon's BattleStat
   * @param pokemon {@linkcode Pokemon} the Pokemon using this ability
   * @param passive {@linkcode boolean} unused
   * @param stat {@linkcode Stat} the type of the checked stat
   * @param statValue {@linkcode Utils.NumberHolder} the value of the checked stat
   * @param checkedPokemon {@linkcode Pokemon} the Pokemon this ability is targeting
   * @param hasApplied {@linkcode Utils.BooleanHolder} whether or not another multiplier has been applied to this stat
   * @param args {any[]} unused
   * @returns true if this changed the checked stat, false otherwise.
   */
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

  // TODO: Decouple this into two attributes (type change / power boost)
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
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

/** Ability attribute for changing a pokemon's type before using a move */
export class PokemonTypeChangeAbAttr extends PreAttackAbAttr {
  private moveType: Type;

  constructor() {
    super(true);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (
      !pokemon.isTerastallized() &&
      move.id !== Moves.STRUGGLE &&
      /**
       * Skip moves that call other moves because these moves generate a following move that will trigger this ability attribute
       * @see {@link https://bulbapedia.bulbagarden.net/wiki/Category:Moves_that_call_other_moves}
       */
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

/**
 * Class for abilities that convert single-strike moves to two-strike moves (i.e. Parental Bond).
 * @param damageMultiplier the damage multiplier for the second strike, relative to the first.
 */
export class AddSecondStrikeAbAttr extends PreAttackAbAttr {
  private damageMultiplier: number;

  constructor(damageMultiplier: number) {
    super(false);

    this.damageMultiplier = damageMultiplier;
  }

  /**
   * Determines whether this attribute can apply to a given move.
   * @param {Move} move the move to which this attribute may apply
   * @param numTargets the number of {@linkcode Pokemon} targeted by this move
   * @returns true if the attribute can apply to the move, false otherwise
   */
  canApplyPreAttack(move: Move, numTargets: integer): boolean {
    /**
     * Parental Bond cannot apply to multi-hit moves, charging moves, or
     * moves that cause the user to faint.
     */
    const exceptAttrs: Constructor<MoveAttr>[] = [
      MultiHitAttr,
      ChargeAttr,
      SacrificialAttr,
      SacrificialAttrOnHit
    ];

    /** Parental Bond cannot apply to these specific moves */
    const exceptMoves: Moves[] = [
      Moves.FLING,
      Moves.UPROAR,
      Moves.ROLLOUT,
      Moves.ICE_BALL,
      Moves.ENDEAVOR
    ];

    /** Also check if this move is an Attack move and if it's only targeting one Pokemon */
    return numTargets === 1
      && !exceptAttrs.some(attr => move.hasAttr(attr))
      && !exceptMoves.some(id => move.id === id)
      && move.category !== MoveCategory.STATUS;
  }

  /**
   * If conditions are met, this doubles the move's hit count (via args[1])
   * or multiplies the damage of secondary strikes (via args[2])
   * @param {Pokemon} pokemon the Pokemon using the move
   * @param passive n/a
   * @param defender n/a
   * @param {Move} move the move used by the ability source
   * @param args\[0\] the number of Pokemon this move is targeting
   * @param {Utils.IntegerHolder} args\[1\] the number of strikes with this move
   * @param {Utils.NumberHolder} args\[2\] the damage multiplier for the current strike
   * @returns
   */
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

/**
 * Class for abilities that boost the damage of moves
 * For abilities that boost the base power of moves, see VariableMovePowerAbAttr
 * @param damageMultiplier the amount to multiply the damage by
 * @param condition the condition for this ability to be applied
 */
export class DamageBoostAbAttr extends PreAttackAbAttr {
  private damageMultiplier: number;
  private condition: PokemonAttackCondition;

  constructor(damageMultiplier: number, condition: PokemonAttackCondition) {
    super(true);
    this.damageMultiplier = damageMultiplier;
    this.condition = condition;
  }

  /**
   *
   * @param pokemon the attacker pokemon
   * @param passive N/A
   * @param defender the target pokemon
   * @param move the move used by the attacker pokemon
   * @param args Utils.NumberHolder as damage
   * @returns true if the function succeeds
   */
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


export class MoveTypePowerBoostAbAttr extends MovePowerBoostAbAttr {
  constructor(boostedType: Type, powerMultiplier?: number) {
    super((pokemon, defender, move) => move.type === boostedType || boostedType == Type.ALL, powerMultiplier || 1.5);
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

/**
 * Abilities which cause a variable amount of power increase.
 * @extends VariableMovePowerAbAttr
 * @see {@link applyPreAttack}
 */
export class VariableMovePowerBoostAbAttr extends VariableMovePowerAbAttr {
  private mult: (user: Pokemon, target: Pokemon, move: Move) => number;

  /**
   * @param mult A function which takes the user, target, and move, and returns the power multiplier. 1 means no multiplier.
   * @param {boolean} showAbility Whether to show the ability when it activates.
   */
  constructor(mult: (user: Pokemon, target: Pokemon, move: Move) => number, showAbility: boolean = true) {
    super(showAbility);
    this.mult = mult;
  }

  /**
   * @override
   */
  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move, args: any[]): boolean {
    const multiplier = this.mult(pokemon, defender, move);
    if (multiplier !== 1) {
      (args[0] as Utils.NumberHolder).value *= multiplier;
      return true;
    }

    return false;
  }
}

/**
 * Boosts the power of a Pokémon's move under certain conditions.
 * @extends AbAttr
 */
export class FieldMovePowerBoostAbAttr extends AbAttr {
  private condition: PokemonAttackCondition;
  private powerMultiplier: number;

  /**
   * @param condition - A function that determines whether the power boost condition is met.
   * @param powerMultiplier - The multiplier to apply to the move's power when the condition is met.
   */
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

/**
 * Boosts the power of a specific type of move.
 * @extends FieldMovePowerBoostAbAttr
 */
export class PreAttackFieldMoveTypePowerBoostAbAttr extends FieldMovePowerBoostAbAttr {
  /**
   * @param boostedType - The type of move that will receive the power boost.
   * @param powerMultiplier - The multiplier to apply to the move's power, defaults to 1.5 if not provided.
   */
  constructor(boostedType: Type, powerMultiplier?: number) {
    super((pokemon, defender, move) => move.type === boostedType, powerMultiplier || 1.5);
  }
}

/**
 * Boosts the power of a specific type of move for all Pokemon in the field.
 * @extends PreAttackFieldMoveTypePowerBoostAbAttr
 */
export class FieldMoveTypePowerBoostAbAttr extends PreAttackFieldMoveTypePowerBoostAbAttr { }

/**
 * Boosts the power of a specific type of move for the user and its allies.
 * @extends PreAttackFieldMoveTypePowerBoostAbAttr
 */
export class UserFieldMoveTypePowerBoostAbAttr extends PreAttackFieldMoveTypePowerBoostAbAttr { }

/**
 * Boosts the power of moves in specified categories.
 * @extends FieldMovePowerBoostAbAttr
 */
export class AllyMoveCategoryPowerBoostAbAttr extends FieldMovePowerBoostAbAttr {
  /**
   * @param boostedCategories - The categories of moves that will receive the power boost.
   * @param powerMultiplier - The multiplier to apply to the move's power.
   */
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

export class PostAttackAbAttr extends AbAttr {
  private attackCondition: PokemonAttackCondition;

  /** The default attackCondition requires that the selected move is a damaging move */
  constructor(attackCondition: PokemonAttackCondition = (user, target, move) => (move.category !== MoveCategory.STATUS)) {
    super();

    this.attackCondition = attackCondition;
  }

  /**
   * Please override {@link applyPostAttackAfterMoveTypeCheck} instead of this method. By default, this method checks that the move used is a damaging attack before
   * applying the effect of any inherited class. This can be changed by providing a different {@link attackCondition} to the constructor. See {@link ConfusionOnStatusEffectAbAttr}
   * for an example of an effect that does not require a damaging move.
   */
  applyPostAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    // When attackRequired is true, we require the move to be an attack move and to deal damage before checking secondary requirements.
    // If attackRequired is false, we always defer to the secondary requirements.
    if (this.attackCondition(pokemon, defender, move)) {
      return this.applyPostAttackAfterMoveTypeCheck(pokemon, passive, simulated, defender, move, hitResult, args);
    } else {
    return false;
  }
}

  /**
   * This method is only called after {@link applyPostAttack} has already been applied. Use this for handling checks specific to the ability in question.
   */
  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, hitResult: HitResult | null, args: any[]): boolean | Promise<boolean> {
    return false;
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
      if (!simulated && pokemon != defender && hitResult < HitResult.NO_EFFECT && (!this.stealCondition || attackConditionMet(this.stealCondition, pokemon, defender, move))) {
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
    /**Status inflicted by abilities post attacking are also considered additional effects.*/
    if (!attacker.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr) && !simulated && pokemon !== attacker && (!this.contactRequired || move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) && pokemon.randSeedInt(100) < this.chance && !pokemon.status) {
      const effect = this.effects.length === 1 ? this.effects[0] : this.effects[pokemon.randSeedInt(this.effects.length)];
      return attacker.trySetStatus(effect, true, pokemon);
    }

    return simulated;
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

  applyPostAttackAfterMoveTypeCheck(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    /**Battler tags inflicted by abilities post attacking are also considered additional effects.*/
    if (!attacker.hasAbilityWithAttr(IgnoreMoveEffectsAbAttr) && pokemon !== attacker && (!this.contactRequired || move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) && pokemon.randSeedInt(100) < this.chance(attacker, pokemon, move) && !pokemon.status) {
      const effect = this.effects.length === 1 ? this.effects[0] : this.effects[pokemon.randSeedInt(this.effects.length)];
      return simulated || attacker.addTag(effect);
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
      if (!simulated && hitResult < HitResult.NO_EFFECT && (!this.condition || this.condition(pokemon, attacker, move))) {
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

export class PrimaryTypeChangeAbAttr extends MoveTypeChangeAbAttr {
  constructor(powerMultiplier: number) {
    // Pass null as initial type - we'll determine it in the condition
    super(
        Type.NORMAL, // Initial type (will be overridden)
        powerMultiplier,
        (user, target, move) => {
          if (move.type === Type.NORMAL &&
              !move.hasAttr(VariableMoveTypeAttr) &&
              user?.getTypes().length > 0) {
            // Update the newType property with the user's primary type
            this.newType = user.getTypes()[0];
            return true;
          }
          return false;
        }
    );
  }

  // Override applyPreAttack to ensure proper type handling
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
/**
 * Ignores opponent's evasion stat changes when determining if a move hits or not
 * @extends AbAttr
 * @see {@linkcode apply}
 */
export class IgnoreOpponentEvasionAbAttr extends AbAttr {
  constructor() {
    super(false);
  }
  /**
   * Checks if enemy Pokemon is trapped by an Arena Trap-esque ability
   * @param pokemon N/A
   * @param passive N/A
   * @param cancelled N/A
   * @param args [0] {@linkcode Utils.IntegerHolder} of BattleStat.EVA
   * @returns if evasion level was successfully considered as 0
   */
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

/**
 * Base class for defining all {@linkcode Ability} Attributes post summon
 * @see {@linkcode applyPostSummon()}
 */
export class PostSummonAbAttr extends AbAttr {
  /**
   * Applies ability post summon (after switching in)
   * @param pokemon {@linkcode Pokemon} with this ability
   * @param passive Whether this ability is a passive
   * @param args Set of unique arguments needed by this attribute
   * @returns true if application of the ability succeeds
   */
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}
/**
 * Removes specified arena tags when a Pokemon is summoned.
 */
export class PostSummonRemoveArenaTagAbAttr extends PostSummonAbAttr {
  private arenaTags: ArenaTagType[];

  /**
   * @param arenaTags {@linkcode ArenaTagType[]} - the arena tags to be removed
   */
  constructor(arenaTags: ArenaTagType[]) {
    super(true);

    this.arenaTags = arenaTags;
  }

  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    if (!simulated) {
    for (const arenaTag of this.arenaTags) {
      pokemon.scene.arena.removeTag(arenaTag);
    }
    }
    return true;
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
  //Attr doesn't force pokemon name on the message
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

    queueShowAbility(pokemon, passive);  // TODO: Better solution than manually showing the ability here
    if (this.selfTarget) {
      // we unshift the StatChangePhase to put it right after the showAbility and not at the end of the
      // phase list (which could be after CommandPhase for example)
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

/**
 * Resets an ally's temporary stat boots to zero with no regard to
 * whether this is a positive or negative change
 * @param pokemon The {@link Pokemon} with this {@link AbAttr}
 * @param passive N/A
 * @param args N/A
 * @returns if the move was successful
 */
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

/**
 * Download raises either the Attack stat or Special Attack stat by one stage depending on the foe's currently lowest defensive stat:
 * it will raise Attack if the foe's current Defense is lower than its current Special Defense stat;
 * otherwise, it will raise Special Attack.
 * @extends PostSummonAbAttr
 * @see {applyPostSummon}
 */
export class DownloadAbAttr extends PostSummonAbAttr {
  private enemyDef: integer;
  private enemySpDef: integer;
  private enemyCountTally: integer;
  private stats: BattleStat[];

  // TODO: Implement the Substitute feature(s) once move is implemented.
  /**
   * Checks to see if it is the opening turn (starting a new game), if so, Download won't work. This is because Download takes into account
   * vitamins and items, so it needs to use the BattleStat and the stat alone.
   * @param {Pokemon} pokemon Pokemon that is using the move, as well as seeing the opposing pokemon.
   * @param {boolean} passive N/A
   * @param {any[]} args N/A
   * @returns Returns true if ability is used successful, false if not.
   */
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

    if (this.enemyDef > 0 && this.enemySpDef > 0) { // only activate if there's actually an enemy to download from
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

/** Attempts to copy a pokemon's ability */
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
      // Wonder Guard is normally uncopiable so has the attribute, but Trace specifically can copy it
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

/**
 * Removes supplied status effects from the user's field.
 */
export class PostSummonUserFieldRemoveStatusEffectAbAttr extends PostSummonAbAttr {
  private statusEffect: StatusEffect[];

  /**
   * @param statusEffect - The status effects to be removed from the user's field.
   */
  constructor(...statusEffect: StatusEffect[]) {
    super(false);

    this.statusEffect = statusEffect;
  }

  /**
   * Removes supplied status effect from the user's field when user of the ability is summoned.
   *
   * @param pokemon - The Pokémon that triggered the ability.
   * @param passive - n/a
   * @param args - n/a
   * @returns A boolean or a promise that resolves to a boolean indicating the result of the ability application.
   */
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


/** Attempt to copy the stat changes on an ally pokemon */
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

    target = target!; // compiler doesn't know its guranteed to be defined
    pokemon.summonData.speciesForm = target.getSpeciesForm();
    pokemon.summonData.fusionSpeciesForm = target.getFusionSpeciesForm();
    pokemon.summonData.ability = target.getAbility().id;
    pokemon.summonData.gender = target.getGender();
    pokemon.summonData.fusionGender = target.getFusionGender();
    pokemon.summonData.stats = [ pokemon.stats[Stat.HP] ].concat(target.stats.slice(1));
    pokemon.summonData.battleStats = target.summonData.battleStats.slice(0);
    pokemon.summonData.moveset = target.getMoveset().map(m => new PokemonMove(m!.moveId, m!.ppUsed, m!.ppUp)); // TODO: are those bangs correct?
    pokemon.summonData.types = target.getTypes();

    pokemon.scene.playSound("battle_anims/PRSFX- Transform");

    pokemon.loadAssets(false).then(() => pokemon.playAnim());

    pokemon.scene.queueMessage(i18next.t("abilityTriggers:postSummonTransform", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), targetName: target.name, }));

    return true;
  }
}

/**
 * Reverts weather-based forms to their normal forms when the user is summoned.
 * Used by Cloud Nine and Air Lock.
 * @extends PostSummonAbAttr
 */
export class PostSummonWeatherSuppressedFormChangeAbAttr extends PostSummonAbAttr {
  /**
   * Triggers {@linkcode Arena.triggerWeatherBasedFormChangesToNormal | triggerWeatherBasedFormChangesToNormal}
   * @param {Pokemon} pokemon the Pokemon with this ability
   * @param passive n/a
   * @param args n/a
   * @returns whether a Pokemon was reverted to its normal form
   */
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

/**
 * Triggers weather-based form change when summoned into an active weather.
 * Used by Forecast.
 * @extends PostSummonAbAttr
 */
export class PostSummonFormChangeByWeatherAbAttr extends PostSummonAbAttr {
  private ability: Abilities;

  constructor(ability: Abilities) {
    super(false);

    this.ability = ability;
  }

  /**
   * Calls the {@linkcode BattleScene.triggerPokemonFormChange | triggerPokemonFormChange} for both
   * {@linkcode SpeciesFormChange.SpeciesFormChangeWeatherTrigger | SpeciesFormChangeWeatherTrigger} and
   * {@linkcode SpeciesFormChange.SpeciesFormChangeWeatherTrigger | SpeciesFormChangeRevertWeatherFormTrigger} if it
   * is the specific Pokemon and ability
   * @param {Pokemon} pokemon the Pokemon with this ability
   * @param passive n/a
   * @param args n/a
   * @returns whether the form change was triggered
   */
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

  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
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

/**
 * Clears Desolate Land/Primordial Sea/Delta Stream upon the Pokemon switching out.
 */
export class PreSwitchOutClearWeatherAbAttr extends PreSwitchOutAbAttr {

  /**
   * @param pokemon The {@linkcode Pokemon} with the ability
   * @param passive N/A
   * @param args N/A
   * @returns {boolean} Returns true if the weather clears, otherwise false.
   */
  applyPreSwitchOut(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean | Promise<boolean> {
    const weatherType = pokemon.scene.arena.weather?.weatherType;
    let turnOffWeather = false;

    // Clear weather only if user's ability matches the weather and no other pokemon has the ability.
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

/**
 * Attribute for form changes that occur on switching out
 * @extends PreSwitchOutAbAttr
 * @see {@linkcode applyPreSwitchOut}
 */
export class PreSwitchOutFormChangeAbAttr extends PreSwitchOutAbAttr {
  private formFunc: (p: Pokemon) => integer;

  constructor(formFunc: ((p: Pokemon) => integer)) {
    super();

    this.formFunc = formFunc;
  }

  /**
   * On switch out, trigger the form change to the one defined in the ability
   * @param pokemon The pokemon switching out and changing form {@linkcode Pokemon}
   * @param passive N/A
   * @param args N/A
   * @returns true if the form change was successful
   */
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

/**
 * This attribute applies confusion to the target whenever the user
 * directly poisons them with a move, e.g. Poison Puppeteer.
 * Called in {@linkcode StatusEffectAttr}.
 * @extends PostAttackAbAttr
 * @see {@linkcode applyPostAttack}
 */
export class ConfusionOnStatusEffectAbAttr extends PostAttackAbAttr {
  /** List of effects to apply confusion after */
  private effects: StatusEffect[];

  constructor(...effects: StatusEffect[]) {
    /** This effect does not require a damaging move */
    super((user, target, move) => true);
    this.effects = effects;
  }
  /**
   * Applies confusion to the target pokemon.
   * @param pokemon {@link Pokemon} attacking
   * @param passive N/A
   * @param defender {@link Pokemon} defending
   * @param move {@link Move} used to apply status effect and confusion
   * @param hitResult N/A
   * @param args [0] {@linkcode StatusEffect} applied by move
   * @returns true if defender is confused
   */
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

/**
 * Provides immunity to status effects to specified targets.
 */
export class PreSetStatusEffectImmunityAbAttr extends PreSetStatusAbAttr {
  private immuneEffects: StatusEffect[];

  /**
   * @param immuneEffects - The status effects to which the Pokémon is immune.
   */
  constructor(...immuneEffects: StatusEffect[]) {
    super();

    this.immuneEffects = immuneEffects;
  }

  /**
   * Applies immunity to supplied status effects.
   *
   * @param pokemon - The Pokémon to which the status is being applied.
   * @param passive - n/a
   * @param effect - The status effect being applied.
   * @param cancelled - A holder for a boolean value indicating if the status application was cancelled.
   * @param args - n/a
   * @returns A boolean indicating the result of the status application.
   */
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

/**
 * Provides immunity to status effects to the user.
 * @extends PreSetStatusEffectImmunityAbAttr
 */
export class StatusEffectImmunityAbAttr extends PreSetStatusEffectImmunityAbAttr { }

/**
 * Provides immunity to status effects to the user's field.
 * @extends PreSetStatusEffectImmunityAbAttr
 */
export class UserFieldStatusEffectImmunityAbAttr extends PreSetStatusEffectImmunityAbAttr { }

export class PreApplyBattlerTagAbAttr extends AbAttr {
  applyPreApplyBattlerTag(pokemon: Pokemon, passive: boolean, simulated: boolean, tag: BattlerTag, cancelled: Utils.BooleanHolder, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

/**
 * Provides immunity to BattlerTags {@linkcode BattlerTag} to specified targets.
 */
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

/**
 * Provides immunity to BattlerTags {@linkcode BattlerTag} to the user.
 * @extends PreApplyBattlerTagImmunityAbAttr
 */
export class BattlerTagImmunityAbAttr extends PreApplyBattlerTagImmunityAbAttr { }

/**
 * Provides immunity to BattlerTags {@linkcode BattlerTag} to the user's field.
 * @extends PreApplyBattlerTagImmunityAbAttr
 */
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

/**
 * Guarantees a critical hit according to the given condition, except if target prevents critical hits. ie. Merciless
 * @extends AbAttr
 * @see {@linkcode apply}
 */
export class ConditionalCritAbAttr extends AbAttr {
  private condition: PokemonAttackCondition;

  constructor(condition: PokemonAttackCondition, checkUser?: Boolean) {
    super();

    this.condition = condition;
  }

  /**
   * @param pokemon {@linkcode Pokemon} user.
   * @param args [0] {@linkcode Utils.BooleanHolder} If true critical hit is guaranteed.
   *             [1] {@linkcode Pokemon} Target.
   *             [2] {@linkcode Move} used by ability user.
   */
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const target = (args[1] as Pokemon);
    const move = (args[2] as Move);
    if (!this.condition(pokemon,target,move)) {
      return false;
    }

    (args[0] as Utils.BooleanHolder).value = true;
    return true;
  }
}

export class BlockNonDirectDamageAbAttr extends AbAttr {
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    cancelled.value = true;
    return true;
  }
}

/**
 * This attribute will block any status damage that you put in the parameter.
 */
export class BlockStatusDamageAbAttr extends AbAttr {
  private effects: StatusEffect[];

  /**
   * @param {StatusEffect[]} effects The status effect(s) that will be blocked from damaging the ability pokemon
   */
  constructor(...effects: StatusEffect[]) {
    super(false);

    this.effects = effects;
  }

  /**
   * @param {Pokemon} pokemon The pokemon with the ability
   * @param {boolean} passive N/A
   * @param {Utils.BooleanHolder} cancelled Whether to cancel the status damage
   * @param {any[]} args N/A
   * @returns Returns true if status damage is blocked
   */
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

/**
 * This governs abilities that alter the priority of moves
 * Abilities: Prankster, Gale Wings, Triage, Mycelium Might, Stall
 * Note - Quick Claw has a separate and distinct implementation outside of priority
 */
export class ChangeMovePriorityAbAttr extends AbAttr {
  private moveFunc: (pokemon: Pokemon, move: Move) => boolean;
  private changeAmount: number;

  /**
   * @param {(pokemon, move) => boolean} moveFunc applies priority-change to moves within a provided category
   * @param {number} changeAmount the amount of priority added or subtracted
   */
  constructor(moveFunc: (pokemon: Pokemon, move: Move) => boolean, changeAmount: number) {
    super(true);

    this.moveFunc = moveFunc;
    this.changeAmount = changeAmount;
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    if (!this.moveFunc(pokemon, args[0] as Move)) {
      return false;
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

/**
 * Condition function to applied to abilities related to Sheer Force.
 * Checks if last move used against target was affected by a Sheer Force user and:
 * Disables: Color Change, Pickpocket, Wimp Out, Emergency Exit, Berserk, Anger Shell
 * @returns {AbAttrCondition} If false disables the ability which the condition is applied to.
 */
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

    /**if the last move chance is greater than or equal to cero, and the last attacker's ability is sheer force*/
    const SheerForceAffected = allMoves[lastReceivedAttack.move].chance >= 0 && lastAttacker.hasAbility(Abilities.SHEER_FORCE);

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
        // ignore null/undefined moves
        if (!move) {
          continue;
        }
        // the move's base type (not accounting for variable type changes) is super effective
        if (move.getMove() instanceof AttackMove && pokemon.getAttackTypeEffectiveness(move.getMove().type, opponent, true) >= 2) {
          return true;
        }
        // move is a OHKO
        if (move.getMove().hasAttr(OneHitKOAttr)) {
          return true;
        }
        // edge case for hidden power, type is computed
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

/**
 * Creates an ability condition that causes the ability to fail if that ability
 * has already been used by that pokemon that battle. It requires an ability to
 * be specified due to current limitations in how conditions on abilities work.
 * @param {Abilities} ability The ability to check if it's already been applied
 * @returns {AbAttrCondition} The condition
 */
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
          movePower = move!.getMove().power; // TODO: is this bang correct?
        }

        if (movePower > maxPowerSeen) {
          maxPowerSeen = movePower;
          maxMove = move!.getName(); // TODO: is this bang correct?
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

/**
 * Triggers weather-based form change when weather changes.
 * Used by Forecast.
 * @extends PostWeatherChangeAbAttr
 */
export class PostWeatherChangeFormChangeAbAttr extends PostWeatherChangeAbAttr {
  private ability: Abilities;

  constructor(ability: Abilities) {
    super(false);

    this.ability = ability;
  }

  /**
   * Calls {@linkcode Arena.triggerWeatherBasedFormChangesToNormal | triggerWeatherBasedFormChangesToNormal} when the
   * weather changed to form-reverting weather, otherwise calls {@linkcode Arena.triggerWeatherBasedFormChanges | triggerWeatherBasedFormChanges}
   * @param {Pokemon} pokemon the Pokemon that changed the weather
   * @param passive n/a
   * @param weather n/a
   * @param args n/a
   * @returns whether the form change was triggered
   */
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

/**
 * This attribute will heal 1/8th HP if the ability pokemon has the correct status.
 */
export class PostTurnStatusHealAbAttr extends PostTurnAbAttr {
  private effects: StatusEffect[];

  /**
   * @param {StatusEffect[]} effects The status effect(s) that will qualify healing the ability pokemon
   */
  constructor(...effects: StatusEffect[]) {
    super(false);

    this.effects = effects;
  }

  /**
   * @param {Pokemon} pokemon The pokemon with the ability that will receive the healing
   * @param {Boolean} passive N/A
   * @param {any[]} args N/A
   * @returns Returns true if healed from status, false if not
   */
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

/**
 * After the turn ends, resets the status of either the ability holder or their ally
 * @param {boolean} allyTarget Whether to target ally, defaults to false (self-target)
 */
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

/**
 * After the turn ends, try to create an extra item
 */
export class PostTurnLootAbAttr extends PostTurnAbAttr {
  /**
   * @param itemType - The type of item to create
   * @param procChance - Chance to create an item
   * @see {@linkcode applyPostTurn()}
   */
  constructor(
    /** Extend itemType to add more options */
    private itemType: "EATEN_BERRIES" | "HELD_BERRIES",
    private procChance: (pokemon: Pokemon) => number
  ) {
    super();
  }

  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const pass = Phaser.Math.RND.realInRange(0, 1);
    // Clamp procChance to [0, 1]. Skip if didn't proc (less than pass)
    if (Math.max(Math.min(this.procChance(pokemon), 1), 0) < pass) {
      return false;
    }

    if (this.itemType === "EATEN_BERRIES") {
      return this.createEatenBerry(pokemon, simulated);
    } else {
      return false;
    }
  }

  /**
   * Create a new berry chosen randomly from the berries the pokemon ate this battle
   * @param pokemon The pokemon with this ability
   * @param simulated whether the associated ability call is simulated
   * @returns whether a new berry was created
   */
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
    berriesEaten.splice(randomIdx); // Remove berry from memory

    const berryModifier = pokemon.scene.findModifier(
      (m) => m instanceof BerryModifier && m.berryType === chosenBerryType,
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

/**
 * Attribute used for {@linkcode Abilities.MOODY}
 */
export class MoodyAbAttr extends PostTurnAbAttr {
  constructor() {
    super(true);
  }
  /**
   * Randomly increases one BattleStat by 2 stages and decreases a different BattleStat by 1 stage
   * @param {Pokemon} pokemon Pokemon that has this ability
   * @param passive N/A
   * @param simulated true if applying in a simulated call.
   * @param args N/A
   * @returns true
   *
   * Any BattleStats at +6 or -6 are excluded from being increased or decreased, respectively
   * If the pokemon already has all BattleStats raised to stage 6, it will only decrease one BattleStat by 1 stage
   * If the pokemon already has all BattleStats lowered to stage -6, it will only increase one BattleStat by 2 stages
   */
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
    if (!simulated) {
      const target = this.selfTarget ? pokemon : pokemon.getOpponents()[0];
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, target.getBattlerIndex(), this.selfTarget, this.stats, this.levels));
      return true;
    }
    return false;
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


/**
 * Attribute used for abilities (Bad Dreams) that damages the opponents for being asleep
 */
export class PostTurnHurtIfSleepingAbAttr extends PostTurnAbAttr {

  /**
   * Deals damage to all sleeping opponents equal to 1/8 of their max hp (min 1)
   * @param {Pokemon} pokemon Pokemon that has this ability
   * @param {boolean} passive N/A
   * @param {boolean} simulated true if applying in a simulated call.
   * @param {any[]} args N/A
   * @returns {boolean} true if any opponents are sleeping
   */
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


/**
 * Grabs the last failed Pokeball used
 * @extends PostTurnAbAttr
 * @see {@linkcode applyPostTurn} */
export class FetchBallAbAttr extends PostTurnAbAttr {
  constructor() {
    super();
  }
  /**
   * Adds the last used Pokeball back into the player's inventory
   * @param pokemon {@linkcode Pokemon} with this ability
   * @param passive N/A
   * @param args N/A
   * @returns true if player has used a pokeball and this pokemon is owned by the player
   */
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

/**
 * Triggers just after a move is used either by the opponent or the player
 * @extends AbAttr
 */
export class PostMoveUsedAbAttr extends AbAttr {
  applyPostMoveUsed(pokemon: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    return false;
  }
}

/**
 * Triggers after a dance move is used either by the opponent or the player
 * @extends PostMoveUsedAbAttr
 */
export class PostDancingMoveAbAttr extends PostMoveUsedAbAttr {
  /**
   * Resolves the Dancer ability by replicating the move used by the source of the dance
   * either on the source itself or on the target of the dance
   * @param dancer {@linkcode Pokemon} with Dancer ability
   * @param move {@linkcode PokemonMove} Dancing move used by the source
   * @param source {@linkcode Pokemon} that used the dancing move
   * @param targets {@linkcode BattlerIndex}Targets of the dancing move
   * @param args N/A
   *
   * @return true if the Dancer ability was resolved
   */
  applyPostMoveUsed(dancer: Pokemon, move: PokemonMove, source: Pokemon, targets: BattlerIndex[], simulated: boolean, args: any[]): boolean | Promise<boolean> {
    // List of tags that prevent the Dancer from replicating the move
    const forbiddenTags = [BattlerTagType.FLYING, BattlerTagType.UNDERWATER,
      BattlerTagType.UNDERGROUND, BattlerTagType.HIDDEN];
    // The move to replicate cannot come from the Dancer
    if (source.getBattlerIndex() !== dancer.getBattlerIndex()
        && !dancer.summonData.tags.some(tag => forbiddenTags.includes(tag.tagType))) {
      if (!simulated) {
      // If the move is an AttackMove or a StatusMove the Dancer must replicate the move on the source of the Dance
      if (move.getMove() instanceof AttackMove || move.getMove() instanceof StatusMove) {
        const target = this.getTarget(dancer, source, targets);
        dancer.scene.unshiftPhase(new MovePhase(dancer.scene, dancer, target, move, true));
      } else if (move.getMove() instanceof SelfStatusMove) {
        // If the move is a SelfStatusMove (ie. Swords Dance) the Dancer should replicate it on itself
        dancer.scene.unshiftPhase(new MovePhase(dancer.scene, dancer, [dancer.getBattlerIndex()], move, true));
      }
      }
    return true;
  }
    return false;
  }

  /**
   * Get the correct targets of Dancer ability
   *
   * @param dancer {@linkcode Pokemon} Pokemon with Dancer ability
   * @param source {@linkcode Pokemon} Source of the dancing move
   * @param targets {@linkcode BattlerIndex} Targets of the dancing move
   */
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

/**
 * Causes Pokemon to take reduced damage from the {@linkcode StatusEffect.BURN | Burn} status
 * @param multiplier Multiplied with the damage taken
*/
export class ReduceBurnDamageAbAttr extends AbAttr {
  constructor(protected multiplier: number) {
    super(false);
  }

  /**
   * Applies the damage reduction
   * @param pokemon N/A
   * @param passive N/A
   * @param cancelled N/A
   * @param args `[0]` {@linkcode Utils.NumberHolder} The damage value being modified
   * @returns `true`
   */
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

/**
 * A Pokemon with this ability heals by a percentage of their maximum hp after eating a berry
 * @param healPercent - Percent of Max HP to heal
 * @see {@linkcode apply()} for implementation
 */
export class HealFromBerryUseAbAttr extends AbAttr {
  /** Percent of Max HP to heal */
  private healPercent: number;

  constructor(healPercent: number) {
    super();

    // Clamp healPercent so its between [0,1].
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

/**
 * Base class for checking if a Pokemon is trapped by arena trap
 * @extends AbAttr
 * @field {@linkcode arenaTrapCondition} Conditional for trapping abilities.
 * For example, Magnet Pull will only activate if opponent is Steel type.
 * @see {@linkcode applyCheckTrapped}
 */
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

/**
 * Determines whether a Pokemon is blocked from switching/running away
 * because of a trapping ability or move.
 * @extends CheckTrappedAbAttr
 * @see {@linkcode applyCheckTrapped}
 */
export class ArenaTrapAbAttr extends CheckTrappedAbAttr {
  /**
   * Checks if enemy Pokemon is trapped by an Arena Trap-esque ability
   * If the enemy is a Ghost type, it is not trapped
   * If the enemy has the ability Run Away, it is not trapped.
   * If the user has Magnet Pull and the enemy is not a Steel type, it is not trapped.
   * If the user has Arena Trap and the enemy is not grounded, it is not trapped.
   * @param pokemon The {@link Pokemon} with this {@link AbAttr}
   * @param passive N/A
   * @param trapped {@link Utils.BooleanHolder} indicating whether the other Pokemon is trapped or not
   * @param otherPokemon The {@link Pokemon} that is affected by an Arena Trap ability
   * @param args N/A
   * @returns if enemy Pokemon is trapped or not
   */
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
      //@ts-ignore - TODO see below
      if (pokemon.scene.tryTransferHeldItemModifier(randItem, pokemon, true, 1, true)) { // TODO: fix. This is a promise!?
        postBattleLoot.splice(postBattleLoot.indexOf(randItem), 1);
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:postBattleLoot", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), itemName: randItem.type.name }));
        return true;
      }
    }

    return false;
  }
}

export class PostFaintAbAttr extends AbAttr {
  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    return false;
  }
}

/**
 * Used for weather suppressing abilities to trigger weather-based form changes upon being fainted.
 * Used by Cloud Nine and Air Lock.
 * @extends PostFaintAbAttr
 */
export class PostFaintUnsuppressedWeatherFormChangeAbAttr extends PostFaintAbAttr {
  /**
   * Triggers {@linkcode Arena.triggerWeatherBasedFormChanges | triggerWeatherBasedFormChanges}
   * when the user of the ability faints
   * @param {Pokemon} pokemon the fainted Pokemon
   * @param passive n/a
   * @param attacker n/a
   * @param move n/a
   * @param hitResult n/a
   * @param args n/a
   * @returns whether the form change was triggered
   */
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

/**
 * Clears Desolate Land/Primordial Sea/Delta Stream upon the Pokemon fainting
 */
export class PostFaintClearWeatherAbAttr extends PostFaintAbAttr {

  /**
   * @param pokemon The {@linkcode Pokemon} with the ability
   * @param passive N/A
   * @param attacker N/A
   * @param move N/A
   * @param hitResult N/A
   * @param args N/A
   * @returns {boolean} Returns true if the weather clears, otherwise false.
   */
  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    const weatherType = pokemon.scene.arena.weather?.weatherType;
    let turnOffWeather = false;

    // Clear weather only if user's ability matches the weather and no other pokemon has the ability.
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

/**
 * Attribute used for abilities (Innards Out) that damage the opponent based on how much HP the last attack used to knock out the owner of the ability.
 */
export class PostFaintHPDamageAbAttr extends PostFaintAbAttr {
  constructor() {
    super ();
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated) {
    const damage = pokemon.turnData.attacksReceived[0].damage;
    attacker.damageAndUpdate((damage), HitResult.OTHER);
    attacker.turnData.damageTaken += damage;
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
    return !![ MoveTarget.NEAR_OTHER, MoveTarget.OTHER ].find(t => move.moveTarget === t);
  }
}

export class RedirectTypeMoveAbAttr extends RedirectMoveAbAttr {
  public type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  canRedirect(moveId: Moves): boolean {
    return super.canRedirect(moveId) && allMoves[moveId].type === this.type;
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
  constructor() {
    super(false);
  }

  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const ability = (args[0] as Ability);
    if (!ability.hasAttr(UnsuppressableAbilityAbAttr) && !ability.hasAttr(SuppressFieldAbilitiesAbAttr)) {
      cancelled.value = true;
      return true;
    }
    return false;
  }
}


export class AlwaysHitAbAttr extends AbAttr { }

/** Attribute for abilities that allow moves that make contact to ignore protection (i.e. Unseen Fist) */
export class IgnoreProtectOnContactAbAttr extends AbAttr { }

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

/**
 * Ignores the type immunity to Status Effects of the defender if the defender is of a certain type
 */
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

/**
 * Gives money to the user after the battle.
 *
 * @extends PostBattleAbAttr
 * @see {@linkcode applyPostBattle}
 */
export class MoneyAbAttr extends PostBattleAbAttr {
  constructor() {
    super();
  }

  /**
   * @param pokemon {@linkcode Pokemon} that is the user of this ability.
   * @param passive N/A
   * @param args N/A
   * @returns true
   */
  applyPostBattle(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated) {
    pokemon.scene.currentBattle.moneyScattered += pokemon.scene.getWaveMoneyAmount(0.2);
    }
    return true;
  }
}

/**
 * Applies a stat change after a Pokémon is summoned,
 * conditioned on the presence of a specific arena tag.
 *
 * @extends {PostSummonStatChangeAbAttr}
 */
export class PostSummonStatChangeOnArenaAbAttr extends PostSummonStatChangeAbAttr {
  /**
   * The type of arena tag that conditions the stat change.
   * @private
   * @type {ArenaTagType}
   */
  private tagType: ArenaTagType;

  /**
   * Creates an instance of PostSummonStatChangeOnArenaAbAttr.
   * Initializes the stat change to increase Attack by 1 stage if the specified arena tag is present.
   *
   * @param {ArenaTagType} tagType - The type of arena tag to check for.
   */
  constructor(tagType: ArenaTagType) {
    super([BattleStat.ATK], 1, true, false);
    this.tagType = tagType;
  }

  /**
   * Applies the post-summon stat change if the specified arena tag is present on pokemon's side.
   * This is used in Wind Rider ability.
   *
   * @param {Pokemon} pokemon - The Pokémon being summoned.
   * @param {boolean} passive - Whether the effect is passive.
   * @param {any[]} args - Additional arguments.
   * @returns {boolean} - Returns true if the stat change was applied, otherwise false.
   */
  applyPostSummon(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    const side = pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

    if (pokemon.scene.arena.getTagOnSide(this.tagType, side)) {
      return super.applyPostSummon(pokemon, passive, simulated, args);
    }
    return false;
  }
}

/**
 * Takes no damage from the first hit of a damaging move.
 * This is used in the Disguise and Ice Face abilities.
 * @extends ReceivedMoveDamageMultiplierAbAttr
 */
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

  /**
   * Applies the pre-defense ability to the Pokémon.
   * Removes the appropriate `BattlerTagType` when hit by an attack and is in its defense form.
   *
   * @param {Pokemon} pokemon The Pokémon with the ability.
   * @param {boolean} passive n/a
   * @param {Pokemon} attacker The attacking Pokémon.
   * @param {PokemonMove} move The move being used.
   * @param {Utils.BooleanHolder} cancelled n/a
   * @param {any[]} args Additional arguments.
   * @returns {boolean} Whether the immunity was applied.
   */
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

  /**
   * Gets the message triggered when the Pokémon avoids damage using the form-changing ability.
   * @param {Pokemon} pokemon The Pokémon with the ability.
   * @param {string} abilityName The name of the ability.
   * @param {...any} args n/a
   * @returns {string} The trigger message.
   */
  getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
    return this.triggerMessageFunc(pokemon, abilityName);
  }
}

/**
 * If a Pokémon with this Ability selects a damaging move, it has a 30% chance of going first in its priority bracket. If the Ability activates, this is announced at the start of the turn (after move selection).
 *
 * @extends AbAttr
 */
export class BypassSpeedChanceAbAttr extends AbAttr {
  public chance: integer;

  /**
   * @param {integer} chance probability of ability being active.
   */
  constructor(chance: integer) {
    super(true);
    this.chance = chance;
  }

  /**
   * bypass move order in their priority bracket when pokemon choose damaging move
   * @param {Pokemon} pokemon {@linkcode Pokemon}  the Pokemon applying this ability
   * @param {boolean} passive N/A
   * @param {Utils.BooleanHolder} cancelled N/A
   * @param {any[]} args [0] {@linkcode Utils.BooleanHolder} set to true when the ability activated
   * @returns {boolean} - whether the ability was activated.
   */
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

/**
 * This attribute checks if a Pokemon's move meets a provided condition to determine if the Pokemon can use Quick Claw
 * It was created because Pokemon with the ability Mycelium Might cannot access Quick Claw's benefits when using status moves.
*/
export class PreventBypassSpeedChanceAbAttr extends AbAttr {
  private condition: ((pokemon: Pokemon, move: Move) => boolean);

  /**
   * @param {function} condition - checks if a move meets certain conditions
   */
  constructor(condition: (pokemon: Pokemon, move: Move) => boolean) {
    super(true);
    this.condition = condition;
    }

  /**
   * @argument {boolean} bypassSpeed - determines if a Pokemon is able to bypass speed at the moment
   * @argument {boolean} canCheckHeldItems - determines if a Pokemon has access to Quick Claw's effects or not
   */
  apply(pokemon: Pokemon, passive: boolean, simulated: boolean, cancelled: Utils.BooleanHolder, args: any[]): boolean {
    const bypassSpeed = args[0] as Utils.BooleanHolder;
    const canCheckHeldItems = args[1] as Utils.BooleanHolder;

    const turnCommand = pokemon.scene.currentBattle.turnCommands[pokemon.getBattlerIndex()];
    const isCommandFight = turnCommand?.command === Command.FIGHT;
    const move = turnCommand?.move?.move ? allMoves[turnCommand.move.move] : null;
    if (this.condition(pokemon, move!) && isCommandFight) {
      bypassSpeed.value = false;
      canCheckHeldItems.value = false;
      return false;
    }
    return true;
      }
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
    const partyAbilityModifiers = scene.gameData.getPermaModifiersByType(PermaType.PERMA_PARTY_ABILITY) as PermaPartyAbilityModifier[];
    abilitiesToCheck.push(...partyAbilityModifiers.map(mod => ({ability: mod.ability, passive: true, modifier: mod})));
  }

  for (const { ability, passive, modifier } of abilitiesToCheck) {
    if (!ability || (pokemon && !pokemon.canApplyAbility(modifier ? false : passive, modifier ? ability : undefined))) {
      continue;
    }

    for (const attr of ability.getAttrs(attrType)) {
      const condition = attr.getCondition();
      if (condition && !condition(pokemon)) {
        continue;
      }

      pokemon.partyAbility = ability;
      scene.setPhaseQueueSplice();

      let result = applyFunc(attr, passive);
      if (result instanceof Promise) {
        result = await result;
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
        }

        const message = attr.getTriggerMessage(pokemon, ability.name, args);
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
}

export function applyAbAttrs(attrType: Constructor<AbAttr>, pokemon: Pokemon, cancelled: Utils.BooleanHolder | null, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<AbAttr>(attrType, pokemon, (attr, passive) => attr.apply(pokemon, passive, simulated, cancelled, args), args, false, simulated);
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

export function applyBattleStatMultiplierAbAttrs(attrType: Constructor<BattleStatMultiplierAbAttr>,
  pokemon: Pokemon, battleStat: BattleStat, statValue: Utils.NumberHolder, simulated: boolean = false, ...args: any[]): Promise<void> {
  return applyAbAttrsInternal<BattleStatMultiplierAbAttr>(attrType, pokemon, (attr, passive) => attr.applyBattleStat(pokemon, passive, simulated, battleStat, statValue, args), args, false, simulated);
}

/**
 * Applies a field Battle Stat multiplier attribute
 * @param attrType {@linkcode FieldMultiplyBattleStatAbAttr} should always be FieldMultiplyBattleStatAbAttr for the time being
 * @param pokemon {@linkcode Pokemon} the Pokemon applying this ability
 * @param stat {@linkcode Stat} the type of the checked stat
 * @param statValue {@linkcode Utils.NumberHolder} the value of the checked stat
 * @param checkedPokemon {@linkcode Pokemon} the Pokemon with the checked stat
 * @param hasApplied {@linkcode Utils.BooleanHolder} whether or not a FieldMultiplyBattleStatAbAttr has already affected this stat
 * @param args unused
 */
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
  return applyAbAttrsInternal<PostAttackAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPostAttack(pokemon, passive, simulated, defender, move, hitResult, args), args, false, simulated);
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
  return applyAbAttrsInternal<PreSwitchOutAbAttr>(attrType, pokemon, (attr, passive) => attr.applyPreSwitchOut(pokemon, passive, simulated, args), args, true, simulated);
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

function canApplyAttr(pokemon: Pokemon, attr: AbAttr): boolean {
  const condition = attr.getCondition();
  return !condition || condition(pokemon);
}

function queueShowAbility(pokemon: Pokemon, passive: boolean, ability?: Ability): void {
  pokemon.scene.unshiftPhase(new ShowAbilityPhase(pokemon.scene, pokemon.id, passive, ability || pokemon.partyAbility));
  pokemon.scene.clearPhaseQueueSplice();
}

/**
 * Sets the ability of a Pokémon as revealed.
 *
 * @param pokemon - The Pokémon whose ability is being revealed.
 */
function setAbilityRevealed(pokemon: Pokemon): void {
  if (pokemon.battleData) {
    pokemon.battleData.abilityRevealed = true;
  }
}

/**
 * Returns the Pokemon with weather-based forms
 * @param {BattleScene} scene - The current scene
 */
function getPokemonWithWeatherBasedForms(scene: BattleScene) {
  return scene.getField(true).filter(p =>
      p.hasAbility(Abilities.FORECAST) && p.species.speciesId === Species.CASTFORM
  )
}


export function addTagToPokemonWithAbility(pokemon:Pokemon, tag:BattlerTagType, abilityUser:integer, moveId:Moves = Moves.NONE):void {
  pokemon.addTag(tag, randIntRange(2,5), moveId, abilityUser);
}

export function defendConditionMet(condition: PokemonDefendCondition | boolean | number, pokemon: Pokemon, attacker: Pokemon, move: Move): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  } else if (typeof condition === 'number') {
    return randSeedChance(condition);
  } else {
    return condition(pokemon, attacker, move);
  }
}
export function attackConditionMet(condition: PokemonAttackCondition | boolean | number, user: Pokemon, target: Pokemon, move: Move): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  } else if (typeof condition === 'number') {
    return randSeedChance(condition);
  } else {
    return condition(user, target, move);
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


// 2 types supereffective
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
    if (this.oneSidedSharing) {
      return move.type === this.type1 && this.checkTypeWeakness(this.type2, target.getTypes());
    } else {
      return (move.type === this.type1 && this.checkTypeWeakness(this.type2, target.getTypes())) ||
          (move.type === this.type2 && this.checkTypeWeakness(this.type1, target.getTypes()));
    }
  }
}

// fire / ice swap
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

    if (!simulated && highestStat > 0) { // only activate if there's actually an enemy to download from
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), false, this.stats, raiselevel));
      return true;
    }

    return false;
  }
}

export class MovePowerNeutralAbAttr extends MovePowerBoostAbAttr {
  constructor(condition: PokemonAttackCondition) {
    super(condition, 1); // Initialize with a neutral multiplier which will be adjusted dynamically
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
    super(condition, 1); // Initialize with a neutral multiplier which will be adjusted dynamically
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
    super((target, user, move) => true, 1); // Initialize with a neutral multiplier
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
    this.damageRatio = damageRatio; // Ratio of attacker's max HP to be taken as damage
    this.healFraction = healFraction; // Fraction of defender's max HP to be healed
  }

  applyPostDefend(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && move.checkFlag(MoveFlags.MAKES_CONTACT, attacker, pokemon)) {
      // Damage the attacker
      const damage = Math.ceil(attacker.getMaxHp() * this.damageRatio);
      attacker.damageAndUpdate(damage, HitResult.OTHER);
      attacker.turnData.damageTaken += damage;

      // Heal the defending Pokémon
      if (pokemon.getHpRatio() < 1) {
        const healAmount = Math.max(Math.floor(pokemon.getMaxHp() * this.healFraction), 1);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:toreAttacker", { abilityName: pokemon.getAbility().name })), true));
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
    if (!simulated && pokemon !== target && attackConditionMet(this.chance, pokemon, target, move) && (!this.contactRequired || move.checkFlag(MoveFlags.MAKES_CONTACT, pokemon, target))) {
        const selectedTag = this.tags[Utils.randSeedInt(this.tags.length)];
        addTagToPokemonWithAbility(target, selectedTag,pokemon.id, move.id);
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
    if (!simulated && target != pokemon && (this.typeTrigger == Type.ALL || move.type === this.typeTrigger) && Utils.randSeedInt(100, 1) <= this.chance) {
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
    this.condition = condition;
  }

  applyPostFaint(pokemon: Pokemon, passive: boolean, simulated: boolean, attacker: Pokemon, move: Move, hitResult: HitResult, args: any[]): boolean {
    if (!simulated && this.condition(pokemon, attacker)) {
      const tag = this.tags[pokemon.randSeedInt(this.tags.length)];
      addTagToPokemonWithAbility(attacker, tag, pokemon.id,  move.id);
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
    const moveType = move.type;
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
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:ateGrass", { abilityName: pokemon.getAbility().name })), true));
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

// low hp stat boost
// export class LowHpDefenseBoostAbAttr extends BattleStatMultiplierAbAttr {
//   private threshold: number;
//   private multiplier: number;
//
//   constructor(threshold: number, multiplier: number) {
//     super(BattleStat.DEF, multiplier, (pokemon) => pokemon.getHpRatio() < threshold);
//   }
//
//   applyBattleStat(pokemon: Pokemon, passive: boolean, battleStat: BattleStat, statValue: Utils.NumberHolder, args: any[]): boolean {
//     if (battleStat === BattleStat.DEF && pokemon.getHpRatio() < this.threshold) {
//       statValue.value *= this.multiplier;
//       return true;
//     }
//     return false;
//   }
// }

// hp contact burn / sleep
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

// sturdy plus
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

// all stat boost
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
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:restoredHP", { abilityName: pokemon.getAbility().name })), true));
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
    if (originalTypes.every(type => type !== move.type)) {
        const healAmount = Math.floor(pokemon.getMaxHp() / 8);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:restoredHP", { abilityName: pokemon.getAbility().name })), true));
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
    if (!simulated && defender != pokemon && this.condition(pokemon, defender, move)) {
      const target = this.selfTarget ? pokemon : defender;
       pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, target.getBattlerIndex(), this.selfTarget, this.stats, this.levels));
      return true;
    }
    return false;
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
    if (!simulated && this.condition(pokemon, defender, move)) {
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
    if (!simulated && defender != pokemon && move.type === this.moveType) {
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
      if (randSeedChance(this.survivalChance)) { // Chance to activate
        damageHolder.value = 1; // leave 1 HP
        cancelled.value = true;
        this.onSuccess(pokemon, attacker, move, args);
        return true;
      }
    }
    return false;
  }

  protected onSuccess(pokemon: Pokemon, attacker: Pokemon, move: Move, args: any[]): void {
    // Default implementation does nothing
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
    if (pokemon != defender && attackConditionMet(this.condition, pokemon, defender, move)) {
      const target = this.selfTarget ? pokemon : defender;
      const statusEffect = this.statusEffects[pokemon.randSeedInt(this.statusEffects.length)];
      target.trySetStatus(statusEffect);
      return true;
    }
    return false;
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
    if (!simulated && pokemon != defender && this.condition(pokemon, defender, move)) {
      const healAmount = Math.floor(pokemon.getMaxHp() * this.healRatio);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:restoredHP", { abilityName: pokemon.getAbility().name })), true));
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

        const effectiveCategory = defender.getStat(Stat.DEF) < defender.getStat(Stat.SPDEF) ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;

        // Set a flag in the move's args to indicate the effective category
        args.push({ effectiveCategory });

        if ((effectiveCategory === MoveCategory.PHYSICAL && pokemon.getStat(Stat.SPATK) > pokemon.getStat(Stat.ATK)) ||
            (effectiveCategory === MoveCategory.SPECIAL && pokemon.getStat(Stat.ATK) > pokemon.getStat(Stat.SPATK))) {
            const temp = pokemon.summonData.stats[Stat.ATK];
            pokemon.summonData.stats[Stat.ATK] = pokemon.summonData.stats[Stat.SPATK];
            pokemon.summonData.stats[Stat.SPATK] = temp;
        }

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
      if (defender.getTypes().includes(mod.collectedType)) {
        totalBoost += 0.1 * mod.getStackCount(); // 10% boost per stack
      }
    });

    if (totalBoost > 0) {
      // fix ability
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
      if (defender.getTypes().includes(mod.collectedType)) {
        matchingTypes++;
      }
    });

    if (matchingTypes > 0) {
      const healFraction = Math.min(1 / (11 - matchingTypes), 1 / 4);
      const healAmount = Math.floor(pokemon.getMaxHp() * healFraction);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:devouredSoul", { abilityName: pokemon.getAbility().name })), true));
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
      if (defender.getTypes().includes(mod.collectedType)) {
        matchingTypes++;
      }
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
    if(simulated) {
      return false;
    }
    const randomType = Utils.randItem(knockedOut.getTypes());
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
    return getPokemonMessage(pokemon, i18next.t("abilityTrigger:gaveTarget", { abilityName: this.ability }));
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
    if (!simulated && this.condition(pokemon, defender, move)) {
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
    if (!simulated && pokemon != attacker && this.condition(pokemon, attacker, move)) {
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

export class PokemonTypeChangeHealAbAttr extends PreAttackAbAttr {
  private moveType: Type;
  private healChance: number;
  private healRatio: number;

  constructor(healChance: number, healRatio: number) {
    super(true);
    this.healChance = healChance;
    this.healRatio = healRatio;
  }

  async applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): Promise<boolean> {
    if (
        !simulated &&
        !pokemon.isTerastallized() &&
        move.id !== Moves.STRUGGLE &&
        !move.findAttr((attr) =>
            attr instanceof RandomMovesetMoveAttr ||
            attr instanceof RandomMoveAttr ||
            attr instanceof NaturePowerAttr ||
            attr instanceof CopyMoveAttr
        )
    ) {
      const moveCopy = new Move(move.id, move.type, move.category, move.moveTarget, move.power, move.accuracy, move.pp, move.chance, move.priority, move.generation);
      moveCopy.attrs = move.attrs;

      if (move.findAttr(attr => attr instanceof VariableMoveTypeAttr)) {
        await applyMoveAttrs(VariableMoveTypeAttr, pokemon, null, moveCopy);
      } else {
        await applyPreAttackAbAttrs(MoveTypeChangeAbAttr, pokemon, null, moveCopy);
      }

      if (pokemon.getTypes().some((t) => t !== moveCopy.type)) {
        this.moveType = moveCopy.type;
        pokemon.summonData.types = [moveCopy.type];
        pokemon.updateInfo();

        if (randSeedChance(this.healChance)) {
          const healAmount = Math.floor(pokemon.getMaxHp() * this.healRatio);
          pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:restoredHP", { abilityName: pokemon.getAbility().name })), true));
        }

        return true;
      }
    }
    return false;
  }
}

export class PostTurnHealPlusAbAttr extends PostTurnAbAttr {
  applyPostTurn(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): boolean {
    if (!simulated && pokemon.getHpRatio() < 1) {
      const scene = pokemon.scene;
      const abilityName = (!passive ? pokemon.getAbility() : pokemon.getPassiveAbility()).name;
      scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
          Math.max(Math.floor(pokemon.getMaxHp() / 8), 1), getPokemonMessage(pokemon, i18next.t("abilityTrigger:restoredHPLittle", { abilityName: abilityName })), true));
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
    }
    return true;
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
    if (!simulated && (pokemon != defender || move.id === Moves.SHELL_SMASH) && this.condition(pokemon, defender, move)) {
      const healAmount = Math.floor(pokemon.getMaxHp() * this.healRatio);
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:restoredHP", { abilityName: pokemon.getAbility().name })), true));
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
    if (!simulated && move.type === this.moveType) {
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
    if (!simulated && pokemon != defender && this.condition(pokemon, defender, move)) {
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
    if (!simulated && pokemon != defender && this.condition(pokemon, defender, move)) {
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
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), healAmount, getPokemonMessage(pokemon, i18next.t("abilityTrigger:restoredHP", { abilityName: pokemon.getAbility().name })), true));
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
          Math.max(Math.floor(target.getMaxHp() * this.hpRatio), 1), getPokemonMessage(pokemon, i18next.t("abilityTrigger:restoredHPLittle", { abilityName: abilityName })), true));
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
    if (!simulated && pokemon.getHpRatio() < 1 && this.condition(pokemon, pokemon.getOpponents()[0])) {
      pokemon.heal(Math.floor(pokemon.getMaxHp() * this.hpRatio));
      pokemon.updateInfo();
      return true;
    }
    return false;
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
    if (!simulated && pokemon != attacker && this.condition(pokemon, attacker, move)) {
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

export class MoveFlagChangeAttr extends PreAttackAbAttr {
  constructor(
      private newFlag: MoveFlags,
      private powerMultiplier: number,
      private condition?: PokemonAttackCondition
  ) {
    super(true);
  }

  applyPreAttack(pokemon: Pokemon, passive: boolean, simulated: boolean, defender: Pokemon, move: Move, args: any[]): boolean {
    if (!simulated && this.condition && this.condition(pokemon, defender, move)) {
      move.abilitySetFlag(this.newFlag, true);
      if (args[0] && args[0] instanceof Utils.NumberHolder) {
        args[0].value *= this.powerMultiplier;
      }
      return true;
    }

    return false;
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
    if (!simulated && this.condition(pokemon, pokemon.getOpponents()[0])) {
      const target = this.selfTarget ? pokemon : pokemon.getOpponents()[0];
      const damage = Math.floor(target.getMaxHp() * this.ratio);
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
      targetPokemon.scene.unshiftPhase(new PokemonHealPhase(targetPokemon.scene, targetPokemon.getBattlerIndex(), healAmount, getPokemonMessage(targetPokemon, i18next.t("abilityTrigger:restoredHP", { abilityName: targetPokemon.getAbility().name })), true));
      return true;
    }
    return false;
  }

  // getTriggerMessage(pokemon: Pokemon, abilityName: string, ...args: any[]): string {
  //   const targetPokemon = this.selfTarget ? pokemon : args[0] as Pokemon;
  //   return getPokemonMessage(targetPokemon, `'s ${abilityName}\nrestored its HP!`);
  // }
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
    if (!simulated && pokemon != defender && this.condition(pokemon, defender, move)) {
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
      .partial() // Healing not blocked by Heal Block
      .ignorable(),
    new Ability(Abilities.WATER_ABSORB, 3)
      .attr(TypeImmunityHealAbAttr, Type.WATER)
      .partial() // Healing not blocked by Heal Block
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
      .partial(), // Healing not blocked by Heal Block
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
      .partial() // Healing not blocked by Heal Block
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
      //@ts-ignore
      .attr(DamageBoostAbAttr, 2, (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) <= 0.5), // TODO: fix TS issues
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
      .partial(), // Healing not blocked by Heal Block
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
        /** Rate is doubled when under sun {@link https://dex.pokemonshowdown.com/abilities/harvest} */
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
    //@ts-ignore
      .attr(MovePowerBoostAbAttr, (user, target, move) => !!target?.getLastXMoves(1).find(m => m.turn === target?.scene.currentBattle.turn) || user.scene.currentBattle.turnCommands[target.getBattlerIndex()].command !== Command.FIGHT, 1.3), // TODO fix TS issues
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
      .partial(), // Healing not blocked by Heal Block
    new Ability(Abilities.PROTEAN, 6)
      .attr(PokemonTypeChangeAbAttr),
    //.condition((p) => !p.summonData?.abilitiesApplied.includes(Abilities.PROTEAN)), //Gen 9 Implementation
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
      .partial(), // Mold Breaker ally should not be affected by Sweet Veil
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
      //@ts-ignore
      .attr(MovePowerBoostAbAttr, (user, target, move) => user.scene.currentBattle.turnCommands[target.getBattlerIndex()].command === Command.POKEMON, 2), // TODO: fix TS issues
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
      // Add BattlerTagType.DISGUISE if the pokemon is in its disguised form
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
    new Ability(Abilities.POWER_CONSTRUCT, 7) // TODO: 10% Power Construct Zygarde isn't accounted for yet. If changed, update Zygarde's getSpeciesFormIndex entry accordingly
      .attr(PostBattleInitFormChangeAbAttr, () => 2)
      .attr(PostSummonFormChangeAbAttr, p => p.getHpRatio() <= 0.5 || p.getFormKey() === "complete" ? 4 : 2)
      .attr(PostTurnFormChangeAbAttr, p => p.getHpRatio() <= 0.5 || p.getFormKey() === "complete" ? 4 : 2)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(UnsuppressableAbilityAbAttr)
      .attr(NoFusionAbilityAbAttr)
      .bypassFaint()
      .partial(),
    new Ability(Abilities.CORROSION, 7) // TODO: Test Corrosion against Magic Bounce once it is implemented
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
      //@ts-ignore
      .attr(MovePowerBoostAbAttr, (user, target, move) => target.getAttackTypeEffectiveness(move.type, user) >= 2, 1.25), // TODO: fix TS issues
    new Ability(Abilities.INTREPID_SWORD, 8)
      .attr(PostSummonStatChangeAbAttr, BattleStat.ATK, 1, true)
      .condition(getOncePerBattleCondition(Abilities.INTREPID_SWORD)),
    new Ability(Abilities.DAUNTLESS_SHIELD, 8)
      .attr(PostSummonStatChangeAbAttr, BattleStat.DEF, 1, true)
      .condition(getOncePerBattleCondition(Abilities.DAUNTLESS_SHIELD)),
    new Ability(Abilities.LIBERO, 8)
      .attr(PokemonTypeChangeAbAttr),
    //.condition((p) => !p.summonData?.abilitiesApplied.includes(Abilities.LIBERO)), //Gen 9 Implementation
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
      // Add BattlerTagType.ICE_FACE if the pokemon is in ice face form
      .conditionalAttr(pokemon => pokemon.formIndex === 0, PostSummonAddBattlerTagAbAttr, BattlerTagType.ICE_FACE, 0, false)
      // When summoned with active HAIL or SNOW, add BattlerTagType.ICE_FACE
      .conditionalAttr(getWeatherCondition(WeatherType.HAIL, WeatherType.SNOW), PostSummonAddBattlerTagAbAttr, BattlerTagType.ICE_FACE, 0)
      // When weather changes to HAIL or SNOW while pokemon is fielded, add BattlerTagType.ICE_FACE
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
      //@ts-ignore
      .attr(PostTurnFormChangeAbAttr, p => p.getFormKey ? 0 : 1) // TODO: fix ts-ignore
      //@ts-ignore
      .attr(PostTurnFormChangeAbAttr, p => p.getFormKey ? 1 : 0) // TODO: fix ts-ignore
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
      .partial(), // While setting the tag, the getbattlestat should ignore all modifiers to stats except stat stages
    new Ability(Abilities.QUARK_DRIVE, 9)
      .conditionalAttr(getTerrainCondition(TerrainType.ELECTRIC), PostSummonAddBattlerTagAbAttr, BattlerTagType.QUARK_DRIVE, 0, true)
      .attr(PostTerrainChangeAddBattlerTagAttr, BattlerTagType.QUARK_DRIVE, 0, TerrainType.ELECTRIC)
      .attr(UncopiableAbilityAbAttr)
      .attr(UnswappableAbilityAbAttr)
      .attr(NoTransformAbilityAbAttr)
      .partial(), // While setting the tag, the getbattlestat should ignore all modifiers to stats except stat stages
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
      .partial() // Healing not blocked by Heal Block
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
      .partial(), // Healing not blocked by Heal Block
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
      // new Ability(Abilities.SCORCH_BODY, 3)
      //   .attr(PostDefendContactApplyStatusEffectAbAttr, 50, StatusEffect.BURN)
      //   .bypassFaint(),
      // new Ability(Abilities.HEATED_MUTATION, 3)
      //   .attr(BattleStatMultiplierAbAttr, BattleStat.SPD, 2.5)
      //   .condition(getWeatherCondition(WeatherType.SUNNY, WeatherType.HARSH_SUN)),
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
          // .ignorable(),
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
          .attr(PostDefendStatusDamageAbAttr, StatusEffect.TOXIC, 1/8)  // X damage if attacker has TOXIC status
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => randSeedChance(30)),
      new Ability(Abilities.FLAMING_EMISSION, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIRE, Type.POISON, 2),
      new Ability(Abilities.BURNING_DISEASE, 9)
          .attr(PostDefendStatusDamageAbAttr, StatusEffect.BURN, 1/8)  // X damage if attacker has TOXIC status
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
          .attr(PostAttackApplyTagAbAttr, false, (user, target, move) => move.name.toLowerCase().includes("ball") || move.name.toLowerCase().includes("sphere") || move.name.toLowerCase().includes("orb") || move.name.toLowerCase().includes("circle") || move.name.toLowerCase().includes("bounce") || move.name.toLowerCase().includes("yellow") && randSeedChance(30), [BattlerTagType.FLINCHED], 0),
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
      new Ability(Abilities.THE_AVATAR, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.FIRE, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.WATER, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.FLYING, 1.2)
          .attr(MoveTypePowerBoostAbAttr, Type.GROUND, 1.2),
      new Ability(Abilities.ENLIGHTENED, 9)
          .attr(MoveTypePowerBoostAbAttr, Type.PSYCHIC, 1.2)
          .attr(MovePowerNeutralAbAttr, (target, user, move) => target!.getAttackTypeEffectiveness(move.type, user!) < 1),
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
          .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => getPokemonMessage(pokemon, i18next.t("abilityTrigger:sillyPressure")))
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
          .attr(PostDefendContactApplyStatusEffectAbAttr, 30, StatusEffect.FREEZE)
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
          .attr(PostDefendApplyBattlerTagAbAttr, (target, user, move) => randSeedChance(30), BattlerTagType.FLINCHED)
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
          .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => getPokemonMessage(pokemon, i18next.t("abilityTrigger:questionPressure")))
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
          // PostSummonStatusEffectAbAttr
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
          // PostFaintDamageAbAttr
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
          // PostAttackHealAbAttr
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
          // PreSwitchOutHealAbAttr
          .attr(PreSwitchOutHealConditionAbAttr, (switcher, opponent) => true, 45),
      new Ability(Abilities.PLAGUE_PSYCHE, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.POISON, Type.PSYCHIC, 2)
          .attr(MoveTypeChangeAbAttr, Type.POISON, 1, (user, target, move) => move.type === Type.NORMAL)
          // PostAttackTagOrStatusAbAttr
          .attr(PostAttackTagOrStatusAbAttr, (user, target, move) => true, [BattlerTagType.CONFUSED], 10, 1, [StatusEffect.POISON, StatusEffect.TOXIC], 10),
      new Ability(Abilities.TOXIC_TRANCE, 9)
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.TOXIC, (user, target, move) => randSeedChance(30))
          .attr(PostAttackChanceStatusAbAttr, StatusEffect.SLEEP, (user, target, move) => randSeedChance(30))
          .attr(MovePowerBoostAbAttr, (user, target, move) => user?.status !== null, 1.5),
      new Ability(Abilities.PERMAFROST_ARMOR, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => [Type.FIRE, Type.ICE, Type.ROCK].includes(move.type), 0.5),
      new Ability(Abilities.GLACIAL_PACE, 9)
          .attr(PostSummonStatChangeAbAttr, BattleStat.SPD, -2, true)
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
          // PostAttackTagOrStatusAbAttr
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
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.CURSED], 1),
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
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.CURSED], 1),
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
          .attr(PostSummonMessageAbAttr, (pokemon: Pokemon) => getPokemonMessage(pokemon, i18next.t("abilityTrigger:allOrNothingPressure")))
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
      new Ability(Abilities.UNJUSTIFIED, 9)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.NORMAL, Type.DARK, 2, true)
          .attr(SharedWeaknessPowerBoostAbAttr, Type.FIGHTING, Type.DARK, 2, true)
          .attr(ReceivedMoveDamageMultiplierAbAttr, (target, user, move) => move.type === Type.FAIRY, 0.5)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => move.type === Type.FAIRY, BattleStat.ATK, 1),
      new Ability(Abilities.ABYSSAL_STANCE, 9)
          .attr(PostDefendStatChangeAbAttr, (target, user, move) => randSeedChance(30), BattleStat.RAND, 1)
          .attr(PostDefendDamageAbAttr, (target, user, move) => randSeedChance(30), 1/8, false)
          .attr(PostAttackStatChangeAbAttr, (user, target, move) => randSeedChance(10), -1, BattleStat.RAND)
          .attr(MoveTypeChangeAbAttr, Type.DARK, 1.2, (user, target, move) => move.type === Type.NORMAL),
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
          .attr(PostAttackApplyTagAbAttr, false, 10, [BattlerTagType.FLINCHED], 0),
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
          .bypassFaint()
  );
}



























