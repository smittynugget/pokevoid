import BattleScene from "../../battle-scene";
import { SettingType } from "../../system/settings/settings";
import { Mode } from "../mode";
import AbstractSettingsUiHandler from "./abstract-settings-ui-handler";

export default class SettingsUiHandler extends AbstractSettingsUiHandler {

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, SettingType.GENERAL, mode);
    this.title = "General";
    this.localStorageKey = "settings";
  }
}