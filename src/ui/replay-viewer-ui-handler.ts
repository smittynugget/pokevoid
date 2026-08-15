import BattleScene from "../battle-scene";
import UiHandler from "./ui-handler";
import { Mode } from "./mode";
import { Button } from "#enums/buttons";

export interface ReplayViewerConfig {
  onPlayPause?: () => void;
  onStepBack?: () => void;
  onStepForward?: () => void;
  onJumpToEnd?: () => void;
  onExit?: () => void;
}

export default class ReplayViewerUiHandler extends UiHandler {
  constructor(scene: BattleScene) {
    super(scene, Mode.REPLAY_VIEWER);
  }

  setup(): void {}

  show(args: any[]): boolean {
    return false;
  }

  processInput(button: Button): boolean {
    return true;
  }

  clear(): void {
    super.clear();
  }
}