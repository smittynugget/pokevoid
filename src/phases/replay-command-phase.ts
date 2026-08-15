import { Phase } from "../phase";
import BattleScene from "../battle-scene";

export class ReplayCommandPhase extends Phase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    super.start();
    this.end();
  }
}