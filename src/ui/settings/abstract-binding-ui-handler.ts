import UiHandler from "../ui-handler";
import BattleScene from "../../battle-scene";
import {Mode} from "../mode";
import {addWindow} from "../ui-theme";
import {addTextObject, TextStyle} from "../text";
import {Button} from "#enums/buttons";
import {NavigationManager} from "#app/ui/settings/navigationMenu";
import i18next from "i18next";

type CancelFn = (succes?: boolean) => boolean;
export default abstract class AbstractBindingUiHandler extends UiHandler {

  protected optionSelectContainer: Phaser.GameObjects.Container;
  protected actionsContainer: Phaser.GameObjects.Container;
  protected titleBg: Phaser.GameObjects.NineSlice;
  protected actionBg: Phaser.GameObjects.NineSlice;
  protected optionSelectBg: Phaser.GameObjects.NineSlice;
  protected unlockText: Phaser.GameObjects.Text;
  protected timerText: Phaser.GameObjects.Text;
  protected swapText: Phaser.GameObjects.Text;
  protected actionLabel: Phaser.GameObjects.Text;
  protected cancelLabel: Phaser.GameObjects.Text;

  protected listening: boolean = false;
  protected buttonPressed: number | null = null;
  protected newButtonIcon: Phaser.GameObjects.Sprite;
  protected targetButtonIcon: Phaser.GameObjects.Sprite;
  protected cancelFn: CancelFn | null;
  abstract swapAction(): boolean;

  protected timeLeftAutoClose: number = 5;
  protected countdownTimer;
  protected target;
  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
  }
  setup() {
    const ui = this.getUi();
    this.optionSelectContainer = this.scene.add.container(0, 0);
    this.actionsContainer = this.scene.add.container(0, 0);

    this.optionSelectContainer.setVisible(false);
    this.actionsContainer.setVisible(false);
    ui.add(this.optionSelectContainer);
    ui.add(this.actionsContainer);
    this.titleBg = addWindow(this.scene, (this.scene.game.canvas.width / 6) - this.getWindowWidth(), -(this.scene.game.canvas.height / 6) + 28 + 21, this.getWindowWidth(), 24);
    this.titleBg.setOrigin(0.5);
    this.optionSelectContainer.add(this.titleBg);

    this.actionBg = addWindow(this.scene, (this.scene.game.canvas.width / 6) - this.getWindowWidth(), -(this.scene.game.canvas.height / 6) + this.getWindowHeight() + 28 + 21 + 21, this.getWindowWidth(), 24);
    this.actionBg.setOrigin(0.5);
    this.actionsContainer.add(this.actionBg);
    this.unlockText = addTextObject(this.scene, 0, 0, i18next.t("settings:pressButton"), TextStyle.WINDOW);
    this.unlockText.setOrigin(0, 0);
    this.unlockText.setPositionRelative(this.titleBg, 36, 4);
    this.optionSelectContainer.add(this.unlockText);

    this.timerText = addTextObject(this.scene, 0, 0, "(5)", TextStyle.WINDOW);
    this.timerText.setOrigin(0, 0);
    this.timerText.setPositionRelative(this.unlockText, (this.unlockText.width/6) + 5, 0);
    this.optionSelectContainer.add(this.timerText);

    this.optionSelectBg = addWindow(this.scene, (this.scene.game.canvas.width / 6) - this.getWindowWidth(), -(this.scene.game.canvas.height / 6) + this.getWindowHeight() + 28, this.getWindowWidth(), this.getWindowHeight());
    this.optionSelectBg.setOrigin(0.5);
    this.optionSelectContainer.add(this.optionSelectBg);

    this.cancelLabel = addTextObject(this.scene, 0, 0, i18next.t("settings:back"), TextStyle.SETTINGS_LABEL);
    this.cancelLabel.setOrigin(0, 0.5);
    this.cancelLabel.setPositionRelative(this.actionBg, 10, this.actionBg.height / 2);
    this.actionsContainer.add(this.cancelLabel);
  }

  manageAutoCloseTimer() {
    clearTimeout(this.countdownTimer);
    this.countdownTimer = setTimeout(() => {
      this.timeLeftAutoClose -= 1;
      this.timerText.setText(`(${this.timeLeftAutoClose})`);
      if (this.timeLeftAutoClose >= 0) {
        this.manageAutoCloseTimer();
      } else {
        this.cancelFn && this.cancelFn();
      }
    }, 1000);
  }
  show(args: any[]): boolean {
    super.show(args);
    this.buttonPressed = null;
    this.timeLeftAutoClose = 5;
    this.cancelFn = args[0].cancelHandler;
    this.target = args[0].target;
    this.getUi().bringToTop(this.optionSelectContainer);
    this.getUi().bringToTop(this.actionsContainer);

    this.optionSelectContainer.setVisible(true);
    setTimeout(() => {
      this.listening = true;
      this.manageAutoCloseTimer();
    }, 100);
    return true;
  }
  getWindowWidth(): number {
    return 160;
  }
  getWindowHeight(): number {
    return 64;
  }
  processInput(button: Button): boolean {
    if (this.buttonPressed === null) {
      return false;
    }
    const ui = this.getUi();
    let success = false;
    switch (button) {
      case Button.LEFT:
      case Button.RIGHT:

        const cursor = this.cursor ? 0 : 1;
        success = this.setCursor(cursor);
        break;
      case Button.ACTION:

        if (this.cursor === 0) {
        this.cancelFn && this.cancelFn();
        } else {
          success = this.swapAction();
          NavigationManager.getInstance().updateIcons();
        this.cancelFn && this.cancelFn(success);
        }
        break;
    }
    if (success) {
      ui.playSelect();
    } else {
      ui.playError();
    }

    return success;
  }
  setCursor(cursor: integer): boolean {
    this.cursor = cursor;
    if (cursor === 1) {
      this.actionLabel.setColor(this.getTextColor(TextStyle.SETTINGS_SELECTED));
      this.actionLabel.setShadowColor(this.getTextColor(TextStyle.SETTINGS_SELECTED, true));
      this.cancelLabel.setColor(this.getTextColor(TextStyle.WINDOW));
      this.cancelLabel.setShadowColor(this.getTextColor(TextStyle.WINDOW, true));
      return true;
    }
    this.actionLabel.setColor(this.getTextColor(TextStyle.WINDOW));
    this.actionLabel.setShadowColor(this.getTextColor(TextStyle.WINDOW, true));
    this.cancelLabel.setColor(this.getTextColor(TextStyle.SETTINGS_SELECTED));
    this.cancelLabel.setShadowColor(this.getTextColor(TextStyle.SETTINGS_SELECTED, true));
    return true;
  }
  clear() {
    super.clear();
    clearTimeout(this.countdownTimer);
    this.timerText.setText("(5)");
    this.timeLeftAutoClose = 5;
    this.listening = false;
    this.target = null;
    this.cancelFn = null;
    this.optionSelectContainer.setVisible(false);
    this.actionsContainer.setVisible(false);
    this.newButtonIcon.setVisible(false);
    this.buttonPressed = null;
  }
  onInputDown(buttonIcon: string, assignedButtonIcon: string | null, type: string): void {
    clearTimeout(this.countdownTimer);
    this.timerText.setText("");
    this.newButtonIcon.setTexture(type);
    this.newButtonIcon.setFrame(buttonIcon);
    if (assignedButtonIcon) {
      this.targetButtonIcon.setTexture(type);
      this.targetButtonIcon.setFrame(assignedButtonIcon);
      this.targetButtonIcon.setVisible(true);
      this.swapText.setVisible(true);
    }
    this.newButtonIcon.setVisible(true);
    this.setCursor(0);
    this.actionsContainer.setVisible(true);
  }
}