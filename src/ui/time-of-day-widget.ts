import * as Utils from "../utils";
import BattleScene from "#app/battle-scene.js";
import { BattleSceneEventType } from "../events/battle-scene";
import { EaseType } from "#enums/ease-type";
import { TimeOfDay } from "#enums/time-of-day";
export default class TimeOfDayWidget extends Phaser.GameObjects.Container {

  private battleScene: BattleScene;
  private readonly timeOfDayIconFgs: Phaser.GameObjects.Sprite[] = new Array(2);

  private readonly timeOfDayIconMgs: Phaser.GameObjects.Sprite[] = new Array(2);

  private readonly timeOfDayIconBgs: Phaser.GameObjects.Sprite[] = new Array(2);
  private timeOfDayIcons: Phaser.GameObjects.Sprite[];
  private timeOfDayIconPairs: Map<string, Phaser.GameObjects.Sprite[]> = new Map([
    ["bg", this.timeOfDayIconBgs],
    ["mg", this.timeOfDayIconMgs],
    ["fg", this.timeOfDayIconFgs],]);
  private currentTime: TimeOfDay = TimeOfDay.ALL;

  private previousTime: TimeOfDay = TimeOfDay.ALL;
  private readonly onEncounterPhaseEvent = (event: Event) => this.onEncounterPhase(event);

  private _parentVisible: boolean;

  public get parentVisible(): boolean {
    return this._parentVisible;
  }

  public set parentVisible(visible: boolean) {
    if (visible && !this._parentVisible) {
      this.timeOfDayIcons?.forEach(
          icon => this.scene.tweens.getTweensOf(icon).forEach(
              tween => tween.resume()));
    }

    this._parentVisible = visible;
  }

  constructor(scene: Phaser.Scene, x: number = 0, y: number = 0) {
    super(scene, x, y);
    this.battleScene = this.scene as BattleScene;

    this.setVisible(this.battleScene.showTimeOfDayWidget);
    if (!this.battleScene.showTimeOfDayWidget) {
      return;
    }
    this.timeOfDayIconPairs.forEach(
        (icons, key) => {
          for (let i = 0; i < icons.length; i++) {
            icons[i] = this.scene.add.sprite(0, 0, "dawn_icon_" + key).setOrigin();
          }
        });

    this.timeOfDayIcons = [this.timeOfDayIconBgs, this.timeOfDayIconMgs, this.timeOfDayIconFgs].flat();
    this.add(this.timeOfDayIcons);

    this.battleScene.eventTarget.addEventListener(BattleSceneEventType.ENCOUNTER_PHASE, this.onEncounterPhaseEvent);
  }
  private getBackTween(): Phaser.Types.Tweens.TweenBuilderConfig[] {
    const rotate = {
      targets: [this.timeOfDayIconMgs[0], this.timeOfDayIconMgs[1]],
      angle: "+=90",
      duration: Utils.fixedInt(1500),
      ease: "Back.easeOut",
      paused: !this.parentVisible,
    };
    const fade = {
      targets: [this.timeOfDayIconBgs[1], this.timeOfDayIconMgs[1], this.timeOfDayIconFgs[1]],
      alpha: 0,
      duration: Utils.fixedInt(500),
      ease: "Linear",
      paused: !this.parentVisible,
    };

    return [rotate, fade];
  }
  private getBounceTween(): Phaser.Types.Tweens.TweenBuilderConfig[] {
    const bounce = {
      targets: [this.timeOfDayIconMgs[0], this.timeOfDayIconMgs[1]],
      angle: "+=90",
      duration: Utils.fixedInt(2000),
      ease: "Bounce.easeOut",
      paused: !this.parentVisible,
    };
    const fade = {
      targets: [this.timeOfDayIconBgs[1], this.timeOfDayIconMgs[1], this.timeOfDayIconFgs[1]],
      alpha: 0,
      duration: Utils.fixedInt(800),
      ease: "Linear",
      paused: !this.parentVisible,
    };

    return [bounce, fade];
  }
  private resetIcons() {
    this.moveBelow(this.timeOfDayIconBgs[0], this.timeOfDayIconBgs[1]);
    this.moveBelow(this.timeOfDayIconMgs[0], this.timeOfDayIconBgs[1]);
    this.moveBelow(this.timeOfDayIconFgs[0], this.timeOfDayIconFgs[1]);

    this.timeOfDayIconPairs.forEach(
        (icons, key) => {
          icons[0].setTexture(TimeOfDay[this.currentTime].toLowerCase() + "_icon_" + key);
          icons[1].setTexture(TimeOfDay[this.previousTime].toLowerCase() + "_icon_" + key);
        });
    this.timeOfDayIconMgs[0].setRotation(-90 * (3.14/180));

    this.timeOfDayIcons.forEach(icon => icon.setAlpha(1));
  }
  private tweenTimeOfDayIcon() {
    this.scene.tweens.killTweensOf(this.timeOfDayIcons);

    this.resetIcons();
    (this.battleScene.timeOfDayAnimation === EaseType.BACK ? this.getBackTween() : this.getBounceTween())
        .forEach(tween => this.scene.tweens.add(tween));
    this.timeOfDayIconPairs.forEach(
      icons => {
        const shifted = icons.shift();
        shifted && icons.push(shifted);
      });
  }
  private onEncounterPhase(event: Event) {
    const newTime = this.battleScene.arena.getTimeOfDay();

    if (this.currentTime === newTime) {
      return;
    }

    this.currentTime = newTime;
    this.previousTime = this.currentTime - 1;
    if (this.previousTime < TimeOfDay.DAWN) {
      this.previousTime = TimeOfDay.NIGHT;
    }

    this.tweenTimeOfDayIcon();
  }
}