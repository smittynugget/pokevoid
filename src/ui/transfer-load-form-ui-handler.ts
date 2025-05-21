import { FormModalUiHandler } from "./form-modal-ui-handler";
import { Mode } from "./ui";
import { transferLoad } from "#app/account";
import BattleScene from "#app/battle-scene";
import { ModalConfig } from "./modal-ui-handler";

export default class TransferLoadFormUiHandler extends FormModalUiHandler {
    constructor(scene: BattleScene) {
        super(scene, Mode.TRANSFER_LOAD_FORM);
    }

    getModalConfig(): ModalConfig {
        return {
            title: "Load Account from Transfer",
            fields: ["Username (Email)", "Password"],
            width: 300,
            margin: [0, 0, 48, 0],
            submitLabel: "Load",
            cancelLabel: "Cancel"
        };
    }

    async handleSubmit(values: string[]): Promise<void> {
        const [username, password] = values;
        if (!username || !password) {
            this.showMessage("Transfer LOAD failed. Username and password are required.");
            return;
        }

        const data = await transferLoad(username, password);
        if (!data) {
            this.showMessage("Transfer LOAD failed. No data found.");
            return;
        }

        const { systemData, sessionData } = data;
        const loadSuccess = await this.scene.gameData.initSystemWithStr(systemData, sessionData);
        if (loadSuccess) {
            this.showMessage("Transfer LOAD successful.", () => {
                this.hide();
                this.scene.ui.showMainMenu();
            });
        } else {
            this.showMessage("Transfer LOAD failed. Data initialization error.");
        }
    }

    handleCancel(): void {
        this.hide();
        this.scene.ui.showMainMenu();
    }

    private showMessage(message: string, onClose?: () => void): void {
        this.scene.ui.showMessage(message, onClose);
    }
}