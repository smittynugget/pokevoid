import { default as Pokemon } from "../field/pokemon";
import { addTextObject, TextStyle } from "./text";
import * as Utils from "../utils";
import BattleScene from "#app/battle-scene.js";
import Move from "#app/data/move.js";
import { BattleSceneEventType, BerryUsedEvent, MoveUsedEvent } from "../events/battle-scene";
import { BerryType } from "#enums/berry-type";
import { Moves } from "#enums/moves";
import { UiTheme } from "#enums/ui-theme";
import { getPokemonNameWithAffix } from "#app/messages.js";
interface MoveInfo {

  move: Move,
  maxPp: number,

  ppUsed: number,
}
export default class BattleFlyout extends Phaser.GameObjects.Container {

  private battleScene: BattleScene;
  private player: boolean;
  private pokemon: Pokemon;
  private flyoutWidth = 118;

  private flyoutHeight = 23;
  private translationX: number;

  private anchorX: number;

  private anchorY: number;
  private flyoutParent: Phaser.GameObjects.Container;

  private flyoutBackground: Phaser.GameObjects.Sprite;
  private flyoutContainer: Phaser.GameObjects.Container;
  private flyoutText: Phaser.GameObjects.Text[] = new Array(4);

  private moveInfo: MoveInfo[] = new Array();
  public flyoutVisible: boolean = false;
  private readonly onMoveUsedEvent = (event: Event) => this.onMoveUsed(event);
  private readonly onBerryUsedEvent = (event: Event) => this.onBerryUsed(event);

  constructor(scene: Phaser.Scene, player: boolean) {
    super(scene, 0, 0);
    this.battleScene = scene as BattleScene;
    this.player = player;

    this.translationX = this.player ? -this.flyoutWidth : this.flyoutWidth;
    this.anchorX = (this.player ? -130 : -40);
    this.anchorY = -2.5 + (this.player ? -18.5 : -13);

    this.flyoutParent = this.scene.add.container(this.anchorX - this.translationX, this.anchorY);
    this.flyoutParent.setAlpha(0);
    this.add(this.flyoutParent);
    this.flyoutBackground = this.scene.add.sprite(0, 0, "pbinfo_enemy_boss_stats");
    this.flyoutBackground.setOrigin(0, 0);

    this.flyoutParent.add(this.flyoutBackground);

    this.flyoutContainer = this.scene.add.container(44 + (this.player ? -this.flyoutWidth : 0), 2);
    this.flyoutParent.add(this.flyoutContainer);
    for (let i = 0; i < 4; i++) {
      this.flyoutText[i] = addTextObject(
          this.scene,
          (this.flyoutWidth / 4) + (this.flyoutWidth / 2) * (i % 2),
          (this.flyoutHeight / 4) + (this.flyoutHeight / 2) * (i < 2 ? 0 : 1), "???", TextStyle.BATTLE_INFO);
      this.flyoutText[i].setFontSize(45);
      this.flyoutText[i].setLineSpacing(-10);
      this.flyoutText[i].setAlign("center");
      this.flyoutText[i].setOrigin();
    }

    this.flyoutContainer.add(this.flyoutText);

    this.flyoutContainer.add(
        new Phaser.GameObjects.Rectangle(this.scene, this.flyoutWidth / 2, 0, 1, this.flyoutHeight + (this.battleScene.uiTheme === UiTheme.LEGACY ? 1 : 0), 0x212121).setOrigin(0.5, 0));
    this.flyoutContainer.add(
        new Phaser.GameObjects.Rectangle(this.scene, 0, this.flyoutHeight / 2, this.flyoutWidth + 6, 1, 0x212121).setOrigin(0, 0.5));
  }
  initInfo(pokemon: Pokemon) {
    this.pokemon = pokemon;

    this.name = `Flyout ${getPokemonNameWithAffix(this.pokemon)}`;
    this.flyoutParent.name = `Flyout Parent ${getPokemonNameWithAffix(this.pokemon)}`;

    this.battleScene.eventTarget.addEventListener(BattleSceneEventType.MOVE_USED, this.onMoveUsedEvent);
    this.battleScene.eventTarget.addEventListener(BattleSceneEventType.BERRY_USED, this.onBerryUsedEvent);
  }
  private setText() {
    for (let i = 0; i < this.flyoutText.length; i++) {
      const flyoutText = this.flyoutText[i];
      const moveInfo = this.moveInfo[i];

      if (!moveInfo) {
        continue;
      }

      const currentPp = moveInfo.maxPp - moveInfo.ppUsed;
      flyoutText.text = `${moveInfo.move.name}  ${currentPp}/${moveInfo.maxPp}`;
    }
  }
  private onMoveUsed(event: Event) {
    const moveUsedEvent = event as MoveUsedEvent;
    if (!moveUsedEvent
        || moveUsedEvent.pokemonId !== this.pokemon?.id
        || moveUsedEvent.move.id === Moves.STRUGGLE) {
      return;
    }

    const foundInfo = this.moveInfo.find(x => x?.move.id === moveUsedEvent.move.id);
    if (foundInfo) {
      foundInfo.ppUsed = moveUsedEvent.ppUsed;
    } else {
      this.moveInfo.push({move: moveUsedEvent.move, maxPp: moveUsedEvent.move.pp, ppUsed: moveUsedEvent.ppUsed});
    }

    this.setText();
  }

  private onBerryUsed(event: Event) {
    const berryUsedEvent = event as BerryUsedEvent;
    if (!berryUsedEvent
        || berryUsedEvent.berryModifier.pokemonId !== this.pokemon?.id
        || berryUsedEvent.berryModifier.berryType !== BerryType.LEPPA) {
      return;
    }

    const foundInfo = this.moveInfo.find(info => info.ppUsed === info.maxPp);
    if (!foundInfo) {
      return;
    }
    foundInfo.ppUsed = Math.max(foundInfo.ppUsed - 10, 0);

    this.setText();
  }
  toggleFlyout(visible: boolean): void {
    this.flyoutVisible = visible;

    this.scene.tweens.add({
      targets: this.flyoutParent,
      x: visible ? this.anchorX : this.anchorX - this.translationX,
      duration: Utils.fixedInt(125),
      ease: "Sine.easeInOut",
      alpha: visible ? 1 : 0,
    });
  }

  destroy(fromScene?: boolean): void {
    this.battleScene.eventTarget.removeEventListener(BattleSceneEventType.MOVE_USED, this.onMoveUsedEvent);
    this.battleScene.eventTarget.removeEventListener(BattleSceneEventType.BERRY_USED, this.onBerryUsedEvent);

    super.destroy(fromScene);
  }
}