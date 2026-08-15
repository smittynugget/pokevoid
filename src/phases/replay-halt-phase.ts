import { Phase } from "../phase";
import BattleScene from "../battle-scene";

export class ReplayHaltPhase extends Phase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    super.start();
    this.scene.replayAwaitingStep = true;
  }
}