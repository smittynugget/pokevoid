import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { EndCardPhase } from "./end-card-phase";
import { TitlePhase } from "./title-phase";

export class PostGameOverPhase extends Phase {
  private endCardPhase: EndCardPhase | null;
  private victory: boolean;

  constructor(scene: BattleScene, endCardPhase?: EndCardPhase, victory?: boolean) {
    super(scene);

    this.endCardPhase = endCardPhase!;
    this.victory = !!victory;
  }

  start() {
    super.start();

    const saveAndReset = () => {
      if (this.scene.gameMode.isTestMod) {
        this.scene.gameData.testSpeciesForMod = this.scene.gameData.testSpeciesForMod.slice(6);
      }

      this.scene.gameData.resetBattlePathData();

      this.scene.gameData.saveAll(this.scene, true, true, true).then(success => {
        if (!success) {
          return this.scene.reset(true);
        }
        if (this.scene.gameMode.isTestMod) {
          this.scene.reset();
          this.scene.showTitleBG();
          this.scene.unshiftPhase(new TitlePhase(this.scene, false, false, this.victory));
          this.end();
          return;
        }
        this.scene.gameData.tryClearSession(this.scene, this.scene.sessionSlotId).then((success: boolean | [boolean, boolean]) => {
          if (!success[0]) {
            return this.scene.reset(true);
          }
          this.scene.reset();
          this.scene.showTitleBG();
          this.scene.unshiftPhase(new TitlePhase(this.scene, false, false, this.victory));
          this.end();
        });
      });
    };

    if (this.endCardPhase) {
      this.scene.ui.fadeOut(500).then(() => {
        this.scene.ui.hideMessageChrome?.();

        this.endCardPhase?.endCard.destroy();
        this.endCardPhase?.text.destroy();
        saveAndReset();
      });
    } else {
      saveAndReset();
    }
  }
}