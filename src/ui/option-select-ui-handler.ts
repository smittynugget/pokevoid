import BattleScene from "../battle-scene";
import AbstractOptionSelectUiHandler from "./abstact-option-select-ui-handler";
import { Mode } from "./ui";

export default class OptionSelectUiHandler extends AbstractOptionSelectUiHandler {
  constructor(scene: BattleScene, mode: Mode = Mode.OPTION_SELECT) {
    super(scene, mode);
  }

  getWindowWidth(): integer {

    if (this.mode === Mode.TITLE && this.config?.options) {
      console.log("[OptionSelectUiHandler] Calculating window width:", {
        options: this.config.options.map(o => ({ label: o.label, length: o.label.length }))
      });
      const maxLabelWidth = Math.max(...this.config.options.map(o => o.label.length));
      const baseWidth = Math.max(128, maxLabelWidth * 12);

      console.log("[OptionSelectUiHandler] Window width calculation:", {
        maxLabelWidth,
        baseWidth
      });

      return baseWidth;
    }
    return 64;
  }
}