import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";
import { SmitomTipConfig } from "#app/ui/smitom-tip-ui-handler.js";

export class SmitomTutorialPhase extends Phase {
  private tutorialKey: string;
  private title: string;
  private texts: string[];
  private offerReplay: boolean;

  constructor(
    scene: BattleScene,
    tutorialKey: string,
    title: string,
    texts: string[],
    offerReplay: boolean = true
  ) {
    super(scene);
    this.tutorialKey = tutorialKey;
    this.title = title;
    this.texts = texts;
    this.offerReplay = offerReplay;
  }

  start() {
    super.start();
    if (this.isCompleted()) {
      this.end();
      return;
    }
    const tipConfig: SmitomTipConfig = {
      tutorialKey: this.tutorialKey,
      title: this.title,
      texts: this.texts,
      offerReplay: this.offerReplay,
      onComplete: () => {
        this.markCompleted();
        this.end();
      }
    };
    this.scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
  }

  private isCompleted(): boolean {
    if (this.scene.gameData.tutorialOnboardActive) return false;
    return !!this.scene.gameData.smitomTutorialFlags[this.tutorialKey];
  }

  private markCompleted(): void {
    if (!this.scene.gameData.tutorialOnboardActive) {
      this.scene.gameData.smitomTutorialFlags[this.tutorialKey] = true;
      this.scene.gameData.saveSystem();
    }
  }
}