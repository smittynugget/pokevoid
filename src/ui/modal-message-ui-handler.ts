import BattleScene from "#app/battle-scene";
import MessageUiHandler from "./message-ui-handler";
import { addTextObject, TextStyle } from "./text";
import { addWindow } from "./ui-theme";
import { Mode } from "./ui";

export default class ModalMessageUiHandler extends MessageUiHandler {
  public container: Phaser.GameObjects.Container;
  private messageBg: Phaser.GameObjects.NineSlice;
  private messageContainer: Phaser.GameObjects.Container;
  private modalWidth: number;
  private modalHeight: number;

  constructor(
    scene: BattleScene,
    container: Phaser.GameObjects.Container,
    modalWidth: number,
    modalHeight: number
  ) {
    super(scene, null);
    this.container = container;
    this.modalWidth = modalWidth;
    this.modalHeight = modalHeight;
  }

  setup(): void {
    this.textTimer = null;
    this.textCallbackTimer = null;

    const leftX = 4;
    const bottomY = this.modalHeight - 5;

    const bgWidth = this.modalWidth - 9;
    const bgHeight = 28;

    this.messageContainer = this.scene.add.container(leftX, bottomY);
    this.messageContainer.setVisible(false);

    this.messageBg = addWindow(this.scene, 0, 0, bgWidth, bgHeight);
    this.messageBg.setOrigin(0, 1);
    this.messageContainer.add(this.messageBg);

    const textWrapWidth = bgWidth * 6 - 24;

    this.message = addTextObject(
      this.scene,
      12,
      -14,
      "",
      TextStyle.MESSAGE,
      { maxLines: 1, wordWrap: { width: textWrapWidth } }
    );
    this.message.setOrigin(0, 0.5);
    this.messageContainer.add(this.message);

    this.prompt = this.scene.add.sprite(0, 0, "prompt");
    this.prompt.setVisible(false);
    this.prompt.setOrigin(0, 0);
    this.messageContainer.add(this.prompt);

    this.container.add(this.messageContainer);
  }

  show(args: any[]): boolean {
    super.show(args);
    this.container.bringToTop(this.messageContainer);
    this.messageContainer.setVisible(true);
    return true;
  }

  showText(
    text: string,
    delay?: integer | null,
    callback?: Function | null,
    callbackDelay?: integer | null,
    prompt?: boolean | null,
    promptDelay?: integer | null
  ): void {
    this.container.bringToTop(this.messageContainer);
    this.messageContainer.setVisible(true);
    super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);
  }

  clear(): void {
    super.clear();
    if (this.messageContainer) {
      this.messageContainer.setVisible(false);
    }
    if (this.textTimer) {
      this.textTimer.remove();
      this.textTimer = null;
    }
    if (this.textCallbackTimer) {
      this.textCallbackTimer.destroy();
      this.textCallbackTimer = null;
    }
  }
}