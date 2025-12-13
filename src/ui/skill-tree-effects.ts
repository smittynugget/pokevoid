import BattleScene from "#app/battle-scene";

export class SkillTreeEffects {
  private scene: BattleScene;
  constructor(scene: BattleScene) {
    this.scene = scene;
  }

  addNodePulseAnimation(nodeContainer: Phaser.GameObjects.Container, color: number, duration: number = 1500): void {
    const pulseCircle = this.scene.add.graphics();
    pulseCircle.lineStyle(2, color, 0.8);
    pulseCircle.strokeCircle(0, 0, 50);
    nodeContainer.add(pulseCircle);
    this.scene.tweens.add({ targets: pulseCircle, scaleX: 1.3, scaleY: 1.3, alpha: 0.3, duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  addNodeGlowEffect(nodeContainer: Phaser.GameObjects.Container, color: number, intensity: number = 20): void {
    const glowCircle = this.scene.add.graphics();
    glowCircle.fillStyle(color, 0.3);
    glowCircle.fillCircle(0, 0, intensity);
    nodeContainer.addAt(glowCircle, 0);
    this.scene.tweens.add({ targets: glowCircle, scaleX: 1.2, scaleY: 1.2, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  addNodePurchaseEffect(nodeContainer: Phaser.GameObjects.Container): void {
    const particleKey = this.scene.textures.exists('sparkle') ? 'sparkle' : (this.scene.textures.exists('pb_particles') ? 'pb_particles' : 'tera_sparkle');
    const burstParticles = this.scene.add.particles(0, 0, particleKey, {
      scale: { start: 1.0, end: 0.1 },
      speed: { min: 50, max: 150 },
      lifespan: 800,
      quantity: 15,
      tint: [0xFFD700, 0xFFA500, 0xFFFF00] as any,
      blendMode: 'ADD',
    } as any);
    nodeContainer.add(burstParticles);
    this.scene.time.delayedCall(1000, () => burstParticles.destroy());
    this.scene.tweens.add({ targets: nodeContainer, scaleX: 1.3, scaleY: 1.3, duration: 200, yoyo: true, ease: 'Back.easeOut' });
  }

  addTreeLevelUpEffect(skillTreeContent: Phaser.GameObjects.Container): void {
    const expandWave = this.scene.add.graphics();
    expandWave.lineStyle(4, 0x00FFFF, 0.8);
    expandWave.strokeCircle(0, 0, 50);
    skillTreeContent.add(expandWave);
    this.scene.tweens.add({ targets: expandWave, scaleX: 10, scaleY: 10, alpha: 0, duration: 2000, ease: 'Cubic.easeOut', onComplete: () => expandWave.destroy() });
  }

  addConnectionRevealEffect(connectionLine: Phaser.GameObjects.Graphics): void {
    connectionLine.setAlpha(0);
    this.scene.tweens.add({ targets: connectionLine, alpha: 1, duration: 500, ease: 'Sine.easeIn' });
  }

  addChampionSelectHighlight(championSprite: Phaser.GameObjects.Sprite): void {
    const highlight = this.scene.add.graphics();
    highlight.lineStyle(4, 0xFFD700, 0.8);
    highlight.strokeRect(-championSprite.width / 2, -championSprite.height / 2, championSprite.width, championSprite.height);

    championSprite.parentContainer?.add(highlight);
    this.scene.tweens.add({ targets: highlight, alpha: 0.3, duration: 1000, yoyo: true, repeat: -1 });
  }
}