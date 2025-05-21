import { applyPostBattleAbAttrs, PostBattleAbAttr } from "#app/data/ability.js";
import { LapsingPersistentModifier, LapsingPokemonHeldItemModifier } from "#app/modifier/modifier.js";
import { BattlePhase } from "./battle-phase";
import { GameOverPhase } from "./game-over-phase";
import {BattleType} from "#app/battle";
import {PermaWinQuestModifier} from "#app/modifier/modifier";
import {PermaType} from "#app/modifier/perma-modifiers";
import * as Utils from "#app/utils";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import {TrainerVictoryPhase} from "#app/phases/trainer-victory-phase";

export class BattleEndPhase extends BattlePhase {
  start() {
    super.start();

    this.scene.currentBattle.addBattleScore(this.scene);
    const isTrainer = this.scene.currentBattle.battleType == BattleType.TRAINER;
    const isRivalTrainer = isTrainer && this.scene.currentBattle.trainer?.isDynamicRival;
    let betterRewardChance = isRivalTrainer ? 100 : 15;

    if(Utils.randSeedInt(100) < betterRewardChance) {
      if(isTrainer) {
        this.scene.addPhaseAfterTarget(new ModifierRewardPhase(this.scene, null, true, null, isRivalTrainer), TrainerVictoryPhase);
      }
      else {
        this.scene.unshiftPhase(new ModifierRewardPhase(
            this.scene, null, true,
        ));
      }

    }
    else {

      let moneyMultiplier = isTrainer ? this.scene.currentBattle.trainer?.config.moneyMultiplier! : 0.55;

      if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_POST_BATTLE_MONEY_3)) {
        moneyMultiplier += 0.6;
      } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_POST_BATTLE_MONEY_2)) {
        moneyMultiplier += 0.4;
      } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_POST_BATTLE_MONEY_1)) {
        moneyMultiplier += 0.2;
      }

      this.scene.currentBattle.moneyScattered += this.scene.getWaveMoneyAmount(moneyMultiplier);
      this.scene.currentBattle.pickUpScatteredMoney(this.scene);

      this.scene.gameData.reducePermaModifierByType([
        PermaType.PERMA_POST_BATTLE_MONEY_1,
        PermaType.PERMA_POST_BATTLE_MONEY_2,
        PermaType.PERMA_POST_BATTLE_MONEY_3
      ], this.scene);
    }

    this.scene.gameData.gameStats.battles++;
    if (this.scene.currentBattle.trainer) {
      this.scene.gameData.gameStats.trainersDefeated++;
    }
    if (this.scene.gameMode.isEndless && this.scene.currentBattle.waveIndex + 1 > this.scene.gameData.gameStats.highestEndlessWave) {
      this.scene.gameData.gameStats.highestEndlessWave = this.scene.currentBattle.waveIndex + 1;
    }

    if (this.scene.gameMode.isEndless && this.scene.currentBattle.waveIndex >= 5850) {
      this.scene.clearPhaseQueue();
      this.scene.unshiftPhase(new GameOverPhase(this.scene, true));
    }

    for (const pokemon of this.scene.getField()) {
      if (pokemon) {
        pokemon.resetBattleSummonData();
      }
    }

    for (const pokemon of this.scene.getParty().filter(p => p.isAllowedInBattle())) {
      applyPostBattleAbAttrs(PostBattleAbAttr, pokemon);
    }

    this.scene.clearEnemyHeldItemModifiers();

    const lapsingModifiers = this.scene.findModifiers(m => m instanceof LapsingPersistentModifier || m instanceof LapsingPokemonHeldItemModifier) as (LapsingPersistentModifier | LapsingPokemonHeldItemModifier)[];
    for (const m of lapsingModifiers) {
      const args: any[] = [];
      if (m instanceof LapsingPokemonHeldItemModifier) {
        args.push(this.scene.getPokemonById(m.pokemonId));
      }
      if (!m.lapse(args)) {
        this.scene.removeModifier(m);
      }
    }

    this.scene.updateModifiers().then(() => this.end());
  }
}
