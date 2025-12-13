import BattleScene from "#app/battle-scene.js";
import { Biome } from "#app/enums/biome.js";
import { getBiomeKey, getBiomeHasProps } from "#app/field/arena.js";
import { isIPhone } from "#app/loading-scene.js";
import { BattlePhase } from "./battle-phase";
import Overrides from "#app/overrides.js";
import { AssetLoadProfiler } from "#app/system/asset-load-profiler.js";

export class SwitchBiomePhase extends BattlePhase {
  private nextBiome: Biome;

  constructor(scene: BattleScene, nextBiome: Biome) {
    super(scene);

    this.nextBiome = nextBiome;
  }

  start() {
    super.start();

    if (this.nextBiome === undefined) {
      return this.end();
    }

    if (isIPhone()) {
      this.loadNextBiomeAssets().then(() => this.performBiomeSwitch());
      return;
    }
    this.performBiomeSwitch();
  }

  private loadNextBiomeAssets(): Promise<void> {
    return new Promise(resolve => {
      const biomeKey = getBiomeKey(this.nextBiome);
      if (this.scene.textures.exists(`${biomeKey}_bg`)) {
        resolve();
        return;
      }

      if (Overrides.DEBUG_IOS_MODE) {
        AssetLoadProfiler.getInstance().trackLazyLoad(`${biomeKey}_bg`, "SwitchBiomePhase.loadNextBiomeAssets");
      }

      const isBaseAnimated = biomeKey === "end";

      this.scene.loadImage(`${biomeKey}_bg`, "arenas");
      if (!isBaseAnimated) {
        this.scene.loadImage(`${biomeKey}_a`, "arenas");
        this.scene.loadImage(`${biomeKey}_b`, "arenas");
      } else {
        this.scene.loadAtlas(`${biomeKey}_a`, "arenas");
        this.scene.loadAtlas(`${biomeKey}_b`, "arenas");
      }

      if (getBiomeHasProps(this.nextBiome)) {
        for (let p = 1; p <= 3; p++) {
          const isPropAnimated = p === 3 && ["power_plant", "end"].includes(biomeKey);
          const propKey = `${biomeKey}_b_${p}`;
          if (!isPropAnimated) {
            this.scene.loadImage(propKey, "arenas");
          } else {
            this.scene.loadAtlas(propKey, "arenas");
          }
        }
      }

      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        resolve();
      });
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  private performBiomeSwitch(): void {
    this.scene.tweens.add({
      targets: [this.scene.arenaEnemy, this.scene.lastEnemyTrainer],
      x: "+=300",
      duration: 2000,
      onComplete: () => {
        this.scene.arenaEnemy.setX(this.scene.arenaEnemy.x - 600);

        this.scene.newArena(this.nextBiome);

        const biomeKey = getBiomeKey(this.nextBiome);
        const bgTexture = `${biomeKey}_bg`;
        this.scene.arenaBgTransition.setTexture(bgTexture);
        this.scene.arenaBgTransition.setAlpha(0);
        this.scene.arenaBgTransition.setVisible(true);
        this.scene.arenaPlayerTransition.setBiome(this.nextBiome);
        this.scene.arenaPlayerTransition.setAlpha(0);
        this.scene.arenaPlayerTransition.setVisible(true);

        this.scene.tweens.add({
          targets: [this.scene.arenaPlayer, this.scene.arenaBgTransition, this.scene.arenaPlayerTransition],
          duration: 1000,
          delay: 1000,
          ease: "Sine.easeInOut",
          alpha: (target: any) => target === this.scene.arenaPlayer ? 0 : 1,
          onComplete: () => {
            this.scene.arenaBg.setTexture(bgTexture);
            this.scene.arenaPlayer.setBiome(this.nextBiome);
            this.scene.arenaPlayer.setAlpha(1);
            this.scene.arenaEnemy.setBiome(this.nextBiome);
            this.scene.arenaEnemy.setAlpha(1);
            this.scene.arenaNextEnemy.setBiome(this.nextBiome);
            this.scene.arenaBgTransition.setVisible(false);
            this.scene.arenaPlayerTransition.setVisible(false);
            if (this.scene.lastEnemyTrainer) {
              this.scene.lastEnemyTrainer.destroy();
            }

            this.end();
          }
        });
      }
    });
  }
}