import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";

export class RunInfoPhase extends Phase {
  private victory: boolean;

  constructor(scene: BattleScene, victory: boolean) {
    super(scene);
    this.victory = victory;
  }

  start(): void {
    super.start();
    const sessionData = this.scene.gameData.getSessionSaveData(this.scene);
    const runInfoEntry = {
      entry: sessionData,
      isVictory: this.victory,
      isFavorite: false,
      isActive: false,
      isFinalBattleContext: true
    };
    this.scene.ui.setOverlayMode(Mode.RUN_INFO, runInfoEntry, true);
  }
}