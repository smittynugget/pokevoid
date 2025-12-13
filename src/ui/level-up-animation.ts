import i18next from "i18next";
import BattleScene from "../battle-scene";
import { addTextObject, TextStyle } from "./text";
let currentAnimationSkipCallback: (() => void) | null = null;
export function skipCurrentLevelUpAnimation(): void {
  if (currentAnimationSkipCallback) {
    currentAnimationSkipCallback();
    currentAnimationSkipCallback = null;
  }
}

export async function playGenericLevelUpAnimation(scene: BattleScene, textOverride?: string, wrapWidth?: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let isSkipped = false;
    let isCompleted = false;
    const tweens: Phaser.Tweens.Tween[] = [];
    const timers: Phaser.Time.TimerEvent[] = [];
    const centerX = Math.floor(scene.game.canvas.width / 12);
    const centerY = Math.floor(-scene.game.canvas.height / 12);
    const container = scene.add.container(centerX, centerY);
    scene.ui.add(container);
    container.setDepth(1000);

  const isUnlockText = !!(textOverride && textOverride.includes("UNLOCKED"));
  const fontSize = isUnlockText ? 36 : 45;
  const title = addTextObject(
    scene,
    0,
    0,
    textOverride ?? i18next.t("championSelect:levelUp", { defaultValue: "LEVEL UP!" }),
    TextStyle.WINDOW,
    {
      fontSize: `${fontSize}px`,
      color: "#E0FFFF",
      stroke: "#4169E1",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: wrapWidth ?? 200, useAdvancedWrap: true }
    }
  );
  title.setOrigin(0.5, 0.5);
  title.setAlpha(0);
  container.add(title);

    const pulse = scene.add.graphics();
    container.add(pulse);

    const crystalShards: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 80 + Math.random() * 40;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const crystal = scene.add.graphics();
      crystal.fillStyle([0x4169E1, 0x87CEEB, 0xE0FFFF][i % 3], 0.9);
      const size = 10 + Math.random() * 15;
      crystal.beginPath();
      crystal.moveTo(0, -size);
      crystal.lineTo(-size / 2, size / 2);
      crystal.lineTo(size / 2, size / 2);
      crystal.closePath();
      crystal.fillPath();
      crystal.setPosition(x, y + 100);
      crystal.setScale(0);
      container.add(crystal);
      crystalShards.push(crystal);
      const tween = scene.tweens.add({ targets: crystal, y, scaleX: 1.5, scaleY: 1.5, duration: 600 + i * 100, ease: "Back.easeOut", delay: i * 80 });
      tweens.push(tween);
    }

    const particles = scene.add.particles(0, 0, "sparkle", {
      scale: { start: 0.4, end: 0.8 },
      speed: { min: 20, max: 80 },
      lifespan: 4000,
      quantity: 50,
      tint: [0x4169e1, 0x87ceeb, 0xe0ffff, 0xffd700],
      blendMode: "ADD",
      alpha: { start: 0.8, end: 0.2 }
    } as any);
    container.add(particles);

    const titleTween1 = scene.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        if (!isSkipped && !isCompleted) {
          const titleTween2 = scene.tweens.add({ targets: title, alpha: { from: 1, to: 0.7 }, duration: 300, yoyo: true, repeat: 8 });
          tweens.push(titleTween2);
        }
      }
    });
    tweens.push(titleTween1);

    let gridSize = 10;
    const gridTimer = scene.time.addEvent({
      delay: 100,
      repeat: 30,
      callback: () => {
        if (isSkipped || isCompleted) return;
        pulse.clear();
        pulse.lineStyle(2, 0x4169e1, 0.6);
        for (let i = -gridSize; i <= gridSize; i += 20) {
          pulse.lineBetween(-gridSize, i, gridSize, i);
          pulse.lineBetween(i, -gridSize, i, gridSize);
        }
        gridSize += 15;
      }
    });
    timers.push(gridTimer);

    for (let i = 0; i < 6; i++) {
      const ringTimer = scene.time.delayedCall(i * 300, () => {
        if (isSkipped || isCompleted) return;
        const ring = scene.add.graphics();
        container.add(ring);
        ring.lineStyle(4, [0x4169E1, 0x87CEEB, 0xE0FFFF][i % 3], 0.8);
        ring.strokeCircle(0, 0, 30);
        const ringTween = scene.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 1500, ease: "Power2.easeOut", onComplete: () => ring.destroy() });
        tweens.push(ringTween);
      });
      timers.push(ringTimer);
    }

    container.bringToTop(title);
    const fanfare = scene.playSound("evolution_fanfare_rse");
    const cleanup = () => {
      if (isCompleted) return;
      isCompleted = true;

      try {

        timers.forEach(timer => {
          if (timer && !timer.hasDispatched) {
            timer.remove();
          }
        });
        tweens.forEach(tween => {
          if (tween && tween.isPlaying()) {
            tween.stop();
          }
        });
        if (gridTimer) gridTimer.remove();
        if (particles) particles.destroy();
        if (pulse) pulse.destroy();
        crystalShards.forEach(crystal => {
          if (crystal) crystal.destroy();
        });
        if (title) title.destroy();
        if (container) container.destroy();
      } catch (e) {
        console.error("Error cleaning up level up animation:", e);

        try { if (container) container.destroy(); } catch {}
      }
      currentAnimationSkipCallback = null;

      resolve();
    };
    currentAnimationSkipCallback = () => {
      if (isSkipped || isCompleted) return;
      isSkipped = true;
      cleanup();
    };
    const completeTimer = scene.time.delayedCall(5000, () => {
      if (!isSkipped && !isCompleted) {
        cleanup();
      }
    });
    timers.push(completeTimer);
  });
}