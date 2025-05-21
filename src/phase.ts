import BattleScene from "./battle-scene";

export class Phase {
  protected scene: BattleScene;

  constructor(scene: BattleScene) {
    this.scene = scene;
  }

  start() {
    if (this.scene.abilityBar.shown) {
      this.scene.abilityBar.resetAutoHideTimer();
    }
    this.scene.ui.updateSaveIcon(this.scene);
  }

  end() {
    this.scene.shiftPhase();
  }
}
