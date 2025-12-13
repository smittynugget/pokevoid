import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { addTextObject, TextStyle } from "#app/ui/text.js";
import i18next from "i18next";

export class EndCardPhase extends Phase {
  public hallOfFameBg: Phaser.GameObjects.Image;
  public text: Phaser.GameObjects.Text;

  constructor(scene: BattleScene) {
    super(scene);
  }

  start(): void {
    super.start();

    this.scene.ui.getMessageHandler().bg.setVisible(false);
    this.scene.ui.getMessageHandler().nameBoxContainer.setVisible(false);

    this.hallOfFameBg = this.scene.add.image(0, 0, "hall_of_fame");
    this.hallOfFameBg.setOrigin(0);
    this.hallOfFameBg.setDisplaySize(this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6);
    this.scene.field.add(this.hallOfFameBg);

    this.text = addTextObject(this.scene, this.scene.game.canvas.width / 12, (this.scene.game.canvas.height / 6) - 16, i18next.t("battle:congratulations"), TextStyle.SUMMARY, { fontSize: "128px" });
    this.text.setOrigin(0.5);
    this.scene.field.add(this.text);

    this.scene.ui.clearText();

    this.scene.ui.fadeIn(1000).then(() => {

      this.scene.ui.showText("", null, () => {
        this.scene.ui.getMessageHandler().bg.setVisible(true);
        this.end();
      }, null, true);
    });
  }
}