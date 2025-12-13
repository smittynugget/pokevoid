import BattleScene from "../../battle-scene";
import {Mode} from "../ui";
import cfg_keyboard_qwerty from "#app/configs/inputs/cfg_keyboard_qwerty";
import {
  setSettingKeyboard,
  SettingKeyboard,
  settingKeyboardBlackList,
  settingKeyboardDefaults,
  settingKeyboardOptions
} from "#app/system/settings/settings-keyboard";
import {reverseValueToKeySetting, truncateString} from "#app/utils";
import AbstractControlSettingsUiHandler from "#app/ui/settings/abstract-control-settings-ui-handler.js";
import {InterfaceConfig} from "#app/inputs-controller";
import {addTextObject, TextStyle} from "#app/ui/text";
import {deleteBind} from "#app/configs/inputs/configHandler";
import {Device} from "#enums/devices";
import {NavigationManager} from "#app/ui/settings/navigationMenu";
import i18next from "i18next";
export default class SettingsKeyboardUiHandler extends AbstractControlSettingsUiHandler {

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
    this.titleSelected = "Keyboard";
    this.setting = SettingKeyboard;
    this.settingDeviceDefaults = settingKeyboardDefaults;
    this.settingDeviceOptions = settingKeyboardOptions;
    this.configs = [cfg_keyboard_qwerty];
    this.commonSettingsCount = 0;
    this.textureOverride = "keyboard";
    this.localStoragePropertyName = "settingsKeyboard";
    this.settingBlacklisted = settingKeyboardBlackList;
    this.device = Device.KEYBOARD;

    const deleteEvent = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
    const restoreDefaultEvent = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.HOME);
    deleteEvent && deleteEvent.on("up", this.onDeleteDown, this);
    restoreDefaultEvent && restoreDefaultEvent.on("up", this.onHomeDown, this);
  }

  setSetting = setSettingKeyboard;
  setup() {
    super.setup();

    this.layout["noKeyboard"] = new Map();
    const optionsContainer = this.scene.add.container(0, 0);
    optionsContainer.setVisible(false);
    const label = addTextObject(this.scene, 8, 28, i18next.t("settings:keyboardPleasePress"), TextStyle.SETTINGS_LABEL);
    label.setOrigin(0, 0);
    optionsContainer.add(label);
    this.settingsContainer.add(optionsContainer);

    const iconDelete = this.scene.add.sprite(0, 0, "keyboard");
    iconDelete.setOrigin(0, -0.1);
    iconDelete.setPositionRelative(this.actionsBg, this.navigationContainer.width - 260, 4);
    this.navigationIcons["BUTTON_DELETE"] = iconDelete;

    const deleteText = addTextObject(this.scene, 0, 0, i18next.t("settings:delete"), TextStyle.SETTINGS_LABEL);
    deleteText.setOrigin(0, 0.15);
    deleteText.setPositionRelative(iconDelete, -deleteText.width/6-2, 0);

    this.settingsContainer.add(iconDelete);
    this.settingsContainer.add(deleteText);
    this.layout["noKeyboard"].optionsContainer = optionsContainer;
    this.layout["noKeyboard"].label = label;
  }
  onHomeDown(): void {
    if (![Mode.SETTINGS_KEYBOARD, Mode.SETTINGS_GAMEPAD].includes(this.scene.ui.getMode())) {
      return;
    }
    this.scene.gameData.resetMappingToFactory();
    NavigationManager.getInstance().updateIcons();
  }
  onDeleteDown(): void {
    if (this.scene.ui.getMode() !== Mode.SETTINGS_KEYBOARD) {
      return;
    }
    const cursor = this.cursor + this.scrollCursor;
    const selection = this.settingLabels[cursor].text;
    const key = reverseValueToKeySetting(selection);
    const settingName = SettingKeyboard[key];
    const activeConfig = this.getActiveConfig();
    const success = deleteBind(this.getActiveConfig(), settingName);
    if (success) {
      this.saveCustomKeyboardMappingToLocalStorage(activeConfig);
      this.updateBindings();
      NavigationManager.getInstance().updateIcons();
    }
  }
  setLayout(activeConfig: InterfaceConfig): boolean {

    if (!activeConfig) {

      const layout = this.layout["noKeyboard"];

      layout.optionsContainer.setVisible(true);

      return false;
    }

    return super.setLayout(activeConfig);
  }
  updateChosenKeyboardDisplay(): void {

    this.updateBindings();
    for (const [index, key] of Object.keys(this.setting).entries()) {
      const setting = this.setting[key];
      if (setting === this.setting.Default_Layout) {

        for (const _key of Object.keys(this.layout)) {
          if (_key === "noKeyboard") {
            continue;
          }
          this.layout[_key].optionValueLabels[index][0].setText(truncateString(this.scene.inputController.selectedDevice[Device.KEYBOARD], 22));
        }
      }
    }

  }
  saveCustomKeyboardMappingToLocalStorage(config): void {
    this.scene.gameData.saveMappingConfigs(this.scene.inputController?.selectedDevice[Device.KEYBOARD], config);
  }
  saveSettingToLocalStorage(settingName, cursor): void {
    if (this.setting[settingName] !== this.setting.Default_Layout) {
      this.scene.gameData.saveControlSetting(this.device, this.localStoragePropertyName, settingName, this.settingDeviceDefaults, cursor);
    }
  }
}