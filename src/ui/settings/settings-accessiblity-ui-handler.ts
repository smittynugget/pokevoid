import BattleScene from "../../battle-scene";
import { Mode } from "../ui";
"#app/inputs-controller.js";
import AbstractSettingsUiHandler from "./abstract-settings-ui-handler";
import { Setting, SettingType } from "#app/system/settings/settings";

export default class SettingsAccessibilityUiHandler extends AbstractSettingsUiHandler {

  constructor(scene: BattleScene, mode?: Mode) {
    super(scene, mode);
    this.title = "Accessibility";
    this.settings = Setting.filter(s => s.type === SettingType.ACCESSIBILITY);
    this.localStorageKey = "settings";
  }
}