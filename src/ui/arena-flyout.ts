import { addTextObject, TextStyle } from "./text";
import BattleScene from "#app/battle-scene.js";
import { ArenaTagSide, ArenaTrapTag } from "#app/data/arena-tag.js";
import { WeatherType } from "#app/data/weather.js";
import { TerrainType } from "#app/data/terrain.js";
import { addWindow, WindowVariant } from "./ui-theme";
import { ArenaEvent, ArenaEventType, TagAddedEvent, TagRemovedEvent, TerrainChangedEvent, WeatherChangedEvent } from "#app/events/arena.js";
import { BattleSceneEventType, TurnEndEvent } from "../events/battle-scene";
import { ArenaTagType } from "#enums/arena-tag-type";
import TimeOfDayWidget from "./time-of-day-widget";
import * as Utils from "../utils";
import i18next, {ParseKeys} from "i18next";
enum ArenaEffectType {
  PLAYER,
  WEATHER,
  TERRAIN,
  FIELD,
  ENEMY,
}

interface ArenaEffectInfo {

  name: string;

  effecType: ArenaEffectType,
  maxDuration: number;

  duration: number;

  tagType?: ArenaTagType;
}

export function getFieldEffectText(arenaTagType: string): string {
  if (!arenaTagType || arenaTagType === ArenaTagType.NONE) {
    return arenaTagType;
  }
  const effectName = Utils.toCamelCaseString(arenaTagType);
  const i18nKey = `arenaFlyout:${effectName}` as ParseKeys;
  const resultName = i18next.t(i18nKey);
  return (!resultName || resultName === i18nKey) ? Utils.formatText(arenaTagType) : resultName;
}

export class ArenaFlyout extends Phaser.GameObjects.Container {

  private battleScene: BattleScene;
  private flyoutWidth = 170;

  private flyoutHeight = 51;
  private translationX: number;

  private anchorX: number;

  private anchorY: number;
  private flyoutParent: Phaser.GameObjects.Container;

  private flyoutContainer: Phaser.GameObjects.Container;
  private flyoutWindow: Phaser.GameObjects.NineSlice;
  private flyoutWindowHeader: Phaser.GameObjects.NineSlice;

  private flyoutTextHeader: Phaser.GameObjects.Text;

  private timeOfDayWidget: TimeOfDayWidget;
  private flyoutTextHeaderPlayer: Phaser.GameObjects.Text;

  private flyoutTextHeaderEnemy: Phaser.GameObjects.Text;

  private flyoutTextHeaderField: Phaser.GameObjects.Text;
  private flyoutTextPlayer: Phaser.GameObjects.Text;

  private flyoutTextEnemy: Phaser.GameObjects.Text;

  private flyoutTextField: Phaser.GameObjects.Text;
  private readonly fieldEffectInfo: ArenaEffectInfo[] = [];
  private readonly onNewArenaEvent =  (event: Event) => this.onNewArena(event);
  private readonly onTurnEndEvent =   (event: Event) => this.onTurnEnd(event);

  private readonly onFieldEffectChangedEvent = (event: Event) => this.onFieldEffectChanged(event);

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setName("arena-flyout");
    this.battleScene = this.scene as BattleScene;

    this.translationX = this.flyoutWidth;
    this.anchorX = 0;
    this.anchorY = -98;

    this.flyoutParent = this.scene.add.container(this.anchorX - this.translationX, this.anchorY);
    this.flyoutParent.setAlpha(0);
    this.add(this.flyoutParent);

    this.flyoutContainer = this.scene.add.container(0, 0);
    this.flyoutParent.add(this.flyoutContainer);

    this.flyoutWindow = addWindow(this.scene as BattleScene, 0, 0, this.flyoutWidth, this.flyoutHeight, false, false, 0, 0, WindowVariant.THIN);
    this.flyoutContainer.add(this.flyoutWindow);

    this.flyoutWindowHeader = addWindow(this.scene as BattleScene, this.flyoutWidth / 2, 0, this.flyoutWidth / 2, 14, false, false, 0, 0, WindowVariant.XTHIN);
    this.flyoutWindowHeader.setOrigin();

    this.flyoutContainer.add(this.flyoutWindowHeader);

    this.flyoutTextHeader = addTextObject(this.scene, this.flyoutWidth / 2, 0, i18next.t("arenaFlyout:activeBattleEffects"), TextStyle.BATTLE_INFO);
    this.flyoutTextHeader.setFontSize(54);
    this.flyoutTextHeader.setAlign("center");
    this.flyoutTextHeader.setOrigin();

    this.flyoutContainer.add(this.flyoutTextHeader);

    this.timeOfDayWidget = new TimeOfDayWidget(this.scene, (this.flyoutWidth / 2) + (this.flyoutWindowHeader.displayWidth / 2));
    this.flyoutContainer.add(this.timeOfDayWidget);

    this.flyoutTextHeaderPlayer = addTextObject(this.scene, 6, 5, i18next.t("arenaFlyout:player"), TextStyle.SUMMARY_BLUE);
    this.flyoutTextHeaderPlayer.setFontSize(54);
    this.flyoutTextHeaderPlayer.setAlign("left");
    this.flyoutTextHeaderPlayer.setOrigin(0, 0);

    this.flyoutContainer.add(this.flyoutTextHeaderPlayer);

    this.flyoutTextHeaderField = addTextObject(this.scene, this.flyoutWidth / 2, 5, i18next.t("arenaFlyout:neutral"), TextStyle.SUMMARY_GREEN);
    this.flyoutTextHeaderField.setFontSize(54);
    this.flyoutTextHeaderField.setAlign("center");
    this.flyoutTextHeaderField.setOrigin(0.5, 0);

    this.flyoutContainer.add(this.flyoutTextHeaderField);

    this.flyoutTextHeaderEnemy = addTextObject(this.scene, this.flyoutWidth - 6, 5, i18next.t("arenaFlyout:enemy"), TextStyle.SUMMARY_RED);
    this.flyoutTextHeaderEnemy.setFontSize(54);
    this.flyoutTextHeaderEnemy.setAlign("right");
    this.flyoutTextHeaderEnemy.setOrigin(1, 0);

    this.flyoutContainer.add(this.flyoutTextHeaderEnemy);

    this.flyoutTextPlayer = addTextObject(this.scene, 6, 13, "", TextStyle.BATTLE_INFO);
    this.flyoutTextPlayer.setLineSpacing(-1);
    this.flyoutTextPlayer.setFontSize(48);
    this.flyoutTextPlayer.setAlign("left");
    this.flyoutTextPlayer.setOrigin(0, 0);

    this.flyoutContainer.add(this.flyoutTextPlayer);

    this.flyoutTextField = addTextObject(this.scene, this.flyoutWidth / 2, 13, "", TextStyle.BATTLE_INFO);
    this.flyoutTextField.setLineSpacing(-1);
    this.flyoutTextField.setFontSize(48);
    this.flyoutTextField.setAlign("center");
    this.flyoutTextField.setOrigin(0.5, 0);

    this.flyoutContainer.add(this.flyoutTextField);

    this.flyoutTextEnemy = addTextObject(this.scene, this.flyoutWidth - 6, 13, "", TextStyle.BATTLE_INFO);
    this.flyoutTextEnemy.setLineSpacing(-1);
    this.flyoutTextEnemy.setFontSize(48);
    this.flyoutTextEnemy.setAlign("right");
    this.flyoutTextEnemy.setOrigin(1, 0);

    this.flyoutContainer.add(this.flyoutTextEnemy);

    this.name = "Fight Flyout";
    this.flyoutParent.name = "Fight Flyout Parent";
    this.battleScene.eventTarget.addEventListener(BattleSceneEventType.NEW_ARENA, this.onNewArenaEvent);
    this.battleScene.eventTarget.addEventListener(BattleSceneEventType.TURN_END,  this.onTurnEndEvent);
  }

  private onNewArena(event: Event) {
    this.fieldEffectInfo.length = 0;
    this.battleScene.arena.eventTarget.addEventListener(ArenaEventType.WEATHER_CHANGED, this.onFieldEffectChangedEvent);
    this.battleScene.arena.eventTarget.addEventListener(ArenaEventType.TERRAIN_CHANGED, this.onFieldEffectChangedEvent);
    this.battleScene.arena.eventTarget.addEventListener(ArenaEventType.TAG_ADDED,       this.onFieldEffectChangedEvent);
    this.battleScene.arena.eventTarget.addEventListener(ArenaEventType.TAG_REMOVED,     this.onFieldEffectChangedEvent);
  }
  private clearText() {
    this.flyoutTextPlayer.text = "";
    this.flyoutTextField.text = "";
    this.flyoutTextEnemy.text = "";
  }
  private updateFieldText() {
    this.clearText();

    this.fieldEffectInfo.sort((infoA, infoB) => infoA.duration - infoB.duration);

    for (let i = 0; i < this.fieldEffectInfo.length; i++) {
      const fieldEffectInfo = this.fieldEffectInfo[i];
      let textObject: Phaser.GameObjects.Text;
      switch (fieldEffectInfo.effecType) {
        case ArenaEffectType.PLAYER:
          textObject = this.flyoutTextPlayer;
          break;

        case ArenaEffectType.WEATHER:
        case ArenaEffectType.TERRAIN:
        case ArenaEffectType.FIELD:
          textObject = this.flyoutTextField;

          break;

        case ArenaEffectType.ENEMY:
          textObject = this.flyoutTextEnemy;
          break;
      }

      textObject.text += fieldEffectInfo.name;

      if (fieldEffectInfo.maxDuration !== 0) {
        textObject.text += "  " + fieldEffectInfo.duration + "/" + fieldEffectInfo.maxDuration;
      }

      textObject.text += "\n";
    }
  }
  private onFieldEffectChanged(event: Event) {
    const arenaEffectChangedEvent = event as ArenaEvent;
    if (!arenaEffectChangedEvent) {
      return;
    }

    let foundIndex: number;
    switch (arenaEffectChangedEvent.constructor) {
      case TagAddedEvent:
        const tagAddedEvent = arenaEffectChangedEvent as TagAddedEvent;
        const isArenaTrapTag = this.battleScene.arena.getTag(tagAddedEvent.arenaTagType) instanceof ArenaTrapTag;
        let arenaEffectType: ArenaEffectType;

        if (tagAddedEvent.arenaTagSide === ArenaTagSide.BOTH) {
          arenaEffectType = ArenaEffectType.FIELD;
        } else if (tagAddedEvent.arenaTagSide === ArenaTagSide.PLAYER) {
          arenaEffectType = ArenaEffectType.PLAYER;
        } else {
          arenaEffectType = ArenaEffectType.ENEMY;
        }

        const existingTrapTagIndex = isArenaTrapTag ? this.fieldEffectInfo.findIndex(e => tagAddedEvent.arenaTagType === e.tagType && arenaEffectType === e.effecType) : -1;
      let name: string =  getFieldEffectText(ArenaTagType[tagAddedEvent.arenaTagType]);

        if (isArenaTrapTag) {
          if (existingTrapTagIndex !== -1) {
            const layers = tagAddedEvent.arenaTagMaxLayers > 1 ? ` (${tagAddedEvent.arenaTagLayers})` : "";
            this.fieldEffectInfo[existingTrapTagIndex].name = `${name}${layers}`;
            break;
          } else if (tagAddedEvent.arenaTagMaxLayers > 1) {
            name = `${name} (${tagAddedEvent.arenaTagLayers})`;
          }
        }

        this.fieldEffectInfo.push({
          name,
          effecType: arenaEffectType,
          maxDuration: tagAddedEvent.duration,
          duration: tagAddedEvent.duration,
          tagType: tagAddedEvent.arenaTagType
        });
        break;
      case TagRemovedEvent:
        const tagRemovedEvent = arenaEffectChangedEvent as TagRemovedEvent;
        foundIndex = this.fieldEffectInfo.findIndex(info => info.tagType === tagRemovedEvent.arenaTagType);

        if (foundIndex !== -1) {
          this.fieldEffectInfo.splice(foundIndex, 1);
        }
        break;

      case WeatherChangedEvent:
      case TerrainChangedEvent:
        const fieldEffectChangedEvent = arenaEffectChangedEvent as WeatherChangedEvent | TerrainChangedEvent;
        const oldName =
        getFieldEffectText(fieldEffectChangedEvent instanceof WeatherChangedEvent
                ? WeatherType[fieldEffectChangedEvent.oldWeatherType]
          : TerrainType[fieldEffectChangedEvent.oldTerrainType]);

        const newInfo = {
          name:
          getFieldEffectText(fieldEffectChangedEvent instanceof WeatherChangedEvent
                  ? WeatherType[fieldEffectChangedEvent.newWeatherType]
            : TerrainType[fieldEffectChangedEvent.newTerrainType]),
          effecType: fieldEffectChangedEvent instanceof WeatherChangedEvent
              ? ArenaEffectType.WEATHER
              : ArenaEffectType.TERRAIN,
          maxDuration: fieldEffectChangedEvent.duration,
          duration: fieldEffectChangedEvent.duration};

        foundIndex = this.fieldEffectInfo.findIndex(info => [newInfo.name, oldName].includes(info.name));
        if (foundIndex === -1) {
          if (newInfo.name !== undefined) {
            this.fieldEffectInfo.push(newInfo);
          }
        } else if (!newInfo.name) {
          this.fieldEffectInfo.splice(foundIndex, 1);
        } else {
          this.fieldEffectInfo[foundIndex] = newInfo;
        }
        break;
    }

    this.updateFieldText();
  }
  private onTurnEnd(event: Event) {
    const turnEndEvent = event as TurnEndEvent;
    if (!turnEndEvent) {
      return;
    }

    const fieldEffectInfo: ArenaEffectInfo[] = [];
    this.fieldEffectInfo.forEach(i => fieldEffectInfo.push(i));

    for (let i = 0; i < fieldEffectInfo.length; i++) {
      const info = fieldEffectInfo[i];

      if (info.maxDuration === 0) {
        continue;
      }

      --info.duration;
      if (info.duration <= 0) {
        this.fieldEffectInfo.splice(this.fieldEffectInfo.indexOf(info), 1);
      }
    }

    this.updateFieldText();
  }
  public toggleFlyout(visible: boolean): void {
    this.scene.tweens.add({
      targets: this.flyoutParent,
      x: visible ? this.anchorX : this.anchorX - this.translationX,
      duration: Utils.fixedInt(125),
      ease: "Sine.easeInOut",
      alpha: visible ? 1 : 0,
      onComplete: () => this.timeOfDayWidget.parentVisible = visible,
    });
  }

  public destroy(fromScene?: boolean): void {
    this.battleScene.eventTarget.removeEventListener(BattleSceneEventType.NEW_ARENA, this.onNewArenaEvent);
    this.battleScene.eventTarget.removeEventListener(BattleSceneEventType.TURN_END,  this.onTurnEndEvent);

    this.battleScene.arena.eventTarget.removeEventListener(ArenaEventType.WEATHER_CHANGED, this.onFieldEffectChangedEvent);
    this.battleScene.arena.eventTarget.removeEventListener(ArenaEventType.TERRAIN_CHANGED, this.onFieldEffectChangedEvent);
    this.battleScene.arena.eventTarget.removeEventListener(ArenaEventType.TAG_ADDED,       this.onFieldEffectChangedEvent);
    this.battleScene.arena.eventTarget.removeEventListener(ArenaEventType.TAG_REMOVED,     this.onFieldEffectChangedEvent);

    super.destroy(fromScene);
  }
}