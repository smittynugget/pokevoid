import { ChargeAnim, CommonAnim, CommonBattleAnim, MoveChargeAnim } from "./battle-anims";
import { getPokemonNameWithAffix } from "../messages";
import Pokemon, { MoveResult, HitResult, YU_BASE_CONTAINER_SCALE } from "../field/pokemon";
import { Stat, getStatName } from "./pokemon-stat";
import { StatusEffect } from "./status-effect";
import * as Utils from "../utils";
import { ChargeAttr, Move, MoveFlags, allMoves } from "./move";
import { Type } from "./type";
import { BlockNonDirectDamageAbAttr, FlinchEffectAbAttr, ReverseDrainAbAttr, applyAbAttrs } from "./ability";
import { TerrainType } from "./terrain";
import { Gender } from "./gender";
import { WeatherType } from "./weather";
import { BattleStat } from "./battle-stat";
import { allAbilities } from "./ability";
import { SpeciesFormChangeManualTrigger } from "./pokemon-forms";
import { Abilities } from "#enums/abilities";
import { BattlerTagType } from "#enums/battler-tag-type";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import i18next from "#app/plugins/i18n.js";
import { CommonAnimPhase } from "#app/phases/common-anim-phase.js";
import { MoveEffectPhase } from "#app/phases/move-effect-phase.js";
import { MovePhase } from "#app/phases/move-phase.js";
import { PokemonHealPhase } from "#app/phases/pokemon-heal-phase.js";
import { ShowAbilityPhase } from "#app/phases/show-ability-phase.js";
import { StatChangePhase, StatChangeCallback } from "#app/phases/stat-change-phase.js";

export enum BattlerTagLapseType {
  FAINT,
  MOVE,
  PRE_MOVE,
  AFTER_MOVE,
  MOVE_EFFECT,
  TURN_END,
  CUSTOM
}

export class BattlerTag {
  public tagType: BattlerTagType;
  public lapseTypes: BattlerTagLapseType[];
  public turnCount: number;
  public sourceMove: Moves;
  public sourceId?: number;

  constructor(tagType: BattlerTagType, lapseType: BattlerTagLapseType | BattlerTagLapseType[], turnCount: number, sourceMove?: Moves, sourceId?: number) {
    this.tagType = tagType;
    this.lapseTypes = Array.isArray(lapseType) ? lapseType : [ lapseType ];
    this.turnCount = turnCount;
    this.sourceMove = sourceMove!;
    this.sourceId = sourceId;
  }

  canAdd(pokemon: Pokemon): boolean {
    return true;
  }

  onAdd(pokemon: Pokemon): void { }

  onRemove(pokemon: Pokemon): void { }

  onOverlap(pokemon: Pokemon): void { }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return --this.turnCount > 0;
  }

  getDescriptor(): string {
    return "";
  }

  isSourceLinked(): boolean {
    return false;
  }

  getMoveName(): string | null {
    return this.sourceMove
        ? allMoves[this.sourceMove].name
        : null;
  }
  loadTag(source: BattlerTag | any): void {
    this.turnCount = source.turnCount;
    this.sourceMove = source.sourceMove;
    this.sourceId = source.sourceId;
  }
}

export interface WeatherBattlerTag {
  weatherTypes: WeatherType[];
}

export interface TerrainBattlerTag {
  terrainTypes: TerrainType[];
}
export class RechargingTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.RECHARGING, [ BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.TURN_END ], 2, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    pokemon.getMoveQueue().push({ move: Moves.NONE, targets: [] });
  }
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.PRE_MOVE) {
      pokemon.scene.queueMessage(i18next.t("battlerTags:rechargingLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
    (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
    pokemon.getMoveQueue().shift();
    }
    return super.lapse(pokemon, lapseType);
  }
}
export class BeakBlastChargingTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.BEAK_BLAST_CHARGING, [ BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.TURN_END ], 1, Moves.BEAK_BLAST);
  }

  onAdd(pokemon: Pokemon): void {

    new MoveChargeAnim(ChargeAnim.BEAK_BLAST_CHARGING, this.sourceMove, pokemon).play(pokemon.scene);
    pokemon.scene.queueMessage(i18next.t("moveTriggers:startedHeatingUpBeak", { pokemonName: getPokemonNameWithAffix(pokemon) }));
  }
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        attacker.trySetStatus(StatusEffect.BURN, true, pokemon);
      }
    return true;
  }
    return super.lapse(pokemon, lapseType);
  }
}
export class ShellTrapTag extends BattlerTag {
  public activated: boolean;

  constructor() {
    super(BattlerTagType.SHELL_TRAP, BattlerTagLapseType.TURN_END, 1);
    this.activated = false;
  }

  onAdd(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(i18next.t("moveTriggers:setUpShellTrap", { pokemonName: getPokemonNameWithAffix(pokemon) }));
  }
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const shellTrapPhaseIndex = pokemon.scene.phaseQueue.findIndex(
        phase => phase instanceof MovePhase && phase.pokemon === pokemon
      );
      const firstMovePhaseIndex = pokemon.scene.phaseQueue.findIndex(
        phase => phase instanceof MovePhase
      );

      if (shellTrapPhaseIndex !== -1 && shellTrapPhaseIndex !== firstMovePhaseIndex) {
        const shellTrapMovePhase = pokemon.scene.phaseQueue.splice(shellTrapPhaseIndex, 1)[0];
        pokemon.scene.prependToPhase(shellTrapMovePhase, MovePhase);
      }

      this.activated = true;
      return true;
    }
    return super.lapse(pokemon, lapseType);
  }
}

export class TrappedTag extends BattlerTag {
  constructor(tagType: BattlerTagType, lapseType: BattlerTagLapseType, turnCount: number, sourceMove: Moves, sourceId: number) {
    super(tagType, lapseType, turnCount, sourceMove, sourceId);
  }

  canAdd(pokemon: Pokemon): boolean {
    const isGhost = pokemon.isOfType(Type.GHOST);
    const isTrapped = pokemon.getTag(BattlerTagType.TRAPPED);

    return !isTrapped && !isGhost;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(this.getTrapMessage(pokemon));
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:trappedOnRemove", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: this.getMoveName()
    }));
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:trappedDesc");
  }

  isSourceLinked(): boolean {
    return true;
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:trappedOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) });
  }
}

export class YuTrappedTag extends TrappedTag {
  constructor(turnCount: number, sourceMove: Moves, sourceId: number) {
    super(BattlerTagType.YU_TRAPPED, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isOfType(Type.GHOST) && !pokemon.findTag(t => t instanceof TrappedTag);
  }

  isSourceLinked(): boolean {
    return false;
  }
}
export class FlinchedTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.FLINCHED, [ BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.TURN_END ], 0, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (pokemon.turnData) {
      pokemon.turnData.flinched = true;
    }
    if (this.sourceId) {
      const source = pokemon.scene.getPokemonById(this.sourceId);
      if (source?.battleSummonData) {
        source.battleSummonData.causedFlinchThisTurn = true;
      }
    }
    applyAbAttrs(FlinchEffectAbAttr, pokemon, null);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isMax();
  }
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.PRE_MOVE) {
    (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
      pokemon.scene.queueMessage(i18next.t("battlerTags:flinchedLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
    }

    return super.lapse(pokemon, lapseType);
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:flinchedDesc");
  }
}

export class InterruptedTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.INTERRUPTED, BattlerTagLapseType.PRE_MOVE, 0, sourceMove);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !!pokemon.getTag(BattlerTagType.FLYING);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.getMoveQueue().shift();
    pokemon.pushMoveHistory({move: Moves.NONE, result: MoveResult.OTHER});
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
    return super.lapse(pokemon, lapseType);
  }
}
export class ConfusedTag extends BattlerTag {
  constructor(turnCount: number, sourceMove: Moves) {
    super(BattlerTagType.CONFUSED, BattlerTagLapseType.MOVE, turnCount, sourceMove);
  }

  canAdd(pokemon: Pokemon): boolean {
    return pokemon.scene.arena.terrain?.terrainType !== TerrainType.MISTY || !pokemon.isGrounded();
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, CommonAnim.CONFUSION));
    pokemon.scene.queueMessage(i18next.t("battlerTags:confusedOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:confusedOnRemove", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:confusedOnOverlap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM && super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(i18next.t("battlerTags:confusedLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, CommonAnim.CONFUSION));
      if (pokemon.randSeedInt(3) === 0) {
        const atk = pokemon.getBattleStat(Stat.ATK);
        const def = pokemon.getBattleStat(Stat.DEF);
        const damage = Utils.toDmgValue(((((2 * pokemon.level / 5 + 2) * 40 * atk / def) / 50) + 2) * (pokemon.randSeedInt(15, 85) / 100));
        pokemon.scene.queueMessage(i18next.t("battlerTags:confusedLapseHurtItself"));
        pokemon.damageAndUpdate(damage);
        pokemon.battleData.hitCount++;
        (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
      }
    }

    return ret;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:confusedDesc");
  }
}
export class DestinyBondTag extends BattlerTag {
  constructor(sourceMove: Moves, sourceId: number) {
    super(BattlerTagType.DESTINY_BOND, BattlerTagLapseType.PRE_MOVE, 1, sourceMove, sourceId);
  }
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType !== BattlerTagLapseType.CUSTOM) {
      return super.lapse(pokemon, lapseType);
    }
    const source = this.sourceId ? pokemon.scene.getPokemonById(this.sourceId) : null;
    if (!source?.isFainted()) {
      return true;
    }

    if (source?.getAlly() === pokemon) {
      return false;
    }

    if (pokemon.isBossImmune()) {
      pokemon.scene.queueMessage(i18next.t("battlerTags:destinyBondLapseIsBoss", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
      return false;
    }

    pokemon.scene.queueMessage(
      i18next.t("battlerTags:destinyBondLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(source),
          pokemonNameWithAffix2: getPokemonNameWithAffix(pokemon)
        })
    );
    pokemon.damageAndUpdate(pokemon.hp, HitResult.ONE_HIT_KO, false, false, true);
    return false;
  }
}

export class InfatuatedTag extends BattlerTag {
  constructor(sourceMove: number, sourceId: number) {
    super(BattlerTagType.INFATUATED, BattlerTagLapseType.MOVE, 1, sourceMove, sourceId);
  }

  canAdd(pokemon: Pokemon): boolean {
    if (this.sourceId) {
      const pkm = pokemon.scene.getPokemonById(this.sourceId);

      if (pkm) {
        if (pkm.gender === Gender.GENDERLESS && pokemon.gender !== Gender.GENDERLESS) {
          return true;
        }
        return pokemon.isOppositeGender(pkm);
      } else  {
        console.warn("canAdd: this.sourceId is not a valid pokemon id!", this.sourceId);
        return false;
      }
    } else {
      console.warn("canAdd: this.sourceId is undefined");
      return false;
    }
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(
      i18next.t("battlerTags:infatuatedOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        sourcePokemonName: getPokemonNameWithAffix(pokemon.scene.getPokemonById(this.sourceId!) ?? undefined)
        })
    );
  }

  onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:infatuatedOnOverlap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(
        i18next.t("battlerTags:infatuatedLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          sourcePokemonName: getPokemonNameWithAffix(pokemon.scene.getPokemonById(this.sourceId!) ?? undefined)
          })
      );
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, CommonAnim.ATTRACT));

      if (pokemon.randSeedInt(2)) {
        pokemon.scene.queueMessage(i18next.t("battlerTags:infatuatedLapseImmobilize", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
        (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
      }
    }

    return ret;
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:infatuatedOnRemove", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  isSourceLinked(): boolean {
    return true;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:infatuatedDesc");
  }
}

export class SeedTag extends BattlerTag {
  private sourceIndex: number;

  constructor(sourceId: number) {
    super(BattlerTagType.SEEDED, BattlerTagLapseType.TURN_END, 1, Moves.LEECH_SEED, sourceId);
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isOfType(Type.GRASS);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:seededOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
    this.sourceIndex = pokemon.scene.getPokemonById(this.sourceId!)!.getBattlerIndex();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      const source = pokemon.getOpponents().find(o => o.getBattlerIndex() === this.sourceIndex);
      if (source) {
        const cancelled = new Utils.BooleanHolder(false);
        applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

        if (!cancelled.value) {
          pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, source.getBattlerIndex(), pokemon.getBattlerIndex(), CommonAnim.LEECH_SEED));

          const damage = pokemon.damageAndUpdate(Utils.toDmgValue(pokemon.getMaxHp() / 8));
          const reverseDrain = pokemon.hasAbilityWithAttr(ReverseDrainAbAttr, false);
          pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, source.getBattlerIndex(),
              !reverseDrain ? damage : damage * -1,
            !reverseDrain ? i18next.t("battlerTags:seededLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }) : i18next.t("battlerTags:seededLapseShed", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }),
              false, true));
        }
      }
    }

    return ret;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:seedDesc");
  }
}

export class NightmareTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.NIGHTMARE, BattlerTagLapseType.AFTER_MOVE, 1, Moves.NIGHTMARE);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:nightmareOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:nightmareOnOverlap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(i18next.t("battlerTags:nightmareLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, CommonAnim.CURSE));

      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value) {
        pokemon.damageAndUpdate(Utils.toDmgValue(pokemon.getMaxHp() / 4));
      }
    }

    return ret;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:nightmareDesc");
  }
}

export class FrenzyTag extends BattlerTag {
  constructor(turnCount: number, sourceMove: Moves, sourceId: number) {
    super(BattlerTagType.FRENZY, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    if (this.turnCount < 2) {
    pokemon.addTag(BattlerTagType.CONFUSED, pokemon.randSeedIntRange(2, 4));
  }
}
}

export class EncoreTag extends BattlerTag {
  public moveId: Moves;

  constructor(sourceId: number) {
    super(BattlerTagType.ENCORE, BattlerTagLapseType.AFTER_MOVE, 3, Moves.ENCORE, sourceId);
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.moveId = source.moveId as Moves;
  }

  canAdd(pokemon: Pokemon): boolean {
    if (pokemon.isMax()) {
      return false;
    }

    const lastMoves = pokemon.getLastXMoves(1);
    if (!lastMoves.length) {
      return false;
    }

    const repeatableMove = lastMoves[0];

    if (!repeatableMove.move || repeatableMove.virtual) {
      return false;
    }

    switch (repeatableMove.move) {
      case Moves.MIMIC:
      case Moves.MIRROR_MOVE:
      case Moves.TRANSFORM:
      case Moves.STRUGGLE:
      case Moves.SKETCH:
      case Moves.SLEEP_TALK:
      case Moves.ENCORE:
        return false;
    }

    if (allMoves[repeatableMove.move].hasAttr(ChargeAttr) && repeatableMove.result === MoveResult.OTHER) {
      return false;
    }

    this.moveId = repeatableMove.move;

    return true;
  }

  onAdd(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:encoreOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));

    const movePhase = pokemon.scene.findPhase(m => m instanceof MovePhase && m.pokemon === pokemon);
    if (movePhase) {
      const movesetMove = pokemon.getMoveset().find(m => m!.moveId === this.moveId);
      if (movesetMove) {
        const lastMove = pokemon.getLastXMoves(1)[0];
        pokemon.scene.tryReplacePhase((m => m instanceof MovePhase && m.pokemon === pokemon),
          new MovePhase(pokemon.scene, pokemon, lastMove.targets!, movesetMove));
      }
    }
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:encoreOnRemove", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }
}

export class HelpingHandTag extends BattlerTag {
  constructor(sourceId: number) {
    super(BattlerTagType.HELPING_HAND, BattlerTagLapseType.TURN_END, 1, Moves.HELPING_HAND, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:helpingHandOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon.scene.getPokemonById(this.sourceId!) ?? undefined),
        pokemonName: getPokemonNameWithAffix(pokemon)
        })
    );
  }
}
export class IngrainTag extends TrappedTag {
  constructor(sourceId: number) {
    super(BattlerTagType.INGRAIN, BattlerTagLapseType.TURN_END, 1, Moves.INGRAIN, sourceId);
  }
  canAdd(pokemon: Pokemon): boolean {
    const isTrapped = pokemon.getTag(BattlerTagType.TRAPPED);

    return !isTrapped;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.unshiftPhase(
          new PokemonHealPhase(
              pokemon.scene,
              pokemon.getBattlerIndex(),
          Utils.toDmgValue(pokemon.getMaxHp() / 16),
          i18next.t("battlerTags:ingrainLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }),
              true
          )
      );
    }

    return ret;
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:ingrainOnTrap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) });
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:ingrainDesc");
  }
}
export class OctolockTag extends TrappedTag {
  constructor(sourceId: number) {
    super(BattlerTagType.OCTOLOCK, BattlerTagLapseType.TURN_END, 1, Moves.OCTOLOCK, sourceId);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.getTag(BattlerTagType.OCTOLOCK);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const shouldLapse = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (shouldLapse) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.DEF, BattleStat.SPDEF], -1));
      return true;
    }

    return false;
  }
}

export class AquaRingTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.AQUA_RING, BattlerTagLapseType.TURN_END, 1, Moves.AQUA_RING, undefined);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:aquaRingOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.unshiftPhase(
          new PokemonHealPhase(
              pokemon.scene,
              pokemon.getBattlerIndex(),
          Utils.toDmgValue(pokemon.getMaxHp() / 16),
          i18next.t("battlerTags:aquaRingLapse", {
                moveName: this.getMoveName(),
            pokemonName: getPokemonNameWithAffix(pokemon)
              }),
              true));
    }

    return ret;
  }
}
export class MinimizeTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.MINIMIZED, BattlerTagLapseType.TURN_END, 1, Moves.MINIMIZE, undefined);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isMax();
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {

    if (pokemon.isMax()) {
      return false;
    }
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
  }
}

export class DrowsyTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.DROWSY, BattlerTagLapseType.TURN_END, 2, Moves.YAWN);
  }

  canAdd(pokemon: Pokemon): boolean {
    return pokemon.scene.arena.terrain?.terrainType !== TerrainType.ELECTRIC || !pokemon.isGrounded();
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:drowsyOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!super.lapse(pokemon, lapseType)) {
      pokemon.trySetStatus(StatusEffect.SLEEP, true);
      return false;
    }

    return true;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:drowsyDesc");
  }
}

export abstract class DamagingTrapTag extends TrappedTag {
  private commonAnim: CommonAnim;

  constructor(tagType: BattlerTagType, commonAnim: CommonAnim, turnCount: number, sourceMove: Moves, sourceId: number) {
    super(tagType, BattlerTagLapseType.TURN_END, turnCount, sourceMove, sourceId);

    this.commonAnim = commonAnim;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.commonAnim = source.commonAnim as CommonAnim;
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isOfType(Type.GHOST) && !pokemon.findTag(t => t instanceof DamagingTrapTag);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(
        i18next.t("battlerTags:damagingTrapLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            moveName: this.getMoveName()
          })
      );
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, this.commonAnim));

      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value) {
        let trapDivisor = 8;
        if (this.sourceId) {
          const source = pokemon.scene.getPokemonById(this.sourceId);
          if (source && source.hasAbility(Abilities.SHADOW_REACH)) {
            trapDivisor = 6;
          }
        }
        pokemon.damageAndUpdate(Utils.toDmgValue(pokemon.getMaxHp() / trapDivisor));
      }
    }

    return ret;
  }
}

export class BindTag extends DamagingTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.BIND, CommonAnim.BIND, turnCount, Moves.BIND, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:bindOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      sourcePokemonName: getPokemonNameWithAffix(pokemon.scene.getPokemonById(this.sourceId!) ?? undefined),
      moveName: this.getMoveName()
    });
  }
}

export class WrapTag extends DamagingTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.WRAP, CommonAnim.WRAP, turnCount, Moves.WRAP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:wrapOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      sourcePokemonName: getPokemonNameWithAffix(pokemon.scene.getPokemonById(this.sourceId!) ?? undefined),
    });
  }
}

export abstract class VortexTrapTag extends DamagingTrapTag {
  constructor(tagType: BattlerTagType, commonAnim: CommonAnim, turnCount: number, sourceMove: Moves, sourceId: number) {
    super(tagType, commonAnim, turnCount, sourceMove, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:vortexOnTrap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) });
  }
}

export class FireSpinTag extends VortexTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.FIRE_SPIN, CommonAnim.FIRE_SPIN, turnCount, Moves.FIRE_SPIN, sourceId);
  }
}

export class WhirlpoolTag extends VortexTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.WHIRLPOOL, CommonAnim.WHIRLPOOL, turnCount, Moves.WHIRLPOOL, sourceId);
  }
}

export class ClampTag extends DamagingTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.CLAMP, CommonAnim.CLAMP, turnCount, Moves.CLAMP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:clampOnTrap", {
      sourcePokemonNameWithAffix: getPokemonNameWithAffix(pokemon.scene.getPokemonById(this.sourceId!) ?? undefined),
      pokemonName: getPokemonNameWithAffix(pokemon),
    });
  }
}

export class SandTombTag extends DamagingTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.SAND_TOMB, CommonAnim.SAND_TOMB, turnCount, Moves.SAND_TOMB, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:sandTombOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: this.getMoveName()
    });
  }
}

export class MagmaStormTag extends DamagingTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.MAGMA_STORM, CommonAnim.MAGMA_STORM, turnCount, Moves.MAGMA_STORM, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:magmaStormOnTrap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) });
  }
}

export class SnapTrapTag extends DamagingTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.SNAP_TRAP, CommonAnim.SNAP_TRAP, turnCount, Moves.SNAP_TRAP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:snapTrapOnTrap", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) });
  }
}

export class ThunderCageTag extends DamagingTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.THUNDER_CAGE, CommonAnim.THUNDER_CAGE, turnCount, Moves.THUNDER_CAGE, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:thunderCageOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      sourcePokemonNameWithAffix: getPokemonNameWithAffix(pokemon.scene.getPokemonById(this.sourceId!) ?? undefined),
    });
  }
}

export class InfestationTag extends DamagingTrapTag {
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.INFESTATION, CommonAnim.INFESTATION, turnCount, Moves.INFESTATION, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:infestationOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      sourcePokemonNameWithAffix: getPokemonNameWithAffix(pokemon.scene.getPokemonById(this.sourceId!) ?? undefined),
    });
  }
}
export class ProtectedTag extends BattlerTag {
  constructor(sourceMove: Moves, tagType: BattlerTagType = BattlerTagType.PROTECTED) {
    super(tagType, BattlerTagLapseType.TURN_END, 0, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:protectedOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      new CommonBattleAnim(CommonAnim.PROTECT, pokemon).play(pokemon.scene);
      pokemon.scene.queueMessage(i18next.t("battlerTags:protectedLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase) {
        effectPhase.stopMultiHit(pokemon);
      }
      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class ContactDamageProtectedTag extends ProtectedTag {
  private damageRatio: number;

  constructor(sourceMove: Moves, damageRatio: number) {
    super(sourceMove, BattlerTagType.SPIKY_SHIELD);

    this.damageRatio = damageRatio;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.damageRatio = source.damageRatio;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        if (!attacker.hasAbilityWithAttr(BlockNonDirectDamageAbAttr)) {
          attacker.damageAndUpdate(Utils.toDmgValue(attacker.getMaxHp() * (1 / this.damageRatio)), HitResult.OTHER);
        }
      }
    }

    return ret;
  }
}

export class ContactStatChangeProtectedTag extends ProtectedTag {
  private stat: BattleStat;
  private levels: number;

  constructor(sourceMove: Moves, tagType: BattlerTagType, stat: BattleStat, levels: number) {
    super(sourceMove, tagType);

    this.stat = stat;
    this.levels = levels;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.stat = source.stat as BattleStat;
    this.levels = source.levels;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, attacker.getBattlerIndex(), true, [ this.stat ], this.levels));
      }
    }

    return ret;
  }
}

export class ContactPoisonProtectedTag extends ProtectedTag {
  constructor(sourceMove: Moves) {
    super(sourceMove, BattlerTagType.BANEFUL_BUNKER);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        attacker.trySetStatus(StatusEffect.POISON, true, pokemon);
      }
    }

    return ret;
  }
}

export class ContactBurnProtectedTag extends ProtectedTag {
  constructor(sourceMove: Moves) {
    super(sourceMove, BattlerTagType.BURNING_BULWARK);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        attacker.trySetStatus(StatusEffect.BURN, true);
      }
    }

    return ret;
  }
}

export class EnduringTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.ENDURING, BattlerTagLapseType.TURN_END, 0, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:enduringOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      pokemon.scene.queueMessage(i18next.t("battlerTags:enduringLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class SturdyTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.STURDY, BattlerTagLapseType.TURN_END, 0, sourceMove);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      pokemon.scene.queueMessage(i18next.t("battlerTags:sturdyLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class PerishSongTag extends BattlerTag {
  constructor(turnCount: number) {
    super(BattlerTagType.PERISH_SONG, BattlerTagLapseType.TURN_END, turnCount, Moves.PERISH_SONG);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isBossImmune();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(
        i18next.t("battlerTags:perishSongLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            turnCount: this.turnCount
          })
      );
    } else {
      pokemon.damageAndUpdate(pokemon.hp, HitResult.ONE_HIT_KO, false, true, true);
    }

    return ret;
  }
}
export class CenterOfAttentionTag extends BattlerTag {
  public powder: boolean;

  constructor(sourceMove: Moves) {
    super(BattlerTagType.CENTER_OF_ATTENTION, BattlerTagLapseType.TURN_END, 1, sourceMove);

    this.powder = (this.sourceMove === Moves.RAGE_POWDER);
  }
  canAdd(pokemon: Pokemon): boolean {
    const activeTeam = pokemon.isPlayer() ? pokemon.scene.getPlayerField() : pokemon.scene.getEnemyField();

    return !activeTeam.find(p => p.getTag(BattlerTagType.CENTER_OF_ATTENTION));
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:centerOfAttentionOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }
}

export class AbilityBattlerTag extends BattlerTag {
  public ability: Abilities;

  constructor(tagType: BattlerTagType, ability: Abilities, lapseType: BattlerTagLapseType, turnCount: number) {
    super(tagType, lapseType, turnCount, undefined);

    this.ability = ability;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.ability = source.ability as Abilities;
  }
}

export class TruantTag extends AbilityBattlerTag {
  constructor() {
    super(BattlerTagType.TRUANT, Abilities.TRUANT, BattlerTagLapseType.MOVE, 1);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!pokemon.hasAbility(Abilities.TRUANT) && !pokemon.hasAbility(Abilities.VACAY_SOUL)) {
      return super.lapse(pokemon, lapseType);
    }
    const passive = pokemon.getAbility().id !== Abilities.TRUANT;

    const lastMove = pokemon.getLastXMoves().find(() => true);

    if (lastMove && lastMove.move !== Moves.NONE) {
      (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
      pokemon.scene.unshiftPhase(new ShowAbilityPhase(pokemon.scene, pokemon.id, passive));
      pokemon.scene.queueMessage(i18next.t("battlerTags:truantLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
    }

    return true;
  }
}

export class SlowStartTag extends AbilityBattlerTag {
  constructor() {
    super(BattlerTagType.SLOW_START, Abilities.SLOW_START, BattlerTagLapseType.TURN_END, 5);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:slowStartOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }), null, false, null, true);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!pokemon.hasAbility(this.ability)) {
      this.turnCount = 1;
    }

    return super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:slowStartOnRemove", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }), null, false, null);
  }
}

export class HighestStatBoostTag extends AbilityBattlerTag {
  public stat: Stat;
  public multiplier: number;

  constructor(tagType: BattlerTagType, ability: Abilities) {
    super(tagType, ability, BattlerTagLapseType.CUSTOM, 1);
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.stat = source.stat as Stat;
    this.multiplier = source.multiplier;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    const stats = [ Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD ];
    let highestStat: Stat;
    stats.map(s => pokemon.getBattleStat(s)).reduce((highestValue: number, value: number, i: number) => {
      if (value > highestValue) {
        highestStat = stats[i];
        return value;
      }
      return highestValue;
    }, 0);

    highestStat = highestStat!;
    this.stat = highestStat;

    switch (this.stat) {
      case Stat.SPD:
        this.multiplier = 1.5;
        break;
      default:
        this.multiplier = 1.3;
        break;
    }

    pokemon.scene.queueMessage(i18next.t("battlerTags:highestStatBoostOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), statName: getStatName(highestStat) }), null, false, null, true);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:highestStatBoostOnRemove", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon), abilityName: allAbilities[this.ability].name }));
  }
}

export class WeatherHighestStatBoostTag extends HighestStatBoostTag implements WeatherBattlerTag {
  public weatherTypes: WeatherType[];

  constructor(tagType: BattlerTagType, ability: Abilities, ...weatherTypes: WeatherType[]) {
    super(tagType, ability);
    this.weatherTypes = weatherTypes;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.weatherTypes = source.weatherTypes.map(w => w as WeatherType);
  }
}

export class TerrainHighestStatBoostTag extends HighestStatBoostTag implements TerrainBattlerTag {
  public terrainTypes: TerrainType[];

  constructor(tagType: BattlerTagType, ability: Abilities, ...terrainTypes: TerrainType[]) {
    super(tagType, ability);
    this.terrainTypes = terrainTypes;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.terrainTypes = source.terrainTypes.map(w => w as TerrainType);
  }
}

export class SemiInvulnerableTag extends BattlerTag {
  constructor(tagType: BattlerTagType, turnCount: number, sourceMove: Moves) {
    super(tagType, BattlerTagLapseType.MOVE_EFFECT, turnCount, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.setVisible(false);
  }

  onRemove(pokemon: Pokemon): void {

    pokemon.scene.tweens.addCounter({
      duration: Utils.getFrameMs(2),
      onComplete: () => pokemon.setVisible(true)
    });
  }
}

export class TypeImmuneTag extends BattlerTag {
  public immuneType: Type;

  constructor(tagType: BattlerTagType, sourceMove: Moves, immuneType: Type, length: number = 1) {
    super(tagType, BattlerTagLapseType.TURN_END, length, sourceMove);

    this.immuneType = immuneType;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.immuneType = source.immuneType as Type;
  }
}

export class MagnetRisenTag extends TypeImmuneTag {
  constructor(tagType: BattlerTagType, sourceMove: Moves) {
    super(tagType, sourceMove, Type.GROUND, 5);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:magnetRisenOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:magnetRisenOnRemove", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }
}

export class TypeBoostTag extends BattlerTag {
  public boostedType: Type;
  public boostValue: number;
  public oneUse: boolean;

  constructor(tagType: BattlerTagType, sourceMove: Moves, boostedType: Type, boostValue: number, oneUse: boolean) {
    super(tagType, BattlerTagLapseType.TURN_END, 1, sourceMove);

    this.boostedType = boostedType;
    this.boostValue = boostValue;
    this.oneUse = oneUse;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.boostedType = source.boostedType as Type;
    this.boostValue = source.boostValue;
    this.oneUse = source.oneUse;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }
}

export class CritBoostTag extends BattlerTag {
  constructor(tagType: BattlerTagType, sourceMove: Moves) {
    super(tagType, BattlerTagLapseType.TURN_END, 1, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:critBoostOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:critBoostOnRemove", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
  }
}

export class SaltCuredTag extends BattlerTag {
  private sourceIndex: number;

  constructor(sourceId: number) {
    super(BattlerTagType.SALT_CURED, BattlerTagLapseType.TURN_END, 1, Moves.SALT_CURE, sourceId);
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(i18next.t("battlerTags:saltCuredOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
    this.sourceIndex = pokemon.scene.getPokemonById(this.sourceId!)!.getBattlerIndex();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), pokemon.getBattlerIndex(), CommonAnim.SALT_CURE));

      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value) {
        const pokemonSteelOrWater = pokemon.isOfType(Type.STEEL) || pokemon.isOfType(Type.WATER);
        pokemon.damageAndUpdate(Utils.toDmgValue(pokemonSteelOrWater ? pokemon.getMaxHp() / 4 : pokemon.getMaxHp() / 8));

        pokemon.scene.queueMessage(
          i18next.t("battlerTags:saltCuredLapse", {
              pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
              moveName: this.getMoveName()
            })
        );
      }
    }

    return ret;
  }
}

export class CursedTag extends BattlerTag {
  private sourceIndex: number;

  constructor(sourceId: number) {
    super(BattlerTagType.CURSED, BattlerTagLapseType.TURN_END, 1, Moves.CURSE, sourceId);
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    this.sourceIndex = pokemon.scene.getPokemonById(this.sourceId!)!.getBattlerIndex();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), pokemon.getBattlerIndex(), CommonAnim.SALT_CURE));

      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value) {
        pokemon.damageAndUpdate(Utils.toDmgValue(pokemon.getMaxHp() / 4));
        pokemon.scene.queueMessage(i18next.t("battlerTags:cursedLapse", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }));
      }
    }

    return ret;
  }
}
export class GroundedTag extends BattlerTag {
  constructor(tagType: BattlerTagType, lapseType: BattlerTagLapseType, sourceMove: Moves) {
    super(tagType, lapseType, 1, sourceMove);
  }
}
export class FormBlockDamageTag extends BattlerTag {
  constructor(tagType: BattlerTagType) {
    super(tagType, BattlerTagLapseType.CUSTOM, 1);
  }
  canAdd(pokemon: Pokemon): boolean {
    return pokemon.formIndex === 0;
  }
  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (pokemon.formIndex !== 0) {
      pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger);
    }
  }
  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger);
  }
}
export class IceFaceBlockDamageTag extends FormBlockDamageTag {
  constructor(tagType: BattlerTagType) {
    super(tagType);
  }
  canAdd(pokemon: Pokemon): boolean {
    const weatherType = pokemon.scene.arena.weather?.weatherType;
    const isWeatherSnowOrHail = weatherType === WeatherType.HAIL || weatherType === WeatherType.SNOW;

    return super.canAdd(pokemon) || isWeatherSnowOrHail;
  }
}
export class StockpilingTag extends BattlerTag {
  public stockpiledCount: number = 0;
  public statChangeCounts: { [BattleStat.DEF]: number; [BattleStat.SPDEF]: number } = {
    [BattleStat.DEF]: 0,
    [BattleStat.SPDEF]: 0
  };

  constructor(sourceMove: Moves = Moves.NONE) {
    super(BattlerTagType.STOCKPILING, BattlerTagLapseType.CUSTOM, 1, sourceMove);
  }

  private onStatsChanged: StatChangeCallback = (_, statsChanged, statChanges) => {
    const defChange = statChanges[statsChanged.indexOf(BattleStat.DEF)] ?? 0;
    const spDefChange = statChanges[statsChanged.indexOf(BattleStat.SPDEF)] ?? 0;

    if (defChange) {
      this.statChangeCounts[BattleStat.DEF]++;
    }

    if (spDefChange) {
      this.statChangeCounts[BattleStat.SPDEF]++;
    }
  };

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.stockpiledCount = source.stockpiledCount || 0;
    this.statChangeCounts = {
      [ BattleStat.DEF ]: source.statChangeCounts?.[ BattleStat.DEF ] ?? 0,
      [ BattleStat.SPDEF ]: source.statChangeCounts?.[ BattleStat.SPDEF ] ?? 0,
    };
  }
  onAdd(pokemon: Pokemon): void {
    if (this.stockpiledCount < 3) {
      this.stockpiledCount++;

      pokemon.scene.queueMessage(i18next.t("battlerTags:stockpilingOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        stockpiledCount: this.stockpiledCount
      }));
      pokemon.scene.unshiftPhase(new StatChangePhase(
        pokemon.scene, pokemon.getBattlerIndex(), true,
        [BattleStat.SPDEF, BattleStat.DEF], 1, true, false, true, this.onStatsChanged
      ));
    }
  }

  onOverlap(pokemon: Pokemon): void {
    this.onAdd(pokemon);
  }
  onRemove(pokemon: Pokemon): void {
    const defChange = this.statChangeCounts[BattleStat.DEF];
    const spDefChange = this.statChangeCounts[BattleStat.SPDEF];

    if (defChange) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.DEF], -defChange, true, false, true));
    }

    if (spDefChange) {
      pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [BattleStat.SPDEF], -spDefChange, true, false, true));
    }
  }
    }
export class GulpMissileTag extends BattlerTag {
  constructor(tagType: BattlerTagType, sourceMove: Moves) {
    super(tagType, BattlerTagLapseType.CUSTOM, 0, sourceMove);
  }
  canAdd(pokemon: Pokemon): boolean {
    const isSurfOrDive = [ Moves.SURF, Moves.DIVE ].includes(this.sourceMove);
    const isNormalForm = pokemon.formIndex === 0 && !pokemon.getTag(BattlerTagType.GULP_MISSILE_ARROKUDA) && !pokemon.getTag(BattlerTagType.GULP_MISSILE_PIKACHU);
    const isCramorant = pokemon.species.speciesId === Species.CRAMORANT;

    return isSurfOrDive && isNormalForm && isCramorant;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
      pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger);
    }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeManualTrigger);
  }
}
export class ExposedTag extends BattlerTag {
  private defenderType: Type;
  private allowedTypes: Type[];

  constructor(tagType: BattlerTagType, sourceMove: Moves, defenderType: Type, allowedTypes: Type[]) {
    super(tagType, BattlerTagLapseType.CUSTOM, 1, sourceMove);
    this.defenderType = defenderType;
    this.allowedTypes = allowedTypes;
  }
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.defenderType = source.defenderType as Type;
    this.allowedTypes = source.allowedTypes as Type[];
  }
  ignoreImmunity(type: Type, moveType: Type): boolean {
    return type === this.defenderType && this.allowedTypes.includes(moveType);
  }
}

export class SubstituteTag extends BattlerTag {
  public hp: number;

  constructor(sourceMove?: Moves, sourceId?: number) {
    super(BattlerTagType.SUBSTITUTE, BattlerTagLapseType.CUSTOM, 0, sourceMove, sourceId);
    this.hp = 0;
  }

  onAdd(pokemon: Pokemon): void {
    this.hp = Math.floor(pokemon.getMaxHp() / 4);
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:substituteOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
    this.showDollSprite(pokemon);
  }

  onRemove(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:substituteOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
    this.hideDollSprite(pokemon);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return this.hp > 0;
  }

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.hp = source.hp;
  }

  private showDollSprite(pokemon: Pokemon): void {
    if ((pokemon as any).portalSprite) {
      const ps = (pokemon as any).portalSprite;
      (pokemon as any)._subPortalSnapshot = {
        x: ps.x, y: ps.y,
        scaleX: ps.scaleX, scaleY: ps.scaleY,
        visible: ps.visible
      };
    }
    const dollKey = pokemon.isPlayer() ? "pkmn__back__sub" : "pkmn__sub";
    try {
      if (pokemon.usesCustomFieldSpriteLayout()) {
        pokemon.setScale(1);
        const sprite = pokemon.getSprite();
        sprite.setPosition(0, 0);
        sprite.setScale(1);
        sprite.setFlipX(false);
        const tintSprite = pokemon.getTintSprite();
        if (tintSprite) {
          tintSprite.setPosition(0, 0);
          tintSprite.setScale(1);
          tintSprite.setFlipX(false);
        }
        if ((pokemon as any).portalSprite) {
          (pokemon as any).portalSprite.setVisible(false);
        }
        if ((pokemon as any).portalSprite && (pokemon as any)._subPortalSnapshot) {
          const snap = (pokemon as any)._subPortalSnapshot;
          const ps = (pokemon as any).portalSprite;
          const scaleRatio = YU_BASE_CONTAINER_SCALE;
          ps.setScale(snap.scaleX * scaleRatio, snap.scaleY * scaleRatio);
          ps.setPosition(snap.x, snap.y);
          ps.setVisible(snap.visible);
        }
      }
      const sprite = pokemon.getSprite();
      sprite.setTexture(dollKey);
      sprite.setFrame(0);
      sprite.stop();
      const tintSprite = pokemon.getTintSprite();
      if (tintSprite) {
        tintSprite.setTexture(dollKey);
        tintSprite.setFrame(0);
        tintSprite.stop();
      }
    } catch {}
  }

  private hideDollSprite(pokemon: Pokemon): void {
    try {
      const key = pokemon.getBattleSpriteKey();
      const sprite = pokemon.getSprite();
      sprite.setTexture(key);
      sprite.setFrame(0);
      if (sprite.anims && sprite.anims.exists(key)) {
        sprite.play(key);
      }
      const tintSprite = pokemon.getTintSprite();
      if (tintSprite) {
        tintSprite.setTexture(key);
        tintSprite.setFrame(0);
        if (tintSprite.anims && tintSprite.anims.exists(key)) {
          tintSprite.play(key);
        }
      }
      if (pokemon.usesCustomFieldSpriteLayout()) {
        pokemon.updateScale();
        pokemon.applySpriteState();
        pokemon.applyYuBackFlip();
        if ((pokemon as any).portalSprite) {
          (pokemon as any).portalSprite.setVisible(true);
        }
      }
    } catch {}
  }
}

export class TauntTag extends BattlerTag {
  constructor(sourceMove?: Moves, sourceId?: number) {
    super(BattlerTagType.TAUNTED, BattlerTagLapseType.TURN_END, 3, sourceMove, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:tauntOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
  }

  onRemove(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:tauntOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return super.lapse(pokemon, lapseType);
  }
}

export class TormentTag extends BattlerTag {
  constructor(sourceMove?: Moves, sourceId?: number) {
    super(BattlerTagType.TORMENT, BattlerTagLapseType.CUSTOM, 0, sourceMove, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:tormentOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
  }

  onRemove(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:tormentOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return true;
  }

  override isSourceLinked(): boolean {
    return true;
  }
}

export class HealBlockedTag extends BattlerTag {
  constructor(turnCount: number, sourceMove?: Moves, sourceId?: number) {
    super(BattlerTagType.HEAL_BLOCKED, BattlerTagLapseType.TURN_END, turnCount, sourceMove, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:healBlockedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
  }

  onRemove(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:healBlockedOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
  }
}

export class ItemBlockedTag extends BattlerTag {
  constructor(turnCount: number, sourceMove?: Moves, sourceId?: number) {
    super(BattlerTagType.ITEM_BLOCKED, BattlerTagLapseType.TURN_END, turnCount, sourceMove, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:itemBlockedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
  }

  onRemove(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(
      i18next.t("battlerTags:itemBlockedOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      })
    );
  }
}

export class ToonImmunityTag extends BattlerTag {
  constructor(turnCount: integer, sourceMove?: Moves, sourceId?: integer) {
    super(BattlerTagType.TOON_IMMUNITY, BattlerTagLapseType.TURN_END, turnCount, sourceMove, sourceId);
  }

  onHit(_target: Pokemon, _source: Pokemon, _move: Move, hitResult: HitResult): boolean {
    if (hitResult === HitResult.CRIT) {
      return false;
    }
    if (hitResult === HitResult.SUPER_EFFECTIVE || hitResult === HitResult.ONE_HIT_KO) {
      return false;
    }
    return true;
  }
}

export function getBattlerTag(tagType: BattlerTagType, turnCount: number, sourceMove: Moves, sourceId: number): BattlerTag {
  switch (tagType) {
    case BattlerTagType.RECHARGING:
      return new RechargingTag(sourceMove);
  case BattlerTagType.BEAK_BLAST_CHARGING:
    return new BeakBlastChargingTag();
  case BattlerTagType.SHELL_TRAP:
    return new ShellTrapTag();
    case BattlerTagType.FLINCHED:
      return new FlinchedTag(sourceMove);
    case BattlerTagType.INTERRUPTED:
      return new InterruptedTag(sourceMove);
    case BattlerTagType.CONFUSED:
      return new ConfusedTag(turnCount, sourceMove);
    case BattlerTagType.INFATUATED:
      return new InfatuatedTag(sourceMove, sourceId);
    case BattlerTagType.SEEDED:
      return new SeedTag(sourceId);
    case BattlerTagType.NIGHTMARE:
      return new NightmareTag();
    case BattlerTagType.FRENZY:
    return new FrenzyTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.CHARGING:
    return new BattlerTag(tagType, BattlerTagLapseType.CUSTOM, 1, sourceMove, sourceId);
    case BattlerTagType.ENCORE:
      return new EncoreTag(sourceId);
    case BattlerTagType.HELPING_HAND:
      return new HelpingHandTag(sourceId);
    case BattlerTagType.INGRAIN:
      return new IngrainTag(sourceId);
    case BattlerTagType.AQUA_RING:
      return new AquaRingTag();
    case BattlerTagType.DROWSY:
      return new DrowsyTag();
    case BattlerTagType.TRAPPED:
      return new TrappedTag(tagType, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
    case BattlerTagType.YU_TRAPPED:
      return new YuTrappedTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.BIND:
      return new BindTag(turnCount, sourceId);
    case BattlerTagType.WRAP:
      return new WrapTag(turnCount, sourceId);
    case BattlerTagType.FIRE_SPIN:
      return new FireSpinTag(turnCount, sourceId);
    case BattlerTagType.WHIRLPOOL:
      return new WhirlpoolTag(turnCount, sourceId);
    case BattlerTagType.CLAMP:
      return new ClampTag(turnCount, sourceId);
    case BattlerTagType.SAND_TOMB:
      return new SandTombTag(turnCount, sourceId);
    case BattlerTagType.MAGMA_STORM:
      return new MagmaStormTag(turnCount, sourceId);
    case BattlerTagType.SNAP_TRAP:
      return new SnapTrapTag(turnCount, sourceId);
    case BattlerTagType.THUNDER_CAGE:
      return new ThunderCageTag(turnCount, sourceId);
    case BattlerTagType.INFESTATION:
      return new InfestationTag(turnCount, sourceId);
    case BattlerTagType.PROTECTED:
      return new ProtectedTag(sourceMove);
    case BattlerTagType.SPIKY_SHIELD:
      return new ContactDamageProtectedTag(sourceMove, 8);
    case BattlerTagType.KINGS_SHIELD:
      return new ContactStatChangeProtectedTag(sourceMove, tagType, BattleStat.ATK, -1);
    case BattlerTagType.OBSTRUCT:
      return new ContactStatChangeProtectedTag(sourceMove, tagType, BattleStat.DEF, -2);
    case BattlerTagType.SILK_TRAP:
      return new ContactStatChangeProtectedTag(sourceMove, tagType, BattleStat.SPD, -1);
    case BattlerTagType.BANEFUL_BUNKER:
      return new ContactPoisonProtectedTag(sourceMove);
    case BattlerTagType.BURNING_BULWARK:
      return new ContactBurnProtectedTag(sourceMove);
    case BattlerTagType.ENDURING:
      return new EnduringTag(sourceMove);
    case BattlerTagType.STURDY:
      return new SturdyTag(sourceMove);
    case BattlerTagType.PERISH_SONG:
      return new PerishSongTag(turnCount);
    case BattlerTagType.CENTER_OF_ATTENTION:
      return new CenterOfAttentionTag(sourceMove);
    case BattlerTagType.TRUANT:
      return new TruantTag();
    case BattlerTagType.SLOW_START:
      return new SlowStartTag();
    case BattlerTagType.PROTOSYNTHESIS:
      return new WeatherHighestStatBoostTag(tagType, Abilities.PROTOSYNTHESIS, WeatherType.SUNNY, WeatherType.HARSH_SUN);
    case BattlerTagType.QUARK_DRIVE:
      return new TerrainHighestStatBoostTag(tagType, Abilities.QUARK_DRIVE, TerrainType.ELECTRIC);
    case BattlerTagType.FLYING:
    case BattlerTagType.UNDERGROUND:
    case BattlerTagType.UNDERWATER:
    case BattlerTagType.HIDDEN:
    return new SemiInvulnerableTag(tagType, turnCount, sourceMove);
    case BattlerTagType.FIRE_BOOST:
      return new TypeBoostTag(tagType, sourceMove, Type.FIRE, 1.5, false);
    case BattlerTagType.CRIT_BOOST:
      return new CritBoostTag(tagType, sourceMove);
    case BattlerTagType.ALWAYS_CRIT:
    case BattlerTagType.IGNORE_ACCURACY:
    return new BattlerTag(tagType, BattlerTagLapseType.TURN_END, 2, sourceMove);
  case BattlerTagType.ALWAYS_GET_HIT:
  case BattlerTagType.RECEIVE_DOUBLE_DAMAGE:
    return new BattlerTag(tagType, BattlerTagLapseType.PRE_MOVE, 1, sourceMove);
    case BattlerTagType.BYPASS_SLEEP:
    return new BattlerTag(tagType, BattlerTagLapseType.TURN_END, turnCount, sourceMove);
    case BattlerTagType.IGNORE_FLYING:
    return new GroundedTag(tagType, BattlerTagLapseType.CUSTOM, sourceMove);
  case BattlerTagType.ROOSTED:
    return new GroundedTag(tagType, BattlerTagLapseType.TURN_END, sourceMove);
    case BattlerTagType.SALT_CURED:
      return new SaltCuredTag(sourceId);
    case BattlerTagType.CURSED:
      return new CursedTag(sourceId);
    case BattlerTagType.CHARGED:
      return new TypeBoostTag(tagType, sourceMove, Type.ELECTRIC, 2, true);

    case BattlerTagType.FIRE_CHARGED:
      return new TypeBoostTag(BattlerTagType.FIRE_CHARGED, sourceMove, Type.FIRE, 2, true);
    case BattlerTagType.WATER_CHARGED:
      return new TypeBoostTag(BattlerTagType.WATER_CHARGED, sourceMove, Type.WATER, 2, true);
    case BattlerTagType.PSYCHIC_CHARGED:
      return new TypeBoostTag(BattlerTagType.PSYCHIC_CHARGED, sourceMove, Type.PSYCHIC, 2, true);
    case BattlerTagType.ROCK_CHARGED:
      return new TypeBoostTag(BattlerTagType.ROCK_CHARGED, sourceMove, Type.ROCK, 2, true);
    case BattlerTagType.MAGNET_RISEN:
      return new MagnetRisenTag(tagType, sourceMove);
    case BattlerTagType.MINIMIZED:
      return new MinimizeTag();
    case BattlerTagType.DESTINY_BOND:
      return new DestinyBondTag(sourceMove, sourceId);
    case BattlerTagType.ICE_FACE:
    return new IceFaceBlockDamageTag(tagType);
  case BattlerTagType.DISGUISE:
    return new FormBlockDamageTag(tagType);
  case BattlerTagType.STOCKPILING:
    return new StockpilingTag(sourceMove);
  case BattlerTagType.OCTOLOCK:
    return new OctolockTag(sourceId);
  case BattlerTagType.IGNORE_GHOST:
    return new ExposedTag(tagType, sourceMove, Type.GHOST, [Type.NORMAL, Type.FIGHTING]);
  case BattlerTagType.IGNORE_DARK:
    return new ExposedTag(tagType, sourceMove, Type.DARK, [Type.PSYCHIC]);
  case BattlerTagType.GULP_MISSILE_ARROKUDA:
  case BattlerTagType.GULP_MISSILE_PIKACHU:
    return new GulpMissileTag(tagType, sourceMove);
    case BattlerTagType.SUBSTITUTE:
      return new SubstituteTag(sourceMove, sourceId);
    case BattlerTagType.TAUNTED:
      return new TauntTag(sourceMove, sourceId);
    case BattlerTagType.TORMENT:
      return new TormentTag(sourceMove, sourceId);
    case BattlerTagType.HEAL_BLOCKED:
      return new HealBlockedTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.ITEM_BLOCKED:
      return new ItemBlockedTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.TOON_IMMUNITY:
      return new ToonImmunityTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.CRIT_PROTECT:
      return new BattlerTag(tagType, BattlerTagLapseType.TURN_END, turnCount, sourceMove, sourceId);
    case BattlerTagType.SUPER_CONDUCTOR_CHARGED:
      return new BattlerTag(tagType, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
    case BattlerTagType.NONE:
    default:
      return new BattlerTag(tagType, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
  }
}
export function loadBattlerTag(source: BattlerTag | any): BattlerTag {
  const tag = getBattlerTag(source.tagType, source.turnCount, source.sourceMove, source.sourceId);
  tag.loadTag(source);
  return tag;
}