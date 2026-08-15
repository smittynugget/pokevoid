import { getTypeRgb } from "#app/data/type.ts";
import { Type } from "#app/data/type.ts";
import { TrainerType } from "#app/enums/trainer-type.ts";
import BattleScene from "../battle-scene";
import * as Utils from "../utils";
import { applyTrainerDualColorAltBuild, getTrainerSpriteCluster4 } from "../utils/trainer-dualcolor-recolor";

export default class CharSprite extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private transitionSprite: Phaser.GameObjects.Sprite;
  private _charPixFx: Phaser.FX.Pixelate | null = null;

  public key: string;
  public variant: string;
  public shown: boolean;

  constructor(scene: BattleScene) {
    super(scene, (scene.game.canvas.width / 6) / 2, -42);
  }

  setup(): void {
    [ this.sprite, this.transitionSprite ] = new Array(2).fill(null).map(() => {
      const ret = this.scene.add.sprite(0, 0, "", "");
      ret.setOrigin(0.5, 1);
      ret.setScale(1.75);
      this.add(ret);
      return ret;
    });

    this.transitionSprite.setVisible(false);

    this.setVisible(false);
    this.shown = false;
  }

  showCharacter(key: string, variant: string): Promise<void> {
    return new Promise(resolve => {
      if (this.shown) {
        if (key === this.key && variant === this.variant) {
          return resolve();
        }
        if (key !== this.key) {
          return this.hide().then(() => this.showCharacter(key, variant));
        }
        this.setVariant(variant).then(() => resolve());
        return;
      }

      this.sprite.setTexture(key, variant);

      if (key.includes('smitom'))  this.sprite.setScale(.7);
      else if(key.includes('smitty_trainers')) this.sprite.setScale(0.88);
      else {
        this.sprite.setScale(1.4);
      }

      const texture = this.scene.textures.get(key);
      const frames = texture.getFrameNames().sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });

      if (frames.length > 1 && !key.includes('smitty_trainers')) {
        const lastFrameName = frames[frames.length - 1];
        this.sprite.setFrame(lastFrameName);
      }

      this.sprite.setAlpha(0);
      this.sprite.y = this.sprite.y + 15;

      const scene = this.scene as BattleScene;

      scene.fieldUI.bringToTop(this);

      if ((scene.gameMode.isNightmare || scene.currentBattle?.trainer?.isCorrupted) && !key.includes('smitty_trainers') && !key.includes('smitom')) {

        this.sprite.setPipeline(scene.spritePipeline, {tone: [0.0, 0.0, 0.0, 0.0],
    hasShadow: false});
        this.sprite.setPipelineData("ignoreFieldPos", true);

        const isCorrupted = !!scene.currentBattle?.trainer?.isCorrupted;
        const battleTrainer = scene.currentBattle?.trainer;
        const battleSprite = battleTrainer?.getSprites?.()?.[0];
        const srcData = battleSprite?.pipelineData;

        if (isCorrupted) {
          if (srcData?.["altBuildBlendMode"] === "duelmon_cluster4" && srcData?.["altBuildInversionFactor"] === 0.7) {
            this.sprite.pipelineData["altBuildSpriteColors"] = srcData["altBuildSpriteColors"];
            this.sprite.pipelineData["altBuildTargetColors"] = srcData["altBuildTargetColors"];
            this.sprite.pipelineData["altBuildBlendMode"] = "duelmon_cluster4";
            this.sprite.pipelineData["altBuildInversionFactor"] = 0.7;
          } else {
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
            const quantized = getTrainerSpriteCluster4(scene, this.sprite);
            const sourceColors = quantized || targetColors.map(() => [128, 128, 128, 255]);
            this.sprite.pipelineData["altBuildSpriteColors"] = sourceColors;
            this.sprite.pipelineData["altBuildTargetColors"] = targetColors;
            this.sprite.pipelineData["altBuildBlendMode"] = "duelmon_cluster4";
            this.sprite.pipelineData["altBuildInversionFactor"] = 0.7;
          }
          delete this.sprite.pipelineData["teraColor"];
          delete this.sprite.pipelineData["baseColor"];
        } else if (scene.gameMode.isNightmare) {
          const teraColor = srcData?.["teraColor"] || Utils.randSeedItem([
              getTypeRgb(Type.POISON),
              getTypeRgb(Type.DARK),
              [240, 48, 48],
              [12, 12, 18]
          ]);
          this.sprite.pipelineData["teraColor"] = teraColor;
          this.sprite.setPipelineData({ teraColor });
        }
    }
    else {
      this.sprite.setPipeline(scene.spritePipeline, {tone: [0.0, 0.0, 0.0, 0.0], hasShadow: false});
    }

    applyTrainerDualColorAltBuild(scene, this.sprite, !!scene.currentBattle?.trainer?.isCorrupted);

    if (scene.gameMode.isNightmare && (key.includes('smitty_trainers') || scene.currentBattle?.trainer?.isCorrupted)) {
      if(Utils.randSeedInt(0, 100) < 35) {
        scene.getRandomSmittySound();
      }
    }

      this.setVisible(texture.key !== Utils.MissingTextureKey);

      if (this.sprite.postFX && typeof this.sprite.postFX.addPixelate === "function") {
        this._charPixFx = this.sprite.postFX.addPixelate(20);
        this.scene.tweens.add({
          targets: this._charPixFx,
          amount: -1,
          duration: Utils.fixedInt(550),
          delay: Utils.fixedInt(200),
          ease: "Linear",
          onComplete: () => {
            if (this._charPixFx && this.sprite?.postFX) {
              this.sprite.postFX.remove(this._charPixFx);
              this._charPixFx = null;
            }
          }
        });
      }

      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 1,
        duration: Utils.fixedInt(750),
        ease: "Sine.easeOut",
        onComplete: () => {
          resolve();
        }
      });

      this.shown = true;
      this.key = key;
      this.variant = variant;
    });
  }

  setVariant(variant: string): Promise<void> {
    return new Promise(resolve => {
      (this.scene as BattleScene).fieldUI.bringToTop(this);

      this.transitionSprite.setTexture(this.key, variant);

      const texture = this.scene.textures.get(this.key);
      const frames = texture.getFrameNames().sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });

      if (frames.length > 1 && !this.key.includes('smitty_trainers')) {
        const lastFrameName = frames[frames.length - 1];
        this.transitionSprite.setFrame(lastFrameName);
      }

      const scene = this.scene as BattleScene;
      this.transitionSprite.setScale(this.sprite.scaleX, this.sprite.scaleY);
      this.transitionSprite.y = this.sprite.y;
      this.transitionSprite.setPipeline(scene.spritePipeline, { tone: [0.0, 0.0, 0.0, 0.0], hasShadow: false });
      const altBuildMode = this.sprite.pipelineData?.["altBuildBlendMode"];
      const altBuildInversion = this.sprite.pipelineData?.["altBuildInversionFactor"];
      if (altBuildMode === "duelmon_cluster4" && altBuildInversion === 0.7) {
        this.transitionSprite.pipelineData["altBuildSpriteColors"] = this.sprite.pipelineData["altBuildSpriteColors"];
        this.transitionSprite.pipelineData["altBuildTargetColors"] = this.sprite.pipelineData["altBuildTargetColors"];
        this.transitionSprite.pipelineData["altBuildBlendMode"] = "duelmon_cluster4";
        this.transitionSprite.pipelineData["altBuildInversionFactor"] = 0.7;
      } else {
        const teraColor = this.sprite.pipelineData?.["teraColor"];
        const baseColor = this.sprite.pipelineData?.["baseColor"];
        if (teraColor) {
          this.transitionSprite.setPipelineData(baseColor ? { teraColor, baseColor } : { teraColor });
        }
      }
      applyTrainerDualColorAltBuild(scene, this.transitionSprite, !!scene.currentBattle?.trainer?.isCorrupted);

      this.transitionSprite.setAlpha(0);
      this.transitionSprite.setVisible(true);
      this.scene.tweens.add({
        targets: this.transitionSprite,
        alpha: 1,
        duration: 250,
        ease: "Sine.easeIn",
        onComplete: () => {
          this.sprite.setTexture(this.key, variant);
          if (frames.length > 1 && !this.key.includes('smitty_trainers')) {
            this.sprite.setFrame(frames[frames.length - 1]);
          }
          this.sprite.setPipelineData("ignoreFieldPos", true);
          applyTrainerDualColorAltBuild(this.scene as BattleScene, this.sprite, !!(this.scene as BattleScene).currentBattle?.trainer?.isCorrupted);
          this.transitionSprite.setVisible(false);
          resolve();
        }
      });
      this.variant = variant;
    });
  }

  hide(): Promise<void> {
    return new Promise(resolve => {
      if (!this.shown) {
        return resolve();
      }

      if (this._charPixFx && this.sprite?.postFX) {
        this.sprite.postFX.remove(this._charPixFx);
        this._charPixFx = null;
      }

      let pixFx: Phaser.FX.Pixelate | null = null;
      if (this.sprite.postFX && typeof this.sprite.postFX.addPixelate === "function") {
        pixFx = this.sprite.postFX.addPixelate(0);
        this.scene.tweens.add({
          targets: pixFx,
          amount: 20,
          duration: Utils.fixedInt(750),
          ease: "Linear"
        });
      }

      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        duration: Utils.fixedInt(750),
        ease: "Sine.easeIn",
        onComplete: () => {
          if (pixFx && this.sprite.postFX) {
            this.sprite.postFX.remove(pixFx);
          }
          if (!this.shown) {
            this.setVisible(false);
            this.sprite.y = this.sprite.y - 15;
          }
          resolve();
        }
      });

      this.shown = false;
    });
  }
}