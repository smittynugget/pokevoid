import { FormModalUiHandler } from "./form-modal-ui-handler";
import { Mode } from "./ui";
import { transferSave } from "#app/account";
import BattleScene from "#app/battle-scene";
import {ModalConfig} from "#app/ui/modal-ui-handler";

export default class TransferSaveFormUiHandler extends FormModalUiHandler {
    constructor(scene: BattleScene) {
        super(scene, Mode.TRANSFER_SAVE_FORM);
    }

    getModalTitle(config?: ModalConfig): string {
        return "Save Account for Transfer";
    }

    getFields(config?: ModalConfig): string[] {
        return ["Username (Email)", "Password"];
    }

    getWidth(config?: ModalConfig): number {
        return 300;
    }

    getMargin(config?: ModalConfig): [number, number, number, number] {
        return [0, 0, 48, 0];
    }

    getButtonLabels(config?: ModalConfig): string[] {
        return ["Save", "Cancel"];
    }

    handleButtonClick(button: string): void {
        switch (button) {
            case "Save":
                this.submitForm();
                break;
            case "Cancel":
                this.onCancel();
                break;
            default:
                break;
        }
    }

    async onSubmit(values: string[]): Promise<void> {
        const [username, password] = values;
        if (username && password) {
            const systemData = this.scene.gameData.getSystemSaveData();
            const sessionData = this.scene.gameData.getSessionSaveData();

            const success = await transferSave(username, password, systemData, sessionData);
            if (success) {
                this.scene.ui.showText("Transfer SAVE successful.", null, () => {
                    this.close();
                    this.scene.ui.showOptions();
                }, null, true);
            } else {
                this.scene.ui.showText("Transfer SAVE failed.", null, () => {
                    this.close();
                    this.scene.ui.showOptions();
                }, null, true);
            }
        } else {
            this.scene.ui.showText("Transfer SAVE failed. Username and password are required.", null, () => {
                this.close();
                this.scene.ui.showOptions();
            }, null, true);
        }
    }

    onCancel(): void {
        this.close();
        this.scene.ui.showOptions();
    }
}