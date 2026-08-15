import BattleScene from "#app/battle-scene.js";
import { applyPostTurnAbAttrs, PostTurnAbAttr } from "#app/data/ability.js";
import { BattlerTagLapseType } from "#app/data/battler-tags.js";
import { allMoves } from "#app/data/move.js";
import { TerrainType } from "#app/data/terrain.js";
import { Moves } from "#app/enums/moves.js";
import { WeatherType } from "#app/enums/weather-type.js";
import { TurnEndEvent } from "#app/events/battle-scene.js";
import Pokemon, { PokemonMove } from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { TurnHealModifier, EnemyTurnHealModifier, EnemyStatusEffectHealChanceModifier, TurnStatusEffectModifier, TurnHeldItemTransferModifier } from "#app/modifier/modifier.js";
import i18next from "i18next";
import { FieldPhase } from "./field-phase";
import { MessagePhase } from "./message-phase";
import { PokemonHealPhase } from "./pokemon-heal-phase";
import { MoveEffectPhase } from "./move-effect-phase";
import { BattlerTagType } from "#enums/battler-tag-type.js";
import * as Utils from "../utils";
export class TurnEndPhase extends FieldPhase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    super.start();

    this.scene.currentBattle.incrementTurn(this.scene);
    this.scene.eventTarget.dispatchEvent(new TurnEndEvent(this.scene.currentBattle.turn));

    const handlePokemon = (pokemon: Pokemon) => {
      pokemon.lapseTags(BattlerTagLapseType.TURN_END);

      if (pokemon.summonData.disabledMove && !--pokemon.summonData.disabledTurns) {
        this.scene.pushPhase(new MessagePhase(this.scene, i18next.t("battle:notDisabled", { pokemonName: getPokemonNameWithAffix(pokemon), moveName: allMoves[pokemon.summonData.disabledMove].name })));
        pokemon.summonData.disabledMove = Moves.NONE;
      }

      if (pokemon.summonData.abilitySuppressTurns > 0 && !--pokemon.summonData.abilitySuppressTurns) {
        pokemon.summonData.abilitySuppressed = false;
      }

      const sched = pokemon.summonData.scheduledRepeatMove;
      if (sched && this.scene.currentBattle.turn >= sched.executeTurn) {
        pokemon.summonData.scheduledRepeatMove = undefined;
        const echoTarget = this.scene.getPokemonById(sched.targetId);
        if (pokemon.isActive(true) && echoTarget?.isActive(true)) {
          this.scene.unshiftPhase(new MoveEffectPhase(
            this.scene,
            pokemon.id,
            [echoTarget.getBattlerIndex()],
            new PokemonMove(sched.moveId, 0, 0, true)
          ));
        }
      }

      const delayedTrap = pokemon.summonData.delayedTrap;
      if (delayedTrap && this.scene.currentBattle.turn >= delayedTrap.executeTurn) {
        pokemon.summonData.delayedTrap = undefined;
        if (pokemon.isActive(true)) {
          pokemon.addTag(BattlerTagType.TRAPPED, 2, delayedTrap.sourceMove, delayedTrap.sourceId);
        }
      }

      this.scene.applyModifiers(TurnHealModifier, pokemon.isPlayer(), pokemon);

      if (this.scene.arena.terrain?.terrainType === TerrainType.GRASSY && pokemon.isGrounded()) {
        this.scene.unshiftPhase(new PokemonHealPhase(this.scene, pokemon.getBattlerIndex(),
          Math.max(pokemon.getMaxHp() >> 4, 1), i18next.t("battle:turnEndHpRestore", { pokemonName: getPokemonNameWithAffix(pokemon) }), true));
      }

      if (!pokemon.isPlayer()) {
        this.scene.applyModifiers(EnemyTurnHealModifier, false, pokemon);
        this.scene.applyModifier(EnemyStatusEffectHealChanceModifier, false, pokemon);
      }

      applyPostTurnAbAttrs(PostTurnAbAttr, pokemon);

      pokemon.battleSummonData.flinchedLastTurn = !!pokemon.turnData.flinched;
      pokemon.battleSummonData.fullParaLastTurn = !!pokemon.turnData.fullParaThisTurn;
      pokemon.battleSummonData.causedFlinchLastTurn = pokemon.battleSummonData.causedFlinchThisTurn;
      pokemon.battleSummonData.causedFlinchThisTurn = false;
      pokemon.battleSummonData.chargeReleasedLastTurn = pokemon.turnData.chargeReleasedThisTurn;

      this.scene.applyModifiers(TurnStatusEffectModifier, pokemon.isPlayer(), pokemon);

      if(Utils.randSeedInt(100) <= 40) {
        this.scene.applyModifiers(TurnHeldItemTransferModifier, pokemon.isPlayer(), pokemon);
      }

      pokemon.battleSummonData.turnCount++;
    };

    this.executeForAll(handlePokemon);

    this.scene.arena.lapseTags();

    if (this.scene.arena.weather && !this.scene.arena.weather.lapse()) {
      this.scene.arena.trySetWeather(WeatherType.NONE, false);
      this.scene.arena.triggerWeatherBasedFormChangesToNormal();
    }

    if (this.scene.arena.terrain && !this.scene.arena.terrain.lapse()) {
      this.scene.arena.trySetTerrain(TerrainType.NONE, false);
    }

    this.end();
  }
}