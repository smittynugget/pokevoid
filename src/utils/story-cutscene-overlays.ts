import BattleScene from "#app/battle-scene.js";
import { RivalTrainerType, trainerConfigs } from "#app/data/trainer-config.js";
import * as Utils from "#app/utils.js";

export function addRivalFadeOverlay(
  scene: BattleScene,
  container: Phaser.GameObjects.Container,
  rivalType: RivalTrainerType,
  onFadeComplete?: () => void
): Phaser.GameObjects.Sprite | null {
  const cfg = trainerConfigs[rivalType];
  if (!cfg) {
    return null;
  }

  const spriteKey = cfg.getSpriteKey(false, false);
  const sprite = scene.addFieldSprite(scene.game.canvas.width / 2, (scene.game.canvas.height / 2) - 5, spriteKey);
  sprite.setOrigin(0.5, 0.5);
  sprite.setScale(4.8);

  sprite.setTint(0x000000);
  sprite.setBlendMode(Phaser.BlendModes.MULTIPLY);

  if (sprite.texture.frameTotal > 1) {
    sprite.play({ key: spriteKey, repeat: -1, frameRate: 24 });
  }

  container.add(sprite);
  scene.tweens.add({
    targets: sprite,
    alpha: 0,
    duration: Utils.fixedInt(300) as any,
    ease: "Power2",
    delay: Utils.fixedInt(150) as any,
    onComplete: () => onFadeComplete?.(),
  });

  return sprite;
}

export function addRivalSilhouetteOverlay(
  scene: BattleScene,
  container: Phaser.GameObjects.Container,
  rivalType: RivalTrainerType
): Phaser.GameObjects.Sprite | null {
  const cfg = trainerConfigs[rivalType];
  if (!cfg) {
    return null;
  }

  const spriteKey = cfg.getSpriteKey(false, false);
  const sprite = scene.addFieldSprite(scene.game.canvas.width / 2, (scene.game.canvas.height / 2) - 5, spriteKey);
  sprite.setOrigin(0.5, 0.5);
  sprite.setScale(4.8);

  sprite.setTint(0x000000);
  sprite.setBlendMode(Phaser.BlendModes.MULTIPLY);

  if (sprite.texture.frameTotal > 1) {
    sprite.play({ key: spriteKey, repeat: -1, frameRate: 24 });
  }

  container.add(sprite);
  return sprite;
}

export function addTrainerFadeInOverlay(
  scene: BattleScene,
  container: Phaser.GameObjects.Container,
  spriteKey: string
): Phaser.GameObjects.Sprite {
  const sprite = scene.addFieldSprite(scene.game.canvas.width / 2, (scene.game.canvas.height / 2) - 5, spriteKey);
  sprite.setOrigin(0.5, 0.5);
  sprite.setScale(4.8);
  sprite.setAlpha(0);

  if (sprite.texture.frameTotal > 1) {
    sprite.play({ key: spriteKey, repeat: -1, frameRate: 24 });
  }

  container.add(sprite);
  scene.tweens.add({
    targets: sprite,
    alpha: 1,
    duration: Utils.fixedInt(1100) as any,
    ease: "Power2",
  });

  return sprite;
}
