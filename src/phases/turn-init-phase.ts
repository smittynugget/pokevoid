import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { TurnInitEvent } from "#app/events/battle-scene.js";
import { PlayerPokemon } from "#app/field/pokemon.js";
import i18next from "i18next";
import { FieldPhase } from "./field-phase";
import { ToggleDoublePositionPhase } from "./toggle-double-position-phase";
import { CommandPhase } from "./command-phase";
import { EnemyCommandPhase } from "./enemy-command-phase";
import { GameOverPhase } from "./game-over-phase";
import { TurnStartPhase } from "./turn-start-phase";

export class TurnInitPhase extends FieldPhase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    super.start();

    this.scene.getPlayerField().forEach(p => {

      if (p.isOnField() && !p.isAllowedInBattle()) {
        this.scene.queueMessage(i18next.t("challenges:illegalEvolution", { "pokemon": p.name }), null, true);

        const allowedPokemon = this.scene.getParty().filter(p => p.isAllowedInBattle());

        if (!allowedPokemon.length) {

          this.scene.clearPhaseQueue();
          this.scene.unshiftPhase(new GameOverPhase(this.scene));
        } else if (allowedPokemon.length >= this.scene.currentBattle.getBattlerCount() || (this.scene.currentBattle.double && !allowedPokemon[0].isActive(true))) {

          p.switchOut(false);
        } else {
          p.leaveField();
        }
        if (allowedPokemon.length === 1 && this.scene.currentBattle.double) {
          this.scene.unshiftPhase(new ToggleDoublePositionPhase(this.scene, true));
        }
      }
    });
    this.scene.eventTarget.dispatchEvent(new TurnInitEvent());

    this.scene.getField().forEach((pokemon, i) => {
      if (pokemon?.isActive()) {
        if (pokemon.isPlayer()) {
          this.scene.currentBattle.addParticipant(pokemon as PlayerPokemon);
        }

        pokemon.resetTurnData();

        this.scene.pushPhase(pokemon.isPlayer() ? new CommandPhase(this.scene, i) : new EnemyCommandPhase(this.scene, i - BattlerIndex.ENEMY));
      }
    });

    this.scene.pushPhase(new TurnStartPhase(this.scene));

    this.end();
  }
}