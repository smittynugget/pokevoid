import { getTypeRgb } from "#app/data/type.ts";
import { Type } from "#app/data/type.ts";
import { TrainerType } from "#app/enums/trainer-type.ts";
import BattleScene from "../battle-scene";
import * as Utils from "../utils";

export default class CharSprite extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private transitionSprite: Phaser.GameObjects.Sprite;

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
      else if(key.includes('smitty_trainers')) this.sprite.setScale(1.65);
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

      if ((scene.gameMode.isNightmare || scene.currentBattle?.trainer?.isCorrupted)  && !key.includes('smitty_trainers')) {

        this.sprite.setPipeline(scene.spritePipeline, {tone: [0.0, 0.0, 0.0, 0.0], 
    hasShadow: false});

        const baseColor = [0, 0, 0]; 
        const teraColor = Utils.randSeedItem([
            getTypeRgb(Type.POISON),
            getTypeRgb(Type.DARK),
            [240, 48, 48],
            [50, 50, 50]
        ]);
      
          
          if (scene.currentBattle?.trainer?.isCorrupted) {
            this.sprite.pipelineData["teraColor"] = teraColor;
            this.sprite.pipelineData["baseColor"] = baseColor;
            this.sprite.setPipelineData({ teraColor, baseColor });
          } else if (scene.gameMode.isNightmare) {
            this.sprite.pipelineData["teraColor"] = teraColor;
            this.sprite.setPipelineData({ teraColor });
          }
    }
    

    else {
      this.sprite.setPipeline(scene.spritePipeline, {tone: [0.0, 0.0, 0.0, 0.0], hasShadow: false});
    }

    if (scene.gameMode.isNightmare && (key.includes('smitty_trainers') || scene.currentBattle?.trainer?.isCorrupted)) {
      if(Utils.randSeedInt(0, 100) < 35) {
        scene.getRandomSmittySound(); 
      }
    }

      this.setVisible(texture.key !== Utils.MissingTextureKey);
      
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 1,
        duration: 750,
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
      
      if (frames.length > 1) {
        const lastFrameName = frames[frames.length - 1];
        this.transitionSprite.setFrame(lastFrameName);
      }

      this.transitionSprite.setAlpha(0);
      this.transitionSprite.setVisible(true);
      this.scene.tweens.add({
        targets: this.transitionSprite,
        alpha: 1,
        duration: 250,
        ease: "Sine.easeIn",
        onComplete: () => {
          this.sprite.setTexture(this.key, variant);
          if (frames.length > 1) {
            this.sprite.setFrame(frames[frames.length - 1]);
          }
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


      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        duration: 750,
        ease: "Sine.easeIn",
        onComplete: () => {
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
