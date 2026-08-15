import BattleScene from "../../battle-scene";
import { Mode } from "../mode";
"#app/inputs-controller.js";
import AbstractSettingsUiHandler from "./abstract-settings-ui-handler";
import { SettingType } from "#app/system/settings/settings";

export default class SettingsAudioUiHandler extends AbstractSettingsUiHandler {

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, SettingType.AUDIO, mode);
    this.title = "Audio";
    this.localStorageKey = "settings";
    this.rowsToDisplay = 6;
  }
}