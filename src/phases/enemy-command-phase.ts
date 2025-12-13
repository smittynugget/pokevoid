import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import { applyCheckTrappedAbAttrs, CheckTrappedAbAttr } from "#app/data/ability.js";
import { TrappedTag } from "#app/data/battler-tags.js";
import { Command } from "#app/ui/command-ui-handler.js";
import * as Utils from "#app/utils.js";
import { FieldPhase } from "./field-phase";
export class EnemyCommandPhase extends FieldPhase {
  protected fieldIndex: integer;

  constructor(scene: BattleScene, fieldIndex: integer) {
    super(scene);

    this.fieldIndex = fieldIndex;
  }

  start() {
    super.start();

    const enemyPokemon = this.scene.getEnemyField()[this.fieldIndex];

    const battle = this.scene.currentBattle;

    const trainer = battle.trainer;
    if (trainer && !enemyPokemon.getMoveQueue().length) {
      const opponents = enemyPokemon.getOpponents();

      const trapTag = enemyPokemon.findTag(t => t instanceof TrappedTag) as TrappedTag;
      const trapped = new Utils.BooleanHolder(false);
      opponents.forEach(playerPokemon => applyCheckTrappedAbAttrs(CheckTrappedAbAttr, playerPokemon, trapped, enemyPokemon, [""], true));
      if (!trapTag && !trapped.value) {
        const partyMemberScores = trainer.getPartyMemberMatchupScores(enemyPokemon.trainerSlot, true);

        if (partyMemberScores.length) {
          const matchupScores = opponents.map(opp => enemyPokemon.getMatchupScore(opp));
          const matchupScore = matchupScores.reduce((total, score) => total += score, 0) / matchupScores.length;

          const sortedPartyMemberScores = trainer.getSortedPartyMemberMatchupScores(partyMemberScores);

          const switchMultiplier = 1 - (battle.enemySwitchCounter ? Math.pow(0.1, (1 / battle.enemySwitchCounter)) : 0);

          if (sortedPartyMemberScores[0][1] * switchMultiplier >= matchupScore * (trainer.config.isBoss ? 2 : 3)) {
            const index = trainer.getNextSummonIndex(enemyPokemon.trainerSlot, partyMemberScores);

            battle.turnCommands[this.fieldIndex + BattlerIndex.ENEMY] =
                { command: Command.POKEMON, cursor: index, args: [false] };

            battle.enemySwitchCounter++;

            return this.end();
          }
        }
      }
    }
    const nextMove = enemyPokemon.getNextMove();

    this.scene.currentBattle.turnCommands[this.fieldIndex + BattlerIndex.ENEMY] =
        { command: Command.FIGHT, move: nextMove };

    this.scene.currentBattle.enemySwitchCounter = Math.max(this.scene.currentBattle.enemySwitchCounter - 1, 0);

    this.end();
  }
}