import BattleScene from "#app/battle-scene.js";
import { TrainerSlot } from "#app/data/trainer-config.js";
import { Phase } from "#app/phase.js";

export class BattlePhase extends Phase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  showEnemyTrainer(trainerSlot: TrainerSlot = TrainerSlot.NONE): void {
    const sprites = this.scene.currentBattle.trainer?.getSprites()!;
    const tintSprites = this.scene.currentBattle.trainer?.getTintSprites()!;
    for (let i = 0; i < sprites.length; i++) {
      const visible = !trainerSlot || (i === 0) === (trainerSlot === TrainerSlot.TRAINER) || sprites.length < 2;
      [sprites[i], tintSprites[i]].map(sprite => {
        if (visible) {
          sprite.x = trainerSlot || sprites.length < 2 ? 0 : i ? 16 : -16;
        }
        sprite.setVisible(visible);
        sprite.clearTint();
      });
      sprites[i].setVisible(visible);
      tintSprites[i].setVisible(visible);
      sprites[i].clearTint();
      tintSprites[i].clearTint();
    }
    this.scene.tweens.add({
      targets: this.scene.currentBattle.trainer,
      x: "-=16",
      y: "+=16",
      alpha: 1,
      ease: "Sine.easeInOut",
      duration: 750
    });
  }

  hideEnemyTrainer(): void {
    const trainer = this.scene.currentBattle.trainer;
    this.scene.tweens.add({
      targets: trainer,
      x: "+=16",
      y: "-=16",
      alpha: 0,
      ease: "Sine.easeInOut",
      duration: 750
    });
    if (trainer?.portalSprite) {
      const portal = trainer.portalSprite;
      trainer.portalSprite = null;
      this.scene.tweens.killTweensOf(portal);
      this.scene.tweens.add({
        targets: portal,
        alpha: 0,
        duration: 750,
        ease: "Sine.easeInOut",
        onComplete: () => {
          portal.destroy();
        }
      });
    }
  }
}