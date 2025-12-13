import { Arena } from "../field/arena";
import { Type } from "./type";
import * as Utils from "../utils";
import { MoveCategory, allMoves, MoveTarget, IncrementMovePriorityAttr, applyMoveAttrs } from "./move";
import { getPokemonNameWithAffix } from "../messages";
import Pokemon, { HitResult, PokemonMove } from "../field/pokemon";
import { StatusEffect } from "./status-effect";
import { BattlerIndex } from "../battle";
import { BlockNonDirectDamageAbAttr, ChangeMovePriorityAbAttr, ProtectStatAbAttr, applyAbAttrs } from "./ability";
import { BattleStat } from "./battle-stat";
import { CommonAnim, CommonBattleAnim } from "./battle-anims";
import i18next from "i18next";
import { Abilities } from "#enums/abilities";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { Moves } from "#enums/moves";
import { MoveEffectPhase } from "#app/phases/move-effect-phase.js";
import { PokemonHealPhase } from "#app/phases/pokemon-heal-phase.js";
import { ShowAbilityPhase } from "#app/phases/show-ability-phase.js";
import { StatChangePhase } from "#app/phases/stat-change-phase.js";

export enum ArenaTagSide {
  BOTH,
  PLAYER,
  ENEMY
}

export abstract class ArenaTag {
  public tagType: ArenaTagType;
  public turnCount: integer;
  public sourceMove?: Moves;
  public sourceId?: integer;
  public side: ArenaTagSide;
  constructor(tagType: ArenaTagType, turnCount: integer, sourceMove: Moves | undefined, sourceId?: integer, side: ArenaTagSide = ArenaTagSide.BOTH) {
    this.tagType = tagType;
    this.turnCount = turnCount;
    this.sourceMove = sourceMove;
    this.sourceId = sourceId;
    this.side = side;
  }

  apply(arena: Arena, args: any[]): boolean {
    return true;
  }

  onAdd(arena: Arena, quiet: boolean = false): void { }

  onRemove(arena: Arena, quiet: boolean = false): void {
    if (!quiet) {
      arena.scene.queueMessage(i18next.t(`arenaTag:arenaOnRemove${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`, { moveName: this.getMoveName() }));
    }
  }

  onOverlap(arena: Arena): void { }

  lapse(arena: Arena): boolean {
    return this.turnCount < 1 || !!(--this.turnCount);
  }

  getMoveName(): string | null {
    return this.sourceMove
        ? allMoves[this.sourceMove].name
        : null;
  }
}
export class MistTag extends ArenaTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.MIST, turnCount, Moves.MIST, sourceId, side);
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    super.onAdd(arena);

    if (this.sourceId) {
    const source = arena.scene.getPokemonById(this.sourceId);

      if (!quiet && source) {
        arena.scene.queueMessage(i18next.t("arenaTag:mistOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(source) }));
      } else if (!quiet) {
        console.warn("Failed to get source for MistTag onAdd");
      }
    }
  }

  apply(arena: Arena, args: any[]): boolean {
    (args[0] as Utils.BooleanHolder).value = true;

    arena.scene.queueMessage(i18next.t("arenaTag:mistApply"));

    return true;
  }
}
export class WeakenMoveScreenTag extends ArenaTag {
  protected weakenedCategories: MoveCategory[];
  constructor(tagType: ArenaTagType, turnCount: integer, sourceMove: Moves, sourceId: integer, side: ArenaTagSide, weakenedCategories: MoveCategory[]) {
    super(tagType, turnCount, sourceMove, sourceId, side);

    this.weakenedCategories = weakenedCategories;
  }
  apply(arena: Arena, args: any[]): boolean {
    if (this.weakenedCategories.includes((args[0] as MoveCategory))) {
      (args[2] as Utils.NumberHolder).value = (args[1] as boolean) ? 2732/4096 : 0.5;
    return true;
  }
    return false;
  }
}
class ReflectTag extends WeakenMoveScreenTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.REFLECT, turnCount, Moves.REFLECT, sourceId, side, [MoveCategory.PHYSICAL]);
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    if (!quiet) {
      arena.scene.queueMessage(i18next.t(`arenaTag:reflectOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`));
    }
  }
}
class LightScreenTag extends WeakenMoveScreenTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.LIGHT_SCREEN, turnCount, Moves.LIGHT_SCREEN, sourceId, side, [MoveCategory.SPECIAL]);
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    if (!quiet) {
      arena.scene.queueMessage(i18next.t(`arenaTag:lightScreenOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`));
    }
  }
}
class AuroraVeilTag extends WeakenMoveScreenTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.AURORA_VEIL, turnCount, Moves.AURORA_VEIL, sourceId, side, [MoveCategory.SPECIAL, MoveCategory.PHYSICAL]);
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    if (!quiet) {
      arena.scene.queueMessage(i18next.t(`arenaTag:auroraVeilOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`));
    }
  }
}

type ProtectConditionFunc = (arena: Arena, moveId: Moves) => boolean;
export class ConditionalProtectTag extends ArenaTag {

  protected protectConditionFunc: ProtectConditionFunc;

  protected ignoresBypass: boolean;

  constructor(tagType: ArenaTagType, sourceMove: Moves, sourceId: integer, side: ArenaTagSide, condition: ProtectConditionFunc, ignoresBypass: boolean = false) {
    super(tagType, 1, sourceMove, sourceId, side);

    this.protectConditionFunc = condition;
    this.ignoresBypass = ignoresBypass;
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(i18next.t(`arenaTag:conditionalProtectOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`, { moveName: super.getMoveName() }));
  }
  onRemove(arena: Arena): void { }
  apply(arena: Arena, args: any[]): boolean {
    const [ cancelled, user, target, moveId, ignoresBypass ] = args;

    if (cancelled instanceof Utils.BooleanHolder
        && user instanceof Pokemon
        && target instanceof Pokemon
        && typeof moveId === "number"
        && ignoresBypass instanceof Utils.BooleanHolder) {

    if ((this.side === ArenaTagSide.PLAYER) === target.isPlayer()
          && this.protectConditionFunc(arena, moveId)) {
        if (!cancelled.value) {
          cancelled.value = true;
          user.stopMultiHit(target);

      new CommonBattleAnim(CommonAnim.PROTECT, target).play(arena.scene);
          arena.scene.queueMessage(i18next.t("arenaTag:conditionalProtectApply", { moveName: super.getMoveName(), pokemonNameWithAffix: getPokemonNameWithAffix(target) }));
        }

        ignoresBypass.value = ignoresBypass.value || this.ignoresBypass;
      return true;
    }
    }
    return false;
  }
}
const QuickGuardConditionFunc: ProtectConditionFunc = (arena, moveId) => {
  const move = allMoves[moveId];
  const priority = new Utils.IntegerHolder(move.priority);
  const effectPhase = arena.scene.getCurrentPhase();

  if (effectPhase instanceof MoveEffectPhase) {
    const attacker = effectPhase.getUserPokemon()!;
    applyMoveAttrs(IncrementMovePriorityAttr, attacker, null, move, priority);
    applyAbAttrs(ChangeMovePriorityAbAttr, attacker, null, false, move, priority);
  }
  return priority.value > 0;
};
class QuickGuardTag extends ConditionalProtectTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.QUICK_GUARD, Moves.QUICK_GUARD, sourceId, side, QuickGuardConditionFunc);
  }
}
const WideGuardConditionFunc: ProtectConditionFunc = (arena, moveId) : boolean => {
  const move = allMoves[moveId];

  switch (move.moveTarget) {
            case MoveTarget.ALL_ENEMIES:
            case MoveTarget.ALL_NEAR_ENEMIES:
            case MoveTarget.ALL_OTHERS:
            case MoveTarget.ALL_NEAR_OTHERS:
              return true;
          }
          return false;
};
class WideGuardTag extends ConditionalProtectTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.WIDE_GUARD, Moves.WIDE_GUARD, sourceId, side, WideGuardConditionFunc);
        }
  }
const MatBlockConditionFunc: ProtectConditionFunc = (arena, moveId) : boolean => {
  const move = allMoves[moveId];
  return move.category !== MoveCategory.STATUS;
};
class MatBlockTag extends ConditionalProtectTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.MAT_BLOCK, Moves.MAT_BLOCK, sourceId, side, MatBlockConditionFunc);
  }

  onAdd(arena: Arena) {
    if (this.sourceId) {
    const source = arena.scene.getPokemonById(this.sourceId);
      if (source) {
        arena.scene.queueMessage(i18next.t("arenaTag:matBlockOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(source) }));
      } else {
        console.warn("Failed to get source for MatBlockTag onAdd");
      }
  }
}
}
const CraftyShieldConditionFunc: ProtectConditionFunc = (arena, moveId) => {
  const move = allMoves[moveId];
  return move.category === MoveCategory.STATUS
    && move.moveTarget !== MoveTarget.ENEMY_SIDE
    && move.moveTarget !== MoveTarget.BOTH_SIDES
    && move.moveTarget !== MoveTarget.ALL;
};
class CraftyShieldTag extends ConditionalProtectTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.CRAFTY_SHIELD, Moves.CRAFTY_SHIELD, sourceId, side, CraftyShieldConditionFunc, true);
  }
}
export class NoCritTag extends ArenaTag {

  constructor(turnCount: integer, sourceMove: Moves, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.NO_CRIT, turnCount, sourceMove, sourceId, side);
        }
  onAdd(arena: Arena): void {
    arena.scene.queueMessage(i18next.t(`arenaTag:noCritOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : "Enemy"}`, {
      moveName: this.getMoveName()
    }));
  }
  onRemove(arena: Arena): void {
    const source = arena.scene.getPokemonById(this.sourceId!);
    arena.scene.queueMessage(i18next.t("arenaTag:noCritOnRemove", {
      pokemonNameWithAffix: getPokemonNameWithAffix(source ?? undefined),
      moveName: this.getMoveName()
    }));
  }
}
class WishTag extends ArenaTag {
  private battlerIndex: BattlerIndex;
  private triggerMessage: string;
  private healHp: number;

  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.WISH, turnCount, Moves.WISH, sourceId, side);
  }

  onAdd(arena: Arena): void {
    if (this.sourceId) {
    const user = arena.scene.getPokemonById(this.sourceId);
      if (user) {
    this.battlerIndex = user.getBattlerIndex();
        this.triggerMessage = i18next.t("arenaTag:wishTagOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(user) });
        this.healHp = Utils.toDmgValue(user.getMaxHp() / 2);
      } else {
        console.warn("Failed to get source for WishTag onAdd");
      }
    }
  }

  onRemove(arena: Arena): void {
    const target = arena.scene.getField()[this.battlerIndex];
    if (target?.isActive(true)) {
      arena.scene.queueMessage(this.triggerMessage);
      arena.scene.unshiftPhase(new PokemonHealPhase(target.scene, target.getBattlerIndex(), this.healHp, null, true, false));
    }
  }
}
export class WeakenMoveTypeTag extends ArenaTag {
  private weakenedType: Type;
  constructor(tagType: ArenaTagType, turnCount: integer, type: Type, sourceMove: Moves, sourceId: integer) {
    super(tagType, turnCount, sourceMove, sourceId);

    this.weakenedType = type;
  }

  apply(arena: Arena, args: any[]): boolean {
    if ((args[0] as Type) === this.weakenedType) {
      (args[1] as Utils.NumberHolder).value *= 0.33;
      return true;
    }

    return false;
  }
}
class MudSportTag extends WeakenMoveTypeTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(ArenaTagType.MUD_SPORT, turnCount, Type.ELECTRIC, Moves.MUD_SPORT, sourceId);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:mudSportOnAdd"));
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:mudSportOnRemove"));
  }
}
class WaterSportTag extends WeakenMoveTypeTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(ArenaTagType.WATER_SPORT, turnCount, Type.FIRE, Moves.WATER_SPORT, sourceId);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:waterSportOnAdd"));
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:waterSportOnRemove"));
  }
}
export class ArenaTrapTag extends ArenaTag {
  public layers: integer;
  public maxLayers: integer;
  constructor(tagType: ArenaTagType, sourceMove: Moves, sourceId: integer, side: ArenaTagSide, maxLayers: integer) {
    super(tagType, 0, sourceMove, sourceId, side);

    this.layers = 1;
    this.maxLayers = maxLayers;
  }

  onOverlap(arena: Arena): void {
    if (this.layers < this.maxLayers) {
      this.layers++;

      this.onAdd(arena);
    }
  }

  apply(arena: Arena, args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    if (this.sourceId === pokemon.id || (this.side === ArenaTagSide.PLAYER) !== pokemon.isPlayer()) {
      return false;
    }

    return this.activateTrap(pokemon);
  }

  activateTrap(pokemon: Pokemon): boolean {
    return false;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    return pokemon.isGrounded() ? 1 : Phaser.Math.Linear(0, 1 / Math.pow(2, this.layers), Math.min(pokemon.getHpRatio(), 0.5) * 2);
  }
}
class SpikesTag extends ArenaTrapTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.SPIKES, Moves.SPIKES, sourceId, side, 3);
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    super.onAdd(arena);

    const source = this.sourceId ? arena.scene.getPokemonById(this.sourceId) : null;
    if (!quiet && source) {
      arena.scene.queueMessage(i18next.t("arenaTag:spikesOnAdd", { moveName: this.getMoveName(), opponentDesc: source.getOpponentDescriptor() }));
    }
  }

  activateTrap(pokemon: Pokemon): boolean {
    if (pokemon.isGrounded()) {
      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value) {
        const damageHpRatio = 1 / (10 - 2 * this.layers);
        const damage = Utils.toDmgValue(pokemon.getMaxHp() * damageHpRatio);

        pokemon.scene.queueMessage(i18next.t("arenaTag:spikesActivateTrap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
        pokemon.damageAndUpdate(damage, HitResult.OTHER);
        if (pokemon.turnData) {
          pokemon.turnData.damageTaken += damage;
        }
        return true;
      }
    }

    return false;
  }
}
class ToxicSpikesTag extends ArenaTrapTag {
  private neutralized: boolean;

  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.TOXIC_SPIKES, Moves.TOXIC_SPIKES, sourceId, side, 2);
    this.neutralized = false;
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    super.onAdd(arena);

    const source = this.sourceId ? arena.scene.getPokemonById(this.sourceId) : null;
    if (!quiet && source) {
      arena.scene.queueMessage(i18next.t("arenaTag:toxicSpikesOnAdd", { moveName: this.getMoveName(), opponentDesc: source.getOpponentDescriptor() }));
    }
  }

  onRemove(arena: Arena): void {
    if (!this.neutralized) {
      super.onRemove(arena);
    }
  }

  activateTrap(pokemon: Pokemon): boolean {
    if (pokemon.isGrounded()) {
      if (pokemon.isOfType(Type.POISON)) {
        this.neutralized = true;
        if (pokemon.scene.arena.removeTag(this.tagType)) {
          pokemon.scene.queueMessage(i18next.t("arenaTag:toxicSpikesActivateTrapPoison", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), moveName: this.getMoveName() }));
          return true;
        }
      } else if (!pokemon.status) {
        const toxic = this.layers > 1;
        if (pokemon.trySetStatus(!toxic ? StatusEffect.POISON : StatusEffect.TOXIC, true, null, 0, this.getMoveName())) {
          return true;
        }
      }
    }

    return false;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    if (pokemon.isGrounded() || !pokemon.canSetStatus(StatusEffect.POISON, true)) {
      return 1;
    }
    if (pokemon.isOfType(Type.POISON)) {
      return 1.25;
    }
    return super.getMatchupScoreMultiplier(pokemon);
  }
}
class DelayedAttackTag extends ArenaTag {
  public targetIndex: BattlerIndex;

  constructor(tagType: ArenaTagType, sourceMove: Moves | undefined, sourceId: integer, targetIndex: BattlerIndex) {
    super(tagType, 3, sourceMove, sourceId);

    this.targetIndex = targetIndex;
  }

  lapse(arena: Arena): boolean {
    const ret = super.lapse(arena);

    if (!ret) {
      arena.scene.unshiftPhase(new MoveEffectPhase(arena.scene, this.sourceId!, [ this.targetIndex ], new PokemonMove(this.sourceMove!, 0, 0, true)));
    }

    return ret;
  }

  onRemove(arena: Arena): void { }
}
class StealthRockTag extends ArenaTrapTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.STEALTH_ROCK, Moves.STEALTH_ROCK, sourceId, side, 1);
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    super.onAdd(arena);

    const source = this.sourceId ? arena.scene.getPokemonById(this.sourceId) : null;
    if (!quiet && source) {
      arena.scene.queueMessage(i18next.t("arenaTag:stealthRockOnAdd", { opponentDesc: source.getOpponentDescriptor() }));
    }
  }

  getDamageHpRatio(pokemon: Pokemon): number {
    const effectiveness = pokemon.getAttackTypeEffectiveness(Type.ROCK, undefined, true);

    let damageHpRatio: number = 0;

    switch (effectiveness) {
      case 0:
        damageHpRatio = 0;
        break;
      case 0.25:
        damageHpRatio = 0.03125;
        break;
      case 0.5:
        damageHpRatio = 0.0625;
        break;
      case 1:
        damageHpRatio = 0.125;
        break;
      case 2:
        damageHpRatio = 0.25;
        break;
      case 4:
        damageHpRatio = 0.5;
        break;
    }

    return damageHpRatio;
  }

  activateTrap(pokemon: Pokemon): boolean {
    const cancelled = new Utils.BooleanHolder(false);
    applyAbAttrs(BlockNonDirectDamageAbAttr,  pokemon, cancelled);

    if (cancelled.value) {
      return false;
    }

    const damageHpRatio = this.getDamageHpRatio(pokemon);

    if (damageHpRatio) {
      const damage = Utils.toDmgValue(pokemon.getMaxHp() * damageHpRatio);
      pokemon.scene.queueMessage(i18next.t("arenaTag:stealthRockActivateTrap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
      pokemon.damageAndUpdate(damage, HitResult.OTHER);
      if (pokemon.turnData) {
        pokemon.turnData.damageTaken += damage;
      }
    }

    return false;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    const damageHpRatio = this.getDamageHpRatio(pokemon);
    return Phaser.Math.Linear(super.getMatchupScoreMultiplier(pokemon), 1, 1 - Math.pow(damageHpRatio, damageHpRatio));
  }
}
class StickyWebTag extends ArenaTrapTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.STICKY_WEB, Moves.STICKY_WEB, sourceId, side, 1);
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    super.onAdd(arena);
    const source = this.sourceId ? arena.scene.getPokemonById(this.sourceId) : null;
    if (!quiet && source) {
      arena.scene.queueMessage(i18next.t("arenaTag:stickyWebOnAdd", { moveName: this.getMoveName(), opponentDesc: source.getOpponentDescriptor() }));
    }
  }

  activateTrap(pokemon: Pokemon): boolean {
    if (pokemon.isGrounded()) {
      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(ProtectStatAbAttr, pokemon, cancelled);
      if (!cancelled.value) {
        pokemon.scene.queueMessage(i18next.t("arenaTag:stickyWebActivateTrap", { pokemonName: pokemon.getNameToRender() }));
        const statLevels = new Utils.NumberHolder(-1);
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), false, [BattleStat.SPD], statLevels.value));
      }
    }

    return false;
  }

}
export class TrickRoomTag extends ArenaTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(ArenaTagType.TRICK_ROOM, turnCount, Moves.TRICK_ROOM, sourceId);
  }

  apply(arena: Arena, args: any[]): boolean {
    const speedReversed = args[0] as Utils.BooleanHolder;
    speedReversed.value = !speedReversed.value;
    return true;
  }

  onAdd(arena: Arena): void {
    const source = this.sourceId ? arena.scene.getPokemonById(this.sourceId) : null;
    if (source) {
      arena.scene.queueMessage(i18next.t("arenaTag:trickRoomOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(source) }));
    }
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:trickRoomOnRemove"));
  }
}
export class GravityTag extends ArenaTag {
  constructor(turnCount: integer) {
    super(ArenaTagType.GRAVITY, turnCount, Moves.GRAVITY);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:gravityOnAdd"));
    arena.scene.getField(true).forEach((pokemon) => {
      if (pokemon !== null) {
        pokemon.removeTag(BattlerTagType.MAGNET_RISEN);
      }
    });
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:gravityOnRemove"));
  }
}
class TailwindTag extends ArenaTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.TAILWIND, turnCount, Moves.TAILWIND, sourceId, side);
  }

  onAdd(arena: Arena, quiet: boolean = false): void {
    if (!quiet) {
      arena.scene.queueMessage(i18next.t(`arenaTag:tailwindOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`));
    }

    const source = arena.scene.getPokemonById(this.sourceId!);
    const party = (source?.isPlayer() ? source.scene.getPlayerField() : source?.scene.getEnemyField()) ?? [];

    for (const pokemon of party) {

      if (pokemon.hasAbility(Abilities.WIND_POWER) && !pokemon.getTag(BattlerTagType.CHARGED)) {
        pokemon.addTag(BattlerTagType.CHARGED);
        pokemon.scene.queueMessage(i18next.t("abilityTriggers:windPowerCharged", { pokemonName: getPokemonNameWithAffix(pokemon), moveName: this.getMoveName() }));
      }

      if (pokemon.hasAbility(Abilities.WIND_RIDER)) {
        pokemon.scene.unshiftPhase(new ShowAbilityPhase(pokemon.scene, pokemon.getBattlerIndex()));
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.ATK], 1, true));
      }
    }
  }

  onRemove(arena: Arena, quiet: boolean = false): void {
    if (!quiet) {
      arena.scene.queueMessage(i18next.t(`arenaTag:tailwindOnRemove${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`));
    }
  }
    }
class HappyHourTag extends ArenaTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.HAPPY_HOUR, turnCount, Moves.HAPPY_HOUR, sourceId, side);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:happyHourOnAdd"));
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage(i18next.t("arenaTag:happyHourOnRemove"));
  }
}

export function getArenaTag(tagType: ArenaTagType, turnCount: integer, sourceMove: Moves | undefined, sourceId: integer, targetIndex?: BattlerIndex, side: ArenaTagSide = ArenaTagSide.BOTH): ArenaTag | null {
  switch (tagType) {
    case ArenaTagType.MIST:
      return new MistTag(turnCount, sourceId, side);
    case ArenaTagType.QUICK_GUARD:
      return new QuickGuardTag(sourceId, side);
    case ArenaTagType.WIDE_GUARD:
      return new WideGuardTag(sourceId, side);
    case ArenaTagType.MAT_BLOCK:
      return new MatBlockTag(sourceId, side);
    case ArenaTagType.CRAFTY_SHIELD:
      return new CraftyShieldTag(sourceId, side);
  case ArenaTagType.NO_CRIT:
    return new NoCritTag(turnCount, sourceMove!, sourceId, side);
    case ArenaTagType.MUD_SPORT:
      return new MudSportTag(turnCount, sourceId);
    case ArenaTagType.WATER_SPORT:
      return new WaterSportTag(turnCount, sourceId);
    case ArenaTagType.SPIKES:
      return new SpikesTag(sourceId, side);
    case ArenaTagType.TOXIC_SPIKES:
      return new ToxicSpikesTag(sourceId, side);
    case ArenaTagType.FUTURE_SIGHT:
    case ArenaTagType.DOOM_DESIRE:
    return new DelayedAttackTag(tagType, sourceMove, sourceId, targetIndex!);
    case ArenaTagType.WISH:
      return new WishTag(turnCount, sourceId, side);
    case ArenaTagType.STEALTH_ROCK:
      return new StealthRockTag(sourceId, side);
    case ArenaTagType.STICKY_WEB:
      return new StickyWebTag(sourceId, side);
    case ArenaTagType.TRICK_ROOM:
      return new TrickRoomTag(turnCount, sourceId);
    case ArenaTagType.GRAVITY:
      return new GravityTag(turnCount);
    case ArenaTagType.REFLECT:
      return new ReflectTag(turnCount, sourceId, side);
    case ArenaTagType.LIGHT_SCREEN:
      return new LightScreenTag(turnCount, sourceId, side);
    case ArenaTagType.AURORA_VEIL:
      return new AuroraVeilTag(turnCount, sourceId, side);
    case ArenaTagType.TAILWIND:
      return new TailwindTag(turnCount, sourceId, side);
  case ArenaTagType.HAPPY_HOUR:
    return new HappyHourTag(turnCount, sourceId, side);
  default:
    return null;
  }
}