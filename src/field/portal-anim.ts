import BattleScene from "#app/battle-scene.js";
import Pokemon from "#app/field/pokemon.js";
import Trainer from "#app/field/trainer.js";
import * as Utils from "#app/utils.js";

const HTML_CONTAINER = 280;
const HTML_FEET_Y_PERCENT = 80;

const SUMMON_CONFIG = {
  portal: { dur: 600, delay: 50 },
  dissolve: { count: 40, dur: 365, spread: 40, size: 5, yPercent: 61, color: 0x431877, early: 140, zFront: true },
  silhouette: { hold: 185, early: 20, fadeIn: 200, revealDur: 200 },
  flash: { dur: 240, brightness: 3, early: 0, rampFraction: 0.3, fadeFraction: 1.5 },
  postFlash: { count: 16, dur: 695, size: 15, yPercent: 56, color: 0x361862, early: 280, zFront: true },
  riseCopy: { count: 12, dur: 300, size: 4.5, startYPercent: 67, endYPercent: 18, color: 0x712e7a, early: 885, zFront: true }
};

const FAINT_CONFIG = {
  initialDelay: 300,
  glitch: { dur: 400, intensity: 8, steps: 8, invertDur: 150, early: 0 },
  shatter: { count: 16, dur: 675, size: 12, yPercent: 59, color: 0x431957, early: 75, zFront: true },
  explode: {
    dur: 1035, count: 25, radius: 75, size: 3, yPercent: 59, color: 0x441858,
    ringSize: 40, ringBorder: 2, ringGlow: 8, ringScale: 3.5, speed: 1,
    early: 520, zFront: true
  },
  portalFadeDur: 800
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

function htmlYToFieldY(yPercent: number, pokemon: Pokemon, pxScale: number): number {
  const spriteOffset = pokemon.getSprite() ? pokemon.getSprite().y * pokemon.scaleY : 0;
  return pokemon.y + spriteOffset + ((yPercent - HTML_FEET_Y_PERCENT) / 100) * HTML_CONTAINER * pxScale;
}

function htmlPxToField(px: number, pxScale: number): number {
  return px * pxScale;
}

function placeParticle(scene: BattleScene, particle: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics, pokemon: Pokemon, zFront: boolean): void {
  scene.field.add(particle);
  if (scene.field.getIndex(pokemon) > -1) {
    if (zFront) {
      scene.field.moveAbove(particle, pokemon);
    } else {
      scene.field.moveBelow(particle, pokemon);
    }
  }
}

function getColorPalette(baseColor: number): number[] {
  return [baseColor, lightenColor(baseColor, 30), lightenColor(baseColor, 60), 0xffffff];
}

function pickColor(palette: number[]): number {
  return palette[Math.floor(Math.random() * palette.length)];
}

function spawnParticlesBatched(
  scene: BattleScene,
  count: number,
  batchSize: number,
  allObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[],
  spawnOne: (i: number) => void
): void {
  let idx = 0;
  const batches = Math.ceil(count / batchSize);
  if (batches <= 1) {
    for (let i = 0; i < count; i++) spawnOne(i);
    return;
  }
  for (let b = 0; b < batchSize && idx < count; b++, idx++) {
    spawnOne(idx);
  }
  scene.time.addEvent({
    delay: Utils.fixedInt(16) as any,
    repeat: batches - 2,
    callback: () => {
      for (let b = 0; b < batchSize && idx < count; b++, idx++) {
        spawnOne(idx);
      }
    }
  });
}

export function playPortalSummonAnim(scene: BattleScene, pokemon: Pokemon): Promise<void> {
  return new Promise((resolve) => {
    const pxScale = (pokemon.species?.generation === 20 || (pokemon as any).isVisualGlitchOrSmittyForm?.())
      ? pokemon.getSpriteScale()
      : 0.45;
    const allObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];

    (pokemon as any)._portalAnimActive = true;

    const sprite = pokemon.getSprite();
    if (sprite) {
      sprite.clearTint();
      sprite.setPipelineData("portalBrightness", 1.0);
      sprite.setPipelineData("portalInvert", 0.0);
      sprite.setPipelineData("portalHueRotate", 0.0);
      sprite.setPipelineData("portalSaturate", 1.0);
      sprite.setPipelineData("ignoreTimeTint", 0);
    }
    const tintSpriteReset = (pokemon as any).getTintSprite?.();
    if (tintSpriteReset) {
      scene.tweens.killTweensOf(tintSpriteReset);
      tintSpriteReset.setVisible(false);
      tintSpriteReset.setAlpha(0);
      tintSpriteReset.clearTint();
    }

    const portalSprite = pokemon.portalSprite!;
    if (!portalSprite) {
      (pokemon as any)._portalAnimActive = false;
      resolve();
      return;
    }

    const layoutScale = portalSprite.scale;
    const portalOriginalOriginY = portalSprite.originY;
    const portalOriginalY = portalSprite.y;
    const fullDisplayHeight = portalSprite.displayHeight;

    portalSprite.setOrigin(0.5, 0.5);
    portalSprite.y = portalOriginalY - fullDisplayHeight * 0.5;

    portalSprite.setAlpha(0);
    portalSprite.setVisible(true);
    portalSprite.setScale(layoutScale, layoutScale * 0.3);
    if (portalSprite.postFX) {
      portalSprite.postFX.addGlow(0x7828c8, 4, 0, false, 0.6, 8);
    }

    const dissolveStart = SUMMON_CONFIG.portal.dur - SUMMON_CONFIG.dissolve.early;
    const silhouetteStart = dissolveStart + SUMMON_CONFIG.dissolve.dur - SUMMON_CONFIG.silhouette.early;
    const flashStart = silhouetteStart + SUMMON_CONFIG.silhouette.hold - SUMMON_CONFIG.flash.early;
    const postFlashStart = flashStart + (SUMMON_CONFIG.flash.dur * 2) - SUMMON_CONFIG.postFlash.early;
    const riseCopyStart = postFlashStart + SUMMON_CONFIG.postFlash.dur - SUMMON_CONFIG.riseCopy.early;
    const totalDur = postFlashStart + SUMMON_CONFIG.postFlash.dur + 400;

    scene.tweens.add({
      targets: portalSprite,
      alpha: 1,
      duration: Utils.fixedInt(SUMMON_CONFIG.portal.dur),
      ease: "Quad.easeIn",
      delay: Utils.fixedInt(SUMMON_CONFIG.portal.delay)
    });

    scene.tweens.add({
      targets: portalSprite,
      scaleY: layoutScale,
      duration: Utils.fixedInt(SUMMON_CONFIG.portal.dur),
      ease: "Back.easeOut",
      delay: Utils.fixedInt(SUMMON_CONFIG.portal.delay)
    });

    const dissolveColors = getColorPalette(SUMMON_CONFIG.dissolve.color);
    const dissolveY = htmlYToFieldY(SUMMON_CONFIG.dissolve.yPercent, pokemon, pxScale);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(dissolveStart),
      onComplete: () => {
        spawnParticlesBatched(scene, SUMMON_CONFIG.dissolve.count, 8, allObjects, (i) => {
          const s = (SUMMON_CONFIG.dissolve.size * 0.5 + Math.random() * SUMMON_CONFIG.dissolve.size) * pxScale;
          const ang = (Math.PI * 2 * i) / SUMMON_CONFIG.dissolve.count;
          const r = htmlPxToField(SUMMON_CONFIG.dissolve.spread, pxScale) + Math.random() * 20;

          const startX = pokemon.x + Math.cos(ang) * r;
          const startY = dissolveY + Math.sin(ang) * r;

          const particle = scene.add.image(startX, startY, "pb_particles", "5.png");
          particle.setTintFill(pickColor(dissolveColors));
          particle.setDisplaySize(s, s);
          placeParticle(scene, particle, pokemon, SUMMON_CONFIG.dissolve.zFront);
          allObjects.push(particle);

          const staggerDelay = i * (SUMMON_CONFIG.dissolve.dur / SUMMON_CONFIG.dissolve.count) * 0.3;
          scene.tweens.add({
            targets: particle,
            x: pokemon.x,
            y: dissolveY,
            alpha: 0.3,
            duration: Utils.fixedInt(SUMMON_CONFIG.dissolve.dur),
            ease: "Quad.easeIn",
            delay: Utils.fixedInt(staggerDelay),
            onComplete: () => particle.destroy()
          });
        });
      }
    });

    let revealCounter: Phaser.Tweens.Tween | null = null;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(silhouetteStart),
      onComplete: () => {
        const sprite = pokemon.getSprite();
        sprite.setVisible(true);
        sprite.setAlpha(0);
        sprite.setPipelineData("portalBrightness", 0);
        sprite.setPipelineData("ignoreTimeTint", 1);
        pokemon.setVisible(true);
        pokemon.setScale(pokemon.getSpriteScale());

        scene.tweens.add({
          targets: sprite,
          alpha: 1,
          duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.fadeIn),
          ease: "Quad.easeIn"
        });

        scene.tweens.addCounter({
          duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.hold),
          onComplete: () => {
            revealCounter = scene.tweens.addCounter({
              from: 0,
              to: 100,
              duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.revealDur),
              ease: "Quad.easeOut",
              onUpdate: (tween: Phaser.Tweens.Tween) => {
                sprite.setPipelineData("portalBrightness", tween.getValue() / 100);
              },
              onComplete: () => {
                revealCounter = null;
              }
            });
          }
        });
      }
    });

    scene.tweens.addCounter({
      duration: Utils.fixedInt(flashStart),
      onComplete: () => {
        const sprite = pokemon.getSprite();
        const tintSprite = (pokemon as any).getTintSprite();

        if (revealCounter) {
          revealCounter.stop();
          revealCounter = null;
        }
        scene.tweens.killTweensOf(sprite);
        sprite.setAlpha(1);
        sprite.clearTint();

        const currentBrightness = (sprite.pipelineData?.["portalBrightness"] as number) ?? 0;

        if (tintSprite) {
          scene.tweens.killTweensOf(tintSprite);
        }

        const rampDur = Math.round(SUMMON_CONFIG.flash.dur * SUMMON_CONFIG.flash.rampFraction);
        const fadeDur = Math.round(SUMMON_CONFIG.flash.dur * SUMMON_CONFIG.flash.fadeFraction);

        scene.tweens.addCounter({
          from: Math.round(currentBrightness * 100),
          to: SUMMON_CONFIG.flash.brightness * 100,
          duration: Utils.fixedInt(rampDur),
          ease: "Quad.easeInOut",
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            const t = (tween.getValue() - Math.round(currentBrightness * 100)) / (SUMMON_CONFIG.flash.brightness * 100 - Math.round(currentBrightness * 100));
            sprite.setPipelineData("portalBrightness", tween.getValue() / 100);
            sprite.setPipelineData("portalSaturate", 1.0 + t);
          },
          onComplete: () => {
            sprite.setPipelineData("portalBrightness", SUMMON_CONFIG.flash.brightness);
            sprite.setPipelineData("portalSaturate", 2.0);
          }
        });

        scene.tweens.addCounter({
          duration: Utils.fixedInt(SUMMON_CONFIG.flash.dur),
          onComplete: () => {
            scene.tweens.addCounter({
              from: 0,
              to: 100,
              duration: Utils.fixedInt(fadeDur),
              ease: "Quad.easeOut",
              onUpdate: (tween: Phaser.Tweens.Tween) => {
                const t = tween.getValue() / 100;
                sprite.setPipelineData("portalBrightness", SUMMON_CONFIG.flash.brightness + (1.0 - SUMMON_CONFIG.flash.brightness) * t);
                sprite.setPipelineData("portalSaturate", 2.0 + (1.0 - 2.0) * t);
              },
              onComplete: () => {
                sprite.setPipelineData("portalBrightness", 1.0);
                sprite.setPipelineData("portalSaturate", 1.0);
                sprite.setPipelineData("ignoreTimeTint", 0);
              }
            });
          }
        });
      }
    });

    const pfColors = getColorPalette(SUMMON_CONFIG.postFlash.color);
    const pfY = htmlYToFieldY(SUMMON_CONFIG.postFlash.yPercent, pokemon, pxScale);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(postFlashStart),
      onComplete: () => {
        spawnParticlesBatched(scene, SUMMON_CONFIG.postFlash.count, 8, allObjects, (i) => {
          const w = (SUMMON_CONFIG.postFlash.size * 0.5 + Math.random() * SUMMON_CONFIG.postFlash.size) * pxScale;
          const h = (SUMMON_CONFIG.postFlash.size * 0.5 + Math.random() * SUMMON_CONFIG.postFlash.size * 1.2) * pxScale;

          const shard = scene.add.image(pokemon.x, pfY, "pb_particles", "3.png");
          shard.setTintFill(pickColor(pfColors));
          shard.setDisplaySize(w, h);
          shard.setAngle(Math.random() * 360);
          placeParticle(scene, shard, pokemon, SUMMON_CONFIG.postFlash.zFront);
          allObjects.push(shard);

          const spreadAngle = Math.random() * Math.PI * 2;
          const dist = htmlPxToField(20 + Math.random() * 40, pxScale);
          const animDur = 400 + Math.random() * 300;
          const stagger = Math.random() * 60;

          scene.tweens.add({
            targets: shard,
            x: pokemon.x + Math.cos(spreadAngle) * dist,
            y: pfY + Math.sin(spreadAngle) * dist,
            alpha: 0,
            angle: shard.angle + (Math.random() * 720 - 360),
            scale: 0.3,
            duration: Utils.fixedInt(animDur),
            ease: "Cubic.easeOut",
            delay: Utils.fixedInt(stagger),
            onComplete: () => shard.destroy()
          });
        });
      }
    });

    const riseCopyColors = [SUMMON_CONFIG.riseCopy.color, lightenColor(SUMMON_CONFIG.riseCopy.color, 30), 0xffffff];
    const riseCopyStartY = htmlYToFieldY(SUMMON_CONFIG.riseCopy.startYPercent, pokemon, pxScale);
    const riseCopyEndY = htmlYToFieldY(SUMMON_CONFIG.riseCopy.endYPercent, pokemon, pxScale);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(riseCopyStart),
      onComplete: () => {
        spawnParticlesBatched(scene, SUMMON_CONFIG.riseCopy.count, 6, allObjects, (i) => {
          const s = (SUMMON_CONFIG.riseCopy.size * 0.5 + Math.random() * SUMMON_CONFIG.riseCopy.size) * pxScale;

          const particle = scene.add.image(
            pokemon.x + (Math.random() - 0.5) * htmlPxToField(20, pxScale),
            riseCopyStartY,
            "pb_particles", "5.png"
          );
          particle.setTintFill(riseCopyColors[Math.floor(Math.random() * 3)]);
          particle.setDisplaySize(s, s);
          particle.setAlpha(0.8);
          placeParticle(scene, particle, pokemon, SUMMON_CONFIG.riseCopy.zFront);
          allObjects.push(particle);

          const animDur = SUMMON_CONFIG.riseCopy.dur + Math.random() * 400;
          scene.tweens.add({
            targets: particle,
            y: riseCopyEndY,
            alpha: 0,
            duration: Utils.fixedInt(animDur),
            ease: "Quad.easeOut",
            delay: Utils.fixedInt(i * 40),
            onComplete: () => particle.destroy()
          });
        });
      }
    });

    scene.tweens.addCounter({
      duration: Utils.fixedInt(totalDur),
      onComplete: () => {
        allObjects.forEach(p => { if (p.scene) p.destroy(); });
        const sprite = pokemon.getSprite();
        if (sprite) {
          sprite.setPipelineData("portalBrightness", 1.0);
          sprite.setPipelineData("portalInvert", 0.0);
          sprite.setPipelineData("portalHueRotate", 0.0);
          sprite.setPipelineData("portalSaturate", 1.0);
          sprite.setPipelineData("ignoreTimeTint", 0);
        }
        if (portalSprite) {
          portalSprite.setOrigin(0.5, portalOriginalOriginY);
          portalSprite.y = portalOriginalY;
        }
        const tintSpriteCleanup = (pokemon as any).getTintSprite?.();
        if (tintSpriteCleanup) {
          tintSpriteCleanup.setVisible(false);
          tintSpriteCleanup.setAlpha(0);
        }
        (pokemon as any)._portalAnimActive = false;
        resolve();
      }
    });
  });
}

export function playEggPortalSummonAnim(
  scene: BattleScene,
  container: Phaser.GameObjects.Container,
  portalSprite: Phaser.GameObjects.Sprite,
  creatureSprite: Phaser.GameObjects.Sprite,
  anchorX: number,
  anchorY: number,
  pxScale: number
): Promise<void> {
  return new Promise((resolve) => {
    const allObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];

    if (!portalSprite) {
      resolve();
      return;
    }

    const layoutScale = portalSprite.scaleX || portalSprite.scale;
    const portalOriginalOriginY = portalSprite.originY;
    const portalOriginalY = portalSprite.y;
    const fullDisplayHeight = portalSprite.displayHeight;

    portalSprite.setOrigin(0.5, 0.5);
    portalSprite.y = portalOriginalY - fullDisplayHeight * 0.5;

    portalSprite.setAlpha(0);
    portalSprite.setVisible(true);
    portalSprite.setScale(layoutScale, layoutScale * 0.3);
    if (portalSprite.postFX) {
      portalSprite.postFX.addGlow(0x7828c8, 4, 0, false, 0.6, 8);
    }

    creatureSprite.setVisible(false);
    creatureSprite.setPipelineData("portalBrightness", 1.0);
    creatureSprite.setPipelineData("portalInvert", 0.0);
    creatureSprite.setPipelineData("portalHueRotate", 0.0);
    creatureSprite.setPipelineData("portalSaturate", 1.0);
    creatureSprite.setPipelineData("ignoreTimeTint", 1);

    const dissolveStart = SUMMON_CONFIG.portal.dur - SUMMON_CONFIG.dissolve.early;
    const silhouetteStart = dissolveStart + SUMMON_CONFIG.dissolve.dur - SUMMON_CONFIG.silhouette.early;
    const flashStart = silhouetteStart + SUMMON_CONFIG.silhouette.hold - SUMMON_CONFIG.flash.early;
    const postFlashStart = flashStart + (SUMMON_CONFIG.flash.dur * 2) - SUMMON_CONFIG.postFlash.early;
    const riseCopyStart = postFlashStart + SUMMON_CONFIG.postFlash.dur - SUMMON_CONFIG.riseCopy.early;
    const totalDur = postFlashStart + SUMMON_CONFIG.postFlash.dur + 400;

    const eggHatchY = (yPercent: number): number => {
      return anchorY + ((yPercent - HTML_FEET_Y_PERCENT) / 100) * HTML_CONTAINER * pxScale;
    };

    const placeLocal = (particle: Phaser.GameObjects.Image): void => {
      container.add(particle);
      if (container.getIndex(creatureSprite) > -1) {
        container.moveAbove(particle, creatureSprite);
      }
    };

    scene.tweens.add({
      targets: portalSprite,
      alpha: 1,
      duration: Utils.fixedInt(SUMMON_CONFIG.portal.dur),
      ease: "Quad.easeIn",
      delay: Utils.fixedInt(SUMMON_CONFIG.portal.delay)
    });

    scene.tweens.add({
      targets: portalSprite,
      scaleY: layoutScale,
      duration: Utils.fixedInt(SUMMON_CONFIG.portal.dur),
      ease: "Back.easeOut",
      delay: Utils.fixedInt(SUMMON_CONFIG.portal.delay)
    });

    const dissolveColors = getColorPalette(SUMMON_CONFIG.dissolve.color);
    const dissolveY = eggHatchY(SUMMON_CONFIG.dissolve.yPercent);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(dissolveStart),
      onComplete: () => {
        spawnParticlesBatched(scene, SUMMON_CONFIG.dissolve.count, 8, allObjects, (i) => {
          const s = (SUMMON_CONFIG.dissolve.size * 0.5 + Math.random() * SUMMON_CONFIG.dissolve.size) * pxScale;
          const ang = (Math.PI * 2 * i) / SUMMON_CONFIG.dissolve.count;
          const r = htmlPxToField(SUMMON_CONFIG.dissolve.spread, pxScale) + Math.random() * 20;

          const startX = anchorX + Math.cos(ang) * r;
          const startY = dissolveY + Math.sin(ang) * r;

          const particle = scene.add.image(startX, startY, "pb_particles", "5.png");
          particle.setTintFill(pickColor(dissolveColors));
          particle.setDisplaySize(s, s);
          placeLocal(particle);
          allObjects.push(particle);

          const staggerDelay = i * (SUMMON_CONFIG.dissolve.dur / SUMMON_CONFIG.dissolve.count) * 0.3;
          scene.tweens.add({
            targets: particle,
            x: anchorX,
            y: dissolveY,
            alpha: 0.3,
            duration: Utils.fixedInt(SUMMON_CONFIG.dissolve.dur),
            ease: "Quad.easeIn",
            delay: Utils.fixedInt(staggerDelay),
            onComplete: () => particle.destroy()
          });
        });
      }
    });

    let revealCounter: Phaser.Tweens.Tween | null = null;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(silhouetteStart),
      onComplete: () => {
        creatureSprite.setVisible(true);
        creatureSprite.setAlpha(0);
        creatureSprite.setPipelineData("portalBrightness", 0);
        creatureSprite.setPipelineData("ignoreTimeTint", 1);

        scene.tweens.add({
          targets: creatureSprite,
          alpha: 1,
          duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.fadeIn),
          ease: "Quad.easeIn"
        });

        scene.tweens.addCounter({
          duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.hold),
          onComplete: () => {
            revealCounter = scene.tweens.addCounter({
              from: 0,
              to: 100,
              duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.revealDur),
              ease: "Quad.easeOut",
              onUpdate: (tween: Phaser.Tweens.Tween) => {
                creatureSprite.setPipelineData("portalBrightness", tween.getValue() / 100);
              },
              onComplete: () => {
                revealCounter = null;
              }
            });
          }
        });
      }
    });

    scene.tweens.addCounter({
      duration: Utils.fixedInt(flashStart),
      onComplete: () => {
        if (revealCounter) {
          revealCounter.stop();
          revealCounter = null;
        }
        scene.tweens.killTweensOf(creatureSprite);
        creatureSprite.setAlpha(1);
        creatureSprite.clearTint();

        const currentBrightness = (creatureSprite.pipelineData?.["portalBrightness"] as number) ?? 0;

        const rampDur = Math.round(SUMMON_CONFIG.flash.dur * SUMMON_CONFIG.flash.rampFraction);
        const fadeDur = Math.round(SUMMON_CONFIG.flash.dur * SUMMON_CONFIG.flash.fadeFraction);

        scene.tweens.addCounter({
          from: Math.round(currentBrightness * 100),
          to: SUMMON_CONFIG.flash.brightness * 100,
          duration: Utils.fixedInt(rampDur),
          ease: "Quad.easeInOut",
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            const t = (tween.getValue() - Math.round(currentBrightness * 100)) / (SUMMON_CONFIG.flash.brightness * 100 - Math.round(currentBrightness * 100));
            creatureSprite.setPipelineData("portalBrightness", tween.getValue() / 100);
            creatureSprite.setPipelineData("portalSaturate", 1.0 + t);
          },
          onComplete: () => {
            creatureSprite.setPipelineData("portalBrightness", SUMMON_CONFIG.flash.brightness);
            creatureSprite.setPipelineData("portalSaturate", 2.0);
          }
        });

        scene.tweens.addCounter({
          duration: Utils.fixedInt(SUMMON_CONFIG.flash.dur),
          onComplete: () => {
            scene.tweens.addCounter({
              from: 0,
              to: 100,
              duration: Utils.fixedInt(fadeDur),
              ease: "Quad.easeOut",
              onUpdate: (tween: Phaser.Tweens.Tween) => {
                const t = tween.getValue() / 100;
                creatureSprite.setPipelineData("portalBrightness", SUMMON_CONFIG.flash.brightness + (1.0 - SUMMON_CONFIG.flash.brightness) * t);
                creatureSprite.setPipelineData("portalSaturate", 2.0 + (1.0 - 2.0) * t);
              },
              onComplete: () => {
                creatureSprite.setPipelineData("portalBrightness", 1.0);
                creatureSprite.setPipelineData("portalSaturate", 1.0);
                creatureSprite.setPipelineData("ignoreTimeTint", 0);
              }
            });
          }
        });
      }
    });

    const pfColors = getColorPalette(SUMMON_CONFIG.postFlash.color);
    const pfY = eggHatchY(SUMMON_CONFIG.postFlash.yPercent);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(postFlashStart),
      onComplete: () => {
        spawnParticlesBatched(scene, SUMMON_CONFIG.postFlash.count, 8, allObjects, (i) => {
          const w = (SUMMON_CONFIG.postFlash.size * 0.5 + Math.random() * SUMMON_CONFIG.postFlash.size) * pxScale;
          const h = (SUMMON_CONFIG.postFlash.size * 0.5 + Math.random() * SUMMON_CONFIG.postFlash.size * 1.2) * pxScale;

          const shard = scene.add.image(anchorX, pfY, "pb_particles", "3.png");
          shard.setTintFill(pickColor(pfColors));
          shard.setDisplaySize(w, h);
          shard.setAngle(Math.random() * 360);
          placeLocal(shard);
          allObjects.push(shard);

          const spreadAngle = Math.random() * Math.PI * 2;
          const dist = htmlPxToField(20 + Math.random() * 40, pxScale);
          const animDur = 400 + Math.random() * 300;
          const stagger = Math.random() * 60;

          scene.tweens.add({
            targets: shard,
            x: anchorX + Math.cos(spreadAngle) * dist,
            y: pfY + Math.sin(spreadAngle) * dist,
            alpha: 0,
            angle: shard.angle + (Math.random() * 720 - 360),
            scale: 0.3,
            duration: Utils.fixedInt(animDur),
            ease: "Cubic.easeOut",
            delay: Utils.fixedInt(stagger),
            onComplete: () => shard.destroy()
          });
        });
      }
    });

    const riseCopyColors = [SUMMON_CONFIG.riseCopy.color, lightenColor(SUMMON_CONFIG.riseCopy.color, 30), 0xffffff];
    const riseCopyStartY = eggHatchY(SUMMON_CONFIG.riseCopy.startYPercent);
    const riseCopyEndY = eggHatchY(SUMMON_CONFIG.riseCopy.endYPercent);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(riseCopyStart),
      onComplete: () => {
        spawnParticlesBatched(scene, SUMMON_CONFIG.riseCopy.count, 6, allObjects, (i) => {
          const s = (SUMMON_CONFIG.riseCopy.size * 0.5 + Math.random() * SUMMON_CONFIG.riseCopy.size) * pxScale;

          const particle = scene.add.image(
            anchorX + (Math.random() - 0.5) * htmlPxToField(20, pxScale),
            riseCopyStartY,
            "pb_particles", "5.png"
          );
          particle.setTintFill(riseCopyColors[Math.floor(Math.random() * 3)]);
          particle.setDisplaySize(s, s);
          particle.setAlpha(0.8);
          placeLocal(particle);
          allObjects.push(particle);

          const animDur = SUMMON_CONFIG.riseCopy.dur + Math.random() * 400;
          scene.tweens.add({
            targets: particle,
            y: riseCopyEndY,
            alpha: 0,
            duration: Utils.fixedInt(animDur),
            ease: "Quad.easeOut",
            delay: Utils.fixedInt(i * 40),
            onComplete: () => particle.destroy()
          });
        });
      }
    });

    scene.tweens.addCounter({
      duration: Utils.fixedInt(totalDur),
      onComplete: () => {
        allObjects.forEach(p => { if (p.scene) p.destroy(); });
        creatureSprite.setPipelineData("portalBrightness", 1.0);
        creatureSprite.setPipelineData("portalInvert", 0.0);
        creatureSprite.setPipelineData("portalHueRotate", 0.0);
        creatureSprite.setPipelineData("portalSaturate", 1.0);
        creatureSprite.setPipelineData("ignoreTimeTint", 0);
        if (portalSprite) {
          portalSprite.setOrigin(0.5, portalOriginalOriginY);
          portalSprite.y = portalOriginalY;
          if (portalSprite.postFX) {
            portalSprite.postFX.clear();
          }
        }
        resolve();
      }
    });
  });
}

export function playPortalFaintAnim(scene: BattleScene, pokemon: Pokemon): Promise<void> {
  return new Promise((resolve) => {
    const pxScale = pokemon.getSpriteScale();
    const allObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];

    (pokemon as any)._portalAnimActive = true;

    const tintSpriteReset = (pokemon as any).getTintSprite?.();
    if (tintSpriteReset) {
      scene.tweens.killTweensOf(tintSpriteReset);
      tintSpriteReset.setVisible(false);
      tintSpriteReset.setAlpha(0);
      tintSpriteReset.clearTint();
    }

    const glitchStart = FAINT_CONFIG.initialDelay;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(glitchStart),
      onComplete: () => {
        let gc = 0;
        const originalX = pokemon.x;
        const sprite = pokemon.getSprite();

        if (sprite) {
          sprite.setPipelineData("ignoreTimeTint", 1);
        }

        const glitchTimer = scene.time.addEvent({
          delay: Utils.fixedInt(FAINT_CONFIG.glitch.dur / FAINT_CONFIG.glitch.steps) as any,
          repeat: FAINT_CONFIG.glitch.steps - 1,
          callback: () => {
            gc++;
            const ox = (Math.random() - 0.5) * FAINT_CONFIG.glitch.intensity;
            pokemon.x = originalX + ox;

            if (sprite) {
              sprite.setPipelineData("portalHueRotate", Math.random() * 360);
              sprite.setPipelineData("portalBrightness", 0.8 + Math.random() * 0.4);
            }

            if (gc >= FAINT_CONFIG.glitch.steps) {
              glitchTimer.remove();
              pokemon.x = originalX;
              if (sprite) {
                sprite.setPipelineData("portalHueRotate", 0.0);
                sprite.setPipelineData("portalInvert", 1.0);
                sprite.setPipelineData("portalBrightness", 1.5);
                scene.time.delayedCall(Utils.fixedInt(FAINT_CONFIG.glitch.invertDur) as any, () => {
                  sprite.setPipelineData("portalInvert", 0.0);
                  sprite.setPipelineData("portalBrightness", 1.0);
                  sprite.setPipelineData("ignoreTimeTint", 0);
                  sprite.setVisible(false);
                });
              } else {
                const fallbackSprite = pokemon.getSprite();
                if (fallbackSprite) fallbackSprite.setVisible(false);
              }
            }
          }
        });
      }
    });

    const shatterStart = glitchStart + FAINT_CONFIG.glitch.dur + 200 - FAINT_CONFIG.shatter.early;
    const shatterColors = getColorPalette(FAINT_CONFIG.shatter.color);
    const shatterY = htmlYToFieldY(FAINT_CONFIG.shatter.yPercent, pokemon, pxScale);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(shatterStart),
      onComplete: () => {
        for (let i = 0; i < FAINT_CONFIG.shatter.count; i++) {
          const sz = FAINT_CONFIG.shatter.size;
          const w = (sz * 0.5 + Math.random() * sz) * pxScale;
          const h = (sz * 0.5 + Math.random() * sz * 1.5) * pxScale;

          const shard = scene.add.image(pokemon.x, shatterY, "pb_particles", "3.png");
          shard.setTintFill(pickColor(shatterColors));
          shard.setDisplaySize(w, h);
          shard.setAngle(Math.random() * 360);
          placeParticle(scene, shard, pokemon, FAINT_CONFIG.shatter.zFront);
          allObjects.push(shard);

          const spreadAngle = Math.random() * Math.PI * 2;
          const dist = htmlPxToField(15 + Math.random() * 35 + sz * 2, pxScale);
          const stagger = Math.random() * 80;

          scene.tweens.add({
            targets: shard,
            x: pokemon.x + Math.cos(spreadAngle) * dist,
            y: shatterY + Math.sin(spreadAngle) * dist,
            angle: shard.angle + (Math.random() * 720 - 360),
            scale: 0.3,
            duration: Utils.fixedInt(FAINT_CONFIG.shatter.dur),
            ease: "Quad.easeOut",
            delay: Utils.fixedInt(stagger),
            onComplete: () => shard.destroy()
          });
          scene.tweens.add({
            targets: shard,
            alpha: 0,
            duration: Utils.fixedInt(FAINT_CONFIG.shatter.dur * 0.4),
            ease: "Quad.easeIn",
            delay: Utils.fixedInt(stagger + FAINT_CONFIG.shatter.dur * 0.6)
          });
        }
      }
    });

    const explodeStart = shatterStart + FAINT_CONFIG.shatter.dur - FAINT_CONFIG.explode.early;
    const explodeColors = [FAINT_CONFIG.explode.color, lightenColor(FAINT_CONFIG.explode.color, 30), 0xffffff, lightenColor(FAINT_CONFIG.explode.color, -20)];
    const explodeY = htmlYToFieldY(FAINT_CONFIG.explode.yPercent, pokemon, pxScale);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(explodeStart),
      onComplete: () => {
        const centerX = pokemon.x;
        const centerY = explodeY;

        if (FAINT_CONFIG.glitch.dur <= 0 && pokemon.visible) {
          scene.tweens.add({
            targets: pokemon,
            alpha: 0,
            duration: Utils.fixedInt(FAINT_CONFIG.explode.dur * 0.3),
            onComplete: () => pokemon.setVisible(false)
          });
        }

        const ring = scene.add.graphics();
        const ringRadius = htmlPxToField(FAINT_CONFIG.explode.ringSize, pxScale) / 2;
        const glowLayers = 5;
        const maxGlowWidth = htmlPxToField(FAINT_CONFIG.explode.ringGlow, pxScale);
        for (let gl = glowLayers; gl >= 1; gl--) {
          const layerWidth = maxGlowWidth * (gl / glowLayers);
          const layerAlpha = 0.15 * (1 - (gl - 1) / glowLayers);
          ring.lineStyle(layerWidth, FAINT_CONFIG.explode.color, layerAlpha);
          ring.strokeCircle(0, 0, ringRadius);
        }
        ring.lineStyle(htmlPxToField(FAINT_CONFIG.explode.ringBorder, pxScale), FAINT_CONFIG.explode.color, 1);
        ring.strokeCircle(0, 0, ringRadius);
        ring.setPosition(centerX, centerY);
        placeParticle(scene, ring, pokemon, FAINT_CONFIG.explode.zFront);
        allObjects.push(ring);

        scene.tweens.add({
          targets: ring,
          scale: FAINT_CONFIG.explode.ringScale,
          alpha: 0,
          duration: Utils.fixedInt(FAINT_CONFIG.explode.dur),
          ease: "Quad.easeOut",
          delay: Utils.fixedInt(30),
          onComplete: () => ring.destroy()
        });

        for (let i = 0; i < FAINT_CONFIG.explode.count; i++) {
          const s = (FAINT_CONFIG.explode.size * 0.5 + Math.random() * FAINT_CONFIG.explode.size) * pxScale;
          const colorPick = explodeColors[Math.floor(Math.random() * 4)];

          const particle = scene.add.image(centerX, centerY, "pb_particles", Math.random() > 0.5 ? "5.png" : "3.png");
          particle.setTintFill(colorPick);
          particle.setDisplaySize(s, s);
          placeParticle(scene, particle, pokemon, FAINT_CONFIG.explode.zFront);
          allObjects.push(particle);

          const spreadAngle = Math.random() * Math.PI * 2;
          const dist = htmlPxToField(FAINT_CONFIG.explode.radius * 0.5 + Math.random() * FAINT_CONFIG.explode.radius, pxScale);
          const animDur = FAINT_CONFIG.explode.dur + Math.random() * 300;
          const stagger = Math.random() * 100;

          scene.tweens.add({
            targets: particle,
            x: centerX + Math.cos(spreadAngle) * dist,
            y: centerY + Math.sin(spreadAngle) * dist,
            alpha: 0,
            duration: Utils.fixedInt(animDur),
            ease: "Cubic.easeOut",
            delay: Utils.fixedInt(stagger),
            onComplete: () => particle.destroy()
          });
        }

        scene.tweens.addCounter({
          duration: Utils.fixedInt(FAINT_CONFIG.explode.dur * 0.5),
          onComplete: () => {
            if (pokemon.portalSprite) {
              scene.tweens.add({
                targets: pokemon.portalSprite,
                alpha: 0,
                duration: Utils.fixedInt(FAINT_CONFIG.portalFadeDur),
                onComplete: () => {
                  if (pokemon.portalSprite?.postFX) {
                    pokemon.portalSprite.postFX.clear();
                  }
                  pokemon.portalSprite?.setVisible(false);
                }
              });
            }
          }
        });
      }
    });

    const totalDur = explodeStart + FAINT_CONFIG.explode.dur + 500;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(totalDur),
      onComplete: () => {
        allObjects.forEach(p => { if (p.scene) p.destroy(); });
        const sprite = pokemon.getSprite();
        if (sprite) {
          sprite.setPipelineData("portalBrightness", 1.0);
          sprite.setPipelineData("portalInvert", 0.0);
          sprite.setPipelineData("portalHueRotate", 0.0);
          sprite.setPipelineData("portalSaturate", 1.0);
          sprite.setPipelineData("ignoreTimeTint", 0);
        }
        (pokemon as any)._portalAnimActive = false;
        resolve();
      }
    });
  });
}

export function playTrainerPortalFaintAnim(scene: BattleScene, trainer: Trainer): Promise<void> {
  return new Promise((resolve) => {
    const sprites = trainer.getSprites();
    const tintSprites = trainer.getTintSprites();
    const sprite = sprites?.[0];
    if (!sprite) { resolve(); return; }

    const pxScale = 0.45;
    const allObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];

    sprite.setPipelineData("ignoreTimeTint", 1);

    const glitchStart = FAINT_CONFIG.initialDelay;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(glitchStart),
      onComplete: () => {
        let gc = 0;
        const originalX = trainer.x;

        const glitchTimer = scene.time.addEvent({
          delay: Utils.fixedInt(FAINT_CONFIG.glitch.dur / FAINT_CONFIG.glitch.steps) as any,
          repeat: FAINT_CONFIG.glitch.steps - 1,
          callback: () => {
            gc++;
            const ox = (Math.random() - 0.5) * FAINT_CONFIG.glitch.intensity;
            trainer.x = originalX + ox;

            sprite.setPipelineData("portalHueRotate", Math.random() * 360);
            sprite.setPipelineData("portalBrightness", 0.8 + Math.random() * 0.4);

            if (gc >= FAINT_CONFIG.glitch.steps) {
              glitchTimer.remove();
              trainer.x = originalX;
              sprite.setPipelineData("portalHueRotate", 0.0);
              sprite.setPipelineData("portalInvert", 1.0);
              sprite.setPipelineData("portalBrightness", 1.5);
              scene.time.delayedCall(Utils.fixedInt(FAINT_CONFIG.glitch.invertDur) as any, () => {
                sprite.setPipelineData("portalInvert", 0.0);
                sprite.setPipelineData("portalBrightness", 1.0);
                sprite.setPipelineData("ignoreTimeTint", 0);
                sprites.forEach(s => s.setVisible(false));
                tintSprites.forEach(s => s.setVisible(false));
              });
            }
          }
        });
      }
    });

    const shatterStart = glitchStart + FAINT_CONFIG.glitch.dur + 200 - FAINT_CONFIG.shatter.early;
    const shatterColors = getColorPalette(FAINT_CONFIG.shatter.color);
    const shatterY = trainer.y - 25;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(shatterStart),
      onComplete: () => {
        for (let i = 0; i < FAINT_CONFIG.shatter.count; i++) {
          const sz = FAINT_CONFIG.shatter.size;
          const w = (sz * 0.5 + Math.random() * sz) * pxScale;
          const h = (sz * 0.5 + Math.random() * sz * 1.5) * pxScale;

          const shard = scene.add.image(trainer.x, shatterY, "pb_particles", "3.png");
          shard.setTintFill(pickColor(shatterColors));
          shard.setDisplaySize(w, h);
          shard.setAngle(Math.random() * 360);
          scene.field.add(shard);
          allObjects.push(shard);

          const spreadAngle = Math.random() * Math.PI * 2;
          const dist = htmlPxToField(15 + Math.random() * 35 + sz * 2, pxScale);
          const stagger = Math.random() * 80;

          scene.tweens.add({
            targets: shard,
            x: trainer.x + Math.cos(spreadAngle) * dist,
            y: shatterY + Math.sin(spreadAngle) * dist,
            angle: shard.angle + (Math.random() * 720 - 360),
            scale: 0.3,
            duration: Utils.fixedInt(FAINT_CONFIG.shatter.dur),
            ease: "Quad.easeOut",
            delay: Utils.fixedInt(stagger),
            onComplete: () => shard.destroy()
          });
          scene.tweens.add({
            targets: shard,
            alpha: 0,
            duration: Utils.fixedInt(FAINT_CONFIG.shatter.dur * 0.4),
            ease: "Quad.easeIn",
            delay: Utils.fixedInt(stagger + FAINT_CONFIG.shatter.dur * 0.6)
          });
        }
      }
    });

    const explodeStart = shatterStart + FAINT_CONFIG.shatter.dur - FAINT_CONFIG.explode.early;
    const explodeColors = [FAINT_CONFIG.explode.color, lightenColor(FAINT_CONFIG.explode.color, 30), 0xffffff, lightenColor(FAINT_CONFIG.explode.color, -20)];
    const explodeY = trainer.y - 25;

    scene.tweens.addCounter({
      duration: Utils.fixedInt(explodeStart),
      onComplete: () => {
        const centerX = trainer.x;
        const centerY = explodeY;

        const ring = scene.add.graphics();
        const ringRadius = htmlPxToField(FAINT_CONFIG.explode.ringSize, pxScale) / 2;
        const glowLayers = 5;
        const maxGlowWidth = htmlPxToField(FAINT_CONFIG.explode.ringGlow, pxScale);
        for (let gl = glowLayers; gl >= 1; gl--) {
          const layerWidth = maxGlowWidth * (gl / glowLayers);
          const layerAlpha = 0.15 * (1 - (gl - 1) / glowLayers);
          ring.lineStyle(layerWidth, FAINT_CONFIG.explode.color, layerAlpha);
          ring.strokeCircle(0, 0, ringRadius);
        }
        ring.lineStyle(htmlPxToField(FAINT_CONFIG.explode.ringBorder, pxScale), FAINT_CONFIG.explode.color, 1);
        ring.strokeCircle(0, 0, ringRadius);
        ring.setPosition(centerX, centerY);
        scene.field.add(ring);
        allObjects.push(ring);

        scene.tweens.add({
          targets: ring,
          scale: FAINT_CONFIG.explode.ringScale,
          alpha: 0,
          duration: Utils.fixedInt(FAINT_CONFIG.explode.dur),
          ease: "Quad.easeOut",
          delay: Utils.fixedInt(30),
          onComplete: () => ring.destroy()
        });

        for (let i = 0; i < FAINT_CONFIG.explode.count; i++) {
          const s = (FAINT_CONFIG.explode.size * 0.5 + Math.random() * FAINT_CONFIG.explode.size) * pxScale;
          const colorPick = explodeColors[Math.floor(Math.random() * 4)];

          const particle = scene.add.image(centerX, centerY, "pb_particles", Math.random() > 0.5 ? "5.png" : "3.png");
          particle.setTintFill(colorPick);
          particle.setDisplaySize(s, s);
          scene.field.add(particle);
          allObjects.push(particle);

          const spreadAngle = Math.random() * Math.PI * 2;
          const dist = htmlPxToField(FAINT_CONFIG.explode.radius * 0.5 + Math.random() * FAINT_CONFIG.explode.radius, pxScale);
          const animDur = FAINT_CONFIG.explode.dur + Math.random() * 300;
          const stagger = Math.random() * 100;

          scene.tweens.add({
            targets: particle,
            x: centerX + Math.cos(spreadAngle) * dist,
            y: centerY + Math.sin(spreadAngle) * dist,
            alpha: 0,
            duration: Utils.fixedInt(animDur),
            ease: "Cubic.easeOut",
            delay: Utils.fixedInt(stagger),
            onComplete: () => particle.destroy()
          });
        }
      }
    });

    const totalDur = explodeStart + FAINT_CONFIG.explode.dur + 500;

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

export function playTrainerPortalSummonAnim(scene: BattleScene, trainer: Trainer, portalSprite: Phaser.GameObjects.Sprite): Promise<void> {
  return new Promise((resolve) => {
    const sprites = trainer.getSprites();
    const sprite = sprites?.[0];
    if (!sprite) { resolve(); return; }

    const pxScale = 0.45;
    const allObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];

    sprite.setPipelineData("portalBrightness", 1.0);
    sprite.setPipelineData("portalInvert", 0.0);
    sprite.setPipelineData("portalHueRotate", 0.0);
    sprite.setPipelineData("portalSaturate", 1.0);
    sprite.setPipelineData("ignoreTimeTint", 0);

    const layoutScale = portalSprite.scale || 1;
    portalSprite.setAlpha(0);
    portalSprite.setVisible(true);
    portalSprite.setScale(layoutScale, layoutScale * 0.3);
    if (portalSprite.postFX) {
      portalSprite.postFX.addGlow(0x7828c8, 4, 0, false, 0.6, 8);
    }

    const dissolveStart = SUMMON_CONFIG.portal.dur - SUMMON_CONFIG.dissolve.early;
    const silhouetteStart = dissolveStart + SUMMON_CONFIG.dissolve.dur - SUMMON_CONFIG.silhouette.early;
    const flashStart = silhouetteStart + SUMMON_CONFIG.silhouette.hold - SUMMON_CONFIG.flash.early;
    const totalDur = flashStart + (SUMMON_CONFIG.flash.dur * 2) + SUMMON_CONFIG.flash.dur + 400;

    scene.tweens.add({
      targets: portalSprite,
      alpha: 1,
      duration: Utils.fixedInt(SUMMON_CONFIG.portal.dur),
      ease: "Quad.easeIn",
      delay: Utils.fixedInt(SUMMON_CONFIG.portal.delay)
    });

    scene.tweens.add({
      targets: portalSprite,
      scaleY: layoutScale,
      duration: Utils.fixedInt(SUMMON_CONFIG.portal.dur),
      ease: "Back.easeOut",
      delay: Utils.fixedInt(SUMMON_CONFIG.portal.delay)
    });

    const dissolveColors = getColorPalette(SUMMON_CONFIG.dissolve.color);

    scene.tweens.addCounter({
      duration: Utils.fixedInt(dissolveStart),
      onComplete: () => {
        spawnParticlesBatched(scene, SUMMON_CONFIG.dissolve.count, 8, allObjects, (i) => {
          const s = (SUMMON_CONFIG.dissolve.size * 0.5 + Math.random() * SUMMON_CONFIG.dissolve.size) * pxScale;
          const ang = (Math.PI * 2 * i) / SUMMON_CONFIG.dissolve.count;
          const r = htmlPxToField(SUMMON_CONFIG.dissolve.spread, pxScale) + Math.random() * 20;

          const startX = trainer.x + Math.cos(ang) * r;
          const startY = trainer.y - 25 + Math.sin(ang) * r;

          const particle = scene.add.image(startX, startY, "pb_particles", "5.png");
          particle.setTintFill(pickColor(dissolveColors));
          particle.setDisplaySize(s, s);
          scene.field.add(particle);
          allObjects.push(particle);

          const staggerDelay = i * (SUMMON_CONFIG.dissolve.dur / SUMMON_CONFIG.dissolve.count) * 0.3;
          scene.tweens.add({
            targets: particle,
            x: trainer.x,
            y: trainer.y - 25,
            alpha: 0.3,
            duration: Utils.fixedInt(SUMMON_CONFIG.dissolve.dur),
            ease: "Quad.easeIn",
            delay: Utils.fixedInt(staggerDelay),
            onComplete: () => particle.destroy()
          });
        });
      }
    });

    scene.tweens.addCounter({
      duration: Utils.fixedInt(silhouetteStart),
      onComplete: () => {
        sprites.forEach(s => {
          s.setVisible(true);
          s.setAlpha(0);
          s.setPipelineData("portalBrightness", 0);
          s.setPipelineData("ignoreTimeTint", 1);
          if (s.pipelineData["hasShadow"] !== false) {
            s.setPipelineData("hasShadow", true);
          }
        });
        trainer.setVisible(true);
        trainer.setAlpha(1);

        scene.tweens.add({
          targets: sprites,
          alpha: 1,
          duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.fadeIn),
          ease: "Quad.easeIn"
        });

        scene.tweens.addCounter({
          duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.hold),
          onComplete: () => {
            scene.tweens.addCounter({
              from: 0,
              to: 100,
              duration: Utils.fixedInt(SUMMON_CONFIG.silhouette.revealDur),
              ease: "Quad.easeOut",
              onUpdate: (tween: Phaser.Tweens.Tween) => {
                sprites.forEach(s => s.setPipelineData("portalBrightness", tween.getValue() / 100));
              }
            });
          }
        });
      }
    });

    scene.tweens.addCounter({
      duration: Utils.fixedInt(flashStart),
      onComplete: () => {
        const rampDur = Math.round(SUMMON_CONFIG.flash.dur * SUMMON_CONFIG.flash.rampFraction);
        const fadeDur = Math.round(SUMMON_CONFIG.flash.dur * SUMMON_CONFIG.flash.fadeFraction);

        scene.tweens.addCounter({
          from: 100,
          to: SUMMON_CONFIG.flash.brightness * 100,
          duration: Utils.fixedInt(rampDur),
          ease: "Quad.easeInOut",
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            sprites.forEach(s => {
              s.setPipelineData("portalBrightness", tween.getValue() / 100);
              s.setPipelineData("portalSaturate", 1.0 + (tween.getValue() - 100) / (SUMMON_CONFIG.flash.brightness * 100 - 100));
            });
          }
        });

        scene.tweens.addCounter({
          duration: Utils.fixedInt(SUMMON_CONFIG.flash.dur),
          onComplete: () => {
            scene.tweens.addCounter({
              from: 0,
              to: 100,
              duration: Utils.fixedInt(fadeDur),
              ease: "Quad.easeOut",
              onUpdate: (tween: Phaser.Tweens.Tween) => {
                const t = tween.getValue() / 100;
                sprites.forEach(s => {
                  s.setPipelineData("portalBrightness", SUMMON_CONFIG.flash.brightness + (1.0 - SUMMON_CONFIG.flash.brightness) * t);
                  s.setPipelineData("portalSaturate", 2.0 + (1.0 - 2.0) * t);
                });
              },
              onComplete: () => {
                sprites.forEach(s => {
                  s.setPipelineData("portalBrightness", 1.0);
                  s.setPipelineData("portalSaturate", 1.0);
                  s.setPipelineData("ignoreTimeTint", 0);
                });
              }
            });
          }
        });
      }
    });

    scene.tweens.addCounter({
      duration: Utils.fixedInt(totalDur),
      onComplete: () => {
        allObjects.forEach(p => { if (p.scene) p.destroy(); });
        sprites.forEach(s => {
          s.setPipelineData("portalBrightness", 1.0);
          s.setPipelineData("portalInvert", 0.0);
          s.setPipelineData("portalHueRotate", 0.0);
          s.setPipelineData("portalSaturate", 1.0);
          s.setPipelineData("ignoreTimeTint", 0);
        });
        if (trainer.portalSprite === portalSprite && portalSprite.scene) {
          if (portalSprite.postFX) {
            portalSprite.postFX.clear();
          }
        }
        resolve();
      }
    });
  });
}