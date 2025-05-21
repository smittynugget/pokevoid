import { FormModalUiHandler } from "./form-modal-ui-handler";
import { ModalConfig } from "./modal-ui-handler";
import * as Utils from "../utils";
import { Mode } from "./ui";
import { TextStyle, addTextObject } from "./text";
import i18next from "i18next";
import {sanitizeEmailString} from "#app/frontend-to-server/utils-";
import {isValidFullEmail} from "#app/utils";
import {transferSave} from "#app/account";


export default class RegistrationFormUiHandler extends FormModalUiHandler {
  getModalTitle(config?: ModalConfig): string {
    return i18next.t("menu:register");
  }

  getFields(config?: ModalConfig): string[] {
    return [ i18next.t("menu:username"), i18next.t("menu:password"), i18next.t("menu:confirmPassword") ];
  }

  getWidth(config?: ModalConfig): number {
    return 160;
  }

  getMargin(config?: ModalConfig): [number, number, number, number] {
    return [ 0, 0, 48, 0 ];
  }

  getButtonTopMargin(): number {
    return 8;
  }

  getButtonLabels(config?: ModalConfig): string[] {
    return [ i18next.t("menu:register"), i18next.t("menu:backToLogin") ];
  }

  getReadableErrorMessage(error: string): string {
    const colonIndex = error?.indexOf(":");
    if (colonIndex > 0) {
      error = error.slice(0, colonIndex);
    }
    switch (error) {
    case "invalid username":
      return i18next.t("menu:invalidRegisterUsername");
    case "invalid password":
      return i18next.t("menu:invalidRegisterPassword");
    case "failed to add account record":
      return i18next.t("menu:usernameAlreadyUsed");
    case "auth/email-already-in-use":
      return i18next.t("menu:usernameAlreadyUsed");
    case "auth/weak-password":
      return i18next.t("menu:invalidRegisterPassword");
    }

    return super.getReadableErrorMessage(error);
  }

  setup(): void {
    super.setup();

    const label = addTextObject(this.scene, 10, 87, i18next.t("menu:registrationAgeWarning"), TextStyle.TOOLTIP_CONTENT, { fontSize: "42px" });

    this.modalContainer.add(label);
  }

  show(args: any[]): boolean {
    if (super.show(args)) {
      const config = args[0] as ModalConfig;

      const originalRegistrationAction = this.submitAction;
      this.submitAction = async (_) => {
        this.submitAction = originalRegistrationAction;
        this.sanitizeInputs();
        this.scene.ui.setMode(Mode.LOADING, { buttonActions: [] });
        const onFail = error => {
          this.scene.ui.setMode(Mode.REGISTRATION_FORM, Object.assign(config, { errorMessage: error?.trim() }));
          this.scene.ui.playError();
        };

                const username = this.inputs[0].text;
                const password = this.inputs[1].text;
                const confirmPassword = this.inputs[2].text;

                if (!username) {
          return onFail(i18next.t("menu:emptyUsername"));
        }

                if (!password) {
          return onFail(this.getReadableErrorMessage("invalid password"));
        }

                if (password !== confirmPassword) {
          return onFail(i18next.t("menu:passwordNotMatchingConfirmPassword"));
        }

        const fakeEmail = `${username}@smittynugget.com`;

                const systemData = this.scene.gameData.getSystemSaveData();
                const sessionData = this.scene.gameData.getSessionSavedData();

                transferSave(fakeEmail, password, systemData, sessionData)
                    .then(success => {
                        if (success) {
                            this.scene.ui.showText("Transfer SAVE successful.", null, () => {
                                if (originalRegistrationAction) originalRegistrationAction();
            });
                        } else {
                            throw new Error("Transfer SAVE failed.");
                        }
          })
          .catch(error => {
                        onFail(error.message || this.getReadableErrorMessage(error.code));
          });

      return true;
            };

            return super.show(args);
    }

    return false;
  }
}
