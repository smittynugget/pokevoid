import BattleScene from "../battle-scene";
import { TextStyle, addTextObject } from "./text";
import { Mode } from "./mode";
import UiHandler from "./ui-handler";
import { addWindow } from "./ui-theme";
import {Button} from "#enums/buttons";
import i18next from "i18next";
import { Challenge } from "#app/data/challenge.js";
import * as Utils from "../utils";
import { Challenges } from "#app/enums/challenges.js";
import BBCodeText from "phaser3-rex-plugins/plugins/bbcodetext";
import { Color, ShadowColor } from "#app/enums/color.js";
import { SelectStarterPhase } from "#app/phases/select-starter-phase.js";
import { TitlePhase } from "#app/phases/title-phase.js";
export default class GameChallengesUiHandler extends UiHandler {
  private challengesContainer: Phaser.GameObjects.Container;
  private valuesContainer: Phaser.GameObjects.Container;

  private scrollCursor: integer;

  private optionsBg: Phaser.GameObjects.NineSlice;
  private descriptionText: BBCodeText;

  private challengeLabels: Array<{ label: Phaser.GameObjects.Text, value: Phaser.GameObjects.Text }>;
  private monoTypeValue: Phaser.GameObjects.Sprite;

  private cursorObj: Phaser.GameObjects.NineSlice | null;

  private startCursor: Phaser.GameObjects.NineSlice;

  private optionsWidth: number;

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
  }

  setup() {
    const ui = this.getUi();

    this.challengesContainer = this.scene.add.container(1, -(this.scene.game.canvas.height / 6) + 1);
    this.challengesContainer.setName("challenges");

    this.challengesContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);

    const bgOverlay = this.scene.add.rectangle(-1, -1, this.scene.scaledCanvas.width, this.scene.scaledCanvas.height, 0x424242, 0.8);
    bgOverlay.setName("rect-challenge-overlay");
    bgOverlay.setOrigin(0, 0);
    this.challengesContainer.add(bgOverlay);
    const headerBg = addWindow(this.scene, 0, 0, (this.scene.game.canvas.width / 6), 24);
    headerBg.setName("window-header-bg");
    headerBg.setOrigin(0, 0);

    const headerText = addTextObject(this.scene, 0, 0, i18next.t("challenges:title"), TextStyle.SETTINGS_LABEL);
    headerText.setName("text-header");
    headerText.setOrigin(0, 0);
    headerText.setPositionRelative(headerBg, 8, 4);
    this.optionsWidth = this.scene.scaledCanvas.width * 0.6;
    this.optionsBg = addWindow(this.scene, 0, headerBg.height, this.optionsWidth, this.scene.scaledCanvas.height - headerBg.height - 2);
    this.optionsBg.setName("window-options-bg");
    this.optionsBg.setOrigin(0, 0);

    const descriptionBg = addWindow(this.scene, 0, headerBg.height, this.scene.scaledCanvas.width - this.optionsWidth, this.scene.scaledCanvas.height - headerBg.height - 26);
    descriptionBg.setName("window-desc-bg");
    descriptionBg.setOrigin(0, 0);
    descriptionBg.setPositionRelative(this.optionsBg, this.optionsBg.width, 0);

    this.descriptionText = new BBCodeText(this.scene, descriptionBg.x + 6, descriptionBg.y + 4, "", {
      fontFamily: "emerald",
      fontSize: 84,
      color: Color.ORANGE,
      padding: {
        bottom: 6
      },
      wrap: {
        mode: "word",
        width: (descriptionBg.width - 12) * 6,
      }
    });
    this.descriptionText.setName("text-desc");
    this.scene.add.existing(this.descriptionText);
    this.descriptionText.setScale(1/6);
    this.descriptionText.setShadow(4, 5, ShadowColor.ORANGE);
    this.descriptionText.setOrigin(0, 0);

    const startBg = addWindow(this.scene, 0, 0, descriptionBg.width, 24);
    startBg.setName("window-start-bg");
    startBg.setOrigin(0, 0);
    startBg.setPositionRelative(descriptionBg, 0, descriptionBg.height);

    const startText = addTextObject(this.scene, 0, 0, i18next.t("common:start"), TextStyle.SETTINGS_LABEL);
    startText.setName("text-start");
    startText.setOrigin(0, 0);
    startText.setPositionRelative(startBg, (startBg.width - startText.displayWidth) / 2, 4);

    this.startCursor = this.scene.add.nineslice(0, 0, "summary_moves_cursor", undefined, descriptionBg.width - 8, 16, 1, 1, 1, 1);
    this.startCursor.setName("9s-start-cursor");
    this.startCursor.setOrigin(0, 0);
    this.startCursor.setPositionRelative(startBg, 4, 3);
    this.startCursor.setVisible(false);

    this.valuesContainer = this.scene.add.container(0, 0);
    this.valuesContainer.setName("values");

    this.challengeLabels = [];

    for (let i = 0; i < 9; i++) {
      const label = addTextObject(this.scene, 8, 28 + i * 16, "", TextStyle.SETTINGS_LABEL);
      label.setName(`text-challenge-label-${i}`);
      label.setOrigin(0, 0);

      this.valuesContainer.add(label);

      const value = addTextObject(this.scene, 0, 28 + i * 16, "", TextStyle.SETTINGS_LABEL);
      value.setName(`challenge-value-text-${i}`);
        value.setPositionRelative(label, 100, 0);
      this.valuesContainer.add(value);
      this.challengeLabels[i] = {
        label: label,
        value: value
      };
    }

    this.monoTypeValue = this.scene.add.sprite(8, 98, Utils.getLocalizedSpriteKey("types"));
    this.monoTypeValue.setName("challenge-value-monotype-sprite");
    this.monoTypeValue.setScale(0.86);
    this.monoTypeValue.setVisible(false);
    this.valuesContainer.add(this.monoTypeValue);

    this.challengesContainer.add(headerBg);
    this.challengesContainer.add(headerText);
    this.challengesContainer.add(this.optionsBg);
    this.challengesContainer.add(descriptionBg);
    this.challengesContainer.add(this.descriptionText);
    this.challengesContainer.add(startBg);
    this.challengesContainer.add(startText);
    this.challengesContainer.add(this.startCursor);
    this.challengesContainer.add(this.valuesContainer);

    ui.add(this.challengesContainer);

    this.setCursor(0);
    this.setScrollCursor(0);

    this.challengesContainer.setVisible(false);
  }
  setDescription(text: string): void {
    this.descriptionText.setText(`[color=${Color.ORANGE}][shadow=${ShadowColor.ORANGE}]${text}`);
  }
  initLabels(): void {
    this.setDescription(this.scene.gameMode.challenges[0].getDescription());
    for (let i = 0; i < 9; i++) {
      if (i < this.scene.gameMode.challenges.length) {
      this.challengeLabels[i].label.setVisible(true);
      this.challengeLabels[i].value.setVisible(true);
      }
    }
  }
  updateText(): void {
    this.setDescription(this.getActiveChallenge().getDescription());
    let monoTypeVisible = false;
    for (let i = 0; i < Math.min(9, this.scene.gameMode.challenges.length); i++) {
      const challenge = this.scene.gameMode.challenges[this.scrollCursor + i];
      this.challengeLabels[i].label.setText(challenge.getName());
      if (challenge.id === Challenges.SINGLE_TYPE) {
        this.monoTypeValue.setPositionRelative(this.challengeLabels[i].label, 113, 8);
        this.monoTypeValue.setFrame(challenge.getValue());
        this.monoTypeValue.setVisible(true);
        this.challengeLabels[i].value.setVisible(false);
        monoTypeVisible = true;
    } else {
        this.challengeLabels[i].value.setText(challenge.getValue());
        this.challengeLabels[i].value.setVisible(true);
      }
    }
    if (!monoTypeVisible) {
      this.monoTypeValue.setVisible(false);
    }
  }

  show(args: any[]): boolean {
    super.show(args);

    this.startCursor.setVisible(false);
    this.challengesContainer.setVisible(true);
    this.setCursor(0);

    this.initLabels();
    this.updateText();

    this.getUi().moveTo(this.challengesContainer, this.getUi().length - 1);

    this.getUi().hideTooltip();

    return true;
  }
  processInput(button: Button): boolean {
    const ui = this.getUi();

    const rowsToDisplay = 9;

    let success = false;

    if (button === Button.CANCEL) {
      if (this.startCursor.visible) {
        this.startCursor.setVisible(false);
        this.cursorObj?.setVisible(true);
      } else {
        this.scene.clearPhaseQueue();
        this.scene.pushPhase(new TitlePhase(this.scene, false, true));
        this.scene.getCurrentPhase()?.end();
      }
      success = true;
    } else if (button === Button.SUBMIT || button === Button.ACTION) {
      if (this.startCursor.visible) {
        const totalDifficulty = this.scene.gameMode.challenges.reduce((v, c) => v + c.getDifficulty(), 0);
        const totalMinDifficulty = this.scene.gameMode.challenges.reduce((v, c) => v + c.getMinDifficulty(), 0);
        if (totalDifficulty >= totalMinDifficulty) {
          this.scene.unshiftPhase(new SelectStarterPhase(this.scene));
          this.scene.getCurrentPhase()?.end();
          success = true;
        } else {
          success = false;
        }
      } else {
        this.startCursor.setVisible(true);
        this.cursorObj?.setVisible(false);
        success = true;
      }
    } else {
      switch (button) {
        case Button.UP:
          if (this.cursor === 0) {
            if (this.scrollCursor === 0) {

              if (this.scene.gameMode.challenges.length > rowsToDisplay) {

                const successA = this.setCursor(rowsToDisplay - 1);

                const successB = this.setScrollCursor(this.scene.gameMode.challenges.length - rowsToDisplay);
                success = successA && successB;
              } else {
                success = this.setCursor(this.scene.gameMode.challenges.length - 1);
              }
            } else {
              success = this.setScrollCursor(this.scrollCursor - 1);
            }
          } else {
            success = this.setCursor(this.cursor - 1);
          }
          if (success) {
            this.updateText();
          }
          break;
        case Button.DOWN:
          if (this.cursor === rowsToDisplay - 1) {
            if (this.scrollCursor < this.scene.gameMode.challenges.length - rowsToDisplay) {

              success = this.setScrollCursor(this.scrollCursor + 1);
            } else {
              const successA = this.setCursor(0);

              const successB = this.setScrollCursor(0);
              success = successA && successB;
            }
          } else if (this.scene.gameMode.challenges.length < rowsToDisplay && this.cursor === this.scene.gameMode.challenges.length - 1) {

            success = this.setCursor(0);
          } else {
            success = this.setCursor(this.cursor + 1);
          }
          if (success) {
            this.updateText();
          }
          break;
        case Button.LEFT:

          success = this.getActiveChallenge().decreaseValue();
          if (success) {
            this.updateText();
          }
          break;
        case Button.RIGHT:

          success = this.getActiveChallenge().increaseValue();
          if (success) {
            this.updateText();
          }
          break;
      }
    }
    if (success) {
      ui.playSelect();
    }

    return success;
  }

  setCursor(cursor: integer): boolean {
    let ret = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.nineslice(0, 0, "summary_moves_cursor", undefined, this.optionsWidth - 8, 16, 1, 1, 1, 1);
      this.cursorObj.setOrigin(0, 0);
      this.valuesContainer.add(this.cursorObj);
    }

    ret ||= !this.cursorObj.visible;
    this.cursorObj.setVisible(true);

    this.cursorObj.setPositionRelative(this.optionsBg, 4, 4 + (this.cursor + this.scrollCursor) * 16);

    return ret;
  }

  setScrollCursor(scrollCursor: integer): boolean {
    if (scrollCursor === this.scrollCursor) {
      return false;
    }

    this.scrollCursor = scrollCursor;

    this.setCursor(this.cursor);

    return true;
  }

  getActiveChallenge(): Challenge {
    return this.scene.gameMode.challenges[this.cursor + this.scrollCursor];
  }

  clear() {
    super.clear();
    this.challengesContainer.setVisible(false);
    this.eraseCursor();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }
}