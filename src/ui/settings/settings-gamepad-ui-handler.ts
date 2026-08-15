import BattleScene from "../../battle-scene";
import {addTextObject, TextStyle} from "../text";
import {Mode} from "../mode";
import {
  setSettingGamepad,
  SettingGamepad,
  settingGamepadBlackList,
  settingGamepadDefaults,
  settingGamepadOptions
} from "../../system/settings/settings-gamepad";
import pad_xbox360 from "#app/configs/inputs/pad_xbox360";
import pad_dualshock from "#app/configs/inputs/pad_dualshock";
import pad_unlicensedSNES from "#app/configs/inputs/pad_unlicensedSNES";
import {InterfaceConfig} from "#app/inputs-controller";
import AbstractControlSettingsUiHandler from "#app/ui/settings/abstract-control-settings-ui-handler.js";
import {Device} from "#enums/devices";
import {truncateString} from "#app/utils";
import i18next from "i18next";
export default class SettingsGamepadUiHandler extends AbstractControlSettingsUiHandler {
  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
    this.titleSelected = "Gamepad";
    this.setting = SettingGamepad;
    this.settingDeviceDefaults = settingGamepadDefaults;
    this.settingDeviceOptions = settingGamepadOptions;
    this.configs = [pad_xbox360, pad_dualshock, pad_unlicensedSNES];
    this.commonSettingsCount = 2;
    this.localStoragePropertyName = "settingsGamepad";
    this.settingBlacklisted = settingGamepadBlackList;
    this.device = Device.GAMEPAD;
  }

  setSetting = setSettingGamepad;
  setup() {
    super.setup();

    this.layout["noGamepads"] = new Map();
    const optionsContainer = this.scene.add.container(0, 0);
    optionsContainer.setVisible(false);
    const label = addTextObject(this.scene, 8, 28, i18next.t("settings:gamepadPleasePlug"), TextStyle.SETTINGS_LABEL);
    label.setOrigin(0, 0);
    optionsContainer.add(label);
    this.settingsContainer.add(optionsContainer);
    this.layout["noGamepads"].optionsContainer = optionsContainer;
    this.layout["noGamepads"].label = label;
  }
  setLayout(activeConfig: InterfaceConfig): boolean {

    if (!activeConfig) {

      const layout = this.layout["noGamepads"];

      layout.optionsContainer.setVisible(true);

      return false;
    }

    return super.setLayout(activeConfig);
  }
  updateChosenGamepadDisplay(): void {

    this.updateBindings();
    this.resetScroll();
    for (const [index, key] of Object.keys(this.setting).entries()) {
      const setting = this.setting[key];
      if (setting === this.setting.Controller) {

        for (const _key of Object.keys(this.layout)) {
          if (_key === "noGamepads") {
            continue;
          }
          this.layout[_key].optionValueLabels[index][0].setText(truncateString(this.scene.inputController.selectedDevice[Device.GAMEPAD], 20));
        }
      }
    }
  }
  saveSettingToLocalStorage(settingName, cursor): void {
    if (this.setting[settingName] !== this.setting.Controller) {
      this.scene.gameData.saveControlSetting(this.device, this.localStoragePropertyName, settingName, this.settingDeviceDefaults, cursor);
    }
  }
}