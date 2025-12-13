import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";
import RunInfoUiHandler from "#app/ui/run-info-ui-handler.js";

export class HallOfFamePhase extends Phase {
  private hallOfFameContainer: Phaser.GameObjects.Container;

  constructor(scene: BattleScene) {
    super(scene);
  }

  start(): void {
    super.start();
    this.scene.ui.getMessageHandler().bg.setVisible(false);
    this.scene.ui.getMessageHandler().nameBoxContainer.setVisible(false);
    this.scene.fieldUI.setVisible(false);
    this.scene.setModifiersVisible(false);
    this.scene.ui.getPermaMoneyContainer().setVisible(false);
    this.scene.ui.permaModifierBar.setVisible(false);
    this.hallOfFameContainer = this.scene.add.container(0, 0);
    const party = this.scene.getParty();
    RunInfoUiHandler.populateHallOfFame(this.scene, this.hallOfFameContainer, party, {
      visible: true
    });
    this.scene.field.add(this.hallOfFameContainer);
    this.hallOfFameContainer.setDepth(10);
    this.scene.ui.clearText();
    this.scene.ui.fadeIn(1000).then(() => {
      const messageHandler = this.scene.ui.getMessageHandler();

      this.scene.ui.showText("", 0, () => {
        this.openRunInfo();
      }, null, true);

      if (messageHandler.prompt) {
        messageHandler.prompt.anims.stop();
        messageHandler.prompt.setVisible(false);
      }
    });
  }

  private openRunInfo(): void {
    this.hallOfFameContainer.destroy();
    this.scene.ui.getMessageHandler().bg.setVisible(true);
    this.scene.fieldUI.setVisible(true);
    this.scene.setModifiersVisible(true);
    this.scene.ui.getPermaMoneyContainer().setVisible(true);
    this.scene.ui.permaModifierBar.setVisible(true);
    const sessionData = this.scene.gameData.getSessionSaveData(this.scene);
    const victoryRunEntry = {
      entry: sessionData,
      isVictory: true,
      isFavorite: false,
      isActive: false,
      isFinalBattleContext: true
    };
    this.scene.ui.setOverlayMode(Mode.RUN_INFO, victoryRunEntry, true);
    this.end();
  }
}