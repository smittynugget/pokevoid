import BattleScene from "#app/battle-scene.js";
import { EncounterPhase } from "./encounter-phase";
import { ReturnPhase } from "./return-phase";
import { ShowTrainerPhase } from "./show-trainer-phase";
import { BattleType } from "#app/battle.js";

export class ChaosEncounterPhase extends EncounterPhase {
  constructor(scene: BattleScene, loaded?: boolean) {
    if(loaded && !Array.isArray(scene.currentBattle.turnCommands)) {
      scene.currentBattle.turnCommands = [];
    }
    super(scene, loaded);
  }

  start() {
    super.start();
  }

  doEncounter(): void {
    this.scene.playBgm(undefined, true);
    this.scene.updateModifiers(false);
    this.scene.setFieldScale(1);

    for (const pokemon of this.scene.getParty()) {
      if (pokemon) {
        pokemon.resetBattleData();
      }
    }

    if (!this.loaded) {
      this.scene.arena.trySetWeather(this.scene.arena.weather?.weatherType, false);
    }

    const isFirstBattle = this.scene.currentBattle.waveIndex === 1;
    const playerArenaOffScreen = this.scene.arenaPlayer.x !== 0;
    const needsPlayerTransition = isFirstBattle || playerArenaOffScreen;

    if (needsPlayerTransition) {
      this.scene.arenaPlayer.setBiome(this.scene.arena.biomeType);
      this.scene.arenaEnemy.setBiome(this.scene.arena.biomeType);
      
      const enemyField = this.scene.getEnemyField();
      this.scene.tweens.add({
        targets: [this.scene.arenaEnemy, this.scene.currentBattle.trainer, enemyField, this.scene.arenaPlayer, this.scene.trainer].flat(),
        x: (_target, _key, value, fieldIndex: integer) => fieldIndex < 2 + (enemyField.length) ? value + 300 : value - 300,
        duration: 2000,
        onComplete: () => {
          if (!this.tryOverrideForBattleSpec()) {
            this.doEncounterCommon();
          }
        }
      });
    } else {
      this.scene.arenaNextEnemy.setBiome(this.scene.arena.biomeType);
      this.scene.arenaNextEnemy.setVisible(true);

      const enemyField = this.scene.getEnemyField();
      this.scene.tweens.add({
        targets: [this.scene.arenaEnemy, this.scene.arenaNextEnemy, this.scene.currentBattle.trainer, enemyField, this.scene.lastEnemyTrainer].flat(),
        x: "+=300",
        duration: 2000,
        onComplete: () => {
          this.scene.arenaEnemy.setBiome(this.scene.arena.biomeType);
          this.scene.arenaEnemy.setX(this.scene.arenaNextEnemy.x);
          this.scene.arenaEnemy.setAlpha(1);
          this.scene.arenaNextEnemy.setX(this.scene.arenaNextEnemy.x - 300);
          this.scene.arenaNextEnemy.setVisible(false);
          if (this.scene.lastEnemyTrainer) {
            this.scene.lastEnemyTrainer.destroy();
          }

          if (!this.tryOverrideForBattleSpec()) {
            this.doEncounterCommon();
          }
        }
      });
    }
  }
} 