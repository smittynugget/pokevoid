import BattleScene from "#app/battle-scene.js";
import { PlayerGender } from "#app/enums/player-gender.js";
import { BattlePhase } from "./battle-phase";
import { ChampionUtils } from "#app/system/champion-utils.js";
import { clearTrainerDualColorAltBuild } from "#app/utils/trainer-dualcolor-recolor.js";

export class ShowTrainerPhase extends BattlePhase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    super.start();

    this.scene.trainer.setVisible(true);

    const championId = ChampionUtils.resolveActiveChampionId(this.scene);
    const backSpriteKey = ChampionUtils.getChampionBackSpriteKey(championId, this.scene.gameData.gender);
    this.scene.trainer.setTexture(backSpriteKey);
    const trainerScale = ChampionUtils.getChampionBackSpriteScale(championId);
    this.scene.trainer.setScale(trainerScale);
    const trainerYOffset = ChampionUtils.getChampionBackSpriteYOffset(championId);
    const currentX = this.scene.trainer.x;
    this.scene.trainer.setPosition(currentX, 186 + trainerYOffset);

    this.scene.trainer.setPipeline(this.scene.fieldSpritePipeline);
    clearTrainerDualColorAltBuild(this.scene.trainer);

    this.scene.tweens.add({
      targets: this.scene.trainer,
      x: 106,
      duration: 1000,
      onComplete: () => this.end()
    });
  }
}