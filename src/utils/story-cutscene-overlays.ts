import BattleScene from "#app/battle-scene.js";
import { RivalTrainerType, trainerConfigs } from "#app/data/trainer-config.js";
import * as Utils from "#app/utils.js";
import { getTrainerSpriteCluster4 } from "./trainer-dualcolor-recolor";

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

export function addCorruptedRivalOverlay(
  scene: BattleScene,
  container: Phaser.GameObjects.Container,
  rivalType: RivalTrainerType
): Phaser.GameObjects.Sprite | null {
  const cfg = trainerConfigs[rivalType];
  if (!cfg) return null;

  const spriteKey = cfg.getSpriteKey(false, false);
  const sprite = scene.addFieldSprite(
    scene.game.canvas.width / 2,
    (scene.game.canvas.height / 2) - 5,
    spriteKey
  );
  sprite.setOrigin(0.5, 0.5);
  sprite.setScale(4.8);

  sprite.setPipeline(scene.spritePipeline, {
    tone: [0, 0, 0, 0],
    hasShadow: false
  });
  sprite.setPipelineData("ignoreFieldPos", true);
  sprite.setPipelineData("ignoreTimeTint", true);

  const corruptedPalettes = [
    ["#0C0C0C", "#5A1BB2", "#000000", "#330066"],
    ["#000000", "#4B0082", "#0C0C0C", "#6340AB"],
    ["#0C0C0C", "#6A0DAD", "#000000", "#371B58"],
  ];
  const chosenPalette = Utils.randSeedItem(corruptedPalettes);
  const targetColors = chosenPalette.map(hex => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  });
  const quantized = getTrainerSpriteCluster4(scene, sprite);
  const sourceColors = quantized || targetColors.map(() => [128, 128, 128, 255]);

  sprite.pipelineData["altBuildSpriteColors"] = sourceColors;
  sprite.pipelineData["altBuildTargetColors"] = targetColors;
  sprite.pipelineData["altBuildBlendMode"] = "duelmon_cluster4";
  sprite.pipelineData["altBuildInversionFactor"] = 0.7;

  if (sprite.texture.frameTotal > 1) {
    sprite.play({ key: spriteKey, repeat: -1, frameRate: 24 });
  }

  container.add(sprite);
  return sprite;
}

const CUTSCENE_FAINT_CONFIG = {
  initialDelay: 300,
  glitch: { dur: 400, intensity: 8, steps: 8, invertDur: 150 },
  shatter: { count: 16, dur: 675, size: 18, color: 0x431957, early: 75 },
  explode: {
    dur: 1035, count: 25, radius: 120, size: 5, color: 0x441858,
    ringSize: 60, ringBorder: 3, ringGlow: 10, ringScale: 3.5,
    early: 520
  },
};

function lightenColor(color: number, amt: number): number {
  let r = (color >> 16) & 0xFF;
  let g = (color >> 8) & 0xFF;
  let b = color & 0xFF;
  r = Math.min(255, Math.max(0, r + amt));
  g = Math.min(255, Math.max(0, g + amt));
  b = Math.min(255, Math.max(0, b + amt));
  return (r << 16) | (g << 8) | b;
}

export function playCutsceneFaintAnim(
  scene: BattleScene,
  container: Phaser.GameObjects.Container,
  sprite: Phaser.GameObjects.Sprite
): Promise<void> {
  return new Promise((resolve) => {
    const allObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];
    const spriteX = sprite.x;
    const spriteY = sprite.y;

    sprite.setPipelineData("ignoreTimeTint", 1);

    const glitchStart = CUTSCENE_FAINT_CONFIG.initialDelay;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(glitchStart),
      onComplete: () => {
        let gc = 0;
        const originalX = spriteX;

        const glitchTimer = scene.time.addEvent({
          delay: Utils.fixedInt(CUTSCENE_FAINT_CONFIG.glitch.dur / CUTSCENE_FAINT_CONFIG.glitch.steps) as any,
          repeat: CUTSCENE_FAINT_CONFIG.glitch.steps - 1,
          callback: () => {
            gc++;
            const ox = (Math.random() - 0.5) * CUTSCENE_FAINT_CONFIG.glitch.intensity;
            sprite.x = originalX + ox;

            sprite.setPipelineData("portalHueRotate", Math.random() * 360);
            sprite.setPipelineData("portalBrightness", 0.8 + Math.random() * 0.4);

            if (gc >= CUTSCENE_FAINT_CONFIG.glitch.steps) {
              glitchTimer.remove();
              sprite.x = originalX;
              sprite.setPipelineData("portalHueRotate", 0.0);
              sprite.setPipelineData("portalInvert", 1.0);
              sprite.setPipelineData("portalBrightness", 1.5);
              scene.time.delayedCall(Utils.fixedInt(CUTSCENE_FAINT_CONFIG.glitch.invertDur) as any, () => {
                sprite.setPipelineData("portalInvert", 0.0);
                sprite.setPipelineData("portalBrightness", 1.0);
                sprite.setPipelineData("ignoreTimeTint", 0);
                sprite.setVisible(false);
              });
            }
          }
        });
      }
    });

    const shatterStart = glitchStart + CUTSCENE_FAINT_CONFIG.glitch.dur + 200 - CUTSCENE_FAINT_CONFIG.shatter.early;
    const shatterColors = [CUTSCENE_FAINT_CONFIG.shatter.color, lightenColor(CUTSCENE_FAINT_CONFIG.shatter.color, 30), lightenColor(CUTSCENE_FAINT_CONFIG.shatter.color, 60), 0xffffff];

    scene.tweens.addCounter({
      duration: Utils.fixedInt(shatterStart),
      onComplete: () => {
        for (let i = 0; i < CUTSCENE_FAINT_CONFIG.shatter.count; i++) {
          const sz = CUTSCENE_FAINT_CONFIG.shatter.size;
          const w = sz * 0.5 + Math.random() * sz;
          const h = sz * 0.5 + Math.random() * sz * 1.5;

          const shard = scene.add.image(spriteX, spriteY, "pb_particles", "3.png");
          shard.setTintFill(shatterColors[Math.floor(Math.random() * shatterColors.length)]);
          shard.setDisplaySize(w, h);
          shard.setAngle(Math.random() * 360);
          container.add(shard);
          allObjects.push(shard);

          const spreadAngle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 70;
          const stagger = Math.random() * 80;

          scene.tweens.add({
            targets: shard,
            x: spriteX + Math.cos(spreadAngle) * dist,
            y: spriteY + Math.sin(spreadAngle) * dist,
            angle: shard.angle + (Math.random() * 720 - 360),
            scale: 0.3,
            duration: Utils.fixedInt(CUTSCENE_FAINT_CONFIG.shatter.dur),
            ease: "Quad.easeOut",
            delay: Utils.fixedInt(stagger),
            onComplete: () => shard.destroy()
          });
          scene.tweens.add({
            targets: shard,
            alpha: 0,
            duration: Utils.fixedInt(CUTSCENE_FAINT_CONFIG.shatter.dur * 0.4),
            ease: "Quad.easeIn",
            delay: Utils.fixedInt(stagger + CUTSCENE_FAINT_CONFIG.shatter.dur * 0.6)
          });
        }
      }
    });

    const explodeStart = shatterStart + CUTSCENE_FAINT_CONFIG.shatter.dur - CUTSCENE_FAINT_CONFIG.explode.early;
    const explodeColors = [CUTSCENE_FAINT_CONFIG.explode.color, lightenColor(CUTSCENE_FAINT_CONFIG.explode.color, 30), 0xffffff, lightenColor(CUTSCENE_FAINT_CONFIG.explode.color, -20)];

    scene.tweens.addCounter({
      duration: Utils.fixedInt(explodeStart),
      onComplete: () => {
        const ringRadius = CUTSCENE_FAINT_CONFIG.explode.ringSize / 2;

        const ring = scene.add.graphics();
        const maxGlowWidth = CUTSCENE_FAINT_CONFIG.explode.ringGlow;
        const glowLayers = 5;
        for (let gl = glowLayers; gl >= 1; gl--) {
          const layerWidth = maxGlowWidth * (gl / glowLayers);
          const layerAlpha = 0.15 * (1 - (gl - 1) / glowLayers);
          ring.lineStyle(layerWidth, CUTSCENE_FAINT_CONFIG.explode.color, layerAlpha);
          ring.strokeCircle(0, 0, ringRadius);
        }
        ring.lineStyle(CUTSCENE_FAINT_CONFIG.explode.ringBorder, CUTSCENE_FAINT_CONFIG.explode.color, 1);
        ring.strokeCircle(0, 0, ringRadius);
        ring.setPosition(spriteX, spriteY);
        container.add(ring);
        allObjects.push(ring);

        scene.tweens.add({
          targets: ring,
          scale: CUTSCENE_FAINT_CONFIG.explode.ringScale,
          alpha: 0,
          duration: Utils.fixedInt(CUTSCENE_FAINT_CONFIG.explode.dur),
          ease: "Quad.easeOut",
          delay: Utils.fixedInt(30),
          onComplete: () => ring.destroy()
        });

        for (let i = 0; i < CUTSCENE_FAINT_CONFIG.explode.count; i++) {
          const s = CUTSCENE_FAINT_CONFIG.explode.size * 0.5 + Math.random() * CUTSCENE_FAINT_CONFIG.explode.size;

          const particle = scene.add.image(spriteX, spriteY, "pb_particles", Math.random() > 0.5 ? "5.png" : "3.png");
          particle.setTintFill(explodeColors[Math.floor(Math.random() * 4)]);
          particle.setDisplaySize(s, s);
          container.add(particle);
          allObjects.push(particle);

          const spreadAngle = Math.random() * Math.PI * 2;
          const dist = CUTSCENE_FAINT_CONFIG.explode.radius * 0.5 + Math.random() * CUTSCENE_FAINT_CONFIG.explode.radius;
          const animDur = CUTSCENE_FAINT_CONFIG.explode.dur + Math.random() * 300;
          const stagger = Math.random() * 100;

          scene.tweens.add({
            targets: particle,
            x: spriteX + Math.cos(spreadAngle) * dist,
            y: spriteY + Math.sin(spreadAngle) * dist,
            alpha: 0,
            duration: Utils.fixedInt(animDur),
            ease: "Cubic.easeOut",
            delay: Utils.fixedInt(stagger),
            onComplete: () => particle.destroy()
          });
        }
      }
    });

    const totalDur = explodeStart + CUTSCENE_FAINT_CONFIG.explode.dur + 500;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(totalDur),
      onComplete: () => {
        allObjects.forEach(p => { if (p.scene) p.destroy(); });
        sprite.setPipelineData("portalBrightness", 1.0);
        sprite.setPipelineData("portalInvert", 0.0);
        sprite.setPipelineData("portalHueRotate", 0.0);
        sprite.setPipelineData("portalSaturate", 1.0);
        sprite.setPipelineData("ignoreTimeTint", 0);
        resolve();
      }
    });
  });
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