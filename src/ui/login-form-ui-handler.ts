import { FormModalUiHandler } from "./form-modal-ui-handler";
import { ModalConfig } from "./modal-ui-handler";
import * as Utils from "../utils";
import { Mode } from "./ui";
import i18next from "i18next";
import BattleScene from "#app/battle-scene.js";
import { addTextObject, TextStyle } from "./text";
import { addWindow } from "./ui-theme";
import { transferLoad } from "#app/account";

export default class LoginFormUiHandler extends FormModalUiHandler {
  private googleImage: Phaser.GameObjects.Image;
  private externalPartyContainer: Phaser.GameObjects.Container;
  private externalPartyBg: Phaser.GameObjects.NineSlice;
  private externalPartyTitle: Phaser.GameObjects.Text;
  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
  }

  setup(): void {

    super.setup();
    this.externalPartyContainer = this.scene.add.container(0, 0);
    this.externalPartyContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 12, this.scene.game.canvas.height / 12), Phaser.Geom.Rectangle.Contains);
    this.externalPartyTitle = addTextObject(this.scene, 0, 4, "", TextStyle.SETTINGS_LABEL);
    this.externalPartyTitle.setOrigin(0.5, 0);
    this.externalPartyBg = addWindow(this.scene, 0, 0, 0, 0);
    this.externalPartyContainer.add(this.externalPartyBg);
    this.externalPartyContainer.add(this.externalPartyTitle);

    const googleImage = this.scene.add.image(0, 0, "google");
    googleImage.setOrigin(0, 0);
    googleImage.setScale(0.07);
    googleImage.setInteractive();
    googleImage.setName("google-icon");
    googleImage.on("pointerdown", () => {
      const redirectUri = encodeURIComponent(`${import.meta.env.VITE_SERVER_URL}/auth/google/callback`);
      const googleId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            const googleUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${googleId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile`;            window.open(googleUrl, "_self");
    });
    this.googleImage = googleImage;

    this.externalPartyContainer.add(this.googleImage);
    this.getUi().add(this.externalPartyContainer);
    this.externalPartyContainer.add(this.googleImage);
    this.externalPartyContainer.setVisible(false);
  }

  getModalTitle(config?: ModalConfig): string {
    return i18next.t("menu:login");
  }

  getFields(config?: ModalConfig): string[] {
    return [ i18next.t("menu:username"), i18next.t("menu:password") ];
  }

  getWidth(config?: ModalConfig): number {
    return 160;
  }

  getMargin(config?: ModalConfig): [number, number, number, number] {
    return [ 0, 0, 48, 0 ];
  }

  getButtonLabels(config?: ModalConfig): string[] {
    return [ i18next.t("menu:login"), i18next.t("menu:register") ];
  }

  getReadableErrorMessage(error: string): string {
    const colonIndex = error?.indexOf(":");
    if (colonIndex > 0) {
      error = error.slice(0, colonIndex);
    }
    switch (error) {
    case "invalid username":
      return i18next.t("menu:invalidLoginUsername");
    case "invalid password":
      return i18next.t("menu:invalidLoginPassword");
    case "account doesn't exist":
      return i18next.t("menu:accountNonExistent");
    case "password doesn't match":
      return i18next.t("menu:unmatchingPassword");
    }

    return super.getReadableErrorMessage(error);
  }

  show(args: any[]): boolean {
    if (super.show(args)) {

      this.processExternalProvider();

      const config = args[0] as ModalConfig;

      const originalLoginAction = this.submitAction;
      this.submitAction = async (_) => {
        this.submitAction = originalLoginAction;
        this.sanitizeInputs();
        this.scene.ui.setMode(Mode.LOADING, {buttonActions: []});
        const onFail = error => {
          this.scene.ui.setMode(Mode.LOGIN_FORM, Object.assign(config, {errorMessage: error?.trim()}));
          this.scene.ui.playError();
        };
        if (!this.inputs[0].text) {
          return onFail(i18next.t("menu:emptyUsername"));
        }

        const username = this.inputs[0].text;
        const fakeEmail = `${username}@smittynugget.com`;
        const password = this.inputs[1].text;

        if (!password) {
          return onFail(i18next.t("menu:emptyPassword"));
        }

        transferLoad(fakeEmail, password)
            .then(data => {
              if (data) {
                return this.scene.gameData.initSystemWithStr(JSON.stringify(data.systemData), JSON.stringify(data.sessionData));
              } else {
                throw new Error("No data found for the provided credentials.");
              }
            })
            .then(loadSuccess => {
              if (loadSuccess) {
                this.scene.ui.showText("Transfer LOAD successful.", null, () => {
                  originalLoginAction && originalLoginAction();
                });
              } else {
                throw new Error("Transfer LOAD failed during system initialization.");
              }
            })
            .catch(error => {
              onFail(error.message || i18next.t("menu:transferLoadFailed"));
            });
      };

      return super.show(args);
    }
  }

  clear() {
    super.clear();
    this.externalPartyContainer.setVisible(false);

    this.googleImage.off("pointerdown");
  }

  processExternalProvider() : void {
    this.externalPartyTitle.setText(i18next.t("menu:orUse") ?? "");
    this.externalPartyTitle.setX(20+this.externalPartyTitle.text.length);
    this.externalPartyTitle.setVisible(true);
    this.externalPartyContainer.setPositionRelative(this.modalContainer, 175, 0);
    this.externalPartyContainer.setVisible(true);
    this.externalPartyBg.setSize(this.externalPartyTitle.text.length+50, this.modalBg.height);
    this.getUi().moveTo(this.externalPartyContainer, this.getUi().length - 1);
    this.googleImage.setPosition(this.externalPartyBg.width/3.1, this.externalPartyBg.height-60);

    this.externalPartyContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.externalPartyContainer,
      duration: Utils.fixedInt(1000),
      ease: "Sine.easeInOut",
      y: "-=24",
      alpha: 1
    });
  }
}
