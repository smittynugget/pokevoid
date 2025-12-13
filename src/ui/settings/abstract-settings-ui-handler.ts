import BattleScene from "../../battle-scene";
import { hasTouchscreen, isMobile } from "../../touch-controls";
import { TextStyle, addTextObject } from "../text";
import { Mode } from "../ui";
import UiHandler from "../ui-handler";
import { addWindow } from "../ui-theme";
import {Button} from "#enums/buttons";
import {InputsIcons} from "#app/ui/settings/abstract-control-settings-ui-handler.js";
import NavigationMenu, {NavigationManager} from "#app/ui/settings/navigationMenu";
import { Setting, SettingKeys, SettingType } from "#app/system/settings/settings";
import { attachModalBackground, ModalBackgroundHandle } from "../modal-background-utils";
import i18next from "i18next";
export default class AbstractSettingsUiHandler extends UiHandler {
  private settingsContainer: Phaser.GameObjects.Container;
  private optionsContainer: Phaser.GameObjects.Container;
  private navigationContainer: NavigationMenu;

  private scrollCursor: integer;
  private optionsBg: Phaser.GameObjects.NineSlice;
  private actionsBg: Phaser.GameObjects.NineSlice;

  private optionCursors: integer[];

  private settingLabels: Phaser.GameObjects.Text[];
  private optionValueLabels: Phaser.GameObjects.Text[][];

  protected navigationIcons: InputsIcons;

  private cursorObj: Phaser.GameObjects.NineSlice | null;
  private _settingsPatterns?: { nav?: ModalBackgroundHandle; options?: ModalBackgroundHandle; actions?: ModalBackgroundHandle };

  private reloadSettings: Array<Setting>;
  private reloadRequired: boolean;

  protected rowsToDisplay: number;
  protected title: string;
  protected settings: Array<Setting>;
  protected localStorageKey: string;

  constructor(scene: BattleScene, type: SettingType, mode: Mode | null = null) {
    super(scene, mode);
    this.settings = Setting.filter(s => s.type === type && !s?.isHidden?.());
    this.reloadRequired = false;
    this.rowsToDisplay = 8;
  }
  setup() {
    const ui = this.getUi();

    this.settingsContainer = this.scene.add.container(1, -(this.scene.game.canvas.height / 6) + 1);
    this.settingsContainer.setName(`settings-${this.title}`);
    this.settingsContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6 - 20), Phaser.Geom.Rectangle.Contains);

    this.navigationIcons = {};
    this.navigationContainer = new NavigationMenu(this.scene, 0, 0);
    this.optionsBg = addWindow(this.scene, 0, this.navigationContainer.height, (this.scene.game.canvas.width / 6) - 2, (this.scene.game.canvas.height / 6) - 16 - this.navigationContainer.height - 2);
    this.optionsBg.setName("window-options-bg");
    this.optionsBg.setOrigin(0, 0);
    this.actionsBg = addWindow(this.scene, 0, (this.scene.game.canvas.height / 6) - 22, (this.scene.game.canvas.width / 6) - 2, 22);
    this.actionsBg.setName("window-actions-bg");
    this.actionsBg.setOrigin(0, 0);
    const iconAction = this.scene.add.sprite(0, 0, "keyboard");
    iconAction.setOrigin(0, -0.1);
    iconAction.setPositionRelative(this.actionsBg, this.navigationContainer.width - 32, 4);
    this.navigationIcons["BUTTON_ACTION"] = iconAction;

    const actionText = addTextObject(this.scene, 0, 0, i18next.t("settings:action"), TextStyle.SETTINGS_LABEL);
    actionText.setOrigin(0, 0.15);
    actionText.setPositionRelative(iconAction, -actionText.width/6-2, 0);

    const iconCancel = this.scene.add.sprite(0, 0, "keyboard");
    iconCancel.setOrigin(0, -0.1);
    iconCancel.setPositionRelative(this.actionsBg, this.navigationContainer.width - 100, 4);
    this.navigationIcons["BUTTON_CANCEL"] = iconCancel;

    const cancelText = addTextObject(this.scene, 0, 0, i18next.t("settings:back"), TextStyle.SETTINGS_LABEL);
    cancelText.setOrigin(0, 0.15);
    cancelText.setPositionRelative(iconCancel, -cancelText.width/6-2, 0);

    this.optionsContainer = this.scene.add.container(0, 0);

    this.settingLabels = [];
    this.optionValueLabels = [];

    this.reloadSettings = this.settings.filter(s => s?.requireReload);

    this.settings
        .forEach((setting, s) => {
          let settingName = setting.label;
          if (setting?.requireReload) {
            settingName += ` (${i18next.t("settings:requireReload")})`;
          }

          this.settingLabels[s] = addTextObject(this.scene, 8, 28 + s * 16, settingName, TextStyle.SETTINGS_LABEL);
          this.settingLabels[s].setOrigin(0, 0);

          this.optionsContainer.add(this.settingLabels[s]);
          this.optionValueLabels.push(setting.options.map((option, o) => {
          const valueLabel = addTextObject(this.scene, 0, 0, option.label, setting.default === o ? TextStyle.SETTINGS_SELECTED : TextStyle.SETTINGS_VALUE);
            valueLabel.setOrigin(0, 0);

            this.optionsContainer.add(valueLabel);

            return valueLabel;
          }));

          const totalWidth = this.optionValueLabels[s].map(o => o.width).reduce((total, width) => total += width, 0);

          const labelWidth =  Math.max(78, this.settingLabels[s].displayWidth + 8);

          const totalSpace = (300 - labelWidth) - totalWidth / 6;
          const optionSpacing = Math.floor(totalSpace / (this.optionValueLabels[s].length - 1));

          let xOffset = 0;

          for (const value of this.optionValueLabels[s]) {
            value.setPositionRelative(this.settingLabels[s], labelWidth + xOffset, 0);
            xOffset += value.width / 6 + optionSpacing;
          }
        });

    this.optionCursors = this.settings.map(setting => setting.default);
    this.settingsContainer.add(this.navigationContainer);
    this.settingsContainer.add(this.optionsBg);
    this.settingsContainer.add(this.actionsBg);
    this.settingsContainer.add(this.optionsContainer);
    this.settingsContainer.add(iconAction);
    this.settingsContainer.add(iconCancel);
    this.settingsContainer.add(actionText);
    this.settingsContainer.add(cancelText);

    ui.add(this.settingsContainer);

    this.setCursor(0);
    this.setScrollCursor(0);

    this.settingsContainer.setVisible(false);
  }

  updateBindings(): void {
    for (const settingName of Object.keys(this.navigationIcons)) {
      if (settingName === "BUTTON_HOME") {
        this.navigationIcons[settingName].setTexture("keyboard");
        this.navigationIcons[settingName].setFrame("HOME.png");
        this.navigationIcons[settingName].alpha = 1;
        continue;
      }
      const icon = this.scene.inputController?.getIconForLatestInputRecorded(settingName);
      if (icon) {
        const type = this.scene.inputController?.getLastSourceType();
        this.navigationIcons[settingName].setTexture(type);
        this.navigationIcons[settingName].setFrame(icon);
        this.navigationIcons[settingName].alpha = 1;
      } else {
        this.navigationIcons[settingName].alpha = 0;
      }
    }
    NavigationManager.getInstance().updateIcons();
  }
  show(args: any[]): boolean {
    super.show(args);
    this.updateBindings();
    this._settingsPatterns = this._settingsPatterns || {};
    this._settingsPatterns.nav = attachModalBackground(
      this.scene,
      this.settingsContainer,
      () => ({ bgX: this.navigationContainer.x, bgY: this.navigationContainer.y, bgWidth: this.navigationContainer.width, bgHeight: this.navigationContainer.height }),
      { mask: false, alphaMultiplier: 0.4, gridInc: -2 }
    );
    this._settingsPatterns.options = attachModalBackground(
      this.scene,
      this.settingsContainer,
      () => ({ bgX: this.optionsBg.x, bgY: this.optionsBg.y, bgWidth: this.optionsBg.width, bgHeight: this.optionsBg.height }),
      { mask: false, alphaMultiplier: 0.7 }
    );
    this._settingsPatterns.actions = attachModalBackground(
      this.scene,
      this.settingsContainer,
      () => ({ bgX: this.actionsBg.x, bgY: this.actionsBg.y, bgWidth: this.actionsBg.width, bgHeight: this.actionsBg.height }),
      { mask: false, alphaMultiplier: 0.4, gridInc: -2 }
    );

    const settings: object = localStorage.hasOwnProperty(this.localStorageKey) ? JSON.parse(localStorage.getItem(this.localStorageKey)!) : {};

    this.settings.forEach((setting, s) => this.setOptionCursor(s, settings.hasOwnProperty(setting.key) ? settings[setting.key] : this.settings[s].default));

    this.settingsContainer.setVisible(true);
    this.setCursor(0);

    this.getUi().moveTo(this.settingsContainer, this.getUi().length - 1);

    this.getUi().hideTooltip();
    this._settingsPatterns?.nav?.redraw();
    this._settingsPatterns?.options?.redraw();
    this._settingsPatterns?.actions?.redraw();

    return true;
  }
  processInput(button: Button): boolean {
    const ui = this.getUi();
    let success = false;

    if (button === Button.CANCEL) {
      success = true;
      NavigationManager.getInstance().reset();

      this.scene.ui.revertMode();
    } else {
      const cursor = this.cursor + this.scrollCursor;
      switch (button) {
        case Button.UP:
          if (cursor) {
            if (this.cursor) {
              success = this.setCursor(this.cursor - 1);
            } else {
              success = this.setScrollCursor(this.scrollCursor - 1);
            }
          } else {
            const successA = this.setCursor(this.rowsToDisplay - 1);

            const successB = this.setScrollCursor(this.optionValueLabels.length - this.rowsToDisplay);
            success = successA && successB;
          }
          break;
        case Button.DOWN:
          if (cursor < this.optionValueLabels.length - 1) {
            if (this.cursor < this.rowsToDisplay - 1) {
              success = this.setCursor(this.cursor + 1);
            } else if (this.scrollCursor < this.optionValueLabels.length - this.rowsToDisplay) {
              success = this.setScrollCursor(this.scrollCursor + 1);
            }
          } else {
            const successA = this.setCursor(0);

            const successB = this.setScrollCursor(0);
            success = successA && successB;
          }
          break;
        case Button.LEFT:
          if (this.optionCursors[cursor]) {
            success = this.setOptionCursor(cursor, this.optionCursors[cursor] - 1, true);
          }
          break;
        case Button.RIGHT:

          if (this.optionCursors[cursor] < this.optionValueLabels[cursor].length - 1) {
            success = this.setOptionCursor(cursor, this.optionCursors[cursor] + 1, true);
          }
          break;
        case Button.CYCLE_FORM:
        case Button.CYCLE_SHINY:
          success = this.navigationContainer.navigate(button);
          break;
      case Button.ACTION:
        const setting: Setting = this.settings[cursor];
        if (setting?.activatable) {
          success = this.activateSetting(setting);
        }
        break;
      }
    }
    if (success) {
      ui.playSelect();
    }

    return success;
  }
  activateSetting(setting: Setting): boolean {
    switch (setting.key) {
    case SettingKeys.Move_Touch_Controls:
      this.scene.inputController.moveTouchControlsHandler.enableConfigurationMode(this.getUi(), this.scene);
      return true;
    }
    return false;
  }
  setCursor(cursor: integer): boolean {
    const ret = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.nineslice(0, 0, "summary_moves_cursor", undefined, (this.scene.game.canvas.width / 6) - 10, 16, 1, 1, 1, 1);
      this.cursorObj.setOrigin(0, 0);
      this.optionsContainer.add(this.cursorObj);
    }

    this.cursorObj.setPositionRelative(this.optionsBg, 4, 4 + (this.cursor + this.scrollCursor) * 16);

    return ret;
  }
  setOptionCursor(settingIndex: integer, cursor: integer, save?: boolean): boolean {
    const setting = this.settings[settingIndex];

    if (setting.key === SettingKeys.Touch_Controls && cursor && hasTouchscreen() && isMobile()) {
      this.getUi().playError();
      return false;
    }

    const lastCursor = this.optionCursors[settingIndex];

    const lastValueLabel = this.optionValueLabels[settingIndex][lastCursor];
    lastValueLabel.setColor(this.getTextColor(TextStyle.SETTINGS_VALUE));
    lastValueLabel.setShadowColor(this.getTextColor(TextStyle.SETTINGS_VALUE, true));

    this.optionCursors[settingIndex] = cursor;

    const newValueLabel = this.optionValueLabels[settingIndex][cursor];
    newValueLabel.setColor(this.getTextColor(TextStyle.SETTINGS_SELECTED));
    newValueLabel.setShadowColor(this.getTextColor(TextStyle.SETTINGS_SELECTED, true));

    if (save) {
      this.scene.gameData.saveSetting(setting.key, cursor);
      if (this.reloadSettings.includes(setting)) {
        this.reloadRequired = true;
      }
    }

    return true;
  }
  setScrollCursor(scrollCursor: integer): boolean {
    if (scrollCursor === this.scrollCursor) {
      return false;
    }

    this.scrollCursor = scrollCursor;

    this.updateSettingsScroll();

    this.setCursor(this.cursor);

    return true;
  }
  updateSettingsScroll(): void {
    this.optionsContainer.setY(-16 * this.scrollCursor);

    for (let s = 0; s < this.settingLabels.length; s++) {
      const visible = s >= this.scrollCursor && s < this.scrollCursor + this.rowsToDisplay;
      this.settingLabels[s].setVisible(visible);
      for (const option of this.optionValueLabels[s]) {
        option.setVisible(visible);
      }
    }
  }
  clear() {

    this._settingsPatterns?.nav?.clear();
    this._settingsPatterns?.options?.clear();
    this._settingsPatterns?.actions?.clear();
    this._settingsPatterns = undefined;

    super.clear();
    this.settingsContainer.setVisible(false);
    this.eraseCursor();
    this.getUi().bgmBar.toggleBgmBar(this.scene.showBgmBar);
    if (this.reloadRequired) {
      this.reloadRequired = false;
      this.scene.reset(true, false, true);
    }
  }
  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }
}