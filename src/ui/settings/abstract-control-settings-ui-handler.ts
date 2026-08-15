import UiHandler from "../ui-handler";
import BattleScene from "../../battle-scene";
import {Mode} from "../mode";
import {InterfaceConfig} from "../../inputs-controller";
import {addWindow} from "../ui-theme";
import {addTextObject, TextStyle} from "../text";
import {getIconWithSettingName} from "#app/configs/inputs/configHandler";
import NavigationMenu, {NavigationManager} from "#app/ui/settings/navigationMenu";
import { Device } from "#enums/devices";
import { Button } from "#enums/buttons";
import { isPrimaryPointer } from "../pointer-utils";
import { attachModalBackground, ModalBackgroundHandle } from "../modal-background-utils";
import { ModifierTooltipUtils } from "../modifier-tooltip-utils";
import i18next from "i18next";

export interface InputsIcons {
  [key: string]: Phaser.GameObjects.Sprite;
}

export interface LayoutConfig {
  optionsContainer: Phaser.GameObjects.Container;
  inputsIcons: InputsIcons;
  settingLabels: Phaser.GameObjects.Text[];
  optionValueLabels: Phaser.GameObjects.Text[][];
  optionCursors: integer[];
  keys: string[];
  bindingSettings: Array<String>;
}

export default abstract class AbstractControlSettingsUiHandler extends UiHandler {
  protected settingsContainer: Phaser.GameObjects.Container;
  protected optionsContainer: Phaser.GameObjects.Container;
  protected navigationContainer: NavigationMenu;

  protected scrollCursor: integer;
  protected optionCursors: integer[];
  protected cursorObj: Phaser.GameObjects.NineSlice | null;
  private _controlPatterns?: { nav?: ModalBackgroundHandle; options?: ModalBackgroundHandle; actions?: ModalBackgroundHandle };

  protected optionsBg: Phaser.GameObjects.NineSlice;
  protected actionsBg: Phaser.GameObjects.NineSlice;

  protected settingLabels: Phaser.GameObjects.Text[];
  protected optionValueLabels: Phaser.GameObjects.Text[][];
  protected layout: Map<string, LayoutConfig> = new Map<string, LayoutConfig>();

  protected inputsIcons: InputsIcons;
  protected navigationIcons: InputsIcons;

  protected keys: Array<String>;
  protected bindingSettings: Array<String>;

  protected setting;
  protected settingBlacklisted;
  protected settingDeviceDefaults;
  protected settingDeviceOptions;
  protected configs;
  protected commonSettingsCount;
  protected textureOverride;
  protected titleSelected;
  protected localStoragePropertyName;
  protected rowsToDisplay: number;
  protected device: Device;

  private _wheelHandler: ((...args: any[]) => void) | null = null;

  abstract saveSettingToLocalStorage(setting, cursor): void;
  abstract setSetting(scene: BattleScene, setting, value: integer): boolean;
  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
    this.rowsToDisplay = 8;
  }

  getLocalStorageSetting(): object {

    const settings: object = localStorage.hasOwnProperty(this.localStoragePropertyName) ? JSON.parse(localStorage.getItem(this.localStoragePropertyName)!) : {};
    return settings;
  }

  private camelize(string: string): string {
    return string.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, "");
  }
  setup() {
    const ui = this.getUi();
    this.navigationIcons = {};

    this.settingsContainer = this.scene.add.container(1, -(this.scene.game.canvas.height / 6) + 1);
    this.settingsContainer.setName(`settings-${this.titleSelected}`);

    this.settingsContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);

    this.navigationContainer = new NavigationMenu(this.scene, 0, 0);

    this.optionsBg = addWindow(this.scene, 0, this.navigationContainer.height, (this.scene.game.canvas.width / 6) - 2, (this.scene.game.canvas.height / 6) - 16 - this.navigationContainer.height - 2);
    this.optionsBg.setOrigin(0, 0);

    this.actionsBg = addWindow(this.scene, 0, (this.scene.game.canvas.height / 6) - this.navigationContainer.height, (this.scene.game.canvas.width / 6) - 2, 22);
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

    const iconReset = this.scene.add.sprite(0, 0, "keyboard");
    iconReset.setOrigin(0, -0.1);
    iconReset.setPositionRelative(this.actionsBg, this.navigationContainer.width - 180, 4);
    this.navigationIcons["BUTTON_HOME"] = iconReset;

    const resetText = addTextObject(this.scene, 0, 0, i18next.t("settings:reset"), TextStyle.SETTINGS_LABEL);
    resetText.setOrigin(0, 0.15);
    resetText.setPositionRelative(iconReset, -resetText.width/6-2, 0);

    this.settingsContainer.add(this.optionsBg);
    this.settingsContainer.add(this.actionsBg);
    this.settingsContainer.add(this.navigationContainer);
    this.settingsContainer.add(iconAction);
    this.settingsContainer.add(iconCancel);
    this.settingsContainer.add(iconReset);
    this.settingsContainer.add(actionText);
    this.settingsContainer.add(cancelText);
    this.settingsContainer.add(resetText);
    for (const config of this.configs) {

      this.layout[config.padType] = new Map();
      const optionsContainer = this.scene.add.container(0, 0);
      optionsContainer.setVisible(false);
      const bindingSettings = Object.keys(config.settings);
      const settingLabels: Phaser.GameObjects.Text[] = [];
      const optionValueLabels: Phaser.GameObjects.GameObject[][] = [];
      const inputsIcons: InputsIcons = {};
      const commonSettingKeys = Object.keys(this.setting).slice(0, this.commonSettingsCount).map(key => this.setting[key]);

      const specificBindingKeys = [...commonSettingKeys, ...Object.keys(config.settings)];

      const optionCursors = Object.values(Object.keys(this.settingDeviceDefaults).filter(s => specificBindingKeys.includes(s)).map(k => this.settingDeviceDefaults[k]));

      const settingFiltered = Object.keys(this.setting).filter(_key => specificBindingKeys.includes(this.setting[_key]));
      settingFiltered.forEach((setting, s) => {

        const settingName = setting.replace(/\_/g, " ");
        const isLock = this.settingBlacklisted.includes(this.setting[setting]);
        const labelStyle = isLock ? TextStyle.SETTINGS_LOCKED : TextStyle.SETTINGS_LABEL;
        let labelText: string;
        const i18nKey = this.camelize(settingName.replace("Alt ", ""));
        if (settingName.toLowerCase().includes("alt")) {
          labelText = `${i18next.t(`settings:${i18nKey}`)}${i18next.t("settings:alt")}`;
        } else {
          labelText = i18next.t(`settings:${i18nKey}`);
        }
        settingLabels[s] = addTextObject(this.scene, 8, 28 + s * 16, labelText, labelStyle);
        settingLabels[s].setOrigin(0, 0);
        optionsContainer.add(settingLabels[s]);
        const valueLabels: Phaser.GameObjects.GameObject[] = [];
        for (const [o, option] of this.settingDeviceOptions[this.setting[setting]].entries()) {

          if (bindingSettings.includes(this.setting[setting])) {

            if (o) {
              const valueLabel = addTextObject(this.scene, 0, 0, isLock ? "" : option, TextStyle.WINDOW);
              valueLabel.setOrigin(0, 0);
              optionsContainer.add(valueLabel);
              valueLabels.push(valueLabel);
              continue;
            }

            const icon = this.scene.add.sprite(0, 0, this.textureOverride ? this.textureOverride : config.padType);
            icon.setOrigin(0, -0.15);
            inputsIcons[this.setting[setting]] = icon;
            optionsContainer.add(icon);
            valueLabels.push(icon);
            continue;
          }

          const valueLabel = addTextObject(this.scene, 0, 0, option, this.settingDeviceDefaults[this.setting[setting]] === o ? TextStyle.SETTINGS_SELECTED : TextStyle.WINDOW);
          valueLabel.setOrigin(0, 0);

          optionsContainer.add(valueLabel);
          valueLabels.push(valueLabel);
        }

        optionValueLabels.push(valueLabels);
        const totalWidth = optionValueLabels[s].map((o) => (o as Phaser.GameObjects.Text).width).reduce((total, width) => total += width, 0);
        const labelWidth = Math.max(130, settingLabels[s].displayWidth + 8);
        const totalSpace = (300 - labelWidth) - totalWidth / 6;

        const optionSpacing = Math.floor(totalSpace / (optionValueLabels[s].length - 1));
        let xOffset = 0;
        for (const value of optionValueLabels[s]) {

          (value as Phaser.GameObjects.Text).setPositionRelative(settingLabels[s], labelWidth + xOffset, 0);

          xOffset += (value as Phaser.GameObjects.Text).width / 6 + optionSpacing;
        }
      });

      const rowWidth = (this.scene.game.canvas.width / 6) - 10;
      const rowHeight = 16;
      const rowZones: Phaser.GameObjects.Zone[] = [];
      for (let s = 0; s < settingFiltered.length; s++) {
        const zone = this.scene.add.zone(4, 28 + s * rowHeight, rowWidth, rowHeight);
        zone.setOrigin(0, 0);
        zone.setInteractive({ useHandCursor: true });
        optionsContainer.add(zone);
        rowZones.push(zone);

        const settingIdx = s;
        zone.on("pointerover", () => {
          if (!this.optionValueLabels) return;
          const isVisible = settingIdx >= this.scrollCursor && settingIdx < this.scrollCursor + this.rowsToDisplay;
          if (!isVisible) return;
          const targetCursor = settingIdx - this.scrollCursor;
          if (targetCursor !== this.cursor) {
            this.setCursor(targetCursor);
            this.getUi().playSelect();
          }
        });

        zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!isPrimaryPointer(pointer)) return;
          if (!this.optionValueLabels) return;
          const isVisible = settingIdx >= this.scrollCursor && settingIdx < this.scrollCursor + this.rowsToDisplay;
          if (!isVisible) return;
          const targetCursor = settingIdx - this.scrollCursor;
          if (this.cursor !== targetCursor) {
            this.setCursor(targetCursor);
            this.getUi().playSelect();
          } else {
            this.processInput(Button.ACTION);
          }
        });
      }

      this.layout[config.padType].rowZones = rowZones;
      this.layout[config.padType].optionsContainer = optionsContainer;
      this.layout[config.padType].inputsIcons = inputsIcons;
      this.layout[config.padType].settingLabels = settingLabels;
      this.layout[config.padType].optionValueLabels = optionValueLabels;
      this.layout[config.padType].optionCursors = optionCursors;
      this.layout[config.padType].keys = specificBindingKeys;
      this.layout[config.padType].bindingSettings = bindingSettings;

      this.settingsContainer.add(optionsContainer);
    }

    ui.add(this.settingsContainer);
    this.settingsContainer.setVisible(false);
  }
  getActiveConfig(): InterfaceConfig {
    return this.scene.inputController.getActiveConfig(this.device);
  }
  updateBindings(): void {

    Object.keys(this.layout).forEach((key) => this.layout[key].optionsContainer.setVisible(false));

    const activeConfig = this.getActiveConfig();
    if (!this.setLayout(activeConfig)) {
      return;
    }
    const settings: object = this.getLocalStorageSetting();
    this.keys.forEach((key, index) => {
      this.setOptionCursor(index, settings.hasOwnProperty(key as string) ? settings[key as string] : this.optionCursors[index]);
    });
    if (!activeConfig.custom) {
      return;
    }
    for (const elm of this.bindingSettings) {
      const icon = getIconWithSettingName(activeConfig, elm);
      if (icon) {
        this.inputsIcons[elm as string].setFrame(icon);
        this.inputsIcons[elm as string].alpha = 1;
      } else {
        this.inputsIcons[elm as string].alpha = 0;
      }
    }
    this.setCursor(this.cursor);
    this.setScrollCursor(this.scrollCursor);
  }

  updateNavigationDisplay() {
    const specialIcons = {
      "BUTTON_HOME": "HOME.png",
      "BUTTON_DELETE": "DEL.png",
    };
    for (const settingName of Object.keys(this.navigationIcons)) {
      if (Object.keys(specialIcons).includes(settingName)) {
        this.navigationIcons[settingName].setTexture("keyboard");
        this.navigationIcons[settingName].setFrame(specialIcons[settingName]);
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
  }
  show(args: any[]): boolean {
    super.show(args);

    this.updateNavigationDisplay();
    NavigationManager.getInstance().updateIcons();

    this.updateBindings();
    this._controlPatterns = this._controlPatterns || {};
    this._controlPatterns.nav = attachModalBackground(
      this.scene,
      this.settingsContainer,
      () => ({ bgX: this.navigationContainer.x, bgY: this.navigationContainer.y, bgWidth: this.navigationContainer.width, bgHeight: this.navigationContainer.height }),
      { mask: false, alphaMultiplier: 0.4, gridInc: -2 }
    );
    this._controlPatterns.options = attachModalBackground(
      this.scene,
      this.settingsContainer,
      () => ({ bgX: this.optionsBg.x, bgY: this.optionsBg.y, bgWidth: this.optionsBg.width, bgHeight: this.optionsBg.height }),
      { mask: false, alphaMultiplier: 0.6 }
    );
    this._controlPatterns.actions = attachModalBackground(
      this.scene,
      this.settingsContainer,
      () => ({ bgX: this.actionsBg.x, bgY: this.actionsBg.y, bgWidth: this.actionsBg.width, bgHeight: this.actionsBg.height }),
      { mask: false, alphaMultiplier: 0.4, gridInc: -2 }
    );
    this.settingsContainer.setVisible(true);

    this.resetScroll();

    this._wheelHandler = (_p: any, _g: any, _dx: number, dy: number) => {
      if (!this.optionValueLabels) return;
      const maxScroll = Math.max(0, this.optionValueLabels.length - this.rowsToDisplay);
      if (dy > 0 && this.scrollCursor < maxScroll) {
        this.setScrollCursor(this.scrollCursor + 1);
      } else if (dy < 0 && this.scrollCursor > 0) {
        this.setScrollCursor(this.scrollCursor - 1);
      }
    };
    this.scene.input.on("wheel", this._wheelHandler);
    this.getUi().moveTo(this.settingsContainer, this.getUi().length - 1);
    this.getUi().hideTooltip();

    ModifierTooltipUtils.hide(this.scene as BattleScene);
    const bs = this.scene as BattleScene;
    [bs.getModifierBar(), bs.getModifierBar(true), bs.ui.permaModifierBar].forEach(bar => {
      bar?.getAll().forEach((icon: any) => {
        if (typeof icon.disableInteractive === "function") icon.disableInteractive();
      });
    });

    this._controlPatterns?.nav?.redraw();
    this._controlPatterns?.options?.redraw();
    this._controlPatterns?.actions?.redraw();
    return true;
  }
  setLayout(activeConfig: InterfaceConfig): boolean {

    if (!activeConfig) {

      const layout = this.layout["noGamepads"];

      layout.optionsContainer.setVisible(true);

      return false;
    }

    const configType = activeConfig.padType;

    const layout = this.layout[configType];
    if (layout) {
    this.keys = layout.keys;
    this.optionsContainer = layout.optionsContainer;
    this.optionsContainer.setVisible(true);
    this.settingLabels = layout.settingLabels;
    this.optionValueLabels = layout.optionValueLabels;
    this.optionCursors = layout.optionCursors;
    this.inputsIcons = layout.inputsIcons;
    this.bindingSettings = layout.bindingSettings;

    return true;
    }
    return false;
  }
  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;
    this.updateNavigationDisplay();
    if (button === Button.CANCEL) {

      success = true;
      NavigationManager.getInstance().reset();
      this.scene.ui.revertMode();
    } else {
      const cursor = this.cursor + this.scrollCursor;
      const setting = this.setting[Object.keys(this.setting)[cursor]];
      switch (button) {
        case Button.ACTION:
          if (!this.optionCursors || !this.optionValueLabels) {
          return false;
          }
          if (this.settingBlacklisted.includes(setting) || !setting.includes("BUTTON_")) {
            success = false;
          } else {
            success = this.setSetting(this.scene, setting, 1);
          }
          break;
        case Button.UP:
          if (!this.optionValueLabels) {
            return false;
          }
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
          if (!this.optionValueLabels) {
            return false;
          }
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
          if (!this.optionCursors || !this.optionValueLabels) {
          return false;
          }
          if (this.settingBlacklisted.includes(setting) || setting.includes("BUTTON_")) {
            success = false;
          } else if (this.optionCursors[cursor]) {
            success = this.setOptionCursor(cursor, this.optionCursors[cursor] - 1, true);
          }
          break;
        case Button.RIGHT:
          if (!this.optionCursors || !this.optionValueLabels) {
          return false;
          }
          if (this.settingBlacklisted.includes(setting) || setting.includes("BUTTON_")) {
            success = false;
          } else if (this.optionCursors[cursor] < this.optionValueLabels[cursor].length - 1) {
            success = this.setOptionCursor(cursor, this.optionCursors[cursor] + 1, true);
          }
          break;
        case Button.CYCLE_FORM:
        case Button.CYCLE_SHINY:
          success = this.navigationContainer.navigate(button);
          break;
      }
    }
    if (success) {
      ui.playSelect();
    }

    return success;
  }

  resetScroll() {
    this.cursorObj?.destroy();
    this.cursorObj = null;
    this.cursor = 0;
    this.setCursor(0);
    this.setScrollCursor(0);
    this.updateSettingsScroll();
  }
  setCursor(cursor: integer): boolean {
    const ret = super.setCursor(cursor);

    if (!this.optionsContainer) {
      return ret;
    }
    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.nineslice(0, 0, "summary_moves_cursor", undefined, (this.scene.game.canvas.width / 6) - 10, 16, 1, 1, 1, 1);
      this.cursorObj.setOrigin(0, 0);
      this.optionsContainer.add(this.cursorObj);
    }
    this.cursorObj.setPositionRelative(this.optionsBg, 4, 4 + (this.cursor + this.scrollCursor) * 16);

    return ret;
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
  setOptionCursor(settingIndex: integer, cursor: integer, save?: boolean): boolean {

    const setting = this.setting[Object.keys(this.setting)[settingIndex]];
    const lastCursor = this.optionCursors[settingIndex];
    if (!this.bindingSettings.includes(setting) && !setting.includes("BUTTON_")) {

      const lastValueLabel = this.optionValueLabels[settingIndex][lastCursor];
      lastValueLabel.setColor(this.getTextColor(TextStyle.WINDOW));
      lastValueLabel.setShadowColor(this.getTextColor(TextStyle.WINDOW, true));
      this.optionCursors[settingIndex] = cursor;
      const newValueLabel = this.optionValueLabels[settingIndex][cursor];
      newValueLabel.setColor(this.getTextColor(TextStyle.SETTINGS_SELECTED));
      newValueLabel.setShadowColor(this.getTextColor(TextStyle.SETTINGS_SELECTED, true));
    }
    if (save) {
      this.saveSettingToLocalStorage(setting, cursor);
    }

    return true;
  }
  updateSettingsScroll(): void {
    if (!this.optionsContainer) {
      return;
    }

    this.optionsContainer.setY(-16 * this.scrollCursor);

    for (let s = 0; s < this.settingLabels.length; s++) {
      const visible = s >= this.scrollCursor && s < this.scrollCursor + this.rowsToDisplay;

      this.settingLabels[s].setVisible(visible);
      for (const option of this.optionValueLabels[s]) {
        option.setVisible(visible);
      }
    }

    const activeLayout = this.layout[this.getActiveConfig()?.padType];
    const zones = activeLayout?.rowZones as Phaser.GameObjects.Zone[] | undefined;
    if (zones) {
      for (let s = 0; s < zones.length; s++) {
        const visible = s >= this.scrollCursor && s < this.scrollCursor + this.rowsToDisplay;
        if (visible) {
          zones[s].setInteractive({ useHandCursor: true });
        } else {
          zones[s].disableInteractive();
        }
      }
    }

    this.settingsContainer.bringToTop(this.navigationContainer);
  }
  clear(): void {
    const bs = this.scene as BattleScene;
    [bs.getModifierBar(), bs.getModifierBar(true), bs.ui.permaModifierBar].forEach(bar => {
      bar?.getAll().forEach((icon: any) => {
        if (typeof icon.setInteractive === "function") icon.setInteractive();
      });
    });

    this._controlPatterns?.nav?.clear();
    this._controlPatterns?.options?.clear();
    this._controlPatterns?.actions?.clear();
    this._controlPatterns = undefined;

    if (this._wheelHandler) {
      this.scene.input.off("wheel", this._wheelHandler);
      this._wheelHandler = null;
    }

    super.clear();

    this.settingsContainer.setVisible(false);

    this.eraseCursor();
  }
  eraseCursor(): void {

    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

}